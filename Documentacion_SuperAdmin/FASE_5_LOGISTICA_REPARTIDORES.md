# FASE 5: LOGÍSTICA Y REPARTIDORES - Documentación de Endpoints

## Resumen
Esta fase incluye 6 endpoints para la gestión de repartidores, KYC, asignaciones y seguimiento logístico del sistema.

---

## 1. Actualizar KYC de Repartidor

### Endpoint
```
PATCH /api/admin/drivers/:id/kyc
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del repartidor
- **Body** (campos opcionales):
```json
{
  "kycStatus": "pending" | "approved" | "rejected" | "under_review",
  "rfc": "GARC123456ABC",
  "domicilioFiscal": "Calle Principal 123, Colonia Centro, CP 12345",
  "opcionPagoDefinitivo": true
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "KYC del repartidor actualizado exitosamente",
  "data": {
    "profile": {
      "userId": 7,
      "kycStatus": "approved",
      "rfc": "GARC123456ABC",
      "domicilioFiscal": "Calle Principal 123, Colonia Centro, CP 12345",
      "opcionPagoDefinitivo": true,
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
- **400**: Datos de entrada inválidos (RFC inválido, KYC status incorrecto)
- **404**: Repartidor no encontrado
- **500**: Error interno del servidor

---

## 2. Bloquear/Desbloquear Repartidor

### Endpoint
```
PATCH /api/admin/drivers/:id/block
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del repartidor
- **Body**:
```json
{
  "isBlocked": true | false
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Repartidor bloqueado exitosamente",
  "data": {
    "profile": {
      "userId": 7,
      "isBlocked": true,
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
- **404**: Repartidor no encontrado
- **500**: Error interno del servidor

---

## 3. Forzar Asignación de Repartidor

### Endpoint
```
POST /api/admin/orders/:orderId/driver/:driverId
```

### Parámetros de Entrada
- **URL Param**: 
  - `orderId` (integer) - ID de la orden
  - `driverId` (integer) - ID del repartidor

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Repartidor asignado forzosamente a la orden",
  "data": {
    "order": {
      "id": "123456789",
      "deliveryDriverId": 7,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "assignedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **404**: Orden o repartidor no encontrado
- **500**: Error interno del servidor

---

## 4. Obtener Repartidores con KYC Pendiente

### Endpoint
```
GET /api/admin/drivers/kyc/pending
```

### Parámetros de Entrada
- **Query Params**:
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Repartidores con KYC pendiente obtenidos exitosamente",
  "data": {
    "drivers": [
      {
        "userId": 7,
        "kycStatus": "pending",
        "rfc": null,
        "domicilioFiscal": null,
        "opcionPagoDefinitivo": false,
        "createdAt": "2024-01-10T08:00:00.000Z",
        "user": {
          "id": 7,
          "name": "Carlos",
          "lastname": "García",
          "email": "carlos.garcia@email.com",
          "phone": "+525512345678",
          "createdAt": "2024-01-10T08:00:00.000Z"
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
    }
  }
}
```

### Códigos de Error Esperados
- **500**: Error interno del servidor

---

## 5. Obtener Logs de Ruta de Orden

### Endpoint
```
GET /api/admin/orders/:orderId/route-logs
```

### Parámetros de Entrada
- **URL Param**: `orderId` (integer) - ID de la orden

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Logs de ruta obtenidos exitosamente",
  "data": {
    "order": {
      "id": "123456789",
      "status": "in_transit"
    },
    "routeLogs": [
      {
        "id": 1,
        "orderId": "123456789",
        "driverId": 7,
        "latitude": 19.4326,
        "longitude": -99.1332,
        "address": "Calle Principal 123, Colonia Centro",
        "timestamp": "2024-01-15T10:00:00.000Z",
        "driver": {
          "id": 7,
          "name": "Carlos",
          "lastname": "García"
        }
      },
      {
        "id": 2,
        "orderId": "123456789",
        "driverId": 7,
        "latitude": 19.4426,
        "longitude": -99.1432,
        "address": "Restaurante Ejemplo, Calle Comercial 456",
        "timestamp": "2024-01-15T10:15:00.000Z",
        "driver": {
          "id": 7,
          "name": "Carlos",
          "lastname": "García"
        }
      }
    ]
  }
}
```

### Códigos de Error Esperados
- **404**: Orden no encontrada
- **500**: Error interno del servidor

---

## 6. Obtener Asignaciones de Repartidor para Orden

### Endpoint
```
GET /api/admin/orders/:orderId/assignments
```

### Parámetros de Entrada
- **URL Param**: `orderId` (integer) - ID de la orden

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Asignaciones de repartidor obtenidas exitosamente",
  "data": {
    "order": {
      "id": "123456789",
      "status": "in_transit",
      "currentDriverId": 7
    },
    "assignments": [
      {
        "id": 1,
        "orderId": "123456789",
        "driverId": 7,
        "status": "ACCEPTED",
        "rejectionReason": "NONE",
        "assignedAt": "2024-01-15T10:00:00.000Z",
        "respondedAt": "2024-01-15T10:01:00.000Z",
        "responseTimeSeconds": 60,
        "isAutoAssigned": false,
        "driver": {
          "id": 7,
          "name": "Carlos",
          "lastname": "García",
          "phone": "+525512345678"
        }
      },
      {
        "id": 2,
        "orderId": "123456789",
        "driverId": 5,
        "status": "REJECTED",
        "rejectionReason": "TOO_FAR",
        "assignedAt": "2024-01-15T09:55:00.000Z",
        "respondedAt": "2024-01-15T09:58:00.000Z",
        "responseTimeSeconds": 180,
        "isAutoAssigned": true,
        "driver": {
          "id": 5,
          "name": "Ana",
          "lastname": "López",
          "phone": "+525598765432"
        }
      }
    ]
  }
}
```

### Códigos de Error Esperados
- **404**: Orden no encontrada
- **500**: Error interno del servidor

---

## Estados de KYC

- `pending`: Pendiente de revisión
- `approved`: Aprobado
- `rejected`: Rechazado
- `under_review`: En revisión

## Estados de Asignación

- `ACCEPTED`: Aceptada por el repartidor
- `REJECTED`: Rechazada por el repartidor
- `EXPIRED`: Expirada (sin respuesta)

## Razones de Rechazo

- `NONE`: Sin rechazo (aceptada)
- `TOO_FAR`: Muy lejos
- `BUSY`: Ocupado
- `NOT_AVAILABLE`: No disponible
- `OTHER`: Otra razón

## Notas Importantes para el Frontend

1. **KYC**: El RFC debe seguir formato mexicano válido
2. **Coordenadas**: Latitud (-90 a 90) y Longitud (-180 a 180)
3. **Tiempo de Respuesta**: Se calcula automáticamente en segundos
4. **Asignaciones**: Se ordenan por fecha de asignación (más reciente primero)
5. **Logs de Ruta**: Se ordenan cronológicamente (más antiguo primero)
6. **Bloqueo**: Los repartidores bloqueados no pueden recibir nuevas asignaciones
