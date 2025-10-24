const request = require('supertest');

// Configuración para Render
const BASE_URL = 'https://delixmi-backend.onrender.com';

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

describe('FASE 1: SEGURIDAD, ROLES Y USUARIOS - Endpoints del Super Admin (Render)', () => {
  
  // ========================================
  // CONFIGURACIÓN INICIAL Y AUTENTICACIÓN
  // ========================================
  
  beforeAll(async () => {
    console.log('🔐 Iniciando autenticación del Super Admin en Render...');
    
    try {
      // Paso 1: Login del Super Admin
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
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
      // Usar un usuario que sabemos que existe en el seed
      testUserId = 2; // Sofia López del seed
      
      // IDs de permisos del seed (primeros 3)
      testPermissionIds = [1, 2, 3];

      console.log(`✅ Datos de prueba preparados - Usuario ID: ${testUserId}, Permisos: ${testPermissionIds.length}`);

    } catch (error) {
      console.error('❌ Error en configuración inicial:', error.message);
      throw error;
    }
  }, 30000); // Timeout de 30 segundos para Render

  afterAll(async () => {
    console.log('🧹 Limpiando datos de prueba...');
    
    try {
      // Eliminar el rol de prueba si existe
      if (testRoleId && accessToken) {
        try {
          await request(BASE_URL)
            .delete(`/api/admin/roles/${testRoleId}`)
            .set('Authorization', `Bearer ${accessToken}`);
          console.log('✅ Rol de prueba eliminado');
        } catch (error) {
          console.log('⚠️ No se pudo eliminar el rol de prueba:', error.message);
        }
      }
      
    } catch (error) {
      console.error('⚠️ Error en limpieza:', error.message);
    }
    
    // Delay para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }, 30000);

  // ========================================
  // 1. CREAR NUEVO ROL
  // ========================================
  
  describe('POST /roles - Crear nuevo rol', () => {
    it('debería crear un nuevo rol exitosamente', async () => {
      const timestamp = Date.now();
      const newRoleData = {
        name: `test_role_admin_render_${timestamp}`,
        displayName: 'Test Role Admin Render',
        description: 'Rol de prueba para testing en Render'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(newRoleData)
        .expect(201);

      // Verificar estructura de respuesta
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data.role).toHaveProperty('id');
      expect(response.body.data.role).toHaveProperty('name', 'test_role_admin_render');
      expect(response.body.data.role).toHaveProperty('displayName', 'Test Role Admin Render');
      expect(response.body.data).toHaveProperty('createdBy');

      // Almacenar ID del rol para pruebas posteriores
      testRoleId = response.body.data.role.id;
      console.log(`✅ Rol creado exitosamente - ID: ${testRoleId}`);
      
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 30000);

    it('debería fallar al intentar crear el mismo rol (409 Conflict)', async () => {
      const duplicateRoleData = {
        name: 'super_admin', // Usar un rol que sabemos que existe
        displayName: 'Test Role Admin Duplicate',
        description: 'Intento de duplicar rol'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateRoleData)
        .expect(409);

      // Verificar estructura de error
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      console.log('✅ Validación de duplicado funcionando correctamente');
      
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 30000);
  });

  // ========================================
  // 2. LISTAR ROLES
  // ========================================
  
  describe('GET /roles - Listar roles', () => {
    it('debería listar todos los roles exitosamente', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/roles')
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
      expect(testRole).toHaveProperty('name', 'test_role_admin_render');
      expect(testRole).toHaveProperty('permissions');
      expect(Array.isArray(testRole.permissions)).toBe(true);

      console.log(`✅ Lista de roles obtenida - Total: ${response.body.data.roles.length} roles`);
    }, 30000);
  });

  // ========================================
  // 3. ACTUALIZAR PERMISOS DE ROL
  // ========================================
  
  describe('PATCH /roles/:id/permissions - Actualizar permisos de rol', () => {
    it('debería asignar permisos al rol exitosamente', async () => {
      // Verificar que testRoleId esté definido
      if (!testRoleId) {
        throw new Error('testRoleId no está definido. El test de crear rol debe ejecutarse primero.');
      }

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
        .patch(`/api/admin/roles/${testRoleId}/permissions`)
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
      
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }, 30000);
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
        .patch(`/api/admin/users/${testUserId}/status`)
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
    }, 30000);
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
        .patch(`/api/admin/users/${testUserId}/suspicious`)
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
    }, 30000);
  });

  // ========================================
  // 6. ASIGNAR ROL A USUARIO
  // ========================================
  
  describe('POST /users/:userId/role - Asignar rol a usuario', () => {
    it('debería asignar el rol de prueba al usuario', async () => {
      // Verificar que testRoleId esté definido
      if (!testRoleId) {
        throw new Error('testRoleId no está definido. El test de crear rol debe ejecutarse primero.');
      }

      const roleAssignmentData = {
        roleId: testRoleId
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/users/${testUserId}/role`)
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
      expect(response.body.data.assignment.role).toHaveProperty('name', 'test_role_admin_render');
      expect(response.body.data).toHaveProperty('assignedBy');

      console.log('✅ Rol asignado exitosamente al usuario');
    }, 30000);
  });

  // ========================================
  // 7. ELIMINAR SESIONES DE USUARIO
  // ========================================
  
  describe('DELETE /users/:id/sessions - Eliminar sesiones de usuario', () => {
    it('debería eliminar las sesiones del Super Admin', async () => {
      // Obtener ID del Super Admin (ID 1 del seed)
      const adminUserId = 1;

      const response = await request(BASE_URL)
        .delete(`/api/admin/users/${adminUserId}/sessions`)
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
    }, 30000);

    it('debería fallar al usar el token antiguo (401 Unauthorized)', async () => {
      // Obtener un nuevo token para verificar que el anterior fue invalidado
      const newLoginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send(SUPER_ADMIN_CREDENTIALS)
        .expect(200);

      const newAccessToken = newLoginResponse.body.data.accessToken;

      // Ahora intentar usar el token anterior (que debería estar invalidado)
      const response = await request(BASE_URL)
        .get('/api/admin/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);

      // Verificar estructura de error
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      console.log('✅ Token invalidado correctamente - Sesiones eliminadas');
    }, 30000);
  });

  // ========================================
  // 8. RESETEAR CONTRASEÑA DE USUARIO
  // ========================================
  
  describe('POST /users/:id/reset-password - Resetear contraseña de usuario', () => {
    let newAccessToken;

    beforeAll(async () => {
      // Re-autenticarse después de eliminar sesiones
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send(SUPER_ADMIN_CREDENTIALS)
        .expect(200);
      
      newAccessToken = loginResponse.body.data.accessToken;
    }, 30000);

    it('debería resetear la contraseña del usuario', async () => {
      const passwordData = {
        newPassword: 'NuevaContraseña123!'
      };

      const response = await request(BASE_URL)
        .post(`/api/admin/users/${testUserId}/reset-password`)
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
    }, 30000);
  });

  // ========================================
  // PRUEBAS DE VALIDACIÓN Y ERRORES
  // ========================================
  
  describe('Validaciones y manejo de errores', () => {
    let newAccessToken;

    beforeAll(async () => {
      // Re-autenticarse para las pruebas de validación
      const loginResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send(SUPER_ADMIN_CREDENTIALS)
        .expect(200);
      
      newAccessToken = loginResponse.body.data.accessToken;
    }, 30000);

    it('debería fallar con 400 al enviar datos inválidos para crear rol', async () => {
      const invalidRoleData = {
        name: '', // Nombre vacío
        displayName: 'Test Role'
      };

      const response = await request(BASE_URL)
        .post('/api/admin/roles')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(invalidRoleData)
        .expect(400);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');

      console.log('✅ Validación de datos inválidos funcionando');
    }, 30000);

    it('debería fallar con 404 al intentar actualizar un usuario inexistente', async () => {
      const statusData = {
        status: 'suspended'
      };

      const response = await request(BASE_URL)
        .patch('/api/admin/users/99999/status')
        .set('Authorization', `Bearer ${newAccessToken}`)
        .send(statusData)
        .expect(404);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      console.log('✅ Manejo de usuario no encontrado funcionando');
    }, 30000);

    it('debería fallar con 401 al no enviar token de autorización', async () => {
      const response = await request(BASE_URL)
        .get('/api/admin/roles')
        .expect(401);

      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');

      console.log('✅ Validación de autorización funcionando');
    }, 30000);
  });
});

// ========================================
// CONFIGURACIÓN DE JEST
// ========================================

// Configuración de timeout para pruebas de integración con Render
jest.setTimeout(30000);
