# Ejemplo de Ejecución - Pruebas Fase 1

## Preparación del Ambiente

### 1. Iniciar el Servidor
```bash
# Terminal 1: Iniciar servidor en modo desarrollo
npm run dev
```

### 2. Verificar Base de Datos
```bash
# Terminal 2: Verificar que los datos de prueba estén cargados
npm run seed:prisma
```

### 3. Ejecutar Pruebas
```bash
# Terminal 3: Ejecutar pruebas del Super Admin
npm run test:admin
```

## Salida Esperada

```
🧪 Iniciando pruebas del Super Admin...
📋 Comando: npm run test:admin
🔍 Verificando servidor...
✅ Servidor verificado
🚀 Ejecutando pruebas...

PASS tests/admin/fase1_seguridad.test.js
  FASE 1: SEGURIDAD, ROLES Y USUARIOS - Endpoints del Super Admin
    🔐 Iniciando autenticación del Super Admin...
    ✅ Autenticación exitosa - Token obtenido
    ✅ Datos de prueba preparados - Usuario ID: 2, Permisos: 3
    POST /roles - Crear nuevo rol
      ✅ debería crear un nuevo rol exitosamente (45ms)
      ✅ debería fallar al intentar crear el mismo rol (409 Conflict) (12ms)
    GET /roles - Listar roles
      ✅ debería listar todos los roles exitosamente (23ms)
    PATCH /roles/:id/permissions - Actualizar permisos de rol
      ✅ debería asignar permisos al rol exitosamente (34ms)
    PATCH /users/:id/status - Actualizar estado de usuario
      ✅ debería actualizar el estado del usuario a suspended (28ms)
    PATCH /users/:id/suspicious - Marcar usuario como sospechoso
      ✅ debería marcar el usuario como sospechoso (19ms)
    POST /users/:userId/role - Asignar rol a usuario
      ✅ debería asignar el rol de prueba al usuario (31ms)
    DELETE /users/:id/sessions - Eliminar sesiones de usuario
      ✅ debería eliminar las sesiones del Super Admin (15ms)
      ✅ debería fallar al usar el token antiguo (401 Unauthorized) (8ms)
    POST /users/:id/reset-password - Resetear contraseña de usuario
      ✅ debería resetear la contraseña del usuario (42ms)
    Validaciones y manejo de errores
      ✅ debería fallar con 400 al enviar datos inválidos para crear rol (11ms)
      ✅ debería fallar con 404 al intentar actualizar un usuario inexistente (9ms)
      ✅ debería fallar con 401 al no enviar token de autorización (6ms)
    🧹 Limpiando datos de prueba...
    ✅ Rol de prueba eliminado
    ✅ Conexión de base de datos cerrada

Test Suites: 1 passed, 1 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        2.847s
Ran all test suites.

✅ Pruebas completadas en 2.85s
```

## Comandos Alternativos

### Ejecutar con Cobertura
```bash
npm run test:coverage
```

### Ejecutar en Modo Watch
```bash
npm run test:admin:watch
```

### Ejecutar Archivo Específico
```bash
npx jest tests/admin/fase1_seguridad.test.js --verbose
```

### Ejecutar con Debug
```bash
DEBUG=* npm run test:admin
```

## Troubleshooting

### Error: "ECONNREFUSED"
```
❌ Error ejecutando pruebas: Command failed with exit code 1
```
**Solución**: Verificar que el servidor esté ejecutándose en `http://localhost:3000`

### Error: "JWT_SECRET is not defined"
```
❌ Error: JWT_SECRET is not defined
```
**Solución**: Verificar que las variables de entorno estén configuradas en `.env`

### Error: "User not found"
```
❌ Error: Usuario no encontrado
```
**Solución**: Ejecutar `npm run seed:prisma` para cargar datos de prueba

### Error: "Database connection failed"
```
❌ Error conectando a la base de datos
```
**Solución**: Verificar que MySQL esté ejecutándose y la base de datos `delixmi` exista

## Validaciones Realizadas

### ✅ Autenticación
- Login exitoso del Super Admin
- Obtención de token JWT válido
- Verificación de roles en la respuesta

### ✅ CRUD de Roles
- Creación de nuevo rol
- Validación de duplicados (409 Conflict)
- Listado de roles con permisos
- Asignación de permisos a rol

### ✅ Gestión de Usuarios
- Actualización de estado de usuario
- Marcado de usuario como sospechoso
- Asignación de rol a usuario
- Eliminación de sesiones
- Reset de contraseña

### ✅ Validaciones y Errores
- Validación de datos de entrada (400)
- Manejo de recursos no encontrados (404)
- Verificación de autorización (401)
- Invalidación de tokens JWT

### ✅ Limpieza
- Eliminación de datos de prueba
- Cierre de conexiones de base de datos
- Manejo de errores en cleanup

## Métricas de Calidad

- **Cobertura de Endpoints**: 8/8 (100%)
- **Cobertura de Casos de Error**: 4/4 (100%)
- **Tiempo de Ejecución**: ~3 segundos
- **Datos de Prueba**: Limpieza automática
- **Transacciones**: Operaciones atómicas verificadas
