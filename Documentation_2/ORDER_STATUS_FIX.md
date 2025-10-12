# Corrección del Flujo de Estados de Pedidos

## Problema Identificado

Después de un pago exitoso, el estado de la orden saltaba directamente de `pending` a `confirmed`, omitiendo el estado intermedio "Pedido Realizado" que debería indicar que el pago fue aprobado pero el restaurante aún no ha aceptado el pedido.

**Fecha:** 11 de Octubre, 2024  
**Estado:** ✅ Corregido

---

## Flujo de Estados

### ❌ ANTES (Incorrecto)

```
1. pending (Pendiente) → Orden creada, esperando pago
                ↓
        [Pago Aprobado]
                ↓
2. confirmed (Confirmado) → ❌ Salta directamente aquí
                ↓
3. preparing → ...
```

**Problema:** No había distinción entre "pago aprobado" y "restaurante aceptó el pedido".

### ✅ DESPUÉS (Correcto)

```
1. pending (Pendiente) → Orden creada, esperando pago
                ↓
        [Pago Aprobado por Webhook]
                ↓
2. placed (Pedido Realizado) → Pago completado, esperando confirmación del restaurante
                ↓
        [Restaurante Acepta Pedido Manualmente]
                ↓
3. confirmed (Pedido Confirmado) → Restaurante aceptó, comenzará a preparar
                ↓
4. preparing → Restaurante está preparando el pedido
                ↓
5. ready_for_pickup / out_for_delivery → Según tipo de entrega
                ↓
6. delivered → Entregado al cliente
```

---

## Cambios Implementados

### 1. Nuevo Estado Agregado al Enum

**Archivo:** `prisma/schema.prisma`

**ANTES:**
```prisma
enum OrderStatus {
  pending
  confirmed
  preparing
  ready_for_pickup
  out_for_delivery
  delivered
  cancelled
  refunded
}
```

**DESPUÉS:**
```prisma
enum OrderStatus {
  pending
  placed        // ← NUEVO ESTADO
  confirmed
  preparing
  ready_for_pickup
  out_for_delivery
  delivered
  cancelled
  refunded
}
```

### 2. Migración de Base de Datos Creada

**Archivo Generado:** `prisma/migrations/20251012002315_add_placed_order_status/migration.sql`

```sql
ALTER TABLE `orders` 
MODIFY `status` ENUM(
  'pending', 
  'placed',      -- ← Nuevo valor agregado
  'confirmed', 
  'preparing', 
  'ready_for_pickup', 
  'out_for_delivery', 
  'delivered', 
  'cancelled', 
  'refunded'
) NOT NULL DEFAULT 'pending';
```

**Estado:** ✅ Migración aplicada exitosamente a la base de datos

### 3. Webhook de Mercado Pago Actualizado

**Archivo:** `src/controllers/webhook.controller.js`

**Línea 84-86 - ANTES:**
```javascript
data: {
  paymentStatus: 'completed',
  status: 'confirmed'  // ❌ Incorrecto
}
```

**Línea 84-86 - DESPUÉS:**
```javascript
data: {
  paymentStatus: 'completed',
  status: 'placed'  // ✅ Correcto: Pedido Realizado
}
```

**Comentarios Agregados:**
```javascript
// Estado 'placed' = Pedido Realizado (pago aprobado, esperando confirmación del restaurante)
// El restaurante cambiará el estado a 'confirmed' manualmente cuando acepte el pedido
```

### 4. Logs Actualizados

**Línea 122 - ANTES:**
```javascript
console.log(`🎉 Pago ${paymentId} procesado. Orden ${order.id} confirmada.`);
```

**Línea 122 - DESPUÉS:**
```javascript
console.log(`🎉 Pago ${paymentId} procesado. Orden ${order.id} realizada (esperando confirmación del restaurante).`);
```

---

## Descripción de Estados

### Estados de Pedido (OrderStatus)

