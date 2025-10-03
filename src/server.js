const express = require('express');
const http = require('http');
const cors = require('cors');
const { testConnection, disconnect } = require('./config/database');
const { initializeSocket } = require('./config/socket');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de prueba de conexión
app.get('/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    
    if (isConnected) {
      res.status(200).json({
        status: 'success',
        message: 'Servidor funcionando correctamente',
        database: 'Conectado',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Error de conexión a la base de datos',
        database: 'Desconectado',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Importar rutas
const authRoutes = require('./routes/auth.routes');
const restaurantRoutes = require('./routes/restaurant.routes');
const restaurantAdminRoutes = require('./routes/restaurant-admin.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const webhookRoutes = require('./routes/webhook.routes');
const driverRoutes = require('./routes/driver.routes');
const customerRoutes = require('./routes/customer.routes');
const adminRoutes = require('./routes/admin.routes');

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurant', restaurantAdminRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

// Ruta de prueba básica
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Servidor Delixmi Backend funcionando',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify'
      },
      restaurants: {
        list: 'GET /api/restaurants',
        getById: 'GET /api/restaurants/:id'
      },
      restaurantAdmin: {
        orders: 'GET /api/restaurant/orders',
        updateOrderStatus: 'PATCH /api/restaurant/orders/:orderId/status',
        subcategories: 'GET /api/restaurant/subcategories',
        createSubcategory: 'POST /api/restaurant/subcategories',
        updateSubcategory: 'PATCH /api/restaurant/subcategories/:subcategoryId',
        deleteSubcategory: 'DELETE /api/restaurant/subcategories/:subcategoryId',
        products: 'GET /api/restaurant/products',
        createProduct: 'POST /api/restaurant/products',
        updateProduct: 'PATCH /api/restaurant/products/:productId',
        deleteProduct: 'DELETE /api/restaurant/products/:productId'
      },
      checkout: {
        createPreference: 'POST /api/checkout/create-preference',
        paymentStatus: 'GET /api/checkout/payment-status/:paymentId'
      },
      webhooks: {
        mercadoPago: 'POST /api/webhooks/mercadopago'
      },
      driver: {
        availableOrders: 'GET /api/driver/orders/available'
      },
      customer: {
        orders: 'GET /api/customer/orders',
        addresses: 'GET /api/customer/addresses',
        createAddress: 'POST /api/customer/addresses',
        updateAddress: 'PATCH /api/customer/addresses/:addressId',
        deleteAddress: 'DELETE /api/customer/addresses/:addressId',
        driverLocation: 'GET /api/customer/orders/:orderId/location'
      },
      admin: {
        restaurants: 'GET /api/admin/restaurants'
      }
    }
  });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

// Inicializar Socket.io
initializeSocket(httpServer);

// Iniciar servidor
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io disponible en: http://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await disconnect();
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await disconnect();
  httpServer.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = app;