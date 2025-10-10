# 🔧 FIX: Error de Foreign Key Constraint al Eliminar Productos

**Fecha:** 9 de Enero, 2025  
**Código de Error:** `P2003` - Foreign key constraint violated  
**Endpoint Afectado:** `DELETE /api/restaurant/products/:productId`  
**Estado:** ✅ SOLUCIONADO

---

## 🐛 PROBLEMA IDENTIFICADO

### **Error Original:**
```
PrismaClientKnownRequestError: 
Invalid `prisma.product.delete()` invocation
Foreign key constraint violated on the fields: (`productId`)
code: 'P2003'
```

### **Causa Raíz:**

El endpoint intentaba eliminar un producto directamente sin considerar dos tablas relacionadas:

1. **`ProductModifier`** (asociaciones con grupos de modificadores)
   - Sin `onDelete: Cascade` en el schema
   - Bloqueaba la eliminación si el producto tenía modificadores asociados

2. **`OrderItem`** (pedidos que contienen el producto)
   - Sin `onDelete: Cascade` en el schema (por diseño)
   - Bloqueaba la eliminación si el producto estaba en pedidos históricos

---

## ✅ SOLUCIÓN IMPLEMENTADA

### **Cambios en el Controlador:**

**Archivo:** `src/controllers/restaurant-admin.controller.js`  
**Función:** `deleteProduct`  
**Líneas:** 2376-2403

#### **1. Validación Proactiva de Pedidos (Nuevo)**
```javascript
// 4. Verificar si el producto tiene pedidos asociados
const orderItemsCount = await prisma.orderItem.count({
  where: { productId: productIdNum }
});

if (orderItemsCount > 0) {
  return res.status(409).json({
    status: 'error',
    message: 'No se puede eliminar el producto porque está asociado a pedidos existentes',
    code: 'PRODUCT_IN_USE',
    details: {
      ordersCount: orderItemsCount,
      productId: productIdNum,
      productName: existingProduct.name
    },
    suggestion: 'Considera marcar el producto como no disponible en lugar de eliminarlo. Usa: PATCH /api/restaurant/products/' + productIdNum + ' con { "isAvailable": false }'
  });
}
```

#### **2. Eliminación Manual de Asociaciones (Nuevo)**
```javascript
// 5. Eliminar asociaciones con modificadores primero (ProductModifier)
await prisma.productModifier.deleteMany({
  where: { productId: productIdNum }
});
```

#### **3. Eliminación del Producto**
```javascript
// 6. Eliminar el producto
await prisma.product.delete({
  where: { id: productIdNum }
});
```

---

## 📋 COMPORTAMIENTO ACTUALIZADO

### **Flujo de Eliminación:**

```
┌─────────────────────────────────────────┐
│  DELETE /api/restaurant/products/:id    │
└─────────────────────────────────────────┘
                ↓
        ┌───────────────┐
        │ Verificar     │
        │ autenticación │
        └───────────────┘
                ↓
        ┌───────────────┐
        │ Verificar     │
        │ permisos      │
        └───────────────┘
                ↓
        ┌─────────────────────────────┐
        │ ¿Tiene pedidos asociados?   │
        └─────────────────────────────┘
           SÍ ↓         ↓ NO
    ┌──────────┐       │
    │ 409      │       │
    │ PRODUCT_ │       │
    │ IN_USE   │       │
    └──────────┘       │
                       ↓
        ┌─────────────────────────────┐
        │ Eliminar ProductModifier    │
        │ (asociaciones)              │
        └─────────────────────────────┘
                       ↓
        ┌─────────────────────────────┐
        │ Eliminar Product            │
        └─────────────────────────────┘
                       ↓
        ┌─────────────────────────────┐
        │ 200 OK - Producto eliminado │
        └─────────────────────────────┘
```

---

## 🎯 CASOS DE USO

### **CASO 1: Producto SIN pedidos (Se puede eliminar)**

**Request:**
```http
DELETE /api/restaurant/products/15
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Producto eliminado exitosamente",
  "data": {
    "deletedProduct": {
      "id": 15,
      "name": "Pizza Vegetariana",
      "restaurantId": 1,
      "restaurantName": "Pizzería de Ana",
      "subcategoryName": "Pizzas Tradicionales",
      "deletedAt": "2025-01-09T18:30:00.000Z"
    }
  }
}
```

---

### **CASO 2: Producto CON pedidos (No se puede eliminar)**

**Request:**
```http
DELETE /api/restaurant/products/1
Authorization: Bearer {token}
```

**Response (409 Conflict):**
```json
{
  "status": "error",
  "message": "No se puede eliminar el producto porque está asociado a pedidos existentes",
  "code": "PRODUCT_IN_USE",
  "details": {
    "ordersCount": 12,
    "productId": 1,
    "productName": "Pizza Hawaiana"
  },
  "suggestion": "Considera marcar el producto como no disponible en lugar de eliminarlo. Usa: PATCH /api/restaurant/products/1 con { \"isAvailable\": false }"
}
```

---

### **CASO 3: Alternativa - Desactivar Producto**

Si el producto tiene pedidos, la alternativa recomendada es desactivarlo:

**Request:**
```http
PATCH /api/restaurant/products/1
Authorization: Bearer {token}
Content-Type: application/json

{
  "isAvailable": false
}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Producto actualizado exitosamente",
  "data": {
    "product": {
      "id": 1,
      "name": "Pizza Hawaiana",
      "isAvailable": false,
      "updatedAt": "2025-01-09T18:35:00.000Z"
    },
    "updatedFields": ["isAvailable"]
  }
}
```

