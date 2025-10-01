# Endpoints de Direcciones del Cliente

## Descripción
Estos endpoints permiten a los clientes autenticados gestionar sus direcciones de entrega.

## Endpoints Disponibles

### 1. Listar Direcciones
```
GET /api/customer/addresses
```

### 2. Crear Dirección
```
POST /api/customer/addresses
```

### 3. Actualizar Dirección
```
PATCH /api/customer/addresses/:addressId
```

### 4. Eliminar Dirección
```
DELETE /api/customer/addresses/:addressId
```

## Autenticación
- **Requerida**: Sí
- **Tipo**: Bearer Token
- **Rol requerido**: `customer`

---

## 1. Listar Direcciones (GET)

### Descripción
Obtiene todas las direcciones de entrega del cliente autenticado.

### Endpoint
```
GET /api/customer/addresses
```

### Parámetros
No requiere parámetros.

### Ejemplo de Petición
```bash
curl -X GET "http://localhost:3000/api/customer/addresses" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Respuesta Exitosa (200 OK)
```json
{
  "status": "success",
  "message": "Direcciones obtenidas exitosamente",
  "data": {
    "addresses": [
      {
        "id": 1,
        "alias": "Casa",
        "street": "Calle Principal",
        "exteriorNumber": "123",
        "interiorNumber": "A",
        "neighborhood": "Centro",
        "city": "Ciudad de México",
        "state": "CDMX",
        "zipCode": "01000",
        "references": "Cerca del parque central",
        "latitude": 19.4326,
        "longitude": -99.1332,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "customer": {
          "id": 1,
          "name": "Juan",
          "lastname": "Pérez"
        }
      },
      {
        "id": 2,
        "alias": "Oficina",
        "street": "Calle Insurgentes",
        "exteriorNumber": "456",
        "interiorNumber": null,
        "neighborhood": "Roma Norte",
        "city": "Ciudad de México",
        "state": "CDMX",
        "zipCode": "06700",
        "references": null,
        "latitude": 19.4194,
        "longitude": -99.1556,
        "createdAt": "2024-01-14T09:15:00.000Z",
        "updatedAt": "2024-01-14T09:15:00.000Z",
        "customer": {
          "id": 1,
          "name": "Juan",
          "lastname": "Pérez"
        }
      }
    ],
    "totalAddresses": 2,
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    },
    "retrievedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

---

## 3. Actualizar Dirección (PATCH)

### Descripción
Actualiza una dirección de entrega existente del cliente autenticado.

### Endpoint
```
PATCH /api/customer/addresses/:addressId
```

### Parámetros de URL
| Parámetro | Tipo | Descripción | Validaciones |
|-----------|------|-------------|--------------|
| `addressId` | integer | ID de la dirección a actualizar | Entero mayor a 0 |

### Campos del Body (Todos Opcionales)
| Campo | Tipo | Descripción | Validaciones |
|-------|------|-------------|--------------|
| `alias` | string | Nombre identificador de la dirección | 1-50 caracteres |
| `street` | string | Nombre de la calle | 1-255 caracteres |
| `exterior_number` | string | Número exterior | 1-50 caracteres |
| `interior_number` | string | Número interior | Máximo 50 caracteres |
| `neighborhood` | string | Colonia o barrio | 1-150 caracteres |
| `city` | string | Ciudad | 1-100 caracteres |
| `state` | string | Estado o provincia | 1-100 caracteres |
| `zip_code` | string | Código postal | 1-10 caracteres, solo números |
| `references` | string | Referencias adicionales | Máximo 500 caracteres |
| `latitude` | number | Latitud geográfica | Decimal entre -90 y 90 |
| `longitude` | number | Longitud geográfica | Decimal entre -180 y 180 |

### Ejemplo de Petición
```bash
curl -X PATCH "http://localhost:3000/api/customer/addresses/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "alias": "Casa Actualizada",
    "street": "Nueva Calle Principal",
    "exterior_number": "456",
    "neighborhood": "Nuevo Centro",
    "city": "Ciudad de México",
    "state": "CDMX",
    "zip_code": "02000",
    "latitude": 19.4326,
    "longitude": -99.1332
  }'
```

### Respuesta Exitosa (200 OK)
```json
{
  "status": "success",
  "message": "Dirección actualizada exitosamente",
  "data": {
    "address": {
      "id": 1,
      "alias": "Casa Actualizada",
      "street": "Nueva Calle Principal",
      "exteriorNumber": "456",
      "interiorNumber": null,
      "neighborhood": "Nuevo Centro",
      "city": "Ciudad de México",
      "state": "CDMX",
      "zipCode": "02000",
      "references": null,
      "latitude": 19.4326,
      "longitude": -99.1332,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z",
      "customer": {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez"
      }
    }
  }
}
```

### Respuestas de Error Específicas

#### 400 Bad Request - Datos Inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El ID de la dirección debe ser un número entero válido",
      "param": "addressId",
      "location": "params"
    },
    {
      "msg": "La latitud debe ser un número decimal entre -90 y 90",
      "param": "latitude",
      "location": "body"
    }
  ]
}
```

#### 404 Not Found - Dirección No Encontrada
```json
{
  "status": "error",
  "message": "Dirección no encontrada o no tienes permisos para editarla",
  "code": "ADDRESS_NOT_FOUND_OR_NO_PERMISSION",
  "details": {
    "addressId": 999,
    "customerId": 1,
    "possibleReasons": [
      "La dirección no existe",
      "La dirección no pertenece a este cliente",
      "No tienes permisos para editar esta dirección"
    ]
  }
}
```

#### 409 Conflict - Alias Duplicado
```json
{
  "status": "error",
  "message": "Ya existe una dirección con este alias",
  "code": "ADDRESS_ALIAS_EXISTS",
  "details": {
    "alias": "Casa",
    "existingAddressId": 2
  }
}
```

---

## 4. Eliminar Dirección (DELETE)

### Descripción
Elimina una dirección de entrega del cliente autenticado.

### Endpoint
```
DELETE /api/customer/addresses/:addressId
```

### Parámetros de URL
| Parámetro | Tipo | Descripción | Validaciones |
|-----------|------|-------------|--------------|
| `addressId` | integer | ID de la dirección a eliminar | Entero mayor a 0 |

### Ejemplo de Petición
```bash
curl -X DELETE "http://localhost:3000/api/customer/addresses/1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Respuesta Exitosa (200 OK)
```json
{
  "status": "success",
  "message": "Dirección eliminada exitosamente",
  "data": {
    "deletedAddress": {
      "id": 1,
      "alias": "Casa",
      "addressInfo": "Calle Principal 123, Centro, Ciudad de México, CDMX",
      "deletedAt": "2024-01-15T12:00:00.000Z"
    },
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    }
  }
}
```

