const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Payment } = require('mercadopago');

const prisma = new PrismaClient();

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const payment = new Payment(client);

/**
 * Maneja las notificaciones webhook de Mercado Pago
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const handleMercadoPagoWebhook = async (req, res) => {
  console.log('--- NUEVA NOTIFICACIÓN DE WEBHOOK RECIBIDA ---');
  console.log('HEADERS:', req.headers);
  console.log('BODY:', req.body);
  console.log('-------------------------------------------');

  try {

    // 1. CRÍTICO: Responder inmediatamente a Mercado Pago con 200 OK
    // Esto evita que Mercado Pago reintente la notificación
    res.status(200).json({ 
      status: 'received',
      message: 'Webhook procesado exitosamente'
    });

    // 2. Extraer información de la notificación
    const notification = req.body;

    // Solo procesar notificaciones de pagos
    if (notification.type !== 'payment') {
      console.log(`⚠️ Webhook ignorado - type: ${notification.type}`);
      return;
    }

    const paymentId = notification.data.id;
    console.log(`🔍 Procesando pago ID: ${paymentId}`);

    // 3. Obtener detalles completos del pago desde Mercado Pago
    // Esto es crucial para la seguridad - nunca confiar solo en la notificación
    const mpPayment = await payment.get({ id: paymentId });

    if (!mpPayment) {
      console.error(`❌ No se pudo obtener detalles del pago ${paymentId} desde Mercado Pago`);
      return;
    }

    console.log(`📊 Detalles del pago obtenidos:`, {
      id: mpPayment.id,
      status: mpPayment.status,
      external_reference: mpPayment.external_reference,
      amount: mpPayment.transaction_amount
    });

    // 4. Verificar si el pago fue aprobado
    if (mpPayment.status !== 'approved') {
      console.log(`⚠️ Pago ${paymentId} no aprobado. Estado: ${mpPayment.status}`);
      
      // Actualizar estado del pago en nuestra BD (aunque no esté aprobado)
      await updatePaymentStatus(mpPayment.external_reference, mpPayment.status);
      return;
    }

    console.log(`✅ Pago ${paymentId} aprobado. Procesando orden...`);

    // 5. Buscar el pedido en nuestra base de datos usando external_reference
    const order = await prisma.order.findFirst({
      where: {
        payment: {
          providerPaymentId: mpPayment.external_reference
        }
      },
      include: {
        payment: true,
        customer: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true
          }
        },
        orderItems: {
          include: {
            product: {
              include: {
                restaurant: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      console.error(`❌ No se encontró orden con external_reference: ${mpPayment.external_reference}`);
      return;
    }

    console.log(`📦 Orden encontrada: ID ${order.id}, Cliente: ${order.customer.name} ${order.customer.lastname}`);

    // 6. Actualizar el estado del pago y la orden
    await prisma.$transaction(async (tx) => {
      // Actualizar el pago
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'completed',
          providerPaymentId: mpPayment.id.toString(),
          updatedAt: new Date()
        }
      });

      // Actualizar la orden
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'completed',
          status: 'confirmed',
          updatedAt: new Date()
        }
      });

      console.log(`🎉 Pago ${paymentId} procesado exitosamente. Orden ${order.id} confirmada.`);
    });

    // 7. Log del evento exitoso
    console.log(`✅ PROCESAMIENTO COMPLETADO:`, {
      paymentId: paymentId,
      orderId: order.id,
      customer: `${order.customer.name} ${order.customer.lastname}`,
      amount: mpPayment.transaction_amount,
      currency: mpPayment.currency_id,
      externalReference: mpPayment.external_reference,
      timestamp: new Date().toISOString()
    });

    // TODO: Aquí podrías agregar notificaciones adicionales como:
    // - Enviar email de confirmación al cliente
    // - Notificar al restaurante sobre el nuevo pedido
    // - Enviar notificación push
    // - Actualizar inventario de productos

  } catch (error) {
    console.error('❌ Error procesando webhook de Mercado Pago:', error);
    
    // Aunque hay un error, ya enviamos la respuesta 200, así que no podemos
    // cambiar el status code. Solo logueamos el error.
    
    // En un entorno de producción, aquí podrías:
    // - Enviar alertas al equipo de desarrollo
    // - Guardar el error en una tabla de logs
    // - Reintentar el procesamiento de forma asíncrona
  }
};

/**
 * Actualiza el estado de un pago en la base de datos
 * @param {string} externalReference - Referencia externa del pago
 * @param {string} status - Nuevo estado del pago
 */
const updatePaymentStatus = async (externalReference, status) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: externalReference
      },
      include: {
        order: true
      }
    });

    if (payment) {
      await prisma.$transaction(async (tx) => {
        // Actualizar estado del pago
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: mapMercadoPagoStatus(status),
            updatedAt: new Date()
          }
        });

        // Actualizar estado de la orden según el estado del pago
        let orderStatus = 'pending';
        if (status === 'approved') {
          orderStatus = 'confirmed';
        } else if (status === 'rejected' || status === 'cancelled') {
          orderStatus = 'cancelled';
        }

        await tx.order.update({
          where: { id: payment.order.id },
          data: {
            paymentStatus: mapMercadoPagoStatus(status),
            status: orderStatus,
            updatedAt: new Date()
          }
        });

        console.log(`📝 Estado actualizado para external_reference ${externalReference}:`, {
          paymentStatus: mapMercadoPagoStatus(status),
          orderStatus: orderStatus
        });
      });
    }
  } catch (error) {
    console.error(`❌ Error actualizando estado del pago ${externalReference}:`, error);
  }
};

/**
 * Mapea los estados de Mercado Pago a nuestros estados internos
 * @param {string} mpStatus - Estado de Mercado Pago
 * @returns {string} Estado interno
 */
const mapMercadoPagoStatus = (mpStatus) => {
  const statusMap = {
    'pending': 'pending',
    'approved': 'completed',
    'authorized': 'processing',
    'in_process': 'processing',
    'in_mediation': 'processing',
    'rejected': 'failed',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'charged_back': 'refunded'
  };

  return statusMap[mpStatus] || 'pending';
};

module.exports = {
  handleMercadoPagoWebhook
};
