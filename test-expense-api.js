const axios = require('axios');

const api = axios.create({ baseURL: 'http://127.0.0.1:4000/api' });

async function test() {
  try {
    // 1. Login as employee
    const loginRes = await api.post('/auth/login', {
      email: 'matsya.singh@company.com',
      password: 'Password@123'
    });
    console.log('Login:', loginRes.data.data?.user?.email);
    
    const token = loginRes.data.data.token;
    const refreshToken = loginRes.data.data.refreshToken;
    
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Create draft
    const draftRes = await api.post('/expense/claims', {
      category: 'Travel',
      amount: 5000,
      currency: 'INR',
      expenseDate: '2026-01-15',
      businessPurpose: 'Client meeting in Mumbai',
      merchantName: 'Airline',
      paymentMethod: 'Personal Card',
      gstApplicable: false,
      isDraft: true
    });
    console.log('Draft created:', draftRes.data.data.claimNumber, draftRes.data.data.id);
    
    const draftId = draftRes.data.data.id;
    
    // 3. Update draft
    const updateRes = await api.put(`/expense/claims/${draftId}`, {
      amount: 7500,
      businessPurpose: 'Updated: Client meeting in Mumbai with extended stay'
    });
    console.log('Draft updated:', updateRes.data.data.amount);
    
    // 4. Submit draft
    const submitRes = await api.post(`/expense/claims/${draftId}/submit`);
    console.log('Draft submitted:', submitRes.data.data.claimNumber, submitRes.data.data.status);
    
    // 5. Verify it's no longer a draft
    const getRes = await api.get(`/expense/claims/${draftId}`);
    console.log('Final status:', getRes.data.data.status, 'isDraft:', getRes.data.data.isDraft);
    
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

test();