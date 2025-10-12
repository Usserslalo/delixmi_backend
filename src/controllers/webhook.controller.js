const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { getIo } = require('../config/socket'); // Importar getIo

const prisma = new PrismaClient();
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const payment = new Payment(client);

/**
 * Función para mapear estados de Mercado Pago a estados internos de PaymentStatus
 * @param {string} mpStatus - Estado de Mercado Pago
 * @returns {string} - Estado interno correspondiente
 */
const mapMercadoPagoStatus = (mpStatus) => {
  const statusMap = {
    'pending': 'pending',
    'in_process': 'processing',
    'approved': 'completed',
    'authorized': 'completed',
    'in_mediation': 'processing',
    'rejected': 'failed',
    'cancelled': 'cancelled',
    'refunded': 'refunded',
    'charged_back': 'failed'
  };

  return statusMap[mpStatus] || 'pending';
};

const handleMercadoPagoWebhook = async (req, res) => {
  console.log('--- NUEVA NOTIFICACIÓN DE WEBHOOK RECIBIDA ---');
  console.log('HEADERS:', req.headers);
  console.log('BODY:', req.body);
  console.log('-------------------------------------------');

  try {
    res.status(200).send('OK'); // Responder inmediatamente

    const notification = req.body;
    if (notification.type !== 'payment' || !notification.data || !notification.data.id) {
      console.log(`⚠️ Webhook ignorado - tipo: ${notification.type}`);
      return;
    }

    const paymentId = notification.data.id;
    console.log(`🔍 Procesando pago ID: ${paymentId}`);

    const mpPayment = await payment.get({ id: paymentId });
    if (!mpPayment) {
      console.error(`❌ No se pudo obtener detalles del pago ${paymentId}`);
      return;
    }

    if (mpPayment.status === 'approved') {
      console.log(`✅ Pago ${paymentId} aprobado. Procesando orden...`);
      
      const order = await prisma.order.findFirst({
        where: { payment: { providerPaymentId: mpPayment.external_reference } },
        include: { payment: true }
      });

      if (!order) {
        console.error(`❌ No se encontró orden con external_reference: ${mpPayment.external_reference}`);
        return;
      }

      // Transacción atómica para actualizar tanto el pago como la orden
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Primero, actualizar el PAGO con el status
        // Mantener el external_reference original para búsquedas
        await tx.payment.update({
          where: { id: order.payment.id },
          data: {
            status: mapMercadoPagoStatus(mpPayment.status)
            // NO sobrescribir providerPaymentId - mantener external_reference original
          }
        });

        // Segundo, actualizar la ORDEN
        // Estado 'placed' = Pedido Realizado (pago aprobado, esperando confirmación del restaurante)
        // El restaurante cambiará el estado a 'confirmed' manualmente cuando acepte el pedido
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'completed',
            status: 'placed' // Pedido realizado, esperando confirmación del restaurante
          },
          include: {
             customer: true,
             address: true,
             branch: { include: { restaurant: true } },
             orderItems: { include: { product: true } },
             payment: true
          }
        });

        return updatedOrder;
      });

      console.log(`💳 Payment actualizado:`, {
        externalReference: mpPayment.external_reference,
        mpPaymentId: mpPayment.id,
        mpStatus: mpPayment.status,
        internalStatus: mapMercadoPagoStatus(mpPayment.status),
        providerPaymentId: order.payment.providerPaymentId
      });
      
      // Limpiar carrito del restaurante cuando el pago sea exitoso
      try {
        const cartDeleted = await prisma.cart.deleteMany({
          where: {
            userId: updatedOrder.customerId,
            restaurantId: updatedOrder.branch.restaurantId
          }
        });
        console.log(`🛒 Carrito del restaurante ${updatedOrder.branch.restaurantId} limpiado exitosamente (${cartDeleted.count} carritos eliminados)`);
      } catch (cartError) {
        console.error(`⚠️ Error limpiando carrito:`, cartError.message);
        // No fallar el proceso por error en limpieza del carrito
      }
      
      console.log(`🎉 Pago ${paymentId} procesado. Orden ${order.id} realizada (esperando confirmación del restaurante).`);

      // Emitir evento de Socket.io
      const io = getIo();
      const roomName = `branch_${updatedOrder.branchId}`;
      const formattedOrder = formatOrderForSocket(updatedOrder);
      io.to(roomName).emit('new_order', formattedOrder);
      console.log(`📡 Evento 'new_order' enviado a la sala '${roomName}'`);
    }

  } catch (error) {
    console.error('❌ Error procesando webhook de Mercado Pago:', error);
  }
};

/**
 * Función auxiliar para formatear un objeto order para Socket.io
 * Convierte todos los IDs BigInt a String para evitar errores de serialización
 * @param {Object} order - Objeto order con datos de la orden
 * @returns {Object} - Objeto order formateado con IDs como String
 */
const formatOrderForSocket = (order) => {
  if (!order) return null;

  const formattedOrder = {
    ...order,
    id: order.id ? order.id.toString() : null,
    customerId: order.customerId ? order.customerId.toString() : null,
    branchId: order.branchId ? order.branchId.toString() : null,
    addressId: order.addressId ? order.addressId.toString() : null,
    paymentId: order.paymentId ? order.paymentId.toString() : null
  };

  // Formatear orderItems si existen
  if (order.orderItems && Array.isArray(order.orderItems)) {
    formattedOrder.orderItems = order.orderItems.map(item => ({
      ...item,
      id: item.id ? item.id.toString() : null,
      orderId: item.orderId ? item.orderId.toString() : null,
      productId: item.productId ? item.productId.toString() : null,
      // Formatear el producto si existe
      product: item.product ? {
        ...item.product,
        id: item.product.id ? item.product.id.toString() : null,
        restaurantId: item.product.restaurantId ? item.product.restaurantId.toString() : null
      } : null
    }));
  }

  // Formatear customer si existe
  if (order.customer) {
    formattedOrder.customer = {
      ...order.customer,
      id: order.customer.id ? order.customer.id.toString() : null
    };
  }

  // Formatear address si existe
  if (order.address) {
    formattedOrder.address = {
      ...order.address,
      id: order.address.id ? order.address.id.toString() : null,
      customerId: order.address.customerId ? order.address.customerId.toString() : null
    };
  }

  // Formatear branch si existe
  if (order.branch) {
    formattedOrder.branch = {
      ...order.branch,
      id: order.branch.id ? order.branch.id.toString() : null,
      restaurantId: order.branch.restaurantId ? order.branch.restaurantId.toString() : null,
      // Formatear restaurant si existe
      restaurant: order.branch.restaurant ? {
        ...order.branch.restaurant,
        id: order.branch.restaurant.id ? order.branch.restaurant.id.toString() : null
      } : null
    };
  }

  // Formatear payment si existe
  if (order.payment) {
    formattedOrder.payment = {
      ...order.payment,
      id: order.payment.id ? order.payment.id.toString() : null,
      orderId: order.payment.orderId ? order.payment.orderId.toString() : null
    };
  }

  return formattedOrder;
};

module.exports = { handleMercadoPagoWebhook };