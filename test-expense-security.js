const axios = require('axios');

const api = axios.create({ baseURL: 'http://127.0.0.1:4000/api' });

async function testSecurity() {
  try {
    // 1. Login as employee
    const loginRes = await api.post('/auth/login', {
      email: 'matsya.singh@company.com',
      password: 'Password@123'
    });
    console.log('Login:', loginRes.data.data?.user?.email);
    
    const token = loginRes.data.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    // 2. Create and submit a claim
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
    console.log('Draft created:', draftRes.data.data.claimNumber);
    
    const draftId = draftRes.data.data.id;
    
    // 3. Submit the claim
    const submitRes = await api.post(`/expense/claims/${draftId}/submit`);
    console.log('Submitted:', submitRes.data.data.status);
    
    // 4. Try to update the submitted claim (should fail)
    try {
      const updateRes = await api.put(`/expense/claims/${draftId}`, {
        amount: 9999,
        businessPurpose: 'Attempted hack'
      });
      console.log('ERROR: Update should have failed but succeeded:', updateRes.data);
    } catch (err) {
      console.log('SECURITY CHECK PASSED - Update blocked:', err.response?.data?.message || err.message);
    }
    
    // 5. Try to delete the submitted claim (should fail)
    try {
      const deleteRes = await api.delete(`/expense/claims/${draftId}`);
      console.log('ERROR: Delete should have failed but succeeded:', deleteRes.data);
    } catch (err) {
      console.log('SECURITY CHECK PASSED - Delete blocked:', err.response?.data?.message || err.message);
    }
    
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

testSecurity();