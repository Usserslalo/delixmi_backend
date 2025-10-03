# Panel de Administración - Delixmi Backend

## Endpoints de Administración

### GET /api/admin/restaurants

Obtiene una lista paginada de todos los restaurantes registrados en la plataforma con capacidad de filtrado por estado.

#### Autenticación
- **Requerida**: Sí
- **Roles permitidos**: `super_admin`, `platform_manager`
- **Header**: `Authorization: Bearer <token>`

#### Parámetros de consulta (opcionales)

| Parámetro | Tipo | Descripción | Valores válidos | Default |
|-----------|------|-------------|-----------------|---------|
| `status` | string | Filtrar por estado del restaurante | `pending_approval`, `active`, `inactive`, `suspended`, `rejected` | null (todos) |
| `page` | integer | Número de página | ≥ 1 | 1 |
| `pageSize` | integer | Tamaño de página | 1-100 | 10 |

#### Ejemplos de uso

```bash
# Obtener todos los restaurantes (primera página)
GET /api/admin/restaurants

# Obtener restaurantes pendientes de aprobación
GET /api/admin/restaurants?status=pending_approval

# Obtener restaurantes activos con paginación personalizada
GET /api/admin/restaurants?status=active&page=2&pageSize=20

# Obtener restaurantes suspendidos
GET /api/admin/restaurants?status=suspended
```

#### Respuesta exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Lista de restaurantes obtenida exitosamente",
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Restaurante Ejemplo",
        "description": "Descripción del restaurante",
        "logoUrl": "https://example.com/logo.jpg",
        "coverPhotoUrl": "https://example.com/cover.jpg",
        "commissionRate": "10.00",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "owner": {
          "id": 1,
          "name": "Juan",
          "lastname": "Pérez",
          "fullName": "Juan Pérez",
          "email": "juan@example.com",
          "phone": "+525512345678",
          "status": "active"
        },
        "branches": [
          {
            "id": 1,
            "name": "Sucursal Centro",
            "status": "active",
            "address": "Calle Principal 123",
            "phone": "+525512345679",
            "openingTime": "08:00:00",
            "closingTime": "22:00:00"
          }
        ],
        "statistics": {
          "totalBranches": 1,
          "totalProducts": 25,
          "totalSubcategories": 5
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 50,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false,
      "nextPage": 2,
      "previousPage": null
    },
    "filters": {
      "status": "active"
    }
  }
}
```

#### Respuestas de error

**400 Bad Request** - Datos de entrada inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El estado debe ser uno de: pending_approval, active, inactive, suspended, rejected",
      "param": "status",
      "location": "query"
    }
  ]
}
```

**401 Unauthorized** - Token no proporcionado o inválido
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden** - Permisos insuficientes
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["super_admin", "platform_manager"],
  "current": ["customer"]
}
```

**500 Internal Server Error** - Error interno del servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor al obtener restaurantes"
}
```

#### Estados de restaurante

| Estado | Descripción |
|--------|-------------|
| `pending_approval` | Restaurante registrado pero pendiente de aprobación |
| `active` | Restaurante aprobado y operativo |
| `inactive` | Restaurante temporalmente inactivo |
| `suspended` | Restaurante suspendido por violaciones |
| `rejected` | Restaurante rechazado durante el proceso de aprobación |

#### Notas importantes

1. **Seguridad**: Solo usuarios con roles `super_admin` o `platform_manager` pueden acceder a este endpoint.

2. **Paginación**: El sistema limita el `pageSize` a un máximo de 100 registros por página para optimizar el rendimiento.

3. **Ordenamiento**: Los restaurantes se ordenan primero por estado (ascendente) y luego por fecha de creación (descendente).

4. **Relaciones incluidas**: El endpoint incluye información del propietario, sucursales y estadísticas básicas del restaurante.

5. **Filtros**: Los filtros aplicados se devuelven en la respuesta para referencia del cliente.

#### Testing con Postman

1. **Headers requeridos**:
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

