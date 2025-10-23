const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const asyncHandler = require('express-async-handler');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { validate, validateParams, validateQuery } = require('../middleware/validate.middleware');
const { requireRestaurantLocation } = require('../middleware/location.middleware');
const { updateProfileSchema, updateLocationSchema, metricsQuerySchema } = require('../validations/restaurant-admin.validation');
const { createProductSchema, updateProductSchema, productParamsSchema } = require('../validations/product.validation');
const { createSubcategorySchema, updateSubcategorySchema, subcategoryParamsSchema, subcategoryQuerySchema } = require('../validations/subcategory.validation');
const { createGroupSchema, updateGroupSchema, groupParamsSchema, createOptionSchema, updateOptionSchema, optionParamsSchema, groupQuerySchema } = require('../validations/modifier.validation');
const { createEmployeeSchema, employeeQuerySchema, assignmentParamsSchema, updateEmployeeSchema } = require('../validations/employee.validation');
const { orderQuerySchema, orderParamsSchema, updateOrderStatusSchema } = require('../validations/order.validation');
const { OrderStatus } = require('@prisma/client');
const { getRestaurantOrders, updateOrderStatus, createProduct, updateProduct, deleteProduct, getRestaurantProducts, createSubcategory, updateSubcategory, deleteSubcategory, getRestaurantSubcategories, getRestaurantProfile, updateRestaurantProfile, rejectOrder, deactivateProductsByTag, getLocationStatus, updateLocation, getPrimaryBranch, updatePrimaryBranchDetails, createEmployee, getEmployees, updateEmployee, getRestaurantWallet, getRestaurantWalletTransactions, getRestaurantEarningsSummary, getDashboardSummary } = require('../controllers/restaurant-admin.controller');
const { createModifierGroup, getModifierGroups, updateModifierGroup, deleteModifierGroup, createModifierOption, updateModifierOption, deleteModifierOption } = require('../controllers/modifier.controller');
const { uploadRestaurantLogo, uploadRestaurantCover, uploadProductImage } = require('../controllers/upload.controller');
const { upload, uploadCover, uploadProduct, handleMulterError } = require('../config/multer');

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
  asyncHandler(getRestaurantProfile)
);

/**
 * @route   PATCH /api/restaurant/profile
 * @desc    Actualizar la información del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @body    name (opcional) - Nombre del restaurante
 * @body    description (opcional) - Descripción del restaurante
 * @body    logoUrl (opcional) - URL del logo del restaurante
 * @body    coverPhotoUrl (opcional) - URL de la foto de portada del restaurante
 * @body    phone (opcional) - Teléfono del restaurante
 * @body    email (opcional) - Email del restaurante
 * @body    address (opcional) - Dirección del restaurante
 */
router.patch(
  '/profile',
  requireRole(['owner']),
  validate(updateProfileSchema),
  asyncHandler(updateRestaurantProfile)
);

/**
 * @route   GET /api/restaurant/location-status
 * @desc    Obtener el estado de configuración de ubicación del restaurante
 * @access  Private (Owner Only)
 */
router.get(
  '/location-status',
  requireRole(['owner']),
  asyncHandler(getLocationStatus)
);

/**
 * @route   PATCH /api/restaurant/location
 * @desc    Actualizar la ubicación principal del restaurante
 * @access  Private (Owner Only)
 * @body    latitude - Latitud de la ubicación (requerido)
 * @body    longitude - Longitud de la ubicación (requerido)
 * @body    address - Dirección del restaurante (opcional)
 */
router.patch(
  '/location',
  requireRole(['owner']),
  validate(updateLocationSchema),
  asyncHandler(updateLocation)
);

/**
 * @route   GET /api/restaurant/primary-branch
 * @desc    Obtener la información de la sucursal principal del restaurante
 * @access  Private (Owner Only)
 */
router.get(
  '/primary-branch',
  requireRole(['owner']),
  asyncHandler(getPrimaryBranch)
);

/**
 * @route   PATCH /api/restaurant/primary-branch
 * @desc    Actualizar los detalles operativos del restaurante
 * @access  Private (Owner Only)
 * @body    usesPlatformDrivers - Usar drivers de la plataforma (opcional)
 * @body    deliveryFee - Tarifa de entrega (opcional)
 * @body    estimatedDeliveryMin - Tiempo mínimo de entrega en minutos (opcional)
 * @body    estimatedDeliveryMax - Tiempo máximo de entrega en minutos (opcional)
 * @body    deliveryRadius - Radio de entrega en km (opcional)
 */
