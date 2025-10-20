const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { validate, validateQuery, validateParams } = require('../middleware/validate.middleware');
const { updateDriverStatusSchema, availableOrdersQuerySchema, historyQuerySchema, updateLocationSchema } = require('../validations/driver.validation');
const { orderParamsSchema } = require('../validations/order.validation');
const { getAvailableOrders, acceptOrder, completeOrder, updateDriverStatus, getCurrentOrder, getDriverOrderHistory, updateDriverLocation, getDriverProfile } = require('../controllers/driver.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas de repartidor
router.use(authenticateToken);

/**
 * @route   PATCH /api/driver/status
 * @desc    Actualizar el estado de disponibilidad del repartidor
 * @access  Private (Driver Platform, Driver Restaurant)
 * @body    status - Estado del repartidor (online, offline, busy, unavailable)
 */
router.patch(
  '/status',
  requireRole(['driver_platform', 'driver_restaurant']),
  validate(updateDriverStatusSchema),
  updateDriverStatus
);

/**
 * @route   GET /api/driver/profile
 * @desc    Obtener el perfil completo del repartidor (datos de usuario y driverProfile)
 * @access  Private (Driver Platform, Driver Restaurant)
 */
router.get(
  '/profile',
  requireRole(['driver_platform', 'driver_restaurant']),
  getDriverProfile
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
  validate(updateLocationSchema),
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
  validateQuery(historyQuerySchema),
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
  validateQuery(availableOrdersQuerySchema),
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
  validateParams(orderParamsSchema),
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
  validateParams(orderParamsSchema),
  completeOrder
);

module.exports = router;