### Respuestas de Error Específicas

#### 400 Bad Request - Datos Inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El ID de la dirección debe ser un número entero válido",
      "param": "addressId",
      "location": "params"
    }
  ]
}
```

#### 404 Not Found - Dirección No Encontrada
```json
{
  "status": "error",
  "message": "Dirección no encontrada o no tienes permisos para eliminarla",
  "code": "ADDRESS_NOT_FOUND_OR_NO_PERMISSION",
  "details": {
    "addressId": 999,
    "customerId": 1,
    "possibleReasons": [
      "La dirección no existe",
      "La dirección no pertenece a este cliente",
      "No tienes permisos para eliminar esta dirección"
    ]
  }
}
```

#### 409 Conflict - Dirección en Uso
```json
{
  "status": "error",
  "message": "No se puede eliminar la dirección porque está siendo utilizada en pedidos",
  "code": "ADDRESS_IN_USE",
  "details": {
    "addressId": 1,
    "addressAlias": "Casa",
    "addressInfo": "Calle Principal 123, Centro, Ciudad de México, CDMX",
    "orderId": 456,
    "orderStatus": "delivered",
    "orderPlacedAt": "2024-01-15T10:30:00.000Z",
    "suggestion": "Elimina o actualiza los pedidos que usan esta dirección antes de eliminarla"
  }
}
```

---

## 5. Crear Dirección (POST)

### Descripción
Crea una nueva dirección de entrega para el cliente autenticado.

### Endpoint
```
POST /api/customer/addresses
```

### Campos del Body

### Campos Requeridos
| Campo | Tipo | Descripción | Validaciones |
|-------|------|-------------|--------------|
| `alias` | string | Nombre identificador de la dirección (ej. "Casa", "Oficina") | 1-50 caracteres |
| `street` | string | Nombre de la calle | 1-255 caracteres |
| `exterior_number` | string | Número exterior | 1-50 caracteres |
| `neighborhood` | string | Colonia o barrio | 1-150 caracteres |
| `city` | string | Ciudad | 1-100 caracteres |
| `state` | string | Estado o provincia | 1-100 caracteres |
| `zip_code` | string | Código postal | 1-10 caracteres, solo números |
| `latitude` | number | Latitud geográfica | Decimal entre -90 y 90 |
| `longitude` | number | Longitud geográfica | Decimal entre -180 y 180 |

### Campos Opcionales
| Campo | Tipo | Descripción | Validaciones |
|-------|------|-------------|--------------|
| `interior_number` | string | Número interior (apartamento, etc.) | Máximo 50 caracteres |
| `references` | string | Referencias adicionales | Máximo 500 caracteres |

## Ejemplo de Petición

```bash
curl -X POST "http://localhost:3000/api/customer/addresses" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "alias": "Casa",
    "street": "Calle Principal",
    "exterior_number": "123",
    "interior_number": "A",
    "neighborhood": "Centro",
    "city": "Ciudad de México",
    "state": "CDMX",
    "zip_code": "01000",
    "references": "Cerca del parque central",
    "latitude": 19.4326,
    "longitude": -99.1332
  }'
