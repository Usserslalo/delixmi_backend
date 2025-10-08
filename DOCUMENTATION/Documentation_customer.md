# 📱 Documentación API - Panel del Cliente

Esta documentación describe todos los endpoints disponibles para los clientes de la plataforma Delixmi. Los endpoints están organizados por funcionalidad y incluyen ejemplos detallados de uso.

---

## 🔐 1. Autenticación y Perfil

### 1.1. Registro de Usuario
Registra un nuevo usuario en la plataforma.

- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Rol Requerido:** `Ninguno (público)`

#### Headers
```
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "name": "string // Nombre del usuario (2-100 caracteres)",
  "lastname": "string // Apellido del usuario (2-100 caracteres)",
  "email": "string // Email válido (máximo 150 caracteres)",
  "phone": "string // Teléfono mexicano válido (10-20 caracteres)",
  "password": "string // Contraseña segura (mínimo 8 caracteres, debe incluir: 1 minúscula, 1 mayúscula, 1 número, 1 carácter especial)"
}
```

#### Success Response (201)
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "phone": "+525512345678",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "emailSent": true
  }
}
```

#### Error Responses
**400 - Datos inválidos**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "field": "email",
      "message": "Debe ser un email válido"
    }
  ]
}
```

**409 - Usuario ya existe**
```json
{
  "status": "error",
  "message": "Ya existe un usuario con este correo electrónico",
  "code": "USER_EXISTS",
  "field": "email"
}
```

---

### 1.2. Inicio de Sesión
Autentica un usuario existente en la plataforma.

- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Rol Requerido:** `Ninguno (público)`

#### Headers
```
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "email": "string // Email del usuario",
  "password": "string // Contraseña del usuario"
}
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "status": "active",
      "roles": [
        {
          "roleId": 1,
          "roleName": "customer",
          "roleDisplayName": "Cliente",
          "restaurantId": null,
          "branchId": null
        }
      ]
    },
    "expiresIn": "24h"
  }
}
```

#### Error Responses
**401 - Credenciales inválidas**
```json
{
  "status": "error",
  "message": "Credenciales inválidas",
  "code": "INVALID_CREDENTIALS"
}
```

**403 - Cuenta no verificada**
```json
{
  "status": "error",
  "message": "Cuenta no verificada. Por favor, verifica tu correo electrónico.",
  "code": "ACCOUNT_NOT_VERIFIED",
  "userStatus": "pending"
}
```

---

### 1.3. Obtener Perfil
Obtiene la información del perfil del usuario autenticado.

