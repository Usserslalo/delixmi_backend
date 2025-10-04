const rateLimit = require('express-rate-limit');

/**
 * Limitador de velocidad para intentos de inicio de sesión
 * Protege contra ataques de fuerza bruta en el endpoint de login
 * 
 * Configuración:
 * - Máximo 5 intentos por IP
 * - Ventana de tiempo: 15 minutos
 * - Mensaje personalizado en español
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
  max: 5, // Máximo 5 intentos por IP en la ventana de tiempo
  message: {
    status: 'error',
    message: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Incluir headers estándar de rate limit
  legacyHeaders: false, // Desactivar headers legacy
  handler: (req, res) => {
    // Log del intento de rate limiting para monitoreo de seguridad
    console.warn(`🚨 Rate limit excedido para login desde IP: ${req.ip} - ${new Date().toISOString()}`);
    
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de inicio de sesión. Por favor, inténtalo de nuevo en 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutos',
      timestamp: new Date().toISOString()
    });
  },
  skip: (req) => {
    // Opcional: saltar rate limiting para ciertas IPs (desarrollo, testing)
    // En producción, esto debería estar desactivado o ser muy restrictivo
    return false;
  }
});

/**
 * Limitador de velocidad para solicitudes de restablecimiento de contraseña
 * Protege contra ataques de fuerza bruta en el endpoint de forgot-password
 * 
 * Configuración:
 * - Máximo 3 intentos por IP
 * - Ventana de tiempo: 1 hora
 * - Mensaje personalizado en español
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora en milisegundos
  max: 3, // Máximo 3 intentos por IP en la ventana de tiempo
  message: {
    status: 'error',
    message: 'Demasiadas solicitudes de restablecimiento de contraseña. Por favor, inténtalo de nuevo en 1 hora.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '1 hora'
  },
  standardHeaders: true, // Incluir headers estándar de rate limit
  legacyHeaders: false, // Desactivar headers legacy
  handler: (req, res) => {
    // Log del intento de rate limiting para monitoreo de seguridad
    console.warn(`🚨 Rate limit excedido para forgot-password desde IP: ${req.ip} - ${new Date().toISOString()}`);
    
    res.status(429).json({
      status: 'error',
      message: 'Demasiadas solicitudes de restablecimiento de contraseña. Por favor, inténtalo de nuevo en 1 hora.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '1 hora',
      timestamp: new Date().toISOString()
    });
  },
  skip: (req) => {
    // Opcional: saltar rate limiting para ciertas IPs (desarrollo, testing)
    // En producción, esto debería estar desactivado o ser muy restrictivo
    return false;
  }
});

/**
 * Limitador de velocidad general para endpoints de autenticación
 * Protege contra ataques de fuerza bruta generales
 * 
 * Configuración:
 * - Máximo 10 intentos por IP
 * - Ventana de tiempo: 15 minutos
 * - Mensaje personalizado en español
 */
const authGeneralLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos en milisegundos
  max: 10, // Máximo 10 intentos por IP en la ventana de tiempo
  message: {
    status: 'error',
    message: 'Demasiados intentos de autenticación. Por favor, inténtalo de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Incluir headers estándar de rate limit
  legacyHeaders: false, // Desactivar headers legacy
  handler: (req, res) => {
    // Log del intento de rate limiting para monitoreo de seguridad
    console.warn(`🚨 Rate limit general excedido para auth desde IP: ${req.ip} - ${new Date().toISOString()}`);
    
    res.status(429).json({
      status: 'error',
      message: 'Demasiados intentos de autenticación. Por favor, inténtalo de nuevo en 15 minutos.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutos',
      timestamp: new Date().toISOString()
    });
  },
  skip: (req) => {
    // Opcional: saltar rate limiting para ciertas IPs (desarrollo, testing)
    // En producción, esto debería estar desactivado o ser muy restrictivo
    return false;
  }
});

module.exports = {
  loginLimiter,
  forgotPasswordLimiter,
  authGeneralLimiter
};