2. **Ejemplo de request**:
   ```
   GET {{base_url}}/api/admin/restaurants?status=active&page=1&pageSize=10
   ```

3. **Variables de entorno recomendadas**:
   ```
   base_url: http://localhost:3000
   admin_token: <token_de_admin>
   ```

---

### PATCH /api/admin/restaurants/:id/status

Actualiza el estado de un restaurante específico en la plataforma.

#### Autenticación
- **Requerida**: Sí
- **Roles permitidos**: `super_admin`, `platform_manager`
- **Header**: `Authorization: Bearer <token>`

#### Parámetros de ruta

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `id` | integer | ID del restaurante a actualizar | Sí |

#### Cuerpo de la petición

| Campo | Tipo | Descripción | Valores válidos | Requerido |
|-------|------|-------------|-----------------|-----------|
| `status` | string | Nuevo estado del restaurante | `pending_approval`, `active`, `inactive`, `suspended`, `rejected` | Sí |

#### Ejemplos de uso

```bash
# Aprobar un restaurante
PATCH /api/admin/restaurants/1/status
{
  "status": "active"
}

# Suspender un restaurante
PATCH /api/admin/restaurants/1/status
{
  "status": "suspended"
}

# Rechazar un restaurante
PATCH /api/admin/restaurants/1/status
{
  "status": "rejected"
}

# Reactivar un restaurante
PATCH /api/admin/restaurants/1/status
{
  "status": "active"
}
```

#### Respuesta exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Estado del restaurante actualizado exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurante Ejemplo",
      "description": "Descripción del restaurante",
      "logoUrl": "https://example.com/logo.jpg",
      "coverPhotoUrl": "https://example.com/cover.jpg",
      "commissionRate": "10.00",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "owner": {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez",
        "fullName": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "+525512345678",
        "status": "active"
      },
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "status": "active",
          "address": "Calle Principal 123",
          "phone": "+525512345679",
          "openingTime": "08:00:00",
          "closingTime": "22:00:00"
        }
      ],
      "statistics": {
        "totalBranches": 1,
        "totalProducts": 25,
        "totalSubcategories": 5
      }
    },
    "statusChange": {
      "previousStatus": "pending_approval",
      "newStatus": "active",
      "updatedBy": {
        "userId": 2,
        "userName": "Admin User",
        "userEmail": "admin@delixmi.com"
      },
      "updatedAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

#### Respuestas de error

**400 Bad Request** - Datos de entrada inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El estado debe ser uno de: pending_approval, active, inactive, suspended, rejected",
      "param": "status",
      "location": "body"
    }
  ]
}
```

**400 Bad Request** - Mismo estado actual
```json
{
  "status": "error",
  "message": "El restaurante ya tiene el estado especificado",
  "code": "SAME_STATUS",
  "currentStatus": "active"
}
```

**404 Not Found** - Restaurante no encontrado
```json
{
  "status": "error",
  "message": "Restaurante no encontrado",
  "code": "RESTAURANT_NOT_FOUND"
}
```

**401 Unauthorized** - Token no proporcionado o inválido
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden** - Permisos insuficientes
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["super_admin", "platform_manager"],
  "current": ["customer"]
}
```

