# 📦 Flujo del Cliente - Gestión de Pedidos

## 🎯 Descripción General

Este documento describe el flujo completo para que un cliente pueda ver sus pedidos activos, consultar detalles de pedidos específicos y acceder a su historial de pedidos completados.

---

## 🔄 Flujo Completo del Cliente

### 1️⃣ **MIS PEDIDOS (PEDIDOS ACTIVOS)**

En la barra de navegación hay una sección llamada "Mis pedidos" que muestra todos los pedidos en curso (activos) del cliente.

#### Endpoint
```
GET /api/customer/orders
```

#### Headers Requeridos
```
Authorization: Bearer <token>
```

#### Query Parameters (Opcionales)
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `status` | string | - | Filtrar por estado específico (ver estados disponibles abajo) |
| `page` | number | 1 | Número de página |
| `pageSize` | number | 10 | Cantidad de pedidos por página (máx: 100) |

#### Estados de Pedido Disponibles
- `pending` - Pedido pendiente
- `confirmed` - Pedido confirmado
- `preparing` - En preparación
- `ready_for_pickup` - Listo para recoger
- `out_for_delivery` - En camino
- `delivered` - Entregado
- `cancelled` - Cancelado
- `refunded` - Reembolsado

#### Ejemplo de Uso - Pedidos Activos

Para obtener solo los pedidos activos (no entregados), puedes hacer múltiples llamadas con diferentes estados o filtrar en el frontend:

```javascript
// Opción 1: Obtener TODOS los pedidos y filtrar en frontend
GET /api/customer/orders

// Opción 2: Hacer una llamada por cada estado activo
GET /api/customer/orders?status=pending
GET /api/customer/orders?status=confirmed
GET /api/customer/orders?status=preparing
GET /api/customer/orders?status=ready_for_pickup
GET /api/customer/orders?status=out_for_delivery
```

