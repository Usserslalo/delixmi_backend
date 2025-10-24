# FASE 3: RESTAURANTES Y CATÁLOGO - Documentación de Endpoints

## Resumen
Esta fase incluye 8 endpoints para la gestión de restaurantes, categorías, productos y promociones del sistema.

---

## 1. Verificar Restaurante Manualmente

### Endpoint
```
PATCH /api/admin/restaurants/:id/verify
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del restaurante
- **Body**:
```json
{
  "isManuallyVerified": true | false
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Estado de verificación del restaurante actualizado exitosamente",
  "data": {
    "restaurant": {
      "id": 5,
      "name": "Restaurante Ejemplo",
      "isManuallyVerified": true,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "updatedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos
- **404**: Restaurante no encontrado
- **500**: Error interno del servidor

---

## 2. Actualizar Comisión de Restaurante

### Endpoint
```
PATCH /api/admin/restaurants/:id/commission
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del restaurante
- **Body**:
```json
{
  "commissionRate": 12.5
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Comisión del restaurante actualizada exitosamente",
  "data": {
    "restaurant": {
      "id": 5,
      "name": "Restaurante Ejemplo",
      "commissionRate": 12.5,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "updatedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Tasa de comisión inválida (fuera de rango 0-100)
- **404**: Restaurante no encontrado
- **500**: Error interno del servidor

---

## 3. Crear Categoría

### Endpoint
```
POST /api/admin/categories
```

### Parámetros de Entrada
- **Body**:
```json
{
  "name": "Comida Rápida",
  "imageUrl": "https://example.com/categoria-comida-rapida.jpg"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Categoría creada exitosamente",
  "data": {
    "category": {
      "id": 8,
      "name": "Comida Rápida",
      "imageUrl": "https://example.com/categoria-comida-rapida.jpg",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "createdBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos (URL inválida, nombre muy corto)
- **500**: Error interno del servidor

---

## 4. Actualizar Categoría

### Endpoint
```
PATCH /api/admin/categories/:id
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID de la categoría
- **Body** (campos opcionales):
```json
{
  "name": "Comida Rápida Actualizada",
  "imageUrl": "https://example.com/nueva-imagen-categoria.jpg"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Categoría actualizada exitosamente",
  "data": {
    "category": {
      "id": 8,
      "name": "Comida Rápida Actualizada",
      "imageUrl": "https://example.com/nueva-imagen-categoria.jpg",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "updatedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos
- **404**: Categoría no encontrada
- **500**: Error interno del servidor

---

## 5. Aprobar Promoción

### Endpoint
```
POST /api/admin/promotions/:id/approve
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID de la promoción

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Promoción aprobada exitosamente",
  "data": {
    "promotion": {
      "id": 15,
      "restaurantId": 5,
      "title": "20% de descuento",
      "description": "Descuento especial en todos los platillos",
      "discountPercentage": 20.0,
      "isActive": true,
      "approvedBy": 1,
      "approvedAt": "2024-01-15T10:30:00.000Z",
      "restaurant": {
        "id": 5,
        "name": "Restaurante Ejemplo"
      }
    },
    "approvedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **404**: Promoción no encontrada
- **500**: Error interno del servidor

---

## 6. Ajustar Stock de Producto

### Endpoint
```
POST /api/admin/products/:id/stock/adjust
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del producto
- **Body**:
```json
{
  "change": 10,
  "reason": "ORDER_SALE" | "MANUAL_ADJUSTMENT" | "RESTOCK" | "TRANSFER" | "SPOILAGE"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Stock del producto ajustado exitosamente",
  "data": {
    "product": {
      "id": 25,
      "name": "Hamburguesa Clásica",
      "stockQuantity": 45,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "adjustedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos o stock insuficiente
- **404**: Producto no encontrado
- **500**: Error interno del servidor

---

## 7. Obtener Productos Marcados

### Endpoint
```
GET /api/admin/products/flagged
```

### Parámetros de Entrada
- **Query Params**:
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Productos marcados obtenidos exitosamente",
  "data": {
    "products": [
      {
        "id": 25,
        "name": "Hamburguesa Clásica",
        "description": "Hamburguesa con carne, lechuga y tomate",
        "price": 89.50,
        "isFlagged": true,
        "stockQuantity": 45,
        "restaurant": {
          "id": 5,
          "name": "Restaurante Ejemplo",
          "status": "active"
        },
        "subcategory": {
          "id": 3,
          "name": "Hamburguesas"
        },
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

### Códigos de Error Esperados
- **500**: Error interno del servidor

---

## 8. Obtener Logs de Inventario

### Endpoint
```
GET /api/admin/inventory-logs
```

### Parámetros de Entrada
- **Query Params**:
  - `productId` (integer, opcional) - Filtrar por ID de producto
  - `reason` (string, opcional) - Filtrar por razón del cambio
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Logs de inventario obtenidos exitosamente",
  "data": {
    "logs": [
      {
        "id": 1,
        "productId": 25,
        "userId": 1,
        "change": 10,
        "newQuantity": 45,
        "reason": "MANUAL_ADJUSTMENT",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "product": {
          "id": 25,
          "name": "Hamburguesa Clásica",
          "restaurant": {
            "id": 5,
            "name": "Restaurante Ejemplo"
          }
        },
        "user": {
          "id": 1,
          "name": "Admin",
          "lastname": "Sistema",
          "email": "admin@delixmi.com"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    },
    "filters": {
      "productId": null,
      "reason": null
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

---

## Notas Importantes para el Frontend

1. **Razones de Cambio de Stock**:
   - `ORDER_SALE`: Venta de producto
   - `MANUAL_ADJUSTMENT`: Ajuste manual por admin
   - `RESTOCK`: Reabastecimiento
   - `TRANSFER`: Transferencia entre sucursales
   - `SPOILAGE`: Producto dañado/vencido

2. **Validaciones de Stock**:
   - El cambio puede ser positivo o negativo
   - No se permite stock negativo
   - Se valida que el producto exista

3. **Paginación**: Todos los endpoints de listado incluyen metadatos de paginación

4. **Imágenes**: Las URLs de imágenes deben ser válidas y accesibles

5. **Comisiones**: Rango válido 0-100% (se almacena como decimal)
