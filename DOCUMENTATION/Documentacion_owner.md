# Documentación del Panel de Owner - Delixmi Backend

Esta documentación es la única fuente de verdad para entender cómo funciona el panel del Owner en Delixmi. Todos los endpoints están documentados siguiendo un formato estricto para garantizar consistencia y claridad.

## 1. Iniciar Sesión

Endpoint de autenticación para acceder al panel del Owner. Debe ser el primer paso en cualquier flujo de la aplicación.

- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Rol Requerido:** `public`

#### Headers
```
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "email": "string // Email del usuario (requerido)",
  "password": "string // Contraseña del usuario (requerido)"
}
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": 1,
      "name": "Ana",
      "lastname": "García",
      "email": "ana.garcia@pizzeria.com",
      "status": "active",
      "roles": [
        {
          "roleId": 4,
          "roleName": "owner",
          "roleDisplayName": "Dueño de Restaurante",
          "restaurantId": 1,
          "branchId": null
        }
      ]
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
}
```

#### Error Responses
**400 - Datos de entrada inválidos**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "Debe ser un email válido",
      "param": "email"
    }
  ]
}
```

**401 - Credenciales inválidas**
```json
{
  "status": "error",
  "message": "Credenciales inválidas",
  "code": "INVALID_CREDENTIALS"
}
```

**429 - Demasiados intentos**
```json
{
  "status": "error",
  "message": "Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

---

## 2. Obtener Perfil del Restaurante

Obtiene toda la información del restaurante del Owner autenticado, incluyendo datos básicos, estadísticas y configuración.

- **Method:** `GET`
- **Endpoint:** `/api/restaurant/profile`
- **Rol Requerido:** `owner`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Perfil del restaurante obtenido exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la región",
      "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
      "coverPhotoUrl": "https://example.com/covers/pizzeria-ana-cover.jpg",
      "phone": "+52 1 23 4567 8900",
      "email": "contacto@pizzeria-ana.com",
      "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
      "status": "active",
      "owner": {
        "id": 2,
        "name": "Ana",
        "lastname": "García",
        "email": "ana.garcia@pizzeria.com",
        "phone": "+52 1 23 4567 8901"
      },
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "phone": "+52 1 23 4567 8900",
          "status": "active",
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-20T14:22:00.000Z"
        }
      ],
      "statistics": {
        "totalBranches": 1,
        "totalSubcategories": 5,
        "totalProducts": 12
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:22:00.000Z"
    }
  }
}
```

#### Error Responses
**401 - No autorizado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 - Permisos insuficientes**
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

---

## 3. Actualizar Perfil del Restaurante

Permite al Owner actualizar la información básica de su restaurante, incluyendo nombre, descripción, logo y foto de portada.

- **Method:** `PATCH`
- **Endpoint:** `/api/restaurant/profile`
- **Rol Requerido:** `owner`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "name": "string // Nombre del restaurante (opcional, 1-150 caracteres)",
  "description": "string // Descripción del restaurante (opcional, máximo 1000 caracteres)",
  "logoUrl": "string // URL del logo del restaurante (opcional, máximo 255 caracteres, debe ser URL válida, incluye localhost para desarrollo)",
  "coverPhotoUrl": "string // URL de la foto de portada (opcional, máximo 255 caracteres, debe ser URL válida, incluye localhost para desarrollo)"
}
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Perfil del restaurante actualizado exitosamente",
  "data": {
    "id": 1,
    "name": "Pizzería de Ana - Actualizada",
    "description": "Las mejores pizzas artesanales de la región con ingredientes frescos",
    "logoUrl": "https://example.com/logos/pizzeria-ana-new.jpg",
    "coverPhotoUrl": "https://example.com/covers/pizzeria-ana-cover-new.jpg",
    "commissionRate": 12.50,
    "rating": 4.5,
    "status": "active",
    "updatedAt": "2024-01-20T15:30:00.000Z"
  }
}
```

#### Error Responses
**400 - Datos de entrada inválidos**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El nombre debe tener entre 1 y 150 caracteres",
      "param": "name"
    }
  ]
}
```

**401 - No autorizado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

---

## 4. Obtener Lista de Sucursales

Obtiene todas las sucursales del restaurante del Owner autenticado con opciones de filtrado y paginación.

- **Method:** `GET`
- **Endpoint:** `/api/restaurant/branches`
- **Rol Requerido:** `owner`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `status` (string, opcional): Filtrar por estado de la sucursal (`active`, `inactive`)
- `page` (integer, opcional): Número de página (default: 1)
- `pageSize` (integer, opcional): Tamaño de página (default: 20, máximo: 100)

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Sucursales obtenidas exitosamente",
  "data": {
    "branches": [
      {
        "id": 1,
        "name": "Sucursal Centro",
        "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
        "latitude": 20.484123,
        "longitude": -99.216345,
        "phone": "7711234567",
        "usesPlatformDrivers": true,
        "status": "active",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-20T14:22:00.000Z"
      },
      {
        "id": 2,
        "name": "Sucursal Río",
        "address": "Paseo del Roble 205, Barrio del Río, Ixmiquilpan, Hgo.",
        "latitude": 20.475890,
        "longitude": -99.225678,
        "phone": "7717654321",
        "usesPlatformDrivers": true,
        "status": "active",
        "createdAt": "2024-01-15T11:00:00.000Z",
        "updatedAt": "2024-01-20T14:22:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 2,
      "itemsPerPage": 20
    }
  }
}
```