- **Method:** `GET`
- **Endpoint:** `/api/auth/profile`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Perfil obtenido exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "phone": "+525512345678",
      "status": "active",
      "roles": [
        {
          "roleId": 1,
          "roleName": "customer",
          "roleDisplayName": "Cliente"
        }
      ]
    }
  }
}
```

---

## 🏪 2. Exploración de Restaurantes

### 2.1. Lista de Restaurantes
Obtiene la lista de restaurantes activos con información de sucursales y horarios.

- **Method:** `GET`
- **Endpoint:** `/api/restaurants`
- **Rol Requerido:** `Ninguno (público)`

#### URL Parameters
- `page` (opcional): Número de página (default: 1)
- `pageSize` (opcional): Tamaño de página (default: 10, máximo: 100)

#### Success Response (200)
```json
{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana",
        "description": "Las mejores pizzas artesanales de la ciudad",
        "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
        "coverPhotoUrl": "https://example.com/covers/pizzeria-ana-cover.jpg",
        "branches": [
          {
            "id": 1,
            "name": "Centro",
            "address": "Av. Principal 123, Centro",
            "latitude": 19.4326,
            "longitude": -99.1332,
            "phone": "+525512345678",
            "usesPlatformDrivers": true,
            "isOpen": true,
            "schedule": [
              {
                "dayOfWeek": 0,
                "openingTime": "00:00:00",
                "closingTime": "23:59:59",
                "isClosed": false
              }
            ]
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

---

### 2.2. Detalle de Restaurante
Obtiene información detallada de un restaurante específico con su menú completo.

- **Method:** `GET`
- **Endpoint:** `/api/restaurants/:id`
- **Rol Requerido:** `Ninguno (público)`

#### URL Parameters
- `id` (integer): ID del restaurante

#### Success Response (200)
```json
{
  "status": "success",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la ciudad",
      "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
      "coverPhotoUrl": "https://example.com/covers/pizzeria-ana-cover.jpg",
      "branches": [
        {
          "id": 1,
          "name": "Centro",
          "address": "Av. Principal 123, Centro",
          "latitude": 19.4326,
          "longitude": -99.1332,
          "phone": "+525512345678",
          "usesPlatformDrivers": true,
          "isOpen": true,
          "schedule": [
            {
              "dayOfWeek": 0,
              "openingTime": "00:00:00",
              "closingTime": "23:59:59",
              "isClosed": false
            }
          ]
        }
      ],
      "menu": [
        {
          "id": 1,
          "name": "Pizzas",
          "subcategories": [
            {
              "id": 1,
              "name": "Pizzas Clásicas",
              "products": [
                {
                  "id": 1,
                  "name": "Pizza Margherita",
                  "description": "Salsa de tomate, mozzarella fresca y albahaca",
                  "price": 180.00,
                  "imageUrl": "https://example.com/products/margherita.jpg",
                  "isAvailable": true,
                  "modifierGroups": [
                    {
                      "id": 1,
                      "name": "Tamaño",
                      "minSelection": 1,
                      "maxSelection": 1,
                      "options": [
                        {
                          "id": 1,
                          "name": "Chica",
                          "price": 0.00
                        },
                        {
                          "id": 2,
                          "name": "Mediana",
                          "price": 30.00
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

---

## 📍 3. Gestión de Direcciones

### 3.1. Obtener Direcciones
Obtiene todas las direcciones de entrega del cliente autenticado.

- **Method:** `GET`
- **Endpoint:** `/api/customer/addresses`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Direcciones obtenidas exitosamente",
  "data": {
    "addresses": [
      {
        "id": 1,
        "alias": "Casa",
        "street": "Calle Reforma",
        "exteriorNumber": "123",
        "interiorNumber": "A",
        "neighborhood": "Centro",
        "city": "Ciudad de México",
        "state": "CDMX",
        "zipCode": "06000",
        "references": "Edificio azul, portón negro",
        "latitude": 19.4326,
        "longitude": -99.1332,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z",
        "customer": {
          "id": 1,
          "name": "Juan",
          "lastname": "Pérez"
        }
      }
    ],
    "totalAddresses": 1,
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 3.2. Crear Dirección
Crea una nueva dirección de entrega para el cliente autenticado.

- **Method:** `POST`
- **Endpoint:** `/api/customer/addresses`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "alias": "string // Nombre descriptivo de la dirección (1-50 caracteres)",
  "street": "string // Nombre de la calle (1-255 caracteres)",
  "exterior_number": "string // Número exterior (1-50 caracteres)",
  "interior_number": "string // Número interior (opcional, máximo 50 caracteres)",
  "neighborhood": "string // Colonia/barrio (1-150 caracteres)",
  "city": "string // Ciudad (1-100 caracteres)",
  "state": "string // Estado (1-100 caracteres)",
  "zip_code": "string // Código postal solo números (1-10 caracteres)",
  "references": "string // Referencias adicionales (opcional, máximo 500 caracteres)",
  "latitude": "number // Latitud (-90 a 90)",
  "longitude": "number // Longitud (-180 a 180)"
}
```

#### Success Response (201)
```json
{
  "status": "success",
  "message": "Dirección creada exitosamente",
  "data": {
    "address": {
      "id": 1,
      "alias": "Casa",
      "street": "Calle Reforma",
      "exteriorNumber": "123",
      "interiorNumber": "A",
      "neighborhood": "Centro",
      "city": "Ciudad de México",
      "state": "CDMX",
      "zipCode": "06000",
      "references": "Edificio azul, portón negro",
      "latitude": 19.4326,
      "longitude": -99.1332,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "customer": {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez"
      }
    }
  }
}
```

#### Error Responses
**409 - Alias duplicado**
```json
{
  "status": "error",
  "message": "Ya existe una dirección con este alias",
  "code": "ADDRESS_ALIAS_EXISTS",
  "details": {
    "alias": "Casa",
    "existingAddressId": "1"
  }
}
```

---

### 3.3. Actualizar Dirección
Actualiza una dirección de entrega existente del cliente autenticado.

- **Method:** `PATCH`
- **Endpoint:** `/api/customer/addresses/:addressId`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### URL Parameters
- `addressId` (integer): ID de la dirección a actualizar

#### Request Body (JSON)
```json
{
  "alias": "string // Nombre descriptivo (opcional, 1-50 caracteres)",
  "street": "string // Nombre de la calle (opcional, 1-255 caracteres)",
  "exterior_number": "string // Número exterior (opcional, 1-50 caracteres)",
  "interior_number": "string // Número interior (opcional, máximo 50 caracteres)",
  "neighborhood": "string // Colonia/barrio (opcional, 1-150 caracteres)",
  "city": "string // Ciudad (opcional, 1-100 caracteres)",
  "state": "string // Estado (opcional, 1-100 caracteres)",
  "zip_code": "string // Código postal (opcional, solo números, 1-10 caracteres)",
  "references": "string // Referencias (opcional, máximo 500 caracteres)",
  "latitude": "number // Latitud (opcional, -90 a 90)",
  "longitude": "number // Longitud (opcional, -180 a 180)"
}
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Dirección actualizada exitosamente",
  "data": {
    "address": {
      "id": 1,
      "alias": "Casa Actualizada",
      "street": "Calle Reforma",
      "exteriorNumber": "123",
      "interiorNumber": "A",
      "neighborhood": "Centro",
      "city": "Ciudad de México",
      "state": "CDMX",
      "zipCode": "06000",
      "references": "Edificio azul, portón negro",
      "latitude": 19.4326,
      "longitude": -99.1332,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z",
      "customer": {
        "id": 1,
        "name": "Juan",
        "lastname": "Pérez"
      }
    }
  }
}
```

---

### 3.4. Eliminar Dirección
Elimina una dirección de entrega del cliente autenticado.

- **Method:** `DELETE`
- **Endpoint:** `/api/customer/addresses/:addressId`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `addressId` (integer): ID de la dirección a eliminar

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Dirección eliminada exitosamente",
  "data": {
    "deletedAddress": {
      "id": 1,
      "alias": "Casa",
      "addressInfo": "Calle Reforma 123, Centro, Ciudad de México, CDMX",
      "deletedAt": "2024-01-15T10:40:00.000Z"
    },
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    }
  }
}
```

#### Error Responses
**409 - Dirección en uso**
```json
{
  "status": "error",
  "message": "No se puede eliminar la dirección porque está siendo utilizada en pedidos",
  "code": "ADDRESS_IN_USE",
  "details": {
    "addressId": 1,
    "addressAlias": "Casa",
    "addressInfo": "Calle Reforma 123, Centro, Ciudad de México, CDMX",
    "orderId": "1",
    "orderStatus": "pending",
    "orderPlacedAt": "2024-01-15T10:30:00.000Z",
    "suggestion": "Elimina o actualiza los pedidos que usan esta dirección antes de eliminarla"
  }
}
```

---

## 🛒 4. Carrito de Compras

### 4.1. Obtener Carrito
Obtiene el carrito completo del usuario autenticado con todos los productos agregados.

- **Method:** `GET`
- **Endpoint:** `/api/cart`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### Success Response (200)
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
          "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
          "status": "active"
        },
        "items": [
          {
            "id": 1,
            "product": {
              "id": 1,
              "name": "Pizza Margherita",
              "description": "Salsa de tomate, mozzarella fresca y albahaca",
              "imageUrl": "https://example.com/products/margherita.jpg",
              "price": 180.00,
              "isAvailable": true,
              "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana"
              }
            },
            "quantity": 2,
            "priceAtAdd": 220.00,
            "subtotal": 440.00,
            "modifiers": [
              {
                "id": 27,
                "name": "Orilla Rellena de Queso",
                "price": 20.00,
                "group": {
                  "id": 2,
                  "name": "Extras"
                }
              },
              {
                "id": 5,
                "name": "Extra Queso",
                "price": 20.00,
                "group": {
                  "id": 2,
                  "name": "Extras"
                }
              }
            ],
            "createdAt": "2024-01-15T10:30:00.000Z",
            "updatedAt": "2024-01-15T10:30:00.000Z"
          }
        ],
        "totals": {
          "subtotal": 440.00,
          "deliveryFee": 25.00,
          "total": 465.00
        },
        "itemCount": 1,
        "totalQuantity": 2,
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "summary": {
      "totalCarts": 1,
      "totalItems": 1,
      "grandTotal": 385.00
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4.2. Agregar al Carrito
Agrega un producto al carrito del usuario autenticado.

- **Method:** `POST`
- **Endpoint:** `/api/cart/add`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "productId": "integer // ID del producto a agregar",
  "quantity": "integer // Cantidad a agregar (opcional, default: 1, máximo: 99)",
  "modifierOptionIds": "array // Array de IDs de opciones de modificadores (opcional)"
}
```

**📝 Ejemplo de uso básico:**
```json
{
  "productId": 1,
  "quantity": 2
}
```

**📝 Ejemplo con modificadores:**
```json
{
  "productId": 1,
  "quantity": 1,
  "modifierOptionIds": [27, 5]
}
```

**Nota:** Los modificadores se aplican directamente en el carrito. El sistema maneja inteligentemente los items:
- **Productos sin modificadores**: Si ya existe en el carrito, incrementa la cantidad
- **Productos con modificadores**: Solo incrementa cantidad si tiene exactamente los mismos modificadores, de lo contrario crea un item separado

#### Success Response (201) - Item Agregado
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
        "description": "Salsa de tomate, mozzarella fresca y albahaca",
        "imageUrl": "https://example.com/products/margherita.jpg",
        "price": 180.00,
        "isAvailable": true
      },
      "quantity": 1,
      "priceAtAdd": 220.00,
      "subtotal": 220.00,
      "modifiers": [
        {
          "id": 27,
          "name": "Orilla Rellena de Queso",
          "price": 20.00,
          "group": {
            "id": 2,
            "name": "Extras"
          }
        },
        {
          "id": 5,
          "name": "Extra Queso",
          "price": 20.00,
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

#### Success Response (200) - Cantidad Actualizada
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
        "description": "Salsa de tomate, mozzarella fresca y albahaca",
        "imageUrl": "https://example.com/products/margherita.jpg",
        "price": 180.00,
        "isAvailable": true
      },
      "quantity": 3,
      "priceAtAdd": 220.00,
      "subtotal": 660.00,
      "modifiers": [
        {
          "id": 27,
          "name": "Orilla Rellena de Queso",
          "price": 20.00,
          "group": {
            "id": 2,
            "name": "Extras"
          }
        },
        {
          "id": 5,
          "name": "Extra Queso",
          "price": 20.00,
          "group": {
            "id": 2,
            "name": "Extras"
          }
        }
      ]
    },
    "action": "quantity_updated"
  }
}
```


#### Error Responses
**404 - Producto no encontrado**
```json
{
  "status": "error",
  "message": "Producto no encontrado",
  "code": "PRODUCT_NOT_FOUND"
}
```

**400 - Producto no disponible**
```json
{
  "status": "error",
  "message": "El producto no está disponible",
  "code": "PRODUCT_UNAVAILABLE"
}
```

---

### 4.3. Resumen del Carrito
Obtiene un resumen rápido del carrito con conteos y totales.

- **Method:** `GET`
- **Endpoint:** `/api/cart/summary`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Resumen del carrito obtenido exitosamente",
  "data": {
    "summary": {
      "totalCarts": 1,
      "activeRestaurants": 1,
      "totalItems": 2,
      "totalQuantity": 3,
      "subtotal": 540.00,
      "estimatedDeliveryFee": 25.00,
      "estimatedTotal": 565.00
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4.4. Actualizar Item del Carrito
Actualiza la cantidad de un item específico en el carrito.

- **Method:** `PUT`
- **Endpoint:** `/api/cart/update/:itemId`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### URL Parameters
- `itemId` (integer): ID del item del carrito a actualizar

#### Request Body (JSON)
```json
{
  "quantity": "integer // Nueva cantidad (0 para eliminar, máximo: 99)"
}
```

#### Success Response (200)
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
        "description": "Salsa de tomate, mozzarella fresca y albahaca",
        "imageUrl": "https://example.com/products/margherita.jpg",
        "price": 180.00,
        "isAvailable": true
      },
      "quantity": 2,
      "priceAtAdd": 180.00,
      "subtotal": 360.00
    },
    "action": "quantity_updated"
  }
}
```

