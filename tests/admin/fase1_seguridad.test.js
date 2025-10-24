const request = require('supertest');
const { PrismaClient } = require('@prisma/client');

// Configuración de la base de datos para pruebas
const prisma = new PrismaClient();

// Configuración de la aplicación
const BASE_URL = 'http://localhost:3000';
const ADMIN_BASE_URL = `${BASE_URL}/api/admin`;
const AUTH_BASE_URL = `${BASE_URL}/api/auth`;

// Credenciales del Super Admin (del seed)
const SUPER_ADMIN_CREDENTIALS = {
  email: 'admin@delixmi.com',
  password: 'supersecret'
};

// Variables globales para el test
let accessToken;
let testRoleId;
let testUserId;
let testPermissionIds = [];

describe('FASE 1: SEGURIDAD, ROLES Y USUARIOS - Endpoints del Super Admin', () => {
  
  // ========================================
  // CONFIGURACIÓN INICIAL Y AUTENTICACIÓN
  // ========================================
  
  beforeAll(async () => {
    console.log('🔐 Iniciando autenticación del Super Admin...');
    
    try {
      // Paso 1: Login del Super Admin
      const loginResponse = await request(BASE_URL)
        .post(`${AUTH_BASE_URL}/login`)
        .send(SUPER_ADMIN_CREDENTIALS)
        .expect(200);

      // Verificar estructura de respuesta
      expect(loginResponse.body).toHaveProperty('status', 'success');
      expect(loginResponse.body).toHaveProperty('data');
      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data).toHaveProperty('user');
      expect(loginResponse.body.data.user).toHaveProperty('roles');

      // Almacenar el token
      accessToken = loginResponse.body.data.accessToken;
      console.log('✅ Autenticación exitosa - Token obtenido');

      // Obtener IDs necesarios para las pruebas
      const permissions = await prisma.permission.findMany({
        take: 3 // Tomar los primeros 3 permisos para las pruebas
      });
      testPermissionIds = permissions.map(p => p.id);

      // Obtener un usuario que NO sea Super Admin para las pruebas
      const regularUser = await prisma.user.findFirst({
        where: {
          email: { not: 'admin@delixmi.com' }
        }
      });
      testUserId = regularUser.id;

      console.log(`✅ Datos de prueba preparados - Usuario ID: ${testUserId}, Permisos: ${testPermissionIds.length}`);

    } catch (error) {
      console.error('❌ Error en configuración inicial:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    console.log('🧹 Limpiando datos de prueba...');
    
    try {
      // Eliminar el rol de prueba si existe
      if (testRoleId) {
        await prisma.role.delete({
          where: { id: testRoleId }
        });
        console.log('✅ Rol de prueba eliminado');
      }

      // Cerrar conexión de Prisma
      await prisma.$disconnect();
      console.log('✅ Conexión de base de datos cerrada');
      
    } catch (error) {
      console.error('⚠️ Error en limpieza:', error.message);
    }
  });

  // ========================================
  // 1. CREAR NUEVO ROL
  // ========================================
  
  describe('POST /roles - Crear nuevo rol', () => {
    it('debería crear un nuevo rol exitosamente', async () => {
      const newRoleData = {
        name: 'test_role_admin',
        displayName: 'Test Role Admin',
        description: 'Rol de prueba para testing'
      };

      const response = await request(BASE_URL)
        .post(`${ADMIN_BASE_URL}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newRoleData)
        .expect(201);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data.role).toHaveProperty('id');
      expect(response.body.data.role).toHaveProperty('name', 'test_role_admin');
      expect(response.body.data.role).toHaveProperty('displayName', 'Test Role Admin');
      expect(response.body.data).toHaveProperty('createdBy');

      // Almacenar ID del rol para pruebas posteriores
      testRoleId = response.body.data.role.id;
      console.log(`✅ Rol creado exitosamente - ID: ${testRoleId}`);
    });

    it('debería fallar al intentar crear el mismo rol (409 Conflict)', async () => {
      const duplicateRoleData = {
        name: 'test_role_admin',
        displayName: 'Test Role Admin Duplicate',
        description: 'Intento de duplicar rol'
      };

      const response = await request(BASE_URL)
        .post(`${ADMIN_BASE_URL}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateRoleData)
        .expect(409);

      // Verificar estructura de error
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      console.log('✅ Validación de duplicado funcionando correctamente');
    });
  });

  // ========================================
  // 2. LISTAR ROLES
  // ========================================
  
  describe('GET /roles - Listar roles', () => {
    it('debería listar todos los roles exitosamente', async () => {
      const response = await request(BASE_URL)
        .get(`${ADMIN_BASE_URL}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('roles');
      expect(Array.isArray(response.body.data.roles)).toBe(true);

      // Verificar que el rol creado esté en la lista
      const testRole = response.body.data.roles.find(role => role.id === testRoleId);
      expect(testRole).toBeDefined();
      expect(testRole).toHaveProperty('name', 'test_role_admin');
      expect(testRole).toHaveProperty('permissions');
      expect(Array.isArray(testRole.permissions)).toBe(true);

      console.log(`✅ Lista de roles obtenida - Total: ${response.body.data.roles.length} roles`);
    });
  });

  // ========================================
  // 3. ACTUALIZAR PERMISOS DE ROL
  // ========================================
  
  describe('PATCH /roles/:id/permissions - Actualizar permisos de rol', () => {
    it('debería asignar permisos al rol exitosamente', async () => {
      const permissionsData = {
        permissions: [
          {
            permissionId: testPermissionIds[0],
            action: 'add'
          },
          {
            permissionId: testPermissionIds[1],
            action: 'add'
          }
        ]
      };

      const response = await request(BASE_URL)
        .patch(`${ADMIN_BASE_URL}/roles/${testRoleId}/permissions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(permissionsData)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('changes');
      expect(Array.isArray(response.body.data.changes)).toBe(true);
      expect(response.body.data).toHaveProperty('updatedBy');

      // Verificar que se agregaron los permisos
      expect(response.body.data.changes).toHaveLength(2);
      expect(response.body.data.changes[0]).toHaveProperty('action', 'added');
      expect(response.body.data.changes[1]).toHaveProperty('action', 'added');

      console.log('✅ Permisos asignados exitosamente al rol');
    });
  });

  // ========================================
  // 4. ACTUALIZAR ESTADO DE USUARIO
  // ========================================
  
  describe('PATCH /users/:id/status - Actualizar estado de usuario', () => {
    it('debería actualizar el estado del usuario a suspended', async () => {
      const statusData = {
        status: 'suspended'
      };

      const response = await request(BASE_URL)
        .patch(`${ADMIN_BASE_URL}/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(statusData)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('status', 'suspended');
      expect(response.body.data).toHaveProperty('updatedBy');

      // Verificar que el usuario tiene el nuevo estado
      expect(response.body.data.user).toHaveProperty('id', testUserId);
      expect(response.body.data.user).toHaveProperty('name');
      expect(response.body.data.user).toHaveProperty('lastname');
      expect(response.body.data.user).toHaveProperty('email');

      console.log(`✅ Estado del usuario actualizado a: ${response.body.data.user.status}`);
    });
  });

  // ========================================
  // 5. MARCAR USUARIO COMO SOSPECHOSO
  // ========================================
  
  describe('PATCH /users/:id/suspicious - Marcar usuario como sospechoso', () => {
    it('debería marcar el usuario como sospechoso', async () => {
      const suspiciousData = {
        isSuspicious: true
      };

      const response = await request(BASE_URL)
        .patch(`${ADMIN_BASE_URL}/users/${testUserId}/suspicious`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(suspiciousData)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('isSuspicious', true);
      expect(response.body.data).toHaveProperty('updatedBy');

      console.log('✅ Usuario marcado como sospechoso');
    });
  });

  // ========================================
  // 6. ASIGNAR ROL A USUARIO
  // ========================================
  
  describe('POST /users/:userId/role - Asignar rol a usuario', () => {
    it('debería asignar el rol de prueba al usuario', async () => {
      const roleAssignmentData = {
        roleId: testRoleId
      };

      const response = await request(BASE_URL)
        .post(`${ADMIN_BASE_URL}/users/${testUserId}/role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(roleAssignmentData)
        .expect(201);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('assignment');
      expect(response.body.data.assignment).toHaveProperty('userId', testUserId);
      expect(response.body.data.assignment).toHaveProperty('roleId', testRoleId);
      expect(response.body.data.assignment).toHaveProperty('role');
      expect(response.body.data.assignment.role).toHaveProperty('name', 'test_role_admin');
      expect(response.body.data).toHaveProperty('assignedBy');

      console.log('✅ Rol asignado exitosamente al usuario');
    });
  });

  // ========================================
  // 7. ELIMINAR SESIONES DE USUARIO
  // ========================================
  
  describe('DELETE /users/:id/sessions - Eliminar sesiones de usuario', () => {
    it('debería eliminar las sesiones del Super Admin', async () => {
      // Obtener ID del Super Admin
      const adminUser = await prisma.user.findUnique({
        where: { email: 'admin@delixmi.com' }
      });

      const response = await request(BASE_URL)
        .delete(`${ADMIN_BASE_URL}/users/${adminUser.id}/sessions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('deletedCount');
      expect(typeof response.body.data.deletedCount).toBe('number');
      expect(response.body.data).toHaveProperty('deletedBy');

      console.log(`✅ Sesiones eliminadas - Cantidad: ${response.body.data.deletedCount}`);
    });

    it('debería fallar al usar el token antiguo (401 Unauthorized)', async () => {
      // Intentar usar el token que debería estar invalidado
      const response = await request(BASE_URL)
        .get(`${ADMIN_BASE_URL}/roles`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      // Verificar estructura de error
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      console.log('✅ Token invalidado correctamente - Sesiones eliminadas');
    });
  });

  // ========================================
  // 8. RESETEAR CONTRASEÑA DE USUARIO
  // ========================================
  
  describe('POST /users/:id/reset-password - Resetear contraseña de usuario', () => {
    let newAccessToken;

    beforeAll(async () => {
      // Re-autenticarse después de eliminar sesiones
      const loginResponse = await request(BASE_URL)
        .post(`${AUTH_BASE_URL}/login`)
        .send(SUPER_ADMIN_CREDENTIALS)
        .expect(200);
      
      newAccessToken = loginResponse.body.data.accessToken;
    });

    it('debería resetear la contraseña del usuario', async () => {
      const passwordData = {
        newPassword: 'NuevaContraseña123!'
      };

      const response = await request(BASE_URL)
        .post(`${ADMIN_BASE_URL}/users/${testUserId}/reset-password`)
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(passwordData)
        .expect(200);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toHaveProperty('id', testUserId);
      expect(response.body.data).toHaveProperty('resetToken');
      expect(response.body.data).toHaveProperty('updatedBy');

      // Verificar que el token de reset es una cadena
      expect(typeof response.body.data.resetToken).toBe('string');
      expect(response.body.data.resetToken.length).toBeGreaterThan(0);

      console.log('✅ Contraseña reseteada exitosamente');
    });
  });

  // ========================================
  // PRUEBAS DE VALIDACIÓN Y ERRORES
  // ========================================
  
  describe('Validaciones y manejo de errores', () => {
    let newAccessToken;

    beforeAll(async () => {
      // Re-autenticarse para las pruebas de validación
      const loginResponse = await request(BASE_URL)
        .post(`${AUTH_BASE_URL}/login`)
        .send(SUPER_ADMIN_CREDENTIALS)
        .expect(200);
      
      newAccessToken = loginResponse.body.data.accessToken;
    });

    it('debería fallar con 400 al enviar datos inválidos para crear rol', async () => {
      const invalidRoleData = {
        name: '', // Nombre vacío
        displayName: 'Test Role'
      };

      const response = await request(BASE_URL)
        .post(`${ADMIN_BASE_URL}/roles`)
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(invalidRoleData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');

      console.log('✅ Validación de datos inválidos funcionando');
    });

    it('debería fallar con 404 al intentar actualizar un usuario inexistente', async () => {
      const statusData = {
        status: 'suspended'
      };

      const response = await request(BASE_URL)
        .patch(`${ADMIN_BASE_URL}/users/99999/status`)
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(statusData)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      console.log('✅ Manejo de usuario no encontrado funcionando');
    });

    it('debería fallar con 401 al no enviar token de autorización', async () => {
      const response = await request(BASE_URL)
        .get(`${ADMIN_BASE_URL}/roles`)
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      console.log('✅ Validación de autorización funcionando');
    });
  });
});

// ========================================
// CONFIGURACIÓN DE JEST (si se usa Jest)
// ========================================

// Configuración de timeout para pruebas de integración
jest.setTimeout(30000);

// Configuración de base de datos para pruebas
beforeAll(async () => {
  // Verificar conexión a la base de datos
  try {
    await prisma.$connect();
    console.log('✅ Conexión a base de datos establecida');
  } catch (error) {
    console.error('❌ Error conectando a la base de datos:', error.message);
    throw error;
  }
});

afterAll(async () => {
  // Cerrar conexión de Prisma
  await prisma.$disconnect();
  console.log('✅ Conexión de base de datos cerrada');
});
