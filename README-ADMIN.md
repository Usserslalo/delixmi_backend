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
