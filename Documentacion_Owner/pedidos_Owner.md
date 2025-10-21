# Documentación API - Gestión de Pedidos Owner (Propietario de Restaurante)

## 📋 Listado de Pedidos

### Endpoint de Listado de Pedidos
**GET** `/api/restaurant/orders`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/orders`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js`
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Requerimiento: Token JWT válido en header `Authorization: Bearer <token>`

2. **Control de Roles** (`requireRole`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Roles permitidos: `['owner', 'branch_manager', 'order_manager', 'kitchen_staff']`

3. **Verificación de Ubicación** (`requireRestaurantLocation`)
   - Archivo: `src/middleware/location.middleware.js`
   - Requerimiento: El restaurante debe tener ubicación configurada

4. **Validación de Query Parameters** (`validateQuery(orderQuerySchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Schema: `src/validations/order.validation.js` - `orderQuerySchema`

#### Validaciones de Query Parameters (Zod Schema)

```javascript
const orderQuerySchema = z.object({
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
    .refine(val => val <= 100, 'El tamaño de página no puede ser mayor a 100')
    .optional()
    .default(10),

  // Filtros
  status: z.nativeEnum(OrderStatus).optional(),

  dateFrom: z
    .string()
    .datetime({ message: "Formato de fecha inválido (YYYY-MM-DDTHH:mm:ssZ)" })
    .optional(),

  dateTo: z
    .string()
    .datetime({ message: "Formato de fecha inválido (YYYY-MM-DDTHH:mm:ssZ)" })
    .optional(),

  // Ordenamiento
  sortBy: z.enum(['orderPlacedAt', 'total']).optional().default('orderPlacedAt'),
  
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Búsqueda
  search: z
    .string()
    .trim()
    .min(1, 'El término de búsqueda no puede estar vacío')
    .optional()
}).refine(
  (data) => {
    // Validar que dateFrom no sea mayor a dateTo si ambos están presentes
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  {
    message: "La fecha de inicio no puede ser mayor a la fecha de fin",
    path: ["dateFrom"]
  }
);
```

#### Query Parameters
| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `page` | Number | No | Número de página (default: 1) | `1` |
| `pageSize` | Number | No | Tamaño de página, máximo 100 (default: 10) | `20` |
| `status` | String | No | Estado del pedido (OrderStatus enum) | `confirmed` |
| `dateFrom` | String | No | Fecha de inicio en formato ISO | `2024-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin en formato ISO | `2024-01-31T23:59:59Z` |
| `sortBy` | String | No | Campo para ordenar: `orderPlacedAt` o `total` (default: `orderPlacedAt`) | `total` |
| `sortOrder` | String | No | Orden: `asc` o `desc` (default: `desc`) | `asc` |
| `search` | String | No | Término de búsqueda (ID, nombre o email del cliente) | `Juan` |

#### Estados de Pedido Disponibles (OrderStatus)
```javascript
enum OrderStatus {
  pending = "pending"
  confirmed = "confirmed"  
  preparing = "preparing"
  ready_for_pickup = "ready_for_pickup"
  out_for_delivery = "out_for_delivery"
  delivered = "delivered"
  cancelled = "cancelled"
  refunded = "refunded"
}
```

#### Lógica del Controlador
**Archivo:** `src/controllers/restaurant-admin.controller.js`

```javascript
const getRestaurantOrders = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const filters = req.query; // Ya validados por Zod middleware

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(ownerUserId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Obtener restaurantId del owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId
    );

    if (ownerAssignments.length === 0) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requiere ser owner de un restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    const restaurantId = ownerAssignments[0].restaurantId;

    // 3. Obtener la sucursal principal
    const primaryBranch = await BranchRepository.findPrimaryBranchByRestaurantId(restaurantId);
    
    if (!primaryBranch) {
      return ResponseService.notFound(
        res, 
        'Sucursal principal no encontrada. Configure la ubicación del restaurante primero.',
        null,
        'PRIMARY_BRANCH_NOT_FOUND'
      );
    }

    // 4. Obtener pedidos usando el repositorio
    const result = await OrderRepository.getOrdersForBranch(primaryBranch.id, filters);

    return ResponseService.success(
      res,
      'Pedidos obtenidos exitosamente',
      result
    );

  } catch (error) {
    logger.error('Error obteniendo pedidos del restaurante', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### Lógica del Repositorio
**Archivo:** `src/repositories/order.repository.js`

El repositorio implementa la consulta completa con:

1. **Filtros aplicados:**
   - `branchId`: Sucursal principal del restaurante
   - `status`: Estado específico del pedido (opcional)
   - `orderPlacedAt`: Rango de fechas (opcional)
   - Búsqueda por ID, nombre del cliente o email (opcional)

2. **Include completo:**
```javascript
include: {
  customer: {
    select: {
      id: true,
      name: true,
      lastname: true,
      email: true,
      phone: true
    }
  },
  address: {
    select: {
      id: true,
      alias: true,
      street: true,
      exteriorNumber: true,
      interiorNumber: true,
      neighborhood: true,
      city: true,
      state: true,
      zipCode: true,
      references: true
    }
  },
  deliveryDriver: {
    select: {
      id: true,
      name: true,
      lastname: true,
      phone: true
    }
  },
  payment: {
    select: {
      id: true,
      status: true,
      provider: true,
      providerPaymentId: true,
      amount: true,
      currency: true
    }
  },
  orderItems: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
          price: true
        }
      },
      modifiers: {
        include: {
          modifierOption: {
            select: {
              id: true,
              name: true,
              price: true,
              modifierGroup: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  }
}
```

#### Ejemplo de Request
```bash
GET /api/restaurant/orders?page=1&pageSize=10&status=confirmed&sortBy=orderPlacedAt&sortOrder=desc&search=Juan
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200)
```json
{
    "status": "success",
    "message": "Pedidos obtenidos exitosamente",
    "timestamp": "2025-10-20T16:46:37.097Z",
    "data": {
        "orders": [
            {
                "id": "1",
                "status": "confirmed",
                "subtotal": 480,
                "deliveryFee": 25,
                "total": 505,
                "commissionRateSnapshot": 12.5,
                "platformFee": 60,
                "restaurantPayout": 420,
                "paymentMethod": "card",
                "paymentStatus": "completed",
                "specialInstructions": "Entregar en la puerta principal, tocar timbre",
                "orderPlacedAt": "2025-10-20T14:32:05.127Z",
                "orderDeliveredAt": null,
                "createdAt": "2025-10-20T16:32:05.128Z",
                "updatedAt": "2025-10-20T16:32:05.128Z",
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
                            },
                            {
                                "id": "2",
                                "modifierOption": {
                                    "id": 5,
                                    "name": "Extra Queso",
                                    "price": 15,
                                    "modifierGroup": {
                                        "id": 2,
                                        "name": "Extras"
                                    }
                                }
                            },
                            {
                                "id": "3",
                                "modifierOption": {
                                    "id": 11,
                                    "name": "Sin Cebolla",
                                    "price": 0,
                                    "modifierGroup": {
                                        "id": 3,
                                        "name": "Sin Ingredientes"
                                    }
                                }
                            }
                        ]
                    },
                    {
                        "id": "2",
                        "productId": 3,
                        "quantity": 2,
                        "pricePerUnit": 135,
                        "product": {
                            "id": 3,
                            "name": "Pizza Margherita",
                            "imageUrl": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=500&fit=crop",
                            "price": 135
                        },
                        "modifiers": []
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
        }
    }
}
```

#### Manejo de Errores

##### Error 400 - Parámetros Inválidos
```json
{
  "status": "error",
  "message": "Parámetros de consulta inválidos",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "page",
      "message": "La página debe ser un número"
    },
    {
      "field": "pageSize", 
      "message": "El tamaño de página no puede ser mayor a 100"
    },
    {
      "field": "dateFrom",
      "message": "Formato de fecha inválido (YYYY-MM-DDTHH:mm:ssZ)"
    }
  ]
}
```

##### Error 401 - No Autenticado
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

##### Error 403 - Permisos Insuficientes
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere ser owner de un restaurante",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

##### Error 404 - Sucursal Principal No Encontrada
```json
{
  "status": "error",
  "message": "Sucursal principal no encontrada. Configure la ubicación del restaurante primero.",
  "code": "PRIMARY_BRANCH_NOT_FOUND"
}
```

##### Error 500 - Error Interno del Servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

#### Características Especiales

1. **Modelo de Negocio Simplificado**: 
   - Implementa el modelo "one Owner = one primary branch"
   - Lista automáticamente los pedidos de la sucursal principal del restaurante

2. **Incluye Modificadores**: 
   - Los `orderItems` incluyen todos los `modifiers` seleccionados por el cliente
   - Cada modificador muestra la opción y el grupo al que pertenece

3. **Filtros Avanzados**:
   - Búsqueda por ID del pedido, nombre o email del cliente
   - Filtrado por rango de fechas con validación de coherencia
   - Ordenamiento flexible por fecha o monto total

4. **Paginación Completa**:
   - Control de límite máximo (100 items por página)
   - Metadatos completos de paginación
   - Navegación fácil entre páginas

5. **Formateo de Datos**:
   - Conversión automática de `BigInt` a `String` para IDs
   - Conversión de `Decimal` a `Number` para precios
   - Construcción automática de nombres completos y direcciones completas

---

## 📍 Obtención de Ubicación del Restaurante

### Endpoint de Ubicación del Restaurante
**GET** `/api/restaurant/location-status`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/location-status`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js`
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Requerimiento: Token JWT válido en header `Authorization: Bearer <token>`

2. **Control de Roles** (`requireRole`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Roles permitidos: `['owner']`

#### Propósito
Este endpoint permite al frontend obtener la ubicación del restaurante para mostrar en el mapa de detalles del pedido. Es especialmente útil para:

- **Mostrar marcador verde del restaurante** en el mapa junto al marcador rojo del cliente
- **Calcular distancia** entre restaurante y cliente
- **Estimar tiempos de entrega** más precisos
- **Visualizar la ruta** de entrega completa

#### Lógica del Controlador
**Archivo:** `src/controllers/restaurant-admin.controller.js`

```javascript
const getLocationStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requiere rol de owner',
        null,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    const ownerAssignment = ownerAssignments[0];
    if (!ownerAssignment.restaurantId) {
      return ResponseService.forbidden(
        res,
        'No se encontró un restaurante asignado para este owner',
        null,
        'NO_RESTAURANT_ASSIGNED'
      );
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 3. Verificar el estado de configuración de ubicación y obtener datos completos
    const isLocationSet = await RestaurantRepository.getLocationStatus(restaurantId);
    const locationData = await RestaurantRepository.getLocationData(restaurantId);

    return ResponseService.success(
      res,
      'Estado de ubicación obtenido exitosamente',
      {
        isLocationSet: isLocationSet,
        location: locationData
      }
    );

  } catch (error) {
    console.error('Error obteniendo estado de ubicación:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### Ejemplo de Request
```bash
GET /api/restaurant/location-status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200)
```json
{
    "status": "success",
    "message": "Estado de ubicación obtenido exitosamente",
    "timestamp": "2025-10-20T16:46:37.097Z",
    "data": {
        "isLocationSet": true,
        "location": {
            "latitude": "20.4785",
            "longitude": "-99.2180",
            "address": "Av. Juárez 123, Centro, Ixmiquilpan, Hidalgo"
        }
    }
}
```

#### Caso: Ubicación No Configurada
```json
{
    "status": "success",
    "message": "Estado de ubicación obtenido exitosamente",
    "timestamp": "2025-10-20T16:46:37.097Z",
    "data": {
        "isLocationSet": false,
        "location": null
    }
}
```

#### Manejo de Errores

##### Error 401 - No Autenticado
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

##### Error 403 - Permisos Insuficientes
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

##### Error 404 - Usuario No Encontrado
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "NOT_FOUND"
}
```

#### Integración con Frontend (Flutter)

El frontend puede usar este endpoint para obtener la ubicación del restaurante y mostrarla en el mapa:

```dart
// Ejemplo de uso en Flutter
Future<Map<String, dynamic>?> getRestaurantLocation() async {
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/restaurant/location-status'),
      headers: {
        'Authorization': 'Bearer $accessToken',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data['data']['isLocationSet'] == true) {
        return data['data']['location'];
      }
    }
    return null;
  } catch (e) {
    print('Error obteniendo ubicación del restaurante: $e');
    return null;
  }
}
```

#### Características Especiales

1. **Datos Completos en una Sola Petición**: 
   - Devuelve tanto el estado (`isLocationSet`) como los datos completos (`location`)
   - Evita múltiples peticiones al servidor

2. **Formato Consistente**:
   - Las coordenadas se devuelven como strings para evitar problemas de precisión
   - Incluye dirección legible para mostrar al usuario

3. **Seguridad**:
   - Solo owners pueden acceder a la ubicación de su restaurante
   - Verificación completa de roles y permisos

4. **Compatibilidad con Mapas**:
   - Formato estándar de coordenadas (latitude, longitude)
   - Fácil integración con Google Maps, Mapbox, etc.

#### Flujo de Integración con Gestión de Pedidos

Para implementar la funcionalidad solicitada por el frontend, el flujo recomendado es:

1. **Obtener Lista de Pedidos**: `GET /api/restaurant/orders`
2. **Para cada pedido, obtener ubicación del restaurante**: `GET /api/restaurant/location-status`
3. **Mostrar en el mapa**:
   - 🔴 **Marcador rojo**: Ubicación del cliente (desde `order.address`)
   - 🟢 **Marcador verde**: Ubicación del restaurante (desde `location-status`)

#### Ejemplo de Implementación Completa

```dart
// Flutter - Servicio para gestión de pedidos con ubicación
class OrderManagementService {
  Future<Map<String, dynamic>> getOrderWithRestaurantLocation(String orderId) async {
    try {
      // 1. Obtener detalles del pedido
      final orderResponse = await http.get(
        Uri.parse('$baseUrl/api/restaurant/orders/$orderId'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
      
      if (orderResponse.statusCode != 200) {
        throw Exception('Error obteniendo pedido');
      }
      
      final orderData = json.decode(orderResponse.body);
      final order = orderData['data']['order'];
      
      // 2. Obtener ubicación del restaurante
      final locationResponse = await http.get(
        Uri.parse('$baseUrl/api/restaurant/location-status'),
        headers: {'Authorization': 'Bearer $accessToken'},
      );
      
      if (locationResponse.statusCode != 200) {
        throw Exception('Error obteniendo ubicación del restaurante');
      }
      
      final locationData = json.decode(locationResponse.body);
      final restaurantLocation = locationData['data']['location'];
      
      // 3. Combinar datos para el mapa
      return {
        'order': order,
        'customerLocation': {
          'latitude': double.parse(order['address']['latitude']),
          'longitude': double.parse(order['address']['longitude']),
          'address': order['address']['fullAddress'],
          'markerColor': 'red'
        },
        'restaurantLocation': {
          'latitude': double.parse(restaurantLocation['latitude']),
          'longitude': double.parse(restaurantLocation['longitude']),
          'address': restaurantLocation['address'],
          'markerColor': 'green'
        }
      };
      
    } catch (e) {
      print('Error obteniendo datos del pedido: $e');
      rethrow;
    }
  }
}
```

#### Estructura de Datos para el Mapa

El endpoint devuelve exactamente la estructura que necesita el frontend:

```json
{
  "isLocationSet": true,
  "location": {
    "latitude": "20.4785",     // ✅ Listo para Google Maps
    "longitude": "-99.2180",   // ✅ Listo para Google Maps  
    "address": "Av. Juárez 123, Centro, Ixmiquilpan, Hidalgo"  // ✅ Para mostrar al usuario
  }
}
```

#### Beneficios de esta Implementación

1. **✅ Solución Completa**: El endpoint ya existe y devuelve exactamente lo que necesita el frontend
2. **✅ Sin Cambios en Backend**: No requiere modificaciones adicionales
3. **✅ Seguridad**: Solo el owner puede acceder a la ubicación de su restaurante
4. **✅ Eficiencia**: Una sola petición obtiene todos los datos necesarios
5. **✅ Compatibilidad**: Formato estándar compatible con cualquier servicio de mapas

---

## 🔄 Actualización de Estado de Pedidos

### Endpoint de Actualización de Estado
**PATCH** `/api/restaurant/orders/:orderId/status`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/orders/:orderId/status`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js`
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Requerimiento: Token JWT válido en header `Authorization: Bearer <token>`

2. **Control de Roles** (`requireRole`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Roles permitidos: `['owner', 'branch_manager', 'order_manager', 'kitchen_staff']`

3. **Verificación de Ubicación** (`requireRestaurantLocation`)
   - Archivo: `src/middleware/location.middleware.js`
   - Requerimiento: El restaurante debe tener ubicación configurada

4. **Validación de Parámetros** (`validateParams(orderParamsSchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Valida el parámetro `:orderId` de la URL

5. **Validación del Body** (`validate(updateOrderStatusSchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Valida el cuerpo de la petición

#### Esquemas de Validación Zod

##### Parámetros de Ruta (`orderParamsSchema`)
```javascript
const orderParamsSchema = z.object({
  orderId: z.string().regex(/^\d+$/, 'El ID del pedido debe ser un número válido').transform(BigInt)
});
```

##### Cuerpo de la Petición (`updateOrderStatusSchema`)
```javascript
const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    required_error: "El nuevo estado es requerido",
    invalid_type_error: "Estado inválido"
  })
});
```

#### Parámetros
| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `orderId` | BigInt | Sí | ID del pedido a actualizar | `1` |
| `status` | String | Sí | Nuevo estado del pedido | `"preparing"` |

#### Estados de Pedido Disponibles (OrderStatus)
```javascript
enum OrderStatus {
  pending = "pending"
  confirmed = "confirmed"  
  preparing = "preparing"
  ready_for_pickup = "ready_for_pickup"
  out_for_delivery = "out_for_delivery"
  delivered = "delivered"
  cancelled = "cancelled"
  refunded = "refunded"
}
```

#### Lógica del Controlador
**Archivo:** `src/controllers/restaurant-admin.controller.js`

```javascript
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Llamar al método del repositorio con toda la lógica de validación
    const updatedOrder = await OrderRepository.updateOrderStatus(
      orderId, 
      status, 
      userId, 
      req.id
    );

    return ResponseService.success(
      res,
      `Estado del pedido actualizado a '${status}'`,
      { order: updatedOrder }
    );

  } catch (error) {
    // Manejar errores específicos del repositorio (403, 404, 409)
    // ...
  }
};
```

#### Lógica del Repositorio
**Archivo:** `src/repositories/order.repository.js`

El repositorio implementa validaciones completas:

1. **Autorización del Usuario**:
   - Verifica que el usuario tenga roles de restaurante válidos
   - Obtiene la sucursal principal del restaurante del usuario

2. **Validación del Pedido**:
   - Busca el pedido por ID
   - Verifica que pertenezca a la sucursal principal del usuario

3. **Validación de Transición de Estado**:

El sistema implementa transiciones de estado estrictas donde solo se permiten ciertos cambios según el estado actual y el rol del usuario:

```javascript
const validTransitions = {
  'pending': {
    'confirmed': ['owner', 'branch_manager', 'order_manager'],
    'cancelled': ['owner', 'branch_manager', 'order_manager']
  },
  'confirmed': {
    'preparing': ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'],
    'cancelled': ['owner', 'branch_manager', 'order_manager']
  },
  'preparing': {
    'ready_for_pickup': ['owner', 'branch_manager', 'order_manager', 'kitchen_staff']
  },
  'ready_for_pickup': {
    'out_for_delivery': ['owner', 'branch_manager', 'order_manager']
  },
  'out_for_delivery': {
    'delivered': ['owner', 'branch_manager', 'order_manager']
  }
};