#### Success Response (200) - Item eliminado
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

---

### 4.5. Eliminar Item del Carrito
Elimina un item específico del carrito.

- **Method:** `DELETE`
- **Endpoint:** `/api/cart/remove/:itemId`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `itemId` (integer): ID del item del carrito a eliminar

#### Success Response (200)
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

---

### 4.6. Limpiar Carrito
Limpia el carrito completo o de un restaurante específico.

- **Method:** `DELETE`
- **Endpoint:** `/api/cart/clear`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `restaurantId` (opcional): ID del restaurante (si no se especifica, limpia todos los carritos)

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Todos los carritos limpiados exitosamente",
  "data": {
    "deletedCarts": 2,
    "deletedItems": 5,
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      {
        "id": 2,
        "name": "Sushi Master Kenji"
      }
    ],
    "action": "cart_cleared"
  }
}
```

---

## 💳 5. Proceso de Pedido y Pago

### 5.1. Crear Preferencia de Pago (Mercado Pago)
Crea una preferencia de pago en Mercado Pago para procesar el pedido.

- **Method:** `POST`
- **Endpoint:** `/api/checkout/create-preference`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "addressId": "integer // ID de la dirección de entrega",
  "items": [
    {
      "productId": "integer // ID del producto",
      "quantity": "integer // Cantidad del producto",
      "modifierOptions": [
        {
          "modifierGroupId": "integer // ID del grupo de modificadores",
          "optionId": "integer // ID de la opción seleccionada"
        }
      ]
    }
  ],
  "specialInstructions": "string // Instrucciones especiales (opcional, máximo 500 caracteres)",
  "useCart": "boolean // Usar carrito en lugar de items (opcional)",
  "restaurantId": "integer // ID del restaurante (requerido si useCart es true)"
}
```

