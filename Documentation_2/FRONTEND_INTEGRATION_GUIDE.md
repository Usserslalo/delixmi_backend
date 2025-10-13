# Guía de Integración Frontend - Actualizaciones Backend

**Fecha:** 12 de Octubre, 2025  
**Versión Backend:** 1.1.0  
**Prioridad:** 🔴 ALTA - Cambios Breaking

---

## 📋 Resumen de Cambios

Se realizaron 3 actualizaciones importantes en el backend que **requieren cambios en el frontend**:

1. **✅ Soporte de Carrito en Checkout** - Nuevos parámetros
2. **✅ Formato de Modificadores** - Nueva estructura de datos
3. **✅ Redondeo de Precios** - Valores consistentes a 2 decimales

---

## 🚨 CAMBIO 1: Checkout con Carrito (BREAKING CHANGE)

### ¿Qué cambió?

Los endpoints de checkout ahora soportan crear pedidos **usando el carrito guardado** o **con items directos**.

### Endpoints Afectados:
- `POST /api/checkout/create-preference` (Mercado Pago)
- `POST /api/checkout/cash-order` (Efectivo)

---

### Opción A: Crear Pedido Usando el Carrito

**ANTES (Ya no funciona):**
```javascript
// ❌ ANTIGUO - No funcionará correctamente
const response = await fetch('/api/checkout/cash-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    addressId: 1,
    items: [] // Esto daba error si el usuario esperaba usar el carrito
  })
});
```

**AHORA (Nuevo formato):**
```javascript
// ✅ NUEVO - Usar carrito
const response = await fetch('/api/checkout/cash-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    addressId: 1,
    useCart: true,              // ✅ NUEVO
    restaurantId: 5,            // ✅ OBLIGATORIO cuando useCart=true
    specialInstructions: "Sin cebolla"
  })
});
```

**Validación Importante:**
```javascript
// ⚠️ REGLA: Si useCart es true, restaurantId es OBLIGATORIO
if (useCart && !restaurantId) {
  // Backend retornará error 400:
  // "El restaurantId es obligatorio cuando se usa el carrito (useCart: true)"
}
```

---

### Opción B: Crear Pedido con Items Directos (Sin Cambios)

```javascript
// ✅ Sigue funcionando igual
const response = await fetch('/api/checkout/cash-order', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    addressId: 1,
    items: [
      {
        productId: 10,
        quantity: 2,
        priceAtAdd: 250
      }
    ],
    specialInstructions: "Sin cebolla"
  })
});
```

---

### Respuesta del Backend (Actualizada)

```javascript
{
  "status": "success",
  "message": "Orden creada exitosamente",
  "data": {
    "order": {
      "id": 123,
      "subtotal": 500.00,      // ✅ Siempre 2 decimales
      "deliveryFee": 40.00,    // ✅ Siempre 2 decimales
      "serviceFee": 25.00,     // ✅ Siempre 2 decimales
      "total": 565.00,         // ✅ Siempre 2 decimales
      "paymentMethod": "cash",
      "status": "pending",
      // ... resto de datos
    },
    "cartUsed": true,          // ✅ NUEVO - indica si se usó carrito
    "cartCleared": true,       // ✅ NUEVO - indica si se limpió el carrito
    "message": "Carrito del restaurante limpiado automáticamente"
  }
}
```

---

### Ejemplo de Servicio Frontend (TypeScript/React)

```typescript
// types.ts
interface CheckoutRequest {
  addressId: number;
  useCart?: boolean;
  restaurantId?: number;
  items?: Array<{
    productId: number;
    quantity: number;
    priceAtAdd?: number;
  }>;
  specialInstructions?: string;
}

interface CheckoutResponse {
  status: string;
  message: string;
  data: {
    order: {
      id: number;
      subtotal: number;
      deliveryFee: number;
      serviceFee: number;
      total: number;
      paymentMethod: string;
      status: string;
    };
    cartUsed: boolean;
    cartCleared: boolean;
    message: string;
  };
}

// checkout.service.ts
export class CheckoutService {
  
  // Opción 1: Crear pedido desde el carrito
  static async createOrderFromCart(
    addressId: number,
    restaurantId: number,
    paymentMethod: 'cash' | 'card',
    specialInstructions?: string
  ): Promise<CheckoutResponse> {
    const endpoint = paymentMethod === 'cash' 
      ? '/api/checkout/cash-order'
      : '/api/checkout/create-preference';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addressId,
        useCart: true,              // ✅ Usar carrito
        restaurantId,               // ✅ OBLIGATORIO
        specialInstructions
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al crear orden desde carrito');
    }
    
    return response.json();
  }
  
  // Opción 2: Crear pedido con items directos
  static async createOrderDirect(
    addressId: number,
    items: CheckoutRequest['items'],
    paymentMethod: 'cash' | 'card',
    specialInstructions?: string
  ): Promise<CheckoutResponse> {
    const endpoint = paymentMethod === 'cash' 
      ? '/api/checkout/cash-order'
      : '/api/checkout/create-preference';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        addressId,
        items,                      // ✅ Items directos
        specialInstructions
      })
    });
    
    if (!response.ok) {
      throw new Error('Error al crear orden directa');
    }
    
    return response.json();
  }
  
  private static getToken(): string {
    // Tu lógica para obtener el token
    return localStorage.getItem('auth_token') || '';
  }
}
```

