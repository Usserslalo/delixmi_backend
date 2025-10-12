# Fix Crítico: Unificación de Lógica de Cálculo de Precios

**Fecha:** 12 de Octubre, 2025  
**Severidad:** CRÍTICA  
**Estado:** RESUELTO ✅

---

## 📋 Descripción del Problema

Se detectó una **discrepancia crítica en el cálculo de precios** entre los dos métodos de pago disponibles en la aplicación:

- **Pago con Tarjeta (Mercado Pago):** `/api/checkout/create-preference`
- **Pago en Efectivo:** `/api/checkout/cash-order`

### Problema Identificado

Ambos endpoints calculaban el **subtotal**, **tarifa de envío (deliveryFee)** y **cuota de servicio (serviceFee)** de manera **diferente**, lo que resultaba en **totales distintos para el mismo pedido** dependiendo del método de pago seleccionado.

### Causa Raíz

#### Endpoint de Mercado Pago (CORRECTO):
```javascript
// Líneas 344-349 (versión anterior)
const distanceResult = await calculateDistance(originCoords, destinationCoords);
const feeCalculation = calculateDeliveryFee(distanceResult.distance);
deliveryFee = feeCalculation.tarifaFinal;
```

#### Endpoint de Efectivo (INCORRECTO):
```javascript
// Línea 1000 (versión anterior)
const deliveryDetails = await calculateDistance(origin, destination);
const deliveryFee = deliveryDetails.deliveryFee || 20; // ❌ ERROR
```

**El problema:** La función `calculateDistance()` en `src/config/maps.js` **NO retorna** un campo `deliveryFee`. Solo retorna:
```javascript
{
  distance: number,        // Distancia en km
  duration: number,        // Duración en minutos
  distanceText: string,    // Ej: "5.2 km"
  durationText: string,    // Ej: "15 min"
  isDefault?: boolean      // Si son valores por defecto
}
```

Por lo tanto, el endpoint de efectivo **siempre usaba el valor por defecto de $20 MXN**, mientras que el de Mercado Pago calculaba correctamente la tarifa según la distancia.

---

## 🔧 Solución Implementada

### 1. Función Centralizada de Cálculo de Precios

Se creó una nueva función `calculateOrderPricing()` que centraliza **toda la lógica de cálculo de precios**:

```javascript
/**
 * Calcula los precios de una orden de manera centralizada
 * @param {Array} items - Items del pedido
 * @param {Array} products - Productos de la BD
 * @param {Object} branch - Sucursal del restaurante
 * @param {Object} address - Dirección de entrega
 * @returns {Promise<Object>} Precios calculados
 */
const calculateOrderPricing = async (items, products, branch, address) => {
  // 1. Calcular subtotal
  let subtotal = 0;
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
    subtotal += itemPrice * item.quantity;
  }

  // 2. Calcular tarifa de envío dinámicamente
  let deliveryFee = 25.00; // Por defecto
  let travelTimeMinutes = 0;
  let deliveryDetails = null;

  try {
    const distanceResult = await calculateDistance(
      { latitude: Number(branch.latitude), longitude: Number(branch.longitude) },
      { latitude: Number(address.latitude), longitude: Number(address.longitude) }
    );
    
    // ✅ CORRECCIÓN: Usar calculateDeliveryFee correctamente
    const feeCalculation = calculateDeliveryFee(distanceResult.distance);
    deliveryFee = feeCalculation.tarifaFinal;
    travelTimeMinutes = distanceResult.duration;
    
    deliveryDetails = {
      distance: distanceResult.distance,
      duration: distanceResult.duration,
      distanceText: distanceResult.distanceText,
      durationText: distanceResult.durationText,
      calculation: feeCalculation,
      isDefault: distanceResult.isDefault || false
    };
  } catch (error) {
    console.error('Error calculando tarifa:', error);
    deliveryDetails = { isDefault: true, error: error.message };
  }

  // 3. Calcular cuota de servicio (5% del subtotal)
  const serviceFee = subtotal * 0.05;
  
  // 4. Calcular total
  const total = subtotal + deliveryFee + serviceFee;

  return { subtotal, deliveryFee, serviceFee, total, deliveryDetails, travelTimeMinutes };
};
```

### 2. Refactorización de Endpoints

Ambos endpoints ahora usan **exactamente la misma función** para calcular precios:

#### Endpoint de Mercado Pago (`createPreference`):
```javascript
// Líneas 415-416
const pricing = await calculateOrderPricing(itemsToProcess, products, branch, address);
const { subtotal, deliveryFee, serviceFee, total, deliveryDetails, travelTimeMinutes } = pricing;
```

#### Endpoint de Efectivo (`createCashOrder`):
```javascript
// Líneas 1026-1036
const pricing = await calculateOrderPricing(items, products, branch, address);
const { subtotal, deliveryFee, serviceFee, total, deliveryDetails, travelTimeMinutes } = pricing;
```

---

## ✅ Validación de la Solución

### Fórmula de Cálculo (Ahora Unificada)

