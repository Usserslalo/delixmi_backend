const { logger } = require('../config/logger');

/**
 * Handler simplificado de WebSockets para el Dashboard del Owner
 * @param {SocketIO.Server} io - Instancia de Socket.IO
 */
const simpleDashboardHandler = (io) => {
  logger.info('Inicializando handler simplificado de WebSockets para Dashboard del Owner');

  io.on('connection', (socket) => {
    logger.info('Cliente conectado al WebSocket', {
      socketId: socket.id,
      connected: socket.connected
    });

    // Enviar confirmación de conexión
    socket.emit('CONNECTION_ESTABLISHED', {
      type: 'CONNECTION_ESTABLISHED',
      data: {
        socketId: socket.id,
        timestamp: new Date().toISOString(),
        message: 'Conexión WebSocket establecida exitosamente'
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
      logger.info('Cliente desconectado del WebSocket', {
        socketId: socket.id,
        reason
      });
    });

    // Manejar errores de socket
    socket.on('error', (error) => {
      logger.error('Error en WebSocket', {
        socketId: socket.id,
        error: error.message
      });
    });
  });

  logger.info('Handler simplificado de WebSockets inicializado correctamente');
};

module.exports = { simpleDashboardHandler };
