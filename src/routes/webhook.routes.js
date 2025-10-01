const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

/**
 * POST /api/webhooks/mercadopago
 * Webhook para recibir notificaciones de Mercado Pago
 * Ruta pública - sin autenticación (llamada por Mercado Pago)
 */
router.post('/mercadopago', webhookController.handleMercadoPagoWebhook);

module.exports = router;