#### Error Responses
**400 - Parámetros de consulta inválidos**
```json
{
  "status": "error",
  "message": "Parámetros de consulta inválidos",
  "errors": [
    {
      "msg": "El estado debe ser \"active\" o \"inactive\"",
      "param": "status"
    }
  ]
}
```

**401 - No autorizado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

---

## 5. Crear Nueva Sucursal

Crea una nueva sucursal para el restaurante del Owner autenticado con toda la información necesaria.

- **Method:** `POST`
- **Endpoint:** `/api/restaurant/branches`
- **Rol Requerido:** `owner`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "name": "string // Nombre de la sucursal (requerido, 1-150 caracteres)",
  "address": "string // Dirección completa de la sucursal (requerido, 10-500 caracteres)",
  "latitude": "number // Latitud de la ubicación (requerido, -90 a 90)",
  "longitude": "number // Longitud de la ubicación (requerido, -180 a 180)",
  "phone": "string // Teléfono de la sucursal (opcional, 10-20 caracteres)",
  "openingTime": "string // Hora de apertura en formato HH:MM:SS (opcional)",
  "closingTime": "string // Hora de cierre en formato HH:MM:SS (opcional)",
  "usesPlatformDrivers": "boolean // Si usa repartidores de la plataforma (opcional, default: true)"
}
```

#### Success Response (201)
```json
{
  "status": "success",
  "message": "Sucursal creada exitosamente",
  "data": {
    "id": 3,
    "name": "Sucursal Norte",
    "address": "Av. Hidalgo 150, Zona Norte, Ixmiquilpan, Hgo.",
    "latitude": 20.500000,
    "longitude": -99.200000,
    "phone": "7719998888",
    "usesPlatformDrivers": true,
    "status": "active",
    "createdAt": "2024-01-20T16:00:00.000Z",
    "updatedAt": "2024-01-20T16:00:00.000Z"
  }
}
```

#### Error Responses
**400 - Datos de entrada inválidos**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El nombre de la sucursal es requerido",
      "param": "name"
    }
  ]
}
```

**401 - No autorizado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

---

## 6. Actualizar Sucursal Existente

Permite al Owner actualizar la información de una sucursal existente de su restaurante.

- **Method:** `PATCH`
- **Endpoint:** `/api/restaurant/branches/:branchId`
- **Rol Requerido:** `owner`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### URL Parameters
- `branchId` (integer): ID de la sucursal a actualizar

#### Request Body (JSON)
```json
{
  "name": "string // Nombre de la sucursal (opcional, 1-150 caracteres)",
  "address": "string // Dirección de la sucursal (opcional, 10-500 caracteres)",
  "latitude": "number // Latitud de la ubicación (opcional, -90 a 90)",
  "longitude": "number // Longitud de la ubicación (opcional, -180 a 180)",
  "phone": "string // Teléfono de la sucursal (opcional, 10-20 caracteres)",
  "openingTime": "string // Hora de apertura en formato HH:MM:SS (opcional)",
  "closingTime": "string // Hora de cierre en formato HH:MM:SS (opcional)",
  "usesPlatformDrivers": "boolean // Si usa repartidores de la plataforma (opcional)"
}
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Sucursal actualizada exitosamente",
  "data": {
    "id": 1,
    "name": "Sucursal Centro - Actualizada",
    "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
    "latitude": 20.484123,
    "longitude": -99.216345,
    "phone": "7711234567",
    "usesPlatformDrivers": true,
    "status": "active",
    "updatedAt": "2024-01-20T17:00:00.000Z"
  }
}
```

#### Error Responses
**400 - Datos de entrada inválidos**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El ID de la sucursal debe ser un número entero válido",
      "param": "branchId"
    }
  ]
}
```

**404 - Sucursal no encontrada**
```json
{
  "status": "error",
  "message": "Sucursal no encontrada",
  "code": "BRANCH_NOT_FOUND"
}
```

**401 - No autorizado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

---

## 7. Eliminar Sucursal

Elimina permanentemente una sucursal del restaurante del Owner autenticado.

- **Method:** `DELETE`
- **Endpoint:** `/api/restaurant/branches/:branchId`
- **Rol Requerido:** `owner`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `branchId` (integer): ID de la sucursal a eliminar

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Sucursal eliminada exitosamente",
  "data": {
    "id": 3,
    "name": "Sucursal Norte",
    "deletedAt": "2024-01-20T18:00:00.000Z"
  }
}
```

