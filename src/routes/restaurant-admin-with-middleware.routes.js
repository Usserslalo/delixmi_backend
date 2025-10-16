const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { checkRestaurantAccess, checkRestaurantOwnership, checkBranchAccess } = require('../middleware/restaurantAccess.middleware');
const { 
  getRestaurantOrders, 
  updateOrderStatus, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getRestaurantProducts, 
  createSubcategory, 
  updateSubcategory, 
  deleteSubcategory, 
  getRestaurantSubcategories, 
  getRestaurantProfile, 
  updateRestaurantProfile, 
  createBranch, 
  getRestaurantBranches, 
  updateBranch, 
  deleteBranch, 
  getBranchSchedule, 
  updateBranchSchedule, 
  rejectOrder, 
  deactivateProductsByTag 
} = require('../controllers/restaurant-admin.controller');
const { createModifierGroup, getModifierGroups, updateModifierGroup, deleteModifierGroup, createModifierOption, updateModifierOption, deleteModifierOption } = require('../controllers/modifier.controller');
const { uploadRestaurantLogo, uploadRestaurantCover } = require('../controllers/upload.controller');
const { upload, uploadCover, handleMulterError } = require('../config/multer');

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
router.get(
  '/orders',
  requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff']),
  getRestaurantOrders
);

/**
 * @route   PATCH /api/restaurant/orders/:orderId/status
 * @desc    Actualizar el estado de un pedido específico
 * @access  Private (Restaurant Staff Only)
 * @param   orderId - ID del pedido
 * @body    status - Nuevo estado del pedido
 */
router.patch(
  '/orders/:orderId/status',
  requireRole(['owner', 'branch_manager', 'order_manager']),
  [
    param('orderId').isInt({ min: 1 }).withMessage('ID del pedido debe ser un número entero positivo'),
    body('status')
      .isIn(['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'])
      .withMessage('Estado del pedido inválido')
  ],
  updateOrderStatus
);

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
    body('name').optional().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('description').optional().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
    body('logoUrl').optional().isURL().withMessage('La URL del logo debe ser válida'),
    body('coverPhotoUrl').optional().isURL().withMessage('La URL de la foto de portada debe ser válida')
  ],
  updateRestaurantProfile
);

/**
 * @route   GET /api/restaurant/:restaurantId/profile
 * @desc    Obtener el perfil de un restaurante específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 */
router.get(
  '/:restaurantId/profile',
  checkRestaurantAccess, // Middleware de control de acceso
  getRestaurantProfile
);

/**
 * @route   PATCH /api/restaurant/:restaurantId/profile
 * @desc    Actualizar la información de un restaurante específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 * @body    name (opcional) - Nombre del restaurante
 * @body    description (opcional) - Descripción del restaurante
 * @body    logoUrl (opcional) - URL del logo del restaurante
 * @body    coverPhotoUrl (opcional) - URL de la foto de portada del restaurante
 */
router.patch(
  '/:restaurantId/profile',
  checkRestaurantAccess, // Middleware de control de acceso
  [
    body('name').optional().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('description').optional().isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres'),
    body('logoUrl').optional().isURL().withMessage('La URL del logo debe ser válida'),
    body('coverPhotoUrl').optional().isURL().withMessage('La URL de la foto de portada debe ser válida')
  ],
  updateRestaurantProfile
);

/**
 * @route   POST /api/restaurant/:restaurantId/branches
 * @desc    Crear una nueva sucursal para un restaurante específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 * @body    name - Nombre de la sucursal
 * @body    address - Dirección de la sucursal
 * @body    latitude - Latitud de la sucursal
 * @body    longitude - Longitud de la sucursal
 * @body    phone (opcional) - Teléfono de la sucursal
 * @body    openingTime (opcional) - Hora de apertura
 * @body    closingTime (opcional) - Hora de cierre
 * @body    usesPlatformDrivers (opcional) - Si usa conductores de la plataforma
 */