| Estado | Nombre en Frontend | Descripción | Quién lo Establece |
|--------|-------------------|-------------|-------------------|
| `pending` | Pendiente | Orden creada, esperando pago | Sistema (al crear orden) |
| `placed` | **Pedido Realizado** | Pago aprobado, esperando que restaurante acepte | **Webhook de MP** |
| `confirmed` | Pedido Confirmado | Restaurante aceptó el pedido | Restaurante (manual) |
| `preparing` | Preparando | Restaurante está preparando la comida | Restaurante (manual) |
| `ready_for_pickup` | Listo para Recoger | Pedido listo para ser recogido | Restaurante (manual) |
| `out_for_delivery` | En Camino | Repartidor recogió y está en camino | Driver/Restaurante |
| `delivered` | Entregado | Pedido entregado al cliente | Driver/Sistema |
| `cancelled` | Cancelado | Pedido cancelado | Cliente/Restaurante/Sistema |
| `refunded` | Reembolsado | Pago reembolsado al cliente | Sistema |

### Estados de Pago (PaymentStatus)

| Estado | Descripción |
|--------|-------------|
| `pending` | Esperando pago |
| `processing` | Pago en proceso |
| `completed` | Pago completado exitosamente |
| `failed` | Pago fallido |
| `cancelled` | Pago cancelado |
| `refunded` | Pago reembolsado |

---

## Flujo Completo del Pedido

### Paso a Paso

#### 1️⃣ **Cliente Crea Orden**
```javascript
POST /api/checkout/create-preference
→ Crea orden con status: 'pending'
→ Crea payment con status: 'pending'
→ Redirige a Mercado Pago
```

**Estado de la Orden:**
- `status`: `pending`
- `paymentStatus`: `pending`

#### 2️⃣ **Cliente Paga en Mercado Pago**
```javascript
Cliente completa el pago en la app/web de Mercado Pago
→ Mercado Pago envía webhook al backend
→ Webhook actualiza la orden
```

**Webhook Actualiza:**
- `paymentStatus`: `completed`
- `status`: `placed` ✅ (NUEVO - Pedido Realizado)

#### 3️⃣ **Restaurante Recibe Notificación**
```javascript
Socket.io emite evento 'new_order' a la sala del restaurante
→ El restaurante ve el nuevo pedido en su panel
→ Decide si acepta o rechaza
```

**Estado Actual:**
- `status`: `placed` (Esperando confirmación)
- `paymentStatus`: `completed`

#### 4️⃣ **Restaurante Acepta Pedido**
```javascript
PATCH /api/restaurant/orders/:orderId/status
Body: { status: 'confirmed' }
```

**Webhook Actualiza:**
- `status`: `confirmed` (Pedido Confirmado)
- `paymentStatus`: `completed`

#### 5️⃣ **Flujo de Preparación y Entrega**
```
confirmed → preparing → ready_for_pickup/out_for_delivery → delivered
```

---

## Archivos Modificados

### 1. ✅ `prisma/schema.prisma`
- Agregado nuevo valor `placed` al enum `OrderStatus`
- Posición: Después de `pending`, antes de `confirmed`

### 2. ✅ `src/controllers/webhook.controller.js`
- Cambiado estado de orden de `'confirmed'` a `'placed'` después del pago
- Actualizados comentarios para claridad
- Actualizado log de confirmación

### 3. ✅ `prisma/migrations/20251012002315_add_placed_order_status/`
- Migración SQL generada y aplicada
- Modifica columna `status` de la tabla `orders`
- Agrega el nuevo valor al enum

---

## Impacto en el Sistema

### Backend
- ✅ **Sin Breaking Changes:** El nuevo estado se agregó sin romper estados existentes
- ✅ **Compatible:** Pedidos antiguos siguen funcionando
- ✅ **Claro:** La distinción entre estados es ahora evidente

### Frontend
- ⚠️ **Actualización Requerida:** El frontend debe manejar el nuevo estado `placed`
- ⚠️ **Mapeo de Traducciones:** Agregar traducción para `placed` → "Pedido Realizado"
- ⚠️ **UI:** Mostrar estado apropiado en la interfaz de usuario