**500 Internal Server Error** - Error interno del servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor al actualizar el estado del restaurante"
}
```

#### Testing con Postman

1. **Headers requeridos**:
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

2. **Ejemplo de request**:
   ```
   PATCH {{base_url}}/api/admin/restaurants/1/status
   
   Body (JSON):
   {
     "status": "active"
   }
   ```

3. **Variables de entorno recomendadas**:
   ```
   base_url: http://localhost:3000
   admin_token: <token_de_admin>
   restaurant_id: 1
   ```

#### Flujo de trabajo recomendado

1. **Aprobación inicial**: `pending_approval` → `active`
2. **Suspensión temporal**: `active` → `suspended`
3. **Reactivación**: `suspended` → `active`
4. **Rechazo definitivo**: `pending_approval` → `rejected`
5. **Desactivación**: `active` → `inactive`

---

### PATCH /api/admin/restaurants/:id

Actualiza los detalles de un restaurante específico incluyendo su tasa de comisión, información básica y estado.

#### Autenticación
- **Requerida**: Sí
- **Roles permitidos**: `super_admin`, `platform_manager`
- **Header**: `Authorization: Bearer <token>`

#### Parámetros de ruta

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `id` | integer | ID del restaurante a actualizar | Sí |

#### Cuerpo de la petición (todos los campos son opcionales)

| Campo | Tipo | Descripción | Validaciones | Requerido |
|-------|------|-------------|--------------|-----------|
| `name` | string | Nombre del restaurante | 2-150 caracteres | No |
| `description` | string | Descripción del restaurante | Máximo 1000 caracteres | No |
| `logoUrl` | string | URL del logo del restaurante | URL válida, máximo 255 caracteres | No |
| `coverPhotoUrl` | string | URL de la foto de portada | URL válida, máximo 255 caracteres | No |
| `commissionRate` | number | Tasa de comisión (porcentaje) | 0-100 | No |
| `status` | string | Estado del restaurante | `pending_approval`, `active`, `inactive`, `suspended`, `rejected` | No |

#### Ejemplos de uso

```bash
# Actualizar solo la tasa de comisión
PATCH /api/admin/restaurants/1
{
  "commissionRate": 15.5
}

# Actualizar múltiples campos
PATCH /api/admin/restaurants/1
{
  "name": "Restaurante Actualizado",
  "description": "Nueva descripción del restaurante",
  "commissionRate": 12.0,
  "status": "active"
}

# Actualizar solo las URLs de imágenes
PATCH /api/admin/restaurants/1
{
  "logoUrl": "https://example.com/new-logo.jpg",
  "coverPhotoUrl": "https://example.com/new-cover.jpg"
}

# Cambiar estado y tasa de comisión
PATCH /api/admin/restaurants/1
{
  "status": "suspended",
  "commissionRate": 8.0
}
```

#### Respuesta exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Restaurante actualizado exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Restaurante Actualizado",
      "description": "Nueva descripción del restaurante",
      "logoUrl": "https://example.com/new-logo.jpg",
      "coverPhotoUrl": "https://example.com/new-cover.jpg",
      "commissionRate": "12.00",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T12:30:00.000Z",
      "owner": {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez",
        "fullName": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "+525512345678",
        "status": "active"
      },
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "status": "active",
          "address": "Calle Principal 123",
          "phone": "+525512345679",
          "openingTime": "08:00:00",
          "closingTime": "22:00:00"
        }
      ],
      "statistics": {
        "totalBranches": 1,
        "totalProducts": 25,
        "totalSubcategories": 5
      }
    },
    "changes": {
      "updatedFields": {
        "name": {
          "previous": "Restaurante Original",
          "current": "Restaurante Actualizado"
        },
        "description": {
          "previous": "Descripción original",
          "current": "Nueva descripción del restaurante"
        },
        "commissionRate": {
          "previous": "10.00",
          "current": "12.00"
        }
      },
      "updatedBy": {
        "userId": 2,
        "userName": "Admin User",
        "userEmail": "admin@delixmi.com"
      },
      "updatedAt": "2024-01-01T12:30:00.000Z"
    }
  }
}
```

#### Respuestas de error

**400 Bad Request** - Datos de entrada inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "La tasa de comisión debe ser un número entre 0 y 100",
      "param": "commissionRate",
      "location": "body"
    }
  ]
}
```

**400 Bad Request** - No hay cambios para actualizar
```json
{
  "status": "error",
  "message": "No se proporcionaron cambios para actualizar",
  "code": "NO_CHANGES",
  "currentData": {
    "id": 1,
    "name": "Restaurante Ejemplo",
    "commissionRate": "10.00",
    "status": "active"
  }
}
```

**404 Not Found** - Restaurante no encontrado
```json
{
  "status": "error",
  "message": "Restaurante no encontrado",
  "code": "RESTAURANT_NOT_FOUND"
}
```

**401 Unauthorized** - Token no proporcionado o inválido
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden** - Permisos insuficientes
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["super_admin", "platform_manager"],
  "current": ["customer"]
}
```

