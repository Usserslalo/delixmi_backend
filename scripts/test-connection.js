#!/usr/bin/env node

const { testConnection, disconnect } = require('../src/config/database');

async function main() {
  console.log('🔍 Probando conexión a la base de datos...\n');
  
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      console.log('\n✅ ¡Conexión exitosa! La base de datos está funcionando correctamente.');
      console.log('📊 Puedes proceder con las migraciones y el desarrollo.');
    } else {
      console.log('\n❌ Error de conexión. Verifica:');
      console.log('   - Que MySQL esté ejecutándose');
      console.log('   - Que la base de datos "delixmi" exista');
      console.log('   - Que las credenciales sean correctas');
      console.log('   - Que el puerto 3306 esté disponible');
    }
  } catch (error) {
    console.error('\n❌ Error inesperado:', error.message);
  } finally {
    await disconnect();
    process.exit(0);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = main;
