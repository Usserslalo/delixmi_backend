const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { getAvailableOrders, acceptOrder, completeOrder, updateDriverStatus, getCurrentOrder, getDriverOrderHistory, updateDriverLocation } = require('../controllers/driver.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas de repartidor
router.use(authenticateToken);

/**
 * @route   PATCH /api/driver/status
 * @desc    Actualizar el estado de disponibilidad del repartidor
 * @access  Private (Driver Platform, Driver Restaurant)
 * @body    status - Estado del repartidor (online, offline)
 */
router.patch(
  '/status',
  requireRole(['driver_platform', 'driver_restaurant']),
  [
    body('status')
      .notEmpty()
      .withMessage('El estado es requerido')
      .isIn(['online', 'offline'])
      .withMessage('El estado debe ser "online" o "offline"')
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
  updateDriverStatus
);

/**
 * @route   PATCH /api/driver/location
 * @desc    Actualizar la ubicación GPS del repartidor en tiempo real
 * @access  Private (Driver Platform, Driver Restaurant)
 * @body    latitude - Latitud de la ubicación actual (requerido)
 * @body    longitude - Longitud de la ubicación actual (requerido)
 */
router.patch(
  '/location',
  requireRole(['driver_platform', 'driver_restaurant']),
  [
    body('latitude')
      .notEmpty()
      .withMessage('La latitud es requerida')
      .isFloat({ min: -90, max: 90 })
      .withMessage('La latitud debe ser un número entre -90 y 90'),
    body('longitude')
      .notEmpty()
      .withMessage('La longitud es requerida')
      .isFloat({ min: -180, max: 180 })
      .withMessage('La longitud debe ser un número entre -180 y 180')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de ubicación inválidos',
        errors: errors.array()
      });
    }
    next();
  },
  updateDriverLocation
);

/**
 * @route   GET /api/driver/orders/current
 * @desc    Obtener la entrega activa actual del repartidor
 * @access  Private (Driver Platform, Driver Restaurant)
 */
router.get(
  '/orders/current',
  requireRole(['driver_platform', 'driver_restaurant']),
  getCurrentOrder
);

/**
 * @route   GET /api/driver/orders/history
 * @desc    Obtener el historial de entregas completadas del repartidor
 * @access  Private (Driver Platform, Driver Restaurant)
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 50)
 */
router.get(
  '/orders/history',
  requireRole(['driver_platform', 'driver_restaurant']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El número de página debe ser un entero mayor a 0'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El tamaño de página debe ser un entero entre 1 y 50')
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
  getDriverOrderHistory
);

/**
 * @route   GET /api/driver/orders/available
 * @desc    Obtener pedidos disponibles para recoger por repartidores
 * @access  Private (Driver Platform, Driver Restaurant Only)
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 50)
 */
router.get('/orders/available',
  requireRole(['driver_platform', 'driver_restaurant']),
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El número de página debe ser un entero mayor a 0'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El tamaño de página debe ser un entero entre 1 y 50')
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
  getAvailableOrders
);

/**
 * @route   PATCH /api/driver/orders/:orderId/accept
 * @desc    Aceptar un pedido disponible para entrega
 * @access  Private (Driver Platform, Driver Restaurant Only)
 * @params  orderId - ID del pedido a aceptar
 */
router.patch('/orders/:orderId/accept',
  requireRole(['driver_platform', 'driver_restaurant']),
  [
    param('orderId')
      .notEmpty()
      .withMessage('El ID del pedido es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del pedido debe ser un número entero válido')
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
  acceptOrder
);

/**
 * @route   PATCH /api/driver/orders/:orderId/complete
 * @desc    Marcar un pedido como entregado/completado
 * @access  Private (Driver Platform, Driver Restaurant Only)
 * @params  orderId - ID del pedido a completar
 */
router.patch('/orders/:orderId/complete',
  requireRole(['driver_platform', 'driver_restaurant']),
  [
    param('orderId')
      .notEmpty()
      .withMessage('El ID del pedido es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del pedido debe ser un número entero válido')
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
  completeOrder
);

module.exports = router;
