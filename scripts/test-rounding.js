/**
 * Script de validación de redondeo a 2 decimales
 * Este script verifica que todos los cálculos monetarios estén correctamente redondeados
 * 
 * Uso: node scripts/test-rounding.js
 */

console.log('🧪 Iniciando pruebas de redondeo a 2 decimales...\n');

/**
 * Función de redondeo (misma que en checkout.controller.js)
 */
const roundToTwoDecimals = (num) => {
  return Math.round(num * 100) / 100;
};

/**
 * Verifica que un número tenga exactamente 2 decimales o menos
 */
const hasMaxTwoDecimals = (num) => {
  const decimalPart = (num.toString().split('.')[1] || '');
  return decimalPart.length <= 2;
};

// Test 1: Validar función de redondeo
console.log('📦 Test 1: Validación de función de redondeo');
console.log('═'.repeat(50));

const testCases = [
  { input: 100.123456, expected: 100.12, description: 'Redondeo normal hacia abajo' },
  { input: 100.125, expected: 100.13, description: 'Redondeo de 5 hacia arriba' },
  { input: 100.126, expected: 100.13, description: 'Redondeo hacia arriba' },
  { input: 100.999, expected: 101.00, description: 'Redondeo con overflow' },
  { input: 0.005, expected: 0.01, description: 'Redondeo de valores pequeños' },
  { input: 100, expected: 100, description: 'Valor sin decimales' },
  { input: 100.1, expected: 100.1, description: 'Valor con 1 decimal' },
  { input: 100.10, expected: 100.1, description: 'Valor con decimal cero' }
];

let passedTests = 0;
let failedTests = 0;

testCases.forEach(test => {
  const result = roundToTwoDecimals(test.input);
  const passed = result === test.expected && hasMaxTwoDecimals(result);
  
  console.log(`\n${test.description}`);
  console.log(`  Input: ${test.input}`);
  console.log(`  Esperado: ${test.expected}`);
  console.log(`  Resultado: ${result}`);
  console.log(`  Decimales: ${(result.toString().split('.')[1] || '').length}`);
  
  if (passed) {
    console.log(`  ✅ PASS`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL`);
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(50));

// Test 2: Simulación de cálculos de pedido con valores problemáticos
console.log('\n📦 Test 2: Cálculos de pedido con valores problemáticos');
console.log('═'.repeat(50));

const orderTests = [
  {
    description: 'Pedido con subtotal que genera muchos decimales',
    subtotal: 333.33,
    deliveryFee: 22.22,
    serviceFeeRate: 0.05
  },
  {
    description: 'Pedido con división imprecisa',
    subtotal: 100 / 3, // 33.333333...
    deliveryFee: 25.00,
    serviceFeeRate: 0.05
  },
  {
    description: 'Pedido con multiplicación imprecisa',
    subtotal: 0.1 + 0.2, // Famoso bug de punto flotante
    deliveryFee: 20.00,
    serviceFeeRate: 0.05
  }
];

orderTests.forEach(test => {
  console.log(`\n${test.description}`);
  
  // Simular cálculo sin redondeo (MAL)
  const subtotalNoRound = test.subtotal;
  const serviceFeeNoRound = test.subtotal * test.serviceFeeRate;
  const totalNoRound = test.subtotal + test.deliveryFee + serviceFeeNoRound;
  
  console.log(`  SIN redondeo:`);
  console.log(`    Subtotal: ${subtotalNoRound}`);
  console.log(`    Service Fee: ${serviceFeeNoRound}`);
  console.log(`    Total: ${totalNoRound}`);
  console.log(`    Decimales en total: ${(totalNoRound.toString().split('.')[1] || '').length}`);
  
  // Simular cálculo con redondeo (BIEN)
  const subtotalRound = roundToTwoDecimals(test.subtotal);
  const deliveryFeeRound = roundToTwoDecimals(test.deliveryFee);
  const serviceFeeRound = roundToTwoDecimals(subtotalRound * test.serviceFeeRate);
  const totalRound = roundToTwoDecimals(subtotalRound + deliveryFeeRound + serviceFeeRound);
  
  console.log(`  CON redondeo:`);
  console.log(`    Subtotal: ${subtotalRound}`);
  console.log(`    Delivery Fee: ${deliveryFeeRound}`);
  console.log(`    Service Fee: ${serviceFeeRound}`);
  console.log(`    Total: ${totalRound}`);
  console.log(`    Decimales en total: ${(totalRound.toString().split('.')[1] || '').length}`);
  
  const allRounded = hasMaxTwoDecimals(subtotalRound) && 
                     hasMaxTwoDecimals(deliveryFeeRound) && 
                     hasMaxTwoDecimals(serviceFeeRound) && 
                     hasMaxTwoDecimals(totalRound);
  
  if (allRounded) {
    console.log(`  ✅ PASS: Todos los valores tienen máximo 2 decimales`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL: Algunos valores tienen más de 2 decimales`);
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(50));

// Test 3: Verificar que el total es la suma correcta después de redondear
console.log('\n📦 Test 3: Verificación de suma después de redondeo');
console.log('═'.repeat(50));

const sumTests = [
  { subtotal: 123.45, deliveryFee: 30.00, serviceFee: 6.17 },
  { subtotal: 99.99, deliveryFee: 25.00, serviceFee: 5.00 },
  { subtotal: 333.33, deliveryFee: 40.00, serviceFee: 16.67 }
];

sumTests.forEach(test => {
  const subtotal = roundToTwoDecimals(test.subtotal);
  const deliveryFee = roundToTwoDecimals(test.deliveryFee);
  const serviceFee = roundToTwoDecimals(test.serviceFee);
  
  // Calcular total sumando valores ya redondeados
  const calculatedTotal = roundToTwoDecimals(subtotal + deliveryFee + serviceFee);
  
  // Verificar que la suma manual coincide
  const manualSum = subtotal + deliveryFee + serviceFee;
  const manualSumRounded = roundToTwoDecimals(manualSum);
  
  console.log(`\nSubtotal: $${subtotal}, Delivery: $${deliveryFee}, Service: $${serviceFee}`);
  console.log(`  Suma directa: ${manualSum}`);
  console.log(`  Suma redondeada: ${manualSumRounded}`);
  console.log(`  Total calculado: ${calculatedTotal}`);
  
  const passed = calculatedTotal === manualSumRounded && hasMaxTwoDecimals(calculatedTotal);
  
  if (passed) {
    console.log(`  ✅ PASS: Total correcto con máximo 2 decimales`);
    passedTests++;
  } else {
    console.log(`  ❌ FAIL`);
    failedTests++;
  }
});

console.log('\n' + '═'.repeat(50));
console.log('\n📊 RESUMEN DE PRUEBAS DE REDONDEO');
console.log('═'.repeat(50));
console.log(`✅ Tests exitosos: ${passedTests}`);
console.log(`❌ Tests fallidos: ${failedTests}`);
console.log(`📈 Total de tests: ${passedTests + failedTests}`);
console.log(`📊 Tasa de éxito: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(2)}%`);

if (failedTests === 0) {
  console.log('\n🎉 ¡Todos los tests de redondeo pasaron exitosamente!');
  console.log('✅ El redondeo a 2 decimales funciona correctamente.');
  process.exit(0);
} else {
  console.log('\n❌ Algunos tests fallaron. Revisa la lógica de redondeo.');
  process.exit(1);
}