**500 Internal Server Error** - Error interno del servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor al actualizar el restaurante"
}
```

#### Testing con Postman

1. **Headers requeridos**:
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

2. **Ejemplo de request**:
   ```
   PATCH {{base_url}}/api/admin/restaurants/1
   
   Body (JSON):
   {
     "name": "Restaurante Actualizado",
     "commissionRate": 15.0,
     "status": "active"
   }
   ```

3. **Variables de entorno recomendadas**:
   ```
   base_url: http://localhost:3000
   admin_token: <token_de_admin>
   restaurant_id: 1
   ```

#### Casos de uso comunes

1. **Ajuste de comisiones**: Cambiar la tasa de comisión para restaurantes específicos
2. **Actualización de información**: Modificar nombre, descripción o imágenes
3. **Gestión de estados**: Cambiar el estado junto con otros campos
4. **Corrección de datos**: Actualizar información incorrecta en el perfil
5. **Optimización de comisiones**: Ajustar tasas según el rendimiento del restaurante

---

### GET /api/admin/users

Obtiene una lista paginada de todos los usuarios registrados en la plataforma con capacidad de filtrado por rol y estado.

#### Autenticación
- **Requerida**: Sí
- **Roles permitidos**: `super_admin`, `platform_manager`
- **Header**: `Authorization: Bearer <token>`

#### Parámetros de consulta (opcionales)

| Parámetro | Tipo | Descripción | Valores válidos | Default |
|-----------|------|-------------|-----------------|---------|
| `role` | string | Filtrar por rol del usuario | `super_admin`, `platform_manager`, `restaurant_owner`, `restaurant_admin`, `driver`, `customer` | null (todos) |
| `status` | string | Filtrar por estado del usuario | `pending`, `active`, `inactive`, `suspended`, `deleted` | null (todos) |
| `page` | integer | Número de página | ≥ 1 | 1 |
| `pageSize` | integer | Tamaño de página | 1-100 | 10 |

#### Ejemplos de uso

```bash
# Obtener todos los usuarios (primera página)
GET /api/admin/users

# Obtener usuarios con rol de conductor
GET /api/admin/users?role=driver

# Obtener usuarios activos con paginación personalizada
GET /api/admin/users?status=active&page=2&pageSize=20

# Obtener propietarios de restaurantes pendientes
GET /api/admin/users?role=restaurant_owner&status=pending

# Obtener administradores de plataforma
GET /api/admin/users?role=platform_manager
```

#### Respuesta exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Lista de usuarios obtenida exitosamente",
  "data": {
    "users": [
      {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez",
        "fullName": "Juan Pérez",
        "email": "juan@example.com",
        "phone": "+525512345678",
        "imageUrl": "https://example.com/profile.jpg",
        "notificationToken": "fcm_token_example",
        "status": "active",
        "emailVerifiedAt": "2024-01-01T00:00:00.000Z",
        "phoneVerifiedAt": "2024-01-01T00:00:00.000Z",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "roles": [
          {
            "assignmentId": 1,
            "roleId": 3,
            "roleName": "restaurant_owner",
            "roleDisplayName": "Propietario de Restaurante",
            "roleDescription": "Propietario de uno o más restaurantes",
            "restaurantId": 1,
            "branchId": null,
            "restaurant": {
              "id": 1,
              "name": "Mi Restaurante",
              "status": "active"
            },
            "branch": null,
            "assignedAt": "2024-01-01T00:00:00.000Z"
          }
        ],
        "driverProfile": null,
        "statistics": {
          "totalRestaurants": 1,
          "totalAddresses": 2,
          "totalOrdersAsCustomer": 15,
          "totalOrdersAsDriver": 0
        }
      },
      {
        "id": 2,
        "name": "María",
        "lastname": "González",
        "fullName": "María González",
        "email": "maria@example.com",
        "phone": "+525512345679",
        "imageUrl": null,
        "notificationToken": null,
        "status": "active",
        "emailVerifiedAt": "2024-01-01T00:00:00.000Z",
        "phoneVerifiedAt": null,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "roles": [
          {
            "assignmentId": 2,
            "roleId": 5,
            "roleName": "driver",
            "roleDisplayName": "Conductor",
            "roleDescription": "Conductor de entrega",
            "restaurantId": null,
            "branchId": null,
            "restaurant": null,
            "branch": null,
            "assignedAt": "2024-01-01T00:00:00.000Z"
          }
        ],
        "driverProfile": {
          "vehicleType": "motorcycle",
          "licensePlate": "ABC-123",
          "status": "online",
          "kycStatus": "approved",
          "lastSeenAt": "2024-01-01T12:00:00.000Z"
        },
        "statistics": {
          "totalRestaurants": 0,
          "totalAddresses": 1,
          "totalOrdersAsCustomer": 5,
          "totalOrdersAsDriver": 25
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 150,
      "totalPages": 15,
      "hasNextPage": true,
      "hasPreviousPage": false,
      "nextPage": 2,
      "previousPage": null
    },
    "filters": {
      "role": null,
      "status": "active"
    }
  }
}
```