const finalStates = ['delivered', 'cancelled', 'refunded'];
```

**Reglas de Transición Implementadas:**
- **`pending`** → Solo puede ir a `confirmed` o `cancelled` (Roles: owner, branch_manager, order_manager)
- **`confirmed`** → Puede ir a `preparing` o `cancelled` (Roles: preparación permite kitchen_staff, cancelación requiere roles superiores)
- **`preparing`** → Solo puede avanzar a `ready_for_pickup` (Todos los roles de cocina pueden marcar como listo)
- **`ready_for_pickup`** → Solo puede ir a `out_for_delivery` (Requiere roles de gestión, no cocina)
- **`out_for_delivery`** → Solo puede ir a `delivered` (Roles de gestión para marcar como entregado)

**Estados Finales:** Los estados `delivered`, `cancelled`, y `refunded` no permiten más cambios.

**Ejemplo de Transición Inválida:** Cuando intentas cambiar de `preparing` a `pending`, el sistema devuelve error 409 porque esta transición no está definida en el `validTransitions`.

4. **Efectos Secundarios**:
   - **WebSocket**: Siempre emite evento `order_update` al cliente
   - **Billetera del Restaurante**: Cuando un pedido cambia de estado, se actualiza automáticamente la billetera del restaurante con las ganancias correspondientes
   - **TODO - Reembolso**: Si se cancela un pedido con pago completado (no efectivo)
   - **✅ Notificación Drivers**: Si el estado cambia a `preparing` (implementado)

#### Ejemplo de Request
```bash
PATCH /api/restaurant/orders/1/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "status": "preparing"
}
```

#### Ejemplo de Respuesta Exitosa (200)
```json
{
    "status": "success",
    "message": "Estado del pedido actualizado a 'preparing'",
    "timestamp": "2025-10-20T17:14:10.819Z",
    "data": {
        "order": {
            "id": "1",
            "status": "preparing",
            "subtotal": 480,
            "deliveryFee": 25,
            "total": 505,
            "commissionRateSnapshot": 12.5,
            "platformFee": 60,
            "restaurantPayout": 420,
            "paymentMethod": "card",
            "paymentStatus": "completed",
            "specialInstructions": "Entregar en la puerta principal, tocar timbre",
            "orderPlacedAt": "2025-10-20T14:32:05.127Z",
            "orderDeliveredAt": null,
            "createdAt": "2025-10-20T16:32:05.128Z",
            "updatedAt": "2025-10-20T17:14:09.633Z",
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
                        },
                        {
                            "id": "2",
                            "modifierOption": {
                                "id": 5,
                                "name": "Extra Queso",
                                "price": 15,
                                "modifierGroup": {
                                    "id": 2,
                                    "name": "Extras"
                                }
                            }
                        },
                        {
                            "id": "3",
                            "modifierOption": {
                                "id": 11,
                                "name": "Sin Cebolla",
                                "price": 0,
                                "modifierGroup": {
                                    "id": 3,
                                    "name": "Sin Ingredientes"
                                }
                            }
                        }
                    ]
                },
                {
                    "id": "2",
                    "productId": 3,
                    "quantity": 2,
                    "pricePerUnit": 135,
                    "product": {
                        "id": 3,
                        "name": "Pizza Margherita",
                        "imageUrl": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=500&fit=crop",
                        "price": 135
                    },
                    "modifiers": []
                }
            ]
        }
    }
}
```

#### Manejo de Errores

##### Error 400 - Parámetros o Body Inválidos
```json
{
  "status": "error",
  "message": "Parámetros de entrada inválidos",
  "timestamp": "2025-10-20T17:35:01.506Z",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "orderId",
      "message": "El ID del pedido debe ser un número válido"
    },
    {
      "field": "status",
      "message": "Estado inválido"
    }
  ]
}
```

##### Error 401 - No Autenticado
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "timestamp": "2025-10-20T17:35:01.506Z",
  "code": "MISSING_TOKEN"
}
```