**💡 Recomendación:** Obtén todos los pedidos y filtra en el frontend para mejor rendimiento.

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "message": "Historial de pedidos obtenido exitosamente",
  "data": {
    "orders": [
      {
        "id": "1",
        "status": "confirmed",
        "subtotal": 175.50,
        "deliveryFee": 20.00,
        "total": 195.50,
        "paymentMethod": "card",
        "paymentStatus": "completed",
        "specialInstructions": "Entregar en la puerta principal",
        "orderPlacedAt": "2025-10-09T10:30:00.000Z",
        "orderDeliveredAt": null,
        "createdAt": "2025-10-09T10:30:00.000Z",
        "updatedAt": "2025-10-09T10:35:00.000Z",
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana",
          "logoUrl": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
          "coverPhotoUrl": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1200",
          "branch": {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
            "phone": "7711234567"
          }
        },
        "deliveryAddress": {
          "id": 1,
          "alias": "Casa",
          "street": "Av. Felipe Ángeles",
          "exteriorNumber": "21",
          "interiorNumber": null,
          "neighborhood": "San Nicolás",
          "city": "Ixmiquilpan",
          "state": "Hidalgo",
          "zipCode": "42300",
          "references": "Casa de dos pisos con portón de madera."
        },
        "deliveryDriver": null,
        "items": [
          {
            "id": "1",
            "quantity": 1,
            "pricePerUnit": 150.00,
            "subtotal": 150.00,
            "product": {
              "id": 1,
              "name": "Pizza Hawaiana",
              "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500"
            }
          },
          {
            "id": "2",
            "quantity": 1,
            "pricePerUnit": 25.50,
            "subtotal": 25.50,
            "product": {
              "id": 7,
              "name": "Coca-Cola 600ml",
              "imageUrl": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500"
            }
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalOrders": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "filters": {
      "status": null
    },
    "customer": {
      "id": 5,
      "name": "Sofía",
      "lastname": "López"
    },
    "retrievedAt": "2025-10-09T14:30:00.000Z"
  }
}
```

#### 🎨 UI - Tarjeta de Pedido en "Mis Pedidos":

Cada tarjeta debe mostrar:
- ✅ **Pedido #{id}** - Número de pedido (ej: "Pedido #1")
- ✅ **status** - Estado del pedido con badge de color:
  - `pending` - Badge amarillo "Pendiente"
  - `confirmed` - Badge azul "Confirmado"
  - `preparing` - Badge naranja "En preparación"
  - `ready_for_pickup` - Badge morado "Listo para recoger"
  - `out_for_delivery` - Badge verde "En camino"
  - `delivered` - Badge verde oscuro "Entregado"
  - `cancelled` - Badge rojo "Cancelado"
  - `refunded` - Badge gris "Reembolsado"
- ✅ **restaurant.coverPhotoUrl** - Imagen del establecimiento
- ✅ **restaurant.name** - Nombre del restaurante
- ✅ **restaurant.branch.name** - Sucursal a donde se mandó el pedido
- ✅ **items.length** - Cantidad de productos en el pedido
- ✅ **deliveryAddress.alias** - Solo el alias de la dirección (ej: "Casa", "Oficina")
- ✅ **paymentMethod** - Método de pago:
  - `card` - "Tarjeta"
  - `cash` - "Efectivo"
- ✅ **total** - Precio total del pedido
- ✅ **orderPlacedAt** - Hora en que se realizó el pedido (formato: "10:30 AM")

---

### 2️⃣ **DETALLES DE UN PEDIDO**

Al pulsar sobre una tarjeta de pedido, se abre una vista con todos los detalles del pedido, dividida en secciones.

#### Endpoint
```
GET /api/customer/orders/:orderId
```

#### Headers Requeridos
```
Authorization: Bearer <token>
```

#### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `orderId` | number | ID del pedido |

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "message": "Detalles del pedido obtenidos exitosamente",
  "data": {
    "order": {
      "id": "1",
      "orderNumber": "DEL-000001",
      "status": "confirmed",
      "paymentMethod": "card",
      "paymentStatus": "completed",
      "subtotal": 175.50,
      "deliveryFee": 20.00,
      "serviceFee": 0.00,
      "total": 195.50,
      "specialInstructions": "Entregar en la puerta principal",
      "orderPlacedAt": "2025-10-09T10:30:00.000Z",
      "orderDeliveredAt": null,
      "estimatedDeliveryTime": {
        "timeRange": "30-45 min",
        "estimatedDeliveryAt": "2025-10-09T11:15:00.000Z"
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana",
        "logoUrl": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
        "coverPhotoUrl": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1200",
        "branch": {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "phone": "7711234567"
        }
      },
      "deliveryAddress": {
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
        "latitude": 20.488765,
        "longitude": -99.234567
      },
      "deliveryDriver": null,
      "items": [
        {
          "id": "1",
          "quantity": 1,
          "pricePerUnit": 150.00,
          "subtotal": 150.00,
          "product": {
            "id": 1,
            "name": "Pizza Hawaiana",
            "imageUrl": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500",
            "description": "La clásica pizza con jamón y piña fresca."
          }
        },
        {
          "id": "2",
          "quantity": 1,
          "pricePerUnit": 25.50,
          "subtotal": 25.50,
          "product": {
            "id": 7,
            "name": "Coca-Cola 600ml",
            "imageUrl": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500",
            "description": "Refresco de cola bien frío."
          }
        }
      ],
      "createdAt": "2025-10-09T10:30:00.000Z",
      "updatedAt": "2025-10-09T10:35:00.000Z"
    },
    "customer": {
      "id": 5,
      "name": "Sofía",
      "lastname": "López"
    },
    "retrievedAt": "2025-10-09T14:30:00.000Z"
  }
}
```

#### 🎨 UI - Vista de Detalles del Pedido

La vista se divide en 5 secciones:

### **Sección 1: Ubicación de Entrega** 📍

Mostrar un mapa de Google Maps con:
- ✅ **Punto VERDE** - Ubicación del cliente (`deliveryAddress.latitude`, `deliveryAddress.longitude`)
- ✅ **Punto ROJO** - Ubicación del restaurante (necesitas obtener las coordenadas de la sucursal)

**Nota:** Para obtener las coordenadas del restaurante, puedes:
1. Guardarlas cuando el cliente selecciona la sucursal al hacer el pedido
2. O hacer una llamada adicional al endpoint de restaurantes

```javascript
// Implementación del mapa
const customerLocation = {
  lat: order.deliveryAddress.latitude,
  lng: order.deliveryAddress.longitude
};

// Para obtener ubicación del restaurante, necesitas hacer:
// GET /api/restaurants/:restaurantId
// y usar las coordenadas de la sucursal
```

---

### **Sección 2: Estado del Pedido** 🚀

- ✅ **status** - Estado actual del pedido con badge visual
- ✅ Timeline visual mostrando el progreso:
  ```
  ✅ Pedido realizado
  ✅ Pedido confirmado
  🔄 En preparación  ← (Estado actual)
  ⏳ Listo para recoger
  ⏳ En camino
  ⏳ Entregado
  ```

**Mapeo de estados para la timeline:**
```javascript
const orderSteps = [
  { status: 'pending', label: 'Pedido realizado', completed: true },
  { status: 'confirmed', label: 'Pedido confirmado', completed: order.status !== 'pending' },
  { status: 'preparing', label: 'En preparación', completed: ['preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered'].includes(order.status) },
  { status: 'ready_for_pickup', label: 'Listo para recoger', completed: ['ready_for_pickup', 'out_for_delivery', 'delivered'].includes(order.status) },
  { status: 'out_for_delivery', label: 'En camino', completed: ['out_for_delivery', 'delivered'].includes(order.status) },
  { status: 'delivered', label: 'Entregado', completed: order.status === 'delivered' }
];
```

---

### **Sección 3: Restaurante** 🏪

- ✅ **restaurant.coverPhotoUrl** - Imagen de portada del restaurante
- ✅ **restaurant.branch.name** - Nombre de la sucursal
- ✅ **restaurant.branch.address** - Dirección completa del establecimiento
- ✅ **restaurant.branch.phone** - Teléfono del restaurante (clickeable para llamar)

---

### **Sección 4: Resumen del Pedido** 📋

Para cada producto en `items`:
- ✅ **product.imageUrl** - Imagen del producto
- ✅ **quantity** - Cantidad
- ✅ **product.name** - Nombre del platillo
- ✅ **pricePerUnit** - Precio unitario
- ✅ **subtotal** - Subtotal del item (quantity × pricePerUnit)

**Al final mostrar:**
```
Subtotal:          $175.50
Costo de envío:    $20.00
Cuota de servicio: $0.00
─────────────────────────
Total:             $195.50
```

---

### **Sección 5: Información del Pago** 💳

- ✅ **paymentMethod** - Método de pago:
  - `card` → Mostrar: "Tarjeta de crédito/débito"
  - `cash` → Mostrar: "Efectivo"
- ✅ **paymentStatus** - Estado del pago:
  - `pending` - Badge amarillo "Pendiente"
  - `processing` - Badge azul "Procesando"
  - `completed` - Badge verde "Completado"
  - `failed` - Badge rojo "Fallido"
  - `cancelled` - Badge gris "Cancelado"
  - `refunded` - Badge morado "Reembolsado"

---

### 3️⃣ **HISTORIAL DE PEDIDOS** 📜

En la sección "Perfil" de la barra de navegación, cuando se pulsa "Historial de pedidos", se muestra una lista de todos los pedidos completados (entregados).

#### Endpoint
```
GET /api/customer/orders?status=delivered
```

#### Headers Requeridos
```
Authorization: Bearer <token>
```

#### Query Parameters
| Parámetro | Tipo | Default | Valor Recomendado |
|-----------|------|---------|-------------------|
| `status` | string | - | `delivered` |
| `page` | number | 1 | - |
| `pageSize` | number | 10 | - |

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "message": "Historial de pedidos obtenido exitosamente",
  "data": {
    "orders": [
      {
        "id": "2",
        "status": "delivered",
        "subtotal": 225.00,
        "deliveryFee": 25.00,
        "total": 250.00,
        "paymentMethod": "cash",
        "paymentStatus": "completed",
        "specialInstructions": "Por favor tocar el timbre fuerte",
        "orderPlacedAt": "2025-10-08T14:00:00.000Z",
        "orderDeliveredAt": "2025-10-08T14:45:00.000Z",
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana",
          "logoUrl": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400",
          "coverPhotoUrl": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1200",
          "branch": {
            "id": 2,
            "name": "Sucursal Río",
            "address": "Paseo del Roble 205, Barrio del Río, Ixmiquilpan, Hgo.",
            "phone": "7717654321"
          }
        },
        "deliveryAddress": {
          "id": 2,
          "alias": "Oficina",
          "street": "Calle Hidalgo",
          "exteriorNumber": "125",
          "interiorNumber": "A",
          "neighborhood": "Centro",
          "city": "Ixmiquilpan",
          "state": "Hidalgo",
          "zipCode": "42300",
          "references": "Edificio de oficinas, segundo piso."
        },
        "deliveryDriver": {
          "id": 4,
          "name": "Miguel",
          "lastname": "Hernández",
          "phone": "5555555555"
        },
        "items": [
          {
            "id": "3",
            "quantity": 1,
            "pricePerUnit": 180.00,
            "subtotal": 180.00,
            "product": {
              "id": 4,
              "name": "Pizza Quattro Stagioni",
              "imageUrl": "https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=500"
            }
          },
          {
            "id": "4",
            "quantity": 1,
            "pricePerUnit": 25.00,
            "subtotal": 25.00,
            "product": {
              "id": 8,
              "name": "Sprite 600ml",
              "imageUrl": "https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=500"
            }
          },
          {
            "id": "5",
            "quantity": 1,
            "pricePerUnit": 55.00,
            "subtotal": 55.00,
            "product": {
              "id": 10,
              "name": "Tiramisú",
              "imageUrl": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500"
            }
          }
        ]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalOrders": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "filters": {
      "status": "delivered"
    },
    "customer": {
      "id": 5,
      "name": "Sofía",
      "lastname": "López"
    },
    "retrievedAt": "2025-10-09T14:30:00.000Z"
  }
}
```

#### 🎨 UI - Historial de Pedidos

**Vista de lista:**
- Usa exactamente el mismo diseño de tarjetas que en "Mis Pedidos"
- Solo se muestran pedidos con `status: "delivered"`
- Al pulsar sobre una tarjeta, abre la misma vista de detalles

**Diferencias visuales opcionales:**
- Las tarjetas pueden tener un border o badge que indique "Completado"
- Podrías agregar la fecha de entrega: `orderDeliveredAt`

---

## 🔄 Flujo Completo del Usuario (UX)

### **Flujo: Ver Pedidos Activos**

```
1. Usuario va a "Mis Pedidos" en la barra de navegación
   ↓
