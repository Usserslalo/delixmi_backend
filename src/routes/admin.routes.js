const express = require('express');
const { query, param, body } = require('express-validator');
const { 
  // Controladores existentes
  getRestaurants, updateRestaurantStatus, updateRestaurant, getUsers, createUser, updateUser, getRestaurantPayouts, getDriverPayouts,
  // Fase 1: Seguridad, Roles y Usuarios
  updateUserStatus, updateUserSuspicious, resetUserPassword, updateRolePermissions, assignUserRole, deleteUserSessions, getRoles, createRole,
  // Fase 2: Configuración Global y Geografía
  updateGlobalConfig, getGlobalConfig, createServiceArea, updateServiceArea,
  // Fase 3: Restaurantes y Catálogo
  verifyRestaurant, updateRestaurantCommission, createCategory, updateCategory, approvePromotion, adjustProductStock, getFlaggedProducts, getInventoryLogs,
  // Fase 4: Finanzas y Billeteras
  updatePaymentStatus, processRestaurantPayouts, adjustRestaurantWallet, processDriverPayouts, adjustDriverWallet, getRestaurantWalletTransactions, getDriverWalletTransactions,
  // Fase 5: Logística y Repartidores
  updateDriverKyc, blockDriver, forceDriverAssignment, getDriversKycPending, getOrderRouteLogs, getOrderAssignments,
  // Fase 6: Soporte, Auditoría y Comms
  updateComplaintStatus, sendMessage, broadcastNotification, getAuditLogs, getComplaints, getReportedRatings
} = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { 
  // Fase 1
  updateUserStatusSchema, updateUserSuspiciousSchema, resetUserPasswordSchema, updateRolePermissionsSchema, assignUserRoleSchema, createRoleSchema,
  // Fase 2
  updateGlobalConfigSchema, createServiceAreaSchema, updateServiceAreaSchema,
  // Fase 3
  verifyRestaurantSchema, updateRestaurantCommissionSchema, createCategorySchema, updateCategorySchema, adjustProductStockSchema,
  // Fase 4
  updatePaymentStatusSchema, adjustRestaurantWalletSchema, adjustDriverWalletSchema,
  // Fase 5
  updateDriverKycSchema, blockDriverSchema,
  // Fase 6
  updateComplaintStatusSchema, sendMessageSchema, broadcastNotificationSchema,
  // Query schemas
  auditLogsQuerySchema, complaintsQuerySchema, inventoryLogsQuerySchema, restaurantWalletTransactionsQuerySchema, driverWalletTransactionsQuerySchema
} = require('../validations/admin.validation');

const router = express.Router();

// Validaciones para query parameters
const restaurantsListValidation = [
  query('status')
    .optional()
    .isIn(['pending_approval', 'active', 'inactive', 'suspended', 'rejected'])
    .withMessage('El estado debe ser uno de: pending_approval, active, inactive, suspended, rejected'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0')
    .toInt(),
  
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El tamaño de página debe ser un número entero entre 1 y 100')
    .toInt()
];

// Validaciones para actualización de estado de restaurante
const updateRestaurantStatusValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID del restaurante debe ser un número entero mayor a 0')
    .toInt(),
  
  body('status')
    .notEmpty()
    .withMessage('El estado es requerido')
    .isIn(['pending_approval', 'active', 'inactive', 'suspended', 'rejected'])
    .withMessage('El estado debe ser uno de: pending_approval, active, inactive, suspended, rejected')
    .trim()
    .escape()
];

