# FASE 1: SEGURIDAD, ROLES Y USUARIOS - Documentación de Endpoints

## Resumen
Esta fase incluye 8 endpoints para la gestión completa de usuarios, roles y permisos del sistema Delixmi.

---

## 1. Actualizar Estado de Usuario

### Endpoint
```
PATCH /api/admin/users/:id/status
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del usuario a actualizar
- **Body**:
```json
{
  "status": "pending" | "active" | "inactive" | "suspended" | "deleted"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Estado de usuario actualizado exitosamente",
  "data": {
    "user": {
      "id": 123,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "status": "suspended",
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
- **400**: Datos de entrada inválidos (Zod validation)
- **404**: Usuario no encontrado
- **500**: Error interno del servidor

---

## 2. Marcar Usuario como Sospechoso

### Endpoint
```
PATCH /api/admin/users/:id/suspicious
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del usuario
- **Body**:
```json
{
  "isSuspicious": true | false
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Estado de sospecha del usuario actualizado exitosamente",
  "data": {
    "user": {
      "id": 123,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "isSuspicious": true,
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
- **404**: Usuario no encontrado
- **500**: Error interno del servidor

---

## 3. Resetear Contraseña de Usuario

### Endpoint
```
POST /api/admin/users/:id/reset-password
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del usuario
- **Body**:
```json
{
  "newPassword": "NuevaContraseña123!"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Contraseña reseteada exitosamente",
  "data": {
    "user": {
      "id": 123,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "resetToken": "abc123def456ghi789",
    "updatedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Contraseña no cumple requisitos de seguridad
- **404**: Usuario no encontrado
- **500**: Error interno del servidor

---

## 4. Actualizar Permisos de Rol

### Endpoint
```
PATCH /api/admin/roles/:id/permissions
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del rol
- **Body**:
```json
{
  "permissions": [
    {
      "permissionId": 1,
      "action": "add" | "remove"
    },
    {
      "permissionId": 2,
      "action": "add"
    }
  ]
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Permisos de rol actualizados exitosamente",
  "data": {
    "changes": [
      {
        "action": "added",
        "permissionId": 1
      },
      {
        "action": "removed",
        "permissionId": 2
      }
    ],
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
- **404**: Rol no encontrado
- **500**: Error interno del servidor

---

## 5. Asignar Rol a Usuario

### Endpoint
```
POST /api/admin/users/:userId/role
```

### Parámetros de Entrada
- **URL Param**: `userId` (integer) - ID del usuario
- **Body**:
```json
{
  "roleId": 2,
  "restaurantId": 5,
  "branchId": 3
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Rol asignado exitosamente",
  "data": {
    "assignment": {
      "id": 456,
      "userId": 123,
      "roleId": 2,
      "restaurantId": 5,
      "branchId": 3,
      "role": {
        "id": 2,
        "name": "restaurant_manager",
        "displayName": "Gerente de Restaurante"
      },
      "restaurant": {
        "id": 5,
        "name": "Restaurante Ejemplo"
      }
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
- **400**: Datos de entrada inválidos
- **404**: Usuario o rol no encontrado
- **409**: El usuario ya tiene este rol asignado
- **500**: Error interno del servidor

---

## 6. Eliminar Sesiones de Usuario

### Endpoint
```
DELETE /api/admin/users/:id/sessions
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del usuario

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Sesiones eliminadas exitosamente",
  "data": {
    "deletedCount": 3,
    "deletedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **404**: Usuario no encontrado
- **500**: Error interno del servidor

---

## 7. Obtener Lista de Roles

### Endpoint
```
GET /api/admin/roles
```

### Parámetros de Entrada
- **Query Params**: Ninguno

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Lista de roles obtenida exitosamente",
  "data": {
    "roles": [
      {
        "id": 1,
        "name": "super_admin",
        "displayName": "Super Administrador",
        "description": "Acceso completo al sistema",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "permissions": [
          {
            "id": 1,
            "name": "user_management",
            "displayName": "Gestión de Usuarios",
            "module": "USERS"
          },
          {
            "id": 2,
            "name": "restaurant_management",
            "displayName": "Gestión de Restaurantes",
            "module": "RESTAURANTS"
          }
        ]
      }
    ]
  }
}
```

### Códigos de Error Esperados
- **500**: Error interno del servidor

---

## 8. Crear Nuevo Rol

### Endpoint
```
POST /api/admin/roles
```

### Parámetros de Entrada
- **Body**:
```json
{
  "name": "custom_role",
  "displayName": "Rol Personalizado",
  "description": "Descripción del rol personalizado"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Rol creado exitosamente",
  "data": {
    "role": {
      "id": 5,
      "name": "custom_role",
      "displayName": "Rol Personalizado",
      "description": "Descripción del rol personalizado",
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
- **400**: Datos de entrada inválidos
- **409**: El nombre del rol ya existe
- **500**: Error interno del servidor

---

## Notas Importantes para el Frontend

1. **Autenticación**: Todos los endpoints requieren header `Authorization: Bearer <jwt_token>`
2. **Content-Type**: Usar `application/json` para requests con body
3. **Validación**: Los errores de validación Zod retornan array de errores específicos
4. **Auditoría**: Todas las operaciones quedan registradas en el sistema de auditoría
5. **Transacciones**: Las operaciones críticas son atómicas (todo o nada)
