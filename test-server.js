const { spawn } = require('child_process');

const server = spawn('node', ['dist/index.js'], {
  cwd: 'C:\\Users\\VASAVI VANAM\\Desktop\\శనీ\\enterprise-hrms\\backend',
  stdio: ['inherit', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

server.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

server.on('error', (err) => {
  console.error('Spawn error:', err);
});

// Test after 3 seconds
setTimeout(async () => {
  try {
    const axios = require('axios');
    const api = axios.create({ baseURL: 'http://127.0.0.1:4000/api' });
    
    const loginRes = await api.post('/auth/login', {
      email: 'matsya.singh@company.com',
      password: 'Password@123'
    });
    console.log('Login OK');
    
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const draftRes = await api.post('/expense/claims', {
      category: 'Travel',
      amount: 5000,
      currency: 'INR',
      expenseDate: '2026-01-15',
      businessPurpose: 'Client meeting test receipt',
      merchantName: 'Airline',
      paymentMethod: 'Personal Card',
      gstApplicable: false,
      isDraft: true
    });
    console.log('Draft created:', draftRes.data.data.claimNumber);
    const draftId = draftRes.data.data.id;
    
    const uploadUrlRes = await api.post('/expense/receipts/upload-url', {
      claimId: draftId,
      fileName: 'test-receipt.pdf',
      mimeType: 'application/pdf',
      fileSize: 1024
    });
    console.log('Upload URL:', uploadUrlRes.data.data.uploadUrl);
    console.log('Use Local Fallback:', uploadUrlRes.data.data.useLocalFallback);
    
    const testContent = 'test receipt content';
    const uploadRes = await axios.put(uploadUrlRes.data.data.uploadUrl, testContent, {
      headers: { 'Content-Type': 'application/pdf' }
    });
    console.log('File upload OK:', uploadRes.data);
    
    const fileHash = require('crypto').createHash('sha256').update(testContent).digest('hex');
    const completeRes = await api.post('/expense/receipts/complete', {
      claimId: draftId,
      objectName: uploadUrlRes.data.data.objectName,
      fileHash: fileHash
    });
    console.log('Complete OK:', completeRes.data);
    
    server.kill();
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err.response?.data || err.message);
    console.error('Full error:', err.response?.data?.details || err.stack);
    server.kill();
    process.exit(1);
  }
}, 3000);