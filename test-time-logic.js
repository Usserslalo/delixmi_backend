/**
 * Test local de la lógica de horarios
 */

function testTimeLogic() {
  console.log('🧪 PROBANDO LÓGICA DE HORARIOS LOCALMENTE');
  console.log('========================================');
  
  // Simular datos del test
  const currentTime = "16:38";
  const openingTime = "10:00:00";
  const closingTime = "18:30:00";
  
  console.log(`⏰ Hora actual: ${currentTime}`);
  console.log(`🕐 Horario de apertura: ${openingTime}`);
  console.log(`🕐 Horario de cierre: ${closingTime}`);
  console.log('');
  
  // Lógica ANTES (incorrecta)
  console.log('❌ LÓGICA ANTES (incorrecta):');
  const isOpenBefore = currentTime >= openingTime && currentTime < closingTime;
  console.log(`   Comparación: "${currentTime}" >= "${openingTime}" && "${currentTime}" < "${closingTime}"`);
  console.log(`   Resultado: ${isOpenBefore ? 'ABIERTO' : 'CERRADO'}`);
  console.log('');
  
  // Lógica DESPUÉS (corregida)
  console.log('✅ LÓGICA DESPUÉS (corregida):');
  const openingTimeFormatted = openingTime.substring(0, 5); // "10:00:00" -> "10:00"
  const closingTimeFormatted = closingTime.substring(0, 5); // "18:30:00" -> "18:30"
  
  console.log(`   Horario de apertura formateado: "${openingTimeFormatted}"`);
  console.log(`   Horario de cierre formateado: "${closingTimeFormatted}"`);
  
  const isOpenAfter = currentTime >= openingTimeFormatted && currentTime < closingTimeFormatted;
  console.log(`   Comparación: "${currentTime}" >= "${openingTimeFormatted}" && "${currentTime}" < "${closingTimeFormatted}"`);
  console.log(`   Resultado: ${isOpenAfter ? 'ABIERTO' : 'CERRADO'}`);
  console.log('');
  
  // Verificación manual
  console.log('🔍 VERIFICACIÓN MANUAL:');
  console.log(`   ¿16:38 >= 10:00? ${"16:38" >= "10:00" ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   ¿16:38 < 18:30? ${"16:38" < "18:30" ? '✅ SÍ' : '❌ NO'}`);
  console.log(`   ¿Ambas condiciones? ${("16:38" >= "10:00" && "16:38" < "18:30") ? '✅ SÍ' : '❌ NO'}`);
  
  if (isOpenAfter) {
    console.log('🎉 ¡La lógica corregida funciona correctamente!');
  } else {
    console.log('⚠️  Hay un problema con la lógica corregida.');
  }
}

testTimeLogic();
