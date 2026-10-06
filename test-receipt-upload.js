const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const api = axios.create({ baseURL: 'http://127.0.0.1:4000/api' });

async function testReceiptUpload() {
  try {
    // 1. Login as employee
    const loginRes = await api.post('/auth/login', {
      email: 'matsya.singh@company.com',
      password: 'Password@123'
    });
    console.log('Login:', loginRes.data.data?.user?.email);
    
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Create draft
    const draftRes = await api.post('/expense/claims', {
      category: 'Travel',
      amount: 5000,
      currency: 'INR',
      expenseDate: '2026-01-15',
      businessPurpose: 'Client meeting in Mumbai with receipt test',
      merchantName: 'Airline',
      paymentMethod: 'Personal Card',
      gstApplicable: false,
      isDraft: true
    });
    console.log('Draft created:', draftRes.data.data.claimNumber);
    
    const draftId = draftRes.data.data.id;
    
    // 3. Get presigned upload URL (should fallback to local)
    const uploadUrlRes = await api.post('/expense/receipts/upload-url', {
      claimId: draftId,
      fileName: 'test-receipt.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024
    });
    console.log('Upload URL:', uploadUrlRes.data.data.uploadUrl);
    console.log('Object Name:', uploadUrlRes.data.data.objectName);
    console.log('Use Local Fallback:', uploadUrlRes.data.data.useLocalFallback);
    
    const uploadUrl = uploadUrlRes.data.data.uploadUrl;
    const objectName = uploadUrlRes.data.data.objectName;
    
    // 4. Upload file to local fallback URL
    const testContent = 'This is a test receipt file content';
    const uploadRes = await axios.put(uploadUrl, testContent, {
      headers: { 'Content-Type': 'application/pdf' }
    });
    console.log('Upload response:', uploadRes.data);
    
    // 5. Complete upload
    const fileHash = require('crypto').createHash('sha256').update(testContent).digest('hex');
    const completeRes = await api.post('/expense/receipts/complete', {
      claimId: draftId,
      objectName: objectName,
      fileHash: fileHash
    });
    console.log('Complete response:', completeRes.data);
    
    // 6. Submit claim
    const submitRes = await api.post(`/expense/claims/${draftId}/submit`);
    console.log('Submitted:', submitRes.data.data.status);
    
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testReceiptUpload();