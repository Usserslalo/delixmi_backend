const { Server } = require('socket.io');

let io;

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  console.log('🔌 Socket.io inicializado correctamente');

  io.on('connection', (socket) => {
    console.log(`🔗 Cliente conectado: ${socket.id}`);

    socket.on('join_branch_room', (data) => {
      const { branchId } = data;
      if (branchId) {
        const roomName = `branch_${branchId}`;
        socket.join(roomName);
        console.log(`📍 Cliente ${socket.id} se unió a la sala: ${roomName}`);
        socket.emit('joined_branch_room', { room: roomName });
      }
    });

    socket.on('join_user_room', (data) => {
      const { userId } = data;
      if (userId) {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`👤 Cliente ${socket.id} se unió a la sala de usuario: ${roomName}`);
        socket.emit('joined_user_room', { room: roomName });
      }
    });

    // Canal de repartidores para notificaciones de nuevos pedidos
    socket.on('join_drivers_channel', (data) => {
      const { driverId } = data;
      if (driverId) {
        const roomName = 'drivers_channel';
        socket.join(roomName);
        console.log(`🚚 Repartidor ${driverId} (${socket.id}) se unió al canal de repartidores`);
        socket.emit('joined_drivers_channel', { room: roomName, driverId });
      }
    });

    socket.on('leave_drivers_channel', (data) => {
      const { driverId } = data;
      if (driverId) {
        const roomName = 'drivers_channel';
        socket.leave(roomName);
        console.log(`🚚 Repartidor ${driverId} (${socket.id}) abandonó el canal de repartidores`);
        socket.emit('left_drivers_channel', { room: roomName, driverId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Cliente desconectado: ${socket.id}, razón: ${reason}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error("Socket.io no está inicializado.");
  }
  return io;
}

module.exports = { initializeSocket, getIo };