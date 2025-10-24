# FASE 4: FINANZAS Y BILLETERAS - Documentación de Endpoints

## Resumen
Esta fase incluye 7 endpoints para la gestión completa de finanzas, billeteras y transacciones del sistema.

---

## 1. Actualizar Estado de Pago de Orden

### Endpoint
```
PATCH /api/admin/orders/:id/payment/status
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID de la orden
- **Body**:
```json
{
  "paymentStatus": "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Estado de pago actualizado exitosamente",
  "data": {
    "order": {
      "id": "123456789",
      "paymentStatus": "completed",
      "total": 150.50,
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
- **400**: Estado de pago inválido
- **404**: Orden no encontrada
- **500**: Error interno del servidor

---

## 2. Procesar Pagos a Restaurantes

### Endpoint
```
POST /api/admin/wallets/restaurants/payouts/process
```

### Parámetros de Entrada
- **Body**: Ninguno (procesa automáticamente todas las transacciones pendientes)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Pagos a restaurantes procesados exitosamente",
  "data": {
    "processedCount": 15,
    "transactions": [
      {
        "id": 1,
        "walletId": 5,
        "type": "RESTAURANT_ORDER_CREDIT",
        "amount": 125.50,
        "balanceAfter": 125.50,
        "isPaidOut": true,
        "paidOutAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "processedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **500**: Error interno del servidor

---

## 3. Ajustar Billetera de Restaurante

### Endpoint
```
POST /api/admin/wallets/restaurants/:id/adjust
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del restaurante
- **Body**:
```json
{
  "amount": 150.75,
  "description": "Ajuste manual por promoción especial"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Billetera de restaurante ajustada exitosamente",
  "data": {
    "wallet": {
      "id": 5,
      "restaurantId": 3,
      "balance": 275.25,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "transaction": {
      "id": 25,
      "walletId": 5,
      "type": "ADJUSTMENT_CREDIT",
      "amount": 150.75,
      "balanceAfter": 275.25,
      "description": "Ajuste manual por promoción especial",
      "createdAt": "2024-01-15T10:30:00.000Z"
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
- **400**: Monto inválido o descripción muy corta
- **404**: Restaurante no encontrado
- **500**: Error interno del servidor

---

## 4. Procesar Pagos a Repartidores

### Endpoint
```
POST /api/admin/wallets/drivers/payouts/process
```

### Parámetros de Entrada
- **Body**: Ninguno (procesa automáticamente todas las transacciones pendientes)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Pagos a repartidores procesados exitosamente",
  "data": {
    "processedCount": 8,
    "transactions": [
      {
        "id": 1,
        "walletId": 3,
        "type": "DRIVER_DELIVERY_FEE_CREDIT",
        "amount": 45.00,
        "balanceAfter": 45.00,
        "isPaidOut": true,
        "paidOutAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z"
      }
    ],
    "processedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **500**: Error interno del servidor

---

## 5. Ajustar Billetera de Repartidor

### Endpoint
```
POST /api/admin/wallets/drivers/:id/adjust
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del repartidor
- **Body**:
```json
{
  "amount": -25.00,
  "description": "Penalización por entrega tardía"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Billetera de repartidor ajustada exitosamente",
  "data": {
    "wallet": {
      "id": 3,
      "driverId": 7,
      "balance": 20.00,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "transaction": {
      "id": 26,
      "walletId": 3,
      "type": "ADJUSTMENT_DEBIT",
      "amount": 25.00,
      "balanceAfter": 20.00,
      "description": "Penalización por entrega tardía",
      "createdAt": "2024-01-15T10:30:00.000Z"
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
- **400**: Monto inválido o descripción muy corta
- **404**: Repartidor no encontrado
- **500**: Error interno del servidor

---

## 6. Obtener Transacciones de Billetera de Restaurantes

### Endpoint
```
GET /api/admin/wallets/restaurants/transactions
```

### Parámetros de Entrada
- **Query Params**:
  - `restaurantId` (integer, opcional) - Filtrar por ID de restaurante
  - `isPaidOut` (boolean, opcional) - Filtrar por estado de pago
  - `type` (string, opcional) - Filtrar por tipo de transacción
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Transacciones de billetera de restaurantes obtenidas exitosamente",
  "data": {
    "transactions": [
      {
        "id": 1,
        "walletId": 5,
        "type": "RESTAURANT_ORDER_CREDIT",
        "amount": 125.50,
        "balanceAfter": 125.50,
        "isPaidOut": true,
        "paidOutAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z",
        "wallet": {
          "id": 5,
          "restaurantId": 3,
          "restaurant": {
            "id": 3,
            "name": "Restaurante Ejemplo"
          }
        },
        "order": {
          "id": "123456789",
          "total": 150.50,
          "status": "completed"
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
      "restaurantId": null,
      "isPaidOut": null,
      "type": null
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

---

## 7. Obtener Transacciones de Billetera de Repartidores

### Endpoint
```
GET /api/admin/wallets/drivers/transactions
```

### Parámetros de Entrada
- **Query Params**:
  - `driverId` (integer, opcional) - Filtrar por ID de repartidor
  - `isPaidOut` (boolean, opcional) - Filtrar por estado de pago
  - `type` (string, opcional) - Filtrar por tipo de transacción
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Transacciones de billetera de repartidores obtenidas exitosamente",
  "data": {
    "transactions": [
      {
        "id": 1,
        "walletId": 3,
        "type": "DRIVER_DELIVERY_FEE_CREDIT",
        "amount": 45.00,
        "balanceAfter": 45.00,
        "isPaidOut": true,
        "paidOutAt": "2024-01-15T10:30:00.000Z",
        "createdAt": "2024-01-15T09:00:00.000Z",
        "wallet": {
          "id": 3,
          "driverId": 7,
          "driver": {
            "id": 7,
            "name": "Carlos",
            "lastname": "García"
          }
        },
        "order": {
          "id": "123456789",
          "total": 150.50,
          "status": "completed"
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
      "driverId": null,
      "isPaidOut": null,
      "type": null
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

---

## Tipos de Transacciones

### Restaurantes
- `RESTAURANT_ORDER_CREDIT`: Crédito por venta de orden
- `RESTAURANT_PAYOUT_DEBIT`: Débito por pago procesado
- `RESTAURANT_REFUND_DEBIT`: Débito por reembolso
- `RESTAURANT_PLATFORM_FEE_DEBIT`: Débito por comisión de plataforma
- `ADJUSTMENT_CREDIT`: Ajuste positivo manual
- `ADJUSTMENT_DEBIT`: Ajuste negativo manual

### Repartidores
- `DRIVER_DELIVERY_FEE_CREDIT`: Crédito por tarifa de entrega
- `DRIVER_TIPS_CREDIT`: Crédito por propinas
- `DRIVER_PAYOUT_DEBIT`: Débito por pago procesado
- `DRIVER_PENALTY_DEBIT`: Débito por penalización
- `ADJUSTMENT_CREDIT`: Ajuste positivo manual
- `ADJUSTMENT_DEBIT`: Ajuste negativo manual

## Notas Importantes para el Frontend

1. **Transacciones Atómicas**: Todos los ajustes de billetera son transaccionales
2. **Montos**: Pueden ser positivos o negativos (crédito/débito)
3. **Procesamiento de Pagos**: Los endpoints de procesamiento son idempotentes
4. **Filtros**: Los filtros se aplican de forma combinada (AND)
5. **Paginación**: Incluye metadatos completos de navegación
6. **Auditoría**: Todas las transacciones quedan registradas para auditoría
