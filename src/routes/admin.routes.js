const express = require('express');
const { query, param, body } = require('express-validator');
const { getRestaurants, updateRestaurantStatus, updateRestaurant, getUsers, createUser, updateUser } = require('../controllers/admin.controller');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');

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
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
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

module.exports = router;
