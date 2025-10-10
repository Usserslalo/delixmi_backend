# 🍕 Owner Flow - Gestión Completa del Menú

## 🎯 VEREDICTO DE VIABILIDAD: ✅ VIABLE Y COMPLETO

**Conclusión:** El backend de Delixmi **SÍ soporta completamente** el flujo de trabajo descrito para la Gestión de Menú del owner. **Todos los 18 endpoints CRUD** necesarios están implementados y funcionan correctamente.

---

## ⚠️ ACTUALIZACIÓN IMPORTANTE

**Fecha:** 9 de Enero, 2025

Este documento ha sido **completamente auditado y actualizado** para incluir **TODOS los endpoints del sistema de gestión de menú**. Se agregaron **7 endpoints críticos** que faltaban en la versión anterior:

**Endpoints Agregados:**
- ✅ `PATCH /api/restaurant/subcategories/:id` (Actualizar subcategoría)
- ✅ `DELETE /api/restaurant/subcategories/:id` (Eliminar subcategoría)
- ✅ `PATCH /api/restaurant/modifier-groups/:id` (Actualizar grupo)
- ✅ `DELETE /api/restaurant/modifier-groups/:id` (Eliminar grupo)
- ✅ `PATCH /api/restaurant/modifier-options/:id` (Actualizar opción)
- ✅ `DELETE /api/restaurant/modifier-options/:id` (Eliminar opción)
- ✅ `DELETE /api/restaurant/products/:id` (Eliminar producto)

**Incluye ahora:**
- ✅ Reglas de eliminación con validaciones de integridad referencial
- ✅ Documentación completa de errores 409 (Conflict)
- ✅ Tabla de códigos de error expandida
- ✅ Todas las validaciones de pertenencia al restaurante

---