##### Error 403 - Permisos Insuficientes o Acceso Denegado
```json
{
  "status": "error",
  "message": "Tu rol 'kitchen_staff' no tiene permisos para cambiar el estado de confirmed a cancelled",
  "timestamp": "2025-10-20T17:35:01.506Z",
  "code": "STATUS_UPDATE_NOT_ALLOWED_FOR_ROLE",
  "details": {
    "userRole": "kitchen_staff",
    "currentStatus": "confirmed",
    "newStatus": "cancelled",
    "allowedRoles": ["owner", "branch_manager", "order_manager"]
  }
}
```

##### Error 404 - Pedido No Encontrado
```json
{
  "status": "error",
  "message": "Pedido no encontrado",
  "timestamp": "2025-10-20T17:35:01.506Z",
  "code": "ORDER_NOT_FOUND"
}
```

##### Error 409 - Transición de Estado Inválida
```json
{
    "status": "error",
    "message": "Transición de estado inválida: preparing → pending",
    "timestamp": "2025-10-20T17:35:01.506Z",
    "code": "INVALID_STATUS_TRANSITION"
}
```

##### Error 409 - Pedido en Estado Final
```json
{
  "status": "error",
  "message": "No se puede cambiar el estado de un pedido finalizado",
  "timestamp": "2025-10-20T17:35:01.506Z",
  "code": "ORDER_IN_FINAL_STATE",
  "details": {
    "currentStatus": "delivered"
  }
}
```

