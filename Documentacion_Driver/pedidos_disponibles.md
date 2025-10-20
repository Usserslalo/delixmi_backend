# Documentación - Pedidos Disponibles para Repartidores

## GET /api/driver/orders/available

Obtiene los pedidos disponibles para recoger por repartidores autenticados, aplicando filtros críticos de estado, ubicación y tipo de repartidor.

### Middlewares

| Middleware | Descripción |
|------------|-------------|
| `authenticateToken` | Verifica que el usuario esté autenticado con JWT válido |
| `requireRole(['driver_platform', 'driver_restaurant'])` | Verifica que el usuario tenga rol de repartidor |

### Esquema Zod

**Archivo:** `src/validations/driver.validation.js`

```javascript
const availableOrdersQuerySchema = z.object({
  // Paginación
  page: z
    .string()
    .regex(/^\d+$/, 'La página debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'La página debe ser mayor a 0')
    .optional()
    .default(1),

  pageSize: z
    .string()
    .regex(/^\d+$/, 'El tamaño de página debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El tamaño de página debe ser mayor a 0')
    .refine(val => val <= 50, 'El tamaño de página no puede ser mayor a 50')
    .optional()
    .default(10)
});
```

**Parámetros Query válidos:**
- `page` - Número de página (default: 1, mínimo: 1)
- `pageSize` - Tamaño de página (default: 10, máximo: 50)

### Lógica Detallada

#### Controlador (`src/controllers/driver.controller.js`)

```javascript
const getAvailableOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      page: req.query.page,
      pageSize: req.query.pageSize
    };

    // Llamar al método del repositorio para obtener pedidos disponibles
    const result = await DriverRepository.getAvailableOrdersForDriver(
      userId, 
      filters, 
      req.id
    );

    // Respuesta exitosa usando ResponseService
    return ResponseService.success(res, `Pedidos disponibles obtenidos exitosamente`, {
      orders: result.orders,
      pagination: result.pagination,
      driverInfo: {
        userId: userId,
        userName: `${req.user.name} ${req.user.lastname}`
      }
    });

  } catch (error) {
    // Manejo estructurado de errores del repositorio (404, 400, 403, 500)
  }
};
```

#### Repositorio (`src/repositories/driver.repository.js`)

**VALIDACIONES CRÍTICAS IMPLEMENTADAS:**

1. **Estado del Repartidor**: Verifica que `driverProfile.status === 'online'`
2. **Ubicación GPS**: Valida que el repartidor tenga `currentLatitude` y `currentLongitude`
3. **Filtro Geográfico**: Aplica fórmula de Haversine para calcular distancia real

