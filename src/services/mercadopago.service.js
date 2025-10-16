const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logger');

class MercadoPagoService {
  constructor() {
    // Configuración de Mercado Pago
    this.client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: { timeout: 5000 }
    });
    this.preference = new Preference(this.client);
  }

  /**
   * Crea una preferencia de pago en Mercado Pago
   * @param {Array} items - Items del pedido para Mercado Pago
   * @param {Object} user - Datos del usuario
   * @param {Object} pricingDetails - Detalles de precios
   * @param {string} externalReference - Referencia externa única
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Promise<Object>} Respuesta de Mercado Pago
   */
  async createPreference(items, user, pricingDetails, externalReference, requestId) {
    try {
      logger.info('Creando preferencia de pago en Mercado Pago', {
        requestId,
        meta: {
          itemsCount: items.length,
          externalReference,
          total: pricingDetails.total
        }
      });

      const { subtotal, deliveryFee, serviceFee, total } = pricingDetails;

      // Construir items para Mercado Pago
      const mpItems = this.buildMercadoPagoItems(items, deliveryFee, serviceFee);

      // Crear objeto preference para Mercado Pago
      const preferenceData = {
        items: mpItems,
        payer: {
          name: user.name,
          surname: user.lastname,
          email: user.email
        },
        back_urls: {
          success: "delixmi://payment/success",
          failure: "delixmi://payment/failure", 
          pending: "delixmi://payment/pending"
        },
        auto_return: "approved",
        notification_url: `${process.env.FRONTEND_URL}/api/webhooks/mercadopago`,
        external_reference: externalReference,
        payment_methods: {
          excluded_payment_methods: [],
          excluded_payment_types: [],
          installments: 12
        },
        additional_info: `Pedido de Delixmi - ${items.length} productos`,
        metadata: {
          user_id: user.id,
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          service_fee: serviceFee,
          total: total,
          product_count: items.length
        }
      };

      logger.info('Datos de preferencia preparados', {
        requestId,
        meta: {
          externalReference,
          totalItems: mpItems.length,
          totalCalculated: mpItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
        }
      });

      // Crear preferencia en Mercado Pago
      const mpResponse = await this.preference.create({ body: preferenceData });

      logger.info('Preferencia de Mercado Pago creada exitosamente', {
        requestId,
        meta: {
          preferenceId: mpResponse.id,
          externalReference,
          initPoint: mpResponse.init_point
        }
      });

      return mpResponse;

    } catch (error) {
      logger.error('Error creando preferencia de Mercado Pago', {
        requestId,
        meta: {
          error: error.message,
          stack: error.stack,
          externalReference,
          itemsCount: items.length
        }
      });
      throw error;
    }
  }

  /**
   * Construye los items para Mercado Pago incluyendo productos, envío y servicio
   * @param {Array} items - Items del pedido
   * @param {number} deliveryFee - Tarifa de envío
   * @param {number} serviceFee - Cuota de servicio
   * @returns {Array} Items formateados para Mercado Pago
   */
  buildMercadoPagoItems(items, deliveryFee, serviceFee) {
    const mpItems = [];

    // Agregar productos
    for (const item of items) {
      mpItems.push({
        title: item.title,
        description: item.description || `Producto de ${item.restaurantName}`,
        quantity: item.quantity,
        currency_id: 'MXN',
        unit_price: item.unit_price
      });
    }

    // Agregar tarifa de envío si es mayor a 0
    if (deliveryFee > 0) {
      mpItems.push({
        title: 'Costo de envío',
        description: 'Tarifa de entrega a domicilio',
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(deliveryFee)
      });
    }

    // Agregar cuota de servicio si es mayor a 0
    if (serviceFee > 0) {
      mpItems.push({
        title: 'Cuota de servicio',
        description: 'Tarifa de servicio de la plataforma',
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(serviceFee)
      });
    }

    return mpItems;
  }

  /**
   * Genera una referencia externa única para Mercado Pago
   * @returns {string} Referencia externa única
   */
  generateExternalReference() {
    return `delixmi_${uuidv4()}`;
  }

  /**
   * Valida la respuesta de Mercado Pago
   * @param {Object} response - Respuesta de Mercado Pago
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {boolean} True si la respuesta es válida
   */
  validateMercadoPagoResponse(response, requestId) {
    try {
      if (!response || !response.id || !response.init_point) {
        logger.error('Respuesta de Mercado Pago inválida', {
          requestId,
          meta: { response }
        });
        return false;
      }

      logger.debug('Respuesta de Mercado Pago validada exitosamente', {
        requestId,
        meta: {
          preferenceId: response.id,
          hasInitPoint: !!response.init_point
        }
      });

      return true;

    } catch (error) {
      logger.error('Error validando respuesta de Mercado Pago', {
        requestId,
        meta: {
          error: error.message,
          response
        }
      });
      return false;
    }
  }

  /**
   * Maneja errores específicos de Mercado Pago
   * @param {Error} error - Error de Mercado Pago
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Object} Error formateado para el cliente
   */
  handleMercadoPagoError(error, requestId) {
    logger.error('Error de Mercado Pago', {
      requestId,
      meta: {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      }
    });

    if (error.response) {
      return {
        status: 400,
        message: 'Error en Mercado Pago',
        details: error.response.data,
        code: 'MERCADOPAGO_ERROR'
      };
    }

    return {
      status: 500,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    };
  }
}

// Exportar una instancia singleton del servicio
module.exports = new MercadoPagoService();