---

## 🚨 CAMBIO 2: Formato de Modificadores en Carrito (BREAKING CHANGE)

### ¿Qué cambió?

El endpoint `POST /api/cart/add` ahora acepta un formato **más descriptivo y seguro** para los modificadores.

---

### Formato Antiguo (Ya NO funciona)

```javascript
// ❌ ANTIGUO - Array simple de IDs
const response = await fetch('/api/cart/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 2,
    quantity: 1,
    modifierOptionIds: [2, 7]  // ❌ Ya NO funciona
  })
});
```

---

### Formato NUEVO (Requerido)

```javascript
// ✅ NUEVO - Array de objetos con grupo y opción
const response = await fetch('/api/cart/add', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 2,
    quantity: 1,
    modifiers: [                           // ✅ NUEVO nombre
      {
        modifierGroupId: 1,                // ✅ ID del grupo
        selectedOptionId: 2                // ✅ ID de la opción seleccionada
      },
      {
        modifierGroupId: 3,
        selectedOptionId: 7
      }
    ]
  })
});
```

---

### ¿Por qué cambió?

**El formato nuevo valida que:**
- ✅ La opción seleccionada pertenezca al grupo correcto
- ✅ No se envíen opciones de grupos incorrectos
- ✅ Se cumplan los requisitos mínimos/máximos de cada grupo

**Ejemplo de error si envías grupo incorrecto:**
```json
{
  "status": "error",
  "message": "La opción 7 no pertenece al grupo 1",
  "code": "MODIFIER_GROUP_MISMATCH",
  "details": {
    "expectedGroupId": 1,
    "actualGroupId": 3,
    "optionName": "Extra queso",
    "groupName": "Extras"
  }
}
```

---

### Ejemplo de Servicio Frontend (TypeScript/React)

```typescript
// types.ts
interface ModifierSelection {
  modifierGroupId: number;
  selectedOptionId: number;
}

interface AddToCartRequest {
  productId: number;
  quantity: number;
  modifiers?: ModifierSelection[];
}

interface AddToCartResponse {
  status: string;
  message: string;
  data: {
    cartItem: {
      id: number;
      product: {
        id: number;
        name: string;
        price: number;
      };
      quantity: number;
      priceAtAdd: number;
      subtotal: number;
      modifiers: Array<{
        id: number;
        name: string;
        price: number;
        group: {
          id: number;
          name: string;
        };
      }>;
    };
    action: 'item_added' | 'quantity_updated';
  };
}

// cart.service.ts
export class CartService {
  
  static async addToCart(
    productId: number,
    quantity: number,
    modifiers?: ModifierSelection[]
  ): Promise<AddToCartResponse> {
    const response = await fetch('/api/cart/add', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        productId,
        quantity,
        modifiers: modifiers || []  // ✅ Formato nuevo
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al agregar al carrito');
    }
    
    return response.json();
  }
  
  private static getToken(): string {
    return localStorage.getItem('auth_token') || '';
  }
}
```

---

### Ejemplo de Uso en Componente React

