const express = require('express');
const { param, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { getDriverLocationForOrder } = require('../controllers/customer.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas de cliente
router.use(authenticateToken);

/**
 * @route   GET /api/customer/orders/:orderId/location
 * @desc    Obtener la ubicación en tiempo real del repartidor para un pedido específico
 * @access  Private (Customer Only)
 * @params  orderId - ID del pedido del cual se quiere obtener la ubicación del repartidor
 */
router.get(
  '/orders/:orderId/location',
  requireRole(['customer']),
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
  getDriverLocationForOrder
);

module.exports = router;