router.patch(
  '/primary-branch',
  requireRole(['owner']),
  requireRestaurantLocation,
  validate(updateProfileSchema),
  asyncHandler(updatePrimaryBranchDetails)
);

/**
 * @route   POST /api/restaurant/employees
 * @desc    Crear un nuevo empleado para el restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @body    email - Email del empleado (requerido)
 * @body    password - Contraseña del empleado (mínimo 8 caracteres)
 * @body    name - Nombre del empleado (requerido)
 * @body    lastname - Apellido del empleado (requerido)
 * @body    phone - Teléfono del empleado (10-15 dígitos)
 * @body    roleId - ID del rol a asignar (requerido)
 */
router.post(
  '/employees',
  requireRole(['owner']),
  requireRestaurantLocation,
  validate(createEmployeeSchema),
  asyncHandler(createEmployee)
);

/**
 * @route   GET /api/restaurant/employees
 * @desc    Obtener la lista de empleados del restaurante del dueño autenticado
 * @access  Private (Owner Only)
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 15, max: 100)
 * @query   roleId (opcional) - ID del rol para filtrar empleados
 * @query   status (opcional) - Estado del empleado (active, inactive, pending, suspended)
 * @query   search (opcional) - Búsqueda por nombre, apellido o email
 */
router.get(
  '/employees',
  requireRole(['owner']),
  requireRestaurantLocation,
  validateQuery(employeeQuerySchema),
  asyncHandler(getEmployees)
);

/**
 * @route   PATCH /api/restaurant/employees/:assignmentId
 * @desc    Actualizar el rol y/o estado de un empleado específico
 * @access  Private (Owner Only)
 * @param   assignmentId - ID de la UserRoleAssignment del empleado
 * @body    roleId (opcional) - Nuevo ID del rol a asignar
 * @body    status (opcional) - Nuevo estado del empleado (active, inactive, suspended)
 */
router.patch(
  '/employees/:assignmentId',
  requireRole(['owner']),
  requireRestaurantLocation,
  validateParams(assignmentParamsSchema),
  validate(updateEmployeeSchema),
  asyncHandler(updateEmployee)
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
  requireRestaurantLocation,
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
  asyncHandler(getRestaurantBranches)
);







/**
 * @route   GET /api/restaurant/orders
 * @desc    Obtener lista de pedidos para el panel de administración del restaurante
 * @access  Private (Restaurant Staff Only)
 * @query   status (opcional) - Estado del pedido (default: 'confirmed')
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 50)
 */
router.get('/orders', 
  requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff']), 
  requireRestaurantLocation,
  validateQuery(orderQuerySchema),
  asyncHandler(getRestaurantOrders));

/**
 * @route   PATCH /api/restaurant/orders/:orderId/status
 * @desc    Actualizar el estado de un pedido específico
 * @access  Private (Restaurant Staff Only)
 * @params  orderId - ID del pedido a actualizar (BigInt)
 * @body    { "status": "preparing" } - Nuevo estado del pedido
 */
router.patch('/orders/:orderId/status',
  requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff']),
  requireRestaurantLocation,
  validateParams(orderParamsSchema),
  validate(updateOrderStatusSchema),
  asyncHandler(updateOrderStatus)
);

/**
 * @route   PATCH /api/restaurant/orders/:orderId/reject
 * @desc    Rechazar un pedido confirmado y procesar reembolso automático
 * @access  Private (Owner, Branch Manager, Order Manager Only)
 * @params  orderId - ID del pedido a rechazar
 * @body    reason (opcional) - Razón del rechazo
 */
