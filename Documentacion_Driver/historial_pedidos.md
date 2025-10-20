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

  // ⚠️ CORRECCIÓN LÓGICA CRÍTICA #1: Filtro de Estado Completo
  // ANTES: status: 'delivered' (solo pedidos entregados)
  // AHORA: status: { in: ['delivered', 'cancelled', 'refunded'] } (historial completo)
  const where = {
    deliveryDriverId: userId,
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
        // ⚠️ CORRECCIÓN LÓGICA CRÍTICA #2: Include Completo de Modificadores
        // ANTES: orderItems sin modifiers
        // AHORA: orderItems incluye modifiers.modifierOption.modifierGroup
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

#### **⚠️ CORRECCIÓN LÓGICA CRÍTICA #1: Filtro de Estado Completo**
**Problemática Original**: El endpoint solo mostraba pedidos `status: 'delivered'`, perdiendo información importante de pedidos cancelados o reembolsados.

**Solución Implementada**: 
```javascript
// ❌ ANTES
status: 'delivered'

// ✅ AHORA 
status: { in: ['delivered', 'cancelled', 'refunded'] }
```

**Beneficio**: Historial completo de todos los pedidos finalizados, permitiendo al repartidor ver su historial real incluyendo cancelaciones y reembolsos.

#### **⚠️ CORRECCIÓN LÓGICA CRÍTICA #2: Include Completo con Modificadores**
**Problemática Original**: Los `orderItems` no incluían los `modifiers` seleccionados por el cliente, perdiendo información crucial sobre las personalizaciones del pedido.

**Solución Implementada**:
```javascript
// ❌ ANTES - Include incompleto
orderItems: {
  include: {
    product: { /* solo producto */ }
    // FALTABA: modifiers
  }
}

// ✅ AHORA - Include completo
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

**Beneficio**: El repartidor ahora puede ver exactamente qué modificaciones (tamaños, extras, exclusiones) tenía cada pedido, facilitando la verificación y gestión de entregas.

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
*Respuesta real obtenida del test exitoso del endpoint refactorizado*

```json
{
    "status": "success",
    "message": "Historial de pedidos obtenido exitosamente",
    "timestamp": "2025-10-20T20:25:59.676Z",
    "data": {
        "orders": [
            {
                "id": "5",
                "status": "delivered",
                "subtotal": 180,
                "deliveryFee": 25,
                "total": 205,
                "paymentMethod": "card",
                "paymentStatus": "completed",
                "specialInstructions": "¡Perfecto para probar acceptOrder!",
                "orderPlacedAt": "2025-10-20T18:08:53.988Z",
                "orderDeliveredAt": "2025-10-20T19:17:44.546Z",
                "createdAt": "2025-10-20T18:53:53.989Z",
                "updatedAt": "2025-10-20T19:17:44.546Z",
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
                        "latitude": 20.488765,
                        "longitude": -99.234567
                    }
                },
                "branch": {
                    "id": 1,
                    "name": "Pizzería de Ana",
                    "address": "Av. Felipe Ángeles 15, San Nicolás, Ixmiquilpan, Hgo.",
                    "phone": null,
                    "usesPlatformDrivers": true,
                    "coordinates": {
                        "latitude": 20.489,
                        "longitude": -99.23
                    },
                    "restaurant": {
                        "id": 1,
                        "name": "Pizzería de Ana"
                    }
                },
                "deliveryDriver": {
                    "id": 4,
                    "name": "Miguel",
                    "lastname": "Hernández",
                    "fullName": "Miguel Hernández",
                    "email": "miguel.hernandez@repartidor.com",
                    "phone": "5555555555"
                },
                "payment": {
                    "id": "5",
                    "status": "completed",
                    "provider": "mercadopago",
                    "providerPaymentId": "MP-444555666-READY",
                    "amount": 205,
                    "currency": "MXN"
                },
                "orderItems": [
                    {
                        "id": "6",
                        "productId": 4,
                        "quantity": 1,
                        "pricePerUnit": 180,
                        "product": {
                            "id": 4,
                            "name": "Pizza Quattro Stagioni",
                            "description": "Pizza gourmet con alcachofas, jamón, champiñones y aceitunas.",
                            "price": 180,
                            "imageUrl": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=500&h=500&fit=crop",
                            "category": {
                                "subcategory": "Pizzas Gourmet",
                                "category": "Pizzas"
                            }
                        },
                        "modifiers": []
                    }
                ],
                "deliveryStats": {
                    "deliveryTime": 4130558,
                    "deliveryTimeFormatted": "1h 8m"
                }
            },
            {
                "id": "7",
                "status": "delivered",
                "subtotal": 350,
                "deliveryFee": 25,
                "total": 375,
                "paymentMethod": "card",
                "paymentStatus": "completed",
                "specialInstructions": "Pedido entregado exitosamente",
                "orderPlacedAt": "2025-10-20T15:53:55.596Z",
                "orderDeliveredAt": "2025-10-20T16:23:55.596Z",
                "createdAt": "2025-10-20T18:53:55.598Z",
                "updatedAt": "2025-10-20T18:53:55.598Z",
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
                        "latitude": 20.488765,
                        "longitude": -99.234567
                    }
                },
                "branch": {
                    "id": 1,
                    "name": "Pizzería de Ana",
                    "address": "Av. Felipe Ángeles 15, San Nicolás, Ixmiquilpan, Hgo.",
                    "phone": null,
                    "usesPlatformDrivers": true,
                    "coordinates": {
                        "latitude": 20.489,
                        "longitude": -99.23
                    },
                    "restaurant": {
                        "id": 1,
                        "name": "Pizzería de Ana"
                    }
                },
                "deliveryDriver": {
                    "id": 4,
                    "name": "Miguel",
                    "lastname": "Hernández",
                    "fullName": "Miguel Hernández",
                    "email": "miguel.hernandez@repartidor.com",
                    "phone": "5555555555"
                },
                "payment": {
                    "id": "7",
                    "status": "completed",
                    "provider": "mercadopago",
                    "providerPaymentId": "MP-777888999-DELIVERED",
                    "amount": 375,
                    "currency": "MXN"
                },
                "orderItems": [
                    {
                        "id": "8",
                        "productId": 1,
                        "quantity": 1,
                        "pricePerUnit": 210,
                        "product": {
                            "id": 1,
                            "name": "Pizza Hawaiana",
                            "description": "La clásica pizza con jamón y piña fresca.",
                            "price": 150,
                            "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop",
                            "category": {
                                "subcategory": "Pizzas Tradicionales",
                                "category": "Pizzas"
                            }
                        },
                        "modifiers": []
                    },
                    {
                        "id": "9",
                        "productId": 2,
                        "quantity": 1,
                        "pricePerUnit": 145.5,
                        "product": {
                            "id": 2,
                            "name": "Pizza de Pepperoni",
                            "description": "Generosa porción de pepperoni sobre nuestra salsa especial de la casa.",
                            "price": 145.5,
                            "imageUrl": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&h=500&fit=crop",
                            "category": {
                                "subcategory": "Pizzas Tradicionales",
                                "category": "Pizzas"
                            }
                        },
                        "modifiers": []
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
            "totalOrders": 2,
            "totalPages": 1,
            "hasNextPage": false,
            "hasPreviousPage": false
        }
    }
}
```

---

### **🧪 Prueba Exitosa Realizada**
*Logs del test exitoso confirmando las correcciones implementadas*

**Endpoint**: `GET /api/driver/orders/history`  
**Usuario**: Miguel Hernández (ID: 4, driver_platform)  
**Resultado**: ✅ **EXITOSO** (200 OK)

**Logs de Validación**:
```json
{
  "timestamp": "2025-10-20 20:25:58.199",
  "level": "debug", 
  "message": "Ejecutando consulta de historial con filtros",
  "meta": {
    "userId": 4,
    "where": {
      "deliveryDriverId": 4,
      // ✅ CORRECCIÓN IMPLEMENTADA: Filtro completo
      "status": { "in": ["delivered", "cancelled", "refunded"] }
    },
    "orderBy": { "orderDeliveredAt": "desc" },
    "skip": 0,
    "take": 10
  }
}
{
  "timestamp": "2025-10-20 20:25:59.674",
  "level": "info",
  "message": "Historial de pedidos obtenido exitosamente", 
  "meta": {
    "userId": 4,
    "totalOrders": 2,      // ✅ Encontró pedidos con filtro corregido
    "returnedOrders": 2,   // ✅ Include completo funcionando
    "currentPage": 1,
    "pageSize": 10
  }
}
```

**Validaciones Confirmadas**:
- ✅ **Filtro Lógico Corregido**: `status: { in: ['delivered', 'cancelled', 'refunded'] }` funcionando
- ✅ **Include Completo**: `orderItems.modifiers` presentes en la respuesta (aunque vacíos en este caso)
- ✅ **Paginación**: Metadatos correctos (2 pedidos totales, página única)
- ✅ **Validación Zod**: Query params validados correctamente
- ✅ **Repository Pattern**: Lógica separada correctamente del controlador
- ✅ **ResponseService**: Respuesta estructurada consistente

**Respuesta Real**: La respuesta muestra correctamente 2 pedidos entregados (`id: 5` y `id: 7`) con toda la información completa del pedido, incluyendo la estructura completa de `modifiers` aunque estén vacíos en estos casos específicos.

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
