/**
 * Script de prueba para el endpoint del dashboard
 * GET /api/restaurant/metrics/dashboard-summary
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'https://delixmi-backend.onrender.com';
const ENDPOINT = '/api/restaurant/metrics/dashboard-summary';

// Token de prueba (reemplazar con token real de owner)
const TEST_TOKEN = 'YOUR_OWNER_TOKEN_HERE';

async function testDashboardEndpoint() {
  try {
    console.log('🚀 Probando endpoint del dashboard...');
    console.log(`📍 URL: ${BASE_URL}${ENDPOINT}`);
    
    const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ Respuesta exitosa!');
    console.log('📊 Status:', response.status);
    console.log('📋 Datos del dashboard:');
    console.log(JSON.stringify(response.data, null, 2));

    // Verificar estructura v1.0
    const data = response.data.data;
    const requiredFields = [
      'financials.walletBalance',
      'financials.todaySales', 
      'financials.todayEarnings',
      'operations.pendingOrdersCount',
      'operations.preparingOrdersCount',
      'operations.readyForPickupCount',
      'operations.deliveredTodayCount',
      'storeStatus.isOpen',
      'storeStatus.nextOpeningTime',
      'storeStatus.nextClosingTime',
      'storeStatus.currentDaySchedule',
      'quickStats.activeProductsCount',
      'quickStats.activeEmployeesCount',
      'quickStats.totalCategories'
    ];

    console.log('\n🔍 Verificando estructura v1.0...');
    let allFieldsPresent = true;
    
    requiredFields.forEach(field => {
      const value = field.split('.').reduce((obj, key) => obj?.[key], data);
      if (value === undefined) {
        console.log(`❌ Campo faltante: ${field}`);
        allFieldsPresent = false;
      } else {
        console.log(`✅ ${field}: ${value}`);
      }
    });

    if (allFieldsPresent) {
      console.log('\n🎉 ¡Estructura v1.0 verificada correctamente!');
    } else {
      console.log('\n⚠️  Algunos campos faltan en la estructura v1.0');
    }

  } catch (error) {
    console.error('❌ Error probando endpoint:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Ejecutar prueba
if (TEST_TOKEN === 'YOUR_OWNER_TOKEN_HERE') {
  console.log('⚠️  Por favor, reemplaza TEST_TOKEN con un token real de owner');
  console.log('💡 Puedes obtener un token haciendo login en /api/auth/login');
} else {
  testDashboardEndpoint();
}

module.exports = { testDashboardEndpoint };
