const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendVerificationEmail, sendResendVerificationEmail, sendPasswordResetEmail } = require('../config/email');
const { sendOtpSms, isValidPhoneNumber } = require('../config/sms');
const ResponseService = require('../services/response.service');

const prisma = new PrismaClient();

/**
 * Controlador para el registro de usuarios
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Los datos ya están validados por Zod
    const { name, lastname, email, phone, password } = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone }
        ]
      }
    });

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'phone';
      const message = conflictField === 'email' 
        ? 'El correo electrónico ya está en uso' 
        : 'El número de teléfono ya está en uso';
      return ResponseService.conflict(res, message, null, 'USER_EXISTS');
    }

    // Hashear la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear el usuario
    const newUser = await prisma.user.create({
      data: {
        name,
        lastname,
        email,
        phone,
        password: hashedPassword,
        status: 'pending' // Estado por defecto
      },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true
      }
    });

    // Buscar el rol de 'customer' para asignarlo automáticamente
    const customerRole = await prisma.role.findUnique({
      where: { name: 'customer' }
    });

    if (!customerRole) {
      // Si no existe el rol customer, crearlo
      const createdRole = await prisma.role.create({
        data: {
          name: 'customer',
          displayName: 'Cliente',
          description: 'Rol por defecto para clientes de la plataforma'
        }
      });

      // Asignar el rol al usuario
      await prisma.userRoleAssignment.create({
        data: {
          userId: newUser.id,
          roleId: createdRole.id
        }
      });
    } else {
      // Asignar el rol existente al usuario
      await prisma.userRoleAssignment.create({
        data: {
          userId: newUser.id,
          roleId: customerRole.id
        }
      });
    }

    // Generar token de verificación JWT (1 hora de duración)
    const verificationToken = jwt.sign(
      { 
        userId: newUser.id,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'delixmi-api',
        audience: 'delixmi-app'
      }
    );

    // Enviar email de verificación
    try {
      const emailResult = await sendVerificationEmail(
        newUser.email, 
        newUser.name, 
        verificationToken
      );
      
      console.log('📧 Email de verificación enviado:', emailResult.previewUrl);
      
      // Solo responder con éxito si el email se envió correctamente
      return ResponseService.success(
        res, 
        'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.',
        {
          user: newUser,
          emailSent: true
        },
        201
      );
      
    } catch (emailError) {
      console.error('❌ Error al enviar email de verificación:', emailError);
      
      // Si el envío del email falla, devolver error 500 al cliente
      return ResponseService.error(
        res,
        'Usuario creado, pero no se pudo enviar el correo de verificación. Por favor, solicita un reenvío.',
        {
          userId: newUser.id,
          email: newUser.email
        },
        500,
        'EMAIL_SEND_ERROR'
      );
    }

  } catch (error) {
    console.error('Error en registro de usuario:', error);
    return ResponseService.internalError(res, 'Error interno del servidor', 'INTERNAL_ERROR');
  }
};

/**
 * Controlador para el inicio de sesión
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    // Los datos ya están validados por Zod
    const { email, password } = req.body;

    // Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
        password: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true,
                displayName: true
              }
            },
            restaurantId: true,
            branchId: true
          }
        }
      }
    });

    if (!user) {
      return ResponseService.unauthorized(res, 'Credenciales incorrectas', 'INVALID_CREDENTIALS');
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return ResponseService.unauthorized(res, 'Credenciales incorrectas', 'INVALID_CREDENTIALS');
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      return ResponseService.forbidden(res, 'Cuenta no verificada. Por favor, verifica tu correo electrónico.', 'ACCOUNT_NOT_VERIFIED');
    }

    // Obtener el rol principal del usuario (el primero)
    const primaryRole = user.userRoleAssignments[0]?.role;

    if (!primaryRole) {
      return ResponseService.internalError(res, 'Error de configuración: usuario sin roles asignados', 'NO_ROLES_ASSIGNED');
    }

    // Generar Access Token (corta duración)
    const tokenPayload = {
      userId: user.id,
      roleId: primaryRole.id,
      roleName: primaryRole.name,
      email: user.email
    };

    const accessToken = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        issuer: 'delixmi-api',
        audience: 'delixmi-app'
      }
    );

    // Generar Refresh Token (criptográficamente seguro)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    
    // Hashear el refresh token para almacenarlo en la base de datos
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    
    // Establecer fecha de expiración del refresh token (7 días por defecto)
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + (parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS) || 7));
    
    // Guardar el refresh token hasheado en la base de datos
    await prisma.refreshToken.create({
      data: {
        token: hashedRefreshToken,
        userId: user.id,
        expiresAt: refreshTokenExpiresAt
      }
    });

    // Respuesta exitosa
    return ResponseService.success(
      res,
      'Inicio de sesión exitoso',
      {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          phone: user.phone,
          status: user.status,
          emailVerifiedAt: user.emailVerifiedAt,
          phoneVerifiedAt: user.phoneVerifiedAt,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles: user.userRoleAssignments.map(assignment => ({
            roleId: assignment.roleId,
            roleName: assignment.role.name,
            roleDisplayName: assignment.role.displayName,
            restaurantId: assignment.restaurantId,
            branchId: assignment.branchId
          }))
        },
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
      }
    );

  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    return ResponseService.internalError(res, 'Error interno del servidor', 'INTERNAL_ERROR');
  }
};

/**
 * Controlador para obtener el perfil del usuario autenticado
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // El usuario ya está disponible en req.user gracias al middleware
    return ResponseService.success(
      res,
      'Perfil obtenido exitosamente',
      {
        user: req.user
      }
    );
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    return ResponseService.internalError(res, 'Error interno del servidor', 'INTERNAL_ERROR');
  }
};

/**
 * Controlador para actualizar el perfil del usuario autenticado
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    // Los datos ya están validados por Zod
    const { name, lastname, phone } = req.body;

    // Verificar si el teléfono ya está en uso por otro usuario
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: {
          phone: phone,
          id: { not: userId }
        }
      });

      if (existingPhone) {
        return res.status(409).json({
          status: 'error',
          message: 'Este número de teléfono ya está registrado por otro usuario',
          code: 'PHONE_EXISTS',
          data: null
        });
      }
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (lastname) updateData.lastname = lastname.trim();
    if (phone) updateData.phone = phone.trim();

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
        status: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      message: 'Perfil actualizado exitosamente',
      data: {
        user: updatedUser
      }
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

/**
 * Controlador para cambiar la contraseña del usuario autenticado
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    // Los datos ya están validados por Zod
    const { currentPassword, newPassword } = req.body;

    // Obtener el usuario con su contraseña actual
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        name: true,
        email: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND',
        data: null
      });
    }

    // Verificar la contraseña actual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: 'error',
        message: 'La contraseña actual es incorrecta',
        code: 'INVALID_CURRENT_PASSWORD',
        data: null
      });
    }

    // Hashear la nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedNewPassword,
        updatedAt: new Date()
      }
    });

    res.json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente',
      data: {
        userId: user.id,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

/**
 * Controlador para refrescar el access token usando refresh token
 * POST /api/auth/refresh-token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseService.badRequest(res, 'Refresh token requerido', 'REFRESH_TOKEN_REQUIRED');
    }

    // Buscar refresh tokens del usuario (necesitamos el userId del access token expirado)
    const authHeader = req.headers['authorization'];
    const accessToken = authHeader && authHeader.split(' ')[1];

    if (!accessToken) {
      return ResponseService.badRequest(res, 'Access token requerido para obtener userId', 'ACCESS_TOKEN_REQUIRED');
    }

    // Decodificar el access token expirado (sin verificar la expiración)
    let decoded;
    try {
      decoded = jwt.decode(accessToken);
      if (!decoded || !decoded.userId) {
        return ResponseService.badRequest(res, 'Access token inválido', 'INVALID_ACCESS_TOKEN');
      }
    } catch (error) {
      return ResponseService.badRequest(res, 'Access token inválido', 'INVALID_ACCESS_TOKEN');
    }

    // Buscar refresh tokens del usuario
    const userRefreshTokens = await prisma.refreshToken.findMany({
      where: {
        userId: decoded.userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (userRefreshTokens.length === 0) {
      return ResponseService.forbidden(res, 'No hay refresh tokens válidos. Inicia sesión nuevamente.', 'NO_REFRESH_TOKENS');
    }

    // Verificar cada refresh token hasheado
    let validRefreshToken = null;
    for (const tokenRecord of userRefreshTokens) {
      const isTokenValid = await bcrypt.compare(refreshToken, tokenRecord.token);
      if (isTokenValid) {
        validRefreshToken = tokenRecord;
        break;
      }
    }

    if (!validRefreshToken) {
      return ResponseService.forbidden(res, 'Refresh token inválido. Inicia sesión nuevamente.', 'INVALID_REFRESH_TOKEN');
    }

    // Verificar que el refresh token no haya expirado
    if (new Date() > validRefreshToken.expiresAt) {
      // Limpiar tokens expirados
      await prisma.refreshToken.deleteMany({
        where: {
          userId: decoded.userId,
          expiresAt: {
            lt: new Date()
          }
        }
      });
      return ResponseService.forbidden(res, 'Refresh token expirado. Inicia sesión nuevamente.', 'REFRESH_TOKEN_EXPIRED');
    }

    // Verificar que el usuario aún existe y está activo
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        status: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    if (!user || user.status !== 'active') {
      return ResponseService.forbidden(res, 'Usuario no encontrado o inactivo. Inicia sesión nuevamente.', 'USER_INACTIVE');
    }

    const primaryRole = user.userRoleAssignments[0]?.role;
    if (!primaryRole) {
      return ResponseService.internalError(res, 'Error de configuración: usuario sin roles asignados', 'NO_ROLES_ASSIGNED');
    }

    // ROTACIÓN DE TOKENS: Eliminar el refresh token usado
    await prisma.refreshToken.delete({
      where: { id: validRefreshToken.id }
    });

    // Generar nuevo access token
    const newTokenPayload = {
      userId: user.id,
      roleId: primaryRole.id,
      roleName: primaryRole.name,
      email: decoded.email
    };

    const newAccessToken = jwt.sign(
      newTokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        issuer: 'delixmi-api',
        audience: 'delixmi-app'
      }
    );

    // Generar nuevo refresh token
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 12);
    
    const newRefreshTokenExpiresAt = new Date();
    newRefreshTokenExpiresAt.setDate(newRefreshTokenExpiresAt.getDate() + (parseInt(process.env.JWT_REFRESH_EXPIRES_IN_DAYS) || 7));

    await prisma.refreshToken.create({
      data: {
        token: hashedNewRefreshToken,
        userId: user.id,
        expiresAt: newRefreshTokenExpiresAt
      }
    });

    return ResponseService.success(
      res,
      'Tokens renovados exitosamente',
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m'
      }
    );

  } catch (error) {
    console.error('Error en refresh token:', error);
    return ResponseService.internalError(res, 'Error interno del servidor', 'INTERNAL_ERROR');
  }
};

/**
 * Controlador para cerrar sesión
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseService.badRequest(res, 'Refresh token requerido', 'REFRESH_TOKEN_REQUIRED');
    }

    // Buscar y eliminar el refresh token
    const userRefreshTokens = await prisma.refreshToken.findMany({
      where: {
        user: {
          status: 'active'
        }
      }
    });

    // Verificar cada refresh token hasheado y eliminar el que coincida
    for (const tokenRecord of userRefreshTokens) {
      const isTokenValid = await bcrypt.compare(refreshToken, tokenRecord.token);
      if (isTokenValid) {
        await prisma.refreshToken.delete({
          where: { id: tokenRecord.id }
        });
        break;
      }
    }

    return ResponseService.success(
      res,
      'Sesión cerrada exitosamente',
      null
    );
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return ResponseService.internalError(res, 'Error interno del servidor', 'INTERNAL_ERROR');
  }
};

/**
 * Controlador para verificar el estado del token
 * GET /api/auth/verify
 */