#### Error Responses
**400 - Parámetros de entrada inválidos**
```json
{
  "status": "error",
  "message": "Parámetros de entrada inválidos",
  "errors": [
    {
      "msg": "El ID de la sucursal debe ser un número entero válido",
      "param": "branchId"
    }
  ]
}
```

**404 - Sucursal no encontrada**
```json
{
  "status": "error",
  "message": "Sucursal no encontrada",
  "code": "BRANCH_NOT_FOUND"
}
```

**409 - Sucursal con pedidos activos**
```json
{
  "status": "error",
  "message": "No se puede eliminar la sucursal porque tiene pedidos activos",
  "code": "BRANCH_HAS_ACTIVE_ORDERS"
}
```

**401 - No autorizado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

---

## Notas Importantes para el Desarrollador Frontend

### Autenticación
- Todos los endpoints (excepto login) requieren el header `Authorization: Bearer <token>`
- El token JWT tiene una duración de 24 horas
- Si el token expira, el usuario debe volver a iniciar sesión

### Manejo de Errores
- Todos los errores siguen el mismo formato con `status`, `message` y opcionalmente `code`
- Los errores de validación incluyen un array `errors` con detalles específicos
- Los códigos de estado HTTP son consistentes: 200 (éxito), 201 (creado), 400 (error de validación), 401 (no autorizado), 404 (no encontrado), 409 (conflicto)

### Paginación
- Los endpoints que devuelven listas incluyen información de paginación
- Usar los parámetros `page` y `pageSize` para controlar la paginación
- El `pageSize` máximo es 100

### Validaciones
- Todos los campos tienen validaciones estrictas documentadas
- Los errores de validación se devuelven con detalles específicos del campo
- Las URLs deben ser válidas para campos de imagen

---

## 🎛️ Gestión de Grupos de Modificadores

### 1. Crear Grupo de Modificadores

**Endpoint:** `POST /api/restaurant/modifier-groups`

