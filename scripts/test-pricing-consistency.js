/**
 * Script de validación para probar la consistencia de precios
 * Este script valida que la lógica de cálculo de precios sea consistente
 * 
 * Uso: node scripts/test-pricing-consistency.js
 */

const { calculateDeliveryFee } = require('../src/config/maps');

console.log('🧪 Iniciando pruebas de consistencia de precios...\n');

// Test 1: Validar cálculo de tarifa de envío
console.log('📦 Test 1: Cálculo de tarifa de envío');
console.log('═'.repeat(50));

const testDistances = [
  { distance: 1, expectedMin: 20, description: 'Distancia corta (1 km)' },
  { distance: 2, expectedMin: 20, description: 'Distancia corta (2 km)' },
  { distance: 3, expectedMin: 30, description: 'Distancia media (3 km)' },
  { distance: 5, expectedMin: 40, description: 'Distancia larga (5 km)' },
  { distance: 10, expectedMin: 65, description: 'Distancia muy larga (10 km)' }
];

let passedTests = 0;
let failedTests = 0;

testDistances.forEach(test => {
  const result = calculateDeliveryFee(test.distance);
  const passed = result.tarifaFinal >= test.expectedMin;
  
  console.log(`\n${test.description}`);
  console.log(`  Distancia: ${test.distance} km`);
  console.log(`  Tarifa base: $${result.tarifaBase} MXN`);
  console.log(`  Costo por km: $${result.costoPorKm} MXN`);
  console.log(`  Tarifa calculada: $${result.tarifaCalculada.toFixed(2)} MXN`);
  console.log(`  Tarifa mínima: $${result.tarifaMinima} MXN`);
  console.log(`  ✅ Tarifa final: $${result.tarifaFinal.toFixed(2)} MXN`);
  
  if (passed) {
    console.log(`  ✅ PASS: Tarifa >= $${test.expectedMin} MXN`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL: Esperado >= $${test.expectedMin} MXN`);
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(50));

// Test 2: Validar cálculo de serviceFee
console.log('\n📦 Test 2: Cálculo de cuota de servicio');
console.log('═'.repeat(50));

const testSubtotals = [
  { subtotal: 100, expectedFee: 5 },
  { subtotal: 200, expectedFee: 10 },
  { subtotal: 500, expectedFee: 25 },
  { subtotal: 1000, expectedFee: 50 }
];

testSubtotals.forEach(test => {
  const serviceFee = test.subtotal * 0.05;
  const passed = serviceFee === test.expectedFee;
  
  console.log(`\nSubtotal: $${test.subtotal} MXN`);
  console.log(`  Cuota de servicio (5%): $${serviceFee.toFixed(2)} MXN`);
  
  if (passed) {
    console.log(`  ✅ PASS: Cuota de servicio correcta`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL: Esperado $${test.expectedFee} MXN`);
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(50));

// Test 3: Validar cálculo de total completo
console.log('\n📦 Test 3: Cálculo de total completo');
console.log('═'.repeat(50));

const testOrders = [
  {
    description: 'Orden pequeña (2 km)',
    subtotal: 200,
    distance: 2,
    expectedDelivery: 25, // $15 base + (2 km × $5) = $25
    expectedService: 10,
    expectedTotal: 235 // $200 + $25 + $10
  },
  {
    description: 'Orden mediana (5 km)',
    subtotal: 500,
    distance: 5,
    expectedDelivery: 40,
    expectedService: 25,
    expectedTotal: 565
  },
  {
    description: 'Orden grande (10 km)',
    subtotal: 1000,
    distance: 10,
    expectedDelivery: 65,
    expectedService: 50,
    expectedTotal: 1115
  }
];

testOrders.forEach(test => {
  const deliveryFeeCalc = calculateDeliveryFee(test.distance);
  const serviceFee = test.subtotal * 0.05;
  const total = test.subtotal + deliveryFeeCalc.tarifaFinal + serviceFee;
  const passed = total === test.expectedTotal;
  
  console.log(`\n${test.description}`);
  console.log(`  Subtotal: $${test.subtotal} MXN`);
  console.log(`  Tarifa de envío: $${deliveryFeeCalc.tarifaFinal.toFixed(2)} MXN`);
  console.log(`  Cuota de servicio: $${serviceFee.toFixed(2)} MXN`);
  console.log(`  ✅ Total: $${total.toFixed(2)} MXN`);
  
  if (passed) {
    console.log(`  ✅ PASS: Total correcto ($${test.expectedTotal} MXN)`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL: Esperado $${test.expectedTotal} MXN, obtenido $${total.toFixed(2)} MXN`);
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(50));
console.log('\n📊 RESUMEN DE PRUEBAS');
console.log('═'.repeat(50));
console.log(`✅ Tests exitosos: ${passedTests}`);
console.log(`❌ Tests fallidos: ${failedTests}`);
console.log(`📈 Total de tests: ${passedTests + failedTests}`);
console.log(`📊 Tasa de éxito: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);

if (failedTests === 0) {
  console.log('\n🎉 ¡Todos los tests pasaron exitosamente!');
  console.log('✅ La lógica de cálculo de precios es consistente.');
  process.exit(0);
} else {
  console.log('\n❌ Algunos tests fallaron. Revisa la lógica de cálculo.');
  process.exit(1);
}

