const nodemailer = require('nodemailer');

// Configuración para Ethereal Email (desarrollo)
let transporter;

const createTransporter = async () => {
  if (transporter) {
    return transporter;
  }

  try {
    // Crear cuenta de prueba en Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true para 465, false para otros puertos
      auth: {
        user: testAccount.user, // Usuario generado por Ethereal
        pass: testAccount.pass, // Contraseña generada por Ethereal
      },
    });

    console.log('📧 Configuración de email (Ethereal) creada exitosamente');
    console.log('🔗 Ver correos en: https://ethereal.email');
    console.log(`👤 Usuario: ${testAccount.user}`);
    console.log(`🔑 Contraseña: ${testAccount.pass}`);
    
    return transporter;
  } catch (error) {
    console.error('❌ Error al configurar el transporter de email:', error);
    throw error;
  }
};

// Función para enviar email de verificación
const sendVerificationEmail = async (email, name, verificationToken) => {
  try {
    const transporter = await createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: '"Delixmi Team" <noreply@delixmi.com>',
      to: email,
      subject: 'Verifica tu cuenta en Delixmi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verifica tu cuenta - Delixmi</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .title {
              color: #e74c3c;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #e74c3c;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍽️ Delixmi</div>
              <h1 class="title">¡Bienvenido a Delixmi!</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${name}</strong>,</p>
              
              <p>¡Gracias por registrarte en Delixmi! Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
              
              <p>Para completar tu registro y activar tu cuenta, por favor haz clic en el siguiente botón:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar mi cuenta</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad. Si no puedes verificar tu cuenta ahora, puedes solicitar un nuevo enlace de verificación.
              </div>
              
              <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${verificationUrl}
              </p>
              
              <p>Una vez verificado, podrás:</p>
              <ul>
                <li>Iniciar sesión en tu cuenta</li>
                <li>Realizar pedidos de comida</li>
                <li>Gestionar tu perfil</li>
                <li>Disfrutar de todas nuestras funcionalidades</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Si no creaste una cuenta en Delixmi, puedes ignorar este correo.</p>
              <p>© 2024 Delixmi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        ¡Bienvenido a Delixmi!
        
        Hola ${name},
        
        Gracias por registrarte en Delixmi. Para completar tu registro y activar tu cuenta, por favor visita el siguiente enlace:
        
        ${verificationUrl}
        
        Este enlace expirará en 1 hora por seguridad.
        
        Si no creaste una cuenta en Delixmi, puedes ignorar este correo.
        
        © 2024 Delixmi. Todos los derechos reservados.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email de verificación enviado:', {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
      to: email
    });

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
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
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: '"Delixmi Team" <noreply@delixmi.com>',
      to: email,
      subject: 'Nuevo enlace de verificación - Delixmi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nuevo enlace de verificación - Delixmi</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .title {
              color: #e74c3c;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #e74c3c;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
            .info {
              background-color: #d1ecf1;
              border: 1px solid #bee5eb;
              color: #0c5460;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍽️ Delixmi</div>
              <h1 class="title">Nuevo enlace de verificación</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${name}</strong>,</p>
              
              <p>Has solicitado un nuevo enlace de verificación para tu cuenta en Delixmi.</p>
              
              <div class="info">
                <strong>ℹ️ Información:</strong> Este es un nuevo enlace de verificación que reemplaza al anterior.
              </div>
              
              <p>Para activar tu cuenta, por favor haz clic en el siguiente botón:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verificar mi cuenta</a>
              </div>
              
              <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${verificationUrl}
              </p>
            </div>
            
            <div class="footer">
              <p>Si no solicitaste este enlace, puedes ignorar este correo.</p>
              <p>© 2024 Delixmi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Nuevo enlace de verificación - Delixmi
        
        Hola ${name},
        
        Has solicitado un nuevo enlace de verificación para tu cuenta en Delixmi.
        
        Para activar tu cuenta, por favor visita el siguiente enlace:
        
        ${verificationUrl}
        
        Si no solicitaste este enlace, puedes ignorar este correo.
        
        © 2024 Delixmi. Todos los derechos reservados.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email de reenvío de verificación enviado:', {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
      to: email
    });

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };

  } catch (error) {
    console.error('❌ Error al enviar email de reenvío:', error);
    throw error;
  }
};

// Función para enviar email de restablecimiento de contraseña
const sendPasswordResetEmail = async (email, name, resetToken) => {
  try {
    const transporter = await createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: '"Delixmi Team" <noreply@delixmi.com>',
      to: email,
      subject: 'Restablece tu contraseña - Delixmi',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Restablece tu contraseña - Delixmi</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f4f4f4;
            }
            .container {
              background-color: #ffffff;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .title {
              color: #e74c3c;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .content {
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #e74c3c;
              color: white;
              padding: 15px 30px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              text-align: center;
              margin: 20px 0;
            }
            .button:hover {
              background-color: #c0392b;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              color: #666;
              font-size: 14px;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .security {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              color: #721c24;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🍽️ Delixmi</div>
              <h1 class="title">Restablece tu contraseña</h1>
            </div>
            
            <div class="content">
              <p>Hola <strong>${name}</strong>,</p>
              
              <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Delixmi.</p>
              
              <p>Si solicitaste este cambio, haz clic en el siguiente botón para crear una nueva contraseña:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Restablecer contraseña</a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 15 minutos por seguridad. Si no puedes restablecer tu contraseña ahora, puedes solicitar un nuevo enlace.
              </div>
              
              <div class="security">
                <strong>🔒 Seguridad:</strong> Si no solicitaste este cambio de contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.
              </div>
              
              <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
              <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                ${resetUrl}
              </p>
              
              <p>Una vez que restablezcas tu contraseña, podrás:</p>
              <ul>
                <li>Iniciar sesión con tu nueva contraseña</li>
                <li>Acceder a todas las funcionalidades de tu cuenta</li>
                <li>Continuar disfrutando de Delixmi</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>Si no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
              <p>© 2024 Delixmi. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Restablece tu contraseña - Delixmi
        
        Hola ${name},
        
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Delixmi.
        
        Si solicitaste este cambio, visita el siguiente enlace para crear una nueva contraseña:
        
        ${resetUrl}
        
        Este enlace expirará en 15 minutos por seguridad.
        
        Si no solicitaste este cambio de contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.
        
        © 2024 Delixmi. Todos los derechos reservados.
      `
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email de restablecimiento de contraseña enviado:', {
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
      to: email
    });

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
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