```typescript
// ProductModifiers.tsx
interface Props {
  product: Product;
  onAddToCart: (modifiers: ModifierSelection[]) => void;
}

const ProductModifiers: React.FC<Props> = ({ product, onAddToCart }) => {
  const [selectedModifiers, setSelectedModifiers] = useState<ModifierSelection[]>([]);
  
  const handleModifierSelect = (groupId: number, optionId: number) => {
    // Actualizar selección de modificadores
    setSelectedModifiers(prev => {
      // Remover selección anterior del mismo grupo (si es single-select)
      const filtered = prev.filter(m => m.modifierGroupId !== groupId);
      
      // Agregar nueva selección
      return [...filtered, {
        modifierGroupId: groupId,
        selectedOptionId: optionId
      }];
    });
  };
  
  const handleAddToCart = async () => {
    try {
      // ✅ Enviar modificadores en el formato nuevo
      await CartService.addToCart(
        product.id,
        1,
        selectedModifiers  // Array de { modifierGroupId, selectedOptionId }
      );
      
      toast.success('Producto agregado al carrito');
    } catch (error) {
      toast.error(error.message);
    }
  };
  
  return (
    <div>
      {product.modifierGroups.map(group => (
        <div key={group.id}>
          <h3>{group.name}</h3>
          {group.options.map(option => (
            <button
              key={option.id}
              onClick={() => handleModifierSelect(group.id, option.id)}
            >
              {option.name} - ${option.price}
            </button>
          ))}
        </div>
      ))}
      
      <button onClick={handleAddToCart}>
        Agregar al Carrito
      </button>
    </div>
  );
};
```

---

## ✅ CAMBIO 3: Redondeo de Precios (Transparente)

### ¿Qué cambió?

Todos los valores monetarios ahora vienen **correctamente redondeados a 2 decimales**.

### ¿Necesito cambiar algo en Frontend?

**NO.** Este cambio es transparente para el frontend, pero mejora la consistencia.

---

### Antes del Fix

```javascript
{
  "subtotal": 333.33,
  "deliveryFee": 22.22,
  "serviceFee": 16.6665,           // ❌ 4 decimales
  "total": 372.21649999999994      // ❌ 14 decimales
}
```

### Después del Fix

```javascript
{
  "subtotal": 333.33,              // ✅ 2 decimales
  "deliveryFee": 22.22,            // ✅ 2 decimales
  "serviceFee": 16.67,             // ✅ 2 decimales
  "total": 372.22                  // ✅ 2 decimales
}
```

---

### Recomendación para Frontend

**ANTES (si hacías redondeo manual):**
```javascript
// ❌ Ya NO es necesario
const roundedTotal = Math.round(order.total * 100) / 100;
```

**AHORA (usa directamente los valores):**
```javascript
// ✅ Los valores ya vienen redondeados del backend
const formattedTotal = `$${order.total.toFixed(2)} MXN`;
```

---

## 📝 Checklist de Migración

### Para Checkout:

- [ ] Actualizar servicio de checkout para soportar `useCart` y `restaurantId`
- [ ] Implementar validación: `useCart === true` requiere `restaurantId`
- [ ] Actualizar UI para mostrar `cartUsed` y `cartCleared` en respuesta
- [ ] Probar flujo: Carrito → Checkout → Orden creada → Carrito limpio
- [ ] Probar flujo: Items directos → Checkout → Orden creada

### Para Carrito:

- [ ] Actualizar servicio de carrito para usar formato `modifiers` (no `modifierOptionIds`)
- [ ] Cambiar estructura de datos de modificadores en estado
- [ ] Actualizar componente de selección de modificadores
- [ ] Manejar errores específicos: `INVALID_MODIFIER_GROUP`, `MODIFIER_GROUP_MISMATCH`
- [ ] Probar: Agregar producto con modificadores requeridos
- [ ] Probar: Agregar producto sin modificadores

### Para Precios:

- [ ] Remover cualquier redondeo manual en frontend (ya no es necesario)
- [ ] Usar `.toFixed(2)` solo para formateo de UI
- [ ] Verificar que totales se muestren correctamente

---

## 🧪 Testing Recomendado

### Test 1: Checkout con Carrito
```javascript
// 1. Agregar productos al carrito
await CartService.addToCart(productId, 1, modifiers);

// 2. Crear orden desde carrito
const order = await CheckoutService.createOrderFromCart(
  addressId,
  restaurantId,
  'cash'
);

// 3. Verificar que el carrito se limpió
const cart = await CartService.getCart();
expect(cart.items.length).toBe(0);
```

### Test 2: Modificadores
```javascript
// 1. Crear selección de modificadores
const modifiers = [
  { modifierGroupId: 1, selectedOptionId: 2 }
];

// 2. Agregar al carrito
const response = await CartService.addToCart(productId, 1, modifiers);

// 3. Verificar que se guardaron correctamente
expect(response.data.cartItem.modifiers).toHaveLength(1);
expect(response.data.cartItem.modifiers[0].group.id).toBe(1);
```

