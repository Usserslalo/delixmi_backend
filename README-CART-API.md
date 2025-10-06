# 🛒 API DEL CARRITO DE COMPRAS - DELIXMI

## 📋 ÍNDICE
1. [Introducción](#introducción)
2. [Estructura de Datos](#estructura-de-datos)
3. [Endpoints Disponibles](#endpoints-disponibles)
4. [Validaciones y Reglas de Negocio](#validaciones-y-reglas-de-negocio)
5. [Integración con Checkout](#integración-con-checkout)
6. [Manejo de Errores](#manejo-de-errores)
7. [Ejemplos de Uso](#ejemplos-de-uso)
8. [Flujo Completo](#flujo-completo)

## 🎯 INTRODUCCIÓN

El sistema de carrito de compras de Delixmi permite a los usuarios:
- ✅ Agregar productos de diferentes restaurantes
- ✅ Gestionar cantidades de productos
- ✅ Calcular totales automáticamente
- ✅ Validar disponibilidad de productos
- ✅ Integrar con el proceso de checkout
- ✅ Persistir carritos entre sesiones

### **Características Principales:**
- **Multi-restaurante**: Un usuario puede tener carritos de diferentes restaurantes
- **Validación en tiempo real**: Verifica disponibilidad y precios
- **Persistencia**: Los carritos se mantienen entre sesiones
- **Integración completa**: Se conecta directamente con el checkout

## 🗄️ ESTRUCTURA DE DATOS

### **Modelo Cart**
```sql
CREATE TABLE carts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  restaurant_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_restaurant (user_id, restaurant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id) ON DELETE CASCADE
);
```

### **Modelo CartItem**
```sql
CREATE TABLE cart_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT DEFAULT 1,
  price_at_add DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_cart_product (cart_id, product_id),
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);
```

## 🔗 ENDPOINTS DISPONIBLES

### **1. Obtener Carrito Completo**
```http
GET /api/cart
Authorization: Bearer <jwt_token>
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Carrito obtenido exitosamente",
  "data": {
    "carts": [
      {
        "id": 1,
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana",
          "logoUrl": "https://example.com/logo.jpg",
          "status": "active"
        },
        "items": [
          {
            "id": 1,
            "product": {
              "id": 1,
              "name": "Pizza Margherita",
              "description": "Pizza clásica con tomate y mozzarella",
              "imageUrl": "https://example.com/pizza.jpg",
              "price": 250.00,
              "isAvailable": true,
              "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana"
              }
            },
            "quantity": 2,
            "priceAtAdd": 250.00,
            "subtotal": 500.00,
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          }
        ],
        "totals": {
          "subtotal": 500.00,
          "deliveryFee": 25.00,
          "total": 525.00
        },
        "itemCount": 1,
        "totalQuantity": 2,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalCarts": 1,
      "totalItems": 2,
      "grandTotal": 525.00
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **2. Obtener Resumen del Carrito**
```http
GET /api/cart/summary
Authorization: Bearer <jwt_token>
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Resumen del carrito obtenido exitosamente",
  "data": {
    "summary": {
      "totalCarts": 2,
      "activeRestaurants": 2,
      "totalItems": 3,
      "totalQuantity": 5,
      "subtotal": 750.00,
      "estimatedDeliveryFee": 25.00,
      "estimatedTotal": 775.00
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### **3. Agregar Producto al Carrito**
```http
POST /api/cart/add
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2
}
```

**Respuesta Exitosa (201):**
```json
{
  "status": "success",
  "message": "Producto agregado al carrito exitosamente",
  "data": {
    "cartItem": {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Pizza Margherita",
        "description": "Pizza clásica con tomate y mozzarella",
        "imageUrl": "https://example.com/pizza.jpg",
        "price": 250.00,
        "isAvailable": true
      },
      "quantity": 2,
      "priceAtAdd": 250.00,
      "subtotal": 500.00
    },
    "action": "item_added"
  }
}
```

**Respuesta si el producto ya existe (200):**
```json
{
  "status": "success",
  "message": "Cantidad actualizada en el carrito",
  "data": {
    "cartItem": {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Pizza Margherita",
        "description": "Pizza clásica con tomate y mozzarella",
        "imageUrl": "https://example.com/pizza.jpg",
        "price": 250.00,
        "isAvailable": true
      },
      "quantity": 4,
      "priceAtAdd": 250.00,
      "subtotal": 1000.00
    },
    "action": "quantity_updated"
  }
}
```

### **4. Actualizar Cantidad de Item**
```http
PUT /api/cart/update/:itemId
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "quantity": 3
}
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Cantidad actualizada exitosamente",
  "data": {
    "cartItem": {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Pizza Margherita",
        "description": "Pizza clásica con tomate y mozzarella",
        "imageUrl": "https://example.com/pizza.jpg",
        "price": 250.00,
        "isAvailable": true
      },
      "quantity": 3,
      "priceAtAdd": 250.00,
      "subtotal": 750.00
    },
    "action": "quantity_updated"
  }
}
```

**Eliminar item (quantity: 0):**
```http
PUT /api/cart/update/1
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "quantity": 0
}
```

**Respuesta (200):**
```json
{
  "status": "success",
  "message": "Producto eliminado del carrito",
  "data": {
    "action": "item_removed",
    "itemId": 1
  }
}
```

### **5. Eliminar Item del Carrito**
```http
DELETE /api/cart/remove/:itemId
Authorization: Bearer <jwt_token>
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Producto eliminado del carrito exitosamente",
  "data": {
    "removedItem": {
      "id": 1,
      "productName": "Pizza Margherita"
    },
    "action": "item_removed"
  }
}
```

### **6. Limpiar Carrito**
```http
DELETE /api/cart/clear
Authorization: Bearer <jwt_token>
```

**Limpiar carrito específico:**
```http
DELETE /api/cart/clear?restaurantId=1
Authorization: Bearer <jwt_token>
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Carrito del restaurante limpiado exitosamente",
  "data": {
    "deletedCarts": 1,
    "deletedItems": 3,
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana"
      }
    ],
    "action": "cart_cleared"
  }
}
```

### **7. Validar Carrito**
```http
POST /api/cart/validate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "restaurantId": 1
}
```

**Respuesta Exitosa (200):**
```json
{
  "status": "success",
  "message": "Validación del carrito completada",
  "data": {
    "isValid": true,
    "validationResults": [
      {
        "cartId": 1,
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana",
          "status": "active"
        },
        "items": [
          {
            "itemId": 1,
            "product": {
              "id": 1,
              "name": "Pizza Margherita",
              "price": 250.00,
              "isAvailable": true,
              "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana",
                "status": "active"
              }
            },
            "quantity": 2,
            "priceAtAdd": 250.00,
            "currentPrice": 250.00,
            "isValid": true,
            "issues": []
          }
        ],
        "isValid": true,
        "issues": []
      }
    ],
    "summary": {
      "totalCarts": 1,
      "validItems": 2,
      "totalValue": 500.00,
      "issuesFound": 0
    },
    "validatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## ✅ VALIDACIONES Y REGLAS DE NEGOCIO

### **Validaciones de Entrada:**
1. **Autenticación**: Todos los endpoints requieren JWT válido
2. **Autorización**: Solo usuarios con rol 'customer' pueden acceder
3. **ProductId**: Debe ser un entero positivo
4. **Quantity**: Debe estar entre 0 y 99
5. **ItemId**: Debe ser un entero positivo válido

### **Reglas de Negocio:**
1. **Un carrito por restaurante**: Cada usuario puede tener máximo un carrito por restaurante
2. **Productos únicos**: No se pueden duplicar productos en el mismo carrito
3. **Disponibilidad**: Solo se pueden agregar productos disponibles
4. **Restaurante activo**: Solo se pueden agregar productos de restaurantes activos
5. **Precio fijo**: El precio se guarda al momento de agregar al carrito
6. **Cantidad mínima**: La cantidad mínima es 1 al agregar
7. **Cantidad máxima**: La cantidad máxima es 99 por producto

### **Validaciones Automáticas:**
- ✅ Verificar que el producto existe
- ✅ Verificar que el producto está disponible
- ✅ Verificar que el restaurante está activo
- ✅ Verificar que el usuario tiene permisos
- ✅ Calcular totales automáticamente
- ✅ Mantener consistencia de datos

## 🔄 INTEGRACIÓN CON CHECKOUT

### **Checkout con Carrito:**
```http
POST /api/checkout/create-preference
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "addressId": 1,
  "useCart": true,
  "restaurantId": 1,
  "specialInstructions": "Sin cebolla, por favor"
}
```

### **Checkout Directo (sin carrito):**
```http
POST /api/checkout/create-preference
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "addressId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2
    }
  ],
  "specialInstructions": "Sin cebolla, por favor"
}
```

### **Flujo de Integración:**
1. **Validar carrito** antes del checkout
2. **Crear preferencia** de pago con items del carrito
3. **Crear orden** en estado 'pending'
4. **Limpiar carrito** automáticamente después del checkout exitoso
5. **Mantener referencia** del carrito usado en la orden

## ⚠️ MANEJO DE ERRORES

### **Errores Comunes:**

#### **400 - Bad Request**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "field": "productId",
      "message": "El ID del producto es requerido"
    }
  ]
}
```

#### **404 - Not Found**
```json
{
  "status": "error",
  "message": "Producto no encontrado",
  "code": "PRODUCT_NOT_FOUND"
}
```

#### **400 - Product Unavailable**
```json
{
  "status": "error",
  "message": "El producto no está disponible",
  "code": "PRODUCT_UNAVAILABLE"
}
```

#### **400 - Restaurant Inactive**
```json
{
  "status": "error",
  "message": "El restaurante no está activo",
  "code": "RESTAURANT_INACTIVE"
}
```

#### **500 - Internal Server Error**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "error": "Database connection failed"
}
```

## 📱 EJEMPLOS DE USO

### **Flujo Completo de Compra:**

#### **1. Agregar Productos al Carrito**
```javascript
// Agregar primera pizza
await fetch('/api/cart/add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 1,
    quantity: 2
  })
});

// Agregar bebida
await fetch('/api/cart/add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productId: 5,
    quantity: 1
  })
});
```

#### **2. Verificar Carrito**
```javascript
const cartResponse = await fetch('/api/cart', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const cartData = await cartResponse.json();
console.log('Carrito:', cartData.data);
```

#### **3. Actualizar Cantidades**
```javascript
// Cambiar cantidad de pizza a 3
await fetch('/api/cart/update/1', {
  method: 'PUT',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    quantity: 3
  })
});
```

#### **4. Validar Antes del Checkout**
```javascript
const validationResponse = await fetch('/api/cart/validate', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    restaurantId: 1
  })
});
const validation = await validationResponse.json();