```javascript
static async getAvailableOrdersForDriver(userId, filters, requestId) {
  // 1. OBTENER PERFIL Y VALIDAR ESTADO
  const driverProfile = await prisma.driverProfile.findUnique({
    where: { userId },
    select: { userId: true, status: true, currentLatitude: true, currentLongitude: true }
  });

  // VALIDACIÓN CRÍTICA 1: Solo repartidores ONLINE pueden ver pedidos
  if (driverProfile.status !== 'online') {
    return { orders: [], pagination: { totalCount: 0, ... } };
  }

  // VALIDACIÓN CRÍTICA 2: Ubicación GPS requerida
  if (!driverLat || !driverLon) {
    throw { status: 400, message: 'Debes actualizar tu ubicación GPS...', code: 'DRIVER_LOCATION_UNKNOWN' };
  }

  // 2. DETERMINAR TIPO DE REPARTIDOR
  const userWithRoles = await UserService.getUserWithRoles(userId);
  const userRoles = userWithRoles.userRoleAssignments.map(a => a.role.name);
  
  if (isPlatformDriver && isRestaurantDriver) {
    // Repartidor híbrido: plataforma + restaurantes asignados
  } else if (isPlatformDriver) {
    // Solo plataforma: { branch: { usesPlatformDrivers: true } }
  } else if (isRestaurantDriver) {
    // Solo restaurante: { branch: { restaurantId: { in: assignedIds }, usesPlatformDrivers: false } }
  }

  // 3. OBTENER PEDIDOS CANDIDATOS (sin paginación primero)
  const candidateOrders = await prisma.order.findMany({
    where: { status: 'ready_for_pickup', deliveryDriverId: null, ...filters },
    select: { id: true, branch: { latitude: true, longitude: true, deliveryRadius: true } }
  });

  // 4. FILTRO GEOGRÁFICO CRÍTICO - Fórmula de Haversine
  const filteredOrders = candidateOrders.filter(order => {
    const distance = this.calculateDistance(driverLat, driverLon, branchLat, branchLon);
    return distance <= order.branch.deliveryRadius;
  });

  // 5. PAGINACIÓN MANUAL sobre resultados filtrados
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 10;
  const skip = (page - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(skip, skip + pageSize);

  // 6. OBTENER DETALLES COMPLETOS solo de la página actual
  const detailedOrders = await prisma.order.findMany({
    where: { id: { in: paginatedOrders.map(o => o.id) } },
    include: { /* include completo con customer, address, orderItems, modifiers, payment */ }
  });

  return { orders: formattedOrders, pagination: { totalCount, currentPage: page, ... } };
}
```

### Ejemplo de Respuesta Exitosa (200)

```json
{
  "status": "success",
  "message": "Pedidos disponibles obtenidos exitosamente",
  "timestamp": "2025-01-20T19:45:30.123Z",
  "data": {
    "orders": [
      {
        "id": "1",
        "status": "ready_for_pickup",
        "subtotal": 480,
        "deliveryFee": 25,
        "total": 505,
        "commissionRateSnapshot": 12.5,
        "platformFee": 60,
        "restaurantPayout": 420,
        "paymentMethod": "card",
        "paymentStatus": "completed",
        "specialInstructions": "Entregar en la puerta principal",
        "orderPlacedAt": "2025-01-20T19:30:15.000Z",
        "orderDeliveredAt": null,
        "createdAt": "2025-01-20T19:30:15.000Z",
        "updatedAt": "2025-01-20T19:30:15.000Z",
        "customer": {
          "id": 5,
          "name": "Sofía",
          "lastname": "López",
          "fullName": "Sofía López",
          "email": "sofia.lopez@email.com",
          "phone": "4444444444"
        },
        "address": {
          "id": 1,
          "alias": "Casa",
          "street": "Av. Felipe Ángeles",
          "exteriorNumber": "21",
          "interiorNumber": null,
          "neighborhood": "San Nicolás",
          "city": "Ixmiquilpan",
          "state": "Hidalgo",
          "zipCode": "42300",
          "references": "Casa de dos pisos con portón de madera.",
          "fullAddress": "Av. Felipe Ángeles 21, San Nicolás, Ixmiquilpan, Hidalgo 42300"
        },
        "deliveryDriver": null,
        "payment": {
          "id": "1",
          "status": "completed",
          "provider": "mercadopago",
          "providerPaymentId": "MP-123456789-PIZZA",
          "amount": 505,
          "currency": "MXN"
        },
        "orderItems": [
          {
            "id": "1",
            "productId": 1,
            "quantity": 1,
            "pricePerUnit": 210,
            "product": {
              "id": 1,
              "name": "Pizza Hawaiana",
              "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop",
              "price": 150
            },
            "modifiers": [
              {
                "id": "1",
                "modifierOption": {
                  "id": 3,
                  "name": "Grande (12 pulgadas)",
                  "price": 45,
                  "modifierGroup": {
                    "id": 1,
                    "name": "Tamaño"
                  }
                }
              }
            ]
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "driverInfo": {
      "userId": 4,
      "userName": "Miguel Hernández"
    }
  }
}
```

### Respuesta cuando Repartidor no está Online

