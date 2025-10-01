const twilio = require('twilio');

// Variables para almacenar la configuración de Twilio (inicialización perezosa)
let client = null;
let isInitialized = false;

/**
 * Inicializa el cliente de Twilio y valida las variables de entorno
 * Solo se ejecuta cuando se usa el servicio por primera vez
 */
const initializeTwilio = () => {
  if (isInitialized) {
    return client;
  }

  // Configuración de Twilio desde variables de entorno
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  // Validar que las variables de entorno estén configuradas
  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Variables de entorno de Twilio no configuradas. Se requieren: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER');
  }

  // Inicializar cliente de Twilio
  client = twilio(accountSid, authToken);
  isInitialized = true;
  
  return client;
};

/**
 * Envía un SMS usando Twilio
 * @param {string} to - Número de teléfono destino (formato internacional)
 * @param {string} body - Contenido del mensaje
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendSms = async (to, body) => {
  try {
    // Inicializar Twilio si no está inicializado
    const twilioClient = initializeTwilio();
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // Validar parámetros
    if (!to || !body) {
      throw new Error('Número de teléfono y mensaje son requeridos');
    }

    // Formatear número de teléfono si es necesario
    let formattedTo = to;
    if (!to.startsWith('+')) {
      // Si no tiene código de país, asumir México (+52)
      formattedTo = `+52${to.replace(/\D/g, '')}`;
    }

    console.log(`📱 Enviando SMS a ${formattedTo}: ${body}`);

    // Enviar SMS
    const message = await twilioClient.messages.create({
      body: body,
      from: phoneNumber,
      to: formattedTo
    });

    console.log(`✅ SMS enviado exitosamente. SID: ${message.sid}`);

    return {
      success: true,
      messageSid: message.sid,
      to: formattedTo,
      status: message.status,
      price: message.price,
      priceUnit: message.priceUnit
    };

  } catch (error) {
    console.error('❌ Error al enviar SMS:', error);
    
    // Manejar errores específicos de Twilio
    if (error.code) {
      switch (error.code) {
        case 21211:
          throw new Error('Número de teléfono inválido');
        case 21614:
          throw new Error('Número de teléfono no válido para SMS');
        case 21608:
          throw new Error('Número de teléfono no verificado (modo trial)');
        case 21408:
          throw new Error('Credenciales de Twilio inválidas');
        default:
          throw new Error(`Error de Twilio: ${error.message}`);
      }
    }

    throw new Error(`Error al enviar SMS: ${error.message}`);
  }
};

/**
 * Envía un código OTP de verificación por SMS
 * @param {string} phoneNumber - Número de teléfono del usuario
 * @param {string} otpCode - Código OTP de 6 dígitos
 * @param {string} userName - Nombre del usuario (opcional)
 * @returns {Promise<Object>} - Resultado del envío
 */
const sendOtpSms = async (phoneNumber, otpCode, userName = 'Usuario') => {
  const message = `Hola ${userName}! Tu código de verificación para Delixmi es: ${otpCode}. Este código expira en 10 minutos.`;
  
  return await sendSms(phoneNumber, message);
};

/**
 * Valida el formato de un número de teléfono
 * @param {string} phoneNumber - Número de teléfono a validar
 * @returns {boolean} - True si es válido
 */
const isValidPhoneNumber = (phoneNumber) => {
  // Regex para números mexicanos (10 dígitos) o internacionales (+52 seguido de 10 dígitos)
  const phoneRegex = /^(\+52)?[0-9]{10}$/;
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
};

/**
 * Verifica si Twilio está configurado sin inicializar el cliente
 * @returns {boolean} - True si las variables de entorno están configuradas
 */
const isTwilioConfigured = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
  
  return !!(accountSid && authToken && phoneNumber);
};

module.exports = {
  sendSms,
  sendOtpSms,
  isValidPhoneNumber,
  isTwilioConfigured
};