if (validation.data.isValid) {
  // Proceder al checkout
} else {
  // Mostrar errores al usuario
}
```

#### **5. Checkout con Carrito**
```javascript
const checkoutResponse = await fetch('/api/checkout/create-preference', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    addressId: 1,
    useCart: true,
    restaurantId: 1,
    specialInstructions: 'Sin cebolla'
  })
});
const checkout = await checkoutResponse.json();

// Redirigir a Mercado Pago
window.location.href = checkout.data.init_point;
```

## 🔄 FLUJO COMPLETO

### **Diagrama de Flujo:**
```
1. Usuario navega por restaurantes
2. Agrega productos al carrito
3. Ve resumen del carrito
4. Actualiza cantidades si es necesario
5. Valida carrito antes del checkout
6. Procede al checkout
7. Carrito se limpia automáticamente
8. Orden se crea en estado 'pending'
9. Usuario completa pago
10. Orden se actualiza según resultado
```

### **Estados del Carrito:**
- **Vacio**: Sin productos
- **Con productos**: Listo para checkout
- **Validado**: Verificado antes del checkout
- **En checkout**: Procesando pago
- **Limpiado**: Después del checkout exitoso

### **Persistencia:**
- ✅ **Base de datos**: Carritos se guardan en MySQL
- ✅ **Sesiones**: Persisten entre sesiones del usuario
- ✅ **Multi-dispositivo**: Accesibles desde cualquier dispositivo
- ✅ **Limpieza automática**: Se limpian después del checkout

## 🚀 PRÓXIMOS PASOS

### **Para el Frontend Flutter:**
1. **Implementar CartService** para consumir la API
2. **Crear modelos** Cart, CartItem, CartSummary
3. **Implementar estado** del carrito con Provider/Bloc
4. **Crear widgets** para mostrar carrito
5. **Integrar con checkout** existente
6. **Manejar errores** y estados de carga
7. **Implementar validaciones** en frontend
8. **Agregar notificaciones** de cambios

### **Mejoras Futuras:**
- 🔄 **Sincronización en tiempo real** con WebSockets
- 📱 **Notificaciones push** de cambios en carrito
- 💾 **Caché local** para mejor rendimiento
- 🎯 **Recomendaciones** de productos
- 📊 **Analytics** de comportamiento de carrito
- 🔄 **Carritos compartidos** entre usuarios

---

**✅ El sistema de carrito está completamente implementado y listo para usar en el frontend Flutter.**
