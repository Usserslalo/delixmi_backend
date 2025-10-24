#!/usr/bin/env node

/**
 * Script para probar todos los endpoints de autenticación
 * Uso: node scripts/test-auth-endpoints.js
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

// Configuración
const BASE_URL = 'http://localhost:3000';
const AUTH_BASE_URL = `${BASE_URL}/api/auth`;

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

// Función para probar endpoint
async function testEndpoint(name, method, path, data = null, headers = {}) {
  try {
    log(`\n🧪 Probando: ${name}`, 'cyan');
    log(`   ${method} ${path}`, 'blue');
    
    let req = request(BASE_URL);
    
    switch (method.toLowerCase()) {
      case 'get':
        req = req.get(path);
        break;
      case 'post':
        req = req.post(path);
        break;
      case 'put':
        req = req.put(path);
        break;
      case 'delete':
        req = req.delete(path);
        break;
    }
    
    if (data) {
      req = req.send(data);
    }
    
    if (Object.keys(headers).length > 0) {
      req = req.set(headers);
    }
    
    const response = await req;
    
    if (response.status >= 200 && response.status < 300) {
      log(`   ✅ ${response.status} - ${response.body.message || 'Éxito'}`, 'green');
      return { success: true, data: response.body.data, token: response.body.data?.accessToken };
    } else {
      log(`   ❌ ${response.status} - ${response.body.message || 'Error'}`, 'red');
      return { success: false, error: response.body.message };
    }
  } catch (error) {
    log(`   💥 Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

// Función principal
async function main() {
  log('🚀 Iniciando pruebas de endpoints de autenticación...', 'bright');
  log(`📡 Servidor: ${BASE_URL}`, 'blue');
  
  let accessToken = null;
  let refreshToken = null;
  let testUserId = null;
  
  try {
    // 1. Health Check
    await testEndpoint('Health Check', 'GET', '/api/auth/health');
    
    // 2. Registro de usuario de prueba
    const registerData = {
      name: 'Test',
      lastname: 'User',
      email: 'test.user@example.com',
      phone: '1234567890',
      password: 'TestPassword123!'
    };
    
    const registerResult = await testEndpoint('Registro de Usuario', 'POST', '/api/auth/register', registerData);
    if (registerResult.success) {
      testUserId = registerResult.data.user.id;
      log(`   📝 Usuario de prueba creado - ID: ${testUserId}`, 'yellow');
    }
    
    // 3. Login con usuario existente (del seed)
    const loginData = {
      email: 'admin@delixmi.com',
      password: 'supersecret'
    };
    
    const loginResult = await testEndpoint('Login', 'POST', '/api/auth/login', loginData);
    if (loginResult.success) {
      accessToken = loginResult.token;
      refreshToken = loginResult.data.refreshToken;
      log(`   🔑 Token obtenido - Usuario: ${loginResult.data.user.email}`, 'yellow');
    }
    
    if (!accessToken) {
      log('❌ No se pudo obtener token de acceso. Saltando pruebas que requieren autenticación.', 'red');
      return;
    }
    
    const authHeaders = {
      'Authorization': `Bearer ${accessToken}`
    };
    
    // 4. Obtener perfil
    await testEndpoint('Obtener Perfil', 'GET', '/api/auth/profile', null, authHeaders);
    
    // 5. Verificar token
    await testEndpoint('Verificar Token', 'GET', '/api/auth/verify', null, authHeaders);
    
    // 6. Actualizar perfil
    const updateData = {
      name: 'Admin',
      lastname: 'Actualizado',
      phone: '9876543210'
    };
    await testEndpoint('Actualizar Perfil', 'PUT', '/api/auth/profile', updateData, authHeaders);
    
    // 7. Cambiar contraseña
    const changePasswordData = {
      currentPassword: 'supersecret',
      newPassword: 'NewPassword123!'
    };
    await testEndpoint('Cambiar Contraseña', 'PUT', '/api/auth/change-password', changePasswordData, authHeaders);
    
    // 8. Revertir cambio de contraseña
    const revertPasswordData = {
      currentPassword: 'NewPassword123!',
      newPassword: 'supersecret'
    };
    await testEndpoint('Revertir Contraseña', 'PUT', '/api/auth/change-password', revertPasswordData, authHeaders);
    
    // 9. Enviar verificación por SMS
    await testEndpoint('Enviar Verificación SMS', 'POST', '/api/auth/send-phone-verification', null, authHeaders);
    
    // 10. Verificar teléfono (simulado)
    const verifyPhoneData = {
      otp: '123456'
    };
    await testEndpoint('Verificar Teléfono', 'POST', '/api/auth/verify-phone', verifyPhoneData, authHeaders);
    
    // 11. Solicitar reset de contraseña
    const forgotPasswordData = {
      email: 'admin@delixmi.com'
    };
    await testEndpoint('Solicitar Reset Contraseña', 'POST', '/api/auth/forgot-password', forgotPasswordData);
    
    // 12. Reenviar verificación
    const resendData = {
      email: 'test.user@example.com'
    };
    await testEndpoint('Reenviar Verificación', 'POST', '/api/auth/resend-verification', resendData);
    
    // 13. Refresh token
    if (refreshToken) {
      const refreshData = {
        refreshToken: refreshToken
      };
      const refreshResult = await testEndpoint('Refresh Token', 'POST', '/api/auth/refresh-token', refreshData);
      if (refreshResult.success) {
        accessToken = refreshResult.token;
        refreshToken = refreshResult.data.refreshToken;
        log(`   🔄 Token renovado`, 'yellow');
      }
    }
    
    // 14. Logout
    if (refreshToken) {
      const logoutData = {
        refreshToken: refreshToken
      };
      await testEndpoint('Logout', 'POST', '/api/auth/logout', logoutData);
    }
    
    // 15. Obtener token de verificación (testing)
    if (testUserId) {
      await testEndpoint('Obtener Token Verificación', 'GET', `/api/auth/get-verification-token/${testUserId}`);
    }
    
    log('\n✅ Pruebas completadas exitosamente!', 'green');
    
  } catch (error) {
    log(`\n❌ Error durante las pruebas: ${error.message}`, 'red');
    console.error(error);
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

module.exports = { main, testEndpoint };
