const express = require('express');
const { getHomeDashboard } = require('../controllers/home.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/home/dashboard
 * @desc    Obtener datos unificados para la HomeScreen
 * @access  Private (requiere autenticación)
 * @query   lat (opcional) - Latitud del usuario para geolocalización
 * @query   lng (opcional) - Longitud del usuario para geolocalización
 * @query   addressId (opcional) - ID de dirección específica
 */
router.get('/dashboard', authenticateToken, getHomeDashboard);

module.exports = router;
