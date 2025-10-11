const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { testConnection, disconnect } = require('./config/database');
const { initializeSocket } = require('./config/socket');

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Configuración de CORS para aplicaciones móviles y web
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (apps móviles, Postman, herramientas de testing)
    if (!origin) {
      return callback(null, true);
    }
    
    // Whitelist de orígenes permitidos
    const whitelist = [
      process.env.FRONTEND_URL,           // URL del frontend en producción
      'http://localhost:3000',            // Desarrollo local
      'http://localhost:3001',            // Desarrollo local alternativo
      'http://127.0.0.1:3000',           // Desarrollo local (IP)
      'http://127.0.0.1:3001'            // Desarrollo local alternativo (IP)
    ].filter(Boolean); // Filtrar valores undefined/null
    
    // Verificar si el origen está en la whitelist
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Permitir otros orígenes en desarrollo, bloquear en producción
      if (process.env.NODE_ENV === 'production') {
        console.warn(`⚠️ Origen no permitido bloqueado: ${origin}`);
        callback(new Error('No permitido por CORS'));
      } else {
        console.log(`✅ Origen permitido en desarrollo: ${origin}`);
        callback(null, true);
      }
    }
  },
  credentials: true, // Permitir cookies y headers de autenticación
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // Cache preflight requests por 24 horas
};

// Middleware básico
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public
app.use(express.static(path.join(__dirname, '../public')));

// Ruta específica para la página de reset password
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

// Ruta específica para la página de verificación de email
app.get('/verify-email', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/verify-email.html'));
});

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
const cartRoutes = require('./routes/cart.routes');
const categoryRoutes = require('./routes/category.routes');

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/restaurant', restaurantAdminRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/categories', categoryRoutes);

// Ruta de prueba básica
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Servidor Delixmi Backend funcionando',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      resetPassword: '/reset-password',
      verifyEmail: '/verify-email',
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
      categories: {
        list: 'GET /api/categories',
        getById: 'GET /api/categories/:id'
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
        orderDetails: 'GET /api/customer/orders/:orderId',
        addresses: 'GET /api/customer/addresses',
        createAddress: 'POST /api/customer/addresses',
        updateAddress: 'PATCH /api/customer/addresses/:addressId',
        deleteAddress: 'DELETE /api/customer/addresses/:addressId',
        driverLocation: 'GET /api/customer/orders/:orderId/location'
      },
      cart: {
        getCart: 'GET /api/cart',
        getSummary: 'GET /api/cart/summary',
        addItem: 'POST /api/cart/add',
        updateItem: 'PUT /api/cart/update/:itemId',
        removeItem: 'DELETE /api/cart/remove/:itemId',
        clearCart: 'DELETE /api/cart/clear',
        validateCart: 'POST /api/cart/validate'
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