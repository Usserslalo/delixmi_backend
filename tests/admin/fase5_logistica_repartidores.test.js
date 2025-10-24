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
let testDriverId;
let testOrderId;

describe('FASE 5: Logística y Repartidores - Tests', () => {
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
      const driver = await prisma.user.findFirst({
        where: { role: 'driver' }
      });
      if (driver) {
        testDriverId = driver.id;
        console.log(`✅ Repartidor de prueba encontrado: ID ${testDriverId}`);
      }

      const order = await prisma.order.findFirst();
      if (order) {
        testOrderId = order.id;
        console.log(`✅ Orden de prueba encontrada: ID ${testOrderId}`);
      }
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. PATCH /drivers/:id/kyc - Actualizar KYC de Repartidor', () => {
    test('Debe actualizar el KYC de un repartidor exitosamente', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const kycData = {
        kycStatus: 'approved',
        rfc: 'GARC123456ABC',
        domicilioFiscal: 'Calle Principal 123, Colonia Centro, CP 12345 - Test',
        opcionPagoDefinitivo: true
      };

      const response = await request(BASE_URL)
        .patch(`/api/admin/drivers/${testDriverId}/kyc`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(kycData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('KYC del repartidor actualizado');
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.kycStatus).toBe('approved');
      expect(response.body.data.profile.rfc).toBe('GARC123456ABC');
      expect(response.body.data.profile.domicilioFiscal).toContain('Test');
      expect(response.body.data.profile.opcionPagoDefinitivo).toBe(true);
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe actualizar solo el estado de KYC', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const kycData = {
        kycStatus: 'under_review'
      };

      const response = await request(BASE_URL)
        .patch(`/api/admin/drivers/${testDriverId}/kyc`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(kycData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.profile.kycStatus).toBe('under_review');
    });

    test('Debe fallar con RFC inválido', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const invalidData = {
        kycStatus: 'approved',
        rfc: 'RFC_INVALIDO' // RFC inválido
      };

      const response = await request(BASE_URL)
        .patch(`/api/admin/drivers/${testDriverId}/kyc`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con repartidor inexistente', async () => {
      const kycData = {
        kycStatus: 'approved'
      };

      const response = await request(BASE_URL)
        .patch('/api/admin/drivers/99999/kyc')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(kycData);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('2. PATCH /drivers/:id/block - Bloquear/Desbloquear Repartidor', () => {
    test('Debe bloquear un repartidor exitosamente', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/drivers/${testDriverId}/block`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isBlocked: true });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Repartidor bloqueado');
      expect(response.body.data.profile).toBeDefined();
      expect(response.body.data.profile.isBlocked).toBe(true);
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe desbloquear un repartidor exitosamente', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/drivers/${testDriverId}/block`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isBlocked: false });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Repartidor desbloqueado');
      expect(response.body.data.profile.isBlocked).toBe(false);
    });

    test('Debe fallar con datos inválidos', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/drivers/${testDriverId}/block`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isBlocked: 'invalid_boolean' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('3. POST /orders/:orderId/driver/:driverId - Forzar Asignación de Repartidor', () => {
    test('Debe asignar un repartidor a una orden exitosamente', async () => {
      if (!testOrderId || !testDriverId) {
        console.log('⚠️ No hay orden o repartidor disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .post(`/api/admin/orders/${testOrderId}/driver/${testDriverId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Repartidor asignado forzosamente');
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.deliveryDriverId).toBe(testDriverId);
      expect(response.body.data.assignedBy).toBeDefined();
    });

    test('Debe fallar con orden inexistente', async () => {
      if (!testDriverId) {
        console.log('⚠️ No hay repartidor disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .post(`/api/admin/orders/99999/driver/${testDriverId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con repartidor inexistente', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .post(`/api/admin/orders/${testOrderId}/driver/99999`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('4. GET /drivers/kyc/pending - Obtener Repartidores con KYC Pendiente', () => {
    test('Debe obtener repartidores con KYC pendiente exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/drivers/kyc/pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Repartidores con KYC pendiente obtenidos');
      expect(response.body.data.drivers).toBeDefined();
      expect(Array.isArray(response.body.data.drivers)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
    });

    test('Debe manejar paginación correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/drivers/kyc/pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, pageSize: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.pageSize).toBe(5);
    });

    test('Debe incluir información del usuario en cada repartidor', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/drivers/kyc/pending')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      
      if (response.body.data.drivers.length > 0) {
        const driver = response.body.data.drivers[0];
        expect(driver.user).toBeDefined();
        expect(driver.user.id).toBeDefined();
        expect(driver.user.name).toBeDefined();
        expect(driver.user.lastname).toBeDefined();
        expect(driver.user.email).toBeDefined();
      }
    });
  });

  describe('5. GET /orders/:orderId/route-logs - Obtener Logs de Ruta de Orden', () => {
    test('Debe obtener logs de ruta de una orden exitosamente', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/admin/orders/${testOrderId}/route-logs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Logs de ruta obtenidos');
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.id).toBe(testOrderId);
      expect(response.body.data.routeLogs).toBeDefined();
      expect(Array.isArray(response.body.data.routeLogs)).toBe(true);
    });

    test('Debe incluir información del repartidor en cada log', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/admin/orders/${testOrderId}/route-logs`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.data.routeLogs.length > 0) {
        const log = response.body.data.routeLogs[0];
        expect(log.driver).toBeDefined();
        expect(log.driver.id).toBeDefined();
        expect(log.driver.name).toBeDefined();
        expect(log.driver.lastname).toBeDefined();
        expect(log.latitude).toBeDefined();
        expect(log.longitude).toBeDefined();
        expect(log.timestamp).toBeDefined();
      }
    });

    test('Debe fallar con orden inexistente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/orders/99999/route-logs')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('6. GET /orders/:orderId/assignments - Obtener Asignaciones de Repartidor para Orden', () => {
    test('Debe obtener asignaciones de repartidor para una orden exitosamente', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/admin/orders/${testOrderId}/assignments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Asignaciones de repartidor obtenidas');
      expect(response.body.data.order).toBeDefined();
      expect(response.body.data.order.id).toBe(testOrderId);
      expect(response.body.data.assignments).toBeDefined();
      expect(Array.isArray(response.body.data.assignments)).toBe(true);
    });

    test('Debe incluir información detallada de cada asignación', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/admin/orders/${testOrderId}/assignments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      
      if (response.body.data.assignments.length > 0) {
        const assignment = response.body.data.assignments[0];
        expect(assignment.driver).toBeDefined();
        expect(assignment.driver.id).toBeDefined();
        expect(assignment.driver.name).toBeDefined();
        expect(assignment.driver.lastname).toBeDefined();
        expect(assignment.driver.phone).toBeDefined();
        expect(assignment.status).toBeDefined();
        expect(assignment.assignedAt).toBeDefined();
        expect(assignment.responseTimeSeconds).toBeDefined();
        expect(assignment.isAutoAssigned).toBeDefined();
      }
    });

    test('Debe incluir información del orden actual', async () => {
      if (!testOrderId) {
        console.log('⚠️ No hay orden disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/admin/orders/${testOrderId}/assignments`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.order.status).toBeDefined();
      expect(response.body.data.order.currentDriverId).toBeDefined();
    });

    test('Debe fallar con orden inexistente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/orders/99999/assignments')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });
});
