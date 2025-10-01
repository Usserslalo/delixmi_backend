const express = require('express');
const { getRestaurants, getRestaurantById } = require('../controllers/restaurant.controller');

const router = express.Router();

/**
 * @route   GET /api/restaurants
 * @desc    Obtener lista de restaurantes activos con paginación
 * @access  Public
 * @query   page (opcional) - Número de página (default: 1)
 * @query   pageSize (opcional) - Tamaño de página (default: 10, max: 100)
 */
router.get('/', getRestaurants);

/**
 * @route   GET /api/restaurants/:id
 * @desc    Obtener un restaurante específico por ID
 * @access  Public
 * @params  id - ID del restaurante
 */
router.get('/:id', getRestaurantById);

module.exports = router;