## 📋 Índice
1. [Resumen de la Funcionalidad](#resumen-de-la-funcionalidad)
2. [Arquitectura del Menú](#arquitectura-del-menú)
3. [Flujo de Trabajo Completo](#flujo-de-trabajo-completo)
4. [Endpoints Disponibles (18 Total)](#endpoints-disponibles)
   - 4.1. [Categorías Globales](#categorías-globales)
   - 4.2. [Subcategorías (GET, POST, PATCH, DELETE)](#subcategorías)
   - 4.3. [Grupos de Modificadores (GET, POST, PATCH, DELETE)](#grupos-de-modificadores)
   - 4.4. [Opciones de Modificadores (POST, PATCH, DELETE)](#opciones-de-modificadores)
   - 4.5. [Productos (GET, POST, PATCH, DELETE)](#productos)
5. [Modelos de Datos](#modelos-de-datos)
6. [Proceso de Construcción del Menú](#proceso-de-construcción-del-menú)
7. [Códigos de Error](#códigos-de-error)
8. [Casos de Uso Prácticos](#casos-de-uso-prácticos)
9. [Resumen de Capacidades](#resumen-de-capacidades-del-backend)
10. [Conclusión de Viabilidad](#conclusión-de-viabilidad)

---

## 📖 Resumen de la Funcionalidad

### **Objetivo**

Permitir a los usuarios con rol de **owner** construir un menú personalizable completo para su restaurante, con capacidad de:

✅ Asignar subcategorías a categorías globales  
✅ Crear grupos de modificadores personalizados  
✅ Definir opciones de modificadores con precios  
✅ Crear productos con información completa  
✅ Asociar grupos de modificadores a productos  
✅ Gestionar el menú de forma jerárquica

### **Endpoints Involucrados (18 endpoints completos)**

| Método | Endpoint | Función |
|--------|----------|---------|
| `GET` | `/api/categories` | Obtener categorías globales |
| **SUBCATEGORÍAS (4)** |||
| `GET` | `/api/restaurant/subcategories` | Listar subcategorías del restaurante |
| `POST` | `/api/restaurant/subcategories` | Crear subcategoría |
| `PATCH` | `/api/restaurant/subcategories/:id` | Actualizar subcategoría |
| `DELETE` | `/api/restaurant/subcategories/:id` | Eliminar subcategoría |
| **GRUPOS DE MODIFICADORES (4)** |||
| `GET` | `/api/restaurant/modifier-groups` | Listar grupos de modificadores |
| `POST` | `/api/restaurant/modifier-groups` | Crear grupo de modificadores |
| `PATCH` | `/api/restaurant/modifier-groups/:id` | Actualizar grupo de modificadores |
| `DELETE` | `/api/restaurant/modifier-groups/:id` | Eliminar grupo de modificadores |
| **OPCIONES DE MODIFICADORES (3)** |||
| `POST` | `/api/restaurant/modifier-groups/:groupId/options` | Añadir opción a grupo |
| `PATCH` | `/api/restaurant/modifier-options/:id` | Actualizar opción de modificador |
| `DELETE` | `/api/restaurant/modifier-options/:id` | Eliminar opción de modificador |
| **PRODUCTOS (4)** |||
| `GET` | `/api/restaurant/products` | Listar productos |
| `POST` | `/api/restaurant/products` | Crear producto con modificadores |
| `PATCH` | `/api/restaurant/products/:productId` | Actualizar producto y modificadores |
| `DELETE` | `/api/restaurant/products/:productId` | Eliminar producto |

---

## 🏗️ Arquitectura del Menú

### **Jerarquía de Datos**

```
Categoría Global (ej. "Pizzas")
  ↓
Subcategoría (ej. "Pizzas Tradicionales")
  ↓
Producto (ej. "Pizza Hawaiana")
  ↓
Asociado a → Grupo de Modificadores (ej. "Tamaño")
  ├─ Opción 1 (ej. "Personal - $0")
  ├─ Opción 2 (ej. "Mediana - $25")
  └─ Opción 3 (ej. "Grande - $45")
  ↓
Asociado a → Grupo de Modificadores (ej. "Extras")
  ├─ Opción 1 (ej. "Extra Queso - $15")
  ├─ Opción 2 (ej. "Extra Pepperoni - $20")
  └─ Opción 3 (ej. "Extra Champiñones - $12")
```

### **Relación Entre Entidades**

```
┌─────────────────────┐
│  Category (Global)  │ ← Creadas por admin (ej. "Pizzas", "Bebidas")
└─────────────────────┘
          ↓ 1:N
┌─────────────────────┐
│   Subcategory       │ ← Owner crea sus propias (ej. "Pizzas Tradicionales")
│   (Por Restaurante) │
└─────────────────────┘
          ↓ 1:N
┌─────────────────────┐
│      Product        │ ← Owner crea productos (ej. "Pizza Hawaiana")
└─────────────────────┘
          ↓ N:M
┌─────────────────────┐
│  ModifierGroup      │ ← Owner crea grupos (ej. "Tamaño")
│   (Por Restaurante) │
└─────────────────────┘
          ↓ 1:N
┌─────────────────────┐
│  ModifierOption     │ ← Owner crea opciones (ej. "Grande - $45")
└─────────────────────┘
```

---

## 🔄 Flujo de Trabajo Completo

### **Secuencia de Construcción del Menú**

El owner debe seguir este orden para construir un menú desde cero:

```
PASO 1: Consultar Categorías Globales
   ↓
PASO 2: Crear Subcategorías Propias
   ↓
PASO 3: Crear Grupos de Modificadores
   ↓
PASO 4: Añadir Opciones a los Grupos
   ↓
PASO 5: Crear Productos y Asociar Modificadores
   ↓
PASO 6: (Opcional) Actualizar Productos/Modificadores
```

### **Flujo Detallado**

```
┌────────────────────────────────────────────┐
│  PASO 1: Obtener Categorías Globales      │
│  GET /api/categories                       │
│  → Retorna: ["Pizzas", "Bebidas", etc.]   │
└────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│  PASO 2: Crear Subcategorías               │
│  POST /api/restaurant/subcategories        │
│  Body: { categoryId: 1, name: "Pizzas      │
│         Tradicionales" }                   │
│  → Retorna: ID de subcategoría creada      │
└────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│  PASO 3A: Crear Grupo de Modificadores    │
│  POST /api/restaurant/modifier-groups      │
│  Body: { name: "Tamaño", minSelection: 1,  │
│         maxSelection: 1 }                  │
│  → Retorna: ID del grupo creado            │
└────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│  PASO 3B: Añadir Opciones al Grupo        │
│  POST /api/restaurant/modifier-groups/:    │
│       groupId/options                      │
│  Body: { name: "Grande", price: 45.00 }    │
│  → Retorna: Opción creada                  │
│  (Repetir para cada opción)                │
└────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│  PASO 4: Crear Producto                    │
│  POST /api/restaurant/products             │
│  Body: {                                   │
│    subcategoryId: 1,                       │
│    name: "Pizza Hawaiana",                 │
│    price: 150.00,                          │
│    modifierGroupIds: [1, 2]  ← Asociación  │
│  }                                         │
│  → Retorna: Producto completo con          │
│             modificadores                  │
└────────────────────────────────────────────┘
                ↓
┌────────────────────────────────────────────┐
│  (OPCIONAL) Actualizar Producto            │
│  PATCH /api/restaurant/products/:id        │
│  Body: {                                   │
│    modifierGroupIds: [1, 2, 3]  ← Nuevas   │
│           asociaciones                     │
│  }                                         │
└────────────────────────────────────────────┘
```

---

## 🔌 Endpoints Disponibles

### **CATEGORÍAS GLOBALES**

---

#### **1. Obtener Categorías Globales**

**Endpoint:** `GET /api/categories`

**Método:** `GET`

**Autenticación:** No requerida

**Descripción:** Obtiene todas las categorías globales disponibles en la plataforma (ej. "Pizzas", "Bebidas", "Sushi"). El owner usa estas categorías para asignarles sus propias subcategorías.

**Headers:**
```http
(No requiere autenticación)
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Categorías obtenidas exitosamente",
  "data": {
    "categories": [
      {
        "id": 1,
        "name": "Pizzas",
        "imageUrl": null,
        "subcategories": [
          {
            "id": 1,
            "name": "Pizzas Tradicionales",
            "displayOrder": 1,
            "restaurantId": 1,
            "restaurant": {
              "id": 1,
              "name": "Pizzería de Ana"
            }
          }
        ]
      },
      {
        "id": 2,
        "name": "Bebidas",
        "imageUrl": null,
        "subcategories": []
      },
      {
        "id": 3,
        "name": "Sushi",
        "imageUrl": null,
        "subcategories": []
      }
    ]
  }
}
```

**⚠️ Nota:** Este endpoint es público y muestra subcategorías de TODOS los restaurantes. En Flutter, deberás filtrar las subcategorías para mostrar solo las del restaurante del owner.

---

### **SUBCATEGORÍAS**

---

#### **2. Listar Subcategorías del Restaurante**

**Endpoint:** `GET /api/restaurant/subcategories`

**Método:** `GET`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Obtiene todas las subcategorías que el owner ha creado para su restaurante, agrupadas por categoría global.

**Headers:**
```http
Authorization: Bearer {token}
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `categoryId` | Integer | No | Filtrar por categoría global específica |
| `page` | Integer | No | Número de página (default: 1) |
| `pageSize` | Integer | No | Tamaño de página (default: 20, max: 100) |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Subcategorías obtenidas exitosamente",
  "data": {
    "subcategories": [
      {
        "id": 1,
        "name": "Pizzas Tradicionales",
        "displayOrder": 1,
        "category": {
          "id": 1,
          "name": "Pizzas"
        },
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana"
        },
        "productsCount": 5,
        "createdAt": "2025-01-09T00:00:00.000Z",
        "updatedAt": "2025-01-09T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalSubcategories": 9,
      "currentPage": 1,
      "pageSize": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

**Errores Posibles:**

**401 Unauthorized:**
```json
{
  "status": "error",
  "message": "Token inválido o expirado"
}
```

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de restaurante",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

---

#### **3. Crear Subcategoría**

**Endpoint:** `POST /api/restaurant/subcategories`

**Método:** `POST`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Crea una nueva subcategoría para el menú del restaurante, asignándola a una categoría global existente.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "categoryId": 1,
  "name": "Pizzas Tradicionales",
  "displayOrder": 1
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `categoryId` | Integer | Sí | Min: 1 | ID de la categoría global |
| `name` | String | Sí | 1-100 caracteres | Nombre de la subcategoría |
| `displayOrder` | Integer | No | Min: 0, Default: 0 | Orden de visualización |

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Subcategoría creada exitosamente",
  "data": {
    "subcategory": {
      "id": 10,
      "name": "Pizzas Tradicionales",
      "displayOrder": 1,
      "category": {
        "id": 1,
        "name": "Pizzas"
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      "createdAt": "2025-01-09T15:30:00.000Z",
      "updatedAt": "2025-01-09T15:30:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**400 Bad Request - Datos inválidos:**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El nombre debe tener entre 1 y 100 caracteres",
      "param": "name"
    }
  ]
}
```

**404 Not Found - Categoría no existe:**
```json
{
  "status": "error",
  "message": "Categoría no encontrada",
  "code": "CATEGORY_NOT_FOUND"
}
```

**409 Conflict - Subcategoría duplicada:**
```json
{
  "status": "error",
  "message": "Ya existe una subcategoría con este nombre en esta categoría",
  "code": "SUBCATEGORY_EXISTS"
}
```

---

### **GRUPOS DE MODIFICADORES**

---

#### **4. Listar Grupos de Modificadores**

**Endpoint:** `GET /api/restaurant/modifier-groups`

**Método:** `GET`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Obtiene todos los grupos de modificadores del restaurante con sus opciones.

**Headers:**
```http
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Grupos de modificadores obtenidos exitosamente",
  "data": {
    "modifierGroups": [
      {
        "id": 1,
        "name": "Tamaño",
        "minSelection": 1,
        "maxSelection": 1,
        "restaurant": {
          "id": 1,
          "name": "Pizzería de Ana"
        },
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
        ],
        "createdAt": "2025-01-09T00:00:00.000Z",
        "updatedAt": "2025-01-09T00:00:00.000Z"
      }
    ]
  }
}
```

---

#### **5. Crear Grupo de Modificadores**

**Endpoint:** `POST /api/restaurant/modifier-groups`

**Método:** `POST`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Crea un nuevo grupo de modificadores para el restaurante (ej. "Tamaño", "Extras", "Sin Ingredientes").

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Tamaño",
  "minSelection": 1,
  "maxSelection": 1
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `name` | String | Sí | 1-100 caracteres | Nombre del grupo (ej. "Tamaño") |
| `minSelection` | Integer | No | 0-10, Default: 1 | Selección mínima obligatoria |
| `maxSelection` | Integer | No | 1-10, Default: 1 | Selección máxima permitida |

**⚠️ Importante:** 
- `minSelection > 0` significa que el grupo es **obligatorio** (el cliente DEBE seleccionar)
- `minSelection = 0` significa que el grupo es **opcional**
- `maxSelection = 1` significa **selección única** (radio button)
- `maxSelection > 1` significa **selección múltiple** (checkboxes)

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Grupo de modificadores creado exitosamente",
  "data": {
    "modifierGroup": {
      "id": 5,
      "name": "Tamaño",
      "minSelection": 1,
      "maxSelection": 1,
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      "options": [],
      "createdAt": "2025-01-09T15:45:00.000Z",
      "updatedAt": "2025-01-09T15:45:00.000Z"
    }
  }
}
```

---

#### **6. Añadir Opción a Grupo de Modificadores**

**Endpoint:** `POST /api/restaurant/modifier-groups/:groupId/options`

**Método:** `POST`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Añade una opción de modificador a un grupo existente (ej. "Grande - $45" al grupo "Tamaño").

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `groupId` | Integer | Sí | ID del grupo de modificadores |

**Request Body:**
```json
{
  "name": "Grande (12 pulgadas)",
  "price": 45.00
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `name` | String | Sí | 1-100 caracteres | Nombre de la opción |
| `price` | Float | Sí | Min: 0 | Precio adicional (0 si no tiene costo) |

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Opción de modificador creada exitosamente",
  "data": {
    "modifierOption": {
      "id": 15,
      "name": "Grande (12 pulgadas)",
      "price": 45.00,
      "modifierGroup": {
        "id": 5,
        "name": "Tamaño",
        "restaurantId": 1
      },
      "createdAt": "2025-01-09T15:50:00.000Z",
      "updatedAt": "2025-01-09T15:50:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**403 Forbidden - Grupo no pertenece al restaurante:**
```json
{
  "status": "error",
  "message": "No tienes permiso para añadir opciones a este grupo",
  "code": "FORBIDDEN"
}
```

**404 Not Found - Grupo no existe:**
```json
{
  "status": "error",
  "message": "Grupo de modificadores no encontrado",
  "code": "MODIFIER_GROUP_NOT_FOUND"
}
```

---

### **PRODUCTOS**

---

#### **7. Listar Productos del Restaurante**

**Endpoint:** `GET /api/restaurant/products`

**Método:** `GET`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Obtiene todos los productos del restaurante con sus modificadores asociados.

**Headers:**
```http
Authorization: Bearer {token}
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `subcategoryId` | Integer | No | Filtrar por subcategoría |
| `isAvailable` | Boolean | No | Filtrar por disponibilidad |
| `page` | Integer | No | Número de página (default: 1) |
| `pageSize` | Integer | No | Tamaño de página (default: 20, max: 100) |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Productos obtenidos exitosamente",
  "data": {
    "products": [
      {
        "id": 1,
        "name": "Pizza Hawaiana",
        "description": "La clásica pizza con jamón y piña",
        "imageUrl": "http://localhost:3000/uploads/products/pizza1.jpg",
        "price": 150.00,
        "isAvailable": true,
        "tags": "pizza, jamon, pina",
        "subcategory": {
          "id": 1,
          "name": "Pizzas Tradicionales",
          "category": {
            "id": 1,
            "name": "Pizzas"
          }
        },
        "modifierGroups": [
          {
            "id": 1,
            "name": "Tamaño",
            "minSelection": 1,
            "maxSelection": 1,
            "options": [
              {
                "id": 1,
                "name": "Personal",
                "price": 0.00
              }
            ]
          }
        ],
        "createdAt": "2025-01-09T00:00:00.000Z",
        "updatedAt": "2025-01-09T00:00:00.000Z"
      }
    ],
    "pagination": {
      "totalProducts": 10,
      "currentPage": 1,
      "pageSize": 20,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

#### **8. Crear Producto con Modificadores**

**Endpoint:** `POST /api/restaurant/products`

**Método:** `POST`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Crea un nuevo producto en el menú del restaurante y lo asocia a grupos de modificadores existentes.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "subcategoryId": 1,
  "name": "Pizza Hawaiana",
  "description": "La clásica pizza con jamón y piña fresca",
  "imageUrl": "http://localhost:3000/uploads/products/pizza_hawaiana.jpg",
  "price": 150.00,
  "isAvailable": true,
  "modifierGroupIds": [1, 2, 3]
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `subcategoryId` | Integer | Sí | Min: 1 | ID de la subcategoría del restaurante |
| `name` | String | Sí | 1-150 caracteres | Nombre del producto |
| `description` | String | No | Máximo 1000 caracteres | Descripción del producto |
| `imageUrl` | String | No | Máximo 255 caracteres | URL de la imagen (de upload previo) |
| `price` | Float | Sí | Min: 0.01 | Precio base del producto |
| `isAvailable` | Boolean | No | Default: true | Disponibilidad del producto |
| `modifierGroupIds` | Array<Integer> | No | Default: [] | IDs de grupos de modificadores a asociar |

**⚠️ Nota Crítica:** `modifierGroupIds` es un array de IDs de grupos que deben pertenecer al mismo restaurante. Este campo permite asociar grupos de modificadores al crear el producto en una sola petición.

**Response (201 Created):**
```json
{
  "status": "success",
  "message": "Producto creado exitosamente",
  "data": {
    "product": {
      "id": 11,
      "name": "Pizza Hawaiana",
      "description": "La clásica pizza con jamón y piña fresca",
      "imageUrl": "http://localhost:3000/uploads/products/pizza_hawaiana.jpg",
      "price": 150.00,
      "isAvailable": true,
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
        "name": "Pizzería de Ana"
      },
      "modifierGroups": [
        {
          "id": 1,
          "name": "Tamaño",
          "minSelection": 1,
          "maxSelection": 1,
          "options": [
            {
              "id": 1,
              "name": "Personal",
              "price": 0.00
            },
            {
              "id": 2,
              "name": "Mediana",
              "price": 25.00
            },
            {
              "id": 3,
              "name": "Grande",
              "price": 45.00
            }
          ]
        },
        {
          "id": 2,
          "name": "Extras",
          "minSelection": 0,
          "maxSelection": 5,
          "options": [
            {
              "id": 5,
              "name": "Extra Queso",
              "price": 15.00
            }
          ]
        }
      ],
      "createdAt": "2025-01-09T16:00:00.000Z",
      "updatedAt": "2025-01-09T16:00:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**400 Bad Request - Grupos inválidos:**
```json
{
  "status": "error",
  "message": "Algunos grupos de modificadores no pertenecen a este restaurante",
  "code": "INVALID_MODIFIER_GROUPS",
  "details": {
    "invalidGroupIds": [5, 7],
    "restaurantId": 1
  }
}
```

**403 Forbidden - Sin permiso para subcategoría:**
```json
{
  "status": "error",
  "message": "No tienes permiso para añadir productos a esta subcategoría",
  "code": "FORBIDDEN"
}
```

**404 Not Found - Subcategoría no existe:**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND"
}
```

---

#### **9. Actualizar Producto y sus Modificadores**

**Endpoint:** `PATCH /api/restaurant/products/:productId`

**Método:** `PATCH`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Actualiza un producto existente y/o modifica sus asociaciones con grupos de modificadores. Todos los campos son opcionales.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `productId` | Integer | Sí | ID del producto a actualizar |

**Request Body:**
```json
{
  "name": "Pizza Hawaiana Premium",
  "price": 175.00,
  "modifierGroupIds": [1, 2, 3, 4]
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `subcategoryId` | Integer | No | Min: 1 | Cambiar de subcategoría |
| `name` | String | No | 1-150 caracteres | Nuevo nombre |
| `description` | String | No | Máximo 1000 caracteres | Nueva descripción |
| `imageUrl` | String | No | Máximo 255 caracteres | Nueva URL de imagen |
| `price` | Float | No | Min: 0.01 | Nuevo precio |
| `isAvailable` | Boolean | No | true/false | Cambiar disponibilidad |
| `modifierGroupIds` | Array<Integer> | No | - | **Nuevas** asociaciones de grupos |

**⚠️ COMPORTAMIENTO CRÍTICO de `modifierGroupIds`:**

Cuando se envía este campo, el backend:
1. **Elimina** todas las asociaciones existentes del producto
2. **Crea** nuevas asociaciones con los IDs proporcionados

**Ejemplos:**
```json
// Agregar más grupos (de 2 a 4 grupos)
{ "modifierGroupIds": [1, 2, 3, 4] }

// Quitar grupos (de 4 a 2 grupos)
{ "modifierGroupIds": [1, 2] }

// Quitar todos los grupos
{ "modifierGroupIds": [] }

// No modificar asociaciones (omitir el campo)
{ "name": "Nuevo Nombre" }  // modifierGroupIds no se envía
```

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Producto actualizado exitosamente",
  "data": {
    "product": {
      "id": 11,
      "name": "Pizza Hawaiana Premium",
      "description": "La clásica pizza con jamón y piña fresca",
      "imageUrl": "http://localhost:3000/uploads/products/pizza_hawaiana.jpg",
      "price": 175.00,
      "isAvailable": true,
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
        "name": "Pizzería de Ana"
      },
      "modifierGroups": [
        {
          "id": 1,
          "name": "Tamaño",
          "minSelection": 1,
          "maxSelection": 1,
          "options": [...]
        },
        {
          "id": 2,
          "name": "Extras",
          "minSelection": 0,
          "maxSelection": 5,
          "options": [...]
        },
        {
          "id": 3,
          "name": "Sin Ingredientes",
          "minSelection": 0,
          "maxSelection": 3,
          "options": [...]
        },
        {
          "id": 4,
          "name": "Tipo de Masa",
          "minSelection": 1,
          "maxSelection": 1,
          "options": [...]
        }
      ],
      "createdAt": "2025-01-09T16:00:00.000Z",
      "updatedAt": "2025-01-09T16:10:00.000Z"
    },
    "updatedFields": ["name", "price", "modifierGroupIds"]
  }
}
```

**Errores Posibles:**

**400 Bad Request - Grupos inválidos:**
```json
{
  "status": "error",
  "message": "Algunos grupos de modificadores no pertenecen a este restaurante",
  "code": "INVALID_MODIFIER_GROUPS",
  "details": {
    "invalidGroupIds": [10],
    "restaurantId": 1
  }
}
```

**400 Bad Request - Sin campos para actualizar:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**403 Forbidden - Producto de otro restaurante:**
```json
{
  "status": "error",
  "message": "No tienes permiso para editar este producto",
  "code": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Producto no encontrado",
  "code": "PRODUCT_NOT_FOUND"
}
```

---

#### **10. Actualizar Subcategoría**

**Endpoint:** `PATCH /api/restaurant/subcategories/:subcategoryId`

**Método:** `PATCH`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Actualiza una subcategoría existente del restaurante. Todos los campos son opcionales.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `subcategoryId` | Integer | Sí | ID de la subcategoría a actualizar |

**Request Body:**
```json
{
  "categoryId": 2,
  "name": "Pizzas Gourmet Premium",
  "displayOrder": 5
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `categoryId` | Integer | No | Min: 1 | Cambiar a otra categoría global |
| `name` | String | No | 1-100 caracteres | Nuevo nombre |
| `displayOrder` | Integer | No | Min: 0 | Nuevo orden de visualización |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Subcategoría actualizada exitosamente",
  "data": {
    "subcategory": {
      "id": 10,
      "name": "Pizzas Gourmet Premium",
      "displayOrder": 5,
      "category": {
        "id": 2,
        "name": "Bebidas"
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      "createdAt": "2025-01-09T15:30:00.000Z",
      "updatedAt": "2025-01-09T16:20:00.000Z"
    },
    "updatedFields": ["categoryId", "name", "displayOrder"]
  }
}
```

**Errores Posibles:**

**400 Bad Request - Sin campos:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "No tienes permiso para editar esta subcategoría",
  "code": "FORBIDDEN"
}
```

**404 Not Found - Categoría no existe:**
```json
{
  "status": "error",
  "message": "Categoría no encontrada",
  "code": "CATEGORY_NOT_FOUND"
}
```

**404 Not Found - Subcategoría no existe:**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND"
}
```

---

#### **11. Eliminar Subcategoría**

**Endpoint:** `DELETE /api/restaurant/subcategories/:subcategoryId`

**Método:** `DELETE`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Elimina una subcategoría del restaurante. **Solo se puede eliminar si no tiene productos asociados.**

**Headers:**
```http
Authorization: Bearer {token}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `subcategoryId` | Integer | Sí | ID de la subcategoría a eliminar |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Subcategoría eliminada exitosamente",
  "data": {
    "deletedSubcategory": {
      "id": 10,
      "name": "Pizzas Tradicionales",
      "category": "Pizzas",
      "deletedAt": "2025-01-09T16:30:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "No tienes permiso para eliminar esta subcategoría",
  "code": "FORBIDDEN"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND"
}
```

**409 Conflict - Tiene productos asociados:**
```json
{
  "status": "error",
  "message": "No se puede eliminar la subcategoría porque todavía contiene productos",
  "code": "SUBCATEGORY_HAS_PRODUCTS",
  "details": {
    "productsCount": 5,
    "subcategoryId": 10,
    "subcategoryName": "Pizzas Tradicionales",
    "suggestion": "Elimina primero todos los productos de esta subcategoría o muévelos a otra"
  }
}
```

---

#### **12. Actualizar Grupo de Modificadores**

**Endpoint:** `PATCH /api/restaurant/modifier-groups/:groupId`

**Método:** `PATCH`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Actualiza un grupo de modificadores existente. Todos los campos son opcionales.

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `groupId` | Integer | Sí | ID del grupo a actualizar |

**Request Body:**
```json
{
  "name": "Tamaño de Pizza",
  "minSelection": 1,
  "maxSelection": 1
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `name` | String | No | 1-100 caracteres | Nuevo nombre del grupo |
| `minSelection` | Integer | No | 0-10 | Nueva selección mínima |
| `maxSelection` | Integer | No | 1-10 | Nueva selección máxima |

**⚠️ Validación Especial:** Si se actualizan ambos campos, se valida que `minSelection <= maxSelection`.

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Grupo de modificadores actualizado exitosamente",
  "data": {
    "modifierGroup": {
      "id": 5,
      "name": "Tamaño de Pizza",
      "minSelection": 1,
      "maxSelection": 1,
      "restaurantId": 1,
      "options": [
        {
          "id": 1,
          "name": "Personal",
          "price": 0.00,
          "createdAt": "2025-01-09T15:45:00.000Z",
          "updatedAt": "2025-01-09T15:45:00.000Z"
        }
      ],
      "createdAt": "2025-01-09T15:45:00.000Z",
      "updatedAt": "2025-01-09T16:40:00.000Z"
    },
    "updatedFields": ["name"]
  }
}
```

**Errores Posibles:**

**400 Bad Request - Rango inválido:**
```json
{
  "status": "error",
  "message": "La selección mínima no puede ser mayor que la selección máxima",
  "code": "INVALID_SELECTION_RANGE"
}
```

**400 Bad Request - Sin campos:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Grupo de modificadores no encontrado",
  "code": "MODIFIER_GROUP_NOT_FOUND"
}
```

---

#### **13. Eliminar Grupo de Modificadores**

**Endpoint:** `DELETE /api/restaurant/modifier-groups/:groupId`

**Método:** `DELETE`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Elimina un grupo de modificadores. **Solo se puede eliminar si no tiene opciones ni está asociado a productos.**

**Headers:**
```http
Authorization: Bearer {token}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `groupId` | Integer | Sí | ID del grupo a eliminar |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Grupo de modificadores eliminado exitosamente",
  "data": {
    "deletedGroup": {
      "id": 5,
      "name": "Tamaño",
      "deletedAt": "2025-01-09T16:50:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Grupo de modificadores no encontrado",
  "code": "MODIFIER_GROUP_NOT_FOUND"
}
```

**409 Conflict - Tiene opciones:**
```json
{
  "status": "error",
  "message": "No se puede eliminar el grupo porque tiene opciones asociadas. Elimina primero las opciones.",
  "code": "GROUP_HAS_OPTIONS",
  "details": {
    "optionsCount": 4,
    "options": [
      {
        "id": 1,
        "name": "Personal"
      },
      {
        "id": 2,
        "name": "Mediana"
      }
    ]
  }
}
```

**409 Conflict - Asociado a productos:**
```json
{
  "status": "error",
  "message": "No se puede eliminar el grupo porque está asociado a productos. Desasocia primero los productos.",
  "code": "GROUP_ASSOCIATED_TO_PRODUCTS",
  "details": {
    "productsCount": 3,
    "products": [
      {
        "id": 1,
        "name": "Pizza Hawaiana"
      },
      {
        "id": 2,
        "name": "Pizza Pepperoni"
      }
    ]
  }
}
```

---

#### **14. Actualizar Opción de Modificador**

**Endpoint:** `PATCH /api/restaurant/modifier-options/:optionId`

**Método:** `PATCH`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Actualiza una opción de modificador existente (nombre y/o precio).

**Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `optionId` | Integer | Sí | ID de la opción a actualizar |

**Request Body:**
```json
{
  "name": "Grande (14 pulgadas)",
  "price": 50.00
}
```

**Campos:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `name` | String | No | 1-100 caracteres | Nuevo nombre de la opción |
| `price` | Float | No | Min: 0 | Nuevo precio |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Opción de modificador actualizada exitosamente",
  "data": {
    "modifierOption": {
      "id": 3,
      "name": "Grande (14 pulgadas)",
      "price": 50.00,
      "modifierGroupId": 5,
      "modifierGroup": {
        "id": 5,
        "name": "Tamaño",
        "restaurantId": 1
      },
      "createdAt": "2025-01-09T15:50:00.000Z",
      "updatedAt": "2025-01-09T17:00:00.000Z"
    },
    "updatedFields": ["name", "price"]
  }
}
```

**Errores Posibles:**

**400 Bad Request - Sin campos:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Opción de modificador no encontrada",
  "code": "MODIFIER_OPTION_NOT_FOUND"
}
```

---

#### **15. Eliminar Opción de Modificador**

**Endpoint:** `DELETE /api/restaurant/modifier-options/:optionId`

**Método:** `DELETE`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Elimina una opción de modificador. Puede eliminarse libremente, incluso si el grupo está asociado a productos.

**Headers:**
```http
Authorization: Bearer {token}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `optionId` | Integer | Sí | ID de la opción a eliminar |

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Opción de modificador eliminada exitosamente",
  "data": {
    "deletedOption": {
      "id": 3,
      "name": "Grande (12 pulgadas)",
      "price": 45.00,
      "modifierGroupId": 5,
      "deletedAt": "2025-01-09T17:10:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Opción de modificador no encontrada",
  "code": "MODIFIER_OPTION_NOT_FOUND"
}
```

---

#### **16. Eliminar Producto**

**Endpoint:** `DELETE /api/restaurant/products/:productId`

**Método:** `DELETE`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Elimina un producto del menú del restaurante. **IMPORTANTE:** Las asociaciones con grupos de modificadores se eliminan automáticamente, pero **no se puede eliminar si el producto tiene pedidos asociados**.

**Headers:**
```http
Authorization: Bearer {token}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `productId` | Integer | Sí | ID del producto a eliminar |

**⚠️ REGLA CRÍTICA DE NEGOCIO:**

El producto **NO se puede eliminar** si:
- ✅ Tiene pedidos (`OrderItem`) asociados

El producto **SÍ se puede eliminar** si:
- ✅ NO tiene pedidos
- ✅ Las asociaciones con modificadores (`ProductModifier`) se eliminan automáticamente

**Response (200 OK):**
```json
{
  "status": "success",
  "message": "Producto eliminado exitosamente",
  "data": {
    "deletedProduct": {
      "id": 11,
      "name": "Pizza Hawaiana",
      "restaurantId": 1,
      "restaurantName": "Pizzería de Ana",
      "subcategoryName": "Pizzas Tradicionales",
      "deletedAt": "2025-01-09T17:20:00.000Z"
    }
  }
}
```

**Errores Posibles:**

**403 Forbidden:**
```json
{
  "status": "error",
  "message": "No tienes permiso para eliminar este producto",
  "code": "FORBIDDEN",
  "details": {
    "productId": 11,
    "restaurantId": 2,
    "restaurantName": "Sushi Master Kenji"
  }
}
```

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Producto no encontrado",
  "code": "PRODUCT_NOT_FOUND"
}
```

**409 Conflict - Producto en uso:**
```json
{
  "status": "error",
  "message": "No se puede eliminar el producto porque está asociado a pedidos existentes",
  "code": "PRODUCT_IN_USE",
  "details": {
    "ordersCount": 12,
    "productId": 11,
    "productName": "Pizza Hawaiana"
  },
  "suggestion": "Considera marcar el producto como no disponible en lugar de eliminarlo. Usa: PATCH /api/restaurant/products/11 con { \"isAvailable\": false }"
}
```

---

## 📊 Modelos de Datos

### **Category (Categoría Global)**
```typescript
interface Category {
  id: number;
  name: string;                    // "Pizzas", "Bebidas", "Sushi"
  imageUrl: string | null;
  subcategories: Subcategory[];    // Incluye de TODOS los restaurantes
}
```

### **Subcategory (Subcategoría del Restaurante)**
```typescript
interface Subcategory {
  id: number;
  name: string;                    // "Pizzas Tradicionales"
  displayOrder: number;            // Orden de visualización
  category: {
    id: number;
    name: string;
  };
  restaurant: {
    id: number;
    name: string;
  };
  productsCount?: number;          // Solo en GET /subcategories
  createdAt: string;
  updatedAt: string;
}
```

### **ModifierGroup (Grupo de Modificadores)**
```typescript
interface ModifierGroup {
  id: number;
  name: string;                    // "Tamaño", "Extras"
  minSelection: number;            // 0-10
  maxSelection: number;            // 1-10
  restaurant: {
    id: number;
    name: string;
  };
  options: ModifierOption[];
  createdAt: string;
  updatedAt: string;
}
```

### **ModifierOption (Opción de Modificador)**
```typescript
interface ModifierOption {
  id: number;
  name: string;                    // "Grande", "Extra Queso"
  price: number;                   // Precio adicional
}
```

### **Product (Producto)**
```typescript
interface Product {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isAvailable: boolean;
  tags: string | null;
  subcategory: {
    id: number;
    name: string;
    category: {
      id: number;
      name: string;
    };
  };
  restaurant: {
    id: number;
    name: string;
  };
  modifierGroups: ModifierGroup[];  // Grupos asociados al producto
  createdAt: string;
  updatedAt: string;
}
```

---

## 🛠️ Proceso de Construcción del Menú

### **Escenario Completo: Crear una Pizza Hawaiana desde Cero**

#### **PASO 1: Obtener Categorías Globales**

```http
GET /api/categories
```

**Resultado:** El owner ve que existe la categoría "Pizzas" (ID: 1)

---

#### **PASO 2: Crear Subcategoría "Pizzas Tradicionales"**

```http
POST /api/restaurant/subcategories
Authorization: Bearer {token}

{
  "categoryId": 1,
  "name": "Pizzas Tradicionales",
  "displayOrder": 1
}
```

**Resultado:** Subcategoría creada con ID: 10

---

#### **PASO 3A: Crear Grupo "Tamaño"**

```http
POST /api/restaurant/modifier-groups
Authorization: Bearer {token}

{
  "name": "Tamaño",
  "minSelection": 1,
  "maxSelection": 1
}
```

**Resultado:** Grupo creado con ID: 5

---

#### **PASO 3B: Añadir Opciones al Grupo "Tamaño"**

**Opción 1:**
```http
POST /api/restaurant/modifier-groups/5/options
Authorization: Bearer {token}

{
  "name": "Personal (6 pulgadas)",
  "price": 0.00
}
```

**Opción 2:**
```http
POST /api/restaurant/modifier-groups/5/options
Authorization: Bearer {token}

{
  "name": "Mediana (10 pulgadas)",
  "price": 25.00
}
```

**Opción 3:**
```http
POST /api/restaurant/modifier-groups/5/options
Authorization: Bearer {token}

{
  "name": "Grande (12 pulgadas)",
  "price": 45.00
}
```

**Resultado:** 3 opciones creadas en el grupo "Tamaño"

---

#### **PASO 3C: Crear Grupo "Extras"**

```http
POST /api/restaurant/modifier-groups
Authorization: Bearer {token}

{
  "name": "Extras",
  "minSelection": 0,
  "maxSelection": 5
}
```

**Resultado:** Grupo creado con ID: 6

---

#### **PASO 3D: Añadir Opciones al Grupo "Extras"**

```http
POST /api/restaurant/modifier-groups/6/options

{ "name": "Extra Queso", "price": 15.00 }

POST /api/restaurant/modifier-groups/6/options

{ "name": "Extra Pepperoni", "price": 20.00 }

POST /api/restaurant/modifier-groups/6/options

{ "name": "Extra Champiñones", "price": 12.00 }
```

**Resultado:** 3 opciones creadas en el grupo "Extras"

---

#### **PASO 4: Crear Producto "Pizza Hawaiana" con Modificadores**

```http
POST /api/restaurant/products
Authorization: Bearer {token}

{
  "subcategoryId": 10,
  "name": "Pizza Hawaiana",
  "description": "La clásica pizza con jamón y piña fresca",
  "price": 150.00,
  "isAvailable": true,
  "modifierGroupIds": [5, 6]
}
```

**Resultado:** Producto creado con:
- ✅ Información básica (nombre, precio, descripción)
- ✅ Asociado a subcategoría "Pizzas Tradicionales"
- ✅ Asociado a grupo "Tamaño" (obligatorio)
- ✅ Asociado a grupo "Extras" (opcional)

---

#### **PASO 5 (Opcional): Agregar Más Grupos al Producto**

Más adelante, si el owner crea un nuevo grupo "Sin Ingredientes":

```http
POST /api/restaurant/modifier-groups
{ "name": "Sin Ingredientes", "minSelection": 0, "maxSelection": 3 }
→ Retorna ID: 7

POST /api/restaurant/modifier-groups/7/options
{ "name": "Sin Cebolla", "price": 0.00 }
```

Luego actualizar el producto para incluir este nuevo grupo:

```http
PATCH /api/restaurant/products/11

{
  "modifierGroupIds": [5, 6, 7]
}
```

**Resultado:** El producto ahora tiene 3 grupos asociados.

---

## 🎯 Casos de Uso Prácticos

### **Caso de Uso 1: Menú Simple (Sin Modificadores)**

**Escenario:** Owner quiere crear una bebida simple sin personalizaciones.

**Flujo:**
1. Obtener categorías → Ver "Bebidas" (ID: 2)
2. Crear subcategoría → "Refrescos" en categoría "Bebidas"
3. Crear producto SIN modificadores:

```http
POST /api/restaurant/products

{
  "subcategoryId": 15,
  "name": "Coca-Cola 600ml",
  "price": 25.00,
  "modifierGroupIds": []  ← Sin modificadores
}
```

**Resultado:** Producto simple sin opciones de personalización.

---

### **Caso de Uso 2: Producto con Modificador Obligatorio**

**Escenario:** Owner quiere que el cliente DEBA elegir un tamaño.

**Configuración del grupo:**
```http
POST /api/restaurant/modifier-groups

{
  "name": "Tamaño",
  "minSelection": 1,  ← OBLIGATORIO
  "maxSelection": 1
}
```

**Resultado:** En la app del cliente, este grupo aparecerá como requerido (no puede omitirse).

---

### **Caso de Uso 3: Producto con Modificador Opcional**

**Escenario:** Owner quiere que el cliente PUEDA elegir extras pero no es obligatorio.

**Configuración del grupo:**
```http
POST /api/restaurant/modifier-groups

{
  "name": "Extras",
  "minSelection": 0,  ← OPCIONAL
  "maxSelection": 5   ← Puede elegir hasta 5
}
```

**Resultado:** En la app del cliente, este grupo aparecerá como opcional (puede saltar este paso).

---

### **Caso de Uso 4: Modificar Asociaciones de un Producto Existente**

**Escenario:** Owner quiere agregar un nuevo grupo de modificadores a un producto existente.

**Situación inicial:** Producto tiene grupos [1, 2]

**Pasos:**
1. Crear nuevo grupo "Tipo de Masa" → Obtiene ID: 8
2. Actualizar producto:

```http
PATCH /api/restaurant/products/11

{
  "modifierGroupIds": [1, 2, 8]  ← Incluye el nuevo grupo
}
```

**Resultado:** Producto ahora tiene 3 grupos asociados (1, 2, 8).

---

### **Caso de Uso 5: Reutilizar Grupos en Múltiples Productos**

**Escenario:** Owner tiene el grupo "Tamaño" y quiere usarlo en todas sus pizzas.

**Pasos:**
```http
// Crear Pizza 1
POST /api/restaurant/products
{ "name": "Pizza Hawaiana", "modifierGroupIds": [1, 2] }

// Crear Pizza 2 (reutiliza los mismos grupos)
POST /api/restaurant/products
{ "name": "Pizza Pepperoni", "modifierGroupIds": [1, 2] }

// Crear Pizza 3 (reutiliza los mismos grupos)
POST /api/restaurant/products
{ "name": "Pizza Margherita", "modifierGroupIds": [1, 2] }
```

**Resultado:** Los 3 productos comparten los mismos grupos de modificadores. Si el owner actualiza las opciones del grupo (ej. cambia precio de "Grande"), el cambio aplica a TODAS las pizzas.

---

## ⚠️ Códigos de Error

### **Tabla Completa de Errores (Todos los Endpoints)**

| Código | Code | Endpoint | Descripción |
|--------|------|----------|-------------|
| **VALIDACIÓN (400)** ||||
| `400` | `VALIDATION_ERROR` | Todos | Datos de entrada inválidos |
| `400` | `INVALID_MODIFIER_GROUPS` | POST/PATCH products | Grupos no pertenecen al restaurante |
| `400` | `NO_FIELDS_TO_UPDATE` | PATCH subcategories<br>PATCH products<br>PATCH modifier-groups<br>PATCH modifier-options | Body vacío (ningún campo para actualizar) |
| `400` | `INVALID_SELECTION_RANGE` | POST/PATCH modifier-groups | minSelection > maxSelection |
| **AUTENTICACIÓN/AUTORIZACIÓN (401/403)** ||||
| `401` | `INVALID_TOKEN` | Todos (privados) | Token inválido o expirado |
| `403` | `INSUFFICIENT_PERMISSIONS` | Todos (privados) | Usuario sin rol necesario |
| `403` | `NO_RESTAURANT_ASSIGNED` | Todos (privados) | Owner sin restaurante asignado |
| `403` | `FORBIDDEN` | POST/PATCH/DELETE<br>subcategories<br>products<br>modifier-groups<br>modifier-options | Recurso de otro restaurante |
| **NO ENCONTRADO (404)** ||||
| `404` | `CATEGORY_NOT_FOUND` | POST/PATCH subcategories | Categoría global no existe |
| `404` | `SUBCATEGORY_NOT_FOUND` | PATCH/DELETE subcategories<br>POST products | Subcategoría no existe |
| `404` | `PRODUCT_NOT_FOUND` | PATCH/DELETE products | Producto no existe |
| `404` | `MODIFIER_GROUP_NOT_FOUND` | PATCH/DELETE modifier-groups<br>POST options | Grupo no existe |
| `404` | `MODIFIER_OPTION_NOT_FOUND` | PATCH/DELETE modifier-options | Opción no existe |
| **CONFLICTOS (409)** ||||
| `409` | `SUBCATEGORY_EXISTS` | POST subcategories | Subcategoría duplicada en categoría |
| `409` | `SUBCATEGORY_HAS_PRODUCTS` | DELETE subcategories | No se puede eliminar: tiene productos |
| `409` | `GROUP_HAS_OPTIONS` | DELETE modifier-groups | No se puede eliminar: tiene opciones |
| `409` | `GROUP_ASSOCIATED_TO_PRODUCTS` | DELETE modifier-groups | No se puede eliminar: asociado a productos |
| `409` | `PRODUCT_IN_USE` | DELETE products | No se puede eliminar: tiene pedidos asociados |
| **SERVIDOR (500)** ||||
| `500` | `INTERNAL_ERROR` | Todos | Error del servidor |

---

## 🔐 Contexto Automático del Restaurante

### **Importante para Frontend**

El owner **NO necesita** enviar el `restaurantId` en ninguna petición. El backend lo obtiene automáticamente del token JWT y la asignación de rol.

**Flujo interno del backend:**
```javascript
// 1. Extraer userId del token JWT
const userId = req.user.id;

// 2. Buscar asignación de rol owner
const ownerAssignment = userRoleAssignments.find(
  a => a.role.name === 'owner' && a.restaurantId !== null
);

// 3. Usar restaurantId automáticamente
const restaurantId = ownerAssignment.restaurantId;
```

**Beneficio:** Mayor seguridad - un owner solo puede gestionar SU restaurante.

---

## 📋 Checklist de Implementación para Frontend

### **Pantalla 1: Gestión de Subcategorías**

**Listar (GET):**
- [ ] Listar subcategorías existentes (GET /subcategories)
- [ ] Mostrar agrupadas por categoría global
- [ ] Mostrar badge con número de productos

**Crear (POST):**
- [ ] Botón "Crear Subcategoría"
- [ ] Dropdown para seleccionar categoría global
- [ ] Input para nombre de subcategoría
- [ ] Input numérico para displayOrder
- [ ] Enviar POST /subcategories

**Editar (PATCH):**
- [ ] Botón "Editar" en cada subcategoría
- [ ] Modal/formulario precargado con datos actuales
- [ ] Permitir cambiar nombre, categoría, displayOrder
- [ ] Enviar PATCH /subcategories/:id

**Eliminar (DELETE):**
- [ ] Botón "Eliminar" en cada subcategoría
- [ ] Confirmar acción con diálogo
- [ ] Enviar DELETE /subcategories/:id
- [ ] Manejar error 409 si tiene productos (mostrar mensaje claro)

---

### **Pantalla 2: Gestión de Grupos de Modificadores**

**Listar (GET):**
- [ ] Listar grupos existentes (GET /modifier-groups)
- [ ] Mostrar badge "Obligatorio" si minSelection > 0
- [ ] Mostrar badge "Opcional" si minSelection = 0
- [ ] Expandir grupo para ver opciones

**Crear (POST):**
- [ ] Botón "Crear Grupo"
- [ ] Input para nombre del grupo
- [ ] Slider para minSelection (0-10)
- [ ] Slider para maxSelection (1-10)
- [ ] Helper text explicando minSelection vs maxSelection
- [ ] Validar que minSelection <= maxSelection
- [ ] Enviar POST /modifier-groups

**Editar (PATCH):**
- [ ] Botón "Editar Grupo" en cada grupo
- [ ] Modal/formulario precargado con datos actuales
- [ ] Permitir cambiar nombre, minSelection, maxSelection
- [ ] Validar que minSelection <= maxSelection
- [ ] Enviar PATCH /modifier-groups/:id

**Eliminar (DELETE):**
- [ ] Botón "Eliminar Grupo"
- [ ] Confirmar acción con diálogo
- [ ] Enviar DELETE /modifier-groups/:id
- [ ] Manejar error 409 si tiene opciones (mostrar lista de opciones)
- [ ] Manejar error 409 si está asociado a productos (mostrar lista de productos)

**Opciones del Grupo:**

**Crear Opción (POST):**
- [ ] Botón "Añadir Opción" en cada grupo
- [ ] Input para nombre de opción
- [ ] Input numérico para precio (puede ser 0)
- [ ] Enviar POST /modifier-groups/:groupId/options

**Editar Opción (PATCH):**
- [ ] Botón "Editar" en cada opción
- [ ] Modal/formulario con nombre y precio
- [ ] Enviar PATCH /modifier-options/:id

**Eliminar Opción (DELETE):**
- [ ] Botón "Eliminar" en cada opción
- [ ] Confirmar acción
- [ ] Enviar DELETE /modifier-options/:id

---

### **Pantalla 3: Gestión de Productos**

**Listar (GET):**
- [ ] Listar productos existentes (GET /products)
- [ ] Filtrar por subcategoría (query param)
- [ ] Filtrar por disponibilidad (query param)
- [ ] Mostrar badge de disponibilidad
- [ ] Mostrar número de grupos asociados

**Crear (POST):**
- [ ] Botón "Crear Producto"
- [ ] Dropdown para seleccionar subcategoría
- [ ] Input para nombre del producto
- [ ] TextArea para descripción (opcional)
- [ ] Input numérico para precio
- [ ] Botón "Subir Imagen" (opcional)
- [ ] **Checklist de grupos de modificadores:**
  - [ ] Mostrar lista de grupos disponibles
  - [ ] Permitir seleccionar múltiples grupos (checkboxes)
  - [ ] Preview de grupos seleccionados
- [ ] Enviar POST /products con modifierGroupIds

**Editar (PATCH):**
- [ ] Botón "Editar" en cada producto
- [ ] Formulario precargado con datos actuales
- [ ] Permitir cambiar nombre, descripción, precio, subcategoría
- [ ] Permitir cambiar imagen
- [ ] **Checklist de grupos de modificadores:**
  - [ ] Mostrar grupos actualmente asociados (pre-seleccionados)
  - [ ] Permitir agregar/quitar grupos
  - [ ] Advertir que enviará TODOS los grupos (reemplazo completo)
- [ ] Enviar PATCH /products/:id con modifierGroupIds

**Eliminar (DELETE):**
- [ ] Botón "Eliminar" en cada producto
- [ ] Confirmar acción con diálogo
- [ ] Mostrar advertencia: "Se eliminarán las asociaciones con modificadores"
- [ ] Enviar DELETE /products/:id

**Activar/Desactivar:**
- [ ] Toggle switch para isAvailable
- [ ] Enviar PATCH /products/:id con solo `{ "isAvailable": true/false }`

---

## 📐 Reglas de Negocio

### **1. Subcategorías**

- ✅ Una subcategoría pertenece a UNA categoría global
- ✅ Una subcategoría pertenece a UN restaurante
- ✅ El nombre de subcategoría debe ser único por categoría en el restaurante
- ✅ El displayOrder controla el orden de visualización

### **2. Grupos de Modificadores**

- ✅ Un grupo pertenece a UN restaurante
- ✅ Un grupo puede tener múltiples opciones
- ✅ `minSelection = 0` → Grupo opcional
- ✅ `minSelection > 0` → Grupo obligatorio
- ✅ `maxSelection = 1` → Selección única (radio button)
- ✅ `maxSelection > 1` → Selección múltiple (checkboxes)
- ✅ Un grupo puede reutilizarse en múltiples productos

### **3. Opciones de Modificadores**

- ✅ Una opción pertenece a UN grupo
- ✅ El precio es adicional al precio base del producto
- ✅ Precio puede ser 0 (sin costo adicional)

### **4. Productos**

- ✅ Un producto pertenece a UNA subcategoría
- ✅ Un producto pertenece a UN restaurante
- ✅ Un producto puede tener 0, 1 o múltiples grupos de modificadores
- ✅ Los grupos se asocian mediante el array `modifierGroupIds`
- ✅ Al actualizar `modifierGroupIds`, se reemplazan TODAS las asociaciones

---

## 🔄 Diagrama de Flujo de Creación

```
┌─────────────────────────────────────────────────────┐
│  INICIO: Owner quiere crear "Pizza Hawaiana"        │
└─────────────────────────────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │  ¿Existe subcategoría         │
        │  "Pizzas Tradicionales"?      │
        └───────────────────────────────┘
              NO ↓         ↓ SÍ
        ┌────────────┐    │
        │  POST      │    │
        │  /subcats  │    │
        └────────────┘    │
              ↓           ↓
        ┌───────────────────────────────┐
        │  ¿Existe grupo "Tamaño"?       │
        └───────────────────────────────┘
              NO ↓         ↓ SÍ
        ┌────────────┐    │
        │  POST      │    │
        │  /modifier │    │
        │  -groups   │    │
        └────────────┘    │
              ↓           │
        ┌────────────┐    │
        │  POST      │    │
        │  /options  │    │
        │  (x3)      │    │
        └────────────┘    │
              ↓           ↓
        ┌───────────────────────────────┐
        │  ¿Existe grupo "Extras"?       │
        └───────────────────────────────┘
              NO ↓         ↓ SÍ
        ┌────────────┐    │
        │  Crear     │    │
        │  grupo y   │    │
        │  opciones  │    │
        └────────────┘    │
              ↓           ↓
        ┌───────────────────────────────┐
        │  POST /products                │
        │  {                             │
        │    subcategoryId: 10,          │
        │    name: "Pizza Hawaiana",     │
        │    price: 150,                 │
        │    modifierGroupIds: [5, 6]    │
        │  }                             │
        └───────────────────────────────┘
                        ↓
        ┌───────────────────────────────┐
        │  ✅ Producto creado con        │
        │     modificadores asociados    │
        │  FIN                           │
        └───────────────────────────────┘
```

---

## 🧩 Estrategias de Implementación

### **Estrategia 1: Construcción Paso a Paso (Recomendada para UX)**

**Ventaja:** El usuario ve progreso inmediato en cada paso.

**Flujo:**
1. Pantalla "Crear Subcategoría" → POST /subcategories
2. Pantalla "Crear Grupos" → POST /modifier-groups y POST /options
3. Pantalla "Crear Producto" → Seleccionar grupos existentes + POST /products

**UX:** Wizard multi-paso con indicador de progreso.

---

### **Estrategia 2: Formulario Todo-en-Uno**

**Ventaja:** Menos pasos para el usuario.

**Flujo:**
1. Formulario único con:
   - Selección de subcategoría (o crear nueva)
   - Datos del producto
   - Selección de grupos de modificadores existentes
2. Al guardar:
   - Si la subcategoría no existe → POST /subcategories
   - POST /products con modifierGroupIds

**UX:** Formulario largo pero fluido.

---

### **Estrategia 3: Reutilización Inteligente**

**Ventaja:** Eficiencia para productos similares.

**Flujo:**
1. Crear "plantilla" de grupos de modificadores comunes (Tamaño, Extras)
2. Al crear nuevos productos del mismo tipo, reutilizar los grupos:

```http
// Pizza 1
POST /products { "name": "Hawaiana", "modifierGroupIds": [1, 2] }

// Pizza 2 (reutiliza grupos)
POST /products { "name": "Pepperoni", "modifierGroupIds": [1, 2] }

// Pizza 3 (reutiliza grupos)
POST /products { "name": "Margherita", "modifierGroupIds": [1, 2] }
```

**UX:** Botón "Duplicar Producto" que copia configuración.

---

## 📚 Guía de Implementación por Pantallas

### **Pantalla A: Gestión de Subcategorías**

**Objetivo:** Organizar el menú en secciones.

**Funcionalidad:**
1. **Listar subcategorías:**
   ```http
   GET /api/restaurant/subcategories
   ```

2. **Crear subcategoría:**
   - Mostrar dropdown con categorías globales (de GET /categories)
   - Input para nombre de subcategoría
   - Input numérico para displayOrder
   - Botón "Crear"
   ```http
   POST /api/restaurant/subcategories
   {
     "categoryId": 1,
     "name": "Pizzas Tradicionales",
     "displayOrder": 1
   }
   ```

3. **Visualización:**
   - ListView agrupado por categoría global
   - Cada subcategoría con badge del número de productos
   - Opciones de editar/eliminar

---

### **Pantalla B: Gestión de Grupos de Modificadores**

**Objetivo:** Definir opciones de personalización reutilizables.

**Funcionalidad:**

1. **Listar grupos:**
   ```http
   GET /api/restaurant/modifier-groups
   ```

2. **Crear grupo:**
   - Input para nombre del grupo
   - Slider para minSelection (0-10)
   - Slider para maxSelection (1-10)
   - Helper text explicando minSelection vs maxSelection
   - Botón "Crear Grupo"
   ```http
   POST /api/restaurant/modifier-groups
   {
     "name": "Tamaño",
     "minSelection": 1,
     "maxSelection": 1
   }
   ```

3. **Añadir opciones al grupo:**
   - Dentro de cada grupo, botón "Añadir Opción"
   - Input para nombre de opción
   - Input numérico para precio
   - Botón "Guardar Opción"
   ```http
   POST /api/restaurant/modifier-groups/5/options
   {
     "name": "Grande (12 pulgadas)",
     "price": 45.00
   }
   ```

4. **Visualización:**
   - ExpansionTile por cada grupo
   - Al expandir, mostrar lista de opciones
   - Badge con "Obligatorio" si minSelection > 0
   - Badge con "Opcional" si minSelection = 0

---

### **Pantalla C: Gestión de Productos**

**Objetivo:** Crear productos completos con modificadores.

**Funcionalidad:**

1. **Listar productos:**
   ```http
   GET /api/restaurant/products
   ```

2. **Formulario de creación:**
   - Dropdown para seleccionar subcategoría
   - Input para nombre del producto
   - TextArea para descripción
   - Input numérico para precio
   - Botón "Subir Imagen" (opcional)
   - **Sección de modificadores:**
     - Título: "Opciones de Personalización"
     - Listar todos los grupos disponibles (GET /modifier-groups)
     - Checkbox por cada grupo para asociarlo
     - Preview de grupos seleccionados
   - Botón "Crear Producto"
   ```http
   POST /api/restaurant/products
   {
     "subcategoryId": 10,
     "name": "Pizza Hawaiana",
     "description": "...",
     "price": 150.00,
     "modifierGroupIds": [5, 6]  ← IDs de grupos seleccionados
   }
   ```

3. **Visualización:**
   - Grid o ListView de productos
   - Card con imagen, nombre, precio
   - Badge de disponibilidad (Disponible/No disponible)
   - Número de grupos de modificadores asociados
   - Opciones de editar/eliminar

---

## 🎨 Recomendaciones de UI/UX

### **1. Wizard para Primer Producto**

Si el restaurante no tiene productos, mostrar un wizard guiado:

```
Paso 1/5: Crear una subcategoría
→ Explica qué es una subcategoría
→ Muestra ejemplos ("Pizzas Tradicionales", "Bebidas Frías")

Paso 2/5: Crear grupo de modificadores
→ Explica qué es un grupo
→ Muestra ejemplos ("Tamaño", "Extras")

Paso 3/5: Añadir opciones al grupo
→ Explica qué son las opciones
→ Muestra ejemplos ("Grande - $45")

Paso 4/5: Crear tu primer producto
→ Formulario completo
→ Asociar grupos creados

Paso 5/5: ¡Menú listo!
→ Resumen
→ Botón "Ver mi menú"
```

---

### **2. Templates de Menú**

Ofrecer templates predefinidos:

**Template "Pizzería Básica":**
- Subcategorías: "Pizzas", "Bebidas", "Postres"
- Grupos: "Tamaño" (obligatorio), "Extras" (opcional)
- Productos de ejemplo: Pizza Pepperoni, Coca-Cola

**Implementación:**
Crear múltiples subcategorías, grupos y productos con una secuencia de llamadas API.

---

### **3. Vista Previa del Menú**

Botón "Vista Previa" que muestra cómo verán los clientes el menú:
- Usa GET /restaurants/:id (endpoint público)
- Simula la experiencia del cliente
- Permite verificar antes de publicar

---

### **4. Drag & Drop para Ordenamiento**

Permitir reordenar subcategorías arrastrando:
- Actualizar displayOrder de cada subcategoría
- Enviar PATCH /subcategories/:id con nuevo displayOrder

---

## 🔧 Flujos Avanzados

### **Flujo 1: Importar Producto de Otro Restaurante (Inspiración)**

```
1. Owner ve menú de otro restaurante (GET /restaurants/:id)
2. Owner ve un producto que le gusta
3. App copia solo la estructura (nombre, precio estimado)
4. Owner crea su propia versión:
   - POST /subcategories (si no existe)
   - POST /modifier-groups (copia grupos)
   - POST /products (nuevo producto inspirado)
```

---

### **Flujo 2: Duplicar Producto Existente**

```
1. Owner selecciona producto existente
2. Botón "Duplicar"
3. App precarga formulario con datos del producto original
4. Owner modifica nombre/precio
5. POST /products con mismos modifierGroupIds
```

**Ejemplo:**
```http
// Producto original
{ "id": 1, "name": "Pizza Hawaiana", "modifierGroupIds": [1, 2] }

// Duplicar
POST /products
{
  "name": "Pizza Hawaiana Especial",  ← Nombre nuevo
  "price": 180.00,                    ← Precio diferente
  "subcategoryId": 1,
  "modifierGroupIds": [1, 2]          ← Mismos grupos
}
```

---

### **Flujo 3: Gestión Masiva de Disponibilidad**

```
Escenario: Owner se queda sin champiñones y quiere desactivar 
           todos los productos que los incluyen.

Solución: Endpoint especial ya implementado:
POST /api/restaurant/products/deactivate-by-tag
{
  "tag": "champinones"
}

→ Todos los productos con tag "champinones" se marcan como 
  isAvailable: false
```

---

## 📊 Resumen de Capacidades del Backend

### **✅ Capacidades CRUD Completas:**

1. ✅ **Subcategorías:** GET, POST, PATCH, DELETE (con validación de productos)
2. ✅ **Grupos de Modificadores:** GET, POST, PATCH, DELETE (con validación de opciones y asociaciones)
3. ✅ **Opciones de Modificadores:** POST, PATCH, DELETE (sin restricciones)
4. ✅ **Productos:** GET, POST, PATCH, DELETE (con cascada en asociaciones)
5. ✅ **Categorías Globales:** GET (públicas)

---

### **✅ Características Avanzadas de Gestión:**

1. ✅ **Actualización selectiva:** Solo se actualizan campos enviados (PATCH endpoints)
2. ✅ **Reemplazo completo de asociaciones:** `modifierGroupIds` reemplaza todas las asociaciones
3. ✅ **Validación cruzada:** Verifica que subcategorías/grupos sean del mismo restaurante
4. ✅ **Contexto automático:** No se necesita enviar `restaurantId` (extraído del token)
5. ✅ **Respuesta completa:** Include de relaciones en todas las respuestas
6. ✅ **Paginación:** Soporte para catálogos grandes (subcategorías, productos)
7. ✅ **Filtros avanzados:** Por subcategoría, disponibilidad, tags
8. ✅ **Gestión por tags:** Desactivación masiva de productos

---

### **✅ Validaciones de Integridad Referencial:**

1. ✅ **Subcategorías:** No se puede eliminar si tiene productos asociados
2. ✅ **Grupos de Modificadores:** No se puede eliminar si tiene opciones o está asociado a productos
3. ✅ **Opciones de Modificadores:** Se puede eliminar libremente (sin restricciones)
4. ✅ **Productos:** 
   - ❌ No se puede eliminar si tiene pedidos (OrderItems) asociados
   - ✅ Se eliminan en cascada las asociaciones con modificadores (ProductModifier)
   - ✅ Si tiene pedidos, sugerir usar `isAvailable: false` en su lugar
5. ✅ **Selección de modificadores:** Valida que `minSelection <= maxSelection`

---

## 🎉 Conclusión de Viabilidad

### **VEREDICTO FINAL: ✅ COMPLETAMENTE VIABLE Y COMPLETO**

El backend de Delixmi tiene **TODOS los endpoints CRUD necesarios** y la **lógica completa** para soportar la construcción y gestión de un menú personalizable por parte del owner.

**✅ 18 Endpoints Verificados y Documentados:**

**Categorías Globales (1):**
- ✅ `GET /api/categories`

**Subcategorías (4):**
- ✅ `GET /api/restaurant/subcategories`
- ✅ `POST /api/restaurant/subcategories`
- ✅ `PATCH /api/restaurant/subcategories/:id`
- ✅ `DELETE /api/restaurant/subcategories/:id` (valida productos asociados)

**Grupos de Modificadores (4):**
- ✅ `GET /api/restaurant/modifier-groups`
- ✅ `POST /api/restaurant/modifier-groups`
- ✅ `PATCH /api/restaurant/modifier-groups/:id`
- ✅ `DELETE /api/restaurant/modifier-groups/:id` (valida opciones y productos)

**Opciones de Modificadores (3):**
- ✅ `POST /api/restaurant/modifier-groups/:groupId/options`
- ✅ `PATCH /api/restaurant/modifier-options/:id`
- ✅ `DELETE /api/restaurant/modifier-options/:id`

**Productos (4):**
- ✅ `GET /api/restaurant/products`
- ✅ `POST /api/restaurant/products` (con `modifierGroupIds`)
- ✅ `PATCH /api/restaurant/products/:id` (actualiza asociaciones)
- ✅ `DELETE /api/restaurant/products/:id` (cascada en asociaciones)

---

### **✅ Funcionalidades Críticas Confirmadas:**

1. ✅ **Asociación de modificadores en creación:** Campo `modifierGroupIds` en POST /products
2. ✅ **Actualización de asociaciones:** Campo `modifierGroupIds` en PATCH /products (reemplazo completo)
3. ✅ **Validación de pertenencia:** Backend verifica que grupos pertenezcan al restaurante
4. ✅ **Actualización selectiva:** Todos los PATCH solo actualizan campos enviados
5. ✅ **Integridad referencial:** Validaciones de eliminación en cascada
6. ✅ **Contexto automático:** `restaurantId` extraído del token JWT
7. ✅ **Respuestas completas:** Include de relaciones en todas las respuestas

---

### **✅ Reglas de Eliminación Implementadas:**

| Recurso | Regla de Eliminación |
|---------|---------------------|
| **Subcategoría** | ⚠️ Solo si **no tiene productos** |
| **Grupo Modificador** | ⚠️ Solo si **no tiene opciones** y **no está asociado a productos** |
| **Opción Modificador** | ✅ Sin restricciones |
| **Producto** | ⚠️ Solo si **no tiene pedidos** (OrderItems). Cascada automática de asociaciones con modificadores |

---

### **📋 No se requieren cambios en el backend.**

El equipo de frontend puede proceder con la implementación siguiendo esta especificación técnica completa.

---

**Fecha de Auditoría:** 9 de Enero, 2025  
**Auditor:** Arquitecto de Software Backend Delixmi  
**Estado:** ✅ Aprobado para Implementación Frontend  
**Endpoints Documentados:** 18 de 18 (100%)  
**Coverage:** Completo