router.post(
  '/:restaurantId/branches',
  checkRestaurantAccess, // Middleware de control de acceso
  [
    body('name').isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('address').isLength({ min: 10, max: 200 }).withMessage('La dirección debe tener entre 10 y 200 caracteres'),
    body('latitude').isFloat({ min: -90, max: 90 }).withMessage('La latitud debe ser un número entre -90 y 90'),
    body('longitude').isFloat({ min: -180, max: 180 }).withMessage('La longitud debe ser un número entre -180 y 180'),
    body('phone').optional().isMobilePhone('es-MX').withMessage('El teléfono debe ser válido'),
    body('openingTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('La hora de apertura debe estar en formato HH:MM'),
    body('closingTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('La hora de cierre debe estar en formato HH:MM'),
    body('usesPlatformDrivers').optional().isBoolean().withMessage('usesPlatformDrivers debe ser un booleano')
  ],
  createBranch
);

/**
 * @route   GET /api/restaurant/:restaurantId/branches
 * @desc    Obtener todas las sucursales de un restaurante específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 */
router.get(
  '/:restaurantId/branches',
  checkRestaurantAccess, // Middleware de control de acceso
  getRestaurantBranches
);

/**
 * @route   PATCH /api/restaurant/:restaurantId/branches/:branchId
 * @desc    Actualizar una sucursal específica (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 * @param   branchId - ID de la sucursal
 * @body    name (opcional) - Nombre de la sucursal
 * @body    address (opcional) - Dirección de la sucursal
 * @body    latitude (opcional) - Latitud de la sucursal
 * @body    longitude (opcional) - Longitud de la sucursal
 * @body    phone (opcional) - Teléfono de la sucursal
 * @body    status (opcional) - Estado de la sucursal
 */
router.patch(
  '/:restaurantId/branches/:branchId',
  checkRestaurantAccess, // Middleware de control de acceso
  checkBranchAccess, // Middleware de control de acceso a sucursal
  [
    body('name').optional().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('address').optional().isLength({ min: 10, max: 200 }).withMessage('La dirección debe tener entre 10 y 200 caracteres'),
    body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('La latitud debe ser un número entre -90 y 90'),
    body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('La longitud debe ser un número entre -180 y 180'),
    body('phone').optional().isMobilePhone('es-MX').withMessage('El teléfono debe ser válido'),
    body('status').optional().isIn(['active', 'inactive']).withMessage('El estado debe ser active o inactive')
  ],
  updateBranch
);

/**
 * @route   DELETE /api/restaurant/:restaurantId/branches/:branchId
 * @desc    Eliminar una sucursal específica (con validación de acceso)
 * @access  Private (Restaurant Owner Only)
 * @param   restaurantId - ID del restaurante
 * @param   branchId - ID de la sucursal
 */
router.delete(
  '/:restaurantId/branches/:branchId',
  checkRestaurantOwnership, // Middleware de control de acceso (solo propietarios)
  checkBranchAccess, // Middleware de control de acceso a sucursal
  deleteBranch
);

/**
 * @route   GET /api/restaurant/:restaurantId/products
 * @desc    Obtener todos los productos de un restaurante específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 * @query   page (opcional) - Número de página
 * @query   pageSize (opcional) - Tamaño de página
 * @query   category (opcional) - Filtrar por categoría
 * @query   status (opcional) - Filtrar por estado
 */
router.get(
  '/:restaurantId/products',
  checkRestaurantAccess, // Middleware de control de acceso
  getRestaurantProducts
);

/**
 * @route   POST /api/restaurant/:restaurantId/products
 * @desc    Crear un nuevo producto para un restaurante específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 * @body    name - Nombre del producto
 * @body    description - Descripción del producto
 * @body    price - Precio del producto
 * @body    subcategoryId - ID de la subcategoría
 * @body    imageUrl (opcional) - URL de la imagen del producto
 * @body    isAvailable (opcional) - Si el producto está disponible
 */
router.post(
  '/:restaurantId/products',
  checkRestaurantAccess, // Middleware de control de acceso
  [
    body('name').isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('description').isLength({ min: 10, max: 500 }).withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('price').isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
    body('subcategoryId').isInt({ min: 1 }).withMessage('El ID de la subcategoría debe ser un número entero positivo'),
    body('imageUrl').optional().isURL().withMessage('La URL de la imagen debe ser válida'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable debe ser un booleano')
  ],
  createProduct
);

/**
 * @route   PATCH /api/restaurant/:restaurantId/products/:productId
 * @desc    Actualizar un producto específico (con validación de acceso)
 * @access  Private (Restaurant Owner/Admin Only)
 * @param   restaurantId - ID del restaurante
 * @param   productId - ID del producto
 * @body    name (opcional) - Nombre del producto
 * @body    description (opcional) - Descripción del producto
 * @body    price (opcional) - Precio del producto
 * @body    subcategoryId (opcional) - ID de la subcategoría
 * @body    imageUrl (opcional) - URL de la imagen del producto
 * @body    isAvailable (opcional) - Si el producto está disponible
 */
router.patch(
  '/:restaurantId/products/:productId',
  checkRestaurantAccess, // Middleware de control de acceso
  [
    body('name').optional().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('description').optional().isLength({ min: 10, max: 500 }).withMessage('La descripción debe tener entre 10 y 500 caracteres'),
    body('price').optional().isFloat({ min: 0 }).withMessage('El precio debe ser un número positivo'),
    body('subcategoryId').optional().isInt({ min: 1 }).withMessage('El ID de la subcategoría debe ser un número entero positivo'),
    body('imageUrl').optional().isURL().withMessage('La URL de la imagen debe ser válida'),
    body('isAvailable').optional().isBoolean().withMessage('isAvailable debe ser un booleano')
  ],
  updateProduct
);

/**
 * @route   DELETE /api/restaurant/:restaurantId/products/:productId
 * @desc    Eliminar un producto específico (con validación de acceso)
 * @access  Private (Restaurant Owner Only)
 * @param   restaurantId - ID del restaurante
 * @param   productId - ID del producto
 */
router.delete(
  '/:restaurantId/products/:productId',
  checkRestaurantOwnership, // Middleware de control de acceso (solo propietarios)
  deleteProduct
);

module.exports = router;
