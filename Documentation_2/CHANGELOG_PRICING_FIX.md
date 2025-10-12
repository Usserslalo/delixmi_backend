# CHANGELOG - Fix Crítico de Cálculo de Precios

## [1.0.1] - 2025-10-12

### 🔴 CRÍTICO - Fix de Discrepancia de Precios

#### Problema Resuelto
- **Bug Crítico:** Los endpoints de pago en efectivo y Mercado Pago calculaban precios diferentes para el mismo pedido
- **Causa:** El endpoint de efectivo usaba un valor por defecto de $20 para `deliveryFee` en lugar de calcularlo dinámicamente
- **Impacto:** Discrepancias de hasta $45 MXN en pedidos de larga distancia

#### Cambios Implementados

##### Añadido
- ✅ Nueva función centralizada `calculateOrderPricing()` en `checkout.controller.js`
  - Calcula subtotal, deliveryFee, serviceFee y total de manera unificada
  - Usa Google Maps Distance Matrix API para cálculo preciso de distancias
  - Manejo robusto de errores con valores por defecto
  
- ✅ Script de validación automatizada `scripts/test-pricing-consistency.js`
  - 12 tests que validan toda la lógica de precios
  - Tests de tarifa de envío, cuota de servicio y totales
  - Tasa de éxito: 100%

- ✅ Documentación completa:
  - `DOCUMENTATION_2/CRITICAL_PRICING_BUG_FIX.md` - Análisis técnico detallado
  - `DOCUMENTATION_2/PRICING_FIX_SUMMARY.md` - Resumen ejecutivo
  - `DOCUMENTATION_2/CHANGELOG_PRICING_FIX.md` - Este archivo

##### Modificado
- ✅ `createPreference()` en `checkout.controller.js`
  - Refactorizado para usar `calculateOrderPricing()`
  - Eliminada lógica duplicada de cálculo
  - Mejorados logs de debugging
  
- ✅ `createCashOrder()` en `checkout.controller.js`
  - Refactorizado para usar `calculateOrderPricing()`
  - Corregido bug de `deliveryDetails.deliveryFee` (que no existía)
  - Ahora calcula correctamente usando `calculateDeliveryFee(distance)`

##### Corregido
- ✅ **BUG CRÍTICO:** Pago en efectivo ahora calcula deliveryFee correctamente según distancia
- ✅ **BUG:** Eliminada declaración duplicada de `firstProduct` en `createPreference()`
- ✅ **BUG:** Corregido acceso a `deliveryDetails.travelTimeMinutes` → `deliveryDetails.duration`

#### Fórmulas de Cálculo (Unificadas)

```javascript
// Subtotal
subtotal = Σ (priceAtAdd || product.price) × quantity

// Tarifa de envío
deliveryFee = max(tarifaBase + (distancia × costoPorKm), tarifaMinima)
            = max($15 + (distancia × $5), $20)

// Cuota de servicio
serviceFee = subtotal × 0.05 // 5%

// Total
total = subtotal + deliveryFee + serviceFee
```

#### Testing

**Tests Ejecutados:**
- ✅ 5 tests de tarifa de envío (1, 2, 3, 5, 10 km)
- ✅ 4 tests de cuota de servicio ($100, $200, $500, $1000)
- ✅ 3 tests de cálculo total completo
- **Total:** 12/12 tests pasados (100%)

**Comando de validación:**
```bash
node scripts/test-pricing-consistency.js
```

#### Archivos Modificados

**Controladores:**
- `src/controllers/checkout.controller.js` (~100 líneas modificadas)

**Scripts:**
- `scripts/test-pricing-consistency.js` (NUEVO)

**Documentación:**
- `DOCUMENTATION_2/CRITICAL_PRICING_BUG_FIX.md` (NUEVO)
- `DOCUMENTATION_2/PRICING_FIX_SUMMARY.md` (NUEVO)
- `DOCUMENTATION_2/CHANGELOG_PRICING_FIX.md` (NUEVO)

#### Validación de Código

- ✅ Sin errores de linting
- ✅ Sin errores de sintaxis
- ✅ Todos los tests pasados
- ✅ Documentación completa

#### Impacto en API

**Endpoints Afectados:**
- `POST /api/checkout/create-preference` - Comportamiento preservado, código refactorizado
- `POST /api/checkout/cash-order` - **FIX CRÍTICO aplicado**

**Cambios en Respuesta:**
- ✅ Mismo formato de respuesta
- ✅ `deliveryDetails` ahora incluye más información
- ✅ Precios ahora son consistentes entre ambos endpoints

**Breaking Changes:**
- ❌ Ninguno - Totalmente retrocompatible

#### Ejemplo de Uso

**Antes del fix:**
```json
// POST /api/checkout/cash-order
{
  "subtotal": 500,
  "deliveryFee": 20,  // ❌ INCORRECTO (valor por defecto)
  "serviceFee": 25,
  "total": 545
}
```

**Después del fix:**
```json
// POST /api/checkout/cash-order
{
  "subtotal": 500,
  "deliveryFee": 40,  // ✅ CORRECTO (calculado por distancia)
  "serviceFee": 25,
  "total": 565
}
```

#### Notas de Seguridad

- ✅ No introduce vulnerabilidades
- ✅ Elimina posibles discrepancias explotables
- ✅ Mejora trazabilidad de cálculos
- ✅ Centraliza validaciones

#### Recomendaciones Post-Deploy

1. **Monitoreo:**
   - Verificar logs de `calculateOrderPricing()`
   - Comparar totales entre ambos métodos de pago
   - Alertar si hay discrepancias

2. **Testing Manual:**
   - Probar ambos endpoints con los mismos datos
   - Validar que los totales coincidan
   - Verificar con diferentes distancias

3. **Comunicación:**
   - Informar al equipo frontend sobre la consistencia de precios
   - Actualizar documentación de API si es necesario

#### Próximos Pasos

- [ ] Deploy a desarrollo
- [ ] Testing manual extensivo
- [ ] Deploy a staging
- [ ] Validación con usuarios beta
- [ ] Deploy a producción
- [ ] Monitoreo post-deploy

---

**Severidad:** CRÍTICA  
**Prioridad:** ALTA  
**Estado:** RESUELTO Y VALIDADO  
**Fecha:** 12 de Octubre, 2025  
**Equipo:** Backend Development

