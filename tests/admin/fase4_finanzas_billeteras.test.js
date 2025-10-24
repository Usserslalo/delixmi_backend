const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuración para Render
const BASE_URL = 'https://delixmi-backend.onrender.com';
const ADMIN_CREDENTIALS = {
  email: 'admin@delixmi.com',
  password: 'admin123'
};

let accessToken;
let testOrderId;
let testRestaurantId;
let testDriverId;

describe('FASE 4: Finanzas y Billeteras - Tests', () => {
  beforeAll(async () => {
    try {
      // Autenticación del Super Admin
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send(ADMIN_CREDENTIALS);

      if (loginResponse.status !== 200) {
        throw new Error(`Error en autenticación: ${loginResponse.status} - ${JSON.stringify(loginResponse.body)}`);
      }

      accessToken = loginResponse.body.data.accessToken;
      console.log('✅ Autenticación exitosa - Token obtenido');

      // Obtener IDs de prueba del seed
      const order = await prisma.order.findFirst();
      if (order) {
        testOrderId = order.id;
        console.log(`✅ Orden de prueba encontrada: ID ${testOrderId}`);
      }

      const restaurant = await prisma.restaurant.findFirst();
      if (restaurant) {
        testRestaurantId = restaurant.id;
        console.log(`✅ Restaurante de prueba encontrado: ID ${testRestaurantId}`);
      }

      const driver = await prisma.user.findFirst({
        where: { role: 'driver' }
      });
      if (driver) {
        testDriverId = driver.id;
        console.log(`✅ Repartidor de prueba encontrado: ID ${testDriverId}`);
      }
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. PATCH /orders/:id/payment/status - Actualizar Estado de Pago de Orden', () => {
    test('Debe actualizar el estado de pago de una orden exitosamente', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/orders/${testOrderId}/payment/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ paymentStatus: 'completed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Estado de pago actualizado');
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.paymentStatus).toBe('completed');
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe fallar con estado de pago inválido', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/orders/${testOrderId}/payment/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ paymentStatus: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con orden inexistente', async () => {
      const response = await request(BASE_URL)
        .patch('/api/admin/orders/99999/payment/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ paymentStatus: 'completed' });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('2. POST /wallets/restaurants/payouts/process - Procesar Pagos a Restaurantes', () => {
    test('Debe procesar pagos a restaurantes exitosamente', async () => {
      const response = await request(BASE_URL)
        .post('/api/admin/wallets/restaurants/payouts/process')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Pagos a restaurantes procesados');
      expect(response.body.data.processedCount).toBeDefined();
      expect(typeof response.body.data.processedCount).toBe('number');
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.processedBy).toBeDefined();
    });
  });

  describe('3. POST /wallets/restaurants/:id/adjust - Ajustar Billetera de Restaurante', () => {
    test('Debe ajustar la billetera de un restaurante exitosamente (crédito)', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const adjustData = {
        amount: 150.75,
        description: 'Ajuste manual por promoción especial - Test'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/wallets/restaurants/${testRestaurantId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Billetera de restaurante ajustada');
      expect(response.body.data.wallet).toBeDefined();
      expect(response.body.data.wallet.balance).toBeDefined();
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.amount).toBe(150.75);
      expect(response.body.data.adjustedBy).toBeDefined();
    });

    test('Debe ajustar la billetera de un restaurante exitosamente (débito)', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const adjustData = {
        amount: -50.25,
        description: 'Ajuste manual por penalización - Test'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/wallets/restaurants/${testRestaurantId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction.amount).toBe(50.25); // Se almacena como valor absoluto
      expect(response.body.data.transaction.type).toContain('DEBIT');
    });

    test('Debe fallar con monto inválido', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const invalidData = {
        amount: 'invalid_amount',
        description: 'Test inválido'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/wallets/restaurants/${testRestaurantId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con descripción muy corta', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const invalidData = {
        amount: 100.0,
        description: 'X' // Muy corta
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/wallets/restaurants/${testRestaurantId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('4. POST /wallets/drivers/payouts/process - Procesar Pagos a Repartidores', () => {
    test('Debe procesar pagos a repartidores exitosamente', async () => {
      const response = await request(BASE_URL)
        .post('/api/admin/wallets/drivers/payouts/process')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Pagos a repartidores procesados');
      expect(response.body.data.processedCount).toBeDefined();
      expect(typeof response.body.data.processedCount).toBe('number');
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.processedBy).toBeDefined();
    });
  });

  describe('5. POST /wallets/drivers/:id/adjust - Ajustar Billetera de Repartidor', () => {
    test('Debe ajustar la billetera de un repartidor exitosamente (crédito)', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const adjustData = {
        amount: 75.50,
        description: 'Ajuste manual por bonificación especial - Test'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/wallets/drivers/${testDriverId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Billetera de repartidor ajustada');
      expect(response.body.data.wallet).toBeDefined();
      expect(response.body.data.wallet.balance).toBeDefined();
      expect(response.body.data.transaction).toBeDefined();
      expect(response.body.data.transaction.amount).toBe(75.50);
      expect(response.body.data.adjustedBy).toBeDefined();
    });

    test('Debe ajustar la billetera de un repartidor exitosamente (débito)', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const adjustData = {
        amount: -25.00,
        description: 'Penalización por entrega tardía - Test'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/wallets/drivers/${testDriverId}/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.transaction.amount).toBe(25.00); // Se almacena como valor absoluto
      expect(response.body.data.transaction.type).toContain('DEBIT');
    });

    test('Debe fallar con repartidor inexistente', async () => {
      const adjustData = {
        amount: 100.0,
        description: 'Test con repartidor inexistente'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/wallets/drivers/99999/adjust')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(adjustData);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('6. GET /wallets/restaurants/transactions - Obtener Transacciones de Billetera de Restaurantes', () => {
    test('Debe obtener transacciones de billetera de restaurantes exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/wallets/restaurants/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Transacciones de billetera de restaurantes obtenidas');
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
      expect(response.body.data.filters).toBeDefined();
    });

    test('Debe filtrar transacciones por restaurante', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/admin/wallets/restaurants/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ restaurantId: testRestaurantId, page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.restaurantId).toBe(testRestaurantId);
    });

    test('Debe filtrar transacciones por estado de pago', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/wallets/restaurants/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ isPaidOut: true, page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.isPaidOut).toBe(true);
    });

    test('Debe filtrar transacciones por tipo', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/wallets/restaurants/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'ADJUSTMENT_CREDIT', page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.type).toBe('ADJUSTMENT_CREDIT');
    });
  });

  describe('7. GET /wallets/drivers/transactions - Obtener Transacciones de Billetera de Repartidores', () => {
    test('Debe obtener transacciones de billetera de repartidores exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/wallets/drivers/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Transacciones de billetera de repartidores obtenidas');
      expect(response.body.data.transactions).toBeDefined();
      expect(Array.isArray(response.body.data.transactions)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
      expect(response.body.data.filters).toBeDefined();
    });

    test('Debe filtrar transacciones por repartidor', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/admin/wallets/drivers/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ driverId: testDriverId, page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.driverId).toBe(testDriverId);
    });

    test('Debe filtrar transacciones por tipo de repartidor', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/wallets/drivers/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ type: 'DRIVER_DELIVERY_FEE_CREDIT', page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.type).toBe('DRIVER_DELIVERY_FEE_CREDIT');
    });

    test('Debe manejar paginación correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/wallets/drivers/transactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, pageSize: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.pageSize).toBe(5);
    });
  });
});