#### Respuestas de error

**400 Bad Request** - Datos de entrada inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El rol debe ser uno de: super_admin, platform_manager, restaurant_owner, restaurant_admin, driver, customer",
      "param": "role",
      "location": "query"
    }
  ]
}
```

**401 Unauthorized** - Token no proporcionado o inválido
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden** - Permisos insuficientes
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["super_admin", "platform_manager"],
  "current": ["customer"]
}
```

**500 Internal Server Error** - Error interno del servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor al obtener usuarios"
}
```

#### Roles disponibles

| Rol | Descripción |
|-----|-------------|
| `super_admin` | Administrador del sistema con acceso total |
| `platform_manager` | Gestor de plataforma con permisos administrativos |
| `restaurant_owner` | Propietario de uno o más restaurantes |
| `restaurant_admin` | Administrador de un restaurante específico |
| `driver` | Conductor de entrega |
| `customer` | Cliente que realiza pedidos |

#### Estados de usuario

| Estado | Descripción |
|--------|-------------|
| `pending` | Usuario registrado pero pendiente de verificación |
| `active` | Usuario activo y verificado |
| `inactive` | Usuario temporalmente inactivo |
| `suspended` | Usuario suspendido por violaciones |
| `deleted` | Usuario eliminado (soft delete) |

#### Testing con Postman

1. **Headers requeridos**:
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

2. **Ejemplo de request**:
   ```
   GET {{base_url}}/api/admin/users?role=driver&status=active&page=1&pageSize=10
   ```

3. **Variables de entorno recomendadas**:
   ```
   base_url: http://localhost:3000
   admin_token: <token_de_admin>
   ```

#### Casos de uso comunes

1. **Gestión de conductores**: Listar y filtrar conductores por estado
2. **Supervisión de propietarios**: Revisar propietarios de restaurantes
3. **Análisis de usuarios**: Obtener estadísticas de usuarios por rol
4. **Moderación**: Identificar usuarios suspendidos o pendientes
5. **Auditoría**: Revisar la actividad de usuarios administrativos

---

### POST /api/admin/users

Crea un nuevo usuario y le asigna un rol específico. Ideal para dar de alta personal, propietarios de restaurantes o conductores.

#### Autenticación
- **Requerida**: Sí
- **Roles permitidos**: `super_admin`, `platform_manager`
- **Header**: `Authorization: Bearer <token>`

#### Cuerpo de la petición

| Campo | Tipo | Descripción | Validaciones | Requerido |
|-------|------|-------------|--------------|-----------|
| `name` | string | Nombre del usuario | 2-100 caracteres | Sí |
| `lastname` | string | Apellido del usuario | 2-100 caracteres | Sí |
| `email` | string | Correo electrónico | Email válido, único | Sí |
| `phone` | string | Número de teléfono | Teléfono mexicano válido, único | Sí |
| `password` | string | Contraseña del usuario | 8+ caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 especial | Sí |
| `roleName` | string | Rol a asignar al usuario | Ver lista de roles válidos | Sí |
| `restaurantId` | integer | ID del restaurante (opcional) | Número entero > 0 | No |
| `branchId` | integer | ID de la sucursal (opcional) | Número entero > 0 | No |

#### Ejemplos de uso

```bash
# Crear un propietario de restaurante
POST /api/admin/users
{
  "name": "Juan",
  "lastname": "Pérez",
  "email": "juan.perez@restaurante.com",
  "phone": "+525512345678",
  "password": "MiPassword123!",
  "roleName": "owner",
  "restaurantId": 1
}

