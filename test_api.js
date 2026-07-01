const axios = require('axios');
async function test() {
  try {
    let res1 = await axios.get('http://localhost:5000/api/orders', { headers: { 'X-Admin-Secret': 'Admin!Kottravai2025%100' } });
    console.log('Without quotes length:', res1.data.length);
  } catch (e) {
    console.log('Without quotes error:', e.response?.status, e.response?.data);
  }
  try {
    let res2 = await axios.get('http://localhost:5000/api/orders', { headers: { 'X-Admin-Secret': '"Admin!Kottravai2025%100"' } });
    console.log('With quotes length:', res2.data.length);
  } catch (e) {
    console.log('With quotes error:', e.response?.status, e.response?.data);
  }
}
test();
