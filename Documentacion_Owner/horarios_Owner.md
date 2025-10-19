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

---

## Endpoint: PATCH /api/restaurant/branches/:branchId/schedule

### Descripción
Actualiza el horario semanal completo de una sucursal específica. Este endpoint ha sido refactorizado para seguir una arquitectura en capas con repositorio, controlador y validaciones Zod robustas.

### Middlewares Aplicados

El endpoint utiliza los siguientes middlewares en orden:

1. **`authenticateToken`** - Verifica que el usuario esté autenticado mediante JWT
2. **`requireRole(['owner', 'branch_manager'])`** - Valida que el usuario tenga rol de owner o branch_manager
3. **`requireRestaurantLocation`** - Verifica que la ubicación del restaurante esté configurada
4. **`validateParams(scheduleParamsSchema)`** - Valida los parámetros de la ruta usando esquema Zod
5. **`validate(updateWeeklyScheduleSchema)`** - Valida el cuerpo de la petición con esquema Zod completo

### Esquemas Zod

#### Parámetros de la Ruta
```javascript
const scheduleParamsSchema = z.object({
  branchId: z
    .string({ required_error: 'El ID de la sucursal es requerido' })
    .regex(/^\d+$/, 'El ID de la sucursal debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El ID de la sucursal debe ser mayor que 0')
});
```

#### Cuerpo de la Petición
```javascript
const scheduleDaySchema = z.object({
  dayOfWeek: z
    .number({
      required_error: 'El día de la semana es requerido',
      invalid_type_error: 'El día de la semana debe ser un número'
    })
    .int({ message: 'El día de la semana debe ser un número entero' })
    .min(0, 'El día de la semana debe ser mayor o igual a 0 (Domingo)')
    .max(6, 'El día de la semana debe ser menor o igual a 6 (Sábado)'),
    
  openingTime: z
    .string({
      required_error: 'La hora de apertura es requerida',
      invalid_type_error: 'La hora de apertura debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de apertura debe estar en formato HH:MM:SS válido (ej: 09:30:00)'
    ),
    
  closingTime: z
    .string({
      required_error: 'La hora de cierre es requerida',
      invalid_type_error: 'La hora de cierre debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de cierre debe estar en formato HH:MM:SS válido (ej: 22:30:00)'
    ),
    
  isClosed: z
    .boolean({
      required_error: 'El campo isClosed es requerido',
      invalid_type_error: 'El campo isClosed debe ser un valor booleano'
    })
}).refine(data => {
  // Validación de horarios lógicos: openingTime < closingTime si no está cerrado
  if (data.isClosed) {
    return true;
  }
  
  const openingTime = new Date(`1970-01-01T${data.openingTime}`);
  const closingTime = new Date(`1970-01-01T${data.closingTime}`);
  
  return openingTime < closingTime;
}, {
  message: "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado",
  path: ["openingTime"]
});

const updateWeeklyScheduleSchema = z.object({
  schedules: z
    .array(scheduleDaySchema, {
      required_error: 'El campo schedules es requerido',
      invalid_type_error: 'El campo schedules debe ser un array'
    })
    .length(7, 'Se deben proporcionar exactamente 7 días de horario (Domingo a Sábado)')
    .refine(schedules => {
      // Validar que todos los días 0-6 estén presentes y sean únicos
      const dayOfWeeks = schedules.map(s => s.dayOfWeek);
      const expectedDays = [0, 1, 2, 3, 4, 5, 6];
      
      // Verificar que no hay duplicados
      const uniqueDays = [...new Set(dayOfWeeks)];
      if (uniqueDays.length !== 7) {
        return false;
      }
      
      // Verificar que están todos los días esperados
      return expectedDays.every(day => dayOfWeeks.includes(day));
    }, {
      message: 'Los horarios deben incluir exactamente un día para cada día de la semana (0=Domingo a 6=Sábado) sin duplicados',
      path: ['schedules']
    })
});
```

**Validaciones Destacadas:**

1. **Validación de Horarios Lógicos (`refine` en `scheduleDaySchema`):**
   - Si `isClosed` es `false`, verifica que `openingTime < closingTime`
   - Permite días cerrados sin validar horarios

