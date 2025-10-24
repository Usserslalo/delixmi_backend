# FASE 6: SOPORTE, AUDITORÍA Y COMMS - Documentación de Endpoints

## Resumen
Esta fase incluye 7 endpoints para la gestión de soporte al cliente, auditoría del sistema y comunicaciones masivas.

---

## 1. Actualizar Estado de Queja

### Endpoint
```
PATCH /api/admin/complaints/:id/status
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID de la queja
- **Body**:
```json
{
  "status": "pending" | "resolved" | "closed"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Estado de queja actualizado exitosamente",
  "data": {
    "complaint": {
      "id": 15,
      "subject": "Problema con mi pedido",
      "description": "Mi pedido llegó frío y con ingredientes incorrectos",
      "status": "resolved",
      "priority": "medium",
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "user": {
        "id": 25,
        "name": "María",
        "lastname": "González",
        "email": "maria.gonzalez@email.com"
      },
      "restaurant": {
        "id": 3,
        "name": "Restaurante Ejemplo"
      },
      "driverProfile": null
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
- **400**: Estado de queja inválido
- **404**: Queja no encontrada
- **500**: Error interno del servidor

---

## 2. Enviar Mensaje

### Endpoint
```
POST /api/admin/messages/send
```

### Parámetros de Entrada
- **Body**:
```json
{
  "recipientId": 25,
  "restaurantId": 3,
  "subject": "Actualización sobre tu queja",
  "body": "Hemos revisado tu queja y hemos tomado las medidas necesarias para resolver el problema.",
  "isGlobal": false
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Mensaje enviado exitosamente",
  "data": {
    "message": {
      "id": 45,
      "senderId": 1,
      "recipientId": 25,
      "restaurantId": 3,
      "subject": "Actualización sobre tu queja",
      "body": "Hemos revisado tu queja y hemos tomado las medidas necesarias para resolver el problema.",
      "type": "system",
      "isGlobal": false,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "sentBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos (asunto muy corto, mensaje muy corto)
- **500**: Error interno del servidor

---

## 3. Crear Notificación Masiva

### Endpoint
```
POST /api/admin/notifications/broadcast
```

### Parámetros de Entrada
- **Body**:
```json
{
  "title": "Mantenimiento Programado",
  "message": "El sistema estará en mantenimiento el domingo de 2-4 AM",
  "type": "SYSTEM_ALERT",
  "userIds": [25, 30, 35],
  "restaurantIds": [3, 5, 7]
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Notificación masiva enviada exitosamente",
  "data": {
    "sentCount": 150,
    "notifications": [
      {
        "id": 1001,
        "userId": 25,
        "title": "Mantenimiento Programado",
        "message": "El sistema estará en mantenimiento el domingo de 2-4 AM",
        "type": "SYSTEM_ALERT",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "sentBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos (título muy corto, tipo inválido)
- **500**: Error interno del servidor

---

## 4. Obtener Logs de Auditoría

### Endpoint
```
GET /api/admin/audit-logs
```

### Parámetros de Entrada
- **Query Params**:
  - `entity` (string, opcional) - Filtrar por entidad
  - `userId` (integer, opcional) - Filtrar por ID de usuario
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Logs de auditoría obtenidos exitosamente",
  "data": {
    "logs": [
      {
        "id": 1,
        "userId": 1,
        "action": "UPDATE_USER_STATUS",
        "entity": "USER",
        "entityId": "123",
        "details": {
          "previousStatus": "active",
          "newStatus": "suspended",
          "targetUser": {
            "id": 123,
            "name": "Juan",
            "lastname": "Pérez"
          }
        },
        "createdAt": "2024-01-15T10:30:00.000Z",
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
      "entity": null,
      "userId": null
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

---

## 5. Obtener Quejas

### Endpoint
```
GET /api/admin/complaints
```

### Parámetros de Entrada
- **Query Params**:
  - `status` (string, opcional) - Filtrar por estado
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Quejas obtenidas exitosamente",
  "data": {
    "complaints": [
      {
        "id": 15,
        "subject": "Problema con mi pedido",
        "description": "Mi pedido llegó frío y con ingredientes incorrectos",
        "status": "pending",
        "priority": "medium",
        "createdAt": "2024-01-15T08:00:00.000Z",
        "updatedAt": "2024-01-15T08:00:00.000Z",
        "user": {
          "id": 25,
          "name": "María",
          "lastname": "González",
          "email": "maria.gonzalez@email.com"
        },
        "restaurant": {
          "id": 3,
          "name": "Restaurante Ejemplo"
        },
        "driverProfile": null
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
      "status": null
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

---

## 6. Obtener Calificaciones Reportadas

### Endpoint
```
GET /api/admin/ratings/reported
```

### Parámetros de Entrada
- **Query Params**:
  - `page` (integer, opcional) - Número de página (default: 1)
  - `pageSize` (integer, opcional) - Tamaño de página (default: 10)

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Calificaciones reportadas obtenidas exitosamente",
  "data": {
    "ratings": [
      {
        "id": 8,
        "orderId": "123456789",
        "rating": 1,
        "comment": "Muy mal servicio, comida fría",
        "isReported": true,
        "createdAt": "2024-01-15T09:00:00.000Z",
        "order": {
          "id": "123456789",
          "total": 150.50,
          "status": "completed"
        },
        "restaurant": {
          "id": 3,
          "name": "Restaurante Ejemplo"
        },
        "customer": {
          "id": 25,
          "name": "María",
          "lastname": "González",
          "email": "maria.gonzalez@email.com"
        },
        "driver": {
          "id": 7,
          "name": "Carlos",
          "lastname": "García"
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

## Tipos de Entidades de Auditoría

- `USER`: Usuario
- `RESTAURANT`: Restaurante
- `ORDER`: Orden
- `TRANSACTION`: Transacción
- `DRIVER`: Repartidor
- `CONFIG`: Configuración
- `COMPLAINT`: Queja
- `RATING`: Calificación
- `MESSAGE`: Mensaje
- `PROMOTION`: Promoción
- `SERVICE_AREA`: Área de servicio
- `INVENTORY_LOG`: Log de inventario
- `DRIVER_LOG`: Log de repartidor
- `NOTIFICATION`: Notificación
- `RESTAURANT_CONFIG`: Configuración de restaurante
- `RESTAURANT_SCHEDULE`: Horario de restaurante
- `ROUTE_LOG`: Log de ruta

## Tipos de Notificaciones

- `ORDER_UPDATE`: Actualización de orden
- `PROMOTION`: Promoción
- `SYSTEM_ALERT`: Alerta del sistema
- `DRIVER_PAYOUT`: Pago a repartidor
- `RESTAURANT_PAYOUT`: Pago a restaurante
- `DRIVER_ASSIGNMENT`: Asignación de repartidor
- `RESTAURANT_UPDATE`: Actualización de restaurante

## Estados de Quejas

- `pending`: Pendiente
- `resolved`: Resuelta
- `closed`: Cerrada

## Notas Importantes para el Frontend

1. **Mensajes Globales**: Si `isGlobal` es true, no se requiere `recipientId` ni `restaurantId`
2. **Notificaciones Masivas**: Si no se especifican `userIds` ni `restaurantIds`, se envía a todos los usuarios activos
3. **Auditoría**: Los logs se ordenan por fecha de creación (más reciente primero)
4. **Filtros**: Los filtros se aplican de forma combinada (AND)
5. **Paginación**: Todos los endpoints de listado incluyen metadatos de paginación
6. **Detalles de Auditoría**: El campo `details` contiene información específica de cada acción
