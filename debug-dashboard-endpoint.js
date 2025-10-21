/**
 * Script de debug detallado para el endpoint del dashboard
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'https://delixmi-backend.onrender.com';
const ENDPOINT = '/api/restaurant/metrics/dashboard-summary';

// Token de prueba (reemplazar con token real de owner)
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGVOYW1lIjoib3duZXIiLCJlbWFpbCI6ImFuYS5nYXJjaWFAcGl6emVyaWEuY29tIiwiaWF0IjoxNzYxMDg1MTg0LCJleHAiOjE3NjEwODYwODQsImF1ZCI6ImRlbGl4bWktYXBwIiwiaXNzIjoiZGVsaXhtaS1hcGkifQ.eAo4vXeDGubew7opD4cONRvyz4nWPb6VMw4ODRmNxZU';

async function debugDashboardEndpoint() {
  try {
    console.log('🔍 DEBUGGING DASHBOARD ENDPOINT');
    console.log('================================');
    console.log(`📍 URL: ${BASE_URL}${ENDPOINT}`);
    console.log(`🔑 Token: ${TEST_TOKEN.substring(0, 20)}...`);
    console.log('');

    const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log('✅ RESPUESTA EXITOSA');
    console.log('==================');
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', JSON.stringify(response.headers, null, 2));
    console.log('');
    console.log('📦 Response Body:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');

    // Verificar estructura
    if (response.data.status === 'success') {
      console.log('✅ Estructura correcta: status = success');
      
      if (response.data.data) {
        console.log('✅ Campo data presente');
        console.log('📊 Datos en data:', Object.keys(response.data.data));
      } else {
        console.log('❌ Campo data AUSENTE - ESTE ES EL PROBLEMA');
      }
    } else {
      console.log('❌ Estructura incorrecta: status =', response.data.status);
    }

  } catch (error) {
    console.log('❌ ERROR EN LA PETICIÓN');
    console.log('======================');
    
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📋 Headers:', JSON.stringify(error.response.headers, null, 2));
      console.log('');
      console.log('📦 Error Response Body:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log('');
      
      // Análisis del error
      if (error.response.status === 500) {
        console.log('🚨 ERROR 500 - Error interno del servidor');
        console.log('💡 Posibles causas:');
        console.log('   - Error en consultas Prisma');
        console.log('   - Error en lógica del controlador');
        console.log('   - Error en base de datos');
        console.log('   - Error en servicios externos');
      } else if (error.response.status === 401) {
        console.log('🚨 ERROR 401 - No autorizado');
        console.log('💡 Verificar token de autenticación');
      } else if (error.response.status === 403) {
        console.log('🚨 ERROR 403 - Acceso denegado');
        console.log('💡 Verificar permisos de owner');
      } else if (error.response.status === 404) {
        console.log('🚨 ERROR 404 - No encontrado');
        console.log('💡 Verificar que el restaurante existe');
      }
      
    } else if (error.request) {
      console.log('❌ No se recibió respuesta del servidor');
      console.log('💡 Verificar conectividad o URL');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

// Ejecutar debug
if (TEST_TOKEN === 'YOUR_OWNER_TOKEN_HERE') {
  console.log('⚠️  INSTRUCCIONES:');
  console.log('==================');
  console.log('1. Obtén un token de owner haciendo login:');
  console.log('   POST /api/auth/login');
  console.log('   Body: { "email": "owner@example.com", "password": "password" }');
  console.log('');
  console.log('2. Reemplaza TEST_TOKEN con el token obtenido');
  console.log('3. Ejecuta este script nuevamente');
} else {
  debugDashboardEndpoint();
}

module.exports = { debugDashboardEndpoint };