2. **Validación de 7 Días Únicos (`refine` en `updateWeeklyScheduleSchema`):**
   - Verifica que se proporcionen exactamente 7 objetos
   - Valida que cada día de la semana (0-6) esté presente una sola vez
   - No permite días duplicados ni faltantes

### Lógica del Controlador

**Archivo**: `src/controllers/restaurant-admin.controller.js`

La función `updateBranchSchedule` ha sido refactorizada para ser simple y delegar toda la lógica al repositorio:

```javascript
const updateBranchSchedule = async (req, res) => {
  try {
    const { branchId } = req.params;
    const userId = req.user.id;
    const { schedules } = req.body;

    // Delegar la lógica al repositorio
    const updatedScheduleData = await ScheduleRepository.updateWeeklySchedule(branchId, schedules, userId, req.id);

    return ResponseService.success(
      res,
      'Horario de sucursal actualizado exitosamente',
      updatedScheduleData
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
    console.error('❌ Error actualizando horario de sucursal:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Simplificación**: Solo 25 líneas vs 220+ líneas originales
- **Delegación**: Toda la lógica de negocio se delega al repositorio
- **Manejo de Errores**: Gestiona errores estructurados del repositorio y errores generales

### Lógica del Repositorio

**Archivo**: `src/repositories/schedule.repository.js`

El método `ScheduleRepository.updateWeeklySchedule()` contiene toda la lógica de negocio:

#### Flujo de Validación y Procesamiento:

1. **Validación de Datos Básicos:**
   - Verifica que se proporcionen exactamente 7 elementos
   - Valida que los `dayOfWeek` sean únicos y cubran todos los días (0-6)

2. **Validación de Permisos:**
   ```javascript
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   ```
   - Obtiene información completa del usuario con sus roles
   - Verifica que tenga roles de restaurante (`owner` o `branch_manager`)

3. **Validación de Acceso a la Sucursal:**
   - Verifica que la sucursal existe
   - **Para Owners**: Acceso completo al restaurante
   - **Para Branch Managers**: Acceso específico a la sucursal asignada

4. **Validación de Horarios Lógicos:**
   ```javascript
   // Validación: openingTime < closingTime cuando no está cerrado
   if (!scheduleItem.isClosed) {
     const openingTime = new Date(`1970-01-01T${scheduleItem.openingTime}`);
     const closingTime = new Date(`1970-01-01T${scheduleItem.closingTime}`);
     
     if (openingTime >= closingTime) {
       throw { /* error estructurado */ };
     }
   }
   ```

5. **Operación Transaccional:**
   ```javascript
   const result = await prisma.$transaction(async (tx) => {
     // Eliminar todos los horarios existentes de la sucursal
     await tx.branchSchedule.deleteMany({
       where: { branchId: branchId }
     });

     // Crear los nuevos horarios
     const newSchedules = scheduleData.map(item => ({
       branchId: branchId,
       dayOfWeek: item.dayOfWeek,
       openingTime: item.openingTime,
       closingTime: item.closingTime,
       isClosed: item.isClosed
     }));

     return await tx.branchSchedule.createMany({
       data: newSchedules
     });
   });
   ```

6. **Formateo de Respuesta:**
   - Obtiene los horarios actualizados de la base de datos
   - Añade `dayName` para cada día usando `getDayName()`
   - Retorna estructura consistente con información de sucursal y restaurante

### Payload de Ejemplo

```json
{
  "schedules": [
    {
      "dayOfWeek": 0,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": true
    },
    {
      "dayOfWeek": 1,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": false
    },
    {
      "dayOfWeek": 2,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": false
    },
    {
      "dayOfWeek": 3,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": false
    },
    {
      "dayOfWeek": 4,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": false
    },
    {
      "dayOfWeek": 5,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": false
    },
    {
      "dayOfWeek": 6,
      "openingTime": "09:00:00",
      "closingTime": "22:00:00",
      "isClosed": false
    }
  ]
}
```

### Respuesta Exitosa

```json
{
    "status": "success",
    "message": "Horario de sucursal actualizado exitosamente",
    "timestamp": "2025-10-19T16:32:12.001Z",
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
                "id": 29,
                "dayOfWeek": 0,
                "dayName": "Domingo",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": true
            },
            {
                "id": 30,
                "dayOfWeek": 1,
                "dayName": "Lunes",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
            },
            {
                "id": 31,
                "dayOfWeek": 2,
                "dayName": "Martes",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
            },
            {
                "id": 32,
                "dayOfWeek": 3,
                "dayName": "Miércoles",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
            },
            {
                "id": 33,
                "dayOfWeek": 4,
                "dayName": "Jueves",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
            },
            {
                "id": 34,
                "dayOfWeek": 5,
                "dayName": "Viernes",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
            },
            {
                "id": 35,
                "dayOfWeek": 6,
                "dayName": "Sábado",
                "openingTime": "09:00:00",
                "closingTime": "22:00:00",
                "isClosed": false
            }
        ]
    }
}
```

**Estructura de la Respuesta:**
- **`branch`**: Información de la sucursal y restaurante
- **`schedules`**: Array con los 7 días actualizados, incluyendo:
  - `id`: ID único del registro en base de datos
  - `dayOfWeek`: Número del día (0-6)
  - `dayName`: Nombre del día en español
  - `openingTime`/`closingTime`: Horarios en formato `HH:MM:SS`
  - `isClosed`: Estado del día (abierto/cerrado)

### Manejo de Errores

#### 1. Errores de Validación Zod

**Parámetros inválidos (400):**
```json
{
  "error": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["branchId"],
      "message": "El ID de la sucursal debe ser un número"
    }
  ]
}
```

**Datos del cuerpo inválidos (400):**
```json
{
  "error": [
    {
      "code": "invalid_string",
      "validation": "regex",
      "path": ["schedules", 0, "openingTime"],
      "message": "La hora de apertura debe estar en formato HH:MM:SS válido (ej: 09:30:00)"
    }
  ]
}
```

**Validación refine - Horarios lógicos (400):**
```json
{
  "error": [
    {
      "code": "custom",
      "path": ["schedules", 1, "openingTime"],
      "message": "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado"
    }
  ]
}
```

**Validación refine - 7 días únicos (400):**
```json
{
  "error": [
    {
      "code": "custom",
      "path": ["schedules"],
      "message": "Los horarios deben incluir exactamente un día para cada día de la semana (0=Domingo a 6=Sábado) sin duplicados"
    }
  ]
}
```

#### 2. Errores de Negocio (404/403)

**Usuario no encontrado (404):**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**Sucursal no encontrada (404):**
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

**Permisos insuficientes (403):**
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

**Sin acceso a la sucursal (403):**
```json
{
  "status": "error",
  "message": "No tienes permisos para actualizar esta sucursal",
  "code": "BRANCH_UPDATE_DENIED",
  "details": {
    "branchId": 1,
    "restaurantId": 1,
    "suggestion": "Verifica que tienes permisos de owner o branch_manager para esta sucursal"
  }
}
```

#### 3. Errores de Transacción (409/500)

**Conflicto de datos (409):**
```json
{
  "status": "error",
  "message": "Conflicto de datos",
  "code": "DUPLICATE_SCHEDULE",
  "details": {
    "suggestion": "Ya existe un horario para este día de la semana en esta sucursal"
  }
}
```

**Error interno del servidor (500):**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "originalError": "Transaction failed"
}
```