// Validaciones para actualización de restaurante
const updateRestaurantValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID del restaurante debe ser un número entero mayor a 0')
    .toInt(),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 150 })
    .withMessage('El nombre debe tener entre 2 y 150 caracteres')
    .trim()
    .escape(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('La descripción no puede exceder 1000 caracteres')
    .trim()
    .escape(),
  
  body('logoUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('La URL del logo debe ser una URL válida')
    .isLength({ max: 255 })
    .withMessage('La URL del logo no puede exceder 255 caracteres'),
  
  body('coverPhotoUrl')
    .optional()
    .isURL({ protocols: ['http', 'https'] })
    .withMessage('La URL de la foto de portada debe ser una URL válida')
    .isLength({ max: 255 })
    .withMessage('La URL de la foto de portada no puede exceder 255 caracteres'),
  
  body('commissionRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La tasa de comisión debe ser un número entre 0 y 100')
    .toFloat(),
  
  body('status')
    .optional()
    .isIn(['pending_approval', 'active', 'inactive', 'suspended', 'rejected'])
    .withMessage('El estado debe ser uno de: pending_approval, active, inactive, suspended, rejected')
    .trim()
    .escape()
];

// Validaciones para listado de usuarios
const usersListValidation = [
  query('role')
    .optional()
    .isIn(['super_admin', 'platform_manager', 'owner', 'branch_manager', 'order_manager', 'kitchen_staff', 'driver_platform', 'driver_restaurant', 'customer'])
    .withMessage('El rol debe ser uno de: super_admin, platform_manager, owner, branch_manager, order_manager, kitchen_staff, driver_platform, driver_restaurant, customer'),
  
  query('status')
    .optional()
    .isIn(['pending', 'active', 'inactive', 'suspended', 'deleted'])
    .withMessage('El estado debe ser uno de: pending, active, inactive, suspended, deleted'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0')
    .toInt(),
  
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El tamaño de página debe ser un número entero entre 1 y 100')
    .toInt()
];

// Validaciones para creación de usuario
const createUserValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  body('lastname')
    .notEmpty()
    .withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail()
    .isLength({ max: 150 })
    .withMessage('El email no puede exceder 150 caracteres'),
  
  body('phone')
    .isMobilePhone('es-MX')
    .withMessage('Debe ser un número de teléfono válido')
    .isLength({ min: 10, max: 20 })
    .withMessage('El teléfono debe tener entre 10 y 20 caracteres'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]/)
    .withMessage('La contraseña debe contener al menos: 1 letra minúscula, 1 mayúscula, 1 número y 1 carácter especial')
    .isLength({ max: 128 })
    .withMessage('La contraseña no puede exceder 128 caracteres'),
  
  body('roleName')
    .notEmpty()
    .withMessage('El nombre del rol es requerido')
    .isIn(['super_admin', 'platform_manager', 'owner', 'branch_manager', 'order_manager', 'kitchen_staff', 'driver_platform', 'driver_restaurant', 'customer'])
    .withMessage('El rol debe ser uno de: super_admin, platform_manager, owner, branch_manager, order_manager, kitchen_staff, driver_platform, driver_restaurant, customer')
    .trim()
    .escape(),
  
  body('restaurantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID del restaurante debe ser un número entero mayor a 0')
    .toInt(),
  
  body('branchId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('El ID de la sucursal debe ser un número entero mayor a 0')
    .toInt()
];

// Validaciones para actualización de usuario
const updateUserValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('El ID del usuario debe ser un número entero mayor a 0')
    .toInt(),
  
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  body('lastname')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  body('status')
    .optional()
    .isIn(['pending', 'active', 'inactive', 'suspended', 'deleted'])
    .withMessage('El estado debe ser uno de: pending, active, inactive, suspended, deleted')
    .trim()
    .escape()
];

// Validaciones para reporte de pagos a restaurantes
const restaurantPayoutsValidation = [
  query('startDate')
    .notEmpty()
    .withMessage('La fecha de inicio es requerida')
    .isISO8601()
    .withMessage('La fecha de inicio debe ser una fecha válida en formato ISO 8601 (YYYY-MM-DD)')
    .toDate(),
  
  query('endDate')
    .notEmpty()
    .withMessage('La fecha de fin es requerida')
    .isISO8601()
    .withMessage('La fecha de fin debe ser una fecha válida en formato ISO 8601 (YYYY-MM-DD)')
    .toDate()
    .custom((value, { req }) => {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(value);
      
      if (endDate < startDate) {
        throw new Error('La fecha de fin debe ser posterior o igual a la fecha de inicio');
      }
      
      return true;
    })
];

// Validaciones para reporte de pagos a repartidores
const driverPayoutsValidation = [
  query('startDate')
    .notEmpty()
    .withMessage('La fecha de inicio es requerida')
    .isISO8601()
    .withMessage('La fecha de inicio debe ser una fecha válida en formato ISO 8601 (YYYY-MM-DD)')
    .toDate(),
  
  query('endDate')
    .notEmpty()
    .withMessage('La fecha de fin es requerida')
    .isISO8601()
    .withMessage('La fecha de fin debe ser una fecha válida en formato ISO 8601 (YYYY-MM-DD)')
    .toDate()
    .custom((value, { req }) => {
      const startDate = new Date(req.query.startDate);
      const endDate = new Date(value);
      
      if (endDate < startDate) {
        throw new Error('La fecha de fin debe ser posterior o igual a la fecha de inicio');
      }
      
      return true;
    })
];

/**
 * @route   GET /api/admin/restaurants
 * @desc    Obtener lista de todos los restaurantes con filtros y paginación
 * @access  Private (super_admin, platform_manager)
 * @query   status (opcional) - Filtrar por estado del restaurante
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 100)
 */
