# 📱 Flujo del Cliente - Ver Restaurantes y Productos

## 🎯 Descripción General

Este documento describe el flujo completo para que un cliente vea los restaurantes disponibles, explore sus menús y agregue productos al carrito con o sin modificadores.

---

## 🔄 Flujo Completo del Cliente

### 1️⃣ **LISTADO DE RESTAURANTES**

El cliente ve un listado de todos los restaurantes activos con información básica.

#### Endpoint
```
GET /api/restaurants
```

#### Query Parameters (Opcionales)
| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | 1 | Número de página |
| `pageSize` | number | 10 | Cantidad de restaurantes por página (máx: 100) |
| `category` | string | - | Filtrar por categoría (ej: "Pizzas", "Sushi") |
| `search` | string | - | Buscar por nombre o descripción |

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana",
        "description": "Las mejores pizzas artesanales de la región",
        "category": "Pizzas",
        "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
        "coverPhotoUrl": "https://example.com/covers/pizzeria-ana-cover.jpg",
        "rating": 4.5,
        "isOpen": true,
        "branches": [
          {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Av. Insurgentes 10, Centro",
            "latitude": 20.484123,
            "longitude": -99.216345,
            "phone": "7711234567",
            "usesPlatformDrivers": true,
            "deliveryFee": 20.00,
            "estimatedDeliveryMin": 25,
            "estimatedDeliveryMax": 35,
            "deliveryRadius": 5.0,
            "isOpen": true,
            "schedule": [...]
          }
        ]
      }
    ],
    "pagination": {
      "totalRestaurants": 2,
      "currentPage": 1,
      "pageSize": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

#### 🎨 UI - Lo que se muestra al cliente:
- ✅ `logoUrl` - Logo del restaurante
- ✅ `coverPhotoUrl` - Imagen de portada
- ✅ `name` - Nombre del restaurante
- ✅ `description` - Descripción breve
- ✅ `isOpen` - Badge "ABIERTO" o "CERRADO" (calculado en tiempo real según horarios)
- ✅ `rating` - Calificación promedio
- ✅ `deliveryFee` - Costo de envío
- ✅ `estimatedDeliveryMin` y `estimatedDeliveryMax` - Tiempo estimado de entrega

---

### 2️⃣ **DETALLES DE RESTAURANTE + MENÚ COMPLETO**

Al pulsar sobre un restaurante, el cliente ve toda la información del restaurante Y su menú completo organizado por categorías.

#### Endpoint
```
GET /api/restaurants/:id
```

#### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | number | ID del restaurante |

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la región",
      "category": "Pizzas",
      "rating": 4.5,
      "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
      "coverPhotoUrl": "https://example.com/covers/pizzeria-ana-cover.jpg",
      "isOpen": true,
      "branches": [...],
      "menu": [
        {
          "id": 1,
          "name": "Pizzas",
          "subcategories": [
            {
              "id": 1,
              "name": "Pizzas Tradicionales",
              "displayOrder": 1,
              "products": [
                {
                  "id": 1,
                  "name": "Pizza Hawaiana",
                  "description": "La clásica pizza con jamón y piña fresca.",
                  "imageUrl": "https://images.unsplash.com/...",
                  "price": 150.00,
                  "modifierGroups": [
                    {
                      "id": 1,
                      "name": "Tamaño",
                      "minSelection": 1,
                      "maxSelection": 1,
                      "required": true,
                      "options": [
                        {
                          "id": 1,
                          "name": "Personal (6 pulgadas)",
                          "price": 0.00
                        },
                        {
                          "id": 2,
                          "name": "Mediana (10 pulgadas)",
                          "price": 25.00
                        },
                        {
                          "id": 3,
                          "name": "Grande (12 pulgadas)",
                          "price": 45.00
                        }
                      ]
                    },
                    {
                      "id": 2,
                      "name": "Extras",
                      "minSelection": 0,
                      "maxSelection": 5,
                      "required": false,
                      "options": [
                        {
                          "id": 5,
                          "name": "Extra Queso",
                          "price": 15.00
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          "id": 2,
          "name": "Bebidas",
          "subcategories": [...]
        }
      ]
    }
  }
}
```

#### 🎨 UI - Lo que se muestra al cliente:

**Cabecera del restaurante:**
- ✅ `coverPhotoUrl` - Imagen de portada grande
- ✅ `name` - Nombre del restaurante
- ✅ `description` - Descripción completa
- ✅ `isOpen` - Badge "ABIERTO" o "CERRADO"
- ✅ `rating` - Calificación con estrellas

**Navegación por categorías:**
- ✅ Tabs o chips horizontales con los nombres de las categorías principales (`menu[].name`)
- Ejemplo: [ Pizzas ] [ Bebidas ] [ Postres ]

**Lista de productos:**
- Para cada producto en la subcategoría seleccionada:
  - ✅ `imageUrl` - Imagen del platillo
  - ✅ `name` - Nombre del platillo
  - ✅ `description` - Descripción breve
  - ✅ `price` - Precio base
  - ✅ **Botón "+" para agregar al carrito**

---

### 3️⃣ **VER DETALLES DE UN PRODUCTO (MODAL)**

Cuando el cliente pulsa sobre un producto (ya sea el botón + o la tarjeta completa), se puede abrir un modal para ver sus detalles y modificadores.

#### Endpoint
```
GET /api/restaurants/:restaurantId/products/:productId
```

#### Path Parameters
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `restaurantId` | number | ID del restaurante |
| `productId` | number | ID del producto |

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "data": {
    "product": {
      "id": 1,
      "name": "Pizza Hawaiana",
      "description": "La clásica pizza con jamón y piña fresca.",
      "imageUrl": "https://images.unsplash.com/...",
      "price": 150.00,
      "tags": "pizza, jamon, pina",
      "subcategory": {
        "id": 1,
        "name": "Pizzas Tradicionales",
        "category": {
          "id": 1,
          "name": "Pizzas"
        }
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana",
        "status": "active"
      },
      "modifierGroups": [
        {
          "id": 1,
          "name": "Tamaño",
          "minSelection": 1,
          "maxSelection": 1,
          "required": true,
          "options": [...]
        },
        {
          "id": 2,
          "name": "Extras",
          "minSelection": 0,
          "maxSelection": 5,
          "required": false,
          "options": [...]
        }
      ]
    }
  }
}
```

#### 🎨 UI - Modal de Detalles del Producto:
- ✅ `imageUrl` - Imagen grande del producto
- ✅ `name` - Nombre del producto
- ✅ `price` - Precio base
- ✅ `description` - Descripción completa

**Para cada grupo de modificadores:**
- ✅ `name` - Título del grupo (ej: "Tamaño")
- ✅ `required` - Si es `true`, mostrar asterisco o badge "REQUERIDO"
- ✅ `minSelection` y `maxSelection` - Mostrar límites (ej: "Elige 1" o "Elige hasta 3")
- ✅ Para cada opción:
  - Checkbox (si maxSelection > 1) o Radio button (si maxSelection = 1)
  - Nombre de la opción
  - Precio adicional (si price > 0)

**Botón final:**
- ✅ "Agregar al carrito - $XXX" (precio calculado)

---

### 4️⃣ **AGREGAR PRODUCTO AL CARRITO**

Existen 2 flujos para agregar un producto al carrito:

#### 📍 **FLUJO A: Producto SIN modificadores requeridos**
Ejemplo: Coca-Cola 600ml

1. Cliente pulsa el botón "+" directamente desde la lista
2. Se envía la petición sin modificadores
3. El producto se agrega inmediatamente al carrito

#### 📍 **FLUJO B: Producto CON modificadores requeridos**
Ejemplo: Pizza, Chilaquiles, Hamburguesa

1. Cliente pulsa el botón "+" o la tarjeta del producto
2. **SE DEBE ABRIR UN MODAL/VISTA** con los detalles y modificadores
3. Cliente selecciona los modificadores requeridos
4. Se envía la petición con los modificadores seleccionados
5. El producto se agrega al carrito con el precio total calculado

#### Endpoint
```
POST /api/cart/add
```

#### Headers Requeridos
```
Authorization: Bearer <token>
```

#### Body
```json
{
  "productId": 1,
  "quantity": 1,
  "modifierOptionIds": [2, 5, 10]
}
```

#### Campos del Body
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `productId` | number | ✅ Sí | ID del producto a agregar |
| `quantity` | number | ❌ No | Cantidad (default: 1) |
| `modifierOptionIds` | number[] | ❌ No | Array de IDs de opciones de modificadores seleccionadas |

#### ✅ Respuesta Exitosa (201)
```json
{
  "status": "success",
  "message": "Producto agregado al carrito exitosamente",
  "data": {
    "cartItem": {
      "id": 1,
      "product": {
        "id": 1,
        "name": "Pizza Hawaiana",
        "description": "La clásica pizza con jamón y piña fresca.",
        "imageUrl": "https://images.unsplash.com/...",
        "price": 150.00,
        "isAvailable": true
      },
      "quantity": 1,
      "priceAtAdd": 210.00,
      "subtotal": 210.00,
      "modifiers": [
        {
          "id": 2,
          "name": "Mediana (10 pulgadas)",
          "price": 25.00,
          "group": {
            "id": 1,
            "name": "Tamaño"
          }
        },
        {
          "id": 5,
          "name": "Extra Queso",
          "price": 35.00,
          "group": {
            "id": 2,
            "name": "Extras"
          }
        }
      ]
    },
    "action": "item_added"
  }
}
```

#### ❌ Error: Modificadores Requeridos Faltantes (400)
Este error ocurre cuando intentas agregar un producto que requiere modificadores sin proporcionarlos.

```json
{
  "status": "error",
  "message": "Este producto requiere que selecciones modificadores antes de agregarlo al carrito",
  "code": "MODIFIERS_REQUIRED",
  "details": {
    "productId": 1,
    "productName": "Pizza Hawaiana",
    "errors": [
      {
        "type": "MISSING_REQUIRED_MODIFIERS",
        "message": "Faltan modificadores requeridos",
        "groups": [
          {
            "groupId": 1,
            "groupName": "Tamaño",
            "minRequired": 1,
            "maxAllowed": 1,
            "selected": 0
          }
        ]
      }
    ]
  }
}
```

#### 💡 Lógica del Frontend

**Al intentar agregar un producto:**

```javascript
// Opción 1: Verificar en el frontend si tiene modificadores requeridos
const product = {...}; // Producto del endpoint /api/restaurants/:id

const hasRequiredModifiers = product.modifierGroups.some(
  group => group.required === true
);

if (hasRequiredModifiers) {
  // Abrir modal con modificadores
  openModifierModal(product);
} else {
  // Agregar directamente al carrito
  addToCart(product.id, 1, []);
}
```

```javascript
// Opción 2: Intentar agregar y manejar el error
try {
  const response = await addToCart(productId, 1, []);
  showSuccessMessage('Producto agregado al carrito');
} catch (error) {
  if (error.code === 'MODIFIERS_REQUIRED') {
    // Abrir modal con modificadores
    openModifierModal(product, error.details);
  } else {
    showErrorMessage(error.message);
  }
}
```

---

## 📊 Cálculo de Precios

### Precio del Producto en el Carrito

El precio final de un producto en el carrito se calcula de la siguiente manera:

```
priceAtAdd = precioBaseProducto + Σ(precios de modificadores seleccionados)
```

**Ejemplo:**
- Pizza Hawaiana (base): $150.00
- + Tamaño Mediana: $25.00
- + Extra Queso: $35.00
- **= Total: $210.00**

### Precio Total del Carrito

Al momento del checkout, el precio total se calcula:

```
subtotal = Σ(priceAtAdd × quantity) de todos los items
deliveryFee = tarifa de envío de la sucursal
serviceFee = comisión de servicio (si aplica)
total = subtotal + deliveryFee + serviceFee
```

---

## 🔍 Validaciones Implementadas

### ✅ Validaciones en el Backend

1. **Producto existe y está disponible**
   - Verifica que `isAvailable = true`

2. **Restaurante está activo**
   - Verifica que `status = 'active'`

3. **Modificadores requeridos completos**
   - Si un grupo tiene `minSelection > 0`, DEBE tener al menos esa cantidad de modificadores seleccionados

4. **Modificadores dentro del rango permitido**
   - Verifica que `selectedCount >= minSelection` y `selectedCount <= maxSelection`

5. **Modificadores pertenecen al producto**
   - Verifica que los modificadores seleccionados están asociados al producto

6. **Modificadores pertenecen al restaurante correcto**
   - Evita que se usen modificadores de otros restaurantes

---

## 🎯 Ejemplos de Uso

### Ejemplo 1: Agregar Coca-Cola (sin modificadores)

```javascript
// Coca-Cola no tiene modificadores requeridos
POST /api/cart/add
{
  "productId": 7,
  "quantity": 1,
  "modifierOptionIds": []
}

// ✅ Se agrega directamente
```

### Ejemplo 2: Agregar Pizza Hawaiana (con modificadores)

```javascript
// Pizza Hawaiana REQUIERE seleccionar tamaño
POST /api/cart/add
{
  "productId": 1,
  "quantity": 1,
  "modifierOptionIds": [] // ❌ Falta el tamaño
}

// ❌ Error: MODIFIERS_REQUIRED
// El frontend debe abrir el modal de modificadores

// Después de seleccionar en el modal:
POST /api/cart/add
{
  "productId": 1,
  "quantity": 1,
  "modifierOptionIds": [2, 5, 10] // Tamaño Mediana + Extra Queso + Sin Cebolla
}

// ✅ Se agrega correctamente con precio calculado
```

### Ejemplo 3: Agregar Chilaquiles (modificadores opcionales y requeridos)

```javascript
// Chilaquiles REQUIERE salsa, pero los toppings son opcionales
POST /api/cart/add
{
  "productId": 15,
  "quantity": 1,
  "modifierOptionIds": [45] // Solo salsa verde (requerida)
}

// ✅ Se agrega correctamente sin toppings adicionales

// O con toppings adicionales:
POST /api/cart/add
{
  "productId": 15,
  "quantity": 1,
  "modifierOptionIds": [45, 67, 68] // Salsa verde + crema + queso
}

// ✅ Se agrega con precio adicional por los toppings
```

---

## 📱 Flujo Completo del Usuario (UX)

```
1. Usuario ve lista de restaurantes
   ↓
2. Usuario pulsa en "Pizzería de Ana"
   ↓
3. Se muestra el menú con categorías: [Pizzas] [Bebidas] [Postres]
   ↓
4. Usuario selecciona categoría "Pizzas"
   ↓
5. Se muestran los productos de pizza con botón "+"
   ↓
6. Usuario pulsa "+" en "Pizza Hawaiana"
   ↓
7. Sistema detecta que tiene modificadores REQUERIDOS
   ↓
8. Se abre modal con:
   - Imagen de la pizza
   - Nombre y descripción
   - Precio base: $150
   - Sección "Tamaño" (REQUERIDO) - Radio buttons
   - Sección "Extras" (Opcional) - Checkboxes
   - Sección "Sin ingredientes" (Opcional) - Checkboxes
   - Botón "Agregar al carrito - $XXX" (precio actualizado en tiempo real)
   ↓
9. Usuario selecciona:
   - Tamaño: Mediana (+$25)
   - Extras: Extra Queso (+$35)
   ↓
10. Precio del botón se actualiza a: "Agregar al carrito - $210"
    ↓
11. Usuario pulsa "Agregar al carrito"
    ↓
12. POST /api/cart/add con modifierOptionIds
    ↓
13. ✅ Producto agregado exitosamente
    ↓
14. Se muestra notificación: "Pizza Hawaiana agregada al carrito"
    ↓
15. Badge del carrito se actualiza con el contador de items
```

---

## 🎨 Recomendaciones de UX/UI

### 1. **Indicadores visuales de modificadores requeridos**
- Usar asterisco (*) o badge "REQUERIDO" en rojo
- Deshabilitar botón "Agregar al carrito" hasta que se complete

### 2. **Precio dinámico**
- Actualizar el precio en tiempo real mientras el usuario selecciona modificadores
- Mostrar el precio base tachado si hay modificadores con costo

### 3. **Validación en el frontend**
- Verificar que se cumplan los `minSelection` y `maxSelection` antes de enviar
- Mostrar mensajes de error si faltan selecciones

### 4. **Estado del restaurante**
- Mostrar badge "ABIERTO" en verde o "CERRADO" en rojo
- Si está cerrado, deshabilitar los botones de agregar al carrito

### 5. **Feedback visual**
- Animación al agregar al carrito
- Badge con contador de items en el icono del carrito
- Toast notification con confirmación

---

## 🔐 Autenticación

**IMPORTANTE:** Los endpoints del carrito requieren autenticación.

```javascript
// Agregar header en todas las peticiones al carrito
headers: {
  'Authorization': `Bearer ${userToken}`,
  'Content-Type': 'application/json'
}
```

---

## 📝 Notas Adicionales

### Horarios de Restaurantes
- Todos los restaurantes están configurados para estar abiertos 24 horas
- El campo `isOpen` se calcula en tiempo real basado en los horarios de las sucursales
- Un restaurante está "abierto" si AL MENOS UNA sucursal está abierta

### Modificadores vs Personalizaciones
- **Modificadores con costo:** Extra queso, bacon, aguacate extra
- **Modificadores sin costo:** Tamaño personal, sin cebolla, poco picante
- Todos los modificadores se almacenan de la misma manera en el sistema

### Manejo de Errores
Todos los endpoints siguen el mismo formato de error:
```json
{
  "status": "error",
  "message": "Mensaje descriptivo del error",
  "code": "ERROR_CODE",
  "details": { /* información adicional */ }
}
```

---

## 🚀 Endpoints Completos del Flujo

| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| GET | `/api/restaurants` | ❌ No | Listar restaurantes |
| GET | `/api/restaurants/:id` | ❌ No | Ver restaurante + menú completo |
| GET | `/api/restaurants/:restaurantId/products/:productId` | ❌ No | Ver detalles de un producto |
| POST | `/api/cart/add` | ✅ Sí | Agregar producto al carrito |
| GET | `/api/cart` | ✅ Sí | Ver carrito completo |
| GET | `/api/cart/summary` | ✅ Sí | Ver resumen del carrito |
| PUT | `/api/cart/update/:itemId` | ✅ Sí | Actualizar cantidad de un item |
| DELETE | `/api/cart/remove/:itemId` | ✅ Sí | Eliminar item del carrito |
| DELETE | `/api/cart/clear` | ✅ Sí | Limpiar carrito |

---

## ✅ Checklist de Implementación Frontend

- [ ] Pantalla de listado de restaurantes
- [ ] Pantalla de detalles de restaurante con menú
- [ ] Navegación por categorías (tabs/chips)
- [ ] Tarjetas de productos con botón "+"
- [ ] Modal de detalles de producto con modificadores
- [ ] Validación de modificadores requeridos
- [ ] Cálculo de precio en tiempo real
- [ ] Integración con API de carrito
- [ ] Badge de contador en icono del carrito
- [ ] Notificaciones de éxito/error
- [ ] Manejo de estados de carga
- [ ] Manejo de restaurante cerrado

---

**Documentación actualizada:** Octubre 2025  
**Versión:** 1.0  
**Backend:** Node.js + Express + Prisma + MySQL