### Panel de Restaurantes
- ⚠️ **Actualización Requerida:** Debe mostrar pedidos con estado `placed` como "Pedido Realizado"
- ⚠️ **Acciones:** Permitir al restaurante confirmar (`placed` → `confirmed`)

---

## Testing

### Prueba del Flujo Completo

#### 1. **Crear Pedido**
```bash
curl -X POST https://delixmi-backend.onrender.com/api/checkout/create-preference \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "addressId": 1,
    "items": [{"productId": 1, "quantity": 2}]
  }'
```

**Resultado Esperado:**
- Orden creada con `status: 'pending'`
- Payment creado con `status: 'pending'`

#### 2. **Simular Webhook de Pago Aprobado**
```bash
# Mercado Pago enviará esto automáticamente
POST /api/webhooks/mercadopago
Body: {
  "type": "payment",
  "data": { "id": "payment_id_from_mp" }
}
```

**Resultado Esperado:**
- Payment actualizado a `status: 'completed'`
- Orden actualizada a `status: 'placed'` ✅ (NUEVO)
- Log: "Orden X realizada (esperando confirmación del restaurante)"
- Socket.io emite evento 'new_order' al restaurante

#### 3. **Restaurante Confirma Pedido**
```bash
curl -X PATCH https://delixmi-backend.onrender.com/api/restaurant/orders/1/status \
  -H "Authorization: Bearer {restaurant_token}" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

**Resultado Esperado:**
- Orden actualizada a `status: 'confirmed'`
- Flujo continúa normalmente

---

## Mapeo de Estados para el Frontend

### Textos Sugeridos

```javascript
const ORDER_STATUS_LABELS = {
  pending: 'Pendiente de Pago',
  placed: 'Pedido Realizado',        // ← NUEVO
  confirmed: 'Pedido Confirmado',
  preparing: 'Preparando tu Pedido',
  ready_for_pickup: 'Listo para Recoger',
  out_for_delivery: 'En Camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado'
};
```

### Colores Sugeridos

```javascript
const ORDER_STATUS_COLORS = {
  pending: '#FFC107',        // Amarillo - Esperando
  placed: '#2196F3',         // Azul - Realizado (NUEVO)
  confirmed: '#4CAF50',      // Verde - Confirmado
  preparing: '#FF9800',      // Naranja - Preparando
  ready_for_pickup: '#9C27B0', // Púrpura - Listo
  out_for_delivery: '#3F51B5', // Azul Oscuro - En camino
  delivered: '#4CAF50',      // Verde - Entregado
  cancelled: '#F44336',      // Rojo - Cancelado
  refunded: '#9E9E9E'        // Gris - Reembolsado
};
```

### Íconos Sugeridos

```javascript
const ORDER_STATUS_ICONS = {
  pending: '⏳',      // Reloj de arena
  placed: '✅',       // Checkmark (NUEVO)
  confirmed: '👍',    // Pulgar arriba
  preparing: '👨‍🍳',    // Chef
  ready_for_pickup: '📦', // Paquete
  out_for_delivery: '🚗', // Auto
  delivered: '🎉',    // Celebración
  cancelled: '❌',    // X
  refunded: '💰'      // Dinero
};
```

---

## Queries Útiles

### Obtener Pedidos en Estado "Placed"

```javascript
// Pedidos pagados esperando confirmación del restaurante
const placedOrders = await prisma.order.findMany({
  where: {
    status: 'placed',
    paymentStatus: 'completed'
  },
  include: {
    customer: true,
    branch: { include: { restaurant: true } },
    orderItems: { include: { product: true } }
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

### Obtener Pedidos por Restaurante (Solo Placed)

```javascript
// Para el panel del restaurante
const newOrders = await prisma.order.findMany({
  where: {
    branch: {
      restaurantId: restaurantId
    },
    status: 'placed'  // Solo pedidos que necesitan confirmación
  },
  include: {
    customer: true,
    address: true,
    orderItems: { include: { product: true } },
    payment: true
  },
  orderBy: {
    createdAt: 'desc'
  }
});
```

---

## Verificaciones Importantes

### ✅ Checklist Post-Migración

- [x] ✅ Nuevo estado `placed` agregado al enum
- [x] ✅ Migración de BD aplicada exitosamente
- [x] ✅ Webhook actualizado para usar estado `placed`
- [x] ✅ Logs actualizados para reflejar el cambio
- [x] ✅ Sin errores de linter
- [ ] ⬜ Frontend actualizado para mostrar estado `placed`
- [ ] ⬜ Panel de restaurante actualizado para manejar estado `placed`
- [ ] ⬜ Pruebas end-to-end realizadas
- [ ] ⬜ Documentación de API actualizada

---

## Compatibilidad con Pedidos Existentes

### ¿Qué pasa con los pedidos existentes?

**Pedidos en `confirmed` antes de la migración:**
- ✅ Siguen funcionando normalmente
- ✅ No se ven afectados
- ✅ Pueden continuar su flujo normal

**Nuevos pedidos después de la migración:**
- ✅ Siguen el flujo correcto: `pending` → `placed` → `confirmed`
- ✅ Clara distinción entre estados

### Migración de Datos (Opcional)

Si deseas actualizar pedidos existentes que están en `confirmed` pero en realidad deberían estar en `placed`:

```sql
-- USAR CON PRECAUCIÓN - Solo si es necesario
UPDATE orders 
SET status = 'placed' 
WHERE status = 'confirmed' 
  AND paymentStatus = 'completed'
  AND orderPlacedAt > '2024-10-11 00:00:00'  -- Solo pedidos recientes
  AND updatedAt < DATE_ADD(orderPlacedAt, INTERVAL 5 MINUTE);  -- Confirmados muy rápido
```

**⚠️ ADVERTENCIA:** Solo ejecuta esto si estás seguro de que necesitas migrar datos históricos.

---

## Endpoint de Actualización de Estado

### Para el Panel de Restaurantes

El restaurante debe poder cambiar el estado de `placed` a `confirmed`:

```javascript
PATCH /api/restaurant/orders/:orderId/status

Headers:
  Authorization: Bearer {restaurant_token}

Body:
{
  "status": "confirmed"
}
```

**Validación Recomendada:**
- Solo permitir transiciones válidas
- `placed` → `confirmed` ✅
- `confirmed` → `preparing` ✅
- `pending` → `confirmed` ❌ (debe pasar por `placed` primero)

---

## Impacto en Otros Módulos

### 1. Customer Orders Endpoint
**Archivo:** `src/controllers/customer.controller.js`

**Verificar:**
- ✅ Que muestre pedidos con estado `placed`
- ✅ Que el cliente pueda ver "Pedido Realizado"

### 2. Driver Orders Endpoint
**Archivo:** `src/controllers/driver.controller.js`

**Verificar:**
- ✅ Los drivers no deben ver pedidos en estado `placed` (solo `out_for_delivery`)
- ✅ Sin cambios necesarios aquí

### 3. Admin Dashboard
**Archivo:** `src/controllers/admin.controller.js`

**Verificar:**
- ✅ Mostrar todos los estados correctamente, incluyendo `placed`

---

## Logs Mejorados

### ANTES (Confuso)
```
✅ Pago 123456 aprobado. Procesando orden...
🎉 Pago 123456 procesado. Orden 789 confirmada.
```

**Problema:** Sugiere que el restaurante ya confirmó el pedido.

### DESPUÉS (Claro)
```
✅ Pago 123456 aprobado. Procesando orden...
🎉 Pago 123456 procesado. Orden 789 realizada (esperando confirmación del restaurante).
```

**Beneficio:** Deja claro que el restaurante aún necesita aceptar el pedido.

---

## Cambios en la Base de Datos

### Estructura de la Tabla `orders`

```sql
-- Columna 'status' actualizada
status ENUM(
  'pending',           -- Esperando pago
  'placed',            -- Pago completado (NUEVO)
  'confirmed',         -- Restaurante aceptó
  'preparing',         -- Preparando comida
  'ready_for_pickup',  -- Listo para recoger
  'out_for_delivery',  -- En camino
  'delivered',         -- Entregado
  'cancelled',         -- Cancelado
  'refunded'           -- Reembolsado
) NOT NULL DEFAULT 'pending'
```

---

## Próximos Pasos para Desarrollo

### Para el Backend
- [x] ✅ Agregar estado `placed` al enum
- [x] ✅ Aplicar migración a la base de datos
- [x] ✅ Actualizar webhook para usar `placed`
- [ ] ⬜ Agregar validaciones de transición de estados
- [ ] ⬜ Crear endpoint para transiciones de estado con validación

### Para el Frontend
- [ ] ⬜ Actualizar mapeo de estados para incluir `placed`
- [ ] ⬜ Agregar texto "Pedido Realizado" en traducciones
- [ ] ⬜ Actualizar UI para mostrar nuevo estado
- [ ] ⬜ Probar flujo completo desde registro hasta entrega

### Para el Panel de Restaurantes
- [ ] ⬜ Mostrar pedidos en estado `placed` en la lista de "Nuevos Pedidos"
- [ ] ⬜ Permitir confirmar pedidos (cambiar de `placed` a `confirmed`)
- [ ] ⬜ Agregar notificaciones para pedidos en estado `placed`
- [ ] ⬜ Probar flujo de confirmación

---

## Beneficios de la Corrección

### 1. ✅ Flujo Lógico Correcto
- Clara separación entre "pago aprobado" y "restaurante aceptó"
- El restaurante tiene control explícito sobre qué pedidos acepta

### 2. ✅ Mejor Trazabilidad
- Se puede rastrear cuándo se pagó vs. cuándo se confirmó
- Analytics más precisos

### 3. ✅ Flexibilidad para el Restaurante
- El restaurante puede rechazar pedidos incluso después del pago
- Permite implementar lógica de capacidad/disponibilidad

### 4. ✅ Mejor UX para el Cliente
- El cliente sabe que su pago fue procesado (`placed`)
- Puede ver cuando el restaurante aceptó su pedido (`confirmed`)

---

## Códigos de Ejemplo

### Verificar Estado de Orden

```javascript
// En el frontend, después de un pago exitoso
const checkOrderStatus = async (orderId, token) => {
  const response = await fetch(
    `https://delixmi-backend.onrender.com/api/customer/orders/${orderId}`,
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
  
  const data = await response.json();
  
  if (data.data.order.status === 'placed') {
    // Mostrar: "Tu pago fue aprobado. El restaurante está revisando tu pedido."
  } else if (data.data.order.status === 'confirmed') {
    // Mostrar: "¡El restaurante aceptó tu pedido! Comenzarán a prepararlo pronto."
  }
};
```

---

## Rollback (Si es Necesario)

Si por alguna razón necesitas revertir este cambio:

### 1. Revertir Código
```bash
git revert <commit_hash>
git push origin main
```

### 2. Revertir Migración de BD
```bash
# Opción A: Rollback de migración
npx prisma migrate resolve --rolled-back 20251012002315_add_placed_order_status

# Opción B: Crear nueva migración que elimine el estado
# (Solo si hay datos usando 'placed' - requiere migración de datos)
```

**⚠️ ADVERTENCIA:** Si ya hay pedidos con estado `placed`, necesitarás migrar esos datos antes de eliminar el estado del enum.

---

## Conclusión

✅ **Error Corregido:** El flujo de estados ahora es lógico y claro  
✅ **Migración Aplicada:** Base de datos actualizada  
✅ **Código Actualizado:** Webhook usa el estado correcto  
✅ **Documentación Completa:** Lista para el equipo  

El flujo de estados de pedidos ahora sigue la secuencia correcta:
**`pending` → `placed` → `confirmed` → `preparing` → ... → `delivered`**

---

**Estado:** ✅ Completado  
**Migración:** `20251012002315_add_placed_order_status`  
**Versión:** 1.1.0