**📝 Ejemplo con Modificadores:**
```json
{
  "addressId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "modifierOptions": [
        {
          "modifierGroupId": 1,
          "optionId": 27
        },
        {
          "modifierGroupId": 2,
          "optionId": 5
        }
      ]
    }
  ],
  "specialInstructions": "Sin cebolla"
}
```

**Nota:** Los modificadores se aplican durante el checkout, no en el carrito. El carrito solo almacena productos básicos.

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Preferencia de pago creada exitosamente",
  "data": {
    "init_point": "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=123456789",
    "preference_id": "123456789",
    "external_reference": "delixmi_uuid-12345",
    "total": 385.00,
    "subtotal": 360.00,
    "delivery_fee": 25.00,
    "service_fee": 18.00,
    "delivery_details": {
      "distance": 2.5,
      "duration": 15,
      "distanceText": "2.5 km",
      "durationText": "15 min",
      "calculation": {
        "baseFee": 20.00,
        "distanceFee": 5.00,
        "tarifaFinal": 25.00
      },
      "isDefault": false,
      "estimatedDeliveryTime": {
        "timeRange": "35-45 min",
        "minMinutes": 35,
        "maxMinutes": 45,
        "preparationTime": {
          "base": 20,
          "adjustment": 0,
          "total": 20
        },
        "travelTime": 15,
        "estimatedDeliveryAt": "2024-01-15T11:15:00.000Z",
        "breakdown": {
          "preparation": "20 min",
          "travel": "15 min",
          "buffer": "10 min",
          "total": "35-45 min"
        }
      }
    },
    "estimated_delivery_time": {
      "timeRange": "35-45 min",
      "estimatedDeliveryAt": "2024-01-15T11:15:00.000Z"
    },
    "cart_used": false,
    "cart_cleared": false,
    "cart_clearing_note": "El carrito se limpiará cuando el pago sea confirmado"
  }
}
```

#### Error Responses
**409 - Restaurante cerrado**
```json
{
  "status": "error",
  "message": "El restaurante está cerrado en este momento. Horario de hoy: 09:00:00 a 22:00:00"
}
```

---

### 5.2. Crear Orden de Pago en Efectivo
Crea una orden de pago en efectivo que se pagará al momento de la entrega.

- **Method:** `POST`
- **Endpoint:** `/api/checkout/cash-order`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
Content-Type: application/json
```

