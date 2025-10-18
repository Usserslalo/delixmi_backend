const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const { testConnection, disconnect } = require('./config/database');
const { initializeSocket } = require('./config/socket');
const { 
  errorHandler, 
  notFoundHandler, 
  zodErrorHandler, 
  rateLimitErrorHandler, 
  corsErrorHandler 
} = require('./middleware/error.middleware');
const { 
  requestIdMiddleware, 
  requestLoggingMiddleware, 
  errorRequestIdMiddleware 
} = require('./middleware/requestId.middleware');
const { logger } = require('./config/logger');

const app = express();

// Configurar Express para confiar en el proxy (necesario para Render)
app.set('trust proxy', 1);

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

// Configuración de Helmet para headers de seguridad
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'", "/js/"],
      connectSrc: ["'self'", "https://api.mercadopago.com", "https://maps.googleapis.com"],
      frameSrc: ["'self'", "https://www.mercadopago.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false, // Deshabilitado para compatibilidad con APIs externas
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  permittedCrossDomainPolicies: false
};

// Middleware básico
app.use(helmet(helmetOptions));
app.use(cors(corsOptions));

// Middleware de Request ID (debe ir temprano en la cadena)
app.use(requestIdMiddleware);

// Middleware de logging de peticiones HTTP
app.use(requestLoggingMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta public con configuración optimizada
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    // Configurar headers específicos para archivos de uploads
    if (path.includes('/uploads/')) {
      // Log para debugging (solo en desarrollo)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`📁 Sirviendo archivo: ${path}`);
      }
      
      // Configurar headers para imágenes según su extensión
      if (path.match(/\.jpg$|\.jpeg$/i)) {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (path.match(/\.png$/i)) {
        res.setHeader('Content-Type', 'image/png');
      } else if (path.match(/\.gif$/i)) {
        res.setHeader('Content-Type', 'image/gif');
      } else if (path.match(/\.webp$/i)) {
        res.setHeader('Content-Type', 'image/webp');
      }
      
      // Configurar cache para todas las imágenes de uploads
      if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 año
      }
    }
  }
}));

// Ruta de diagnóstico para verificar archivos de uploads
app.get('/debug/uploads/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  
  if (!['logos', 'covers'].includes(type)) {
    return res.status(400).json({
      status: 'error',
      message: 'Tipo inválido. Solo se permiten: logos, covers'
    });
  }
  
  const filePath = path.join(__dirname, '../public/uploads', type, filename);
  
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      return res.status(404).json({
        status: 'error',
        message: 'Archivo no encontrado',
        filePath: filePath,
        filename: filename,
        type: type
      });
    }
    
    const stats = fs.statSync(filePath);
    res.json({
      status: 'success',
      message: 'Archivo encontrado',
      filename: filename,
      type: type,
      filePath: filePath,
      size: stats.size,
      lastModified: stats.mtime
    });
  });
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
const geocodingRoutes = require('./routes/geocoding.routes');
const homeRoutes = require('./routes/home.routes');

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
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/home', homeRoutes);

// Ruta específica para la página de reset password
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/reset-password.html'));
});

// Ruta específica para la página de verificación de email
app.get('/email-verification', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/verify-email.html'));
});

// Ruta de prueba básica
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Servidor Delixmi Backend funcionando',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      resetPassword: '/reset-password',
      verifyEmail: '/email-verification',
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
        driverLocation: 'GET /api/customer/orders/:orderId/location',
        checkCoverageByAddress: 'POST /api/customer/check-coverage',
        checkCoverageByCoordinates: 'GET /api/customer/check-coverage?lat=&lng='
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
      },
      geocoding: {
        reverseGeocode: 'POST /api/geocoding/reverse'
      },
      home: {
        dashboard: 'GET /api/home/dashboard'
      }
    }
  });
});

// Middlewares de manejo de errores (DEBEN ir al final, después de todas las rutas)
// 0. Asegurar Request ID en errores
app.use(errorRequestIdMiddleware);

// 1. Manejo de errores de CORS
app.use(corsErrorHandler);

// 2. Manejo de errores de rate limiting
app.use(rateLimitErrorHandler);

// 3. Manejo de errores de validación Zod
app.use(zodErrorHandler);

// 4. Manejo de rutas no encontradas (404)
app.use(notFoundHandler);

// 5. Middleware global de manejo de errores (DEBE ser el último)
app.use(errorHandler);

// Inicializar Socket.io
initializeSocket(httpServer);

// Iniciar servidor
httpServer.listen(PORT, () => {
  logger.info('Servidor iniciado exitosamente', {
    meta: {
      port: PORT,
      url: `http://localhost:${PORT}`,
      healthCheck: `http://localhost:${PORT}/health`,
      socketIo: `http://localhost:${PORT}`,
      environment: process.env.NODE_ENV || 'development'
    }
  });
  
  // También mantener logs en consola para desarrollo
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 Socket.io disponible en: http://localhost:${PORT}`);
});

// Manejo de cierre graceful
process.on('SIGINT', async () => {
  logger.info('Señal SIGINT recibida, cerrando servidor...');
  console.log('\n🛑 Cerrando servidor...');
  await disconnect();
  httpServer.close(() => {
    logger.info('Servidor cerrado correctamente');
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  logger.info('Señal SIGTERM recibida, cerrando servidor...');
  console.log('\n🛑 Cerrando servidor...');
  await disconnect();
  httpServer.close(() => {
    logger.info('Servidor cerrado correctamente');
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

module.exports = app;