### Ejemplo de Uso

```bash
curl -X PATCH \
  'https://delixmi-backend.onrender.com/api/restaurant/branches/1/schedule' \
  -H 'Authorization: Bearer <jwt_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "schedules": [
      {
        "dayOfWeek": 0,
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": true
      },
      {
        "dayOfWeek": 1,
        "openingTime": "09:00:00",
        "closingTime": "22:00:00",
        "isClosed": false
      }
      // ... resto de los 7 días
    ]
  }'
```

### Notas Técnicas

1. **Refactorización**: El endpoint ha sido completamente refactorizado siguiendo el patrón Repository, separando la lógica de negocio del controlador HTTP.

2. **Validación Robusta**: Implementa validaciones Zod en múltiples capas:
   - Middleware para parámetros y cuerpo de petición
   - Validaciones de negocio en el repositorio
   - Validaciones lógicas con `refine` para horarios

3. **Transaccional**: Utiliza transacciones Prisma para garantizar consistencia:
   - Elimina todos los horarios existentes
   - Crea los nuevos registros
   - Todo en una sola transacción atómica

4. **Manejo de Errores**: Sistema estructurado de errores con:
   - Códigos específicos para cada tipo de error
   - Mensajes descriptivos en español
   - Detalles adicionales para debugging

5. **Logging**: Trazabilidad completa con `requestId` en todas las operaciones críticas.