```
Subtotal = Σ (precio_producto × cantidad)
DeliveryFee = max(tarifaBase + (distancia × costoPorKm), tarifaMinima)
              donde: tarifaBase = $15, costoPorKm = $5, tarifaMinima = $20
ServiceFee = Subtotal × 0.05 (5%)
Total = Subtotal + DeliveryFee + ServiceFee
```

### Ejemplo de Cálculo

**Pedido de prueba:**
- 2 productos: $100 cada uno
- Distancia: 3 km

**Cálculo:**
```
Subtotal = $200
DeliveryFee = max($15 + (3 × $5), $20) = max($30, $20) = $30
ServiceFee = $200 × 0.05 = $10
Total = $200 + $30 + $10 = $240
```

**Resultado esperado:**
- ✅ Pago con tarjeta: **$240 MXN**
- ✅ Pago en efectivo: **$240 MXN**

---

## 📊 Impacto del Bug

### Antes del Fix

| Método de Pago | Subtotal | Delivery | Service Fee | Total |
|----------------|----------|----------|-------------|-------|
| Tarjeta (MP)   | $200     | $30*     | $10         | $240  |
| Efectivo       | $200     | $20*     | $10         | $230  |

*_Diferencia de $10 debido al cálculo incorrecto_

### Después del Fix

| Método de Pago | Subtotal | Delivery | Service Fee | Total |
|----------------|----------|----------|-------------|-------|
| Tarjeta (MP)   | $200     | $30      | $10         | $240  |
| Efectivo       | $200     | $30      | $10         | **$240** ✅ |

---

## 🔍 Archivos Modificados

### `src/controllers/checkout.controller.js`

**Cambios principales:**
1. ✅ Nueva función `calculateOrderPricing()` (líneas 11-109)
2. ✅ Refactorización de `createPreference()` para usar la función centralizada (líneas 415-443)
3. ✅ Refactorización de `createCashOrder()` para usar la función centralizada (líneas 1023-1076)
4. ✅ Corrección de estructura de respuesta para ambos endpoints

**Líneas de código afectadas:**
- Nuevas líneas: 11-109 (función centralizada)
- Modificadas en `createPreference`: 354-443
- Modificadas en `createCashOrder`: 1020-1076

---

## 🧪 Testing Recomendado

### Test Case 1: Mismo Pedido, Diferentes Métodos de Pago

**Setup:**
```json
{
  "addressId": 1,
  "items": [
    { "productId": 5, "quantity": 2, "priceAtAdd": 100 }
  ]
}
```

**Validación:**
1. Crear preferencia de Mercado Pago → Verificar `total`
2. Crear orden en efectivo → Verificar `total`
3. Ambos totales deben ser **idénticos**

### Test Case 2: Diferentes Distancias

**Setup:**
- Dirección A: 2 km de distancia → Esperado: `deliveryFee = $20` (mínimo)
- Dirección B: 5 km de distancia → Esperado: `deliveryFee = $40` ($15 + 5×$5)

**Validación:**
- Ambos métodos de pago deben calcular la misma tarifa para cada dirección

### Test Case 3: Error en Google Maps API

**Setup:**
- Simular error en `calculateDistance()`

**Validación:**
- Debe usar valor por defecto: `deliveryFee = $25`
- Debe funcionar en ambos endpoints

---

## 📝 Logs para Debugging

Los siguientes logs fueron agregados/mantenidos:

```javascript
// En calculateOrderPricing()
console.log('✅ Cálculo de tarifa de envío:', { ... });
console.log('💰 Cálculo de precios centralizado:', { ... });

// En createPreference()
console.log('🛒 Items finales para Mercado Pago:', { ... });

// En createCashOrder()
console.log('✅ Producto: ${product.name} x${item.quantity} = $${itemTotal}');
```

---

## 🚀 Próximos Pasos

### Inmediatos
- [x] Unificar lógica de cálculo de precios
- [x] Refactorizar ambos endpoints
- [x] Documentar cambios

### Recomendaciones Futuras
1. **Tests Unitarios:** Crear tests para `calculateOrderPricing()`
2. **Tests de Integración:** Validar consistencia entre endpoints
3. **Monitoreo:** Agregar alertas si los totales difieren entre métodos
4. **Validación Frontend:** El frontend debe validar que el total coincida antes de confirmar

---

## 📞 Contacto

Para preguntas o aclaraciones sobre este fix:
- **Equipo:** Backend Development
- **Prioridad:** CRÍTICA
- **Fecha de Deploy:** 12 de Octubre, 2025

---

## 🔐 Seguridad

Este fix **NO introduce vulnerabilidades de seguridad**. Por el contrario:
- ✅ Elimina discrepancias que podrían ser explotadas
- ✅ Centraliza validaciones de precios
- ✅ Mejora la trazabilidad de cálculos

---

**Nota:** Este bug afectaba directamente la confianza del usuario y la integridad financiera de la plataforma. La solución implementada garantiza que **el precio sea siempre el mismo**, independientemente del método de pago seleccionado.