```

## Respuesta Exitosa (201 Created)

```json
{
  "status": "success",
  "message": "Dirección creada exitosamente",
  "data": {
    "address": {
      "id": 1,
      "alias": "Casa",
      "street": "Calle Principal",
      "exteriorNumber": "123",
      "interiorNumber": "A",
      "neighborhood": "Centro",
      "city": "Ciudad de México",
      "state": "CDMX",
      "zipCode": "01000",
      "references": "Cerca del parque central",
      "latitude": 19.4326,
      "longitude": -99.1332,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "customer": {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez"
      }
    }
  }
}
```

## Respuestas de Error

### 400 Bad Request - Datos Inválidos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El alias de la dirección es requerido",
      "param": "alias",
      "location": "body"
    },
    {
      "msg": "La latitud debe ser un número decimal entre -90 y 90",
      "param": "latitude",
      "location": "body"
    }
  ]
}
```

### 401 Unauthorized - Token Inválido
```json
{
  "status": "error",
  "message": "Token de acceso inválido o expirado"
}
```

### 403 Forbidden - Sin Permisos
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de cliente",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["customer"],
  "current": ["admin"]
}
```

### 404 Not Found - Usuario No Encontrado
```json
{
  "status": "error",
  "message": "Usuario no encontrado"
}
```

### 409 Conflict - Alias Duplicado
```json
{
  "status": "error",
  "message": "Ya existe una dirección con este alias",
  "code": "ADDRESS_ALIAS_EXISTS",
  "details": {
    "alias": "Casa",
    "existingAddressId": 1
  }
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "error": "Error interno"
}
```

## Características Implementadas

### ✅ Seguridad
- Autenticación JWT requerida
- Verificación de rol `customer`
- Validación de pertenencia (solo el cliente puede crear direcciones para su cuenta)

### ✅ Validaciones Robustas
- **Campos requeridos**: Validación de presencia y longitud
- **Tipos de datos**: Validación de tipos correctos
- **Rangos geográficos**: Latitud (-90 a 90) y longitud (-180 a 180)
- **Formato de código postal**: Solo números
- **Longitud de campos**: Validación según esquema de base de datos

### ✅ Prevención de Duplicados
- Verificación de alias único por usuario
- Manejo de errores de duplicación con códigos específicos

### ✅ Manejo de Errores
- Errores de validación detallados
- Manejo específico de errores de Prisma
- Respuestas consistentes con el patrón del proyecto

### ✅ Formato de Respuesta
- Conversión de tipos (Decimal a Number)
- Información del cliente incluida
- Timestamps de creación y actualización

## Casos de Uso

### 1. Crear Dirección Básica
```json
{
  "alias": "Casa",
  "street": "Av. Reforma",
  "exterior_number": "123",
  "neighborhood": "Centro",
  "city": "Ciudad de México",
  "state": "CDMX",
  "zip_code": "06000",
  "latitude": 19.4326,
  "longitude": -99.1332
}
```

### 2. Crear Dirección Completa
```json
{
  "alias": "Oficina",
  "street": "Calle Insurgentes",
  "exterior_number": "456",
  "interior_number": "Piso 3, Oficina 301",
  "neighborhood": "Roma Norte",
  "city": "Ciudad de México",
  "state": "CDMX",
  "zip_code": "06700",
  "references": "Edificio azul, al lado del metro",
  "latitude": 19.4194,
  "longitude": -99.1556
}
```

## Notas Técnicas

- Los campos `interior_number` y `references` son opcionales y se almacenan como `null` si no se proporcionan
- Las coordenadas se convierten a `parseFloat()` para asegurar el tipo correcto
- El alias debe ser único por usuario (no globalmente único)
- La respuesta incluye información del cliente para confirmación
- Se mantiene consistencia con el patrón de respuesta del proyecto

## Respuestas de Error Comunes

### 401 Unauthorized - Token Inválido
```json
{
  "status": "error",
  "message": "Token de acceso inválido o expirado"
}
```

### 403 Forbidden - Sin Permisos
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de cliente",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["customer"],
  "current": ["admin"]
}
```

