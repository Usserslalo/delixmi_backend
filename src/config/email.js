const nodemailer = require('nodemailer');
const sgTransport = require('nodemailer-sendgrid-transport');

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
    console.log('🔍 DEBUG: Iniciando sendVerificationEmail');
    console.log('🔍 DEBUG: email recibido:', email);
    console.log('🔍 DEBUG: name recibido:', name);
    console.log('🔍 DEBUG: verificationToken recibido:', verificationToken);
    console.log('🔍 DEBUG: verificationToken tipo:', typeof verificationToken);
    console.log('🔍 DEBUG: verificationToken longitud:', verificationToken ? verificationToken.length : 'undefined');
    
    const transporter = await createTransporter();
    
    // Generar deep link para la app móvil
    const deepLinkUrl = `delixmi://verify-email?token=${verificationToken}`;
    
    // Generar enlace web de respaldo
    const webUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
    
    // Log para debugging
    console.log('🔗 URLs generadas para verificación de email:');
    console.log('📱 Deep Link:', deepLinkUrl);
    console.log('🌐 Web URL:', webUrl);
    console.log('🔍 FRONTEND_URL configurado:', process.env.FRONTEND_URL || 'NO CONFIGURADO (usando localhost:3000)');
    
    // Verificar que las URLs se generaron correctamente
    if (!deepLinkUrl.includes('delixmi://')) {
      console.error('❌ ERROR: Deep link no se generó correctamente');
      throw new Error('Deep link no se generó correctamente');
    }
    
    if (!webUrl.includes('http')) {
      console.error('❌ ERROR: Web URL no se generó correctamente');
      throw new Error('Web URL no se generó correctamente');
    }
    
    const htmlContent = `
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
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${webUrl}" 
                   class="button" 
                   style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  📧 Verificar mi cuenta
                </a>
              </div>
              
              <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>📱 Para usuarios de la app:</strong> El botón detectará automáticamente si tienes la aplicación Delixmi instalada y la abrirá. Si no tienes la app, podrás continuar en el navegador web.
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad. Si no puedes verificar tu cuenta ahora, puedes solicitar un nuevo enlace de verificación.
              </div>
              
              <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>🌐 Enlace web de respaldo:</strong></p>
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                  Si el botón no funciona o no tienes la app instalada, copia y pega este enlace en tu navegador:
                </p>
                <p style="word-break: break-all; background-color: #ffffff; padding: 10px; border-radius: 5px; font-family: monospace; border: 1px solid #ddd;">
                  ${webUrl}
                </p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>💡 Instrucciones:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Con la app instalada:</strong> El botón abrirá la app automáticamente</li>
                  <li><strong>Sin la app:</strong> Podrás continuar en el navegador web</li>
                  <li><strong>En móvil:</strong> Se detectará automáticamente si tienes la app</li>
                  <li><strong>En cualquier dispositivo:</strong> El botón funcionará perfectamente</li>
                </ul>
              </div>
              
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
      `;

    // Verificar que el HTML contenga los enlaces correctos
    console.log('🔍 DEBUG: Verificando HTML generado...');
    console.log('🔍 DEBUG: ¿Contiene deep link?', htmlContent.includes(deepLinkUrl));
    console.log('🔍 DEBUG: ¿Contiene web URL?', htmlContent.includes(webUrl));
    console.log('🔍 DEBUG: ¿Contiene href delixmi?', htmlContent.includes('href="delixmi://'));
    
    // Mostrar una muestra del HTML generado
    const buttonSection = htmlContent.match(/<a href="delixmi:.*?<\/a>/s);
    if (buttonSection) {
      console.log('🔍 DEBUG: Sección del botón encontrada:');
      console.log(buttonSection[0]);
    } else {
      console.error('❌ ERROR: No se encontró la sección del botón en el HTML');
    }
    
    // Verificar que no haya variables sin reemplazar
    if (htmlContent.includes('${')) {
      console.error('❌ ERROR: HTML contiene variables sin reemplazar:', htmlContent.match(/\$\{[^}]+\}/g));
    }

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com',
      to: email,
      subject: 'Verifica tu cuenta en Delixmi',
      html: htmlContent,
      text: `
        ¡Bienvenido a Delixmi!
        
        Hola ${name},
        
        Gracias por registrarte en Delixmi. Para completar tu registro y activar tu cuenta, puedes usar cualquiera de estas opciones:
        
        📱 DEEP LINK (para la app móvil):
        ${deepLinkUrl}
        
        🌐 ENLACE WEB (para navegador):
        ${webUrl}
        
        INSTRUCCIONES:
        - Haz clic en el enlace web de arriba
        - Si tienes la app instalada: Se abrirá automáticamente
        - Si no tienes la app: Continuarás en el navegador web
        - El enlace expirará en 1 hora por seguridad
        
        Una vez verificado, podrás:
        - Iniciar sesión en tu cuenta
        - Realizar pedidos de comida
        - Gestionar tu perfil
        - Disfrutar de todas nuestras funcionalidades
        
        Si no creaste una cuenta en Delixmi, puedes ignorar este correo.
        
        © 2024 Delixmi. Todos los derechos reservados.
      `
    };

    console.log('🔍 DEBUG: Enviando email...');
    console.log('🔍 DEBUG: mailOptions.from:', mailOptions.from);
    console.log('🔍 DEBUG: mailOptions.to:', mailOptions.to);
    console.log('🔍 DEBUG: mailOptions.subject:', mailOptions.subject);
    console.log('🔍 DEBUG: mailOptions.html longitud:', mailOptions.html.length);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de verificación enviado exitosamente:');
    console.log('📧 messageId:', info.messageId);
    console.log('📧 to:', email);
    console.log('📧 from:', process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com');
    console.log('📧 deepLinkUsed:', deepLinkUrl);
    console.log('📧 webUrlBackup:', webUrl);

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
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/api/auth/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com',
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
    console.log('🔍 DEBUG: Iniciando sendPasswordResetEmail');
    console.log('🔍 DEBUG: email recibido:', email);
    console.log('🔍 DEBUG: name recibido:', name);
    console.log('🔍 DEBUG: resetToken recibido:', resetToken);
    console.log('🔍 DEBUG: resetToken tipo:', typeof resetToken);
    console.log('🔍 DEBUG: resetToken longitud:', resetToken ? resetToken.length : 'undefined');
    
    const transporter = await createTransporter();
    
    // Generar deep link para la app móvil
    const deepLinkUrl = `delixmi://reset-password?token=${resetToken}`;
    
    // Generar enlace web de respaldo
    const webUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    // Log para debugging
    console.log('🔗 URLs generadas para reset password:');
    console.log('📱 Deep Link:', deepLinkUrl);
    console.log('🌐 Web URL:', webUrl);
    console.log('🔍 FRONTEND_URL configurado:', process.env.FRONTEND_URL || 'NO CONFIGURADO (usando localhost:3000)');
    
    // Verificar que las URLs se generaron correctamente
    if (!deepLinkUrl.includes('delixmi://')) {
      console.error('❌ ERROR: Deep link no se generó correctamente');
      throw new Error('Deep link no se generó correctamente');
    }
    
    if (!webUrl.includes('http')) {
      console.error('❌ ERROR: Web URL no se generó correctamente');
      throw new Error('Web URL no se generó correctamente');
    }
    
    // Generar el HTML del email
    const htmlContent = `
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
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="${webUrl}" 
                   class="button" 
                   style="background-color: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                  🔐 Restablecer contraseña
                </a>
              </div>
              
              <div style="background-color: #e8f5e8; border: 1px solid #4caf50; color: #2e7d32; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>📱 Para usuarios de la app:</strong> El botón detectará automáticamente si tienes la aplicación Delixmi instalada y la abrirá. Si no tienes la app, podrás continuar en el navegador web.
              </div>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong> Este enlace expirará en 15 minutos por seguridad. Si no puedes restablecer tu contraseña ahora, puedes solicitar un nuevo enlace.
              </div>
              
              <div class="security">
                <strong>🔒 Seguridad:</strong> Si no solicitaste este cambio de contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.
              </div>
              
              <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>🌐 Enlace web de respaldo:</strong></p>
                <p style="font-size: 14px; color: #666; margin-bottom: 10px;">
                  Si el botón no funciona o no tienes la app instalada, copia y pega este enlace en tu navegador:
                </p>
                <p style="word-break: break-all; background-color: #ffffff; padding: 10px; border-radius: 5px; font-family: monospace; border: 1px solid #ddd;">
                  ${webUrl}
                </p>
              </div>
              
              <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>💡 Instrucciones:</strong></p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li><strong>Con la app instalada:</strong> Haz clic en el botón rojo → Se abrirá la app automáticamente</li>
                  <li><strong>Sin la app:</strong> Haz clic en el botón rojo → Continuarás en el navegador web</li>
                  <li><strong>En móvil:</strong> El sistema detectará automáticamente si tienes la app instalada</li>
                  <li><strong>En cualquier dispositivo:</strong> El botón funcionará perfectamente</li>
                </ul>
              </div>
              
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
      `;

    // Verificar que el HTML contenga los enlaces correctos
    console.log('🔍 DEBUG: Verificando HTML generado...');
    console.log('🔍 DEBUG: ¿Contiene deep link?', htmlContent.includes(deepLinkUrl));
    console.log('🔍 DEBUG: ¿Contiene web URL?', htmlContent.includes(webUrl));
    console.log('🔍 DEBUG: ¿Contiene href delixmi?', htmlContent.includes('href="delixmi://'));
    
    // Mostrar una muestra del HTML generado
    const buttonSection = htmlContent.match(/<a href="delixmi:.*?<\/a>/s);
    if (buttonSection) {
      console.log('🔍 DEBUG: Sección del botón encontrada:');
      console.log(buttonSection[0]);
    } else {
      console.error('❌ ERROR: No se encontró la sección del botón en el HTML');
    }
    
    // Verificar que no haya variables sin reemplazar
    if (htmlContent.includes('${')) {
      console.error('❌ ERROR: HTML contiene variables sin reemplazar:', htmlContent.match(/\$\{[^}]+\}/g));
    }

    const mailOptions = {
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com',
      to: email,
      subject: 'Restablece tu contraseña - Delixmi',
      html: htmlContent,
      text: `
        Restablece tu contraseña - Delixmi
        
        Hola ${name},
        
        Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en Delixmi.
        
        Si solicitaste este cambio, puedes usar cualquiera de estas opciones:
        
        📱 DEEP LINK (para la app móvil):
        ${deepLinkUrl}
        
        🌐 ENLACE WEB (para navegador):
        ${webUrl}
        
        INSTRUCCIONES:
        - Haz clic en el enlace web de arriba
        - Si tienes la app instalada: Se abrirá automáticamente
        - Si no tienes la app: Continuarás en el navegador web
        - El enlace expirará en 15 minutos por seguridad
        
        Si no solicitaste este cambio de contraseña, puedes ignorar este correo. Tu cuenta permanecerá segura.
        
        © 2024 Delixmi. Todos los derechos reservados.
      `
    };

    console.log('🔍 DEBUG: Enviando email...');
    console.log('🔍 DEBUG: mailOptions.from:', mailOptions.from);
    console.log('🔍 DEBUG: mailOptions.to:', mailOptions.to);
    console.log('🔍 DEBUG: mailOptions.subject:', mailOptions.subject);
    console.log('🔍 DEBUG: mailOptions.html longitud:', mailOptions.html.length);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de restablecimiento de contraseña enviado exitosamente:');
    console.log('📧 messageId:', info.messageId);
    console.log('📧 to:', email);
    console.log('📧 from:', process.env.SENDGRID_FROM_EMAIL || 'noreply@delixmi.com');
    console.log('📧 deepLinkUsed:', deepLinkUrl);
    console.log('📧 webUrlBackup:', webUrl);

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