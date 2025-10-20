# 📋 Perfil del Repartidor - Driver Module

## **GET /api/driver/profile**

Obtiene el perfil completo del repartidor autenticado, incluyendo tanto los datos del usuario como los datos específicos del repartidor (DriverProfile).

---

### **🔐 Middlewares Aplicados**

1. **`authenticateToken`**: Verifica el token JWT del usuario
2. **`requireRole(['driver_platform', 'driver_restaurant'])`**: Asegura que el usuario tenga permisos de repartidor

---

### **⚙️ Lógica Detallada**

#### **Controller**
```javascript
// src/controllers/driver.controller.js
const getDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await DriverRepository.getDriverProfile(userId, req.id);

    return ResponseService.success(
      res,
      'Perfil del repartidor obtenido exitosamente',
      { profile },
      200
    );

  } catch (error) {
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

#### **Repository**
```javascript
// src/repositories/driver.repository.js
static async getDriverProfile(userId, requestId) {
  try {
    // 1. Buscar el perfil del repartidor con datos del usuario
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true,
            status: true
          }
        }
      }
    });

    // 2. Validar que el perfil existe
    if (!driverProfile) {
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

    // 3. Formatear el perfil combinando datos de user y driverProfile
    const formattedProfile = {
      userId: driverProfile.userId,
      vehicleType: driverProfile.vehicleType,
      licensePlate: driverProfile.licensePlate,
      status: driverProfile.status,
      currentLocation: {
        latitude: driverProfile.currentLatitude ? Number(driverProfile.currentLatitude) : null,
        longitude: driverProfile.currentLongitude ? Number(driverProfile.currentLongitude) : null
      },
      lastSeenAt: driverProfile.lastSeenAt,
      kycStatus: driverProfile.kycStatus,
      user: {
        id: driverProfile.user.id,
        name: driverProfile.user.name,
        lastname: driverProfile.user.lastname,
        fullName: `${driverProfile.user.name} ${driverProfile.user.lastname}`,
        email: driverProfile.user.email,
        phone: driverProfile.user.phone,
        status: driverProfile.user.status
      },
      createdAt: driverProfile.createdAt,
      updatedAt: driverProfile.updatedAt
    };

    return formattedProfile;

  } catch (error) {
    // Manejo de errores específicos y logging
  }
}
```

---

### **🔧 Características Implementadas**

#### **1. Consulta Combinada**
- Busca el `DriverProfile` por `userId`
- Incluye automáticamente los datos del `User` relacionado
- Validación robusta de existencia del perfil

#### **2. Formateo Completo**
- Combina datos de `User` y `DriverProfile` en un solo objeto
- Conversión automática de `Decimal` a `Number` para coordenadas
- Generación de `fullName` combinando nombre y apellido

#### **3. Logging Estructurado**
- Logs de debug para inicio de búsqueda
- Logs de info con datos relevantes del perfil encontrado
- Logs de error específicos para perfil no encontrado

---

### **📊 Ejemplo de Respuesta Exitosa**

```json
{
  "status": "success",
  "message": "Perfil del repartidor obtenido exitosamente",
  "timestamp": "2025-01-XX...",
  "data": {
    "profile": {
      "userId": 4,
      "vehicleType": "motocicleta",
      "licensePlate": "ABC-123",
      "status": "online",
      "currentLocation": {
        "latitude": 20.489500,
        "longitude": -99.232000
      },
      "lastSeenAt": "2025-01-XX...T10:30:45.123Z",
      "kycStatus": "verified",
      "user": {
        "id": 4,
        "name": "Miguel",
        "lastname": "Hernández",
        "fullName": "Miguel Hernández",
        "email": "miguel.hernandez@repartidor.com",
        "phone": "5555555555",
        "status": "active"
      },
      "createdAt": "2025-01-XX...T08:15:30.456Z",
      "updatedAt": "2025-01-XX...T10:30:45.123Z"
    }
  }
}
```

**Campos del Perfil**:
- **`userId`**: ID del usuario (clave primaria del DriverProfile)
- **`vehicleType`**: Tipo de vehículo del repartidor
- **`licensePlate`**: Placa del vehículo
- **`status`**: Estado actual del repartidor (`online`, `offline`, `busy`, `unavailable`)
- **`currentLocation`**: Coordenadas GPS actuales (pueden ser null)
- **`lastSeenAt`**: Última vez que se actualizó la ubicación
- **`kycStatus`**: Estado de verificación KYC (`pending`, `verified`, `rejected`)
- **`user`**: Datos completos del usuario asociado
- **`createdAt`**: Fecha de creación del perfil
- **`updatedAt`**: Última actualización del perfil

---

### **❌ Manejo de Errores**

#### **401 Unauthorized - Token Inválido**
```json
{
  "status": "error",
  "message": "Token no válido",
  "code": "INVALID_TOKEN",
  "timestamp": "2025-01-XX..."
}
```

#### **403 Forbidden - Sin Permisos de Repartidor**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de repartidor",
  "code": "INSUFFICIENT_PERMISSIONS",
  "timestamp": "2025-01-XX..."
}
```

#### **404 Not Found - Perfil No Encontrado**
```json
{
  "status": "error",
  "message": "Perfil de repartidor no encontrado",
  "code": "DRIVER_PROFILE_NOT_FOUND",
  "details": {
    "userId": 123,
    "suggestion": "Contacta al administrador para crear tu perfil de repartidor"
  },
  "timestamp": "2025-01-XX..."
}
```

#### **500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-XX..."
}
```

---

### **📋 Casos de Uso**

1. **Verificación de Estado**: El repartidor puede consultar su estado actual (`online`, `busy`, etc.)
2. **Información de Contacto**: Acceso a datos de usuario (nombre, email, teléfono)
3. **Datos del Vehículo**: Consulta tipo de vehículo y placa
4. **Ubicación Actual**: Ver última ubicación GPS registrada
5. **Estado KYC**: Verificar estado de verificación de documentos
6. **Datos de Perfil**: Acceso completo a información del perfil de repartidor

---

### **🔒 Seguridad**

- **Autenticación Requerida**: Token JWT válido
- **Autorización**: Solo usuarios con roles `driver_platform` o `driver_restaurant`
- **Aislamiento**: Cada repartidor solo puede ver su propio perfil
- **Validación**: Verificación robusta de existencia del perfil

Este endpoint proporciona al repartidor acceso completo a su información de perfil, combinando datos del usuario y datos específicos del repartidor en una respuesta estructurada y fácil de usar.
