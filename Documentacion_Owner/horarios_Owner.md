# Gestión de Horarios de Sucursales - API de Owner

## Endpoint: GET /api/restaurant/branches/:branchId/schedule

### Descripción
Obtiene el horario semanal completo de una sucursal específica. Este endpoint ha sido refactorizado para seguir una arquitectura en capas con repositorio, controlador y validaciones Zod.

### Middlewares Aplicados

El endpoint utiliza los siguientes middlewares en orden:

1. **`authenticateToken`** - Verifica que el usuario esté autenticado mediante JWT
2. **`requireRole(['owner', 'branch_manager'])`** - Valida que el usuario tenga rol de owner o branch_manager
3. **`requireRestaurantLocation`** - Verifica que la ubicación del restaurante esté configurada
4. **`validateParams(scheduleParamsSchema)`** - Valida los parámetros de la ruta usando esquema Zod

### Esquema Zod

```javascript
const scheduleParamsSchema = z.object({
  branchId: z
    .string({ required_error: 'El ID de la sucursal es requerido' })
    .regex(/^\d+$/, 'El ID de la sucursal debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El ID de la sucursal debe ser mayor que 0')
});
```

**Validaciones del parámetro `branchId`:**
- Debe estar presente (required)
- Debe ser un string que contenga solo dígitos
- Se transforma a número automáticamente
- Debe ser mayor que 0

### Lógica del Controlador

**Archivo**: `src/controllers/restaurant-admin.controller.js`

La función `getBranchSchedule` ha sido refactorizada para ser simple y delegar toda la lógica al repositorio:

```javascript
const getBranchSchedule = async (req, res) => {
  try {
    const { branchId } = req.params;
    const userId = req.user.id;

    // Delegar la lógica al repositorio
    const scheduleData = await ScheduleRepository.getWeeklySchedule(branchId, userId, req.id);

    return ResponseService.success(
      res,
      'Horario de sucursal obtenido exitosamente',
      scheduleData
    );

  } catch (error) {
    // El repositorio maneja los errores con estructura específica
    if (error.status) {
      return res.status(error.status).json({
        status: 'error',
        message: error.message,
        code: error.code,
        details: error.details || null
      });
    }

    // Para errores no controlados, usar ResponseService
    console.error('❌ Error obteniendo horario de sucursal:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Flujo del Controlador:**
1. Extrae `branchId` de los parámetros de la ruta
2. Extrae `userId` del usuario autenticado (`req.user.id`)
3. Delega toda la lógica a `ScheduleRepository.getWeeklySchedule()`
4. Devuelve respuesta exitosa usando `ResponseService`
5. Maneja errores estructurados del repositorio o errores internos

### Lógica del Repositorio

**Archivo**: `src/repositories/schedule.repository.js`

La función `getWeeklySchedule` encapsula toda la lógica de negocio:

```javascript
static async getWeeklySchedule(branchId, userId, requestId) {
  try {
    // 1. Obtener información del usuario y verificar permisos
    const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    // 3. Verificar que la sucursal existe y obtener información
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    // 4. Verificar autorización de acceso a la sucursal
    let hasAccess = false;

    // Verificar si es owner del restaurante
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === branch.restaurant.id
    );

    if (ownerAssignment) {
      hasAccess = true;
    } else {
      // Verificar si es branch_manager con acceso específico a esta sucursal
      const branchManagerAssignment = userWithRoles.userRoleAssignments.find(
        assignment => 
          assignment.role.name === 'branch_manager' && 
          assignment.restaurantId === branch.restaurant.id &&
          (assignment.branchId === branchId || assignment.branchId === null)
      );

      if (branchManagerAssignment) {
        hasAccess = true;
      }
    }

    // 5. Consultar horarios de la sucursal
    const schedules = await prisma.branchSchedule.findMany({
      where: {
        branchId: branchId
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    });

    // 6. Formatear respuesta
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      dayName: this.getDayName(schedule.dayOfWeek),
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime,
      isClosed: schedule.isClosed
    }));

    return {
      branch: {
        id: branch.id,
        name: branch.name,
        restaurant: {
          id: branch.restaurant.id,
          name: branch.restaurant.name
        }
      },
      schedules: formattedSchedules
    };
  } catch (error) {
    // Manejo de errores estructurado...
  }
}
```

**Pasos de la Lógica del Repositorio:**

1. **Validación de Usuario**: Usa `UserService.getUserWithRoles()` para obtener información del usuario
2. **Verificación de Roles**: Confirma que el usuario tenga rol `owner` o `branch_manager`
3. **Verificación de Sucursal**: Consulta la sucursal y su restaurante asociado
4. **Autorización de Acceso**: 
   - Si es `owner`: acceso si pertenece al restaurante
   - Si es `branch_manager`: acceso si está asignado a esa sucursal específica o a todas las sucursales del restaurante
5. **Consulta de Horarios**: Usa `prisma.branchSchedule.findMany()` ordenado por `dayOfWeek`
6. **Formateo**: Aplica `dayName` usando `this.getDayName()` para cada día

### Respuesta Exitosa

**Estructura de la Respuesta:**
```json
{
  "status": "success",
  "message": "Horario de sucursal obtenido exitosamente",
  "timestamp": "2025-10-19T16:23:06.270Z",
  "data": {
    "branch": {
      "id": 1,
      "name": "Sucursal Centro",
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      }
    },
    "schedules": [
      {
        "id": 1,
        "dayOfWeek": 0,
        "dayName": "Domingo",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      },
      {
        "id": 2,
        "dayOfWeek": 1,
        "dayName": "Lunes",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      },
      {
        "id": 3,
        "dayOfWeek": 2,
        "dayName": "Martes",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      },
      {
        "id": 4,
        "dayOfWeek": 3,
        "dayName": "Miércoles",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      },
      {
        "id": 5,
        "dayOfWeek": 4,
        "dayName": "Jueves",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      },
      {
        "id": 6,
        "dayOfWeek": 5,
        "dayName": "Viernes",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      },
      {
        "id": 7,
        "dayOfWeek": 6,
        "dayName": "Sábado",
        "openingTime": "00:00:00",
        "closingTime": "23:59:59",
        "isClosed": false
      }
    ]
  }
}
```

**Estructura de Datos:**

- **`branch`**: Información básica de la sucursal
  - `id`: ID de la sucursal
  - `name`: Nombre de la sucursal
  - `restaurant`: Información del restaurante padre
    - `id`: ID del restaurante
    - `name`: Nombre del restaurante

- **`schedules`**: Array con 7 objetos, uno por cada día de la semana
  - `id`: ID único del registro de horario
  - `dayOfWeek`: Número del día (0=Domingo, 1=Lunes, ..., 6=Sábado)
  - `dayName`: Nombre del día en español (calculado por `getDayName()`)
  - `openingTime`: Hora de apertura en formato "HH:MM:SS"
  - `closingTime`: Hora de cierre en formato "HH:MM:SS"
  - `isClosed`: Boolean que indica si el día está cerrado

### Manejo de Errores

El endpoint maneja diferentes tipos de errores con códigos específicos:

#### 1. Errores de Validación Zod (400)
```json
{
  "status": "error",
  "message": "Parámetros de entrada inválidos",
  "code": "VALIDATION_ERROR",
  "details": {
    "branchId": {
      "issues": ["El ID de la sucursal debe ser un número"],
      "path": ["branchId"]
    }
  }
}
```

#### 2. Usuario no encontrado (404)
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

#### 3. Sucursal no encontrada (404)
```json
{
  "status": "error",
  "message": "Sucursal no encontrada",
  "code": "BRANCH_NOT_FOUND",
  "details": {
    "branchId": 999,
    "suggestion": "Verifica que el ID de la sucursal sea correcto"
  }
}
```

#### 4. Permisos insuficientes (403)
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de restaurante",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "required": ["owner", "branch_manager"],
    "current": ["customer"]
  }
}
```

#### 5. Sin acceso a la sucursal específica (403)
```json
{
  "status": "error",
  "message": "No tienes permisos para acceder a esta sucursal",
  "code": "BRANCH_ACCESS_DENIED",
  "details": {
    "branchId": 1,
    "restaurantId": 1,
    "suggestion": "Verifica que tienes permisos de owner o branch_manager para esta sucursal"
  }
}
```

#### 6. Ubicación no configurada (403)
Manejado por el middleware `requireRestaurantLocation` antes de que llegue al controlador.

#### 7. Error del servidor (500)
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

### Ejemplo de Uso

```bash
curl -X GET \
  'https://delixmi-backend.onrender.com/api/restaurant/branches/1/schedule' \
  -H 'Authorization: Bearer <jwt_token>' \
  -H 'Content-Type: application/json'
```

### Notas Técnicas

1. **Refactorización**: El endpoint ha sido refactorizado para seguir el patrón Repository, separando la lógica de negocio del controlador HTTP.

2. **Logging**: Utiliza el sistema de logging centralizado con `requestId` para trazabilidad.

3. **Validación**: Migrado de express-validator a Zod para validación de parámetros más robusta.

4. **Manejo de Errores**: Errores estructurados con códigos específicos y detalles para mejor debugging.

5. **Permisos**: Sistema granular de permisos que diferencia entre owners (acceso completo) y branch_managers (acceso específico por sucursal).