**Efecto:** El producto YA NO aparecerá en el menú del cliente, pero se preserva el histórico de pedidos.

---

## 🧪 PRUEBAS REQUERIDAS

### **TEST 1: Eliminar producto sin pedidos**
```bash
# Crear un producto nuevo de prueba
curl -X POST http://localhost:3000/api/restaurant/products \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "subcategoryId": 1,
    "name": "Producto de Prueba",
    "price": 50.00,
    "isAvailable": true
  }'

# Obtener el ID del producto creado (ej. 99)

# Intentar eliminar
curl -X DELETE http://localhost:3000/api/restaurant/products/99 \
  -H "Authorization: Bearer {token}"

# ✅ RESULTADO ESPERADO: 200 OK
```

---

### **TEST 2: Intentar eliminar producto con pedidos**
```bash
# Usar un producto que esté en el seed con pedidos (ej. productId: 1)
curl -X DELETE http://localhost:3000/api/restaurant/products/1 \
  -H "Authorization: Bearer {token}"

# ✅ RESULTADO ESPERADO: 409 CONFLICT con código PRODUCT_IN_USE
```

---

### **TEST 3: Desactivar producto con pedidos**
```bash
curl -X PATCH http://localhost:3000/api/restaurant/products/1 \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"isAvailable": false}'

# ✅ RESULTADO ESPERADO: 200 OK
# El producto se marca como no disponible pero NO se elimina
```

---

## 📊 VALIDACIONES IMPLEMENTADAS

| Validación | Ubicación | Resultado |
|------------|-----------|-----------|
| **Autenticación** | Middleware | 401 si token inválido |
| **Autorización** | Controlador línea 2363 | 403 si no es owner/branch_manager |
| **Producto existe** | Controlador línea 2296 | 404 si no existe |
| **Tiene pedidos** | Controlador línea 2377 | 409 PRODUCT_IN_USE |
| **Eliminar asociaciones** | Controlador línea 2396 | Automático antes de eliminar |

---

## 📝 DOCUMENTACIÓN ACTUALIZADA

Los siguientes archivos fueron actualizados:

### **1. Owner_Flow_Menu_Management.md**
- **Endpoint 16:** Descripción completa de `DELETE /products/:id`
- **Tabla de Errores:** Nuevo código `PRODUCT_IN_USE`
- **Reglas de Eliminación:** Actualizada regla de productos
- **Validaciones de Integridad:** Sección expandida

**Cambios específicos:**
- Líneas 1609-1697: Endpoint completo con reglas y errores
- Línea 2100: Nuevo error code en tabla
- Línea 2743: Regla actualizada
- Líneas 2683-2686: Validaciones de productos

---

## 🎯 IMPACTO EN FRONTEND

### **Manejo de Errores Requerido:**

```typescript
// MenuService.ts
async deleteProduct(productId: number): Promise<void> {
  try {
    await api.delete(`/api/restaurant/products/${productId}`);
    // Producto eliminado exitosamente
    this.showSuccess('Producto eliminado');
  } catch (error) {
    if (error.response?.data?.code === 'PRODUCT_IN_USE') {
      // Mostrar diálogo especial
      this.showDialog({
        title: 'No se puede eliminar',
        message: error.response.data.message,
        suggestion: error.response.data.suggestion,
        actions: [
          {
            label: 'Desactivar en su lugar',
            action: () => this.deactivateProduct(productId)
          },
          {
            label: 'Cancelar',
            action: () => {}
          }
        ]
      });
    } else if (error.response?.status === 404) {
      this.showError('Producto no encontrado');
    } else if (error.response?.status === 403) {
      this.showError('No tienes permisos');
    } else {
      this.showError('Error al eliminar producto');
    }
  }
}

async deactivateProduct(productId: number): Promise<void> {
  await api.patch(`/api/restaurant/products/${productId}`, {
    isAvailable: false
  });
  this.showSuccess('Producto desactivado');
}
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [x] Código actualizado en `restaurant-admin.controller.js`
- [x] Validación de pedidos implementada
- [x] Eliminación de asociaciones implementada
- [x] Documentación actualizada
- [x] Tabla de errores actualizada
- [x] Reglas de eliminación documentadas
- [ ] **PENDIENTE:** Pruebas manuales por usuario
- [ ] **PENDIENTE:** Frontend actualice manejo de errores

---

## 🚀 PRÓXIMOS PASOS

### **Para Backend (COMPLETADO):**
- ✅ Fix implementado
- ✅ Documentación actualizada
- ✅ Sin errores de linting

### **Para Usuario (TESTING):**
1. ⏳ Reiniciar servidor backend
2. ⏳ Probar TEST 1 (eliminar sin pedidos)
3. ⏳ Probar TEST 2 (eliminar con pedidos)
4. ⏳ Probar TEST 3 (desactivar producto)
5. ⏳ Reportar resultados

### **Para Frontend:**
1. ⏳ Leer esta documentación
2. ⏳ Actualizar `MenuService` con manejo de error `PRODUCT_IN_USE`
3. ⏳ Implementar diálogo de "Desactivar en su lugar"
4. ⏳ Probar integración completa

---

## 📞 SOPORTE

Si encuentras algún problema:

1. Verifica que estés usando la última versión del código
2. Revisa los logs del servidor para detalles del error
3. Confirma que el producto existe y pertenece a tu restaurante
4. Verifica tu rol (debe ser owner o branch_manager)

---

**Estado Final:** ✅ FIX COMPLETO Y LISTO PARA TESTING

**Responsable:** Arquitecto Backend Delixmi  
**Fecha de Fix:** 9 de Enero, 2025  
**Prioridad:** ALTA - Bug crítico resuelto