# Crear un conductor de plataforma
POST /api/admin/users
{
  "name": "María",
  "lastname": "González",
  "email": "maria.gonzalez@example.com",
  "phone": "+525512345679",
  "password": "ConductorPass456!",
  "roleName": "driver_platform"
}

# Crear personal de cocina para una sucursal específica
POST /api/admin/users
{
  "name": "Carlos",
  "lastname": "López",
  "email": "carlos.lopez@restaurante.com",
  "phone": "+525512345680",
  "password": "CocinaPass789!",
  "roleName": "kitchen_staff",
  "restaurantId": 1,
  "branchId": 2
}

# Crear un cliente
POST /api/admin/users
{
  "name": "Ana",
  "lastname": "Martínez",
  "email": "ana.martinez@example.com",
  "phone": "+525512345681",
  "password": "ClientePass321!",
  "roleName": "customer"
}
```

#### Respuesta exitosa (201 Created)

```json
{
  "status": "success",
  "message": "Usuario creado exitosamente",
  "data": {
    "user": {
      "id": 15,
      "name": "Juan",
      "lastname": "Pérez",
      "fullName": "Juan Pérez",
      "email": "juan.perez@restaurante.com",
      "phone": "+525512345678",
      "imageUrl": null,
      "notificationToken": null,
      "status": "active",
      "emailVerifiedAt": "2024-01-01T12:00:00.000Z",
      "phoneVerifiedAt": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "roles": [
        {
          "assignmentId": 25,
          "roleId": 3,
          "roleName": "owner",
          "roleDisplayName": "Propietario",
          "roleDescription": "Propietario de restaurante",
          "restaurantId": 1,
          "branchId": null,
          "restaurant": {
            "id": 1,
            "name": "Mi Restaurante",
            "status": "active"
          },
          "branch": null,
          "assignedAt": "2024-01-01T12:00:00.000Z"
        }
      ],
      "statistics": {
        "totalRestaurants": 0,
        "totalAddresses": 0,
        "totalOrdersAsCustomer": 0,
        "totalOrdersAsDriver": 0
      }
    },
    "createdBy": {
      "userId": 2,
      "userName": "Admin User",
      "userEmail": "admin@delixmi.com"
    },
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Respuestas de error

**400 Bad Request** - Datos de entrada inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "La contraseña debe contener al menos: 1 letra minúscula, 1 mayúscula, 1 número y 1 carácter especial",
      "param": "password",
      "location": "body"
    }
  ]
}
```

**400 Bad Request** - Rol no encontrado
```json
{
  "status": "error",
  "message": "Rol no encontrado",
  "code": "ROLE_NOT_FOUND",
  "roleName": "invalid_role"
}
```

**400 Bad Request** - Restaurante no encontrado
```json
{
  "status": "error",
  "message": "Restaurante no encontrado",
  "code": "RESTAURANT_NOT_FOUND",
  "restaurantId": 999
}
```

**400 Bad Request** - Sucursal no encontrada
```json
{
  "status": "error",
  "message": "Sucursal no encontrada",
  "code": "BRANCH_NOT_FOUND",
  "branchId": 999
}
```

**400 Bad Request** - Sucursal no pertenece al restaurante
```json
{
  "status": "error",
  "message": "La sucursal no pertenece al restaurante especificado",
  "code": "BRANCH_RESTAURANT_MISMATCH",
  "branchId": 2,
  "restaurantId": 1
}
```

**409 Conflict** - Usuario ya existe
```json
{
  "status": "error",
  "message": "Ya existe un usuario con este correo electrónico",
  "code": "USER_EXISTS",
  "field": "email",
  "value": "juan.perez@restaurante.com"
}
```

**401 Unauthorized** - Token no proporcionado o inválido
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden** - Permisos insuficientes
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["super_admin", "platform_manager"],
  "current": ["customer"]
}
```

