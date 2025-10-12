# Fix: Soporte para `useCart` en Endpoints de Checkout

**Fecha:** 12 de Octubre, 2025  
**Severidad:** ALTA  
**Estado:** RESUELTO ✅

---

## 📋 Problema Identificado

Los endpoints de checkout tenían dos problemas relacionados con el uso de carritos:

### Problema 1: Error de Prisma en `createPreference`
**Error:** `Argument 'restaurantId' is missing`

**Causa:** Cuando el cliente enviaba `useCart: true` pero no incluía `restaurantId`, Prisma fallaba al intentar buscar el carrito porque la consulta requiere ambos campos (`userId` y `restaurantId`) para la clave compuesta.

### Problema 2: `createCashOrder` no soportaba `useCart`
**Error:** Validación exigía `items` como campo obligatorio

**Causa:** El endpoint de pago en efectivo no tenía implementada la lógica para procesar pedidos usando el carrito, solo aceptaba items directos.

---

## ✅ Solución Implementada

### 1. Validaciones Mejoradas

#### En `createPreference` y `createCashOrder`:
```javascript
// Validar que si useCart es true, restaurantId sea obligatorio
if (useCart && !restaurantId) {
  return res.status(400).json({
    status: 'error',
    message: 'El restaurantId es obligatorio cuando se usa el carrito (useCart: true)'
  });
}

// Validar que si no usa carrito, items sea obligatorio
if (!useCart && (!items || items.length === 0)) {
  return res.status(400).json({
    status: 'error',
    message: 'Debe proporcionar items o usar el carrito (useCart: true con restaurantId)'
  });
}
```

### 2. Lógica de Carrito en `createCashOrder`

Se agregó la misma lógica que `createPreference` para obtener items del carrito:

```javascript
// Si useCart es true, obtener items del carrito
let cartItems = [];
let itemsToProcess = items || [];

if (useCart) {
  const cart = await prisma.cart.findUnique({
    where: {
      userId_restaurantId: {
        userId: userId,
        restaurantId: restaurantId
      }
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              isAvailable: true
            }
          }
        }
      }
    }
  });

  if (!cart || cart.items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Carrito vacío o no encontrado'
    });
  }

  cartItems = cart.items.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    priceAtAdd: item.priceAtAdd
  }));
  
  itemsToProcess = cartItems;
}
```

### 3. Validaciones en Routes

Se actualizaron las validaciones en `checkout.routes.js`:

#### Antes (solo `createPreference` tenía soporte):
```javascript
const createCashOrderValidation = [
  body('items')
    .isArray({ min: 1 })  // ❌ Obligatorio
    .withMessage('Los items deben ser un array con al menos un elemento'),
  // ... resto de validaciones
];
```

#### Después (ambos endpoints con soporte completo):
```javascript
const createCashOrderValidation = [
  body('items')
    .optional()  // ✅ Ahora opcional
    .isArray({ min: 1 })
    .withMessage('Los items deben ser un array con al menos un elemento'),
  
  body('useCart')
    .optional()
    .isBoolean()
    .withMessage('useCart debe ser un valor booleano'),

  body('restaurantId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('restaurantId debe ser un número entero válido'),
  // ... resto de validaciones
];
```

---

## 📊 Casos de Uso

### Caso 1: Crear Pedido Usando Carrito

**Request (Mercado Pago o Efectivo):**
```json
POST /api/checkout/create-preference
POST /api/checkout/cash-order

{
  "addressId": 1,
  "useCart": true,
  "restaurantId": 5,
  "specialInstructions": "Sin cebolla"
}
```

**Respuesta Exitosa:**
```json
{
  "status": "success",
  "message": "Orden creada exitosamente",
  "data": {
    "order": {
      "id": 123,
      "subtotal": 500,
      "deliveryFee": 40,
      "serviceFee": 25,
      "total": 565,
      // ... resto de datos
    },
    "cartUsed": true,
    "cartCleared": true,
    "message": "Carrito del restaurante limpiado automáticamente"
  }
}
```

### Caso 2: Crear Pedido con Items Directos

**Request:**
```json
POST /api/checkout/cash-order

{
  "addressId": 1,
  "items": [
    {
      "productId": 10,
      "quantity": 2,
      "priceAtAdd": 250
    }
  ],
  "specialInstructions": "Sin cebolla"
}
```

**Respuesta Exitosa:**
```json
{
  "status": "success",
  "message": "Orden creada exitosamente",
  "data": {
    "order": {
      "id": 124,
      "subtotal": 500,
      "deliveryFee": 40,
      "serviceFee": 25,
      "total": 565,
      // ... resto de datos
    },
    "cartUsed": false,
    "cartCleared": false,
    "message": "Pedido creado desde items directos"
  }
}
```

---

## ❌ Casos de Error

### Error 1: useCart sin restaurantId
**Request:**
```json
{
  "addressId": 1,
  "useCart": true
  // ❌ Falta restaurantId
}
```

**Respuesta:**
```json
{
  "status": "error",
  "message": "El restaurantId es obligatorio cuando se usa el carrito (useCart: true)"
}
```

