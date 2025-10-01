const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth.middleware');
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
    .isArray({ min: 1 })
    .withMessage('Debe proporcionar al menos un item en el carrito'),
  
  body('items.*.productId')
    .isInt({ min: 1 })
    .withMessage('Cada item debe tener un productId válido'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Cada item debe tener una cantidad válida mayor a 0')
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
