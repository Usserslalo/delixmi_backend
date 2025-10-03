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
      io.to(roomName).emit('new_order', updatedOrder);
      console.log(`📡 Evento 'new_order' enviado a la sala '${roomName}'`);
    }

  } catch (error) {
    console.error('❌ Error procesando webhook de Mercado Pago:', error);
  }
};

module.exports = { handleMercadoPagoWebhook };