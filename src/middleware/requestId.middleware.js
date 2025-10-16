/**
 * Middleware para generar y asignar un Request ID único a cada petición HTTP
 * Permite trazar todas las operaciones relacionadas con una petición específica
 */
const { v4: uuidv4 } = require('uuid');

/**
 * Middleware para generar Request ID
 * Genera un UUID v4 único para cada petición y lo añade al objeto req
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 */
const requestIdMiddleware = (req, res, next) => {
  // Generar un UUID v4 único para esta petición
  const requestId = uuidv4();
  
  // Añadir el request ID al objeto req
  req.id = requestId;
  
  // Añadir el request ID al header de respuesta para debugging del cliente
  res.set('X-Request-ID', requestId);
  
  // Añadir el request ID a los headers de respuesta para CORS
  res.set('Access-Control-Expose-Headers', 'X-Request-ID');
  
  // Continuar con el siguiente middleware
  next();
};

/**
 * Middleware para logging de peticiones HTTP con Request ID
 * Registra información básica de cada petición entrante
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 */
const requestLoggingMiddleware = (req, res, next) => {
  // Registrar el inicio de la petición
  const startTime = Date.now();
  
  // Interceptar el evento 'finish' de la respuesta para calcular el tiempo de respuesta
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Importar el logger aquí para evitar dependencias circulares
    const { logRequest } = require('../config/logger');
    
    // Log de la petición completada
    logRequest(req, res, responseTime);
  });
  
  // Continuar con el siguiente middleware
  next();
};

/**
 * Middleware para añadir Request ID a errores no controlados
 * Asegura que los errores no controlados también tengan Request ID
 */
const errorRequestIdMiddleware = (err, req, res, next) => {
  // Si no hay request ID, generar uno
  if (!req.id) {
    req.id = uuidv4();
    res.set('X-Request-ID', req.id);
  }
  
  // Continuar con el siguiente middleware de error
  next(err);
};

/**
 * Función helper para obtener el Request ID del contexto actual
 * Útil para logging en controladores y servicios
 * @param {Object} req - Objeto request de Express
 * @returns {string|null} Request ID o null si no está disponible
 */
const getRequestId = (req) => {
  return req?.id || null;
};

/**
 * Función helper para crear un logger con Request ID del contexto actual
 * @param {Object} req - Objeto request de Express
 * @returns {Object} Logger con Request ID preconfigurado
 */
const getRequestLogger = (req) => {
  const { createRequestLogger } = require('../config/logger');
  return createRequestLogger(req?.id);
};

module.exports = {
  requestIdMiddleware,
  requestLoggingMiddleware,
  errorRequestIdMiddleware,
  getRequestId,
  getRequestLogger
};
