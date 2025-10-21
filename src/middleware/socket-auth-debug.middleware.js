const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');

/**
 * Middleware de autenticación simplificado para debug
 */
const authenticateSocketDebug = async (socket, next) => {
  try {
    console.log('🔍 MIDDLEWARE DE AUTENTICACIÓN EJECUTÁNDOSE');
    console.log('==========================================');
    
    const token = socket.handshake.auth.token;
    const requestId = socket.handshake.headers['x-request-id'] || 'unknown';

    console.log('📊 Datos del handshake:');
    console.log('  - Socket ID:', socket.id);
    console.log('  - Request ID:', requestId);
    console.log('  - Has Token:', !!token);
    console.log('  - Token (first 20):', token ? token.substring(0, 20) + '...' : 'null');
    console.log('  - Auth object:', JSON.stringify(socket.handshake.auth, null, 2));
    console.log('');

    if (!token) {
      console.log('❌ ERROR: Token requerido');
      return next(new Error('Token de autenticación requerido'));
    }

    // Verificar JWT
    console.log('🔐 Verificando JWT...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ JWT verificado exitosamente');
    console.log('📊 Decoded token:', JSON.stringify(decoded, null, 2));
    console.log('');

    // Simular datos del usuario para testing
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;
    socket.userName = 'Ana Garcia (Debug)';
    socket.restaurantId = 1; // Hardcoded para testing
    socket.userRole = 'owner';
    socket.requestId = requestId;

    console.log('✅ AUTENTICACIÓN EXITOSA');
    console.log('========================');
    console.log('  - User ID:', socket.userId);
    console.log('  - Email:', socket.userEmail);
    console.log('  - Restaurant ID:', socket.restaurantId);
    console.log('  - Role:', socket.userRole);
    console.log('');

    next();
  } catch (error) {
    console.log('❌ ERROR EN AUTENTICACIÓN');
    console.log('==========================');
    console.log('Error:', error.message);
    console.log('Type:', error.name);
    console.log('');

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Token inválido'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expirado'));
    } else {
      return next(new Error('Error de autenticación'));
    }
  }
};

module.exports = { authenticateSocketDebug };
