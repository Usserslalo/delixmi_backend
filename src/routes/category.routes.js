const express = require('express');
const { param, validationResult } = require('express-validator');
const { getCategories, getCategoryById } = require('../controllers/category.controller');

const router = express.Router();

/**
 * @route   GET /api/categories
 * @desc    Obtener todas las categorías disponibles
 * @access  Public
 */
router.get('/', getCategories);

/**
 * @route   GET /api/categories/:id
 * @desc    Obtener una categoría específica por ID
 * @access  Public
 * @params  id - ID de la categoría
 */
router.get(
  '/:id',
  [
    param('id')
      .notEmpty()
      .withMessage('El ID de la categoría es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la categoría debe ser un número entero válido')
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
  getCategoryById
);

module.exports = router;
