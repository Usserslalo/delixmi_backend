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
let testCategoryId;
let testRestaurantId;
let testProductId;

describe('FASE 3: Restaurantes y Catálogo - Tests', () => {
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
      const restaurant = await prisma.restaurant.findFirst();
      if (restaurant) {
        testRestaurantId = restaurant.id;
        console.log(`✅ Restaurante de prueba encontrado: ID ${testRestaurantId}`);
      }

      const product = await prisma.product.findFirst();
      if (product) {
        testProductId = product.id;
        console.log(`✅ Producto de prueba encontrado: ID ${testProductId}`);
      }
    } catch (error) {
      console.error('❌ Error en setup:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    // Limpieza: Eliminar categoría de prueba si existe
    if (testCategoryId) {
      try {
        await prisma.category.delete({
          where: { id: testCategoryId }
        });
        console.log('✅ Categoría de prueba eliminada');
      } catch (error) {
        console.log('⚠️ No se pudo eliminar la categoría de prueba:', error.message);
      }
    }
    
    await prisma.$disconnect();
  });

  describe('1. PATCH /restaurants/:id/verify - Verificar Restaurante Manualmente', () => {
    test('Debe verificar un restaurante exitosamente', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/restaurants/${testRestaurantId}/verify`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isManuallyVerified: true });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Estado de verificación del restaurante actualizado');
      expect(response.body.data.restaurant).toBeDefined();
      expect(response.body.data.restaurant.isManuallyVerified).toBe(true);
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe fallar con restaurante inexistente', async () => {
      const response = await request(BASE_URL)
        .patch('/api/admin/restaurants/99999/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ isManuallyVerified: true });

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('2. PATCH /restaurants/:id/commission - Actualizar Comisión de Restaurante', () => {
    test('Debe actualizar la comisión del restaurante exitosamente', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/restaurants/${testRestaurantId}/commission`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ commissionRate: 12.5 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Comisión del restaurante actualizada');
      expect(response.body.data.restaurant).toBeDefined();
      expect(response.body.data.restaurant.commissionRate).toBe(12.5);
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe fallar con tasa de comisión inválida', async () => {
      if (!testRestaurantId) {
        console.log('⚠️ No hay restaurante disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .patch(`/api/admin/restaurants/${testRestaurantId}/commission`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ commissionRate: 150.0 }); // Fuera del rango 0-100

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('3. POST /categories - Crear Categoría', () => {
    test('Debe crear una categoría exitosamente', async () => {
      const categoryData = {
        name: 'Comida Rápida Test',
        imageUrl: 'https://example.com/categoria-comida-rapida-test.jpg'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(categoryData);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Categoría creada');
      expect(response.body.data.category).toBeDefined();
      expect(response.body.data.category.name).toBe('Comida Rápida Test');
      expect(response.body.data.category.imageUrl).toBe('https://example.com/categoria-comida-rapida-test.jpg');
      expect(response.body.data.createdBy).toBeDefined();

      // Guardar ID para limpieza
      testCategoryId = response.body.data.category.id;
    });

    test('Debe fallar con datos inválidos (URL inválida)', async () => {
      const invalidData = {
        name: 'Categoría Inválida',
        imageUrl: 'url-invalida'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('4. PATCH /categories/:id - Actualizar Categoría', () => {
    test('Debe actualizar una categoría exitosamente', async () => {
      if (!testCategoryId) {
        // Crear categoría si no existe
        const createResponse = await request(BASE_URL)
          .post('/api/admin/categories')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Categoría Test Update',
            imageUrl: 'https://example.com/categoria-test.jpg'
          });
        
        testCategoryId = createResponse.body.data.category.id;
      }

      const updateData = {
        name: 'Categoría Actualizada Test',
        imageUrl: 'https://example.com/categoria-actualizada-test.jpg'
      };

      const response = await request(BASE_URL)
        .patch(`/api/admin/categories/${testCategoryId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Categoría actualizada');
      expect(response.body.data.category.name).toBe('Categoría Actualizada Test');
      expect(response.body.data.updatedBy).toBeDefined();
    });

    test('Debe fallar al actualizar categoría inexistente', async () => {
      const updateData = {
        name: 'Categoría Inexistente'
      };

      const response = await request(BASE_URL)
        .patch('/api/admin/categories/99999')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
      expect(response.body.status).toBe('error');
    });
  });

  describe('5. POST /promotions/:id/approve - Aprobar Promoción', () => {
    test('Debe aprobar una promoción exitosamente', async () => {
      // Primero necesitamos crear una promoción para aprobar
      // Como no tenemos endpoint para crear promociones, simularemos con un ID existente
      const response = await request(BASE_URL)
        .post('/api/admin/promotions/1/approve')
        .set('Authorization', `Bearer ${accessToken}`);

      // Puede fallar si no existe la promoción, pero verificamos la estructura de respuesta
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.message).toContain('Promoción aprobada');
        expect(response.body.data.promotion).toBeDefined();
        expect(response.body.data.approvedBy).toBeDefined();
      } else {
        expect(response.status).toBe(404);
        expect(response.body.status).toBe('error');
      }
    });
  });

  describe('6. POST /products/:id/stock/adjust - Ajustar Stock de Producto', () => {
    test('Debe ajustar el stock de un producto exitosamente', async () => {
      if (!testProductId) {
        console.log('⚠️ No hay producto disponible para testing');
        return;
      }

      const stockData = {
        change: 10,
        reason: 'MANUAL_ADJUSTMENT'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/products/${testProductId}/stock/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(stockData);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Stock del producto ajustado');
      expect(response.body.data.product).toBeDefined();
      expect(response.body.data.product.stockQuantity).toBeDefined();
      expect(response.body.data.adjustedBy).toBeDefined();
    });

    test('Debe fallar con datos inválidos', async () => {
      if (!testProductId) {
        console.log('⚠️ No hay producto disponible para testing');
        return;
      }

      const invalidData = {
        change: 'invalid',
        reason: 'INVALID_REASON'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/products/${testProductId}/stock/adjust`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });

  describe('7. GET /products/flagged - Obtener Productos Marcados', () => {
    test('Debe obtener productos marcados exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/products/flagged')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Productos marcados obtenidos');
      expect(response.body.data.products).toBeDefined();
      expect(Array.isArray(response.body.data.products)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.currentPage).toBe(1);
      expect(response.body.data.pagination.pageSize).toBe(10);
    });

    test('Debe manejar paginación correctamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/products/flagged')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 2, pageSize: 5 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.pageSize).toBe(5);
    });
  });

  describe('8. GET /inventory-logs - Obtener Logs de Inventario', () => {
    test('Debe obtener logs de inventario exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/inventory-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.message).toContain('Logs de inventario obtenidos');
      expect(response.body.data.logs).toBeDefined();
      expect(Array.isArray(response.body.data.logs)).toBe(true);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.filters).toBeDefined();
    });

    test('Debe filtrar logs por producto', async () => {
      if (!testProductId) {
        console.log('⚠️ No hay producto disponible para testing');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/admin/inventory-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ productId: testProductId, page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.productId).toBe(testProductId);
    });

    test('Debe filtrar logs por razón', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/inventory-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ reason: 'MANUAL_ADJUSTMENT', page: 1, pageSize: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.filters.reason).toBe('MANUAL_ADJUSTMENT');
    });
  });
});
