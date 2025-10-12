const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeFromCart, 
  clearCart, 
  getCartSummary, 
  validateCart 
} = require('../controllers/cart.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas del carrito
router.use(authenticateToken);
router.use(requireRole(['customer']));

/**
 * @route   GET /api/cart
 * @desc    Obtener el carrito completo del usuario autenticado
 * @access  Private (Customer Only)
 */
router.get('/', getCart);

/**
 * @route   GET /api/cart/summary
 * @desc    Obtener resumen del carrito (conteo de items y total)
 * @access  Private (Customer Only)
 */
router.get('/summary', getCartSummary);

/**
 * @route   POST /api/cart/add
 * @desc    Agregar producto al carrito con modificadores opcionales
 * @access  Private (Customer Only)
 * @body    productId - ID del producto a agregar
 * @body    quantity - Cantidad a agregar (default: 1)
 * @body    modifiers - Array de objetos {modifierGroupId, selectedOptionId} (opcional)
 */
router.post(
  '/add',
  [
    body('productId')
      .notEmpty()
      .withMessage('El ID del producto es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del producto debe ser un número entero válido'),
    body('quantity')
      .optional()
      .isInt({ min: 1, max: 99 })
      .withMessage('La cantidad debe ser un número entero entre 1 y 99'),
    body('modifiers')
      .optional()
      .isArray()
      .withMessage('Los modificadores deben ser un array'),
    body('modifiers.*.modifierGroupId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El modifierGroupId debe ser un número entero positivo'),
    body('modifiers.*.selectedOptionId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El selectedOptionId debe ser un número entero positivo')
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
  addToCart
);

/**
 * @route   PUT /api/cart/update/:itemId
 * @desc    Actualizar cantidad de un item en el carrito
 * @access  Private (Customer Only)
 * @params  itemId - ID del item del carrito a actualizar
 * @body    quantity - Nueva cantidad (0 para eliminar)
 */
router.put(
  '/update/:itemId',
  [
    param('itemId')
      .notEmpty()
      .withMessage('El ID del item es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del item debe ser un número entero válido'),
    body('quantity')
      .notEmpty()
      .withMessage('La cantidad es requerida')
      .isInt({ min: 0, max: 99 })
      .withMessage('La cantidad debe ser un número entero entre 0 y 99')
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
  updateCartItem
);

/**
 * @route   DELETE /api/cart/remove/:itemId
 * @desc    Eliminar un item específico del carrito
 * @access  Private (Customer Only)
 * @params  itemId - ID del item del carrito a eliminar
 */
router.delete(
  '/remove/:itemId',
  [
    param('itemId')
      .notEmpty()
      .withMessage('El ID del item es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID del item debe ser un número entero válido')
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
  removeFromCart
);

/**
 * @route   DELETE /api/cart/clear
 * @desc    Limpiar carrito completo o de un restaurante específico
 * @access  Private (Customer Only)
 * @query   restaurantId - ID del restaurante (opcional, si no se especifica limpia todos)
 */
router.delete(
  '/clear',
  [
    query('restaurantId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID del restaurante debe ser un número entero válido')
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
  clearCart
);

/**
 * @route   POST /api/cart/validate
 * @desc    Validar carrito antes del checkout
 * @access  Private (Customer Only)
 * @body    restaurantId - ID del restaurante (opcional, si no se especifica valida todos)
 */
router.post(
  '/validate',
  [
    body('restaurantId')
      .optional()
      .isInt({ min: 1 })
      .withMessage('El ID del restaurante debe ser un número entero válido')
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
  validateCart
);

module.exports = router;