router.get('/restaurants', 
  authenticateToken, 
  requireRole(['super_admin', 'platform_manager']), 
  restaurantsListValidation, 
  getRestaurants
);

/**
 * @route   PATCH /api/admin/restaurants/:id/status
 * @desc    Actualizar el estado de un restaurante específico
 * @access  Private (super_admin, platform_manager)
 * @params  id - ID del restaurante
 * @body    status - Nuevo estado del restaurante
 */
router.patch('/restaurants/:id/status',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  updateRestaurantStatusValidation,
  updateRestaurantStatus
);

/**
 * @route   PATCH /api/admin/restaurants/:id
 * @desc    Actualizar los detalles de un restaurante específico
 * @access  Private (super_admin, platform_manager)
 * @params  id - ID del restaurante
 * @body    name, description, logoUrl, coverPhotoUrl, commissionRate, status (todos opcionales)
 */
router.patch('/restaurants/:id',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  updateRestaurantValidation,
  updateRestaurant
);

/**
 * @route   GET /api/admin/users
 * @desc    Obtener lista de todos los usuarios con filtros y paginación
 * @access  Private (super_admin, platform_manager)
 * @query   role (opcional) - Filtrar por rol del usuario
 * @query   status (opcional) - Filtrar por estado del usuario
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 100)
 */
router.get('/users',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  usersListValidation,
  getUsers
);

/**
 * @route   POST /api/admin/users
 * @desc    Crear un nuevo usuario y asignarle un rol
 * @access  Private (super_admin, platform_manager)
 * @body    name, lastname, email, phone, password, roleName (requeridos)
 * @body    restaurantId, branchId (opcionales)
 */
router.post('/users',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  createUserValidation,
  createUser
);

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Actualizar la información de un usuario específico
 * @access  Private (super_admin, platform_manager)
 * @params  id - ID del usuario
 * @body    name, lastname, status (todos opcionales)
 */
router.patch('/users/:id',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  updateUserValidation,
  updateUser
);

/**
 * @route   GET /api/admin/payouts/restaurants
 * @desc    Obtener reporte de pagos a restaurantes en un periodo determinado
 * @access  Private (super_admin, platform_manager)
 * @query   startDate (requerido) - Fecha de inicio del periodo (YYYY-MM-DD)
 * @query   endDate (requerido) - Fecha de fin del periodo (YYYY-MM-DD)
 */
router.get('/payouts/restaurants',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  restaurantPayoutsValidation,
  getRestaurantPayouts
);

/**
 * @route   GET /api/admin/payouts/drivers
 * @desc    Obtener reporte de saldos de repartidores en un periodo determinado
 * @access  Private (super_admin, platform_manager)
 * @query   startDate (requerido) - Fecha de inicio del periodo (YYYY-MM-DD)
 * @query   endDate (requerido) - Fecha de fin del periodo (YYYY-MM-DD)
 */
router.get('/payouts/drivers',
  authenticateToken,
  requireRole(['super_admin', 'platform_manager']),
  driverPayoutsValidation,
  getDriverPayouts
);

// ========================================
// FASE 1: SEGURIDAD, ROLES Y USUARIOS
// ========================================

// Actualizar estado de usuario
router.patch('/users/:id/status',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateUserStatusSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateUserStatus
);

// Marcar usuario como sospechoso
router.patch('/users/:id/suspicious',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateUserSuspiciousSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateUserSuspicious
);

// Resetear contraseña de usuario
router.post('/users/:id/reset-password',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = resetUserPasswordSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  resetUserPassword
);

// Actualizar permisos de rol
router.patch('/roles/:id/permissions',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateRolePermissionsSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateRolePermissions
);

// Asignar rol a usuario
router.post('/users/:userId/role',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = assignUserRoleSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  assignUserRole
);

// Eliminar sesiones de usuario
router.delete('/users/:id/sessions',
  authenticateToken,
  requireRole(['super_admin']),
  deleteUserSessions
);

// Obtener lista de roles
router.get('/roles',
  authenticateToken,
  requireRole(['super_admin']),
  getRoles
);

// Crear nuevo rol
router.post('/roles',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = createRoleSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  createRole
);

// ========================================
// FASE 2: CONFIGURACIÓN GLOBAL Y GEOGRAFÍA
// ========================================

// Actualizar configuración global
router.patch('/settings/global',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateGlobalConfigSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateGlobalConfig
);

// Obtener configuración global
router.get('/settings/global',
  authenticateToken,
  requireRole(['super_admin']),
  getGlobalConfig
);

// Crear área de servicio
router.post('/service-areas',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = createServiceAreaSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  createServiceArea
);

// Actualizar área de servicio
router.patch('/service-areas/:id',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateServiceAreaSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateServiceArea
);

