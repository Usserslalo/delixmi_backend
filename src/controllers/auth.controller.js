const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendVerificationEmail, sendResendVerificationEmail, sendPasswordResetEmail } = require('../config/email');
const { sendOtpSms, isValidPhoneNumber } = require('../config/sms');

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
      return res.status(409).json({
        status: 'error',
        message: conflictField === 'email' 
          ? 'El correo electrónico ya está en uso' 
          : 'El número de teléfono ya está en uso',
        code: 'USER_EXISTS',
        data: null
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
      code: 'INTERNAL_ERROR',
      data: null
    });
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
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales incorrectas',
        code: 'INVALID_CREDENTIALS',
        data: null
      });
    }

    // Verificar la contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Credenciales incorrectas',
        code: 'INVALID_CREDENTIALS',
        data: null
      });
    }

    // Verificar que el usuario esté activo
    if (user.status !== 'active') {
      return res.status(403).json({
        status: 'error',
        message: 'Cuenta no verificada. Por favor, verifica tu correo electrónico.',
        code: 'ACCOUNT_NOT_VERIFIED',
        data: null
      });
    }

    // Obtener el rol principal del usuario (el primero)
    const primaryRole = user.userRoleAssignments[0]?.role;

    if (!primaryRole) {
      return res.status(500).json({
        status: 'error',
        message: 'Error de configuración: usuario sin roles asignados',
        code: 'NO_ROLES_ASSIGNED',
        data: null
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
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      }
    });

  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
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
      code: 'INTERNAL_ERROR',
      data: null
    });
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
 * Controlador para cerrar sesión (opcional - principalmente para logging)
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // En un sistema JWT stateless, el logout se maneja en el cliente
    // eliminando el token. Aquí podemos registrar el evento si es necesario.
    
    res.json({
      status: 'success',
      message: 'Sesión cerrada exitosamente',
      data: null
    });
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR',
      data: null
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
      code: 'INTERNAL_ERROR',
      data: null
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
    console.log('🔍 DEBUG: Buscando usuario en la base de datos...');
    const currentDate = new Date();
    console.log('🔍 DEBUG: Fecha actual para comparación:', currentDate);
    console.log('🔍 DEBUG: Fecha actual ISO:', currentDate.toISOString());
    
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

    console.log('🔍 DEBUG: Usuario encontrado:', user ? 'SÍ' : 'NO');
    
    if (user) {
      console.log('🔍 DEBUG: Usuario ID:', user.id);
      console.log('🔍 DEBUG: Usuario email:', user.email);
      console.log('🔍 DEBUG: Usuario status:', user.status);
      console.log('🔍 DEBUG: Token en BD:', user.passwordResetToken);
      console.log('🔍 DEBUG: Expira en BD:', user.passwordResetExpiresAt);
      console.log('🔍 DEBUG: Fecha actual:', new Date());
      console.log('🔍 DEBUG: ¿Token expirado?', user.passwordResetExpiresAt < new Date() ? 'SÍ' : 'NO');
    } else {
      console.log('❌ DEBUG: No se encontró usuario con ese token o el token expiró');
      
      // Buscar si existe el token pero está expirado
      const expiredUser = await prisma.user.findFirst({
        where: {
          passwordResetToken: hashedToken
        },
        select: {
          id: true,
          email: true,
          passwordResetExpiresAt: true
        }
      });
      
      if (expiredUser) {
        console.log('🔍 DEBUG: Token encontrado pero expirado para usuario:', expiredUser.email);
        console.log('🔍 DEBUG: Token expiraba en:', expiredUser.passwordResetExpiresAt);
        console.log('🔍 DEBUG: Token expiraba en ISO:', expiredUser.passwordResetExpiresAt.toISOString());
        console.log('🔍 DEBUG: Fecha actual:', new Date());
        console.log('🔍 DEBUG: Fecha actual ISO:', new Date().toISOString());
        console.log('🔍 DEBUG: Diferencia en milisegundos:', new Date() - expiredUser.passwordResetExpiresAt);
        console.log('🔍 DEBUG: Diferencia en minutos:', (new Date() - expiredUser.passwordResetExpiresAt) / (1000 * 60));
      } else {
        console.log('🔍 DEBUG: Token no encontrado en la base de datos');
        
        // Buscar todos los tokens de reset activos para debugging
        const allResetTokens = await prisma.user.findMany({
          where: {
            passwordResetToken: {
              not: null
            }
          },
          select: {
            id: true,
            email: true,
            passwordResetToken: true,
            passwordResetExpiresAt: true
          }
        });
        
        console.log('🔍 DEBUG: Total de tokens de reset en la BD:', allResetTokens.length);
        allResetTokens.forEach((tokenData, index) => {
          console.log(`🔍 DEBUG: Token ${index + 1}:`, {
            email: tokenData.email,
            tokenHash: tokenData.passwordResetToken,
            expiresAt: tokenData.passwordResetExpiresAt,
            isExpired: tokenData.passwordResetExpiresAt < new Date()
          });
        });
      }
    }

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

    console.log('🔍 DEBUG: Validaciones pasadas, procediendo a actualizar contraseña...');

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
  verifyToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  sendPhoneVerification,
  verifyPhone
};
