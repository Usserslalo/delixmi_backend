const express = require('express');
const { 
  register, 
  login, 
  getProfile, 
  updateProfile,
  changePassword,
  logout,
  refreshToken, 
  verifyToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getVerificationToken
} = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { loginLimiter, forgotPasswordLimiter } = require('../middleware/rateLimit.middleware');
const { validate } = require('../middleware/validate.middleware');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  logoutSchema
} = require('../validations/auth.validation');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar un nuevo usuario
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 * @security Rate limiting: 5 intentos por IP cada 15 minutos
 */
router.post('/login', loginLimiter, validate(loginSchema), login);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 */
router.get('/profile', authenticateToken, getProfile);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refrescar access token usando refresh token
 * @access  Public (pero requiere refresh token válido)
 */
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Public (pero requiere refresh token válido)
 */
router.post('/logout', validate(logoutSchema), logout);

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
router.post('/resend-verification', validate(resendVerificationSchema), resendVerification);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Solicitar restablecimiento de contraseña
 * @access  Public
 * @security Rate limiting: 3 intentos por IP cada hora
 */
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Restablecer contraseña con token
 * @access  Public
 */
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

/**
 * @route   PUT /api/auth/profile
 * @desc    Actualizar perfil del usuario autenticado
 * @access  Private
 */
router.put('/profile', authenticateToken, validate(updateProfileSchema), updateProfile);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Cambiar contraseña del usuario autenticado
 * @access  Private
 */
router.put('/change-password', authenticateToken, validate(changePasswordSchema), changePassword);

/**
 * @route   GET /api/auth/get-verification-token/:userId
 * @desc    Obtener token de verificación para testing (temporal)
 * @access  Public (solo para testing)
 */
router.get('/get-verification-token/:userId', getVerificationToken);

module.exports = router;
