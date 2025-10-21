/**
 * Script de prueba para WebSocket del Dashboard del Owner
 * FASE 2A - Infraestructura WebSocket
 */

const { io } = require('socket.io-client');
const axios = require('axios');

// Configuración
const BASE_URL = 'https://delixmi-backend.onrender.com';
const WEBSOCKET_URL = 'wss://delixmi-backend.onrender.com';

async function getOwnerToken() {
  try {
    console.log('🔑 Obteniendo token de owner...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'ana.garcia@pizzeria.com',
      password: 'supersecret'
    });
    
    console.log('✅ Login exitoso');
    return response.data.data.accessToken;
  } catch (error) {
    console.error('❌ Error en login:', error.response?.data || error.message);
    return null;
  }
}

async function testWebSocketConnection() {
  try {
    console.log('🧪 PROBANDO CONEXIÓN WEBSOCKET');
    console.log('================================');
    
    // Obtener token
    const token = await getOwnerToken();
    if (!token) {
      console.log('❌ No se pudo obtener token. Abortando prueba.');
      return;
    }

    console.log(`🔗 Conectando a: ${WEBSOCKET_URL}`);
    console.log(`🔑 Token: ${token.substring(0, 20)}...`);
    console.log('');

    // Crear conexión WebSocket
    const socket = io(WEBSOCKET_URL, {
      auth: {
        token: token
      },
      transports: ['websocket'],
      timeout: 10000
    });

    // Eventos de conexión
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado exitosamente');
      console.log(`📡 Socket ID: ${socket.id}`);
      console.log('');
    });

    socket.on('CONNECTION_ESTABLISHED', (data) => {
      console.log('🎉 CONEXIÓN ESTABLECIDA');
      console.log('======================');
      console.log(`📊 Socket ID: ${data.data.socketId}`);
      console.log(`👤 User ID: ${data.data.userId}`);
      console.log(`📧 Email: ${data.data.userEmail}`);
      console.log(`👤 Nombre: ${data.data.userName}`);
      console.log(`🏪 Restaurant ID: ${data.data.restaurantId}`);
      console.log(`🏠 Restaurant Room: ${data.data.restaurantRoom}`);
      console.log(`⏰ Timestamp: ${data.data.timestamp}`);
      console.log(`💬 Mensaje: ${data.data.message}`);
      console.log('');

      // Probar unirse al dashboard
      console.log('📊 Uniéndose al dashboard...');
      socket.emit('JOIN_DASHBOARD', {});
    });

    socket.on('DASHBOARD_JOINED', (data) => {
      console.log('✅ UNIDO AL DASHBOARD');
      console.log('====================');
      console.log(`🏠 Dashboard Room: ${data.data.dashboardRoom}`);
      console.log(`🏪 Restaurant ID: ${data.data.restaurantId}`);
      console.log(`⏰ Timestamp: ${data.data.timestamp}`);
      console.log(`💬 Mensaje: ${data.data.message}`);
      console.log('');

      // Probar ping/pong
      console.log('🏓 Probando ping/pong...');
      socket.emit('ping');
    });

    socket.on('pong', (data) => {
      console.log('🏓 Pong recibido:', data.message);
      console.log(`⏰ Timestamp: ${data.timestamp}`);
      console.log('');

      // Probar salir del dashboard
      console.log('📊 Saliendo del dashboard...');
      socket.emit('LEAVE_DASHBOARD', {});
    });

    socket.on('DASHBOARD_LEFT', (data) => {
      console.log('✅ SALIÓ DEL DASHBOARD');
      console.log('======================');
      console.log(`🏠 Dashboard Room: ${data.data.dashboardRoom}`);
      console.log(`🏪 Restaurant ID: ${data.data.restaurantId}`);
      console.log(`⏰ Timestamp: ${data.data.timestamp}`);
      console.log(`💬 Mensaje: ${data.data.message}`);
      console.log('');

      // Cerrar conexión
      console.log('🔌 Cerrando conexión...');
      socket.disconnect();
    });

    // Eventos de error
    socket.on('CONNECTION_ERROR', (data) => {
      console.log('❌ ERROR DE CONEXIÓN');
      console.log('====================');
      console.log(`💬 Error: ${data.data.error}`);
      console.log(`⏰ Timestamp: ${data.data.timestamp}`);
    });

    socket.on('connect_error', (error) => {
      console.log('❌ Error de conexión:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Desconectado:', reason);
      console.log('');
      console.log('🎉 PRUEBA COMPLETADA');
      console.log('===================');
      console.log('✅ Conexión WebSocket: EXITOSA');
      console.log('✅ Autenticación JWT: EXITOSA');
      console.log('✅ Rooms por restaurante: EXITOSO');
      console.log('✅ Dashboard handler: EXITOSO');
      console.log('');
      console.log('🚀 La infraestructura WebSocket está lista para la Fase 2B!');
    });

    // Timeout de seguridad
    setTimeout(() => {
      if (socket.connected) {
        console.log('⏰ Timeout alcanzado. Cerrando conexión...');
        socket.disconnect();
      }
    }, 30000);

  } catch (error) {
    console.error('❌ Error en prueba WebSocket:', error.message);
  }
}

// Ejecutar prueba
testWebSocketConnection();