#### Request Body (JSON)
```json
{
  "addressId": "integer // ID de la dirección de entrega",
  "items": [
    {
      "productId": "integer // ID del producto",
      "quantity": "integer // Cantidad del producto",
      "modifierOptions": [
        {
          "modifierGroupId": "integer // ID del grupo de modificadores",
          "optionId": "integer // ID de la opción seleccionada"
        }
      ]
    }
  ],
  "specialInstructions": "string // Instrucciones especiales (opcional, máximo 500 caracteres)"
}
```

**📝 Ejemplo con Modificadores:**
```json
{
  "addressId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 1,
      "modifierOptions": [
        {
          "modifierGroupId": 1,
          "optionId": 27
        },
        {
          "modifierGroupId": 2,
          "optionId": 5
        }
      ]
    }
  ],
  "specialInstructions": "Sin cebolla"
}
```

**Nota:** Los modificadores se aplican durante el checkout, no en el carrito. El carrito solo almacena productos básicos.

#### Success Response (201)
```json
{
  "status": "success",
  "message": "Orden de pago en efectivo creada exitosamente",
  "data": {
    "order": {
      "id": 1,
      "status": "pending",
      "subtotal": 360.00,
      "deliveryFee": 25.00,
      "serviceFee": 18.00,
      "total": 403.00,
      "paymentMethod": "cash",
      "paymentStatus": "pending",
      "estimatedDeliveryTime": {
        "timeRange": "35-45 min",
        "estimatedDeliveryAt": "2024-01-15T11:15:00.000Z"
      },
      "deliveryDetails": {
        "distance": 2.5,
        "duration": 15,
        "distanceText": "2.5 km",
        "durationText": "15 min",
        "estimatedDeliveryTime": {
          "timeRange": "35-45 min",
          "estimatedDeliveryAt": "2024-01-15T11:15:00.000Z"
        }
      },
      "items": [
        {
          "productId": 1,
          "quantity": 2,
          "pricePerUnit": 180.00,
          "total": 360.00
        }
      ],
      "orderPlacedAt": "2024-01-15T10:30:00.000Z"
    },
    "payment": {
      "id": 1,
      "amount": 403.00,
      "currency": "MXN",
      "provider": "cash",
      "status": "pending"
    },
    "cartCleared": true,
    "message": "Carrito del restaurante limpiado automáticamente"
  }
}
```