2. Se hace petición: GET /api/customer/orders
   ↓
3. Frontend filtra pedidos con status diferente a "delivered"
   ↓
4. Se muestran tarjetas de pedidos activos con:
   - Pedido #{id}
   - Badge de estado
   - Imagen del restaurante
   - Nombre del restaurante y sucursal
   - Cantidad de productos
   - Dirección (alias)
   - Método de pago
   - Total
   - Hora del pedido
   ↓
5. Usuario pulsa sobre una tarjeta
   ↓
6. Se hace petición: GET /api/customer/orders/:orderId
   ↓
7. Se muestra vista de detalles con 5 secciones:
   - Mapa con ubicaciones
   - Estado del pedido (timeline)
   - Información del restaurante
   - Resumen del pedido
   - Información del pago
```

### **Flujo: Ver Historial de Pedidos**

```
1. Usuario va a "Perfil" en la barra de navegación
   ↓
2. Aparece la vista "Mi Perfil" con opciones:
   - Mis direcciones
   - Historial de pedidos ← Usuario pulsa aquí
   ↓
3. Se hace petición: GET /api/customer/orders?status=delivered
   ↓
4. Se muestran tarjetas de pedidos completados (mismo diseño que "Mis Pedidos")
   ↓
5. Usuario pulsa sobre una tarjeta
   ↓