**500 Internal Server Error** - Error interno del servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor al crear el usuario"
}
```

#### Testing con Postman

1. **Headers requeridos**:
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

2. **Ejemplo de request**:
   ```
   POST {{base_url}}/api/admin/users
   
   Body (JSON):
   {
     "name": "Juan",
     "lastname": "Pérez",
     "email": "juan.perez@restaurante.com",
     "phone": "+525512345678",
     "password": "MiPassword123!",
     "roleName": "owner",
     "restaurantId": 1
   }
   ```

3. **Variables de entorno recomendadas**:
   ```
   base_url: http://localhost:3000
   admin_token: <token_de_admin>
   ```

#### Casos de uso comunes

1. **Alta de propietarios**: Crear cuentas para nuevos propietarios de restaurantes
2. **Personal de restaurante**: Dar de alta empleados (cocina, administradores, etc.)
3. **Conductores**: Registrar nuevos conductores de plataforma o restaurante
4. **Clientes corporativos**: Crear cuentas para clientes empresariales
5. **Personal administrativo**: Dar de alta nuevos administradores de plataforma

#### Notas importantes

1. **Verificación automática**: Los usuarios creados por administradores se marcan como verificados automáticamente
2. **Estado activo**: Los usuarios se crean con estado `active` por defecto
3. **Transacción atómica**: La creación del usuario y asignación de rol se realizan en una sola transacción
4. **Validaciones de integridad**: Se valida que restaurantes y sucursales existan y sean consistentes
5. **Contraseñas seguras**: Se requieren contraseñas con complejidad específica y se hashean con bcrypt

---

### PATCH /api/admin/users/:id

Actualiza la información de un usuario específico. Útil para corregir datos, suspender cuentas o cambiar estados.

#### Autenticación
- **Requerida**: Sí
- **Roles permitidos**: `super_admin`, `platform_manager`
- **Header**: `Authorization: Bearer <token>`

#### Parámetros de ruta

| Parámetro | Tipo | Descripción | Requerido |
|-----------|------|-------------|-----------|
| `id` | integer | ID del usuario a actualizar | Sí |

#### Cuerpo de la petición (todos los campos son opcionales)

| Campo | Tipo | Descripción | Validaciones | Requerido |
|-------|------|-------------|--------------|-----------|
| `name` | string | Nombre del usuario | 2-100 caracteres | No |
| `lastname` | string | Apellido del usuario | 2-100 caracteres | No |
| `status` | string | Estado del usuario | `pending`, `active`, `inactive`, `suspended`, `deleted` | No |

#### Ejemplos de uso

```bash
# Corregir el nombre de un usuario
PATCH /api/admin/users/15
{
  "name": "Juan Carlos",
  "lastname": "Pérez González"
}

# Suspender una cuenta
PATCH /api/admin/users/15
{
  "status": "suspended"
}

# Reactivar una cuenta suspendida
PATCH /api/admin/users/15
{
  "status": "active"
}