```json
{
  "status": "success",
  "message": "Pedidos disponibles obtenidos exitosamente",
  "timestamp": "2025-01-20T19:45:30.123Z",
  "data": {
    "orders": [],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "driverInfo": {
      "userId": 4,
      "userName": "Miguel Hernández"
    }
  }
}
```

### Manejo de Errores

#### Error 400 - Validación Zod (Query Parameters)

```json
{
  "status": "error",
  "message": "El tamaño de página no puede ser mayor a 50",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T19:45:30.123Z",
  "errors": [
    {
      "field": "pageSize",
      "message": "El tamaño de página no puede ser mayor a 50",
      "code": "too_big"
    }
  ],
  "data": null
}
```

#### Error 400 - Ubicación GPS Desconocida

```json
{
  "status": "error",
  "message": "Debes actualizar tu ubicación GPS antes de ver pedidos disponibles",
  "code": "DRIVER_LOCATION_UNKNOWN",
  "timestamp": "2025-01-20T19:45:30.123Z"
}
```

#### Error 401 - No Autenticado

```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN",
  "timestamp": "2025-01-20T19:45:30.123Z"
}
```

#### Error 403 - Sin Permisos de Repartidor

```json
{
  "status": "error",
  "message": "No tienes permisos de repartidor válidos",
  "code": "INVALID_DRIVER_ROLE",
  "timestamp": "2025-01-20T19:45:30.123Z"
}
```

#### Error 403 - Sin Restaurantes Asignados

```json
{
  "status": "error",
  "message": "No tienes restaurantes asignados",
  "code": "NO_RESTAURANTS_ASSIGNED",
  "timestamp": "2025-01-20T19:45:30.123Z"
}
```

#### Error 404 - Perfil no Encontrado

```json
{
  "status": "error",
  "message": "Perfil de repartidor no encontrado",
  "code": "DRIVER_PROFILE_NOT_FOUND",
  "timestamp": "2025-01-20T19:45:30.123Z"
}
```

#### Error 500 - Error Interno

```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T19:45:30.123Z"
}
```

### Consideraciones Técnicas

1. **Validaciones Críticas Implementadas**:
   - ✅ **Estado Online**: Solo repartidores con `status = 'online'` pueden ver pedidos
   - ✅ **Ubicación GPS**: Requiere `currentLatitude` y `currentLongitude` válidas
   - ✅ **Filtro Geográfico**: Fórmula de Haversine aplicada a `branch.deliveryRadius`

2. **Diferenciación por Tipo de Repartidor**:
   - **`driver_platform`**: Solo pedidos de sucursales con `usesPlatformDrivers = true`
   - **`driver_restaurant`**: Solo pedidos de sus restaurantes asignados
   - **Híbrido**: Combina ambos tipos con lógica OR

3. **Optimización de Consultas**:
   - Primera consulta: Obtiene candidatos con datos mínimos para filtro geográfico
   - Segunda consulta: Obtiene detalles completos solo de la página actual
   - Paginación aplicada después del filtro geográfico (más preciso)

4. **Logging Estructurado**: Trazabilidad completa con `requestId` en cada paso crítico

### Mejoras Críticas Implementadas

- ✅ **Migración de `express-validator` a Zod**: Validación más robusta
- ✅ **Validación de Estado Online**: Corrige fallo crítico - antes mostraba pedidos a repartidores offline
- ✅ **Validación de Ubicación GPS**: Corrige fallo crítico - antes no validaba coordenadas
- ✅ **Filtro Geográfico**: Implementa cálculo de distancia real usando fórmula de Haversine
- ✅ **Patrón Repository**: Separación clara de lógica de acceso a datos
- ✅ **ResponseService**: Respuestas consistentes y estructuradas
- ✅ **Manejo de Errores Mejorado**: Errores específicos y informativos por tipo
- ✅ **Logging Estructurado**: Trazabilidad completa para debugging