6. Se hace petición: GET /api/customer/orders/:orderId
   ↓
7. Se muestra la misma vista de detalles que en pedidos activos
```

---

## 📊 Estados del Pedido Explicados

| Estado | Descripción | Visible en "Mis Pedidos" | Visible en "Historial" |
|--------|-------------|---------------------------|------------------------|
| `pending` | Pedido recibido, esperando confirmación | ✅ Sí | ❌ No |
| `confirmed` | Pedido confirmado por el restaurante | ✅ Sí | ❌ No |
| `preparing` | El restaurante está preparando la comida | ✅ Sí | ❌ No |
| `ready_for_pickup` | Comida lista, esperando al repartidor | ✅ Sí | ❌ No |
| `out_for_delivery` | Repartidor en camino | ✅ Sí | ❌ No |
| `delivered` | Pedido entregado al cliente | ❌ No | ✅ Sí |
| `cancelled` | Pedido cancelado | ✅ Sí (opcional) | ❌ No |
| `refunded` | Pedido reembolsado | ✅ Sí (opcional) | ❌ No |

---

## 💡 Lógica del Frontend

### **Filtrar Pedidos Activos vs Historial**

```javascript
// Obtener todos los pedidos
const { orders } = await fetchCustomerOrders();

// Pedidos activos (para "Mis Pedidos")
const activeOrders = orders.filter(order => 
  ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status)
);

