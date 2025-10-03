const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { getIo } = require('../config/socket'); // Importar getIo

const prisma = new PrismaClient();
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN });
const payment = new Payment(client);

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

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'completed',
          status: 'confirmed'
        },
        include: {
           customer: true,
           address: true,
           branch: { include: { restaurant: true } },
           orderItems: { include: { product: true } }
        }
      });
      
      console.log(`🎉 Pago ${paymentId} procesado. Orden ${order.id} confirmada.`);

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