---

### 5.3. Estado del Pago
Obtiene el estado actual de un pago específico.

- **Method:** `GET`
- **Endpoint:** `/api/checkout/payment-status/:paymentId`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `paymentId` (string): ID del pago (puede ser external_reference de Mercado Pago)

#### Success Response (200)
```json
{
  "status": "success",
  "data": {
    "payment": {
      "id": 1,
      "amount": 385.00,
      "currency": "MXN",
      "status": "approved",
      "provider": "mercadopago",
      "providerPaymentId": "delixmi_uuid-12345",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "order": {
      "id": 1,
      "status": "confirmed",
      "subtotal": 360.00,
      "deliveryFee": 25.00,
      "total": 385.00,
      "specialInstructions": "Llamar antes de llegar",
      "orderPlacedAt": "2024-01-15T10:30:00.000Z",
      "items": [
        {
          "productName": "Pizza Margherita",
          "quantity": 2,
          "pricePerUnit": 180.00,
          "restaurant": "Pizzería de Ana"
        }
      ],
      "address": {
        "id": 1,
        "alias": "Casa",
        "street": "Calle Reforma",
        "exteriorNumber": "123",
        "neighborhood": "Centro",
        "city": "Ciudad de México",
        "state": "CDMX",
        "zipCode": "06000"
      }
    }
  }
}
```

---

## 📦 6. Seguimiento de Pedidos

### 6.1. Historial de Pedidos
Obtiene el historial de pedidos del cliente autenticado con paginación.

