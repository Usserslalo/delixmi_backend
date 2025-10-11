const { ZodError } = require('zod');

/**
 * Middleware genérico para validar el body de una petición usando esquemas de Zod
 * @param {ZodSchema} schema - Esquema de Zod para validar
 * @returns {Function} Middleware de Express
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      // Validar y parsear el body de la petición
      const validatedData = schema.parse(req.body);
      
      // Reemplazar req.body con los datos validados y limpios
      req.body = validatedData;
      
      // Continuar al siguiente middleware o controlador
      next();
    } catch (error) {
      // Si es un error de validación de Zod
      if (error instanceof ZodError) {
        // Formatear los errores de Zod para que sean más legibles
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        // Obtener el primer error para el mensaje principal
        const firstError = formattedErrors[0];
        
        return res.status(400).json({
          status: 'error',
          message: firstError.message,
          code: 'VALIDATION_ERROR',
          errors: formattedErrors,
          data: null
        });
      }

      // Si es otro tipo de error, pasar al manejador de errores general
      next(error);
    }
  };
};

/**
 * Middleware para validar parámetros de query usando esquemas de Zod
 * @param {ZodSchema} schema - Esquema de Zod para validar
 * @returns {Function} Middleware de Express
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      // Validar y parsear los query params
      const validatedData = schema.parse(req.query);
      
      // Reemplazar req.query con los datos validados y limpios
      req.query = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        const firstError = formattedErrors[0];
        
        return res.status(400).json({
          status: 'error',
          message: firstError.message,
          code: 'VALIDATION_ERROR',
          errors: formattedErrors,
          data: null
        });
      }

      next(error);
    }
  };
};

/**
 * Middleware para validar parámetros de ruta usando esquemas de Zod
 * @param {ZodSchema} schema - Esquema de Zod para validar
 * @returns {Function} Middleware de Express
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    try {
      // Validar y parsear los params
      const validatedData = schema.parse(req.params);
      
      // Reemplazar req.params con los datos validados y limpios
      req.params = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        const firstError = formattedErrors[0];
        
        return res.status(400).json({
          status: 'error',
          message: firstError.message,
          code: 'VALIDATION_ERROR',
          errors: formattedErrors,
          data: null
        });
      }

      next(error);
    }
  };
};

module.exports = {
  validate,
  validateQuery,
  validateParams
};

