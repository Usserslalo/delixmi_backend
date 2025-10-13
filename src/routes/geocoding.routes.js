const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { reverseGeocode } = require('../controllers/geocoding.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas de geocodificación
router.use(authenticateToken);

/**
 * @route   POST /api/geocoding/reverse
 * @desc    Convierte coordenadas (lat, lng) en componentes de dirección usando Google Maps API
 * @access  Private (Customer Only)
 * @body    latitude - Latitud (decimal entre -90 y 90)
 * @body    longitude - Longitud (decimal entre -180 y 180)
 * @returns Componentes de dirección estructurados (calle, ciudad, estado, código postal, etc.)
 */
router.post(
  '/reverse',
  requireRole(['customer']),
  [
    body('latitude')
      .notEmpty()
      .withMessage('La latitud es requerida')
      .isFloat({ min: -90, max: 90 })
      .withMessage('La latitud debe ser un número decimal entre -90 y 90'),
    body('longitude')
      .notEmpty()
      .withMessage('La longitud es requerida')
      .isFloat({ min: -180, max: 180 })
      .withMessage('La longitud debe ser un número decimal entre -180 y 180')
  ],
  (req, res, next) => {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        code: 'VALIDATION_ERROR',
        errors: errors.array()
      });
    }
    next();
  },
  reverseGeocode
);

module.exports = router;

