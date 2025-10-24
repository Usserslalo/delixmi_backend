# Tests del Super Admin - Delixmi Backend

## Descripción
Este directorio contiene las pruebas funcionales para los endpoints del Super Admin del sistema Delixmi.

## Estructura
```
tests/
├── admin/
│   └── fase1_seguridad.test.js    # Pruebas de Fase 1: Seguridad, Roles y Usuarios
├── setup.js                       # Configuración global de pruebas
└── README.md                      # Este archivo
```

## Requisitos Previos

### 1. Base de Datos
- MySQL 8.0+ ejecutándose en `localhost:3306`
- Base de datos `delixmi` creada y configurada
- Datos de prueba cargados (ejecutar `npm run seed:prisma`)

### 2. Servidor
- Servidor Delixmi ejecutándose en `http://localhost:3000`
- Variables de entorno configuradas correctamente

### 3. Dependencias
```bash
npm install --save-dev jest supertest @types/jest @types/supertest
```

## Ejecución de Pruebas

### Comandos Disponibles
```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Ejecutar pruebas con cobertura
npm run test:coverage

# Ejecutar solo pruebas del Super Admin
npm run test:admin

# Ejecutar pruebas del Super Admin en modo watch
npm run test:admin:watch
```

### Ejecución Manual
```bash
# Ejecutar archivo específico
npx jest tests/admin/fase1_seguridad.test.js

# Ejecutar con verbose
npx jest tests/admin/fase1_seguridad.test.js --verbose

# Ejecutar con cobertura
npx jest tests/admin/fase1_seguridad.test.js --coverage
```

## Configuración

### Variables de Entorno
Las pruebas utilizan las siguientes variables de entorno:
- `NODE_ENV=test`
- `DATABASE_URL`: URL de conexión a la base de datos de pruebas
- `JWT_SECRET`: Clave secreta para JWT (usar valor de test)
- `JWT_ACCESS_EXPIRES_IN`: Tiempo de expiración del token de acceso
- `JWT_REFRESH_EXPIRES_IN`: Tiempo de expiración del token de refresh

### Base de Datos de Pruebas
Las pruebas utilizan la misma base de datos que el desarrollo, pero con datos de prueba específicos del seed.

## Estructura de las Pruebas

### Fase 1: Seguridad, Roles y Usuarios
El archivo `fase1_seguridad.test.js` incluye pruebas para:

1. **POST /roles** - Crear nuevo rol
2. **GET /roles** - Listar roles
3. **PATCH /roles/:id/permissions** - Actualizar permisos de rol
4. **PATCH /users/:id/status** - Actualizar estado de usuario
5. **PATCH /users/:id/suspicious** - Marcar usuario como sospechoso
6. **POST /users/:userId/role** - Asignar rol a usuario
7. **DELETE /users/:id/sessions** - Eliminar sesiones de usuario
8. **POST /users/:id/reset-password** - Resetear contraseña de usuario

### Flujo de Pruebas
1. **Autenticación**: Login del Super Admin para obtener token
2. **Configuración**: Obtención de IDs necesarios para las pruebas
3. **Ejecución**: Pruebas de cada endpoint con validaciones
4. **Limpieza**: Eliminación de datos de prueba creados

## Datos de Prueba

### Usuario Super Admin
- **Email**: `admin@delixmi.com`
- **Password**: `supersecret`
- **Rol**: `super_admin`

### Usuarios de Prueba
- **Sofia López**: `sofia.lopez@email.com` (Cliente)
- **Carlos Rodríguez**: `carlos.rodriguez@pizzeria.com` (Gestor de Pedidos)

## Validaciones Incluidas

### Estructura de Respuesta
- Verificación de `status: "success"` o `status: "error"`
- Validación de campos requeridos en `data`
- Verificación de metadatos de auditoría (`updatedBy`, `createdBy`)

### Códigos de Estado HTTP
- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Datos de entrada inválidos
- **401**: No autorizado
- **404**: Recurso no encontrado
- **409**: Conflicto (recurso duplicado)

### Validaciones de Negocio
- Verificación de duplicados
- Validación de permisos
- Verificación de estados de usuario
- Validación de tokens JWT

## Troubleshooting

### Error de Conexión a Base de Datos
```bash
# Verificar que MySQL esté ejecutándose
mysql -u root -p -e "SHOW DATABASES;"

# Verificar que la base de datos existe
mysql -u root -p -e "USE delixmi; SHOW TABLES;"
```

### Error de Servidor
```bash
# Verificar que el servidor esté ejecutándose
curl http://localhost:3000/api/auth/health

# Verificar logs del servidor
npm run dev
```

### Error de Token JWT
- Verificar que `JWT_SECRET` esté configurado
- Verificar que el usuario Super Admin exista en la base de datos
- Verificar que las credenciales sean correctas

### Error de Permisos
- Verificar que el usuario tenga rol `super_admin`
- Verificar que el token sea válido y no haya expirado
- Verificar que el endpoint esté protegido correctamente

## Contribución

### Agregar Nuevas Pruebas
1. Crear archivo en el directorio correspondiente
2. Seguir la estructura de `describe` y `it`
3. Incluir validaciones de estructura de respuesta
4. Incluir pruebas de error y validación
5. Documentar en este README

### Estándares de Código
- Usar `async/await` para operaciones asíncronas
- Incluir mensajes descriptivos en `expect`
- Limpiar datos de prueba en `afterAll`
- Usar variables descriptivas para IDs de prueba
- Incluir logs de consola para debugging

## Notas Importantes

1. **Datos de Prueba**: Las pruebas crean y eliminan datos de prueba automáticamente
2. **Transacciones**: Las operaciones críticas son atómicas
3. **Auditoría**: Todas las operaciones quedan registradas en `AuditLog`
4. **Seguridad**: Los tokens JWT se invalidan correctamente
5. **Limpieza**: Los datos de prueba se eliminan al finalizar las pruebas
