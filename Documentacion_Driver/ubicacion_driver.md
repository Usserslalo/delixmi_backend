# Ubicación del Repartidor - API Documentation

## PATCH /api/driver/location

Actualiza la ubicación GPS del repartidor en tiempo real para tracking y distribución de pedidos.

### **Headers Requeridos**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### **Middlewares Aplicados**
1. `authenticateToken` - Verificación de JWT válido
2. `requireRole(['driver_platform', 'driver_restaurant'])` - Verificación de roles de repartidor
3. `validate(updateLocationSchema)` - Validación del body con Zod

### **Esquema de Validación (Zod)**

**Archivo**: `src/validations/driver.validation.js`

```javascript
const updateLocationSchema = z.object({
  latitude: z
    .number({
      required_error: "La latitud es requerida",
      invalid_type_error: "La latitud debe ser un número"
    })
    .min(-90, 'La latitud debe ser mayor o igual a -90')
    .max(90, 'La latitud debe ser menor o igual a 90'),

  longitude: z
    .number({
      required_error: "La longitud es requerida", 
      invalid_type_error: "La longitud debe ser un número"
    })
    .min(-180, 'La longitud debe ser mayor o igual a -180')
    .max(180, 'La longitud debe ser menor o igual a 180')
});
```

### **Lógica Detallada**

#### **Controlador**
**Archivo**: `src/controllers/driver.controller.js`

```javascript
const updateDriverLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const locationData = {
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };

    // Llamar al método del repositorio para actualizar ubicación
    const result = await DriverRepository.updateDriverLocation(
      userId, 
      locationData, 
      req.id
    );

    // Respuesta exitosa usando ResponseService
    return ResponseService.success(
      res,
      'Ubicación actualizada exitosamente',
      {
        profile: result.profile,
        locationUpdate: result.locationUpdate
      },
      200
    );

  } catch (error) {
    // Manejo de errores específicos del repositorio
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }

    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    // Error interno del servidor
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};
```

#### **Repositorio**
**Archivo**: `src/repositories/driver.repository.js`

```javascript
static async updateDriverLocation(userId, locationData, requestId) {
  try {
    // 1. Validar que el usuario tenga roles de repartidor
    const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
    if (!userWithRoles) {
      throw {
        status: 404,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
    }

    // 2. Verificar roles de repartidor
    const driverRoles = ['driver_platform', 'driver_restaurant'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

    if (!hasDriverRole) {
      throw {
        status: 403,
        message: 'Acceso denegado. Se requieren permisos de repartidor',
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    // 3. Buscar el perfil del repartidor
    const existingDriverProfile = await prisma.driverProfile.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!existingDriverProfile) {
      throw {
        status: 404,
        message: 'Perfil de repartidor no encontrado',
        code: 'DRIVER_PROFILE_NOT_FOUND',
        details: {
          userId: userId,
          suggestion: 'Contacta al administrador para crear tu perfil de repartidor'
        }
      };
    }

    // 4. Actualizar la ubicación del repartidor
    const updatedDriverProfile = await prisma.driverProfile.update({
      where: { userId: userId },
      data: {
        currentLatitude: parseFloat(locationData.latitude),
        currentLongitude: parseFloat(locationData.longitude),
        lastSeenAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // 5. Formatear y devolver respuesta
    return {
      profile: formattedProfile,
      locationUpdate: {
        previousLocation: { /* ubicación anterior */ },
        newLocation: { /* nueva ubicación */ },
        updatedAt: updatedDriverProfile.lastSeenAt
      }
    };

  } catch (error) {
    // Manejo de errores específicos de Prisma y re-lanzar errores estructurados
    if (error.code === 'P2025') {
      throw {
        status: 404,
        message: 'Perfil de repartidor no encontrado',
        code: 'DRIVER_PROFILE_NOT_FOUND'
      };
    }

    if (error.code === 'P2002') {
      throw {
        status: 409,
        message: 'Conflicto en la actualización de ubicación',
        code: 'LOCATION_UPDATE_CONFLICT'
      };
    }

    throw {
      status: 500,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    };
  }
}
```

### **Payload de Ejemplo**

```json
{
  "latitude": 20.4855,
  "longitude": -99.2175
}
```

### **Ejemplo de Respuesta Exitosa**