# Actualizar múltiples campos
PATCH /api/admin/users/15
{
  "name": "Juan Carlos",
  "lastname": "Pérez González",
  "status": "inactive"
}
```

#### Respuesta exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Usuario actualizado exitosamente",
  "data": {
    "user": {
      "id": 15,
      "name": "Juan Carlos",
      "lastname": "Pérez González",
      "fullName": "Juan Carlos Pérez González",
      "email": "juan.perez@restaurante.com",
      "phone": "+525512345678",
      "imageUrl": null,
      "notificationToken": null,
      "status": "active",
      "emailVerifiedAt": "2024-01-01T12:00:00.000Z",
      "phoneVerifiedAt": "2024-01-01T12:00:00.000Z",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T14:30:00.000Z",
      "roles": [
        {
          "assignmentId": 25,
          "roleId": 3,
          "roleName": "owner",
          "roleDisplayName": "Propietario",
          "roleDescription": "Propietario de restaurante",
          "restaurantId": 1,
          "branchId": null,
          "restaurant": {
            "id": 1,
            "name": "Mi Restaurante",
            "status": "active"
          },
          "branch": null,
          "assignedAt": "2024-01-01T12:00:00.000Z"
        }
      ],
      "driverProfile": null,
      "statistics": {
        "totalRestaurants": 1,
        "totalAddresses": 2,
        "totalOrdersAsCustomer": 15,
        "totalOrdersAsDriver": 0
      }
    },
    "changes": {
      "updatedFields": {
        "name": {
          "previous": "Juan",
          "current": "Juan Carlos"
        },
        "lastname": {
          "previous": "Pérez",
          "current": "Pérez González"
        }
      },
      "updatedBy": {
        "userId": 2,
        "userName": "Admin User",
        "userEmail": "admin@delixmi.com"
      },
      "updatedAt": "2024-01-01T14:30:00.000Z"
    }
  }
}
```

#### Respuestas de error

**400 Bad Request** - Datos de entrada inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El nombre debe tener entre 2 y 100 caracteres",
      "param": "name",
      "location": "body"
    }
  ]
}
```

**400 Bad Request** - No hay cambios para actualizar
```json
{
  "status": "error",
  "message": "No se proporcionaron cambios para actualizar",
  "code": "NO_CHANGES",
  "currentData": {
    "id": 15,
    "name": "Juan",
    "lastname": "Pérez",
    "status": "active"
  }
}
```

**403 Forbidden** - Super administrador protegido
```json
{
  "status": "error",
  "message": "No se puede modificar la información de un super administrador",
  "code": "SUPER_ADMIN_PROTECTED",
  "userId": 1
}
```

**404 Not Found** - Usuario no encontrado
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**401 Unauthorized** - Token no proporcionado o inválido
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden** - Permisos insuficientes
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["super_admin", "platform_manager"],
  "current": ["customer"]
}
```

**500 Internal Server Error** - Error interno del servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor al actualizar el usuario"
}
```

#### Testing con Postman

1. **Headers requeridos**:
   ```
   Authorization: Bearer <tu_token_jwt>
   Content-Type: application/json
   ```

2. **Ejemplo de request**:
   ```
   PATCH {{base_url}}/api/admin/users/15
   
   Body (JSON):
   {
     "name": "Juan Carlos",
     "status": "suspended"
   }
   ```

3. **Variables de entorno recomendadas**:
   ```
   base_url: http://localhost:3000
   admin_token: <token_de_admin>
   user_id: 15
   ```

#### Casos de uso comunes

1. **Corrección de datos**: Actualizar nombres o apellidos incorrectos
2. **Gestión de estados**: Suspender o reactivar cuentas de usuarios
3. **Moderación**: Cambiar estado de usuarios problemáticos
4. **Mantenimiento**: Actualizar información de contacto
5. **Auditoría**: Registrar cambios realizados por administradores

#### Notas importantes

1. **Protección de super_admin**: No se puede modificar usuarios con rol de super administrador
2. **Actualización selectiva**: Solo se actualizan los campos proporcionados
3. **Auditoría completa**: Se registra quién realizó los cambios y qué campos se modificaron
4. **Validación de cambios**: Se verifica que haya cambios reales antes de actualizar
5. **Estados válidos**: Los estados deben ser uno de los valores permitidos en el enum
