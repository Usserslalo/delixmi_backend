const jwt = require('jsonwebtoken');
const UserService = require('../services/user.service');
const { logger } = require('../config/logger');

/**
 * Middleware de autenticación para WebSockets
 * Valida el JWT del owner en el handshake de conexión
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const requestId = socket.handshake.headers['x-request-id'] || 'unknown';

    logger.debug('Autenticando conexión WebSocket', {
      requestId,
      socketId: socket.id,
      hasToken: !!token
    });

    if (!token) {
      logger.warn('Conexión WebSocket rechazada: Token requerido', {
        requestId,
        socketId: socket.id
      });
      return next(new Error('Token de autenticación requerido'));
    }

    // Verificar JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.userId) {
      logger.warn('Conexión WebSocket rechazada: Token inválido - sin userId', {
        requestId,
        socketId: socket.id
      });
      return next(new Error('Token inválido'));
    }

    // Obtener usuario con roles
    const user = await UserService.getUserWithRoles(decoded.userId);
    
    if (!user) {
      logger.warn('Conexión WebSocket rechazada: Usuario no encontrado', {
        requestId,
        socketId: socket.id,
        userId: decoded.userId
      });
      return next(new Error('Usuario no encontrado'));
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      logger.warn('Conexión WebSocket rechazada: Usuario inactivo', {
        requestId,
        socketId: socket.id,
        userId: user.id,
        status: user.status
      });
      return next(new Error('Usuario inactivo'));
    }

    // Verificar rol de owner
    const isOwner = user.userRoleAssignments.some(
      assignment => assignment.role.name === 'owner'
    );

    if (!isOwner) {
      logger.warn('Conexión WebSocket rechazada: Acceso denegado - No es owner', {
        requestId,
        socketId: socket.id,
        userId: user.id,
        roles: user.userRoleAssignments.map(a => a.role.name)
      });
      return next(new Error('Acceso denegado - Solo owners pueden conectarse'));
    }

    // Obtener restaurantId del owner
    const restaurantId = await UserService.getRestaurantIdByOwnerId(user.id, requestId);
    
    if (!restaurantId) {
      logger.warn('Conexión WebSocket rechazada: Restaurante no encontrado', {
        requestId,
        socketId: socket.id,
        userId: user.id
      });
      return next(new Error('Restaurante no encontrado para este owner'));
    }

    // Agregar datos del usuario al socket
    socket.userId = user.id;
    socket.userEmail = user.email;
    socket.userName = `${user.name} ${user.lastname}`;
    socket.restaurantId = restaurantId;
    socket.userRole = 'owner';
    socket.requestId = requestId;

    logger.info('Conexión WebSocket autenticada exitosamente', {
      requestId,
      socketId: socket.id,
      userId: user.id,
      userEmail: user.email,
      restaurantId,
      role: 'owner'
    });

    next();
  } catch (error) {
    logger.error('Error en autenticación WebSocket', {
      requestId: socket.handshake.headers['x-request-id'] || 'unknown',
      socketId: socket.id,
      error: error.message,
      stack: error.stack
    });

    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Token inválido'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Token expirado'));
    } else {
      return next(new Error('Error de autenticación'));
    }
  }
};

module.exports = { authenticateSocket };
