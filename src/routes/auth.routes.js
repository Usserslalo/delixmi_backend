const express = require('express');
const { body } = require('express-validator');
const { 
  register, 
  login, 
  getProfile, 
  logout, 
  verifyToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword
  // sendPhoneVerification,  // Comentado temporalmente - verificación por teléfono desactivada
  // verifyPhone             // Comentado temporalmente - verificación por teléfono desactivada
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// Validaciones para el registro
const registerValidation = [
  body('name')
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  body('lastname')
    .notEmpty()
    .withMessage('El apellido es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El apellido debe tener entre 2 y 100 caracteres')
    .trim()
    .escape(),
  
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail()
    .isLength({ max: 150 })
    .withMessage('El email no puede exceder 150 caracteres'),
  
  body('phone')
    .isMobilePhone('es-MX')
    .withMessage('Debe ser un número de teléfono válido')
    .isLength({ min: 10, max: 20 })
    .withMessage('El teléfono debe tener entre 10 y 20 caracteres'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]/)
    .withMessage('La contraseña debe contener al menos: 1 letra minúscula, 1 mayúscula, 1 número y 1 carácter especial')
    .isLength({ max: 128 })
    .withMessage('La contraseña no puede exceder 128 caracteres')
];

// Validaciones para el login
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
    .isLength({ min: 1 })
    .withMessage('La contraseña no puede estar vacía')
];

// Validaciones para reenvío de verificación
const resendVerificationValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail()
];

// Validaciones para forgot password
const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail()
];

// Validaciones para reset password
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('El token es requerido')
    .isLength({ min: 64, max: 64 })
    .withMessage('El token debe tener exactamente 64 caracteres')
    .matches(/^[a-f0-9]+$/i)
    .withMessage('El token debe contener solo caracteres hexadecimales'),
  
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]/)
    .withMessage('La nueva contraseña debe contener al menos: 1 letra minúscula, 1 mayúscula, 1 número y 1 carácter especial')
    .isLength({ max: 128 })
    .withMessage('La nueva contraseña no puede exceder 128 caracteres')
];

// Validaciones para verificación de teléfono - COMENTADO TEMPORALMENTE
// const verifyPhoneValidation = [
//   body('otp')
//     .isLength({ min: 6, max: 6 })
//     .withMessage('El código OTP debe tener exactamente 6 dígitos')
//     .isNumeric()
//     .withMessage('El código OTP debe contener solo números')
//     .trim()
//     .escape()
// ];

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', registerValidation, register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 * @security Rate limiting: 5 intentos por IP cada 15 minutos
 */
router.post('/login', loginLimiter, loginValidation, login);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar validez del token
 * @access  Private
 */
router.get('/verify', authenticateToken, verifyToken);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verificar email con token
 * @access  Public
 */
router.get('/verify-email', verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Reenviar email de verificación
 * @access  Public
 */
router.post('/resend-verification', resendVerificationValidation, resendVerification);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar restablecimiento de contraseña
 * @access  Public
 * @security Rate limiting: 3 intentos por IP cada hora
 */
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contraseña con token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, resetPassword);

// ============================================================================
// RUTAS DE VERIFICACIÓN POR TELÉFONO - COMENTADAS TEMPORALMENTE
// Estas rutas están desactivadas para el lanzamiento inicial para minimizar costos.
// Se reactivarán en una fase futura cuando se requiera verificación por SMS.
// ============================================================================

/**
 * @route   POST /api/auth/send-phone-verification
 * @desc    Enviar código OTP de verificación por SMS
 * @access  Private
 * @status  DESACTIVADO TEMPORALMENTE
 */
// router.post('/send-phone-verification', authenticateToken, sendPhoneVerification);

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Verificar código OTP de teléfono
 * @access  Private
 * @status  DESACTIVADO TEMPORALMENTE
 */
// router.post('/verify-phone', authenticateToken, verifyPhoneValidation, verifyPhone);

module.exports = router;
