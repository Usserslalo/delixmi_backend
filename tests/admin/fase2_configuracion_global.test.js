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
let testServiceAreaId;

describe('FASE 2: Configuración Global y Geografía - Tests', () => {
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
    } catch (error) {
      console.error('❌ Error en autenticación:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // Limpieza: Eliminar área de servicio de prueba si existe
    if (testServiceAreaId) {
      try {
        await prisma.serviceArea.delete({
          where: { id: testServiceAreaId }
        });
        console.log('✅ Área de servicio de prueba eliminada');
      } catch (error) {
        console.log('⚠️ No se pudo eliminar el área de servicio de prueba:', error.message);
      }
    }
    
    await prisma.$disconnect();
  });

  describe('1. PATCH /settings/global - Actualizar Configuración Global', () => {
    test('Debe actualizar la configuración global exitosamente', async () => {
      const updateData = {
        defaultDeliveryRadius: 5.0,
        globalCommissionRate: 15.5,
        baseDeliveryFee: 25.0,
        systemTerms: 'Términos y condiciones actualizados para testing',
        systemPrivacyPolicy: 'Política de privacidad actualizada para testing',
        minAppVersionCustomer: '1.2.0',
        minAppVersionDriver: '1.1.5',
        minAppVersionRestaurant: '1.0.8'
      };

      const response = await request(BASE_URL)
        .patch('/api/admin/settings/global')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Configuración global actualizada');
      expect(response.body.data.config).toBeDefined();
      expect(response.body.data.config.defaultDeliveryRadius).toBe(5.0);
      expect(response.body.data.config.globalCommissionRate).toBe(15.5);
      expect(response.body.data.config.baseDeliveryFee).toBe(25.0);
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe fallar con datos inválidos (tasa de comisión fuera de rango)', async () => {
      const invalidData = {
        globalCommissionRate: 150.0 // Fuera del rango 0-100
      };

      const response = await request(BASE_URL)
        .patch('/api/admin/settings/global')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('2. GET /settings/global - Obtener Configuración Global', () => {
    test('Debe obtener la configuración global exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/settings/global')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Configuración global obtenida');
      expect(response.body.data.config).toBeDefined();
      expect(response.body.data.config.id).toBeDefined();
      expect(response.body.data.config.defaultDeliveryRadius).toBeDefined();
      expect(response.body.data.config.globalCommissionRate).toBeDefined();
      expect(response.body.data.config.baseDeliveryFee).toBeDefined();
    });
  });

  describe('3. POST /service-areas - Crear Área de Servicio', () => {
    test('Debe crear un área de servicio exitosamente (tipo CITY)', async () => {
      const serviceAreaData = {
        name: 'Zona Centro Test',
        description: 'Área de servicio del centro de la ciudad para testing',
        type: 'CITY',
        centerLatitude: 19.4326,
        centerLongitude: -99.1332,
        radiusKm: 5.0
      };

      const response = await request(BASE_URL)
        .post('/api/admin/service-areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(serviceAreaData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Área de servicio creada');
      expect(response.body.data.serviceArea).toBeDefined();
      expect(response.body.data.serviceArea.name).toBe('Zona Centro Test');
      expect(response.body.data.serviceArea.type).toBe('CITY');
      expect(response.body.data.serviceArea.radiusKm).toBe(5.0);
      expect(response.body.data.createdBy).toBeDefined();

      // Guardar ID para limpieza
      testServiceAreaId = response.body.data.serviceArea.id;
    });

    test('Debe crear un área de servicio con polígono personalizado', async () => {
      const serviceAreaData = {
        name: 'Zona Polígono Test',
        description: 'Área de servicio con polígono personalizado para testing',
        type: 'CUSTOM_POLYGON',
        centerLatitude: 19.4326,
        centerLongitude: -99.1332,
        polygonCoordinates: [
          { lat: 19.4326, lng: -99.1332 },
          { lat: 19.4426, lng: -99.1432 },
          { lat: 19.4226, lng: -99.1232 },
          { lat: 19.4326, lng: -99.1332 }
        ]
      };

      const response = await request(BASE_URL)
        .post('/api/admin/service-areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(serviceAreaData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data.serviceArea.type).toBe('CUSTOM_POLYGON');
      expect(response.body.data.serviceArea.polygonCoordinates).toHaveLength(4);
    });

    test('Debe fallar con coordenadas inválidas', async () => {
      const invalidData = {
        name: 'Zona Inválida',
        type: 'CITY',
        centerLatitude: 200.0, // Latitud fuera de rango
        centerLongitude: -99.1332,
        radiusKm: 5.0
      };

      const response = await request(BASE_URL)
        .post('/api/admin/service-areas')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('4. PATCH /service-areas/:id - Actualizar Área de Servicio', () => {
    test('Debe actualizar un área de servicio exitosamente', async () => {
      if (!testServiceAreaId) {
        // Crear área de servicio si no existe
        const createResponse = await request(BASE_URL)
          .post('/api/admin/service-areas')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Zona Test Update',
            type: 'CITY',
            centerLatitude: 19.4326,
            centerLongitude: -99.1332,
            radiusKm: 5.0
          });
        
        testServiceAreaId = createResponse.body.data.serviceArea.id;
      }

      const updateData = {
        name: 'Zona Centro Actualizada Test',
        description: 'Descripción actualizada del área para testing',
        radiusKm: 7.0,
        isActive: false
      };

      const response = await request(BASE_URL)
        .patch(`/api/admin/service-areas/${testServiceAreaId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Área de servicio actualizada');
      expect(response.body.data.serviceArea.name).toBe('Zona Centro Actualizada Test');
      expect(response.body.data.serviceArea.radiusKm).toBe(7.0);
      expect(response.body.data.serviceArea.isActive).toBe(false);
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe fallar al actualizar área inexistente', async () => {
      const updateData = {
        name: 'Zona Inexistente'
      };

      const response = await request(BASE_URL)
        .patch('/api/admin/service-areas/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });
});
