const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { getRestaurantOrders, updateOrderStatus, createProduct, updateProduct, deleteProduct, getRestaurantProducts, createSubcategory, updateSubcategory, deleteSubcategory, getRestaurantSubcategories, getRestaurantProfile, updateRestaurantProfile, createBranch, getRestaurantBranches, updateBranch, deleteBranch, getBranchSchedule, updateBranchSchedule } = require('../controllers/restaurant-admin.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas de administración de restaurante
router.use(authenticateToken);

/**
 * @route   GET /api/restaurant/orders
 * @desc    Obtener lista de pedidos para el panel de administración del restaurante
 * @access  Private (Restaurant Staff Only)
 * @query   status (opcional) - Estado del pedido (default: 'confirmed')
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 50)
 */
/**
 * @route   GET /api/restaurant/profile
 * @desc    Obtener el perfil completo del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 */
/**
 * @route   GET /api/restaurant/profile
 * @desc    Obtener el perfil completo del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 */
router.get(
  '/profile',
  requireRole(['owner']),
  getRestaurantProfile
);

/**
 * @route   PATCH /api/restaurant/profile
 * @desc    Actualizar la información del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @body    name (opcional) - Nombre del restaurante
 * @body    description (opcional) - Descripción del restaurante
 * @body    logoUrl (opcional) - URL del logo del restaurante
 * @body    coverPhotoUrl (opcional) - URL de la foto de portada del restaurante
 */
router.patch(
  '/profile',
  requireRole(['owner']),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage('El nombre debe tener entre 1 y 150 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('La descripción no puede exceder 1000 caracteres'),
    body('logoUrl')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('La URL del logo no puede exceder 255 caracteres')
      .isURL()
      .withMessage('La URL del logo debe ser una URL válida'),
    body('coverPhotoUrl')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('La URL de la foto de portada no puede exceder 255 caracteres')
      .isURL()
      .withMessage('La URL de la foto de portada debe ser una URL válida')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  updateRestaurantProfile
);

/**
 * @route   GET /api/restaurant/branches
 * @desc    Obtener todas las sucursales del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @query   status (opcional) - Estado de la sucursal (active, inactive)
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 20, max: 100)
 */
router.get(
  '/branches',
  requireRole(['owner']),
  [
    query('status')
      .optional()
      .isIn(['active', 'inactive'])
      .withMessage('El estado debe ser "active" o "inactive"'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El número de página debe ser un entero mayor a 0'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El tamaño de página debe ser un entero entre 1 y 100')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  getRestaurantBranches
);

/**
 * @route   PATCH /api/restaurant/branches/:branchId
 * @desc    Actualizar una sucursal existente del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @params  branchId - ID de la sucursal a actualizar
 * @body    name - Nombre de la sucursal (opcional)
 * @body    address - Dirección de la sucursal (opcional)
 * @body    latitude - Latitud de la ubicación (opcional)
 * @body    longitude - Longitud de la ubicación (opcional)
 * @body    phone - Teléfono de la sucursal (opcional)
 * @body    openingTime - Hora de apertura en formato HH:MM:SS (opcional)
 * @body    closingTime - Hora de cierre en formato HH:MM:SS (opcional)
 * @body    usesPlatformDrivers - Si usa repartidores de la plataforma (opcional)
 */
router.patch(
  '/branches/:branchId',
  requireRole(['owner']),
  [
    param('branchId')
      .notEmpty()
      .withMessage('El ID de la sucursal es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la sucursal debe ser un número entero válido'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage('El nombre debe tener entre 1 y 150 caracteres'),
    body('address')
      .optional()
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('La dirección debe tener entre 10 y 500 caracteres'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('La latitud debe ser un número entre -90 y 90'),
    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('La longitud debe ser un número entre -180 y 180'),
    body('phone')
      .optional()
      .trim()
      .isLength({ min: 10, max: 20 })
      .withMessage('El teléfono debe tener entre 10 y 20 caracteres')
      .matches(/^[\+]?[\d\s\-\(\)]+$/)
      .withMessage('El formato del teléfono no es válido'),
    body('openingTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('La hora de apertura debe estar en formato HH:MM:SS'),
    body('closingTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('La hora de cierre debe estar en formato HH:MM:SS'),
    body('usesPlatformDrivers')
      .optional()
      .isBoolean()
      .withMessage('usesPlatformDrivers debe ser un valor booleano (true/false)')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  updateBranch
);

/**
 * @route   DELETE /api/restaurant/branches/:branchId
 * @desc    Eliminar una sucursal existente del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @params  branchId - ID de la sucursal a eliminar
 */
router.delete(
  '/branches/:branchId',
  requireRole(['owner']),
  [
    param('branchId')
      .notEmpty()
      .withMessage('El ID de la sucursal es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la sucursal debe ser un número entero válido')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  deleteBranch
);

/**
 * @route   GET /api/restaurant/branches/:branchId/schedule
 * @desc    Obtener el horario semanal de una sucursal específica
 * @access  Private (Owner, Branch Manager Only)
 * @params  branchId - ID de la sucursal
 */
router.get(
  '/branches/:branchId/schedule',
  requireRole(['owner', 'branch_manager']),
  [
    param('branchId')
      .notEmpty()
      .withMessage('El ID de la sucursal es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la sucursal debe ser un número entero válido')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  getBranchSchedule
);

/**
 * @route   PATCH /api/restaurant/branches/:branchId/schedule
 * @desc    Actualizar el horario semanal completo de una sucursal específica
 * @access  Private (Owner, Branch Manager Only)
 * @params  branchId - ID de la sucursal
 * @body    Array de 7 objetos con horarios semanales (Domingo a Sábado)
 */
router.patch(
  '/branches/:branchId/schedule',
  requireRole(['owner', 'branch_manager']),
  [
    param('branchId')
      .notEmpty()
      .withMessage('El ID de la sucursal es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la sucursal debe ser un número entero válido'),
    body()
      .isArray({ min: 7, max: 7 })
      .withMessage('Debe proporcionar exactamente 7 objetos de horario (uno por cada día de la semana)'),
    body('*.dayOfWeek')
      .isInt({ min: 0, max: 6 })
      .withMessage('dayOfWeek debe ser un número entero entre 0 (Domingo) y 6 (Sábado)'),
    body('*.openingTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('openingTime debe estar en formato HH:MM:SS válido'),
    body('*.closingTime')
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('closingTime debe estar en formato HH:MM:SS válido'),
    body('*.isClosed')
      .isBoolean()
      .withMessage('isClosed debe ser un valor booleano (true/false)')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    
    // Validación adicional: verificar que los dayOfWeek sean únicos y estén en orden
    const dayOfWeeks = req.body.map(item => item.dayOfWeek);
    const uniqueDayOfWeeks = [...new Set(dayOfWeeks)];
    
    if (uniqueDayOfWeeks.length !== 7) {
      return res.status(400).json({
        status: 'error',
        message: 'Los dayOfWeek deben ser únicos y cubrir todos los días de la semana (0-6)',
        errors: [{
          msg: 'Cada día de la semana debe aparecer exactamente una vez',
          param: 'dayOfWeek'
        }]
      });
    }
    
    // Verificar que cubra todos los días de la semana
    const expectedDays = [0, 1, 2, 3, 4, 5, 6];
    const missingDays = expectedDays.filter(day => !dayOfWeeks.includes(day));
    
    if (missingDays.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan días de la semana en el horario',
        errors: [{
          msg: `Días faltantes: ${missingDays.join(', ')}`,
          param: 'dayOfWeek'
        }]
      });
    }
    
    next();
  },
  updateBranchSchedule
);

/**
 * @route   POST /api/restaurant/branches
 * @desc    Crear una nueva sucursal para el restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @body    name - Nombre de la sucursal (requerido)
 * @body    address - Dirección de la sucursal (requerido)
 * @body    latitude - Latitud de la ubicación (requerido)
 * @body    longitude - Longitud de la ubicación (requerido)
 * @body    phone - Teléfono de la sucursal (opcional)
 * @body    openingTime - Hora de apertura en formato HH:MM:SS (opcional)
 * @body    closingTime - Hora de cierre en formato HH:MM:SS (opcional)
 * @body    usesPlatformDrivers - Si usa repartidores de la plataforma (opcional, default: true)
 */
router.post(
  '/branches',
  requireRole(['owner']),
  [
    body('name')
      .notEmpty()
      .withMessage('El nombre de la sucursal es requerido')
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage('El nombre debe tener entre 1 y 150 caracteres'),
    body('address')
      .notEmpty()
      .withMessage('La dirección de la sucursal es requerida')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('La dirección debe tener entre 10 y 500 caracteres'),
    body('latitude')
      .notEmpty()
      .withMessage('La latitud es requerida')
      .isFloat({ min: -90, max: 90 })
      .withMessage('La latitud debe ser un número entre -90 y 90'),
    body('longitude')
      .notEmpty()
      .withMessage('La longitud es requerida')
      .isFloat({ min: -180, max: 180 })
      .withMessage('La longitud debe ser un número entre -180 y 180'),
    body('phone')
      .optional()
      .trim()
      .isLength({ min: 10, max: 20 })
      .withMessage('El teléfono debe tener entre 10 y 20 caracteres')
      .matches(/^[\+]?[\d\s\-\(\)]+$/)
      .withMessage('El formato del teléfono no es válido'),
    body('openingTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('La hora de apertura debe estar en formato HH:MM:SS'),
    body('closingTime')
      .optional()
      .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/)
      .withMessage('La hora de cierre debe estar en formato HH:MM:SS'),
    body('usesPlatformDrivers')
      .optional()
      .isBoolean()
      .withMessage('usesPlatformDrivers debe ser un valor booleano (true/false)')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  createBranch
);

/**
 * @route   GET /api/restaurant/orders
 * @desc    Obtener lista de pedidos para el panel de administración del restaurante
 * @access  Private (Restaurant Staff Only)
 * @query   status (opcional) - Estado del pedido (default: 'confirmed')
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 50)
 */
router.get('/orders', requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff']), getRestaurantOrders);

/**
 * @route   PATCH /api/restaurant/orders/:orderId/status
 * @desc    Actualizar el estado de un pedido específico
 * @access  Private (Restaurant Staff Only)
 * @params  orderId - ID del pedido a actualizar
 * @body    status - Nuevo estado del pedido
 */
router.patch('/orders/:orderId/status', 
  requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff']),
  [
    body('status')
      .notEmpty()
      .withMessage('El estado del pedido es requerido')
      .isIn(['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Estado de pedido inválido')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  updateOrderStatus
);

/**
 * @route   GET /api/restaurant/subcategories
 * @desc    Obtener lista de subcategorías del restaurante para el panel de administración
 * @access  Private (Owner, Branch Manager Only)
 * @query   categoryId (opcional) - Filtrar por categoría global específica
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 20, max: 100)
 */
router.get('/subcategories',
  requireRole(['owner', 'branch_manager']),
  [
    query('categoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de categoría debe ser un número entero válido'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El número de página debe ser un entero mayor a 0'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El tamaño de página debe ser un entero entre 1 y 100')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  getRestaurantSubcategories
);

/**
 * @route   POST /api/restaurant/subcategories
 * @desc    Crear una nueva subcategoría para el menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @body    categoryId - ID de la categoría principal (requerido)
 * @body    name - Nombre de la subcategoría (requerido)
 * @body    displayOrder - Orden de visualización (opcional, default: 0)
 */
router.post('/subcategories',
  requireRole(['owner', 'branch_manager']),
  [
    body('categoryId')
      .notEmpty()
      .withMessage('El ID de la categoría es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la categoría debe ser un número entero válido'),
    body('name')
      .notEmpty()
      .withMessage('El nombre de la subcategoría es requerido')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('El nombre debe tener entre 1 y 100 caracteres'),
    body('displayOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('El orden de visualización debe ser un número entero mayor o igual a 0')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  createSubcategory
);

/**
 * @route   PATCH /api/restaurant/subcategories/:subcategoryId
 * @desc    Actualizar una subcategoría existente del menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @params  subcategoryId - ID de la subcategoría a actualizar
 * @body    categoryId - ID de la categoría principal (opcional)
 * @body    name - Nombre de la subcategoría (opcional)
 * @body    displayOrder - Orden de visualización (opcional)
 */
router.patch('/subcategories/:subcategoryId',
  requireRole(['owner', 'branch_manager']),
  [
    param('subcategoryId')
      .notEmpty()
      .withMessage('El ID de la subcategoría es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la subcategoría debe ser un número entero válido'),
    body('categoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de la categoría debe ser un número entero válido'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacío')
      .isLength({ min: 1, max: 100 })
      .withMessage('El nombre debe tener entre 1 y 100 caracteres'),
    body('displayOrder')
      .optional()
      .isInt({ min: 0 })
      .withMessage('El orden de visualización debe ser un número entero mayor o igual a 0')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  updateSubcategory
);

/**
 * @route   DELETE /api/restaurant/subcategories/:subcategoryId
 * @desc    Eliminar una subcategoría del menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @params  subcategoryId - ID de la subcategoría a eliminar
 */
router.delete('/subcategories/:subcategoryId',
  requireRole(['owner', 'branch_manager']),
  [
    param('subcategoryId')
      .notEmpty()
      .withMessage('El ID de la subcategoría es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la subcategoría debe ser un número entero válido')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  deleteSubcategory
);

/**
 * @route   GET /api/restaurant/products
 * @desc    Obtener lista de productos del restaurante para el panel de administración
 * @access  Private (Owner, Branch Manager Only)
 * @query   subcategoryId (opcional) - Filtrar por subcategoría específica
 * @query   isAvailable (opcional) - Filtrar por disponibilidad (true/false)
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 20, max: 100)
 */
router.get('/products',
  requireRole(['owner', 'branch_manager']),
  [
    query('subcategoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de subcategoría debe ser un número entero válido'),
    query('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable debe ser un valor booleano (true/false)'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El número de página debe ser un entero mayor a 0'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El tamaño de página debe ser un entero entre 1 y 100')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de consulta inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  getRestaurantProducts
);

/**
 * @route   POST /api/restaurant/products
 * @desc    Crear un nuevo producto en el menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @body    subcategoryId - ID de la subcategoría
 * @body    name - Nombre del producto (requerido)
 * @body    description - Descripción del producto (opcional)
 * @body    imageUrl - URL de la imagen del producto (opcional)
 * @body    price - Precio del producto (requerido, > 0)
 * @body    isAvailable - Disponibilidad del producto (opcional, default: true)
 */
router.post('/products',
  requireRole(['owner', 'branch_manager']),
  [
    body('subcategoryId')
      .notEmpty()
      .withMessage('El ID de la subcategoría es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la subcategoría debe ser un número entero válido'),
    body('name')
      .notEmpty()
      .withMessage('El nombre del producto es requerido')
      .trim()
      .isLength({ min: 1, max: 150 })
      .withMessage('El nombre debe tener entre 1 y 150 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('La descripción no puede exceder 1000 caracteres'),
    body('imageUrl')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('La URL de la imagen no puede exceder 255 caracteres'),
    body('price')
      .notEmpty()
      .withMessage('El precio del producto es requerido')
      .isFloat({ min: 0.01 })
      .withMessage('El precio debe ser un número mayor que cero'),
    body('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable debe ser un valor booleano')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  createProduct
);

/**
 * @route   PATCH /api/restaurant/products/:productId
 * @desc    Actualizar un producto existente del menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @params  productId - ID del producto a actualizar
 * @body    subcategoryId - ID de la subcategoría (opcional)
 * @body    name - Nombre del producto (opcional)
 * @body    description - Descripción del producto (opcional)
 * @body    imageUrl - URL de la imagen del producto (opcional)
 * @body    price - Precio del producto (opcional, > 0)
 * @body    isAvailable - Disponibilidad del producto (opcional)
 */
router.patch('/products/:productId',
  requireRole(['owner', 'branch_manager']),
  [
    param('productId')
      .notEmpty()
      .withMessage('El ID del producto es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del producto debe ser un número entero válido'),
    body('subcategoryId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID de la subcategoría debe ser un número entero válido'),
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('El nombre no puede estar vacío')
      .isLength({ min: 1, max: 150 })
      .withMessage('El nombre debe tener entre 1 y 150 caracteres'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('La descripción no puede exceder 1000 caracteres'),
    body('imageUrl')
      .optional()
      .trim()
      .isLength({ max: 255 })
      .withMessage('La URL de la imagen no puede exceder 255 caracteres'),
    body('price')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('El precio debe ser un número mayor que cero'),
    body('isAvailable')
      .optional()
      .isBoolean()
      .withMessage('isAvailable debe ser un valor booleano')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  updateProduct
);

/**
 * @route   DELETE /api/restaurant/products/:productId
 * @desc    Eliminar un producto del menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @params  productId - ID del producto a eliminar
 */
router.delete('/products/:productId',
  requireRole(['owner', 'branch_manager']),
  [
    param('productId')
      .notEmpty()
      .withMessage('El ID del producto es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del producto debe ser un número entero válido')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  deleteProduct
);

module.exports = router;

