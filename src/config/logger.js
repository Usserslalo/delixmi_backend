/**
 * Configuración del sistema de logging estructurado con Winston
 * Proporciona logging centralizado con formato JSON y soporte para Request ID
 */
const winston = require('winston');
const path = require('path');

// Función helper para serializar JSON con soporte para BigInt
const safeJsonStringify = (obj, space = null) => {
  return JSON.stringify(obj, (key, value) => {
    // Convertir BigInt a string para evitar errores de serialización
    return typeof value === 'bigint' ? value.toString() : value;
  }, space);
};

// Configuración de niveles de log personalizados
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Configuración de colores para la consola
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(logColors);

// Formato personalizado para el logging
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, meta, requestId, ...rest }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...(requestId && { requestId }),
      ...(meta && { meta }),
      ...rest
    };
    
    return safeJsonStringify(logEntry, 2);
  })
);

// Formato para la consola (más legible)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'HH:mm:ss.SSS'
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, requestId, meta, ...rest }) => {
    const requestIdStr = requestId ? `[${requestId}] ` : '';
    const metaStr = meta ? ` ${safeJsonStringify(meta)}` : '';
    const restStr = Object.keys(rest).length > 0 ? ` ${safeJsonStringify(rest)}` : '';
    
    return `${timestamp} ${level}: ${requestIdStr}${message}${metaStr}${restStr}`;
  })
);

// Configuración de transports
const transports = [
  // Console transport para desarrollo
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    handleExceptions: true,
    handleRejections: true
  })
];

// En producción, añadir file transport
if (process.env.NODE_ENV === 'production') {
  // Crear directorio de logs si no existe
  const logDir = path.join(__dirname, '../../logs');
  
  transports.push(
    // Log de errores
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      handleExceptions: true,
      handleRejections: true
    }),
    
    // Log combinado
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Crear la instancia del logger
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'debug',
  format: logFormat,
  transports,
  exitOnError: false
});

// Función helper para crear un logger con request ID
const createRequestLogger = (requestId) => {
  return {
    error: (message, meta = {}) => logger.error(message, { requestId, meta }),
    warn: (message, meta = {}) => logger.warn(message, { requestId, meta }),
    info: (message, meta = {}) => logger.info(message, { requestId, meta }),
    http: (message, meta = {}) => logger.http(message, { requestId, meta }),
    debug: (message, meta = {}) => logger.debug(message, { requestId, meta })
  };
};

// Función helper para logging de peticiones HTTP
const logRequest = (req, res, responseTime) => {
  const { method, originalUrl, ip, headers } = req;
  const { statusCode } = res;
  const userAgent = headers['user-agent'] || 'Unknown';
  
  const logData = {
    method,
    url: originalUrl,
    statusCode,
    responseTime: `${responseTime}ms`,
    ip,
    userAgent,
    contentLength: res.get('content-length') || 0
  };
  
  // Determinar el nivel de log basado en el status code
  let level = 'info';
  if (statusCode >= 500) {
    level = 'error';
  } else if (statusCode >= 400) {
    level = 'warn';
  }
  
  logger[level](`${method} ${originalUrl} ${statusCode}`, {
    requestId: req.id,
    meta: logData
  });
};

// Función helper para logging de errores de base de datos
const logDatabaseError = (error, operation, requestId = null) => {
  logger.error(`Database error during ${operation}`, {
    requestId,
    meta: {
      operation,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      }
    }
  });
};

// Función helper para logging de errores de servicios externos
const logExternalServiceError = (service, error, requestId = null) => {
  logger.error(`External service error: ${service}`, {
    requestId,
    meta: {
      service,
      error: {
        name: error.name,
        message: error.message,
        status: error.status,
        response: error.response?.data
      }
    }
  });
};

// Función helper para logging de autenticación
const logAuth = (action, userId, success, requestId = null, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Authentication: ${action}`, {
    requestId,
    meta: {
      action,
      userId,
      success,
      ...details
    }
  });
};

// Función helper para logging de operaciones de negocio
const logBusinessOperation = (operation, details, requestId = null) => {
  logger.info(`Business operation: ${operation}`, {
    requestId,
    meta: details
  });
};

// Función helper para logging de performance
const logPerformance = (operation, duration, requestId = null, details = {}) => {
  logger.info(`Performance: ${operation}`, {
    requestId,
    meta: {
      operation,
      duration: `${duration}ms`,
      ...details
    }
  });
};

module.exports = {
  logger,
  createRequestLogger,
  logRequest,
  logDatabaseError,
  logExternalServiceError,
  logAuth,
  logBusinessOperation,
  logPerformance
};
