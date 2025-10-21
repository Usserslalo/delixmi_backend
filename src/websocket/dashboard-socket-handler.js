const { logger } = require('../config/logger');

/**
 * Eventos del Dashboard del Owner
 */
const DASHBOARD_EVENTS = {
  // Conexión
  CONNECTION_ESTABLISHED: 'CONNECTION_ESTABLISHED',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // Dashboard
  JOIN_DASHBOARD: 'JOIN_DASHBOARD',
  LEAVE_DASHBOARD: 'LEAVE_DASHBOARD',
  DASHBOARD_JOINED: 'DASHBOARD_JOINED',
  DASHBOARD_LEFT: 'DASHBOARD_LEFT',
  
  // Pedidos
  NEW_ORDER_PENDING: 'NEW_ORDER_PENDING',
  ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  
  // Finanzas
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  WALLET_UPDATED: 'WALLET_UPDATED',
  
  // Notificaciones
  RESTAURANT_ALERT: 'RESTAURANT_ALERT',
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
  
  // Dashboard Updates
  DASHBOARD_UPDATE: 'DASHBOARD_UPDATE'
};

/**
 * Handler de WebSockets para el Dashboard del Owner
 * @param {SocketIO.Server} io - Instancia de Socket.IO
 */
const dashboardSocketHandler = (io) => {
  logger.info('Inicializando handler de WebSockets para Dashboard del Owner');

  // El middleware de autenticación se aplica globalmente en socket.js

  io.on('connection', (socket) => {
    const { userId, userEmail, userName, restaurantId, requestId } = socket;
    
    logger.info('Owner conectado al WebSocket', {
      requestId,
      socketId: socket.id,
      userId,
      userEmail,
      userName,
      restaurantId
    });

    // Unir automáticamente al room del restaurante
    const restaurantRoom = `restaurant_${restaurantId}`;
    socket.join(restaurantRoom);
    
    logger.debug('Owner unido al room del restaurante', {
      requestId,
      socketId: socket.id,
      userId,
      restaurantId,
      room: restaurantRoom
    });

    // Enviar confirmación de conexión
    socket.emit(DASHBOARD_EVENTS.CONNECTION_ESTABLISHED, {
      type: DASHBOARD_EVENTS.CONNECTION_ESTABLISHED,
      data: {
        socketId: socket.id,
        userId,
        userEmail,
        userName,
        restaurantId,
        restaurantRoom,
        timestamp: new Date().toISOString(),
        message: 'Conexión WebSocket establecida exitosamente'
      }
    });

    // Evento: Unirse al dashboard específico
    socket.on(DASHBOARD_EVENTS.JOIN_DASHBOARD, (data) => {
      try {
        const dashboardRoom = `dashboard_${restaurantId}`;
        socket.join(dashboardRoom);
        
        logger.debug('Owner unido al dashboard', {
          requestId,
          socketId: socket.id,
          userId,
          restaurantId,
          dashboardRoom
        });

        socket.emit(DASHBOARD_EVENTS.DASHBOARD_JOINED, {
          type: DASHBOARD_EVENTS.DASHBOARD_JOINED,
          data: {
            dashboardRoom,
            restaurantId,
            timestamp: new Date().toISOString(),
            message: 'Unido al dashboard exitosamente'
          }
        });
      } catch (error) {
        logger.error('Error uniendo owner al dashboard', {
          requestId,
          socketId: socket.id,
          userId,
          restaurantId,
          error: error.message
        });

        socket.emit(DASHBOARD_EVENTS.CONNECTION_ERROR, {
          type: DASHBOARD_EVENTS.CONNECTION_ERROR,
          data: {
            error: 'Error uniéndose al dashboard',
            timestamp: new Date().toISOString()
          }
        });
      }
    });

    // Evento: Salir del dashboard
    socket.on(DASHBOARD_EVENTS.LEAVE_DASHBOARD, (data) => {
      try {
        const dashboardRoom = `dashboard_${restaurantId}`;
        socket.leave(dashboardRoom);
        
        logger.debug('Owner salió del dashboard', {
          requestId,
          socketId: socket.id,
          userId,
          restaurantId,
          dashboardRoom
        });

        socket.emit(DASHBOARD_EVENTS.DASHBOARD_LEFT, {
          type: DASHBOARD_EVENTS.DASHBOARD_LEFT,
          data: {
            dashboardRoom,
            restaurantId,
            timestamp: new Date().toISOString(),
            message: 'Salió del dashboard exitosamente'
          }
        });
      } catch (error) {
        logger.error('Error sacando owner del dashboard', {
          requestId,
          socketId: socket.id,
          userId,
          restaurantId,
          error: error.message
        });
      }
    });

    // Evento: Ping/Pong para mantener conexión viva
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        message: 'Conexión activa'
      });
    });

    // Manejar desconexión
    socket.on('disconnect', (reason) => {
      logger.info('Owner desconectado del WebSocket', {
        requestId,
        socketId: socket.id,
        userId,
        userEmail,
        restaurantId,
        reason
      });
    });

    // Manejar errores de socket
    socket.on('error', (error) => {
      logger.error('Error en WebSocket del owner', {
        requestId,
        socketId: socket.id,
        userId,
        restaurantId,
        error: error.message,
        stack: error.stack
      });
    });
  });

  logger.info('Handler de WebSockets para Dashboard del Owner inicializado correctamente');
};

module.exports = {
  dashboardSocketHandler,
  DASHBOARD_EVENTS
};
