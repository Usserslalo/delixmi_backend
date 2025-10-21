const { getIo } = require('../config/socket');
const { dashboardSocketHandler, DASHBOARD_EVENTS } = require('./dashboard-socket-handler');
const { logger } = require('../config/logger');

/**
 * Manager centralizado de WebSockets
 * Proporciona métodos para emitir eventos a rooms específicos
 */
class SocketManager {
  constructor() {
    this.io = null;
    this.events = DASHBOARD_EVENTS;
  }

  /**
   * Inicializar el manager con la instancia de Socket.IO
   */
  initialize() {
    try {
      this.io = getIo();
      dashboardSocketHandler(this.io);
      logger.info('SocketManager inicializado correctamente');
    } catch (error) {
      logger.error('Error inicializando SocketManager', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Emitir evento a un restaurante específico
   * @param {number} restaurantId - ID del restaurante
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  emitToRestaurant(restaurantId, event, data) {
    if (!this.io) {
      logger.error('SocketManager no inicializado');
      return;
    }

    const restaurantRoom = `restaurant_${restaurantId}`;
    
    logger.debug('Emitiendo evento a restaurante', {
      restaurantId,
      restaurantRoom,
      event,
      dataKeys: Object.keys(data || {})
    });

    this.io.to(restaurantRoom).emit(event, {
      type: event,
      data: {
        ...data,
        restaurantId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Emitir evento al dashboard de un restaurante específico
   * @param {number} restaurantId - ID del restaurante
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  emitToDashboard(restaurantId, event, data) {
    if (!this.io) {
      logger.error('SocketManager no inicializado');
      return;
    }

    const dashboardRoom = `dashboard_${restaurantId}`;
    
    logger.debug('Emitiendo evento al dashboard', {
      restaurantId,
      dashboardRoom,
      event,
      dataKeys: Object.keys(data || {})
    });

    this.io.to(dashboardRoom).emit(event, {
      type: event,
      data: {
        ...data,
        restaurantId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Emitir evento a un usuario específico
   * @param {number} userId - ID del usuario
   * @param {string} event - Nombre del evento
   * @param {Object} data - Datos a enviar
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      logger.error('SocketManager no inicializado');
      return;
    }

    const userRoom = `user_${userId}`;
    
    logger.debug('Emitiendo evento a usuario', {
      userId,
      userRoom,
      event,
      dataKeys: Object.keys(data || {})
    });

    this.io.to(userRoom).emit(event, {
      type: event,
      data: {
        ...data,
        userId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Obtener estadísticas de conexiones
   */
  getConnectionStats() {
    if (!this.io) {
      return { error: 'SocketManager no inicializado' };
    }

    const sockets = this.io.sockets.sockets;
    const stats = {
      totalConnections: sockets.size,
      rooms: {},
      connections: []
    };

    // Contar conexiones por room
    sockets.forEach((socket) => {
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        stats.rooms[room] = (stats.rooms[room] || 0) + 1;
      });

      stats.connections.push({
        socketId: socket.id,
        userId: socket.userId,
        userEmail: socket.userEmail,
        restaurantId: socket.restaurantId,
        rooms: rooms
      });
    });

    return stats;
  }

  /**
   * Obtener lista de eventos disponibles
   */
  getAvailableEvents() {
    return this.events;
  }
}

// Instancia singleton
const socketManager = new SocketManager();

module.exports = {
  socketManager,
  DASHBOARD_EVENTS
};