**Descripción:** Crea un nuevo grupo de modificadores para el restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Tamaño de Pizza",
  "minSelection": 1,
  "maxSelection": 1
}
```

**Campos del Body:**
- `name` (string, requerido): Nombre del grupo de modificadores (1-100 caracteres)
- `minSelection` (integer, opcional): Selección mínima permitida (0-10, default: 1)
- `maxSelection` (integer, opcional): Selección máxima permitida (1-10, default: 1)

**Respuesta Exitosa (201):**
```json
{
  "status": "success",
  "message": "Grupo de modificadores creado exitosamente",
  "data": {
    "modifierGroup": {
      "id": 1,
      "name": "Tamaño de Pizza",
      "minSelection": 1,
      "maxSelection": 1,
      "restaurantId": 1,
      "options": [],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos
- `403`: Permisos insuficientes
- `500`: Error interno del servidor

---

### 2. Obtener Grupos de Modificadores

**Endpoint:** `GET /api/restaurant/modifier-groups`

**Descripción:** Obtiene todos los grupos de modificadores del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Grupos de modificadores obtenidos exitosamente",
  "data": {
    "modifierGroups": [
      {
        "id": 1,
        "name": "Tamaño de Pizza",
        "minSelection": 1,
        "maxSelection": 1,
        "restaurantId": 1,
        "options": [
          {
            "id": 1,
            "name": "Personal (6 pulgadas)",
            "price": 0.00,
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          },
          {
            "id": 2,
            "name": "Mediana (10 pulgadas)",
            "price": 25.00,
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          }
        ],
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

**Errores Posibles:**
- `403`: Permisos insuficientes
- `500`: Error interno del servidor

---

### 3. Actualizar Grupo de Modificadores

**Endpoint:** `PATCH /api/restaurant/modifier-groups/:groupId`

**Descripción:** Actualiza un grupo de modificadores existente del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros de URL:**
- `groupId` (integer): ID del grupo de modificadores a actualizar

**Body:**
```json
{
  "name": "Tamaño de Pizza Actualizado",
  "minSelection": 1,
  "maxSelection": 2
}
```

**Campos del Body (todos opcionales):**
- `name` (string): Nuevo nombre del grupo (1-100 caracteres)
- `minSelection` (integer): Nueva selección mínima (0-10)
- `maxSelection` (integer): Nueva selección máxima (1-10)

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Grupo de modificadores actualizado exitosamente",
  "data": {
    "modifierGroup": {
      "id": 1,
      "name": "Tamaño de Pizza Actualizado",
      "minSelection": 1,
      "maxSelection": 2,
      "restaurantId": 1,
      "options": [
        {
          "id": 1,
          "name": "Personal (6 pulgadas)",
          "price": 0.00,
          "createdAt": "2024-01-15T10:30:00.000Z",
          "updatedAt": "2024-01-15T10:30:00.000Z"
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "updatedFields": ["name", "maxSelection"]
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos o sin campos para actualizar
- `403`: Permisos insuficientes
- `404`: Grupo de modificadores no encontrado
- `500`: Error interno del servidor

---

### 4. Eliminar Grupo de Modificadores

**Endpoint:** `DELETE /api/restaurant/modifier-groups/:groupId`

**Descripción:** Elimina un grupo de modificadores del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros de URL:**
- `groupId` (integer): ID del grupo de modificadores a eliminar

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Grupo de modificadores eliminado exitosamente",
  "data": {
    "deletedGroup": {
      "id": 1,
      "name": "Tamaño de Pizza",
      "deletedAt": "2024-01-15T10:40:00.000Z"
    }
  }
}
```

**Errores Posibles:**
- `400`: ID de grupo inválido
- `403`: Permisos insuficientes
- `404`: Grupo de modificadores no encontrado
- `409`: Grupo tiene opciones asociadas o está asociado a productos
- `500`: Error interno del servidor

**Notas Importantes:**
- No se puede eliminar un grupo que tenga opciones asociadas
- No se puede eliminar un grupo que esté asociado a productos
- El grupo debe pertenecer al restaurante del owner autenticado

---

### Validaciones de Grupos de Modificadores
- **Nombre**: Requerido, entre 1 y 100 caracteres
- **Selección mínima**: Entero entre 0 y 10
- **Selección máxima**: Entero entre 1 y 10
- **Validación de rango**: La selección mínima no puede ser mayor que la máxima
- **Autorización**: Solo owners y branch managers pueden gestionar grupos de modificadores
- **Propiedad**: Los grupos solo pueden ser gestionados por el restaurante al que pertenecen

---

## ⚙️ Gestión de Opciones de Modificadores

### 1. Crear Opción de Modificador

**Endpoint:** `POST /api/restaurant/modifier-groups/:groupId/options`

**Descripción:** Crea una nueva opción de modificador dentro de un grupo específico del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros de URL:**
- `groupId` (integer): ID del grupo de modificadores al que pertenecerá la opción

**Body:**
```json
{
  "name": "Personal (6 pulgadas)",
  "price": 0.00
}
```

**Campos del Body:**
- `name` (string, requerido): Nombre de la opción de modificador (1-100 caracteres)
- `price` (decimal, requerido): Precio de la opción (mayor o igual a 0)

**Respuesta Exitosa (201):**
```json
{
  "status": "success",
  "message": "Opción de modificador creada exitosamente",
  "data": {
    "modifierOption": {
      "id": 1,
      "name": "Personal (6 pulgadas)",
      "price": 0.00,
      "modifierGroupId": 1,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos
- `403`: Permisos insuficientes
- `404`: Grupo de modificadores no encontrado
- `500`: Error interno del servidor

---

### 2. Actualizar Opción de Modificador

**Endpoint:** `PATCH /api/restaurant/modifier-options/:optionId`

**Descripción:** Actualiza una opción de modificador existente del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros de URL:**
- `optionId` (integer): ID de la opción de modificador a actualizar

**Body:**
```json
{
  "name": "Personal (6 pulgadas) - Actualizado",
  "price": 5.00
}
```

**Campos del Body (todos opcionales):**
- `name` (string): Nuevo nombre de la opción (1-100 caracteres)
- `price` (decimal): Nuevo precio de la opción (mayor o igual a 0)

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Opción de modificador actualizada exitosamente",
  "data": {
    "modifierOption": {
      "id": 1,
      "name": "Personal (6 pulgadas) - Actualizado",
      "price": 5.00,
      "modifierGroupId": 1,
      "modifierGroup": {
        "id": 1,
        "name": "Tamaño de Pizza",
        "restaurantId": 1
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "updatedFields": ["name", "price"]
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos o sin campos para actualizar
- `403`: Permisos insuficientes
- `404`: Opción de modificador no encontrada
- `500`: Error interno del servidor

---

### 3. Eliminar Opción de Modificador

**Endpoint:** `DELETE /api/restaurant/modifier-options/:optionId`

**Descripción:** Elimina una opción de modificador del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros de URL:**
- `optionId` (integer): ID de la opción de modificador a eliminar

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Opción de modificador eliminada exitosamente",
  "data": {
    "deletedOption": {
      "id": 1,
      "name": "Personal (6 pulgadas)",
      "price": 0.00,
      "modifierGroupId": 1,
      "deletedAt": "2024-01-15T10:40:00.000Z"
    }
  }
}
```

**Errores Posibles:**
- `400`: ID de opción inválido
- `403`: Permisos insuficientes
- `404`: Opción de modificador no encontrada
- `500`: Error interno del servidor

**Notas Importantes:**
- La opción debe pertenecer a un grupo del restaurante del owner autenticado
- No hay restricciones de integridad referencial para eliminar opciones

---

### Validaciones de Opciones de Modificadores
- **Nombre**: Requerido, entre 1 y 100 caracteres
- **Precio**: Requerido, decimal mayor o igual a 0
- **Autorización**: Solo owners y branch managers pueden gestionar opciones de modificadores
- **Propiedad**: Las opciones solo pueden ser gestionadas si pertenecen a grupos del restaurante del usuario
- **Validación de grupo**: El grupo padre debe existir y pertenecer al restaurante del usuario

---

## 🍕 Gestión de Productos

### 1. Crear Producto

**Endpoint:** `POST /api/restaurant/products`

**Descripción:** Crea un nuevo producto en el menú del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "subcategoryId": 1,
  "name": "Pizza Hawaiana",
  "description": "Pizza con jamón, piña y queso mozzarella",
  "imageUrl": "https://example.com/images/pizza-hawaiana.jpg",
  "price": 150.00,
  "isAvailable": true,
  "modifierGroupIds": [1, 2, 3]
}
```

**Campos del Body:**
- `subcategoryId` (integer, requerido): ID de la subcategoría del producto
- `name` (string, requerido): Nombre del producto (1-150 caracteres)
- `description` (string, opcional): Descripción del producto
- `imageUrl` (string, opcional): URL de la imagen del producto
- `price` (decimal, requerido): Precio del producto (mayor a 0)
- `isAvailable` (boolean, opcional): Disponibilidad del producto (default: true)
- `modifierGroupIds` (array, opcional): Array de IDs de grupos de modificadores a asociar

**Respuesta Exitosa (201):**
```json
{
  "status": "success",
  "message": "Producto creado exitosamente",
  "data": {
    "product": {
      "id": 1,
      "name": "Pizza Hawaiana",
      "description": "Pizza con jamón, piña y queso mozzarella",
      "imageUrl": "https://example.com/images/pizza-hawaiana.jpg",
      "price": 150.00,
      "isAvailable": true,
      "subcategory": {
        "id": 1,
        "name": "Pizzas",
        "category": {
          "id": 1,
          "name": "Comida"
        }
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      "modifierGroups": [
        {
          "id": 1,
          "name": "Tamaño",
          "minSelection": 1,
          "maxSelection": 1,
          "options": [
            {
              "id": 1,
              "name": "Personal (6 pulgadas)",
              "price": 0.00
            },
            {
              "id": 2,
              "name": "Mediana (10 pulgadas)",
              "price": 25.00
            }
          ]
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos o grupos de modificadores inválidos
- `403`: Permisos insuficientes
- `404`: Subcategoría no encontrada
- `500`: Error interno del servidor

---

### 2. Actualizar Producto

**Endpoint:** `PATCH /api/restaurant/products/:productId`

**Descripción:** Actualiza un producto existente del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros de URL:**
- `productId` (integer): ID del producto a actualizar

**Body:**
```json
{
  "name": "Pizza Hawaiana Especial",
  "price": 175.00,
  "modifierGroupIds": [1, 2]
}
```

**Campos del Body (todos opcionales):**
- `subcategoryId` (integer): Nueva subcategoría del producto
- `name` (string): Nuevo nombre del producto (1-150 caracteres)
- `description` (string): Nueva descripción del producto
- `imageUrl` (string): Nueva URL de la imagen del producto
- `price` (decimal): Nuevo precio del producto (mayor a 0)
- `isAvailable` (boolean): Nueva disponibilidad del producto
- `modifierGroupIds` (array): Array de IDs de grupos de modificadores (reemplaza asociaciones existentes)

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Producto actualizado exitosamente",
  "data": {
    "product": {
      "id": 1,
      "name": "Pizza Hawaiana Especial",
      "description": "Pizza con jamón, piña y queso mozzarella",
      "imageUrl": "https://example.com/images/pizza-hawaiana.jpg",
      "price": 175.00,
      "isAvailable": true,
      "subcategory": {
        "id": 1,
        "name": "Pizzas",
        "category": {
          "id": 1,
          "name": "Comida"
        }
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      "modifierGroups": [
        {
          "id": 1,
          "name": "Tamaño",
          "minSelection": 1,
          "maxSelection": 1,
          "options": [
            {
              "id": 1,
              "name": "Personal (6 pulgadas)",
              "price": 0.00
            }
          ]
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "updatedFields": ["name", "price", "modifierGroupIds"]
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos o sin campos para actualizar
- `403`: Permisos insuficientes
- `404`: Producto no encontrado
- `500`: Error interno del servidor

**Notas Importantes:**
- El campo `modifierGroupIds` reemplaza completamente las asociaciones existentes
- Para eliminar todas las asociaciones, enviar un array vacío `[]`
- Para mantener las asociaciones existentes, no incluir el campo `modifierGroupIds`
- Los grupos de modificadores deben pertenecer al mismo restaurante del producto

---

### Validaciones de Productos
- **Subcategoría**: Debe existir y pertenecer al restaurante del usuario
- **Nombre**: Requerido, entre 1 y 150 caracteres
- **Precio**: Requerido, decimal mayor a 0
- **Grupos de modificadores**: Array opcional de IDs válidos del restaurante
- **Autorización**: Solo owners y branch managers pueden gestionar productos
- **Propiedad**: Los productos solo pueden ser gestionados por el restaurante propietario

---

## 📸 Subida de Imágenes

### 1. Subir Logo del Restaurante

**Endpoint:** `POST /api/restaurant/uploads/logo`

**Descripción:** Sube una imagen de logo para el restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `image` (file, requerido): Archivo de imagen del logo (JPG, JPEG, PNG, máximo 5MB)

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Logo subido exitosamente",
  "data": {
    "logoUrl": "http://localhost:3000/uploads/logos/logo_1704123456789_1234.jpg",
    "filename": "logo_1704123456789_1234.jpg",
    "originalName": "mi-logo.jpg",
    "size": 245760,
    "mimetype": "image/jpeg"
  }
}
```

**Errores Posibles:**
- `400`: No se proporcionó archivo, archivo demasiado grande, tipo de archivo inválido
- `401`: Token de acceso requerido
- `403`: Permisos insuficientes
- `500`: Error interno del servidor

**Códigos de Error Específicos:**
- `NO_FILE_PROVIDED`: No se envió ningún archivo
- `FILE_TOO_LARGE`: El archivo excede el límite de 5MB
- `INVALID_FILE_TYPE`: El archivo no es una imagen válida (JPG, JPEG, PNG)
- `TOO_MANY_FILES`: Se envió más de un archivo

**Notas Importantes:**
- Solo se aceptan archivos de imagen en formato JPG, JPEG y PNG
- El tamaño máximo permitido es 5MB
- Solo se puede subir un archivo a la vez
- El archivo se guarda con un nombre único para evitar colisiones
- La URL devuelta puede ser usada directamente en el campo `logoUrl` del perfil del restaurante

**Ejemplo de Uso con cURL:**
```bash
curl -X POST \
  http://localhost:3000/api/restaurant/uploads/logo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/your/logo.jpg"
```

**Ejemplo de Uso con JavaScript (FormData):**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('/api/restaurant/uploads/logo', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Logo URL:', data.data.logoUrl);
  // Usar data.data.logoUrl para actualizar el perfil del restaurante
});
```

### 2. Subir Foto de Portada del Restaurante

**Endpoint:** `POST /api/restaurant/uploads/cover`

**Descripción:** Sube una imagen de portada para el restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `image` (file, requerido): Archivo de imagen de portada (JPG, JPEG, PNG, máximo 5MB)

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Foto de portada subida exitosamente",
  "data": {
    "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_1704123456789_1234.jpg",
    "filename": "cover_1704123456789_1234.jpg",
    "originalName": "mi-portada.jpg",
    "size": 512000,
    "mimetype": "image/jpeg"
  }
}
```

**Errores Posibles:**
- `400`: No se proporcionó archivo, archivo demasiado grande, tipo de archivo inválido
- `401`: Token de acceso requerido
- `403`: Permisos insuficientes
- `500`: Error interno del servidor

**Códigos de Error Específicos:**
- `NO_FILE_PROVIDED`: No se envió ningún archivo
- `FILE_TOO_LARGE`: El archivo excede el límite de 5MB
- `INVALID_FILE_TYPE`: El archivo no es una imagen válida (JPG, JPEG, PNG)
- `TOO_MANY_FILES`: Se envió más de un archivo

**Notas Importantes:**
- Solo se aceptan archivos de imagen en formato JPG, JPEG y PNG
- El tamaño máximo permitido es 5MB
- Solo se puede subir un archivo a la vez
- El archivo se guarda con un nombre único para evitar colisiones
- La URL devuelta puede ser usada directamente en el campo `coverPhotoUrl` del perfil del restaurante

**Ejemplo de Uso con cURL:**
```bash
curl -X POST \
  http://localhost:3000/api/restaurant/uploads/cover \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@/path/to/your/cover.jpg"
```

**Ejemplo de Uso con JavaScript (FormData):**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

fetch('/api/restaurant/uploads/cover', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Cover Photo URL:', data.data.coverPhotoUrl);
  // Usar data.data.coverPhotoUrl para actualizar el perfil del restaurante
});
```

---

## 🗓️ Gestión de Horarios de Sucursal

### 1. Obtener Horario de Sucursal

**Endpoint:** `GET /api/restaurant/branches/:branchId/schedule`

**Descripción:** Obtiene el horario semanal completo de una sucursal específica del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
```

**Parámetros de URL:**
- `branchId` (integer): ID de la sucursal

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Horario de sucursal obtenido exitosamente",
  "data": {
    "branch": {
      "id": 1,
      "name": "Sucursal Centro",
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      }
    },
    "schedules": [
      {
        "id": 1,
        "dayOfWeek": 0,
        "dayName": "Domingo",
        "openingTime": "00:00:00",
        "closingTime": "00:00:00",
        "isClosed": true
      },
      {
        "id": 2,
        "dayOfWeek": 1,
        "dayName": "Lunes",
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      },
      {
        "id": 3,
        "dayOfWeek": 2,
        "dayName": "Martes",
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      },
      {
        "id": 4,
        "dayOfWeek": 3,
        "dayName": "Miércoles",
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      },
      {
        "id": 5,
        "dayOfWeek": 4,
        "dayName": "Jueves",
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      },
      {
        "id": 6,
        "dayOfWeek": 5,
        "dayName": "Viernes",
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      },
      {
        "id": 7,
        "dayOfWeek": 6,
        "dayName": "Sábado",
        "openingTime": "11:00:00",
        "closingTime": "23:00:00",
        "isClosed": false
      }
    ]
  }
}
```

**Errores Posibles:**
- `400`: ID de sucursal inválido
- `401`: Token de acceso requerido
- `403`: Permisos insuficientes
- `404`: Sucursal no encontrada
- `500`: Error interno del servidor

---

### 2. Actualizar Horario de Sucursal

**Endpoint:** `PATCH /api/restaurant/branches/:branchId/schedule`

**Descripción:** Actualiza el horario semanal completo de una sucursal específica del restaurante del owner autenticado.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Parámetros de URL:**
- `branchId` (integer): ID de la sucursal

**Body:**
```json
[
  {
    "dayOfWeek": 0,
    "openingTime": "00:00:00",
    "closingTime": "00:00:00",
    "isClosed": true
  },
  {
    "dayOfWeek": 1,
    "openingTime": "09:00:00",
    "closingTime": "22:00:00",
    "isClosed": false
  },
  {
    "dayOfWeek": 2,
    "openingTime": "09:00:00",
    "closingTime": "22:00:00",
    "isClosed": false
  },
  {
    "dayOfWeek": 3,
    "openingTime": "09:00:00",
    "closingTime": "22:00:00",
    "isClosed": false
  },
  {
    "dayOfWeek": 4,
    "openingTime": "09:00:00",
    "closingTime": "22:00:00",
    "isClosed": false
  },
  {
    "dayOfWeek": 5,
    "openingTime": "09:00:00",
    "closingTime": "22:00:00",
    "isClosed": false
  },
  {
    "dayOfWeek": 6,
    "openingTime": "11:00:00",
    "closingTime": "23:00:00",
    "isClosed": false
  }
]
```

**Campos del Body:**
- Array de exactamente 7 objetos (uno por cada día de la semana)
- Cada objeto debe contener:
  - `dayOfWeek` (integer, requerido): Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
  - `openingTime` (string, requerido): Hora de apertura en formato "HH:MM:SS"
  - `closingTime` (string, requerido): Hora de cierre en formato "HH:MM:SS"
  - `isClosed` (boolean, requerido): Si la sucursal está cerrada ese día

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Horario de sucursal actualizado exitosamente",
  "data": {
    "branch": {
      "id": 1,
      "name": "Sucursal Centro",
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      }
    },
    "schedules": [
      {
        "id": 8,
        "dayOfWeek": 0,
        "dayName": "Domingo",
        "openingTime": "00:00:00",
        "closingTime": "00:00:00",
        "isClosed": true
      },
      {
        "id": 9,
        "dayOfWeek": 1,
        "dayName": "Lunes",
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      }
    ]
  }
}
```

**Errores Posibles:**
- `400`: Datos de entrada inválidos, horario inválido, o array no contiene exactamente 7 elementos
- `401`: Token de acceso requerido
- `403`: Permisos insuficientes
- `404`: Sucursal no encontrada
- `500`: Error interno del servidor

**Validaciones:**
- El array debe contener exactamente 7 objetos
- Los `dayOfWeek` deben ser únicos (0-6, sin duplicados)
- Cuando `isClosed` es `false`, `openingTime` debe ser anterior a `closingTime`
- Los formatos de tiempo deben ser válidos ("HH:MM:SS")

**Notas Importantes:**
- La actualización es atómica: se eliminan todos los horarios existentes y se crean los nuevos
- Solo owners y branch managers pueden gestionar horarios
- El horario se actualiza para toda la semana de una vez

---

## 🌐 Endpoints Públicos

### 1. Obtener Lista de Restaurantes

**Endpoint:** `GET /api/restaurants`

**Descripción:** Obtiene una lista paginada de todos los restaurantes activos con sus sucursales y estado de apertura.

**Parámetros de Query:**
- `page` (integer, opcional): Número de página (default: 1)
- `pageSize` (integer, opcional): Tamaño de página (default: 10, máximo: 100)

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana",
        "description": "Las mejores pizzas artesanales de la ciudad",
        "logoUrl": "https://example.com/logo.jpg",
        "coverPhotoUrl": "https://example.com/cover.jpg",
        "branches": [
          {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
            "latitude": 20.484123,
            "longitude": -99.216345,
            "phone": "7711234567",
            "usesPlatformDrivers": true,
            "isOpen": true,
            "schedule": [
              {
                "dayOfWeek": 0,
                "openingTime": "00:00:00",
                "closingTime": "00:00:00",
                "isClosed": true
              },
              {
                "dayOfWeek": 1,
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
              }
            ]
          }
        ]
      }
    ],
    "pagination": {
      "totalRestaurants": 2,
      "currentPage": 1,
      "pageSize": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Campos de Respuesta:**
- `restaurants`: Array de restaurantes activos
  - `id`: ID único del restaurante
  - `name`: Nombre del restaurante
  - `description`: Descripción del restaurante
  - `logoUrl`: URL del logo del restaurante
  - `coverPhotoUrl`: URL de la foto de portada
  - `branches`: Array de sucursales activas
    - `id`: ID único de la sucursal
    - `name`: Nombre de la sucursal
    - `address`: Dirección completa
    - `latitude`: Latitud de la ubicación
    - `longitude`: Longitud de la ubicación
    - `phone`: Teléfono de contacto
    - `usesPlatformDrivers`: Si usa repartidores de la plataforma
    - `isOpen`: **Estado actual de apertura (true/false)**
    - `schedule`: Horarios semanales de la sucursal

**Errores Posibles:**
- `400`: Parámetros de paginación inválidos
- `500`: Error interno del servidor

---

### 2. Obtener Detalle de Restaurante

**Endpoint:** `GET /api/restaurants/:id`

**Descripción:** Obtiene la información completa de un restaurante específico, incluyendo su menú y sucursales con estado de apertura.

**Parámetros de URL:**
- `id` (integer): ID del restaurante

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la ciudad",
      "logoUrl": "https://example.com/logo.jpg",
      "coverPhotoUrl": "https://example.com/cover.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "latitude": 20.484123,
          "longitude": -99.216345,
          "phone": "7711234567",
          "usesPlatformDrivers": true,
          "isOpen": true,
          "schedule": [
            {
              "dayOfWeek": 0,
              "openingTime": "00:00:00",
              "closingTime": "00:00:00",
              "isClosed": true
            },
            {
              "dayOfWeek": 1,
              "openingTime": "09:00:00",
              "closingTime": "22:00:00",
              "isClosed": false
            }
          ]
        }
      ],
      "menu": [
        {
          "id": 1,
          "name": "Pizzas",
          "subcategories": [
            {
              "id": 1,
              "name": "Pizzas Clásicas",
              "displayOrder": 1,
              "products": [
                {
                  "id": 1,
                  "name": "Pizza Margherita",
                  "description": "Salsa de tomate, mozzarella y albahaca fresca",
                  "imageUrl": "https://example.com/margherita.jpg",
                  "price": 250.00
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

**Campos de Respuesta:**
- `restaurant`: Información completa del restaurante
  - `id`: ID único del restaurante
  - `name`: Nombre del restaurante
  - `description`: Descripción del restaurante
  - `logoUrl`: URL del logo del restaurante
  - `coverPhotoUrl`: URL de la foto de portada
  - `createdAt`: Fecha de creación
  - `branches`: Array de sucursales activas (mismo formato que en lista)
  - `menu`: Estructura del menú con categorías y productos

**Errores Posibles:**
- `400`: ID de restaurante inválido
- `404`: Restaurante no encontrado o no activo
- `500`: Error interno del servidor

---

## 🕐 Estado de Apertura (isOpen)

### Lógica de Cálculo

El campo `isOpen` se calcula automáticamente basándose en:

1. **Zona Horaria:** Se utiliza `America/Mexico_City` como zona horaria de referencia
2. **Día Actual:** Se obtiene el día de la semana actual (0=Domingo, 1=Lunes, ..., 6=Sábado)
3. **Horario del Día:** Se busca el horario correspondiente al día actual en el array `schedule`
4. **Estado Cerrado:** Si `isClosed: true` para el día actual, entonces `isOpen: false`
5. **Comparación de Horas:** Se compara la hora actual con `openingTime` y `closingTime`
6. **Horarios Nocturnos:** Se maneja correctamente cuando `closingTime` es menor que `openingTime` (cruza la medianoche)

### Ejemplos de Estados

- **Abierto:** `isOpen: true` - La sucursal está operando en este momento
- **Cerrado:** `isOpen: false` - La sucursal no está operando (fuera de horario o día cerrado)

### Notas Importantes

- El cálculo se realiza en tiempo real en cada petición
- Se considera la zona horaria de México para mayor precisión
- Los horarios nocturnos (ej: 22:00-06:00) se manejan correctamente
- En caso de error en el cálculo, se asume que la sucursal está cerrada

---

*Esta documentación se actualiza automáticamente cada vez que se implementan o modifican endpoints del panel del Owner.*