```json
{
  "status": "success",
  "message": "Ubicación actualizada exitosamente",
  "timestamp": "2025-10-20T19:56:48.770Z",
  "data": {
    "profile": {
      "userId": 4,
      "vehicleType": "motorcycle",
      "licensePlate": "HGO-ABC-123",
      "status": "online",
      "currentLocation": {
        "latitude": 20.4855,
        "longitude": -99.2175
      },
      "lastSeenAt": "2025-10-20T19:56:48.343Z",
      "kycStatus": "approved",
      "user": {
        "id": 4,
        "name": "Miguel",
        "lastname": "Hernández",
        "email": "miguel.hernandez@repartidor.com",
        "phone": "5555555555"
      },
      "createdAt": "2025-10-20T18:53:42.928Z",
      "updatedAt": "2025-10-20T19:56:48.343Z"
    },
    "locationUpdate": {
      "previousLocation": {
        "latitude": 20.4895,
        "longitude": -99.232
      },
      "newLocation": {
        "latitude": 20.4855,
        "longitude": -99.2175
      },
      "updatedAt": "2025-10-20T19:56:48.343Z"
    }
  }
}
```

### **Manejo de Errores**

#### **400 Bad Request - Validación Zod fallida**
```json
{
  "status": "error",
  "message": "Datos de ubicación inválidos",
  "timestamp": "2025-01-20T16:45:30.123Z",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["latitude"],
      "message": "La latitud debe ser un número"
    }
  ]
}
```

#### **401 Unauthorized - Token inválido**
```json
{
  "status": "error",
  "message": "Token inválido o expirado",
  "timestamp": "2025-01-20T16:45:30.123Z",
  "code": "INVALID_TOKEN"
}
```

#### **403 Forbidden - Sin permisos de repartidor**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de repartidor",
  "timestamp": "2025-01-20T16:45:30.123Z",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

#### **404 Not Found - Perfil de repartidor no encontrado**
```json
{
  "status": "error",
  "message": "Perfil de repartidor no encontrado",
  "timestamp": "2025-01-20T16:45:30.123Z",
  "code": "DRIVER_PROFILE_NOT_FOUND",
  "details": {
    "userId": 3,
    "suggestion": "Contacta al administrador para crear tu perfil de repartidor"
  }
}
```

#### **409 Conflict - Conflicto en actualización**
```json
{
  "status": "error",
  "message": "Conflicto en la actualización de ubicación",
  "timestamp": "2025-01-20T16:45:30.123Z",
  "code": "LOCATION_UPDATE_CONFLICT"
}
```

#### **500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "timestamp": "2025-01-20T16:45:30.123Z",
  "code": "INTERNAL_ERROR"
}
```

### **Características Técnicas**

- **Validación**: Zod con esquemas robustos para coordenadas GPS
- **Arquitectura**: Patrón Repository para separación de responsabilidades
- **Logging**: Estructurado con `requestId` para trazabilidad
- **Errores**: Manejo consistente con `ResponseService`
- **Performance**: Respuesta rápida optimizada para tracking en tiempo real
- **Seguridad**: Verificación de roles y autenticación JWT
- **Base de Datos**: Actualización atómica con Prisma ORM

### **Casos de Uso**

1. **Tracking en Tiempo Real**: Aplicación móvil enviando ubicación cada 30 segundos
2. **Distribución de Pedidos**: Actualización antes de buscar pedidos disponibles
3. **Navegación**: Actualización continua durante entrega de pedidos
4. **Presencia**: Mantener `lastSeenAt` actualizado para estadísticas

### **🧪 Prueba Exitosa Realizada**

**Endpoint**: `PATCH https://delixmi-backend.onrender.com/api/driver/location`

**Usuario**: Repartidor Miguel Hernández (ID: 4, rol: `driver_platform`)

**Payload Enviado**:
```json
{
  "latitude": 20.4855,
  "longitude": -99.2175
}
```

**Resultado**: ✅ **EXITOSO** - Status 200

**Validaciones Pasadas**:
- ✅ Autenticación JWT válida
- ✅ Rol de repartidor verificado (`driver_platform`)
- ✅ Validación Zod de coordenadas (latitude: 20.4855, longitude: -99.2175)
- ✅ Existencia del `DriverProfile` confirmada
- ✅ Actualización exitosa de `currentLatitude`, `currentLongitude` y `lastSeenAt`

**Cambios Realizados**:
- **Ubicación anterior**: 20.4895, -99.232
- **Nueva ubicación**: 20.4855, -99.2175
- **Timestamp de actualización**: 2025-10-20T19:56:48.343Z

**Logs de Audiencia**:
```json
{
  "level": "info",
  "message": "Ubicación del repartidor actualizada exitosamente",
  "requestId": "923a5c0e-fb4d-429a-807c-bb731de794e9",
  "meta": {
    "userId": 4,
    "previousLocation": { "latitude": "20.4895", "longitude": "-99.232" },
    "newLocation": { "latitude": "20.4855", "longitude": "-99.2175" },
    "updatedAt": "2025-10-20T19:56:48.343Z"
  }
}
```

Esta prueba confirma que el endpoint refactorizado funciona correctamente con la nueva arquitectura Repository + Zod, proporcionando logging estructurado y manejo de errores robusto.