### 404 Not Found - Usuario No Encontrado
```json
{
  "status": "error",
  "message": "Usuario no encontrado"
}
```

### 500 Internal Server Error
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "error": "Error interno"
}
```

## Características Implementadas

### ✅ Seguridad
- Autenticación JWT requerida
- Verificación de rol `customer`
- Validación de pertenencia (solo el cliente puede ver sus direcciones)

### ✅ Funcionalidades
- **Listado completo**: Obtiene todas las direcciones del cliente
- **Ordenamiento**: Direcciones ordenadas por fecha de actualización descendente
- **Información completa**: Incluye todos los campos de la dirección
- **Metadatos**: Total de direcciones y información del cliente

### ✅ Formato de Respuesta
- Conversión de tipos (Decimal a Number)
- Información del cliente incluida
- Timestamps de creación y actualización
- Respuesta consistente con el patrón del proyecto

## CRUD Completo de Direcciones ✅

¡El CRUD completo de direcciones ha sido implementado exitosamente! Los siguientes endpoints están disponibles:

### Endpoints Implementados
- ✅ `GET /api/customer/addresses` - Listar todas las direcciones
- ✅ `POST /api/customer/addresses` - Crear nueva dirección
- ✅ `PATCH /api/customer/addresses/:addressId` - Actualizar dirección
- ✅ `DELETE /api/customer/addresses/:addressId` - Eliminar dirección

### Funcionalidad Adicional Opcional
- `GET /api/customer/addresses/:id` - Obtener dirección específica (opcional, ya que se puede obtener del listado)
