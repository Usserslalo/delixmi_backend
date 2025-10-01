const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const { sendVerificationEmail, sendResendVerificationEmail } = require('../config/email');
const { sendOtpSms, isValidPhoneNumber } = require('../config/sms');

const prisma = new PrismaClient();

/**
 * Controlador para el registro de usuarios
 * POST /api/auth/register
 */
const register = async (req, res) => {
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
      return res.status(409).json({
        status: 'error',
        message: `Ya existe un usuario con este ${conflictField === 'email' ? 'correo electrónico' : 'teléfono'}`,
        code: 'USER_EXISTS',
        field: conflictField
      });
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
    } catch (emailError) {
      console.error('❌ Error al enviar email de verificación:', emailError);
      // No fallar el registro si el email falla, pero logear el error
    }

    res.status(201).json({
      status: 'success',
      message: 'Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.',
      data: {
        user: newUser,
        emailSent: true
      }
    });

  } catch (error) {
    console.error('Error en registro de usuario:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para el inicio de sesión
 * POST /api/auth/login
 */
const login = async (req, res) => {
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

    const { email, password } = req.body;

    // Buscar el usuario por email
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userRoleAssignments: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                displayName: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales inválidas',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Cuenta no verificada. Por favor, verifica tu correo electrónico.',
        code: 'ACCOUNT_NOT_VERIFIED',
        userStatus: user.status
      });
    }

    // Obtener el rol principal del usuario (el primero)
    const primaryRole = user.userRoleAssignments[0]?.role;

    if (!primaryRole) {
      return res.status(500).json({
        status: 'error',
        message: 'Error de configuración: usuario sin roles asignados',
        code: 'NO_ROLES_ASSIGNED'
      });
    }

    // Generar JWT
    const tokenPayload = {
      userId: user.id,
      roleId: primaryRole.id,
      roleName: primaryRole.name,
      email: user.email
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: 'delixmi-api',
        audience: 'delixmi-app'
      }
    );

    // Respuesta exitosa
    res.json({
      status: 'success',
      message: 'Inicio de sesión exitoso',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          lastname: user.lastname,
          email: user.email,
          status: user.status,
          roles: user.userRoleAssignments.map(assignment => ({
            roleId: assignment.role.id,
            roleName: assignment.role.name,
            roleDisplayName: assignment.role.displayName,
            restaurantId: assignment.restaurantId,
            branchId: assignment.branchId
          }))
        },
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para obtener el perfil del usuario autenticado
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    // El usuario ya está disponible en req.user gracias al middleware
    res.json({
      status: 'success',
      message: 'Perfil obtenido exitosamente',
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para cerrar sesión (opcional - principalmente para logging)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // En un sistema JWT stateless, el logout se maneja en el cliente
    // eliminando el token. Aquí podemos registrar el evento si es necesario.
    
    res.json({
      status: 'success',
      message: 'Sesión cerrada exitosamente'
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
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
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para verificar email
 * GET /api/auth/verify-email
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Error de Verificación - Delixmi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 20px; }
            .button { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">❌ Error de Verificación</h1>
            <p class="message">Token de verificación no proporcionado.</p>
            <a href="/" class="button">Volver al inicio</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verificar el token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(400).send(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>Token Expirado - Delixmi</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
              .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
              .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
              .message { color: #666; margin-bottom: 20px; }
              .button { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 class="error">⏰ Token Expirado</h1>
              <p class="message">El enlace de verificación ha expirado. Por favor, solicita uno nuevo.</p>
              <a href="/api/auth/resend-verification" class="button">Solicitar nuevo enlace</a>
              <a href="/" class="button">Volver al inicio</a>
            </div>
          </body>
          </html>
        `);
      }
      
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Token Inválido - Delixmi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 20px; }
            .button { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">❌ Token Inválido</h1>
            <p class="message">El enlace de verificación no es válido.</p>
            <a href="/" class="button">Volver al inicio</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verificar que sea un token de verificación de email
    if (decoded.type !== 'email_verification') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Token Inválido - Delixmi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 20px; }
            .button { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">❌ Token Inválido</h1>
            <p class="message">Este no es un token de verificación de email válido.</p>
            <a href="/" class="button">Volver al inicio</a>
          </div>
        </body>
        </html>
      `);
    }

    // Buscar al usuario
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Usuario No Encontrado - Delixmi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 20px; }
            .button { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="error">❌ Usuario No Encontrado</h1>
            <p class="message">El usuario asociado a este enlace no existe.</p>
            <a href="/" class="button">Volver al inicio</a>
          </div>
        </body>
        </html>
      `);
    }

    // Verificar si ya está verificado
    if (user.emailVerifiedAt) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Cuenta Ya Verificada - Delixmi</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            .success { color: #27ae60; font-size: 24px; margin-bottom: 20px; }
            .message { color: #666; margin-bottom: 20px; }
            .button { background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">✅ Cuenta Ya Verificada</h1>
            <p class="message">Tu cuenta ya está verificada. Puedes iniciar sesión normalmente.</p>
            <a href="/api/auth/login" class="button">Iniciar Sesión</a>
          </div>
        </body>
        </html>
      `);
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        status: 'active'
      }
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>¡Cuenta Verificada! - Delixmi</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          .success { color: #27ae60; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; }
          .button { background: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="success">🎉 ¡Cuenta Verificada!</h1>
          <p class="message">¡Tu cuenta ha sido verificada con éxito! Ya puedes iniciar sesión en la aplicación.</p>
          <a href="/api/auth/login" class="button">Iniciar Sesión</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Error en verificación de email:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Error del Servidor - Delixmi</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f4f4f4; }
          .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          .error { color: #e74c3c; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; margin-bottom: 20px; }
          .button { background: #e74c3c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">❌ Error del Servidor</h1>
          <p class="message">Ha ocurrido un error interno. Por favor, intenta más tarde.</p>
          <a href="/" class="button">Volver al inicio</a>
        </div>
      </body>
      </html>
    `);
  }
};

/**
 * Controlador para reenviar verificación de email
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
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

    const { email } = req.body;

    // Buscar al usuario
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si ya está verificado
    if (user.emailVerifiedAt) {
      return res.status(400).json({
        status: 'error',
        message: 'La cuenta ya está verificada',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Verificar que esté en estado pending
    if (user.status !== 'pending') {
      return res.status(400).json({
        status: 'error',
        message: 'La cuenta no está pendiente de verificación',
        code: 'NOT_PENDING'
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
        code: 'EMAIL_SEND_ERROR'
      });
    }

  } catch (error) {
    console.error('Error en reenvío de verificación:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
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

module.exports = {
  register,
  login,
  getProfile,
  logout,
  verifyToken,
  verifyEmail,
  resendVerification,
  sendPhoneVerification,
  verifyPhone
};