6. **Permisos Granulares**: Sistema de autorización que diferencia entre:
   - **Owners**: Acceso completo a todas las sucursales del restaurante
   - **Branch Managers**: Acceso específico solo a sucursales asignadas

---

## Endpoint: PATCH /api/restaurant/branches/:branchId/schedule/:dayOfWeek

### Descripción
Actualiza el horario de un día específico de una sucursal. Este endpoint permite la gestión día por día de los horarios, complementando la funcionalidad de actualización semanal completa. Ha sido implementado siguiendo la arquitectura en capas con repositorio, controlador y validaciones Zod robustas.

### Middlewares Aplicados

El endpoint utiliza los siguientes middlewares en orden:

1. **`authenticateToken`** - Verifica que el usuario esté autenticado mediante JWT
2. **`requireRole(['owner', 'branch_manager'])`** - Valida que el usuario tenga rol de owner o branch_manager
3. **`requireRestaurantLocation`** - Verifica que la ubicación del restaurante esté configurada
4. **`validateParams(singleDayParamsSchema)`** - Valida los parámetros de la ruta (branchId y dayOfWeek) usando esquema Zod
5. **`validate(updateSingleDaySchema)`** - Valida el cuerpo de la petición con esquema Zod para horarios de día individual

### Esquemas Zod

#### Parámetros de la Ruta
```javascript
const singleDayParamsSchema = z.object({
  branchId: z
    .string({ required_error: 'El ID de la sucursal es requerido' })
    .regex(/^\d+$/, 'El ID de la sucursal debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El ID de la sucursal debe ser mayor que 0'),
  
  dayOfWeek: z
    .string({ required_error: 'El día de la semana es requerido' })
    .regex(/^[0-6]$/, 'El día de la semana debe ser un número entre 0 (Domingo) y 6 (Sábado)')
    .transform(Number)
});
```

**Validaciones de parámetros:**
- **`branchId`**: Debe ser string numérico > 0, se transforma a Number
- **`dayOfWeek`**: Debe ser string con valor 0-6, se transforma a Number

#### Cuerpo de la Petición
```javascript
const updateSingleDaySchema = z.object({
  openingTime: z
    .string({
      required_error: 'La hora de apertura es requerida',
      invalid_type_error: 'La hora de apertura debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de apertura debe estar en formato HH:MM:SS válido (ej: 09:30:00)'
    ),
    
  closingTime: z
    .string({
      required_error: 'La hora de cierre es requerida',
      invalid_type_error: 'La hora de cierre debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de cierre debe estar en formato HH:MM:SS válido (ej: 22:30:00)'
    ),
    
  isClosed: z
    .boolean({
      required_error: 'El campo isClosed es requerido',
      invalid_type_error: 'El campo isClosed debe ser un valor booleano'
    })
}).refine(data => {
  // Solo validar horarios lógicos si no está cerrado
  if (data.isClosed) {
    return true;
  }
  
  // Crear objetos Date para comparar horarios
  const openingTime = new Date(`1970-01-01T${data.openingTime}`);
  const closingTime = new Date(`1970-01-01T${data.closingTime}`);
  
  return openingTime < closingTime;
}, {
  message: "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado",
  path: ["openingTime"]
});
```

**Validaciones del cuerpo:**
- **`openingTime`**: String en formato `HH:MM:SS` válido (00:00:00 - 23:59:59)
- **`closingTime`**: String en formato `HH:MM:SS` válido (00:00:00 - 23:59:59)
- **`isClosed`**: Boolean requerido
- **Validación lógica**: Si `isClosed` es `false`, verifica que `openingTime < closingTime`

### Lógica del Controlador

**Archivo**: `src/controllers/restaurant-admin.controller.js`

La función `updateSingleDaySchedule` ha sido diseñada para ser simple y delegar toda la lógica al repositorio:

```javascript
const updateSingleDaySchedule = async (req, res) => {
  try {
    const { branchId, dayOfWeek } = req.params;
    const userId = req.user.id;
    const dayData = req.body;

    // Delegar la lógica al repositorio
    const updatedDayData = await ScheduleRepository.updateSingleDaySchedule(
      branchId, 
      parseInt(dayOfWeek), 
      dayData, 
      userId, 
      req.id
    );

    return ResponseService.success(
      res,
      'Horario del día actualizado exitosamente',
      updatedDayData
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
    console.error('❌ Error actualizando horario de día específico:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Simplificación**: Solo 35 líneas vs complejidad original
- **Delegación**: Toda la lógica de negocio se delega al repositorio
- **Manejo de Errores**: Gestiona errores estructurados del repositorio y errores generales
- **Transformación**: Convierte `dayOfWeek` de string a Number antes de pasarlo al repositorio

### Lógica del Repositorio

**Archivo**: `src/repositories/schedule.repository.js`

El método `ScheduleRepository.updateSingleDaySchedule()` contiene toda la lógica de negocio para la gestión día por día:

#### Flujo de Validación y Procesamiento:

1. **Validación de Parámetros:**
   ```javascript
   // Validar que dayOfWeek sea un número válido entre 0-6
   if (typeof dayOfWeek !== 'number' || dayOfWeek < 0 || dayOfWeek > 6) {
     throw { /* error estructurado */ };
   }
   ```

2. **Validación de Permisos:**
   ```javascript
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   ```
   - Obtiene información completa del usuario con sus roles
   - Verifica que tenga roles de restaurante (`owner` o `branch_manager`)

3. **Validación de Acceso a la Sucursal:**
   - Verifica que la sucursal existe
   - **Para Owners**: Acceso completo al restaurante
   - **Para Branch Managers**: Acceso específico a la sucursal asignada

4. **Validación de Horarios Lógicos:**
   ```javascript
   if (!dayData.isClosed) {
     const openingTime = new Date(`1970-01-01T${dayData.openingTime}`);
     const closingTime = new Date(`1970-01-01T${dayData.closingTime}`);
     
     if (openingTime >= closingTime) {
       throw { /* error estructurado */ };
     }
   }
   ```

5. **Lógica findFirst + Update/Create:**
   ```javascript
   // Buscar si existe un horario para este día específico
   const existingSchedule = await prisma.branchSchedule.findFirst({
     where: {
       branchId: branchId,
       dayOfWeek: dayOfWeek
     }
   });

   let updatedSchedule;

   if (existingSchedule) {
     // Actualizar el horario existente
     updatedSchedule = await prisma.branchSchedule.update({
       where: { id: existingSchedule.id },
       data: {
         openingTime: dayData.openingTime,
         closingTime: dayData.closingTime,
         isClosed: dayData.isClosed
       }
     });
   } else {
     // Crear un nuevo horario para el día
     updatedSchedule = await prisma.branchSchedule.create({
       data: {
         branchId: branchId,
         dayOfWeek: dayOfWeek,
         openingTime: dayData.openingTime,
         closingTime: dayData.closingTime,
         isClosed: dayData.isClosed
       }
     });
   }
   ```

6. **Formateo de Respuesta:**
   - Retorna solo el día actualizado (no todos los días de la semana)
   - Incluye `dayName` usando `getDayName()`
   - Mantiene estructura consistente con información de sucursal y restaurante

### Payload de Ejemplo

```json
{
  "openingTime": "00:00:00",
  "closingTime": "00:00:00",
  "isClosed": true
}
```

**Nota**: Este ejemplo muestra cómo cerrar un día específico (Lunes), estableciendo `isClosed: true` sin importar los horarios.

### Respuesta Exitosa

```json
{
    "status": "success",
    "message": "Horario del día actualizado exitosamente",
    "timestamp": "2025-10-19T16:42:44.111Z",
    "data": {
        "branch": {
            "id": 1,
            "name": "Sucursal Centro",
            "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana"
            }
        },
        "schedule": {
            "id": 30,
            "dayOfWeek": 1,
            "dayName": "Lunes",
            "openingTime": "00:00:00",
            "closingTime": "00:00:00",
            "isClosed": true
        }
    }
}
```

**Estructura de la Respuesta:**
- **`branch`**: Información de la sucursal y restaurante
- **`schedule`**: Objeto con el día actualizado, incluyendo:
  - `id`: ID único del registro en base de datos
  - `dayOfWeek`: Número del día (0-6)
  - `dayName`: Nombre del día en español
  - `openingTime`/`closingTime`: Horarios en formato `HH:MM:SS`
  - `isClosed`: Estado del día (abierto/cerrado)

### Manejo de Errores

#### 1. Errores de Validación Zod

**Parámetros inválidos (400):**
```json
{
  "error": [
    {
      "code": "invalid_string",
      "validation": "regex",
      "path": ["branchId"],
      "message": "El ID de la sucursal debe ser un número"
    }
  ]
}
```

**dayOfWeek inválido (400):**
```json
{
  "error": [
    {
      "code": "invalid_string",
      "validation": "regex",
      "path": ["dayOfWeek"],
      "message": "El día de la semana debe ser un número entre 0 (Domingo) y 6 (Sábado)"
    }
  ]
}
```

**Datos del cuerpo inválidos (400):**
```json
{
  "error": [
    {
      "code": "invalid_string",
      "validation": "regex",
      "path": ["openingTime"],
      "message": "La hora de apertura debe estar en formato HH:MM:SS válido (ej: 09:30:00)"
    }
  ]
}
```

**Validación refine - Horarios lógicos (400):**
```json
{
  "error": [
    {
      "code": "custom",
      "path": ["openingTime"],
      "message": "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado"
    }
  ]
}
```

#### 2. Errores de Negocio (404/403)

**Usuario no encontrado (404):**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**Sucursal no encontrada (404):**
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

**Permisos insuficientes (403):**
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

**Sin acceso a la sucursal (403):**
```json
{
  "status": "error",
  "message": "No tienes permisos para actualizar esta sucursal",
  "code": "BRANCH_UPDATE_DENIED",
  "details": {
    "branchId": 1,
    "restaurantId": 1,
    "suggestion": "Verifica que tienes permisos de owner o branch_manager para esta sucursal"
  }
}
```

#### 3. Errores de Lógica de Negocio (400)

**dayOfWeek fuera de rango (400):**
```json
{
  "status": "error",
  "message": "El día de la semana debe ser un número entre 0 (Domingo) y 6 (Sábado)",
  "code": "INVALID_DAY_OF_WEEK",
  "details": {
    "received": 7,
    "expected": "0-6",
    "suggestion": "0=Domingo, 1=Lunes, 2=Martes, 3=Miércoles, 4=Jueves, 5=Viernes, 6=Sábado"
  }
}
```

**Horario lógico inválido (400):**
```json
{
  "status": "error",
  "message": "Horario inválido",
  "code": "INVALID_TIME_RANGE",
  "details": {
    "dayOfWeek": 1,
    "dayName": "Lunes",
    "error": "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado"
  }
}
```

#### 4. Errores de Base de Datos (409/500)

**Conflicto de datos (409):**
```json
{
  "status": "error",
  "message": "Conflicto de datos",
  "code": "DUPLICATE_SCHEDULE",
  "details": {
    "suggestion": "Ya existe un horario para este día de la semana en esta sucursal"
  }
}
```

**Error interno del servidor (500):**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "originalError": "Database connection failed"
}
```

