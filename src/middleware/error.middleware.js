/**
 * Middleware centralizado para manejo de errores globales
 * Captura todas las excepciones no controladas y envía respuestas estandarizadas
 */
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');

/**
 * Middleware de manejo de errores global
 * @param {Error} err - Error capturado
 * @param {Object} req - Objeto request de Express
 * @param {Object} res - Objeto response de Express
 * @param {Function} next - Función next de Express
 */
const errorHandler = (err, req, res, next) => {
  // Log del error completo usando el logger estructurado
  logger.error('Error no controlado capturado por middleware global', {
    requestId: req.id,
    meta: {
      url: req.originalUrl,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack,
        status: err.status,
        code: err.code
      }
    }
  });

  // Si la respuesta ya fue enviada, delegar al manejador de errores por defecto de Express
  if (res.headersSent) {
    logger.warn('Respuesta ya enviada, delegando al manejador por defecto', {
      requestId: req.id,
      meta: { error: err.message }
    });
    return next(err);
  }

  // Determinar el tipo de error y responder apropiadamente
  let statusCode = 500;
  let message = 'Ha ocurrido un error inesperado en el servidor';
  let code = 'INTERNAL_ERROR';

  // Manejo específico de diferentes tipos de errores
  if (err.name === 'ValidationError') {
    // Errores de validación de Prisma
    statusCode = 400;
    message = 'Datos de entrada inválidos';
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Errores conocidos de Prisma
    if (err.code === 'P2002') {
      statusCode = 409;
      message = 'Conflicto de datos: el registro ya existe';
      code = 'DUPLICATE_ENTRY';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      message = 'Recurso no encontrado';
      code = 'NOT_FOUND';
    } else {
      statusCode = 400;
      message = 'Error en la base de datos';
      code = 'DATABASE_ERROR';
    }
  } else if (err.name === 'PrismaClientUnknownRequestError') {
    // Errores desconocidos de Prisma
    statusCode = 500;
    message = 'Error interno de base de datos';
    code = 'DATABASE_ERROR';
  } else if (err.name === 'PrismaClientRustPanicError') {
    // Errores críticos de Prisma
    statusCode = 500;
    message = 'Error crítico de base de datos';
    code = 'DATABASE_CRITICAL_ERROR';
  } else if (err.name === 'PrismaClientInitializationError') {
    // Errores de inicialización de Prisma
    statusCode = 503;
    message = 'Servicio de base de datos no disponible';
    code = 'DATABASE_UNAVAILABLE';
  } else if (err.name === 'JsonWebTokenError') {
    // Errores de JWT
    statusCode = 401;
    message = 'Token de autenticación inválido';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    // Token expirado
    statusCode = 401;
    message = 'Token de autenticación expirado';
    code = 'TOKEN_EXPIRED';
  } else if (err.name === 'MulterError') {
    // Errores de carga de archivos
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = 'Archivo demasiado grande';
      code = 'FILE_TOO_LARGE';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      statusCode = 400;
      message = 'Campo de archivo inesperado';
      code = 'UNEXPECTED_FILE_FIELD';
    } else {
      statusCode = 400;
      message = 'Error en la carga del archivo';
      code = 'FILE_UPLOAD_ERROR';
    }
  } else if (err.name === 'SyntaxError' && err.status === 400 && 'body' in err) {
    // Errores de parsing JSON
    statusCode = 400;
    message = 'Formato JSON inválido en el cuerpo de la petición';
    code = 'INVALID_JSON';
  } else if (err.name === 'CastError') {
    // Errores de casting (generalmente de MongoDB, pero por compatibilidad)
    statusCode = 400;
    message = 'Formato de datos inválido';
    code = 'INVALID_DATA_FORMAT';
  } else if (err.status) {
    // Si el error ya tiene un status definido, usarlo
    statusCode = err.status;
    message = err.message || message;
    code = err.code || code;
  }

  // En producción, no exponer detalles internos del error
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && statusCode === 500) {
    // En producción, solo enviar mensaje genérico para errores internos
    return ResponseService.error(
      res,
      'Ha ocurrido un error inesperado en el servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }

  // En desarrollo o para errores no internos, enviar detalles del error
  return ResponseService.error(
    res,
    message,
    isProduction ? null : {
      name: err.name,
      message: err.message,
      stack: err.stack
    },
    statusCode,
    code
  );
};

/**
 * Middleware para manejar rutas no encontradas (404)
 * Debe ser usado antes del middleware de errores
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Endpoint no encontrado: ${req.originalUrl}`);
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
};

/**
 * Middleware para manejar errores de validación de Zod
 * Intercepta errores de validación y los formatea apropiadamente
 */
const zodErrorHandler = (err, req, res, next) => {
  if (err.name === 'ZodError') {
    logger.warn('Error de validación Zod', {
      requestId: req.id,
      meta: {
        url: req.originalUrl,
        method: req.method,
        issues: err.issues
      }
    });
    
    const formattedErrors = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
      value: issue.input
    }));

    return ResponseService.validationError(
      res,
      formattedErrors,
      'Datos de entrada inválidos'
    );
  }
  
  next(err);
};

/**
 * Middleware para manejar errores de rate limiting
 */
const rateLimitErrorHandler = (err, req, res, next) => {
  if (err.status === 429) {
    logger.warn('Rate limit excedido', {
      requestId: req.id,
      meta: {
        url: req.originalUrl,
        method: req.method,
        ip: req.ip || req.connection.remoteAddress
      }
    });
    
    return ResponseService.tooManyRequests(
      res,
      'Demasiadas peticiones. Por favor, intenta de nuevo más tarde',
      'RATE_LIMIT_EXCEEDED'
    );
  }
  
  next(err);
};

/**
 * Middleware para manejar errores de CORS
 */
const corsErrorHandler = (err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    logger.warn('Error de CORS', {
      requestId: req.id,
      meta: {
        url: req.originalUrl,
        method: req.method,
        origin: req.get('Origin'),
        ip: req.ip || req.connection.remoteAddress
      }
    });
    
    return ResponseService.forbidden(
      res,
      'Origen no permitido por la política CORS',
      'CORS_ERROR'
    );
  }
  
  next(err);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  zodErrorHandler,
  rateLimitErrorHandler,
  corsErrorHandler
};
