const express = require('express');
const { param, query, body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth.middleware');
const { getDriverLocationForOrder, getCustomerOrders, getCustomerOrderDetails, createCustomerAddress, getCustomerAddresses, updateCustomerAddress, deleteCustomerAddress } = require('../controllers/customer.controller');
const { checkAddressCoverage } = require('../controllers/coverage.controller');

const router = express.Router();

// Aplicar autenticación a todas las rutas de cliente
router.use(authenticateToken);

/**
 * @route   POST /api/customer/check-coverage
 * @desc    Verificar qué sucursales pueden entregar a una dirección específica
 * @access  Private (Customer Only)
 * @body    addressId - ID de la dirección a verificar
 */
router.post(
  '/check-coverage',
  requireRole(['customer']),
  [
    body('addressId')
      .notEmpty()
      .withMessage('El ID de la dirección es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la dirección debe ser un número entero válido')
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
  checkAddressCoverage
);

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

/**
 * @route   GET /api/customer/orders
 * @desc    Obtener el historial de pedidos del cliente autenticado
 * @access  Private (Customer Only)
 * @query   status - Estado del pedido para filtrar (opcional)
 * @query   page - Número de página para paginación (opcional, default: 1)
 * @query   pageSize - Tamaño de página para paginación (opcional, default: 10)
 */
router.get(
  '/orders',
  requireRole(['customer']),
  [
    query('status')
      .optional()
      .isIn(['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'])
      .withMessage('El estado del pedido debe ser uno de los valores válidos'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero mayor a 0'),
    query('pageSize')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El tamaño de página debe ser un número entero entre 1 y 100')
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
  getCustomerOrders
);

/**
 * @route   GET /api/customer/orders/:orderId
 * @desc    Obtener detalles de un pedido específico del cliente autenticado
 * @access  Private (Customer Only)
 * @params  orderId - ID del pedido del cual se quieren obtener los detalles
 */
router.get(
  '/orders/:orderId',
  requireRole(['customer']),
  [
    param('orderId')
      .notEmpty()
      .withMessage('El ID del pedido es requerido')
      .custom((value) => {
        // Aceptar tanto ID numérico como external_reference
        const isNumeric = /^\d+$/.test(value);
        const isExternalRef = /^delixmi_[a-f0-9-]+$/.test(value);
        
        if (!isNumeric && !isExternalRef) {
          throw new Error('El ID del pedido debe ser un número entero o un external_reference válido (formato: delixmi_uuid)');
        }
        return true;
      })
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
  getCustomerOrderDetails
);

/**
 * @route   GET /api/customer/addresses
 * @desc    Obtener todas las direcciones de entrega del cliente autenticado
 * @access  Private (Customer Only)
 */
router.get(
  '/addresses',
  requireRole(['customer']),
  getCustomerAddresses
);

/**
 * @route   POST /api/customer/addresses
 * @desc    Crear una nueva dirección de entrega para el cliente autenticado
 * @access  Private (Customer Only)
 * @body    alias, street, exterior_number, neighborhood, city, state, zip_code, latitude, longitude
 * @body    interior_number, references (opcionales)
 */
router.post(
  '/addresses',
  requireRole(['customer']),
  [
    body('alias')
      .notEmpty()
      .withMessage('El alias de la dirección es requerido')
      .isLength({ min: 1, max: 50 })
      .withMessage('El alias debe tener entre 1 y 50 caracteres'),
    body('street')
      .notEmpty()
      .withMessage('La calle es requerida')
      .isLength({ min: 1, max: 255 })
      .withMessage('La calle debe tener entre 1 y 255 caracteres'),
    body('exterior_number')
      .notEmpty()
      .withMessage('El número exterior es requerido')
      .isLength({ min: 1, max: 50 })
      .withMessage('El número exterior debe tener entre 1 y 50 caracteres'),
    body('interior_number')
      .optional()
      .isLength({ max: 50 })
      .withMessage('El número interior debe tener máximo 50 caracteres'),
    body('neighborhood')
      .notEmpty()
      .withMessage('La colonia/barrio es requerida')
      .isLength({ min: 1, max: 150 })
      .withMessage('La colonia/barrio debe tener entre 1 y 150 caracteres'),
    body('city')
      .notEmpty()
      .withMessage('La ciudad es requerida')
      .isLength({ min: 1, max: 100 })
      .withMessage('La ciudad debe tener entre 1 y 100 caracteres'),
    body('state')
      .notEmpty()
      .withMessage('El estado es requerido')
      .isLength({ min: 1, max: 100 })
      .withMessage('El estado debe tener entre 1 y 100 caracteres'),
    body('zip_code')
      .notEmpty()
      .withMessage('El código postal es requerido')
      .isLength({ min: 1, max: 10 })
      .withMessage('El código postal debe tener entre 1 y 10 caracteres')
      .matches(/^[0-9]+$/)
      .withMessage('El código postal debe contener solo números'),
    body('references')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Las referencias deben tener máximo 500 caracteres'),
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
        errors: errors.array()
      });
    }
    next();
  },
  createCustomerAddress
);

/**
 * @route   PATCH /api/customer/addresses/:addressId
 * @desc    Actualizar una dirección de entrega del cliente autenticado
 * @access  Private (Customer Only)
 * @params  addressId - ID de la dirección a actualizar
 * @body    Todos los campos son opcionales: alias, street, exterior_number, interior_number, neighborhood, city, state, zip_code, references, latitude, longitude
 */
router.patch(
  '/addresses/:addressId',
  requireRole(['customer']),
  [
    param('addressId')
      .notEmpty()
      .withMessage('El ID de la dirección es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la dirección debe ser un número entero válido'),
    body('alias')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('El alias debe tener entre 1 y 50 caracteres'),
    body('street')
      .optional()
      .isLength({ min: 1, max: 255 })
      .withMessage('La calle debe tener entre 1 y 255 caracteres'),
    body('exterior_number')
      .optional()
      .isLength({ min: 1, max: 50 })
      .withMessage('El número exterior debe tener entre 1 y 50 caracteres'),
    body('interior_number')
      .optional()
      .isLength({ max: 50 })
      .withMessage('El número interior debe tener máximo 50 caracteres'),
    body('neighborhood')
      .optional()
      .isLength({ min: 1, max: 150 })
      .withMessage('La colonia/barrio debe tener entre 1 y 150 caracteres'),
    body('city')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('La ciudad debe tener entre 1 y 100 caracteres'),
    body('state')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('El estado debe tener entre 1 y 100 caracteres'),
    body('zip_code')
      .optional()
      .isLength({ min: 1, max: 10 })
      .withMessage('El código postal debe tener entre 1 y 10 caracteres')
      .matches(/^[0-9]+$/)
      .withMessage('El código postal debe contener solo números'),
    body('references')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Las referencias deben tener máximo 500 caracteres'),
    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('La latitud debe ser un número decimal entre -90 y 90'),
    body('longitude')
      .optional()
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
        errors: errors.array()
      });
    }
    next();
  },
  updateCustomerAddress
);

/**
 * @route   DELETE /api/customer/addresses/:addressId
 * @desc    Eliminar una dirección de entrega del cliente autenticado
 * @access  Private (Customer Only)
 * @params  addressId - ID de la dirección a eliminar
 */
router.delete(
  '/addresses/:addressId',
  requireRole(['customer']),
  [
    param('addressId')
      .notEmpty()
      .withMessage('El ID de la dirección es requerido')
      .isInt({ min: 1 })
      .withMessage('El ID de la dirección debe ser un número entero válido')
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
  deleteCustomerAddress
);

module.exports = router;
