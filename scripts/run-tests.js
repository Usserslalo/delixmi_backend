#!/usr/bin/env node

/**
 * Script para ejecutar las pruebas del Super Admin
 * Uso: node scripts/run-tests.js [opciones]
 */

const { spawn } = require('child_process');
const path = require('path');

// Configuración
const config = {
  serverUrl: 'http://localhost:3000',
  testTimeout: 30000,
  verbose: true
};

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Función para imprimir con colores
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para verificar si el servidor está ejecutándose
async function checkServer() {
  try {
    const response = await fetch(`${config.serverUrl}/api/auth/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Función para ejecutar comando
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'test:admin';

  log('🧪 Iniciando pruebas del Super Admin...', 'cyan');
  log(`📋 Comando: npm run ${command}`, 'blue');

  try {
    // Verificar si el servidor está ejecutándose
    log('🔍 Verificando servidor...', 'yellow');
    const serverRunning = await checkServer();
    
    if (!serverRunning) {
      log('❌ El servidor no está ejecutándose en http://localhost:3000', 'red');
      log('💡 Ejecuta "npm run dev" en otra terminal antes de correr las pruebas', 'yellow');
      process.exit(1);
    }

    log('✅ Servidor verificado', 'green');

    // Ejecutar las pruebas
    log('🚀 Ejecutando pruebas...', 'cyan');
    
    const startTime = Date.now();
    
    await runCommand('npm', ['run', command]);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    log(`✅ Pruebas completadas en ${duration}s`, 'green');
    
  } catch (error) {
    log(`❌ Error ejecutando pruebas: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection: ${reason}`, 'red');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch((error) => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { main, checkServer, runCommand };
