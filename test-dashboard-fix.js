/**
 * Script de prueba rápida para verificar la corrección del endpoint del dashboard
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'https://delixmi-backend.onrender.com';
const ENDPOINT = '/api/restaurant/metrics/dashboard-summary';

// Token de prueba (reemplazar con token real de owner)
const TEST_TOKEN = 'YOUR_OWNER_TOKEN_HERE';

async function testDashboardFix() {
  try {
    console.log('🔧 Probando corrección del endpoint del dashboard...');
    console.log(`📍 URL: ${BASE_URL}${ENDPOINT}`);
    
    const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('✅ ¡Corrección exitosa!');
    console.log('📊 Status:', response.status);
    console.log('📋 Estructura de respuesta:');
    console.log(JSON.stringify(response.data, null, 2));

    // Verificar que no hay errores de Prisma
    if (response.data.status === 'success') {
      console.log('\n🎉 ¡Endpoint funcionando correctamente!');
      console.log('📈 Datos financieros:', response.data.data.financials);
      console.log('🔄 Operaciones:', response.data.data.operations);
      console.log('🏪 Estado del restaurante:', response.data.data.storeStatus);
      console.log('📊 Estadísticas rápidas:', response.data.data.quickStats);
    }

  } catch (error) {
    console.error('❌ Error probando endpoint:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      // Verificar si es el mismo error de Prisma
      if (error.response.data.message && error.response.data.message.includes('Unknown argument `branch`')) {
        console.log('\n⚠️  El error de Prisma aún persiste. Revisar consultas.');
      }
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
  testDashboardFix();
}

module.exports = { testDashboardFix };
