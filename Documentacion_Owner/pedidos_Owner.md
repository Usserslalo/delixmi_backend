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
      method: true,
      provider: true,
      providerPaymentId: true,
      amount: true
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
  "data": {
    "orders": [
      {
        "id": "123456789",
        "status": "confirmed",
        "subtotal": 250.00,
        "deliveryFee": 25.00,
        "total": 275.00,
        "commissionRateSnapshot": 12.5,
        "platformFee": 31.25,
        "restaurantPayout": 218.75,
        "paymentMethod": "mercadopago",
        "paymentStatus": "completed",
        "specialInstructions": "Entregar en la puerta principal",
        "orderPlacedAt": "2024-01-15T14:30:00.000Z",
        "orderDeliveredAt": null,
        "createdAt": "2024-01-15T14:30:00.000Z",
        "updatedAt": "2024-01-15T14:30:00.000Z",
        "customer": {
          "id": 456,
          "name": "Juan",
          "lastname": "Pérez",
          "fullName": "Juan Pérez",
          "email": "juan.perez@email.com",
          "phone": "+525512345678"
        },
        "address": {
          "id": 789,
          "alias": "Casa",
          "street": "Av. Insurgentes",
          "exteriorNumber": "123",
          "interiorNumber": "A",
          "neighborhood": "Centro",
          "city": "Ciudad de México",
          "state": "CDMX",
          "zipCode": "06000",
          "references": "Edificio azul, portón principal",
          "fullAddress": "Av. Insurgentes 123 A, Centro, Ciudad de México, CDMX 06000"
        },
        "deliveryDriver": {
          "id": 321,
          "name": "Carlos",
          "lastname": "García",
          "fullName": "Carlos García",
          "phone": "+525598765432"
        },
        "payment": {
          "id": "987654321",
          "status": "completed",
          "method": "mercadopago",
          "provider": "mercadopago",
          "providerPaymentId": "MP-123456789",
          "amount": 275.00
        },
        "orderItems": [
          {
            "id": "111222333",
            "productId": 101,
            "quantity": 2,
            "pricePerUnit": 125.00,
            "product": {
              "id": 101,
              "name": "Pizza Margherita",
              "imageUrl": "https://example.com/pizza-margherita.jpg",
              "price": 125.00
            },
            "modifiers": [
              {
                "id": "444555666",
                "modifierOption": {
                  "id": 201,
                  "name": "Extra Queso",
                  "price": 15.00,
                  "modifierGroup": {
                    "id": 301,
                    "name": "Extras"
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
      "totalCount": 45,
      "totalPages": 5,
      "hasNextPage": true,
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
