const { Server } = require('socket.io');
// const { socketManager } = require('../websocket/socket-manager');
const { logger } = require('./logger');

let io;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: function (origin, callback) {
        // Permitir peticiones sin origen (apps móviles, herramientas de testing)
        if (!origin) {
          return callback(null, true);
        }
        
        // Whitelist de orígenes permitidos para WebSockets
        const whitelist = [
          process.env.FRONTEND_URL,           // URL del frontend en producción
          'http://localhost:3000',            // Desarrollo local
          'http://localhost:3001',            // Desarrollo local alternativo
          'http://127.0.0.1:3000',           // Desarrollo local (IP)
          'http://127.0.0.1:3001',           // Desarrollo local alternativo (IP)
          'https://delixmi-backend.onrender.com' // Backend en producción
        ].filter(Boolean);
        
        if (whitelist.indexOf(origin) !== -1) {
          callback(null, true);
        } else {
          logger.warn('Origen WebSocket no permitido', { origin });
          callback(new Error('Origen no permitido para WebSockets'));
        }
      },
      methods: ["GET", "POST"],
      credentials: true
    },
    allowEIO3: true // Compatibilidad con versiones anteriores
  });

  logger.info('🔌 Socket.io inicializado correctamente');

  // Inicializar handler simplificado del dashboard
  const { simpleDashboardHandler } = require('../websocket/simple-dashboard-handler');
  simpleDashboardHandler(io);

  // TODO: Mantener handlers existentes para compatibilidad después de verificar que el dashboard funciona
  // io.on('connection', (socket) => {
  //   logger.debug(`🔗 Cliente conectado: ${socket.id}`);
  //   // ... handlers existentes
  // });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io no está inicializado.");
  }
  return io;
}

module.exports = { initializeSocket, getIo };