const verifyToken = async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (middleware ya lo verificó)
    res.json({
      status: 'success',
      message: 'Token válido',
      data: {
        user: req.user,
        valid: true
      }
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

/**
 * Controlador para verificar email
 * GET /api/auth/verify-email
 * Centraliza toda la lógica de verificación en el servidor
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    // Validar que se proporcionó el token
    if (!token) {
      return res.redirect('/status.html?status=error&title=Error de Verificación&message=Token de verificación no proporcionado.');
    }

    // Verificar el token JWT y procesar la verificación
    try {
      // Decodificar y verificar el token JWT
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verificar que sea un token de verificación de email
      if (decoded.type !== 'email_verification') {
        return res.redirect('/status.html?status=error&title=Token Inválido&message=Este no es un token de verificación de email válido.');
      }

      // Buscar al usuario en la base de datos
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true,
          status: true
        }
      });

      // Verificar que el usuario existe
      if (!user) {
        return res.redirect('/status.html?status=error&title=Usuario No Encontrado&message=El usuario asociado a este enlace no existe.');
      }

      // Verificar si ya está verificado
      if (user.emailVerifiedAt) {
        return res.redirect('/status.html?status=already_verified&title=Cuenta Ya Verificada&message=Tu cuenta ya está verificada. Puedes iniciar sesión normalmente.');
      }

      // Actualizar el usuario: marcar como verificado y activar cuenta
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerifiedAt: new Date(),
          status: 'active'
        }
      });

      // Log de éxito para auditoría
      console.log(`✅ Email verificado exitosamente:`, {
        userId: user.id,
        email: user.email,
        name: user.name,
        verifiedAt: new Date().toISOString()
      });

      // Redirigir a página de éxito
      return res.redirect('/status.html?status=success&title=¡Cuenta Verificada!&message=Tu cuenta ha sido verificada con éxito. Ya puedes iniciar sesión.');

    } catch (jwtError) {
      // Manejar errores específicos del JWT
      if (jwtError.name === 'TokenExpiredError') {
        console.log(`⏰ Token expirado para verificación de email: ${token.substring(0, 20)}...`);
        return res.redirect('/status.html?status=error&title=Enlace Expirado&message=El enlace de verificación ha expirado. Por favor, solicita uno nuevo.');
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        console.log(`❌ Token JWT inválido para verificación: ${token.substring(0, 20)}...`);
        return res.redirect('/status.html?status=error&title=Token Inválido&message=El enlace de verificación no es válido.');
      }

      // Otros errores de JWT
      console.error('❌ Error de JWT en verificación:', jwtError);
      return res.redirect('/status.html?status=error&title=Error de Verificación&message=El enlace es inválido o ya ha sido utilizado.');
    }

  } catch (error) {
    // Manejar errores generales del servidor
    console.error('❌ Error interno en verificación de email:', error);
    return res.redirect('/status.html?status=error&title=Error del Servidor&message=Ha ocurrido un error interno. Por favor, intenta más tarde.');
  }
};

/**
 * Controlador para reenviar verificación de email
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
  try {
    // Los datos ya están validados por Zod
    const { email } = req.body;

    // Buscar al usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND',
        data: null
      });
    }

    // Verificar si ya está verificado
    if (user.emailVerifiedAt) {
      return res.status(400).json({
        status: 'error',
        message: 'La cuenta ya está verificada',
        code: 'ALREADY_VERIFIED',
        data: null
      });
    }

    // Verificar que esté en estado pending
    if (user.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'La cuenta no está pendiente de verificación',
        code: 'NOT_PENDING',
        data: null
      });
    }

    // Generar nuevo token de verificación
    const verificationToken = jwt.sign(
      { 
        userId: user.id,
        type: 'email_verification'
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '1h',
        issuer: 'delixmi-api',
        audience: 'delixmi-app'
      }
    );

    // Enviar email de reenvío
    try {
      const emailResult = await sendResendVerificationEmail(
        user.email, 
        user.name, 
        verificationToken
      );
      
      console.log('📧 Email de reenvío enviado:', emailResult.previewUrl);

      res.json({
        status: 'success',
        message: 'Nuevo enlace de verificación enviado a tu correo electrónico',
        data: {
          email: user.email,
          emailSent: true
        }
      });

    } catch (emailError) {
      console.error('❌ Error al enviar email de reenvío:', emailError);
      
      res.status(500).json({
        status: 'error',
        message: 'Error al enviar el email de verificación',
        code: 'EMAIL_SEND_ERROR',
        data: null
      });
    }

  } catch (error) {
    console.error('Error en reenvío de verificación:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

/**
 * Controlador para enviar código OTP de verificación por SMS
 * POST /api/auth/send-phone-verification
 */
const sendPhoneVerification = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerifiedAt: true,
        phoneOtp: true,
        phoneOtpExpiresAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si el teléfono ya está verificado
    if (user.phoneVerifiedAt) {
      return res.status(400).json({
        status: 'error',
        message: 'El número de teléfono ya está verificado',
        code: 'PHONE_ALREADY_VERIFIED'
      });
    }

    // Verificar si hay un código OTP pendiente y no ha expirado
    if (user.phoneOtp && user.phoneOtpExpiresAt && new Date() < user.phoneOtpExpiresAt) {
      const timeRemaining = Math.ceil((user.phoneOtpExpiresAt - new Date()) / 1000 / 60);
      return res.status(429).json({
        status: 'error',
        message: `Ya tienes un código de verificación pendiente. Espera ${timeRemaining} minutos antes de solicitar uno nuevo.`,
        code: 'OTP_PENDING',
        timeRemaining: timeRemaining
      });
    }

    // Validar formato del número de teléfono
    if (!isValidPhoneNumber(user.phone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Número de teléfono inválido',
        code: 'INVALID_PHONE_FORMAT'
      });
    }

    // Generar código OTP de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Establecer fecha de expiración (10 minutos)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Guardar código OTP en la base de datos
    await prisma.user.update({
      where: { id: userId },
      data: {
        phoneOtp: otpCode,
        phoneOtpExpiresAt: expiresAt
      }
    });

    // Enviar SMS con el código OTP
    try {
      const smsResult = await sendOtpSms(user.phone, otpCode, user.name);
      
      console.log('📱 SMS de verificación enviado:', smsResult.messageSid);

      res.json({
        status: 'success',
        message: 'Código de verificación enviado a tu teléfono',
        data: {
          phone: user.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3'), // Enmascarar número
          expiresIn: 10, // minutos
          messageSid: smsResult.messageSid
        }
      });

    } catch (smsError) {
      console.error('❌ Error al enviar SMS:', smsError);
      
      // Limpiar el código OTP si falla el envío
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneOtp: null,
          phoneOtpExpiresAt: null
        }
      });

      res.status(500).json({
        status: 'error',
        message: 'Error al enviar el código de verificación. Por favor, intenta más tarde.',
        code: 'SMS_SEND_ERROR',
        details: smsError.message
      });
    }

  } catch (error) {
    console.error('Error en envío de verificación por SMS:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para verificar código OTP de teléfono
 * POST /api/auth/verify-phone
 */
const verifyPhone = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { otp } = req.body;
    const userId = req.user.userId;

    // Obtener información del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerifiedAt: true,
        phoneOtp: true,
        phoneOtpExpiresAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si el teléfono ya está verificado
    if (user.phoneVerifiedAt) {
      return res.status(400).json({
        status: 'error',
        message: 'El número de teléfono ya está verificado',
        code: 'PHONE_ALREADY_VERIFIED'
      });
    }

    // Verificar si hay un código OTP pendiente
    if (!user.phoneOtp || !user.phoneOtpExpiresAt) {
      return res.status(400).json({
        status: 'error',
        message: 'No hay código de verificación pendiente. Solicita uno nuevo.',
        code: 'NO_OTP_PENDING'
      });
    }

    // Verificar si el código ha expirado
    if (new Date() > user.phoneOtpExpiresAt) {
      // Limpiar código expirado
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneOtp: null,
          phoneOtpExpiresAt: null
        }
      });

      return res.status(400).json({
        status: 'error',
        message: 'El código de verificación ha expirado. Solicita uno nuevo.',
        code: 'OTP_EXPIRED'
      });
    }

    // Verificar si el código OTP coincide
    if (user.phoneOtp !== otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Código de verificación inválido',
        code: 'INVALID_OTP'
      });
    }

    // Código válido - verificar el teléfono
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        phoneVerifiedAt: new Date(),
        phoneOtp: null,
        phoneOtpExpiresAt: null
      },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        status: true
      }
    });

    console.log(`✅ Teléfono verificado para usuario ${user.name} (ID: ${userId})`);

    res.json({
      status: 'success',
      message: 'Número de teléfono verificado exitosamente',
      data: {
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          phone: updatedUser.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1***$3'), // Enmascarar número
          phoneVerifiedAt: updatedUser.phoneVerifiedAt,
          emailVerifiedAt: updatedUser.emailVerifiedAt,
          status: updatedUser.status
        }
      }
    });

  } catch (error) {
    console.error('Error en verificación de teléfono:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para solicitar restablecimiento de contraseña
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    // Los datos ya están validados por Zod
    const { email } = req.body;

    // Buscar al usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        status: true
      }
    });

    // MEDIDA DE SEGURIDAD: Siempre devolver éxito, independientemente de si el usuario existe
    // Esto previene que alguien pueda usar este endpoint para adivinar emails registrados
    const successResponse = {
      status: 'success',
      message: 'Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña.'
    };

    // Si no se encuentra el usuario, devolver respuesta genérica de éxito
    if (!user) {
      console.log(`🔒 Intento de reset de contraseña para email no registrado: ${email}`);
      return res.status(200).json(successResponse);
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      console.log(`🔒 Intento de reset de contraseña para usuario inactivo: ${email} (status: ${user.status})`);
      return res.status(200).json(successResponse);
    }

    // Generar token de restablecimiento seguro y único
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hashear el token para almacenarlo en la base de datos
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Establecer fecha de expiración (15 minutos)
    const resetExpires = new Date();
    resetExpires.setMinutes(resetExpires.getMinutes() + 15);

    // Guardar el token hasheado y la fecha de expiración en la base de datos
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: resetExpires
      }
    });

    // Enviar email con el token sin hashear
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        user.name,
        resetToken // Enviar el token sin hashear
      );
      
      console.log('📧 Email de restablecimiento enviado:', {
        email: user.email,
        previewUrl: emailResult.previewUrl,
        expiresAt: resetExpires
      });

      res.status(200).json(successResponse);

    } catch (emailError) {
      console.error('❌ Error al enviar email de restablecimiento:', emailError);
      
      // Limpiar el token si falla el envío del email
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: null,
          passwordResetExpiresAt: null
        }
      });

      // Aún así, devolver respuesta genérica de éxito por seguridad
      res.status(200).json(successResponse);
    }

  } catch (error) {
    console.error('Error en forgot password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

/**
 * Controlador para restablecer contraseña con token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    // Los datos ya están validados por Zod
    const { token, newPassword } = req.body;

    // Hashear el token recibido de la misma forma que al crearlo
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Buscar usuario con el token hasheado y que no haya expirado
    const currentDate = new Date();
    
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpiresAt: {
          gt: currentDate // Mayor que la fecha actual
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        passwordResetToken: true,
        passwordResetExpiresAt: true
      }
    });

    // Si no se encuentra el usuario, devolver error
    if (!user) {
      console.log(`🔒 Intento de reset de contraseña con token inválido o expirado`);
      return res.status(400).json({
        status: 'error',
        message: 'Token inválido o expirado.',
        code: 'INVALID_OR_EXPIRED_TOKEN',
        data: null
      });
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      console.log(`🔒 Intento de reset de contraseña para usuario inactivo: ${user.email} (status: ${user.status})`);
      return res.status(400).json({
        status: 'error',
        message: 'Token inválido o expirado.',
        code: 'INVALID_OR_EXPIRED_TOKEN',
        data: null
      });
    }

    // Hashear la nueva contraseña
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Actualizar la contraseña y limpiar los campos de reset
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        passwordResetToken: null, // Limpiar el token
        passwordResetExpiresAt: null // Limpiar la fecha de expiración
      }
    });

    console.log(`✅ Contraseña restablecida exitosamente para usuario: ${user.email} (ID: ${user.id})`);

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Contraseña actualizada exitosamente.',
      data: {
        userId: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Error en reset password:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
    });
  }
};

module.exports = {
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
  sendPhoneVerification,
  verifyPhone
};
