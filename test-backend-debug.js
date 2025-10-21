const axios = require('axios');

async function testWithDebug() {
  try {
    const response = await axios.get('https://delixmi-backend.onrender.com/api/restaurant/metrics/dashboard-summary', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGVOYW1lIjoib3duZXIiLCJlbWFpbCI6ImFuYS5nYXJjaWFAcGl6emVyaWEuY29tIiwiaWF0IjoxNzYxMDg2Mjg2LCJleHAiOjE3NjEwODcxODYsImF1ZCI6ImRlbGl4bWktYXBwIiwiaXNzIjoiZGVsaXhtaS1hcGkifQ.HPsbVBfgDSUNDasW2qUkSZcOoogjZvLd35l5o1dmPrc',
        'Content-Type': 'application/json'
      }
    });
    
    const storeStatus = response.data.data.storeStatus;
    console.log('📊 DATOS DEL BACKEND:');
    console.log('isOpen:', storeStatus.isOpen);
    console.log('currentDaySchedule:', JSON.stringify(storeStatus.currentDaySchedule, null, 2));
    console.log('nextOpeningTime:', storeStatus.nextOpeningTime);
    console.log('nextClosingTime:', storeStatus.nextClosingTime);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testWithDebug();