// Pedidos completados (para "Historial de Pedidos")
const completedOrders = orders.filter(order => 
  order.status === 'delivered'
);

// Opcional: Pedidos cancelados/reembolsados
const cancelledOrders = orders.filter(order => 
  ['cancelled', 'refunded'].includes(order.status)
);
```

### **Formatear Fecha y Hora**

```javascript
// Formatear fecha del pedido
const formatOrderDate = (orderPlacedAt) => {
  const date = new Date(orderPlacedAt);
  
  // Formato: "9 Oct, 10:30 AM"
  return new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }).format(date);
};

// Uso
<Text>{formatOrderDate(order.orderPlacedAt)}</Text>
// Output: "9 Oct, 10:30 AM"
```

### **Calcular Total de Items**

```javascript
// Total de items en el pedido
const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

// Uso en la tarjeta
<Text>{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</Text>
```

### **Badge de Estado con Color**

```javascript
const getStatusConfig = (status) => {
  const statusMap = {
    pending: { label: 'Pendiente', color: '#FFA500' },        // Naranja
    confirmed: { label: 'Confirmado', color: '#2196F3' },     // Azul
    preparing: { label: 'En preparación', color: '#FF9800' }, // Naranja oscuro
    ready_for_pickup: { label: 'Listo', color: '#9C27B0' },   // Morado
    out_for_delivery: { label: 'En camino', color: '#4CAF50' }, // Verde
    delivered: { label: 'Entregado', color: '#2E7D32' },      // Verde oscuro
    cancelled: { label: 'Cancelado', color: '#F44336' },      // Rojo
    refunded: { label: 'Reembolsado', color: '#9E9E9E' }      // Gris
  };
  return statusMap[status] || { label: status, color: '#757575' };
};

// Uso
const statusConfig = getStatusConfig(order.status);
<Badge backgroundColor={statusConfig.color}>{statusConfig.label}</Badge>
```

---

## 🚀 Endpoints Completos del Flujo

| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| GET | `/api/customer/orders` | ✅ Sí | Listar todos los pedidos |
| GET | `/api/customer/orders?status=pending` | ✅ Sí | Listar pedidos pendientes |
| GET | `/api/customer/orders?status=delivered` | ✅ Sí | Listar pedidos entregados (historial) |
| GET | `/api/customer/orders/:orderId` | ✅ Sí | Ver detalles de un pedido específico |

---

## ✅ Checklist de Implementación Frontend

### **Vista "Mis Pedidos"**
- [ ] Llamar a `/api/customer/orders`
- [ ] Filtrar pedidos activos (`status !== 'delivered'`)
- [ ] Renderizar tarjetas de pedidos con toda la información requerida
- [ ] Agregar badge de estado con colores
- [ ] Formatear fecha y hora del pedido
- [ ] Mostrar cantidad total de productos
- [ ] Hacer tarjetas clickeables para ver detalles

### **Vista "Detalles del Pedido"**
- [ ] Llamar a `/api/customer/orders/:orderId`
- [ ] **Sección 1:** Implementar mapa de Google Maps con puntos verde y rojo
- [ ] **Sección 2:** Crear timeline de estados del pedido
- [ ] **Sección 3:** Mostrar información del restaurante con imagen de portada
- [ ] **Sección 4:** Listar productos con imágenes, cantidades y precios
- [ ] **Sección 4:** Calcular y mostrar subtotal, costo de envío, cuota de servicio y total
- [ ] **Sección 5:** Mostrar método y estado de pago con badges

### **Vista "Historial de Pedidos"**
- [ ] Agregar opción "Historial de pedidos" en el perfil
- [ ] Llamar a `/api/customer/orders?status=delivered`
- [ ] Renderizar mismas tarjetas que "Mis Pedidos"
- [ ] Agregar indicador visual de "Completado"
- [ ] Mostrar fecha de entrega
- [ ] Hacer tarjetas clickeables para ver detalles

### **Funcionalidad General**
- [ ] Implementar paginación si hay muchos pedidos
- [ ] Agregar pull-to-refresh
- [ ] Mostrar estado de carga mientras se obtienen los pedidos
- [ ] Manejar estado vacío ("No tienes pedidos activos")
- [ ] Implementar manejo de errores
- [ ] Actualizar automáticamente el estado con Socket.io (opcional)

---

## 🔐 Autenticación

**IMPORTANTE:** Todos los endpoints del cliente requieren autenticación.

```javascript
// Agregar header en todas las peticiones
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📝 Notas Adicionales

### **Obtener Coordenadas del Restaurante para el Mapa**

Para mostrar el punto rojo del restaurante en el mapa, necesitas las coordenadas de la sucursal. Tienes dos opciones:

**Opción 1:** Guardar las coordenadas al hacer el checkout (recomendado)
```javascript
// Al crear la orden, incluir las coordenadas de la sucursal seleccionada
// Esto requeriría agregar campos a la tabla Order
```

**Opción 2:** Hacer una llamada adicional al endpoint de restaurantes
```javascript
// En la vista de detalles, llamar:
GET /api/restaurants/:restaurantId

// Y usar las coordenadas de la sucursal correspondiente
const branch = restaurant.branches.find(b => b.id === order.restaurant.branch.id);
const restaurantLocation = {
  lat: branch.latitude,
  lng: branch.longitude
};
```

### **Cuota de Servicio (Service Fee)**

Actualmente, la cuota de servicio se calcula como:
```javascript
serviceFee = total - subtotal - deliveryFee
```

Si este valor es 0, significa que no hay cuota de servicio aplicada. Puedes decidir en el frontend si mostrar esta línea o ocultarla cuando es $0.

### **Pedidos Cancelados y Reembolsados**

Puedes decidir si mostrar estos pedidos en "Mis Pedidos" o crear una sección separada para "Pedidos Cancelados". Lo recomendado es:
- **Mostrarlos brevemente** en "Mis Pedidos" con un badge rojo
- **No mostrarlos** en el historial de pedidos

---

## 🎨 Recomendaciones de UX/UI

### 1. **Indicadores visuales claros**
- Usar colores consistentes para cada estado
- Iconos para método de pago (💳 tarjeta, 💵 efectivo)
- Timeline visual para el progreso del pedido

### 2. **Información prioritaria**
- El estado del pedido debe ser lo más visible
- El total del pedido debe ser fácil de encontrar
- La hora estimada de entrega debe estar destacada

### 3. **Acciones rápidas**
- Botón para llamar al restaurante (tel: link)
- Botón para reportar un problema
- Botón para repetir el pedido (opcional)

### 4. **Feedback en tiempo real**
- Usar Socket.io para actualizar el estado automáticamente
- Notificaciones push cuando cambia el estado
- Actualización automática de la ubicación del repartidor

### 5. **Estado vacío**
- Mostrar ilustración amigable cuando no hay pedidos
- Botón para "Explorar restaurantes"
- Mensaje motivador

---

**Documentación actualizada:** Octubre 2025  
**Versión:** 1.0  
**Backend:** Node.js + Express + Prisma + MySQL

