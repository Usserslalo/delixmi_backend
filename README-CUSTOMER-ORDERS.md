# Endpoint de Historial de Pedidos del Cliente

## Descripción
Este endpoint permite a los clientes autenticados obtener su historial de pedidos con funcionalidades de filtrado y paginación.

## Endpoint
```
GET /api/customer/orders
```

## Autenticación
- **Requerida**: Sí
- **Tipo**: Bearer Token
- **Rol requerido**: `customer`

## Parámetros de Query (Opcionales)

| Parámetro | Tipo | Descripción | Valores Válidos |
|-----------|------|-------------|-----------------|
| `status` | string | Filtrar pedidos por estado | `pending`, `confirmed`, `preparing`, `ready_for_pickup`, `out_for_delivery`, `delivered`, `cancelled`, `refunded` |
| `page` | integer | Número de página | Mínimo: 1, Default: 1 |
| `pageSize` | integer | Tamaño de página | Mínimo: 1, Máximo: 100, Default: 10 |

## Ejemplos de Uso

### 1. Obtener todos los pedidos
```bash
curl -X GET "http://localhost:3000/api/customer/orders" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 2. Filtrar por estado
```bash
curl -X GET "http://localhost:3000/api/customer/orders?status=delivered" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 3. Con paginación
```bash
curl -X GET "http://localhost:3000/api/customer/orders?page=2&pageSize=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Combinando filtros
```bash
curl -X GET "http://localhost:3000/api/customer/orders?status=delivered&page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Respuesta Exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Historial de pedidos obtenido exitosamente",
  "data": {
    "orders": [
      {
        "id": "123",
        "status": "delivered",
        "subtotal": 150.00,
        "deliveryFee": 25.00,
        "total": 175.00,
        "paymentMethod": "credit_card",
        "paymentStatus": "completed",
        "orderPlacedAt": "2024-01-15T10:30:00.000Z",
        "orderDeliveredAt": "2024-01-15T11:45:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T11:45:00.000Z",
        "restaurant": {
          "id": 1,
          "name": "Restaurante Ejemplo",
          "logoUrl": "https://example.com/logo.jpg",
          "branch": {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Calle Principal 123",
            "phone": "+1234567890"
          }
        },
        "deliveryAddress": {
          "id": 1,
          "alias": "Casa",
          "street": "Calle Secundaria 456",
          "exteriorNumber": "123",
          "interiorNumber": "A",
          "neighborhood": "Centro",
          "city": "Ciudad",
          "state": "Estado",
          "zipCode": "12345",
          "references": "Cerca del parque"
        },
        "deliveryDriver": {
          "id": 1,
          "name": "Juan",
          "lastname": "Pérez",
          "phone": "+1234567890"
        },
        "items": [
          {
            "id": "456",
            "quantity": 2,
            "pricePerUnit": 75.00,
            "subtotal": 150.00,
            "product": {
              "id": 1,
              "name": "Pizza Margherita",
              "imageUrl": "https://example.com/pizza.jpg"
            }
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalOrders": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "status": "delivered"
    },
    "customer": {
      "id": 1,
      "name": "Cliente",
      "lastname": "Ejemplo"
    },
    "retrievedAt": "2024-01-15T12:00:00.000Z"
  }
}
```

## Respuestas de Error

### 400 Bad Request - Parámetros Inválidos
```json
{
  "status": "error",
  "message": "Parámetros de entrada inválidos",
  "errors": [
    {
      "msg": "El estado del pedido debe ser uno de los valores válidos",
      "param": "status",
      "location": "query"
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
- Validación de pertenencia de pedidos (solo pedidos del cliente autenticado)

### ✅ Funcionalidades
- **Filtrado por estado**: Permite filtrar pedidos por cualquier estado válido
- **Paginación**: Soporte completo para paginación con `page` y `pageSize`
- **Ordenamiento**: Pedidos ordenados por fecha de pedido descendente (más recientes primero)
- **Información completa**: Incluye datos del restaurante, dirección de entrega, repartidor e items

### ✅ Validaciones
- Validación de parámetros con `express-validator`
- Validación de estados de pedido contra enum de Prisma
- Validación de rangos de paginación
- Manejo de errores robusto

### ✅ Rendimiento
- Consultas optimizadas con `select` específico
- Paginación eficiente con `skip` y `take`
- Conteo separado para metadatos de paginación

## Pruebas

Para probar el endpoint, puedes usar el script incluido:

```bash
# 1. Instalar dependencias si no están instaladas
npm install axios

# 2. Editar el token en test-customer-orders.js
# 3. Ejecutar las pruebas
node test-customer-orders.js
```

## Notas Técnicas

- Los IDs de pedidos se devuelven como strings para compatibilidad con BigInt
- Los precios se convierten a números para evitar problemas de precisión
- La respuesta incluye metadatos de paginación para facilitar la navegación
- El endpoint es compatible con el patrón de respuesta estándar del proyecto
