const express = require('express');
const { body } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const checkoutController = require('../controllers/checkout.controller');

const router = express.Router();

/**
 * Validaciones para la creación de preferencias de pago
 */
const createPreferenceValidation = [
  body('addressId')
    .isInt({ min: 1 })
    .withMessage('El addressId debe ser un número entero válido'),
  
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Los items deben ser un array con al menos un elemento'),
  
  body('items.*.productId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cada item debe tener un productId válido'),
  
  body('items.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Cada item debe tener una cantidad válida mayor a 0'),

  body('useCart')
    .optional()
    .isBoolean()
    .withMessage('useCart debe ser un valor booleano'),

  body('restaurantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('restaurantId debe ser un número entero válido')
];

/**
 * Validaciones para la creación de órdenes de pago en efectivo
 */
const createCashOrderValidation = [
  body('addressId')
    .isInt({ min: 1 })
    .withMessage('El addressId debe ser un número entero válido'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Los items deben ser un array con al menos un elemento'),
  
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('Cada item debe tener un productId válido'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Cada item debe tener una cantidad válida mayor a 0'),

  body('specialInstructions')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Las instrucciones especiales no pueden exceder 500 caracteres')
];

/**
 * POST /api/checkout/create-preference
 * Crea una preferencia de pago en Mercado Pago
 * Requiere autenticación
 */
router.post(
  '/create-preference',
  authenticateToken,
  createPreferenceValidation,
  checkoutController.createPreference
);

/**
 * POST /api/checkout/cash-order
 * Crea una orden de pago en efectivo
 * Requiere autenticación y rol de customer
 */
router.post(
  '/cash-order',
  authenticateToken,
  requireRole(['customer']),
  createCashOrderValidation,
  checkoutController.createCashOrder
);

/**
 * GET /api/checkout/payment-status/:paymentId
 * Obtiene el estado de un pago específico
 * Requiere autenticación
 */
router.get(
  '/payment-status/:paymentId',
  authenticateToken,
  checkoutController.getPaymentStatus
);

module.exports = router;
