const axios = require('axios');

const api = axios.create({ baseURL: 'http://127.0.0.1:4000/api' });

async function testDownload() {
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
      businessPurpose: 'Client meeting with receipt test download',
      merchantName: 'Airline',
      paymentMethod: 'Personal Card',
      gstApplicable: false,
      isDraft: true
    });
    console.log('Draft created:', draftRes.data.data.claimNumber);
    
    const draftId = draftRes.data.data.id;
    
    // 3. Upload receipt
    const uploadUrlRes = await api.post('/expense/receipts/upload-url', {
      claimId: draftId,
      fileName: 'test-download.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024
    });
    console.log('Upload URL:', uploadUrlRes.data.data.uploadUrl);
    console.log('Use Local Fallback:', uploadUrlRes.data.data.useLocalFallback);
    
    const testContent = 'This is a test receipt for download';
    const uploadRes = await axios.put(uploadUrlRes.data.data.uploadUrl, testContent, {
      headers: { 'Content-Type': 'application/pdf' }
    });
    console.log('Upload OK');
    
    const fileHash = require('crypto').createHash('sha256').update(testContent).digest('hex');
    const completeRes = await api.post('/expense/receipts/complete', {
      claimId: draftId,
      objectName: uploadUrlRes.data.data.objectName,
      fileHash: fileHash
    });
    console.log('Complete OK, receipt ID:', completeRes.data.data.receipt.id);
    
    const receiptId = completeRes.data.data.receipt.id;
    
    // 4. Get download URL
    const downloadRes = await api.get(`/expense/receipts/${receiptId}/download`);
    console.log('Download URL:', downloadRes.data.data.downloadUrl);
    
    // 5. Download the file
    const fileRes = await axios.get(downloadRes.data.data.downloadUrl, {
      responseType: 'arraybuffer'
    });
    console.log('Download OK, size:', fileRes.data.byteLength, 'bytes');
    console.log('Content matches:', Buffer.from(fileRes.data).toString() === testContent);
    
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    if (err.response?.data) {
      console.error('Details:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testDownload();