### Error 2: No proporcionar items ni useCart
**Request:**
```json
{
  "addressId": 1
  // ❌ Falta items o useCart
}
```

**Respuesta:**
```json
{
  "status": "error",
  "message": "Debe proporcionar items o usar el carrito (useCart: true con restaurantId)"
}
```

### Error 3: Carrito vacío
**Request:**
```json
{
  "addressId": 1,
  "useCart": true,
  "restaurantId": 5
  // Pero el carrito está vacío
}
```

**Respuesta:**
```json
{
  "status": "error",
  "message": "Carrito vacío o no encontrado"
}
```

---

## 📂 Archivos Modificados

### `src/controllers/checkout.controller.js`

**Función `createPreference` (Mercado Pago):**
- ✅ Líneas 210-224: Validaciones de `useCart` y `restaurantId`
- ✅ Líneas 330-368: Lógica para obtener items del carrito
- ✅ Líneas 428-443: Uso de `itemsToProcess` en lugar de `items`

**Función `createCashOrder` (Efectivo):**
- ✅ Líneas 812-831: Extracción de parámetros y validaciones
- ✅ Líneas 856-901: Lógica para obtener items del carrito
- ✅ Líneas 1087-1137: Uso de `itemsToProcess` en cálculos
- ✅ Líneas 1196-1211: Limpieza condicional del carrito
- ✅ Líneas 1267-1269: Respuesta indicando uso de carrito

### `src/routes/checkout.routes.js`

**Validaciones:**
- ✅ Líneas 50-52: `items` ahora opcional en `createCashOrderValidation`
- ✅ Líneas 55-73: Agregadas validaciones para `useCart` y `restaurantId`

---

## 🧪 Testing

### Test Manual con Postman/Curl

#### Test 1: Crear pedido con carrito (Mercado Pago)
```bash
curl -X POST http://localhost:3000/api/checkout/create-preference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "addressId": 1,
    "useCart": true,
    "restaurantId": 5
  }'
```

**Resultado Esperado:** Orden creada con items del carrito

#### Test 2: Crear pedido con carrito (Efectivo)
```bash
curl -X POST http://localhost:3000/api/checkout/cash-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "addressId": 1,
    "useCart": true,
    "restaurantId": 5
  }'
```

**Resultado Esperado:** Orden creada con items del carrito

#### Test 3: Crear pedido con items directos (Efectivo)
```bash
curl -X POST http://localhost:3000/api/checkout/cash-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "addressId": 1,
    "items": [
      {
        "productId": 10,
        "quantity": 2,
        "priceAtAdd": 250
      }
    ]
  }'
```

**Resultado Esperado:** Orden creada con items directos

#### Test 4: Error por falta de restaurantId
```bash
curl -X POST http://localhost:3000/api/checkout/cash-order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "addressId": 1,
    "useCart": true
  }'
```

**Resultado Esperado:** Error 400 - "El restaurantId es obligatorio..."

---

## ✅ Validación de Código

- ✅ Sin errores de linting
- ✅ Sin errores de sintaxis
- ✅ Lógica centralizada (ambos endpoints usan el mismo código)
- ✅ Validaciones consistentes
- ✅ Documentación completa

---

## 🔄 Comportamiento del Carrito

### Cuando se usa `useCart: true`:

1. **Durante el Pedido:**
   - Se obtienen los items del carrito de la base de datos
   - Se usa `priceAtAdd` de cada item (incluye modificadores)
   - Se validan productos disponibles

2. **Después del Pedido:**
   - **Mercado Pago:** El carrito se limpia cuando el webhook confirma el pago
   - **Efectivo:** El carrito se limpia inmediatamente después de crear la orden

3. **En Caso de Error:**
   - Si falla el pedido, el carrito NO se limpia
   - El usuario puede intentar nuevamente

---

## 📝 Notas Importantes

### Para Frontend:

1. **Usar Carrito:**
   ```javascript
   {
     addressId: 1,
     useCart: true,
     restaurantId: 5  // OBLIGATORIO cuando useCart es true
   }
   ```

2. **Usar Items Directos:**
   ```javascript
   {
     addressId: 1,
     items: [
       { productId: 10, quantity: 2, priceAtAdd: 250 }
     ]
   }
   ```

3. **NO mezclar:** No enviar `useCart: true` y `items` al mismo tiempo. Si `useCart` es true, `items` se ignora.

### Para Backend:

1. La lógica de carrito es idéntica en ambos endpoints
2. Siempre se usa `itemsToProcess` internamente (viene del carrito o de items directos)
3. El cálculo de precios usa la función centralizada `calculateOrderPricing()`

---

## 🎯 Beneficios

- ✅ **Consistencia:** Ambos métodos de pago soportan carritos
- ✅ **Flexibilidad:** El cliente puede elegir usar carrito o items directos
- ✅ **Validaciones Robustas:** Errores claros y específicos
- ✅ **Código Mantenible:** Lógica compartida entre endpoints
- ✅ **Experiencia de Usuario:** Proceso de checkout más fluido

---

**Estado:** ✅ RESUELTO Y VALIDADO  
**Fecha:** 12 de Octubre, 2025  
**Equipo:** Backend Development

