# 📋 Historial de Pedidos - Driver Module

## **GET /api/driver/orders/history**

Obtiene el historial de pedidos finalizados (entregados, cancelados, reembolsados) del repartidor autenticado.

---

### **🔐 Middlewares Aplicados**

1. **`authenticateToken`**: Verifica el token JWT del usuario
2. **`requireRole(['driver_platform', 'driver_restaurant'])`**: Asegura que el usuario tenga permisos de repartidor
3. **`validateQuery(historyQuerySchema)`**: Valida los query parameters usando Zod

---

### **📝 Esquema Zod - Query Parameters**

```javascript
// src/validations/driver.validation.js
const historyQuerySchema = z.object({
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

**Parámetros**:
- `page` (opcional): Número de página (default: 1, mínimo: 1)
- `pageSize` (opcional): Tamaño de página (default: 10, rango: 1-50)

---

### **⚙️ Lógica Detallada**

#### **Controller**
```javascript
// src/controllers/driver.controller.js
const getDriverOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      page: req.query.page,
      pageSize: req.query.pageSize
    };

    const result = await DriverRepository.getDriverOrderHistory(userId, filters, req.id);

    return ResponseService.success(
      res,
      'Historial de pedidos obtenido exitosamente',
      result,
      200
    );

  } catch (error) {
    // Manejo de errores específicos del repositorio
    if (error.status === 404) {
      return ResponseService.error(res, error.message, error.details || null, error.status, error.code);
    }
    if (error.status === 403) {
      return ResponseService.error(res, error.message, null, error.status, error.code);
    }
    return ResponseService.error(res, 'Error interno del servidor', null, 500, 'INTERNAL_ERROR');
  }
};
```

#### **Repository**
```javascript
// src/repositories/driver.repository.js
static async getDriverOrderHistory(userId, filters, requestId) {
  // 1. Validación de roles de repartidor usando UserService
  const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
  if (!userWithRoles) {
    throw { status: 404, message: 'Usuario no encontrado', code: 'USER_NOT_FOUND' };
  }

  // 2. Construir cláusula where con corrección lógica crítica
  const where = {
    deliveryDriverId: userId,
    // ¡CORRECCIÓN LÓGICA! Incluir todos los pedidos finalizados
    status: { in: ['delivered', 'cancelled', 'refunded'] }
  };

  // 3. Ordenar por fecha de entrega (más recientes primero)
  const orderBy = { orderDeliveredAt: 'desc' };

  // 4. Ejecutar consultas en paralelo con include COMPLETO
  const [orders, totalCount] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
      include: {
        customer: { /* campos básicos */ },
        address: { /* campos completos con coordenadas */ },
        branch: { 
          include: { 
            restaurant: { /* nombre del restaurante */ }
          }
        },
        payment: { /* estado, provider, amount */ },
        orderItems: {
          include: {
            product: { /* detalles del producto */ },
            // ✅ INCLUDE COMPLETO DE MODIFICADORES
            modifiers: {
              include: {
                modifierOption: {
                  include: {
                    modifierGroup: { /* grupo del modificador */ }
                  }
                }
              }
            }
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);

  // 5. Formatear respuesta y calcular paginación
  return {
    orders: formattedOrders,
    pagination: { /* metadatos completos */ }
  };
}
```

---

### **🔧 Características Críticas Implementadas**

#### **1. Filtro Lógico Corregido**
- **Antes**: Solo `status: 'delivered'`
- **Ahora**: `status: { in: ['delivered', 'cancelled', 'refunded'] }`
- **Beneficio**: Historial completo de todos los pedidos finalizados

#### **2. Include Completo con Modificadores**
```javascript
orderItems: {
  include: {
    product: { /* detalles del producto */ },
    modifiers: {
      include: {
        modifierOption: {
          include: {
            modifierGroup: { /* grupo del modificador */ }
          }
        }
      }
    }
  }
}
```

#### **3. Validación Zod**
- Reemplaza `express-validator` por validación moderna
- Transformación automática de strings a números
- Validaciones refinadas para rangos válidos

#### **4. Arquitectura Repository**
- Separación de responsabilidades
- Lógica de negocio en el repositorio
- Controlador simplificado usando `ResponseService`

---

### **📊 Ejemplo de Respuesta Exitosa**

```json
{
  "status": "success",
  "message": "Historial de pedidos obtenido exitosamente",
  "timestamp": "2025-01-XX...",
  "data": {
    "orders": [
      {
        "id": "5",
        "status": "delivered",
        "subtotal": 480.00,
        "deliveryFee": 25.00,
        "total": 505.00,
        "paymentMethod": "card",
        "paymentStatus": "completed",
        "specialInstructions": "Entregar en la puerta principal, tocar timbre",
        "orderPlacedAt": "2025-01-XX...",
        "orderDeliveredAt": "2025-01-XX...",
        "createdAt": "2025-01-XX...",
        "updatedAt": "2025-01-XX...",
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
          "fullAddress": "Av. Felipe Ángeles 21, San Nicolás, Ixmiquilpan, Hidalgo 42300",
          "coordinates": {
            "latitude": 20.484123,
            "longitude": -99.216345
          }
        },
        "branch": {
          "id": 1,
          "name": "Pizzería de Ana",
          "address": "Av. Felipe Ángeles 15, San Nicolás, Ixmiquilpan, Hgo.",
          "phone": "4441234567",
          "usesPlatformDrivers": true,
          "coordinates": {
            "latitude": 20.489000,
            "longitude": -99.230000
          },
          "restaurant": {
            "id": 1,
            "name": "Pizzería de Ana"
          }
        },
        "deliveryDriver": {
          "id": 2,
          "name": "Miguel",
          "lastname": "Hernández",
          "fullName": "Miguel Hernández",
          "email": "miguel.hernandez@email.com",
          "phone": "5555555555"
        },
        "payment": {
          "id": "5",
          "status": "completed",
          "provider": "mercadopago",
          "providerPaymentId": "MP-123456789-HISTORIAL",
          "amount": 505.00,
          "currency": "MXN"
        },
        "orderItems": [
          {
            "id": "7",
            "productId": 1,
            "quantity": 1,
            "pricePerUnit": 210.00,
            "product": {
              "id": 1,
              "name": "Pizza Hawaiana",
              "description": "Pizza con jamón, piña y mozzarella",
              "price": 150.00,
              "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop",
              "category": {
                "subcategory": "Pizzas",
                "category": "Platos Principales"
              }
            },
            "modifiers": [
              {
                "id": "15",
                "modifierOption": {
                  "id": 3,
                  "name": "Grande (12 pulgadas)",
                  "price": 45.00,
                  "modifierGroup": {
                    "id": 1,
                    "name": "Tamaño"
                  }
                }
              },
              {
                "id": "16",
                "modifierOption": {
                  "id": 5,
                  "name": "Extra Queso",
                  "price": 15.00,
                  "modifierGroup": {
                    "id": 2,
                    "name": "Extras"
                  }
                }
              },
              {
                "id": "17",
                "modifierOption": {
                  "id": 11,
                  "name": "Sin Cebolla",
                  "price": 0.00,
                  "modifierGroup": {
                    "id": 3,
                    "name": "Sin Ingredientes"
                  }
                }
              }
            ]
          }
        ],
        "deliveryStats": {
          "deliveryTime": 1800000,
          "deliveryTimeFormatted": "30m"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalOrders": 8,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### **❌ Manejo de Errores**

#### **400 Bad Request - Validación Zod**
```json
{
  "status": "error",
  "message": "Parámetros de consulta inválidos",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["page"],
      "message": "La página debe ser un número"
    }
  ],
  "timestamp": "2025-01-XX..."
}
```

#### **401 Unauthorized - Token Inválido**
```json
{
  "status": "error",
  "message": "Token no válido",
  "code": "INVALID_TOKEN",
  "timestamp": "2025-01-XX..."
}
```

#### **403 Forbidden - Sin Permisos**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de repartidor",
  "code": "INSUFFICIENT_PERMISSIONS",
  "timestamp": "2025-01-XX..."
}
```

#### **404 Not Found - Usuario No Encontrado**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND",
  "timestamp": "2025-01-XX..."
}
```

#### **500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-XX..."
}
```

---

### **📋 Resumen de Refactorización**

#### **Problemas Corregidos**
1. **❌ Filtro incompleto**: Solo mostraba pedidos `delivered`
   - **✅ Solucionado**: Incluye `['delivered', 'cancelled', 'refunded']`

2. **❌ Include incompleto**: Faltaban los `modifiers` de `orderItems`
   - **✅ Solucionado**: Include completo con `modifiers.modifierOption.modifierGroup`

3. **❌ Validación legacy**: Usaba `express-validator`
   - **✅ Solucionado**: Migrado a Zod con `historyQuerySchema`

4. **❌ Arquitectura**: Lógica en controlador (269 líneas)
   - **✅ Solucionado**: Lógica en `DriverRepository.getDriverOrderHistory()`

5. **❌ Manejo de respuestas**: Respuestas manuales
   - **✅ Solucionado**: Uso de `ResponseService` para consistencia

#### **Mejoras Implementadas**
- **Validación robusta** con Zod y transformaciones automáticas
- **Include completo** con todos los detalles del pedido y modificadores
- **Filtro lógico corregido** para historial completo
- **Logging estructurado** con `requestId` para debugging
- **Paginación eficiente** con consultas paralelas
- **Manejo de errores específico** por tipo de error

Esta refactorización moderniza completamente el endpoint del historial de pedidos, corrigiendo los fallos lógicos identificados y alineándolo con la arquitectura moderna del proyecto.
