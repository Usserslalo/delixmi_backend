# Documentación - Gestión de Estado del Repartidor

## PATCH /api/driver/status

Actualiza el estado de disponibilidad del repartidor autenticado.

### Middlewares

| Middleware | Descripción |
|------------|-------------|
| `authenticateToken` | Verifica que el usuario esté autenticado con JWT válido |
| `requireRole(['driver_platform', 'driver_restaurant'])` | Verifica que el usuario tenga rol de repartidor |

### Esquema Zod

**Archivo:** `src/validations/driver.validation.js`

```javascript
const updateDriverStatusSchema = z.object({
  status: z.nativeEnum(DriverStatus, {
    required_error: "El estado del repartidor es requerido",
    invalid_type_error: "Estado inválido. Los estados permitidos son: online, offline, busy, unavailable"
  })
});
```

**Estados permitidos:**
- `online` - Repartidor disponible para recibir pedidos
- `offline` - Repartidor no disponible
- `busy` - Repartidor ocupado con una entrega actual
- `unavailable` - Repartidor temporalmente no disponible

### Lógica

#### Controlador (`src/controllers/driver.controller.js`)

```javascript
const updateDriverStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status: newStatus } = req.body;

    // Llamar al método del repositorio para actualizar el estado
    const result = await DriverRepository.updateDriverStatus(
      userId, 
      newStatus, 
      req.id
    );

    // Respuesta exitosa usando ResponseService
    return ResponseService.success(res, `Estado del repartidor actualizado a '${newStatus}' exitosamente`, {
      profile: result.profile,
      statusChange: result.statusChange,
      updatedBy: { userId, userName: `${req.user.name} ${req.user.lastname}` }
    });

  } catch (error) {
    // Manejo estructurado de errores del repositorio
    if (error.status === 404) {
      return ResponseService.error(res, error.message, error.details, error.status, error.code);
    }
    // ... otros tipos de error
  }
};
```

#### Repositorio (`src/repositories/driver.repository.js`)

```javascript
static async updateDriverStatus(userId, newStatus, requestId) {
  // 1. Buscar perfil existente del repartidor
  const existingDriverProfile = await prisma.driverProfile.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, lastname: true, email: true, phone: true } } }
  });

  if (!existingDriverProfile) {
    throw { status: 404, message: 'Perfil no encontrado', code: 'DRIVER_PROFILE_NOT_FOUND' };
  }

  // 2. Actualizar estado con timestamp
  const updatedDriverProfile = await prisma.driverProfile.update({
    where: { userId },
    data: { status: newStatus, lastSeenAt: new Date(), updatedAt: new Date() },
    include: { user: { select: { id: true, name: true, lastname: true, email: true, phone: true } } }
  });

  // 3. Formatear y retornar respuesta
  return { profile: formattedProfile, statusChange: { previousStatus, newStatus, changedAt } };
}
```

### Payload Ejemplo

```json
{
  "status": "online"
}
```

### Respuesta Exitosa (200)

```json
{
    "status": "success",
    "message": "Estado del repartidor actualizado a 'online' exitosamente",
    "timestamp": "2025-10-20T18:19:47.715Z",
    "data": {
        "profile": {
            "userId": 4,
            "vehicleType": "motorcycle",
            "licensePlate": "HGO-ABC-123",
            "status": "online",
            "currentLocation": {
                "latitude": 20.484123,
                "longitude": -99.216345
            },
            "lastSeenAt": "2025-10-20T18:19:47.286Z",
            "kycStatus": "approved",
            "user": {
                "id": 4,
                "name": "Miguel",
                "lastname": "Hernández",
                "email": "miguel.hernandez@repartidor.com",
                "phone": "5555555555"
            },
            "createdAt": "2025-10-20T16:31:58.950Z",
            "updatedAt": "2025-10-20T18:19:47.286Z"
        },
        "statusChange": {
            "previousStatus": "online",
            "newStatus": "online",
            "changedAt": "2025-10-20T18:19:47.286Z"
        },
        "updatedBy": {
            "userId": 4,
            "userName": "Miguel Hernández"
        }
    }
}
```

### Manejo de Errores

#### Error 400 - Validación Zod

```json
{
  "status": "error",
  "message": "Estado inválido. Los estados permitidos son: online, offline, busy, unavailable",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-01-20T18:30:45.123Z",
  "errors": [
    {
      "field": "status",
      "message": "Estado inválido. Los estados permitidos son: online, offline, busy, unavailable",
      "code": "invalid_enum_value"
    }
  ],
  "data": null
}
```

#### Error 401 - No Autenticado

```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN",
  "timestamp": "2025-01-20T18:30:45.123Z"
}
```

#### Error 403 - Sin Permisos de Repartidor

```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["driver_platform", "driver_restaurant"],
  "current": ["customer"],
  "timestamp": "2025-01-20T18:30:45.123Z"
}
```

#### Error 404 - Perfil no Encontrado

```json
{
  "status": "error",
  "message": "Perfil de repartidor no encontrado",
  "code": "DRIVER_PROFILE_NOT_FOUND",
  "timestamp": "2025-01-20T18:30:45.123Z",
  "errors": {
    "userId": 123,
    "suggestion": "Contacta al administrador para crear tu perfil de repartidor"
  }
}
```

#### Error 500 - Error Interno

```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-20T18:30:45.123Z"
}
```

### Consideraciones Técnicas

1. **Atomicidad**: La actualización del estado es atómica y actualiza automáticamente `lastSeenAt` y `updatedAt`
2. **Validación**: Zod valida que solo se permitan estados válidos del enum `DriverStatus`
3. **Logging**: Se registra cada cambio de estado con `requestId` para trazabilidad
4. **Formato de Respuesta**: Consistente con `ResponseService` usado en otros endpoints refactorizados
5. **Manejo de Errores**: Estructurado y específico según el tipo de error (404, 409, 500)

### Mejoras Implementadas

- ✅ **Migración de `express-validator` a Zod**: Validación más robusta y tipada
- ✅ **Patrón Repository**: Separación clara de lógica de acceso a datos
- ✅ **ResponseService**: Respuestas consistentes y estructuradas
- ✅ **Estados completos**: Soporte para todos los valores del enum `DriverStatus`
- ✅ **Logging estructurado**: Trazabilidad completa con `requestId`
- ✅ **Manejo de errores mejorado**: Errores específicos y informativos

### Pruebas Realizadas

**✅ Prueba Exitosa** - `2025-10-20T18:19:47.715Z`:
- **Usuario**: Miguel Hernández (ID: 4, driver_platform)
- **Estado**: online → online (confirmación de estado)
- **Response Time**: 1286ms
- **Logging**: Funcionando correctamente con requestId y metadatos detallados


