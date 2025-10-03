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