- **Method:** `GET`
- **Endpoint:** `/api/customer/orders`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `status` (opcional): Filtrar por estado del pedido
- `page` (opcional): Número de página (default: 1)
- `pageSize` (opcional): Tamaño de página (default: 10, máximo: 100)

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Historial de pedidos obtenido exitosamente",
  "data": {
    "orders": [
      {
        "id": "1",
        "status": "delivered",
        "subtotal": 360.00,
        "deliveryFee": 25.00,
        "total": 385.00,
        "paymentMethod": "mercadopago",
        "paymentStatus": "approved",
        "specialInstructions": "Llamar antes de llegar",
        "orderPlacedAt": "2024-01-15T10:30:00.000Z",
        "orderDeliveredAt": "2024-01-15T11:15:00.000Z",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T11:15:00.000Z",
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana",
          "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
          "branch": {
            "id": 1,
            "name": "Centro",
            "address": "Av. Principal 123, Centro",
            "phone": "+525512345678"
          }
        },
        "deliveryAddress": {
          "id": 1,
          "alias": "Casa",
          "street": "Calle Reforma",
          "exteriorNumber": "123",
          "interiorNumber": "A",
          "neighborhood": "Centro",
          "city": "Ciudad de México",
          "state": "CDMX",
          "zipCode": "06000",
          "references": "Edificio azul, portón negro"
        },
        "deliveryDriver": {
          "id": 1,
          "name": "Miguel",
          "lastname": "Hernández",
          "phone": "+525598765432"
        },
        "items": [
          {
            "id": "1",
            "quantity": 2,
            "pricePerUnit": 180.00,
            "subtotal": 360.00,
            "product": {
              "id": 1,
              "name": "Pizza Margherita",
              "imageUrl": "https://example.com/products/margherita.jpg"
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
      "status": null
    },
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 6.2. Detalle de Pedido
Obtiene los detalles completos de un pedido específico del cliente autenticado.

- **Method:** `GET`
- **Endpoint:** `/api/customer/orders/:orderId`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `orderId` (string): ID del pedido (puede ser ID numérico o external_reference)

#### Success Response (200)
```json
{
  "status": "success",
  "message": "Detalles del pedido obtenidos exitosamente",
  "data": {
    "order": {
      "id": "1",
      "orderNumber": "DEL-000001",
      "status": "out_for_delivery",
      "paymentMethod": "mercadopago",
      "paymentStatus": "approved",
      "subtotal": 360.00,
      "deliveryFee": 25.00,
      "serviceFee": 18.00,
      "total": 403.00,
      "specialInstructions": "Llamar antes de llegar",
      "orderPlacedAt": "2024-01-15T10:30:00.000Z",
      "orderDeliveredAt": null,
      "estimatedDeliveryTime": {
        "timeRange": "30-45 min",
        "estimatedDeliveryAt": "2024-01-15T11:15:00.000Z"
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana",
        "logoUrl": "https://example.com/logos/pizzeria-ana.jpg",
        "branch": {
          "id": 1,
          "name": "Centro",
          "address": "Av. Principal 123, Centro",
          "phone": "+525512345678"
        }
      },
      "deliveryAddress": {
        "id": 1,
        "alias": "Casa",
        "street": "Calle Reforma",
        "exteriorNumber": "123",
        "interiorNumber": "A",
        "neighborhood": "Centro",
        "city": "Ciudad de México",
        "state": "CDMX",
        "zipCode": "06000",
        "references": "Edificio azul, portón negro",
        "latitude": 19.4326,
        "longitude": -99.1332
      },
      "deliveryDriver": {
        "id": 1,
        "name": "Miguel",
        "lastname": "Hernández",
        "phone": "+525598765432"
      },
      "items": [
        {
          "id": "1",
          "quantity": 2,
          "pricePerUnit": 180.00,
          "subtotal": 360.00,
          "product": {
            "id": 1,
            "name": "Pizza Margherita",
            "imageUrl": "https://example.com/products/margherita.jpg",
            "description": "Salsa de tomate, mozzarella fresca y albahaca"
          }
        }
      ],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    },
    "retrievedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 6.3. Ubicación del Repartidor
Obtiene la ubicación en tiempo real del repartidor para un pedido específico.

- **Method:** `GET`
- **Endpoint:** `/api/customer/orders/:orderId/location`
- **Rol Requerido:** `customer`

#### Headers
```
Authorization: Bearer <tu_token_jwt>
```

#### URL Parameters
- `orderId` (integer): ID del pedido

#### Success Response (200) - Tracking disponible
```json
{
  "status": "success",
  "message": "Ubicación del repartidor obtenida exitosamente",
  "data": {
    "order": {
      "id": "1",
      "status": "out_for_delivery",
      "stage": "tracking_available",
      "message": "Tu pedido está en camino. Puedes seguir su ubicación en tiempo real.",
      "specialInstructions": "Llamar antes de llegar"
    },
    "tracking": {
      "isTrackingAvailable": true,
      "location": {
        "latitude": 19.4326,
        "longitude": -99.1332,
        "lastUpdated": "2024-01-15T11:00:00.000Z",
        "isRecent": true,
        "timeSinceLastUpdate": 300000,
        "timeSinceLastUpdateFormatted": "5m"
      }
    },
    "driver": {
      "id": 1,
      "name": "Miguel",
      "lastname": "Hernández",
      "phone": "+525598765432",
      "status": "active"
    },
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    },
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "branch": {
        "id": 1,
        "name": "Centro",
        "address": "Av. Principal 123, Centro"
      }
    },
    "deliveryInfo": {
      "orderPlacedAt": "2024-01-15T10:30:00.000Z",
      "estimatedDeliveryTime": null,
      "deliveryInstructions": null
    },
    "retrievedAt": "2024-01-15T11:05:00.000Z"
  }
}
```

#### Success Response (200) - Sin repartidor asignado
```json
{
  "status": "success",
  "message": "El pedido aún no ha sido asignado a un repartidor",
  "data": {
    "order": {
      "id": "1",
      "status": "preparing",
      "stage": "waiting_for_driver_assignment",
      "message": "Tu pedido está siendo preparado. Te notificaremos cuando un repartidor sea asignado.",
      "specialInstructions": "Llamar antes de llegar"
    },
    "tracking": {
      "isTrackingAvailable": false,
      "reason": "no_driver_assigned"
    },
    "customer": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez"
    },
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "branch": {
        "id": 1,
        "name": "Centro",
        "address": "Av. Principal 123, Centro"
      }
    },
    "retrievedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

---

## 🔧 Códigos de Error Comunes

### Códigos de Estado HTTP
- **200**: Operación exitosa
- **201**: Recurso creado exitosamente
- **400**: Datos de entrada inválidos
- **401**: No autenticado (token inválido o faltante)
- **403**: Acceso denegado (rol insuficiente o cuenta no verificada)
- **404**: Recurso no encontrado
- **409**: Conflicto (recurso ya existe o no se puede procesar)
- **500**: Error interno del servidor

### Códigos de Error Específicos
- **USER_EXISTS**: Usuario ya existe con ese email/teléfono
- **INVALID_CREDENTIALS**: Credenciales de login inválidas
- **ACCOUNT_NOT_VERIFIED**: Cuenta no verificada por email
- **PRODUCT_NOT_FOUND**: Producto no encontrado
- **PRODUCT_UNAVAILABLE**: Producto no disponible
- **RESTAURANT_INACTIVE**: Restaurante no activo
- **ADDRESS_ALIAS_EXISTS**: Alias de dirección ya existe
- **ADDRESS_IN_USE**: Dirección en uso en pedidos
- **CART_ITEM_NOT_FOUND**: Item del carrito no encontrado
- **ORDER_NOT_FOUND_OR_NO_PERMISSION**: Pedido no encontrado o sin permisos

---

## 🍕 Sistema de Modificadores de Productos

### ¿Cómo Funcionan los Modificadores?

Los modificadores permiten personalizar productos (como pizzas, sushi, etc.) con opciones adicionales como:
- **Tamaños**: Pequeña, Mediana, Grande
- **Extras**: Queso extra, Orilla rellena, etc.
- **Sin ingredientes**: Sin cebolla, Sin champiñones, etc.
- **Niveles de picante**: Suave, Medio, Picante

### 📋 Flujo de Personalización

1. **Exploración**: El cliente ve los productos disponibles con sus modificadores posibles
2. **Selección**: Al agregar al carrito, el cliente selecciona las opciones de personalización
3. **Almacenamiento**: El sistema guarda la combinación producto + modificadores como un item único
4. **Procesamiento**: Los modificadores se incluyen en el precio del item del carrito

### ✅ Funcionalidades Actuales

- **El carrito SÍ soporta modificadores**: Los modificadores se aplican directamente al agregar productos
- **Cada combinación es un item separado**: Producto + modificadores = item único en el carrito
- **Precios dinámicos**: Los modificadores se incluyen en el precio del item del carrito
- **Validación automática**: Solo se permiten modificadores válidos para cada producto

### 💡 Ejemplo Práctico

**Producto**: Pizza Hawaiana (ID: 1)
**Modificadores disponibles**:
- Grupo "Tamaño" (ID: 1): Pequeña (ID: 1), Mediana (ID: 2), Grande (ID: 3)
- Grupo "Extras" (ID: 2): Orilla Rellena (ID: 27), Queso Extra (ID: 5)

**Agregar al carrito con personalización**:
```json
{
  "productId": 1,
  "quantity": 1,
  "modifierOptionIds": [3, 27]
}
```

**Resultado en el carrito**:
```json
{
  "id": 1,
  "product": {
    "id": 1,
    "name": "Pizza Hawaiana",
    "price": 200.00
  },
  "quantity": 1,
  "priceAtAdd": 240.00,
  "subtotal": 240.00,
  "modifiers": [
    {
      "id": 3,
      "name": "Grande",
      "price": 20.00,
      "group": { "id": 1, "name": "Tamaño" }
    },
    {
      "id": 27,
      "name": "Orilla Rellena de Queso",
      "price": 20.00,
      "group": { "id": 2, "name": "Extras" }
    }
  ]
}
```

---

## 📝 Notas Importantes

### Autenticación
- Todos los endpoints protegidos requieren el header `Authorization: Bearer <token>`
- Los tokens JWT tienen una duración de 24 horas por defecto
- El token debe obtenerse mediante el endpoint de login

### Paginación
- Los endpoints que soportan paginación usan `page` y `pageSize`
- `page` comienza en 1
- `pageSize` máximo es 100
- La respuesta incluye información de paginación en el objeto `pagination`

### Zona Horaria
- Todos los horarios se manejan en zona horaria de México (UTC-6)
- El campo `isOpen` se calcula dinámicamente basado en el horario actual
- Los horarios nocturnos (que cruzan medianoche) se manejan correctamente

### Carrito
- Un usuario puede tener múltiples carritos (uno por restaurante)
- Los productos de diferentes restaurantes no pueden estar en el mismo carrito
- El carrito se limpia automáticamente al confirmar un pedido

### Pagos
- Se soportan dos métodos: Mercado Pago (online) y efectivo (contra entrega)
- Los pagos en efectivo se confirman automáticamente
- Los pagos de Mercado Pago requieren confirmación via webhook

### Tracking
- La ubicación del repartidor solo está disponible cuando el pedido está "en camino"
- La ubicación se actualiza cada 5 minutos aproximadamente
- Si no hay ubicación reciente, se indica en la respuesta

---

*Documentación generada para Delixmi API v1.0 - Panel del Cliente*
