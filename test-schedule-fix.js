/**
 * Script de prueba para verificar la corrección de horarios
 */

const axios = require('axios');

// Configuración
const BASE_URL = 'https://delixmi-backend.onrender.com';
const ENDPOINT = '/api/restaurant/metrics/dashboard-summary';

// Token de owner
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsInJvbGVOYW1lIjoib3duZXIiLCJlbWFpbCI6ImFuYS5nYXJjaWFAcGl6emVyaWEuY29tIiwiaWF0IjoxNzYxMDg2Mjg2LCJleHAiOjE3NjEwODcxODYsImF1ZCI6ImRlbGl4bWktYXBwIiwiaXNzIjoiZGVsaXhtaS1hcGkifQ.HPsbVBfgDSUNDasW2qUkSZcOoogjZvLd35l5o1dmPrc';

async function testScheduleFix() {
  try {
    console.log('🕐 PROBANDO CORRECCIÓN DE HORARIOS');
    console.log('==================================');
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`⏰ Hora actual: ${currentTime}`);
    console.log(`📅 Fecha: ${now.toLocaleDateString()}`);
    console.log(`📅 Día de la semana: ${['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][now.getDay()]}`);
    console.log('');

    const response = await axios.get(`${BASE_URL}${ENDPOINT}`, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('✅ RESPUESTA EXITOSA');
    console.log('==================');
    
    const storeStatus = response.data.data.storeStatus;
    
    console.log('🏪 ESTADO DEL RESTAURANTE:');
    console.log(`   Estado: ${storeStatus.isOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}`);
    console.log(`   Horario: ${storeStatus.currentDaySchedule?.opening || 'N/A'} - ${storeStatus.currentDaySchedule?.closing || 'N/A'}`);
    console.log(`   Próxima apertura: ${storeStatus.nextOpeningTime || 'N/A'}`);
    console.log(`   Próximo cierre: ${storeStatus.nextClosingTime || 'N/A'}`);
    console.log('');

    // Validación de la lógica
    if (storeStatus.currentDaySchedule) {
      const openingTime = storeStatus.currentDaySchedule.opening;
      const closingTime = storeStatus.currentDaySchedule.closing;
      
      console.log('🔍 VALIDACIÓN DE LÓGICA:');
      console.log(`   Hora actual: ${currentTime}`);
      console.log(`   Horario de apertura: ${openingTime}`);
      console.log(`   Horario de cierre: ${closingTime}`);
      
      // Simular la lógica corregida
      const shouldBeOpen = currentTime >= openingTime && currentTime < closingTime;
      console.log(`   Debería estar abierto: ${shouldBeOpen ? '✅ SÍ' : '❌ NO'}`);
      console.log(`   Backend dice: ${storeStatus.isOpen ? '✅ ABIERTO' : '❌ CERRADO'}`);
      
      if (shouldBeOpen === storeStatus.isOpen) {
        console.log('🎉 ¡CORRECCIÓN EXITOSA! La lógica funciona correctamente.');
      } else {
        console.log('⚠️  Aún hay un problema en la lógica del backend.');
      }
    }

  } catch (error) {
    console.error('❌ Error probando corrección:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

testScheduleFix();
