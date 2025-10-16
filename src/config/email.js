const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');
const templateService = require('../services/template.service');

// Configuración para SendGrid (producción)
let transporter;

const createTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  try {
    // Validar que la API Key de SendGrid esté configurada
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('Variable de entorno SENDGRID_API_KEY es requerida para la configuración de SendGrid');
    }

    // Configurar opciones de SendGrid
    const options = {
      auth: {
        api_key: process.env.SENDGRID_API_KEY
      }
    };

    // Crear transporter con SendGrid
    transporter = nodemailer.createTransport(sgTransport(options));

    console.log('📧 Configuración de email (SendGrid) creada exitosamente');
    console.log('🔗 Servicio: SendGrid API');
    
    return transporter;
  } catch (error) {
    console.error('❌ Error al configurar el transporter de email:', error);
    throw error;
  }
};

// Función para enviar email de verificación
const sendVerificationEmail = async (email, name, verificationToken) => {
  try {
    console.log('📧 Iniciando envío de email de verificación a:', email);
    
    const transporter = await createTransporter();
    
    // Generar enlace web de verificación
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    console.log('🔗 URL de verificación generada para:', email);
    
    // Preparar datos para la plantilla
    const templateData = {
      title: 'Verifica tu cuenta',
      userName: name,
      message: '¡Gracias por registrarte en Delixmi! Estamos emocionados de tenerte como parte de nuestra comunidad. Para completar tu registro y activar tu cuenta, por favor haz clic en el siguiente botón:',
      verificationUrl: verificationUrl
    };

    // Renderizar plantilla usando TemplateService
    const { html, text } = templateService.renderEmail('verifyEmail', templateData);

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com',
      to: email,
      subject: 'Verifica tu cuenta en Delixmi',
      html: html,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de verificación enviado exitosamente:');
    console.log('📧 messageId:', info.messageId);
    console.log('📧 to:', email);
    console.log('📧 from:', process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com');

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: null // SendGrid no proporciona preview URL como Ethereal
    };

  } catch (error) {
    console.error('❌ Error al enviar email de verificación:', error);
    throw error;
  }
};

// Función para enviar email de reenvío de verificación
const sendResendVerificationEmail = async (email, name, verificationToken) => {
  try {
    const transporter = await createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    // Preparar datos para la plantilla
    const templateData = {
      title: 'Nuevo enlace de verificación',
      userName: name,
      message: 'Has solicitado un nuevo enlace de verificación para tu cuenta en Delixmi. Para activar tu cuenta, por favor haz clic en el siguiente botón:',
      verificationUrl: verificationUrl
    };

    // Renderizar plantilla usando TemplateService
    const { html, text } = templateService.renderEmail('verifyEmail', templateData);

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com',
      to: email,
      subject: 'Nuevo enlace de verificación - Delixmi',
      html: html,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email de reenvío de verificación enviado:', {
      messageId: info.messageId,
      to: email,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com'
    });

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: null // SendGrid no proporciona preview URL como Ethereal
    };

  } catch (error) {
    console.error('❌ Error al enviar email de reenvío:', error);
    throw error;
  }
};

// Función para enviar email de restablecimiento de contraseña
const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    console.log('📧 Iniciando envío de email de reset password a:', email);
    
    const transporter = await createTransporter();
    
    // Generar enlace web para reset de contraseña
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    console.log('🔗 URL de reset password generada para:', email);
    
    // Preparar datos para la plantilla
    const templateData = {
      title: 'Restablece tu contraseña',
      userName: name,
      message: 'Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Delixmi. Si solicitaste este cambio, haz clic en el siguiente botón para crear una nueva contraseña:',
      resetUrl: resetUrl
    };

    // Renderizar plantilla usando TemplateService
    const { html, text } = templateService.renderEmail('resetPassword', templateData);

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com',
      to: email,
      subject: 'Restablece tu contraseña - Delixmi',
      html: html,
      text: text
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de restablecimiento de contraseña enviado exitosamente:');
    console.log('📧 messageId:', info.messageId);
    console.log('📧 to:', email);
    console.log('📧 from:', process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com');

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: null // SendGrid no proporciona preview URL como Ethereal
    };

  } catch (error) {
    console.error('❌ Error al enviar email de restablecimiento:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendResendVerificationEmail,
  sendPasswordResetEmail,
  createTransporter
};