### Ejemplo de Uso

```bash
curl -X PATCH \
  'https://delixmi-backend.onrender.com/api/restaurant/branches/1/schedule/1' \
  -H 'Authorization: Bearer <jwt_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "openingTime": "10:00:00",
    "closingTime": "22:00:00",
    "isClosed": false
  }'
```

### Notas Técnicas

1. **Gestión Individual**: Actualiza solo el día especificado sin afectar otros días de la semana.

2. **Creación Automática**: Si no existe horario para el día especificado, lo crea automáticamente.

3. **Validación en Múltiples Capas**: 
   - Middleware Zod para parámetros y cuerpo
   - Validaciones de negocio en el repositorio
   - Validación lógica de horarios con `refine`

4. **Lógica findFirst + Update/Create**: Utiliza esta estrategia en lugar de `upsert` para mayor control y compatibilidad con el esquema actual.

5. **Logging Completo**: Trazabilidad con `requestId` en todas las operaciones críticas.

6. **Permisos Granulares**: Mismo sistema de autorización que los otros endpoints:
   - **Owners**: Acceso completo a todas las sucursales del restaurante
   - **Branch Managers**: Acceso específico solo a sucursales asignadas

7. **Respuesta Optimizada**: Retorna solo el día actualizado, optimizando el payload de respuesta.