### Test 3: Redondeo de Precios
```javascript
// Verificar que todos los valores tengan máximo 2 decimales
const order = await CheckoutService.createOrder(/* ... */);

const hasMaxTwoDecimals = (num) => {
  const decimals = (num.toString().split('.')[1] || '').length;
  return decimals <= 2;
};

expect(hasMaxTwoDecimals(order.subtotal)).toBe(true);
expect(hasMaxTwoDecimals(order.deliveryFee)).toBe(true);
expect(hasMaxTwoDecimals(order.serviceFee)).toBe(true);
expect(hasMaxTwoDecimals(order.total)).toBe(true);
```

---

## 🚨 Errores Comunes y Soluciones

### Error 1: "El restaurantId es obligatorio cuando se usa el carrito"

**Causa:** Enviaste `useCart: true` sin `restaurantId`

**Solución:**
```javascript
// ✅ CORRECTO
{
  addressId: 1,
  useCart: true,
  restaurantId: 5  // ✅ Obligatorio
}
```

---

### Error 2: "La opción X no pertenece al grupo Y"

**Causa:** Enviaste un `selectedOptionId` que no pertenece al `modifierGroupId` indicado

**Solución:** Verifica que los IDs correspondan al grupo correcto
```javascript
// ❌ INCORRECTO
{
  modifierGroupId: 1,     // Grupo "Tipo de Carne"
  selectedOptionId: 7     // ❌ Esta opción es del grupo "Extras" (grupo 3)
}

// ✅ CORRECTO
{
  modifierGroupId: 1,     // Grupo "Tipo de Carne"
  selectedOptionId: 2     // ✅ Esta opción pertenece al grupo 1
}
```

---

### Error 3: "Debe proporcionar items o usar el carrito"

**Causa:** No enviaste ni `items` ni `useCart: true`

**Solución:** Elige una opción
```javascript
// Opción A: Usar carrito
{
  addressId: 1,
  useCart: true,
  restaurantId: 5
}

// Opción B: Usar items directos
{
  addressId: 1,
  items: [{ productId: 10, quantity: 2 }]
}
```

---

## 📞 Soporte

Si tienes dudas o problemas durante la integración:

1. **Revisa la documentación completa:**
   - `USECART_FIX.md` - Detalles del soporte de carrito
   - `CART_MODIFIERS_FIX.md` - Detalles del formato de modificadores
   - `ROUNDING_FIX.md` - Detalles del redondeo de precios

2. **Prueba con Postman/Thunder Client:**
   - Usa los ejemplos de esta guía
   - Verifica las respuestas del backend

3. **Contacta al equipo de backend:**
   - Todos los endpoints están completamente validados
   - Los tests pasan al 100%

---

## 📊 Resumen de Cambios

| Endpoint | Cambio | Tipo | Acción Requerida |
|----------|--------|------|------------------|
| `POST /api/checkout/create-preference` | Soporte `useCart` + `restaurantId` | Breaking | ✅ Actualizar servicio |
| `POST /api/checkout/cash-order` | Soporte `useCart` + `restaurantId` | Breaking | ✅ Actualizar servicio |
| `POST /api/cart/add` | Nuevo formato `modifiers` | Breaking | ✅ Actualizar servicio |
| Todos los precios | Redondeo a 2 decimales | Mejora | ⚠️ Opcional (remover redondeo manual) |

---

## ✅ Beneficios para Frontend

1. **Checkout más flexible:** Usar carrito o items directos
2. **Validación robusta:** Errores claros cuando algo está mal
3. **Precios consistentes:** Siempre 2 decimales, sin discrepancias
4. **Mejor UX:** Carrito se limpia automáticamente después del checkout
5. **Código más limpio:** Formato de modificadores más descriptivo

---

**Fecha de implementación:** 12 de Octubre, 2025  
**Estado:** ✅ Backend 100% funcional y validado  
**Acción requerida:** Frontend debe actualizar servicios antes de usar nuevas funcionalidades

---

## 🎯 Prioridad de Implementación

### 🔴 ALTA - Implementar Ya:
1. Soporte de `useCart` en checkout
2. Nuevo formato de `modifiers` en carrito

### 🟡 MEDIA - Implementar Pronto:
3. Remover redondeo manual de precios (opcional pero recomendado)

---

¡Buena suerte con la integración! 🚀

