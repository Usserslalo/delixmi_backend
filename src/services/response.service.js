/**
 * Servicio centralizado para manejo de respuestas HTTP consistentes
 * Proporciona métodos estandarizados para construir respuestas JSON uniformes
 */
class ResponseService {
  /**
   * Envía una respuesta exitosa
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo de la operación
   * @param {*} data - Datos a retornar (opcional)
   * @param {number} statusCode - Código de estado HTTP (default: 200)
   */
  static success(res, message, data = null, statusCode = 200) {
    const response = {
      status: 'success',
      message: message,
      timestamp: new Date().toISOString()
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Envía una respuesta de error del servidor
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {*} errors - Detalles del error (opcional)
   * @param {number} statusCode - Código de estado HTTP (default: 500)
   * @param {string} code - Código de error personalizado (opcional)
   */
  static error(res, message, errors = null, statusCode = 500, code = null) {
    const response = {
      status: 'error',
      message: message,
      timestamp: new Date().toISOString()
    };

    if (errors !== null) {
      response.errors = errors;
    }

    if (code !== null) {
      response.code = code;
    }

    return res.status(statusCode).json(response);
  }

  /**
   * Envía una respuesta de error de validación (400)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {*} errors - Detalles de validación (opcional)
   * @param {string} code - Código de error personalizado (opcional)
   */
  static badRequest(res, message, errors = null, code = 'VALIDATION_ERROR') {
    return this.error(res, message, errors, 400, code);
  }

  /**
   * Envía una respuesta de no autorizado (401)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static unauthorized(res, message = 'No autorizado', code = 'UNAUTHORIZED') {
    return this.error(res, message, null, 401, code);
  }

  /**
   * Envía una respuesta de recurso no encontrado (404)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static notFound(res, message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    return this.error(res, message, null, 404, code);
  }

  /**
   * Envía una respuesta de conflicto (409)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {*} data - Datos adicionales del conflicto (opcional)
   * @param {string} code - Código de error personalizado (opcional)
   */
  static conflict(res, message, data = null, code = 'CONFLICT') {
    const response = {
      status: 'error',
      message: message,
      timestamp: new Date().toISOString(),
      code: code
    };

    if (data !== null) {
      response.data = data;
    }

    return res.status(409).json(response);
  }

  /**
   * Envía una respuesta de prohibido (403)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static forbidden(res, message = 'Acceso prohibido', code = 'FORBIDDEN') {
    return this.error(res, message, null, 403, code);
  }

  /**
   * Envía una respuesta de error interno del servidor (500)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static internalError(res, message = 'Error interno del servidor', code = 'INTERNAL_ERROR') {
    return this.error(res, message, null, 500, code);
  }

  /**
   * Envía una respuesta de método no permitido (405)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static methodNotAllowed(res, message = 'Método no permitido', code = 'METHOD_NOT_ALLOWED') {
    return this.error(res, message, null, 405, code);
  }

  /**
   * Envía una respuesta de demasiadas peticiones (429)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static tooManyRequests(res, message = 'Demasiadas peticiones', code = 'TOO_MANY_REQUESTS') {
    return this.error(res, message, null, 429, code);
  }

  /**
   * Envía una respuesta de servicio no disponible (503)
   * @param {Object} res - Objeto response de Express
   * @param {string} message - Mensaje descriptivo del error
   * @param {string} code - Código de error personalizado (opcional)
   */
  static serviceUnavailable(res, message = 'Servicio no disponible', code = 'SERVICE_UNAVAILABLE') {
    return this.error(res, message, null, 503, code);
  }

  /**
   * Envía una respuesta de error de validación con detalles específicos
   * @param {Object} res - Objeto response de Express
   * @param {Array} validationErrors - Array de errores de validación
   * @param {string} message - Mensaje principal (opcional)
   */
  static validationError(res, validationErrors, message = 'Datos de entrada inválidos') {
    const formattedErrors = validationErrors.map(err => ({
      field: err.path ? err.path.join('.') : err.param || 'unknown',
      message: err.msg || err.message,
      value: err.value,
      code: err.code || 'VALIDATION_ERROR'
    }));

    return this.badRequest(res, message, formattedErrors, 'VALIDATION_ERROR');
  }

  /**
   * Envía una respuesta de error de base de datos
   * @param {Object} res - Objeto response de Express
   * @param {Error} dbError - Error de base de datos
   * @param {string} message - Mensaje personalizado (opcional)
   */
  static databaseError(res, dbError, message = 'Error de base de datos') {
    console.error('Database Error:', dbError);
    
    // No exponer detalles internos de la base de datos en producción
    const isProduction = process.env.NODE_ENV === 'production';
    
    return this.internalError(
      res, 
      message, 
      isProduction ? 'DATABASE_ERROR' : 'DATABASE_ERROR'
    );
  }

  /**
   * Envía una respuesta de error de servicio externo
   * @param {Object} res - Objeto response de Express
   * @param {string} serviceName - Nombre del servicio externo
   * @param {string} message - Mensaje personalizado (opcional)
   */
  static externalServiceError(res, serviceName, message = null) {
    const defaultMessage = `Error en servicio externo: ${serviceName}`;
    return this.serviceUnavailable(
      res, 
      message || defaultMessage, 
      'EXTERNAL_SERVICE_ERROR'
    );
  }
}

module.exports = ResponseService;