// ========================================
// FASE 3: RESTAURANTES Y CATÁLOGO
// ========================================

// Verificar restaurante manualmente
router.patch('/restaurants/:id/verify',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = verifyRestaurantSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  verifyRestaurant
);

// Actualizar comisión de restaurante
router.patch('/restaurants/:id/commission',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateRestaurantCommissionSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateRestaurantCommission
);

// Crear categoría
router.post('/categories',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = createCategorySchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  createCategory
);

// Actualizar categoría
router.patch('/categories/:id',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateCategorySchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateCategory
);

// Aprobar promoción
router.post('/promotions/:id/approve',
  authenticateToken,
  requireRole(['super_admin']),
  approvePromotion
);

// Ajustar stock de producto
router.post('/products/:id/stock/adjust',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = adjustProductStockSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  adjustProductStock
);

// Obtener productos marcados
router.get('/products/flagged',
  authenticateToken,
  requireRole(['super_admin']),
  getFlaggedProducts
);

// Obtener logs de inventario
router.get('/inventory-logs',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = inventoryLogsQuerySchema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: error.errors
      });
    }
  },
  getInventoryLogs
);

// ========================================
// FASE 4: FINANZAS Y BILLETERAS
// ========================================

// Actualizar estado de pago de orden
router.patch('/orders/:id/payment/status',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updatePaymentStatusSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updatePaymentStatus
);

// Procesar pagos a restaurantes
router.post('/wallets/restaurants/payouts/process',
  authenticateToken,
  requireRole(['super_admin']),
  processRestaurantPayouts
);

// Ajustar billetera de restaurante
router.post('/wallets/restaurants/:id/adjust',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = adjustRestaurantWalletSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  adjustRestaurantWallet
);

// Procesar pagos a repartidores
router.post('/wallets/drivers/payouts/process',
  authenticateToken,
  requireRole(['super_admin']),
  processDriverPayouts
);

// Ajustar billetera de repartidor
router.post('/wallets/drivers/:id/adjust',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = adjustDriverWalletSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  adjustDriverWallet
);

// Obtener transacciones de billetera de restaurantes
router.get('/wallets/restaurants/transactions',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = restaurantWalletTransactionsQuerySchema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: error.errors
      });
    }
  },
  getRestaurantWalletTransactions
);

// Obtener transacciones de billetera de repartidores
router.get('/wallets/drivers/transactions',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = driverWalletTransactionsQuerySchema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: error.errors
      });
    }
  },
  getDriverWalletTransactions
);

// ========================================
// FASE 5: LOGÍSTICA Y REPARTIDORES
// ========================================

// Actualizar KYC de repartidor
router.patch('/drivers/:id/kyc',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateDriverKycSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateDriverKyc
);

// Bloquear/desbloquear repartidor
router.patch('/drivers/:id/block',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = blockDriverSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  blockDriver
);

// Forzar asignación de repartidor
router.post('/orders/:orderId/driver/:driverId',
  authenticateToken,
  requireRole(['super_admin']),
  forceDriverAssignment
);

// Obtener repartidores con KYC pendiente
router.get('/drivers/kyc/pending',
  authenticateToken,
  requireRole(['super_admin']),
  getDriversKycPending
);

// Obtener logs de ruta de orden
router.get('/orders/:orderId/route-logs',
  authenticateToken,
  requireRole(['super_admin']),
  getOrderRouteLogs
);

// Obtener asignaciones de repartidor para orden
router.get('/orders/:orderId/assignments',
  authenticateToken,
  requireRole(['super_admin']),
  getOrderAssignments
);

// ========================================
// FASE 6: SOPORTE, AUDITORÍA Y COMMS
// ========================================

// Actualizar estado de queja
router.patch('/complaints/:id/status',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = updateComplaintStatusSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  updateComplaintStatus
);

// Enviar mensaje
router.post('/messages/send',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = sendMessageSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  sendMessage
);

// Crear notificación masiva
router.post('/notifications/broadcast',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = broadcastNotificationSchema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: error.errors
      });
    }
  },
  broadcastNotification
);

// Obtener logs de auditoría
router.get('/audit-logs',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = auditLogsQuerySchema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: error.errors
      });
    }
  },
  getAuditLogs
);

// Obtener quejas
router.get('/complaints',
  authenticateToken,
  requireRole(['super_admin']),
  (req, res, next) => {
    try {
      const validatedData = complaintsQuerySchema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: error.errors
      });
    }
  },
  getComplaints
);

// Obtener calificaciones reportadas
router.get('/ratings/reported',
  authenticateToken,
  requireRole(['super_admin']),
  getReportedRatings
);

module.exports = router;