##### Error 500 - Error Interno del Servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "timestamp": "2025-10-20T17:35:01.506Z",
  "code": "INTERNAL_ERROR"
}
```

#### Características Especiales

1. **Validación Robusta de Transiciones**:
   - Solo permite transiciones válidas según el estado actual
   - Verifica permisos por rol para cada transición
   - Bloquea cambios en estados finales (`delivered`, `cancelled`, `refunded`)

2. **Notificaciones en Tiempo Real**:
   - Siempre emite evento WebSocket `order_update` al cliente
   - Notifica automáticamente cambios de estado

3. **Efectos Secundarios Preparados**:
   - **TODO**: Reembolso automático para cancelaciones de pagos completados
   - **✅ IMPLEMENTADO**: Notificación automática a repartidores cuando el pedido cambia a estado 'preparing'

4. **Sistema de Notificaciones a Repartidores**:
   - **Estado 'preparing'**: Notifica automáticamente a repartidores disponibles
   - **Repartidores de Plataforma**: Busca drivers con estado 'online' dentro de un radio de 10km de la sucursal
   - **Repartidores del Restaurante**: Busca drivers asignados al restaurante con estado 'online'
   - **Evento WebSocket**: `available_order` enviado a cada repartidor elegible con payload completo del pedido
   - **Logging**: Registra todas las notificaciones enviadas y errores del proceso

5. **Modelo de Negocio Simplificado**:
   - Implementa el modelo "one Owner = one primary branch"
   - Solo permite actualizar pedidos de la sucursal principal del restaurante

6. **Logging Completo**:
   - Registra todas las transiciones de estado
   - Incluye información de usuario y contexto para auditoría

---

## 📋 Respuesta al Equipo de Frontend

### ✅ **Solución Implementada**

**¡Buenas noticias!** El endpoint que necesitan ya está implementado y funcionando. No se requieren cambios adicionales en el backend.

### 🎯 **Endpoint Disponible**

**GET** `/api/restaurant/location-status`

Este endpoint devuelve exactamente la estructura de datos que solicitan:

```json
{
  "status": "success",
  "message": "Estado de ubicación obtenido exitosamente",
  "data": {
    "isLocationSet": true,
    "location": {
      "latitude": "20.4785",     // ✅ Coordenada de latitud
      "longitude": "-99.2180",   // ✅ Coordenada de longitud  
      "address": "Av. Juárez 123, Centro, Ixmiquilpan, Hidalgo"  // ✅ Dirección legible
    }
  }
}
```

### 🗺️ **Implementación en el Mapa**

Con este endpoint pueden implementar fácilmente:

1. **🔴 Marcador rojo**: Ubicación del cliente (desde `order.address`)
2. **🟢 Marcador verde**: Ubicación del restaurante (desde `/location-status`)

### 🚀 **Próximos Pasos**

1. **Probar el endpoint** con el token de owner
2. **Integrar con Google Maps** usando las coordenadas proporcionadas
3. **Mostrar ambos marcadores** en la pestaña "Ubicación" del pedido

### 📞 **Soporte**

Si necesitan ayuda con la integración o tienen alguna pregunta sobre el endpoint, pueden contactar al equipo de backend. ¡El endpoint está listo para usar!
