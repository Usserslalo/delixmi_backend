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
let testComplaintId;
let testUserId;
let testRestaurantId;

describe('FASE 6: Soporte, Auditoría y Comms - Tests', () => {
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
      const user = await prisma.user.findFirst({
        where: { role: 'customer' }
      });
      if (user) {
        testUserId = user.id;
        console.log(`✅ Usuario de prueba encontrado: ID ${testUserId}`);
      }

      const restaurant = await prisma.restaurant.findFirst();
      if (restaurant) {
        testRestaurantId = restaurant.id;
        console.log(`✅ Restaurante de prueba encontrado: ID ${testRestaurantId}`);
      }

      const complaint = await prisma.complaint.findFirst();
      if (complaint) {
        testComplaintId = complaint.id;
        console.log(`✅ Queja de prueba encontrada: ID ${testComplaintId}`);
      }
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. PATCH /complaints/:id/status - Actualizar Estado de Queja', () => {
    test('Debe actualizar el estado de una queja exitosamente', async () => {
      if (!testComplaintId) {
        console.log('⚠️ No hay queja disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/complaints/${testComplaintId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'resolved' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Estado de queja actualizado');
      expect(response.body.data.complaint).toBeDefined();
      expect(response.body.data.complaint.status).toBe('resolved');
      expect(response.body.data.complaint.user).toBeDefined();
      expect(response.body.data.complaint.restaurant).toBeDefined();
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe actualizar el estado a cerrado', async () => {
      if (!testComplaintId) {
        console.log('⚠️ No hay queja disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/complaints/${testComplaintId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'closed' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.complaint.status).toBe('closed');
    });

    test('Debe fallar con estado inválido', async () => {
      if (!testComplaintId) {
        console.log('⚠️ No hay queja disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/complaints/${testComplaintId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid_status' });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con queja inexistente', async () => {
      const response = await request(BASE_URL)
        .patch('/api/admin/complaints/99999/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'resolved' });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('2. POST /messages/send - Enviar Mensaje', () => {
    test('Debe enviar un mensaje a un usuario específico exitosamente', async () => {
      if (!testUserId || !testRestaurantId) {
        console.log('⚠️ No hay usuario o restaurante disponible para testing');
        return;
      }

      const messageData = {
        recipientId: testUserId,
        restaurantId: testRestaurantId,
        subject: 'Mensaje de prueba del Super Admin',
        body: 'Este es un mensaje de prueba enviado desde el sistema de administración para verificar la funcionalidad.',
        isGlobal: false
      };

      const response = await request(BASE_URL)
        .post('/api/admin/messages/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Mensaje enviado');
      expect(response.body.data.message).toBeDefined();
      expect(response.body.data.message.subject).toBe('Mensaje de prueba del Super Admin');
      expect(response.body.data.message.recipientId).toBe(testUserId);
      expect(response.body.data.message.restaurantId).toBe(testRestaurantId);
      expect(response.body.data.message.isGlobal).toBe(false);
      expect(response.body.data.sentBy).toBeDefined();
    });

    test('Debe enviar un mensaje global exitosamente', async () => {
      const messageData = {
        subject: 'Mensaje Global de Prueba',
        body: 'Este es un mensaje global de prueba enviado a todos los usuarios del sistema.',
        isGlobal: true
      };

      const response = await request(BASE_URL)
        .post('/api/admin/messages/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.message.isGlobal).toBe(true);
      expect(response.body.data.message.recipientId).toBeNull();
      expect(response.body.data.message.restaurantId).toBeNull();
    });

    test('Debe fallar con asunto muy corto', async () => {
      const invalidData = {
        subject: 'X', // Muy corto
        body: 'Mensaje de prueba',
        isGlobal: true
      };

      const response = await request(BASE_URL)
        .post('/api/admin/messages/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con mensaje muy corto', async () => {
      const invalidData = {
        subject: 'Mensaje de prueba',
        body: 'X', // Muy corto
        isGlobal: true
      };

      const response = await request(BASE_URL)
        .post('/api/admin/messages/send')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('3. POST /notifications/broadcast - Crear Notificación Masiva', () => {
    test('Debe crear una notificación masiva exitosamente', async () => {
      if (!testUserId || !testRestaurantId) {
        console.log('⚠️ No hay usuario o restaurante disponible para testing');
        return;
      }

      const notificationData = {
        title: 'Notificación de Prueba del Super Admin',
        message: 'Esta es una notificación masiva de prueba enviada desde el sistema de administración.',
        type: 'SYSTEM_ALERT',
        userIds: [testUserId],
        restaurantIds: [testRestaurantId]
      };

      const response = await request(BASE_URL)
        .post('/api/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(notificationData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Notificación masiva enviada');
      expect(response.body.data.sentCount).toBeDefined();
      expect(typeof response.body.data.sentCount).toBe('number');
      expect(response.body.data.notifications).toBeDefined();
      expect(Array.isArray(response.body.data.notifications)).toBe(true);
      expect(response.body.data.sentBy).toBeDefined();
    });

    test('Debe crear notificación masiva sin IDs específicos', async () => {
      const notificationData = {
        title: 'Notificación Global de Prueba',
        message: 'Esta es una notificación global de prueba enviada a todos los usuarios activos.',
        type: 'SYSTEM_ALERT'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(notificationData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.sentCount).toBeGreaterThanOrEqual(0);
    });

    test('Debe fallar con título muy corto', async () => {
      const invalidData = {
        title: 'X', // Muy corto
        message: 'Mensaje de prueba',
        type: 'SYSTEM_ALERT'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });

    test('Debe fallar con tipo inválido', async () => {
      const invalidData = {
        title: 'Notificación de Prueba',
        message: 'Mensaje de prueba',
        type: 'INVALID_TYPE'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/notifications/broadcast')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('4. GET /audit-logs - Obtener Logs de Auditoría', () => {
    test('Debe obtener logs de auditoría exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Logs de auditoría obtenidos');
      expect(response.body.data.logs).toBeDefined();
      expect(Array.isArray(response.body.data.logs)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
      expect(response.body.data.filters).toBeDefined();
    });

    test('Debe filtrar logs por entidad', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ entity: 'USER', page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.entity).toBe('USER');
    });

    test('Debe filtrar logs por usuario', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ userId: 1, page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.userId).toBe(1);
    });

    test('Debe incluir información del usuario en cada log', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      
      if (response.body.data.logs.length > 0) {
        const log = response.body.data.logs[0];
        expect(log.user).toBeDefined();
        expect(log.user.id).toBeDefined();
        expect(log.user.name).toBeDefined();
        expect(log.user.lastname).toBeDefined();
        expect(log.user.email).toBeDefined();
        expect(log.action).toBeDefined();
        expect(log.entity).toBeDefined();
        expect(log.details).toBeDefined();
      }
    });
  });

  describe('5. GET /complaints - Obtener Quejas', () => {
    test('Debe obtener quejas exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Quejas obtenidas');
      expect(response.body.data.complaints).toBeDefined();
      expect(Array.isArray(response.body.data.complaints)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.filters).toBeDefined();
    });

    test('Debe filtrar quejas por estado', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ status: 'pending', page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.status).toBe('pending');
    });

    test('Debe incluir información completa de cada queja', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      
      if (response.body.data.complaints.length > 0) {
        const complaint = response.body.data.complaints[0];
        expect(complaint.user).toBeDefined();
        expect(complaint.user.id).toBeDefined();
        expect(complaint.user.name).toBeDefined();
        expect(complaint.user.lastname).toBeDefined();
        expect(complaint.user.email).toBeDefined();
        expect(complaint.restaurant).toBeDefined();
        expect(complaint.subject).toBeDefined();
        expect(complaint.description).toBeDefined();
        expect(complaint.status).toBeDefined();
        expect(complaint.priority).toBeDefined();
      }
    });

    test('Debe manejar paginación correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/complaints')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, pageSize: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.pageSize).toBe(5);
    });
  });

  describe('6. GET /ratings/reported - Obtener Calificaciones Reportadas', () => {
    test('Debe obtener calificaciones reportadas exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/ratings/reported')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Calificaciones reportadas obtenidas');
      expect(response.body.data.ratings).toBeDefined();
      expect(Array.isArray(response.body.data.ratings)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('Debe incluir información completa de cada calificación', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/ratings/reported')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      
      if (response.body.data.ratings.length > 0) {
        const rating = response.body.data.ratings[0];
        expect(rating.order).toBeDefined();
        expect(rating.order.id).toBeDefined();
        expect(rating.order.total).toBeDefined();
        expect(rating.order.status).toBeDefined();
        expect(rating.restaurant).toBeDefined();
        expect(rating.restaurant.id).toBeDefined();
        expect(rating.restaurant.name).toBeDefined();
        expect(rating.customer).toBeDefined();
        expect(rating.customer.id).toBeDefined();
        expect(rating.customer.name).toBeDefined();
        expect(rating.customer.lastname).toBeDefined();
        expect(rating.customer.email).toBeDefined();
        expect(rating.driver).toBeDefined();
        expect(rating.driver.id).toBeDefined();
        expect(rating.driver.name).toBeDefined();
        expect(rating.driver.lastname).toBeDefined();
        expect(rating.rating).toBeDefined();
        expect(rating.comment).toBeDefined();
        expect(rating.isReported).toBe(true);
      }
    });

    test('Debe manejar paginación correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/ratings/reported')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, pageSize: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.pageSize).toBe(5);
    });
  });
});
