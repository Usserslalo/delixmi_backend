const { execSync } = require('child_process');
const path = require('path');

const runCommand = (command) => {
  try {
    console.log(`\n🔄 Ejecutando: ${command}`);
    console.log('─'.repeat(60));
    execSync(command, { stdio: 'inherit' });
    console.log('─'.repeat(60));
    console.log('✅ Comando ejecutado exitosamente\n');
  } catch (error) {
    console.error('─'.repeat(60));
    console.error('❌ Error en comando:', command);
    console.error('─'.repeat(60));
    throw error;
  }
};

const main = async () => {
  console.log('🚀 INICIANDO SUITE COMPLETA DE TESTS DEL SUPER ADMIN');
  console.log('='.repeat(80));
  console.log('🌐 URL del Backend: https://delixmi-backend.onrender.com');
  console.log('📅 Fecha:', new Date().toLocaleString());
  console.log('='.repeat(80));

  const testFiles = [
    'tests/admin/fase1_seguridad_render.test.js',
    'tests/admin/fase2_configuracion_global.test.js',
    'tests/admin/fase3_restaurantes_catalogo.test.js',
    'tests/admin/fase4_finanzas_billeteras.test.js',
    'tests/admin/fase5_logistica_repartidores.test.js',
    'tests/admin/fase6_soporte_auditoria.test.js'
  ];

  const phases = [
    'FASE 1: Seguridad, Roles y Usuarios',
    'FASE 2: Configuración Global y Geografía',
    'FASE 3: Restaurantes y Catálogo',
    'FASE 4: Finanzas y Billeteras',
    'FASE 5: Logística y Repartidores',
    'FASE 6: Soporte, Auditoría y Comms'
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    const phase = phases[i];
    
    console.log(`\n📋 ${phase}`);
    console.log('='.repeat(80));
    
    try {
      runCommand(`npx jest ${testFile} --verbose --detectOpenHandles --forceExit`);
      console.log(`✅ ${phase} - TODOS LOS TESTS PASARON`);
      passedTests++;
    } catch (error) {
      console.log(`❌ ${phase} - ALGUNOS TESTS FALLARON`);
      failedTests++;
    }
    
    totalTests++;
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN FINAL DE TESTS');
  console.log('='.repeat(80));
  console.log(`📈 Total de Fases: ${totalTests}`);
  console.log(`✅ Fases Exitosas: ${passedTests}`);
  console.log(`❌ Fases con Errores: ${failedTests}`);
  console.log(`📊 Porcentaje de Éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (failedTests > 0) {
    console.log('\n⚠️  ALGUNAS FASES FALLARON - Revisa los logs arriba para más detalles');
    process.exit(1);
  } else {
    console.log('\n🎉 ¡TODAS LAS FASES PASARON EXITOSAMENTE!');
    console.log('🚀 El sistema de Super Admin está funcionando correctamente');
  }
};

main().catch(error => {
  console.error('\n💥 Error crítico durante la ejecución de tests:', error.message);
  process.exit(1);
});
