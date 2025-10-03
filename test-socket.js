const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.get('/', (req, res) => {
    res.send('<h1>Servidor de prueba funcionando</h1>');
});

io.on('connection', (socket) => {
    console.log('--- ¡UN CLIENTE SE CONECTÓ AL SERVIDOR DE PRUEBA! ---');
    socket.on('disconnect', () => {
        console.log('--- El cliente de prueba se desconectó ---');
    });
});

const PORT = 3001; // Usamos un puerto diferente para no chocar
httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor de PRUEBA corriendo en http://localhost:${PORT}`);
});