router.patch('/orders/:orderId/reject',
  requireRole(['owner', 'branch_manager', 'order_manager']),
  requireRestaurantLocation,
  [
    param('orderId')
      .notEmpty()
      .withMessage('El ID del pedido es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del pedido debe ser un número entero válido'),
    body('reason')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('La razón del rechazo no puede exceder 500 caracteres')
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
  asyncHandler(rejectOrder)
);

/**
 * @route   GET /api/restaurant/wallet/balance
 * @desc    Obtener el saldo de la billetera del restaurante
 * @access  Private (Owner Only)
 */
router.get('/wallet/balance',
  requireRole(['owner']),
  requireRestaurantLocation,
  asyncHandler(getRestaurantWallet)
);

/**
 * @route   GET /api/restaurant/wallet/transactions
 * @desc    Obtener las transacciones de la billetera del restaurante
 * @access  Private (Owner Only)
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 50)
 * @query   dateFrom (opcional) - Fecha de inicio (ISO datetime)
 * @query   dateTo (opcional) - Fecha de fin (ISO datetime)
 */
router.get('/wallet/transactions',
  requireRole(['owner']),
  requireRestaurantLocation,
  validateQuery(metricsQuerySchema),
  asyncHandler(getRestaurantWalletTransactions)
);

/**
 * @route   GET /api/restaurant/metrics/earnings
 * @desc    Obtener el resumen de ganancias del restaurante
 * @access  Private (Owner Only)
 * @query   dateFrom (opcional) - Fecha de inicio (ISO datetime)
 * @query   dateTo (opcional) - Fecha de fin (ISO datetime)
 */
router.get('/metrics/earnings',
  requireRole(['owner']),
  requireRestaurantLocation,
  validateQuery(metricsQuerySchema),
  asyncHandler(getRestaurantEarningsSummary)
);

/**
 * @route   GET /api/restaurant/metrics/dashboard-summary
 * @desc    Obtener resumen completo del dashboard del restaurante (Endpoint "cerebro")
 * @access  Private (Owner Only)
 * @note    Consolida todas las métricas en una sola llamada eficiente para optimizar el frontend
 */
router.get('/metrics/dashboard-summary',
  requireRole(['owner']),
  requireRestaurantLocation,
  asyncHandler(getDashboardSummary)
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
  requireRestaurantLocation,
  validateQuery(subcategoryQuerySchema),
  asyncHandler(getRestaurantSubcategories)
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
  requireRestaurantLocation,
  validate(createSubcategorySchema),
  asyncHandler(createSubcategory)
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
  requireRestaurantLocation,
  validateParams(subcategoryParamsSchema),
  validate(updateSubcategorySchema),
  asyncHandler(updateSubcategory)
);

/**
 * @route   DELETE /api/restaurant/subcategories/:subcategoryId
 * @desc    Eliminar una subcategoría del menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @params  subcategoryId - ID de la subcategoría a eliminar
 */
router.delete('/subcategories/:subcategoryId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(subcategoryParamsSchema),
  asyncHandler(deleteSubcategory)
);

/**
 * @route   POST /api/restaurant/products/upload-image
 * @desc    Subir imagen de producto
 * @access  Private (Owner, Branch Manager Only)
 * @body    image - Archivo de imagen (JPG, JPEG, PNG, máximo 5MB)
 */
router.post(
  '/products/upload-image',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  uploadProduct.single('image'),
  handleMulterError,
  asyncHandler(uploadProductImage)
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
  requireRestaurantLocation,
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
  asyncHandler(getRestaurantProducts)
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
  requireRestaurantLocation,
  validate(createProductSchema),
  asyncHandler(createProduct)
);

/**
 * @route   PATCH /api/restaurant/products/deactivate-by-tag
 * @desc    Desactivar todos los productos que contengan una etiqueta específica
 * @access  Private (Owner, Branch Manager Only)
 * @body    tag - Etiqueta a buscar en los productos (requerido)
 */
router.patch('/products/deactivate-by-tag',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  [
    body('tag')
      .notEmpty()
      .withMessage('La etiqueta es requerida')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('La etiqueta debe tener entre 1 y 100 caracteres')
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
  asyncHandler(deactivateProductsByTag)
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
  requireRestaurantLocation,
  validateParams(productParamsSchema),
  validate(updateProductSchema),
  asyncHandler(updateProduct)
);

/**
 * @route   DELETE /api/restaurant/products/:productId
 * @desc    Eliminar un producto del menú del restaurante
 * @access  Private (Owner, Branch Manager Only)
 * @params  productId - ID del producto a eliminar
 */
router.delete('/products/:productId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(productParamsSchema),
  asyncHandler(deleteProduct)
);

// ========================================
// RUTAS DE GRUPOS DE MODIFICADORES
// ========================================

/**
 * @route   POST /api/restaurant/modifier-groups
 * @desc    Crear un nuevo grupo de modificadores para el restaurante
 * @access  Private (Owner, Branch Manager)
 * @body    name - Nombre del grupo de modificadores
 * @body    minSelection (opcional) - Selección mínima (default: 1)
 * @body    maxSelection (opcional) - Selección máxima (default: 1)
 */
router.post(
  '/modifier-groups',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validate(createGroupSchema),
  asyncHandler(createModifierGroup)
);

/**
 * @route   GET /api/restaurant/modifier-groups
 * @desc    Obtener todos los grupos de modificadores del restaurante
 * @access  Private (Owner, Branch Manager)
 */
router.get(
  '/modifier-groups',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateQuery(groupQuerySchema),
  asyncHandler(getModifierGroups)
);

/**
 * @route   PATCH /api/restaurant/modifier-groups/:groupId
 * @desc    Actualizar un grupo de modificadores existente
 * @access  Private (Owner, Branch Manager)
 * @param   groupId - ID del grupo de modificadores
 * @body    name (opcional) - Nombre del grupo de modificadores
 * @body    minSelection (opcional) - Selección mínima
 * @body    maxSelection (opcional) - Selección máxima
 */
router.patch(
  '/modifier-groups/:groupId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(groupParamsSchema),
  validate(updateGroupSchema),
  asyncHandler(updateModifierGroup)
);

/**
 * @route   DELETE /api/restaurant/modifier-groups/:groupId
 * @desc    Eliminar un grupo de modificadores
 * @access  Private (Owner, Branch Manager)
 * @param   groupId - ID del grupo de modificadores
 */
router.delete(
  '/modifier-groups/:groupId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(groupParamsSchema),
  asyncHandler(deleteModifierGroup)
);

// ========================================
// RUTAS DE OPCIONES DE MODIFICADORES
// ========================================

/**
 * @route   POST /api/restaurant/modifier-groups/:groupId/options
 * @desc    Crear una nueva opción de modificador en un grupo específico
 * @access  Private (Owner, Branch Manager)
 * @param   groupId - ID del grupo de modificadores
 * @body    name - Nombre de la opción de modificador
 * @body    price - Precio de la opción (decimal)
 */
router.post(
  '/modifier-groups/:groupId/options',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(groupParamsSchema),
  validate(createOptionSchema),
  asyncHandler(createModifierOption)
);

/**
 * @route   PATCH /api/restaurant/modifier-options/:optionId
 * @desc    Actualizar una opción de modificador existente
 * @access  Private (Owner, Branch Manager)
 * @param   optionId - ID de la opción de modificador
 * @body    name (opcional) - Nombre de la opción de modificador
 * @body    price (opcional) - Precio de la opción (decimal)
 */
router.patch(
  '/modifier-options/:optionId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(optionParamsSchema),
  validate(updateOptionSchema),
  asyncHandler(updateModifierOption)
);

/**
 * @route   DELETE /api/restaurant/modifier-options/:optionId
 * @desc    Eliminar una opción de modificador
 * @access  Private (Owner, Branch Manager)
 * @param   optionId - ID de la opción de modificador
 */
router.delete(
  '/modifier-options/:optionId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(optionParamsSchema),
  asyncHandler(deleteModifierOption)
);

// ========================================
// RUTAS DE SUBIDA DE ARCHIVOS
// ========================================

/**
 * @route   POST /api/restaurant/upload-logo
 * @desc    Subir logo del restaurante
 * @access  Private (Owner Only)
 * @body    logo - Archivo de imagen (JPG, JPEG, PNG, máximo 5MB)
 */
router.post(
  '/upload-logo',
  requireRole(['owner']),
  upload.single('logo'),
  handleMulterError,
  asyncHandler(uploadRestaurantLogo)
);

/**
 * @route   POST /api/restaurant/uploads/logo
 * @desc    Subir logo del restaurante (ruta legacy)
 * @access  Private (Owner Only)
 * @body    image - Archivo de imagen (JPG, JPEG, PNG, máximo 5MB)
 */
router.post(
  '/uploads/logo',
  requireRole(['owner']),
  upload.single('image'),
  handleMulterError,
  asyncHandler(uploadRestaurantLogo)
);

/**
 * @route   POST /api/restaurant/upload-cover
 * @desc    Subir foto de portada del restaurante
 * @access  Private (Owner Only)
 * @body    cover - Archivo de imagen (JPG, JPEG, PNG, máximo 5MB)
 */
router.post(
  '/upload-cover',
  requireRole(['owner']),
  uploadCover.single('cover'),
  handleMulterError,
  asyncHandler(uploadRestaurantCover)
);

/**
 * @route   POST /api/restaurant/uploads/cover
 * @desc    Subir foto de portada del restaurante (ruta legacy)
 * @access  Private (Owner Only)
 * @body    image - Archivo de imagen (JPG, JPEG, PNG, máximo 5MB)
 */
router.post(
  '/uploads/cover',
  requireRole(['owner']),
  uploadCover.single('image'),
  handleMulterError,
  asyncHandler(uploadRestaurantCover)
);

module.exports = router;

