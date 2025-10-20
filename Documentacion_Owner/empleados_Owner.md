# Documentación - Gestión de Empleados (Owner)

Esta documentación describe la funcionalidad CRUD para que los Owners gestionen a sus empleados del restaurante.

## Endpoint POST /api/restaurant/employees

### Descripción
Permite al Owner crear un nuevo empleado para su restaurante, asignándole un rol específico de empleado y vinculándolo automáticamente al restaurante del owner.

### Middlewares Aplicados

1. **`authenticateToken`**: Verifica que el usuario esté autenticado mediante JWT
2. **`requireRole(['owner'])`**: Verifica que el usuario tenga rol de owner
3. **`requireRestaurantLocation`**: Verifica que el owner tenga configurada la ubicación de su restaurante
4. **`validate(createEmployeeSchema)`**: Valida el payload de la request usando Zod

### Esquema Zod - `createEmployeeSchema`

```javascript
const createEmployeeSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
      invalid_type_error: 'El email debe ser un string'
    })
    .email('El email debe tener un formato válido')
    .toLowerCase()
    .trim(),
    
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser un string'
    })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(255, 'La contraseña es demasiado larga'),
    
  name: z
    .string({
      required_error: 'El nombre es requerido',
      invalid_type_error: 'El nombre debe ser un string'
    })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .trim(),
    
  lastname: z
    .string({
      required_error: 'El apellido es requerido',
      invalid_type_error: 'El apellido debe ser un string'
    })
    .min(1, 'El apellido no puede estar vacío')
    .max(100, 'El apellido no puede superar los 100 caracteres')
    .trim(),
    
  phone: z
    .string({
      required_error: 'El teléfono es requerido',
      invalid_type_error: 'El teléfono debe ser un string'
    })
    .regex(/^[0-9]{10,15}$/, 'El teléfono debe tener entre 10 y 15 dígitos numéricos')
    .trim(),
    
  roleId: z
    .number({
      required_error: 'El rol es requerido',
      invalid_type_error: 'El rol debe ser un número'
    })
    .int('El rol debe ser un número entero')
    .positive('Debe seleccionar un rol válido')
});
```

### Lógica del Controlador

**Controlador**: `createEmployee` en `restaurant-admin.controller.js`

1. **Obtención de Datos**: Obtiene `ownerUserId` de `req.user` y `employeeData` de `req.body` (ya validado por Zod)
2. **Delegación al Repositorio**: Llama a `EmployeeRepository.createEmployeeForRestaurant(employeeData, ownerUserId, req.id)`
3. **Respuesta Exitosa**: Devuelve `ResponseService.success()` con código 201 y datos del empleado creado
4. **Manejo de Errores**: Captura errores específicos del repositorio y los devuelve con su estructura de error correspondiente

### Lógica del Repositorio

**Repositorio**: `EmployeeRepository.createEmployeeForRestaurant()` en `employee.repository.js`

#### Validaciones Previas:
1. **Verificación de Owner**: Usa `UserService.getUserWithRoles()` para obtener información del owner y verificar que tiene rol de owner con restaurante asignado
2. **Verificación de Email**: Consulta `prisma.user.findUnique({ where: { email } })` para asegurar que el email no esté en uso
3. **Verificación de Teléfono**: Consulta `prisma.user.findUnique({ where: { phone } })` para asegurar que el teléfono no esté en uso
4. **Validación de Rol**: 
   - Verifica que el rol existe usando `prisma.role.findUnique()`
   - Valida que el rol es válido para empleados: `['branch_manager', 'order_manager', 'kitchen_staff', 'driver_restaurant']`

#### Transacción:
1. **Hash de Contraseña**: Usa `bcrypt.hash(password, 12)` para hashear la contraseña
2. **Creación de Usuario**: Usa `tx.user.create()` con datos del empleado, status 'active' y fechas de verificación
3. **Asignación de Rol**: Usa `tx.userRoleAssignment.create()` vinculando:
   - `userId`: ID del nuevo empleado
   - `roleId`: ID del rol seleccionado
   - `restaurantId`: ID del restaurante del owner
   - `branchId`: `null` (siguiendo la lógica refactorizada de una sucursal por restaurante)

### Payload de Ejemplo

```json
{
  "email": "nuevo.empleado.test@pizzeria.com",
  "password": "passwordSeguro123",
  "name": "Empleado",
  "lastname": "Prueba",
  "phone": "9998887777",
  "roleId": 6
}
```

**Nota**: El `roleId` debe corresponder a uno de los siguientes roles válidos para empleados:
- `branch_manager` (ID: 5) - Gerente de Sucursal
- `order_manager` (ID: 6) - Gestor de Pedidos  
- `kitchen_staff` (ID: 7) - Personal de Cocina
- `driver_restaurant` (ID: 9) - Repartidor de Restaurante

### Respuesta Exitosa (201 Created)

```json
{
    "status": "success",
    "message": "Empleado creado exitosamente",
    "timestamp": "2025-10-19T18:38:28.185Z",
    "data": {
        "employee": {
            "id": 7,
            "name": "Empleado",
            "lastname": "Prueba",
            "email": "nuevo.empleado.test@pizzeria.com",
            "phone": "9998887777",
            "status": "active",
            "emailVerifiedAt": "2025-10-19T18:38:27.570Z",
            "phoneVerifiedAt": "2025-10-19T18:38:27.570Z",
            "createdAt": "2025-10-19T18:38:27.571Z",
            "updatedAt": "2025-10-19T18:38:27.571Z",
            "role": {
                "id": 6,
                "name": "order_manager",
                "displayName": "Gestor de Pedidos",
                "description": "Acepta y gestiona los pedidos entrantes en una sucursal."
            },
            "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana"
            }
        }
    }
}
```

### Manejo de Errores

#### Error 400 - Validación de Zod
```json
{
  "status": "error",
  "message": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "El email debe tener un formato válido"
    },
    {
      "field": "password", 
      "message": "La contraseña debe tener al menos 8 caracteres"
    }
  ]
}
```

#### Error 400 - Rol No Válido para Empleados
```json
{
  "status": "error",
  "message": "Rol no válido para empleados",
  "code": "INVALID_EMPLOYEE_ROLE",
  "details": {
    "roleId": 1,
    "roleName": "super_admin",
    "validRoles": ["branch_manager", "order_manager", "kitchen_staff", "driver_restaurant"],
    "suggestion": "Solo se pueden asignar roles de empleado: branch_manager, order_manager, kitchen_staff, driver_restaurant"
  }
}
```

#### Error 400 - Rol No Encontrado
```json
{
  "status": "error",
  "message": "Rol no encontrado",
  "code": "INVALID_ROLE_ID",
  "details": {
    "roleId": 999,
    "suggestion": "Verifica que el ID del rol sea correcto"
  }
}
```

#### Error 403 - Permisos Insuficientes
```json
{
  "status": "error",
  "message": "No tienes permisos para crear empleados. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "userId": 3,
    "suggestion": "Solo los owners pueden crear empleados para sus restaurantes"
  }
}
```

#### Error 403 - Ubicación No Configurada
```json
{
  "status": "error",
  "message": "Debes configurar la ubicación de tu restaurante antes de poder crear empleados",
  "code": "RESTAURANT_LOCATION_REQUIRED"
}
```

#### Error 409 - Email Ya Registrado
```json
{
  "status": "error",
  "message": "El email ya está registrado",
  "code": "EMAIL_ALREADY_EXISTS",
  "details": {
    "email": "maria.garcia@pizzeria.com",
    "suggestion": "Usa un email diferente o contacta al administrador"
  }
}
```

#### Error 409 - Teléfono Ya Registrado
```json
{
  "status": "error",
  "message": "El teléfono ya está registrado",
  "code": "PHONE_ALREADY_EXISTS",
  "details": {
    "phone": "7771234567",
    "suggestion": "Usa un teléfono diferente o contacta al administrador"
  }
}
```

#### Error 404 - Usuario Owner No Encontrado
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

#### Error 500 - Error Interno del Servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

### Características del Endpoint

- **Seguridad**: Hash automático de contraseñas con bcrypt (salt rounds: 12)
- **Verificación Automática**: Email y teléfono verificados automáticamente al crear el empleado
- **Estado Activo**: Los empleados se crean con status 'active' por defecto
- **Vinculación Automática**: El empleado se vincula automáticamente al restaurante del owner
- **Validación de Roles**: Solo permite roles específicos de empleados
- **Transaccional**: Usa transacciones de Prisma para garantizar consistencia de datos
- **Logging Completo**: Registra todas las operaciones para auditoría y debugging

---

## Endpoint GET /api/restaurant/employees

### Descripción
Permite al Owner obtener la lista de empleados de su restaurante con filtros opcionales y paginación. Incluye funcionalidades de búsqueda por nombre, apellido o email, y filtrado por rol y estado.

### Middlewares Aplicados

1. **`authenticateToken`**: Verifica que el usuario esté autenticado mediante JWT
2. **`requireRole(['owner'])`**: Verifica que el usuario tenga rol de owner
3. **`requireRestaurantLocation`**: Verifica que el owner tenga configurada la ubicación de su restaurante
4. **`validateQuery(employeeQuerySchema)`**: Valida los query parameters usando Zod

### Esquema Zod - `employeeQuerySchema`

```javascript
const employeeQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), { message: 'La página debe ser un número' })
    .transform(val => val ? parseInt(val, 10) : 1)
    .refine(val => val > 0, 'La página debe ser mayor que 0'),
    
  pageSize: z
    .string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), { message: 'El tamaño de página debe ser un número' })
    .transform(val => val ? parseInt(val, 10) : 15)
    .refine(val => val > 0 && val <= 100, 'El tamaño de página debe estar entre 1 y 100'),
    
  roleId: z
    .string()
    .optional()
    .refine(val => !val || /^\d+$/.test(val), { message: 'El ID del rol debe ser un número' })
    .transform(val => val ? parseInt(val, 10) : undefined),
    
  status: z
    .enum(['active', 'inactive', 'pending', 'suspended'], {
      errorMap: () => ({ message: 'El estado debe ser: active, inactive, pending o suspended' })
    })
    .optional(),
    
  search: z
    .string()
    .trim()
    .optional()
});
```

### Lógica del Controlador

**Controlador**: `getEmployees` en `restaurant-admin.controller.js`

1. **Validación de Owner**: Obtiene `ownerUserId` de `req.user` y verifica que tenga rol de owner con restaurante asignado
2. **Obtención del RestaurantId**: Usa `UserService.getUserWithRoles()` para obtener el `restaurantId` asociado al owner
3. **Delegación al Repositorio**: Llama a `EmployeeRepository.getEmployeesByRestaurant(restaurantId, filters)`
4. **Respuesta**: Devuelve la lista de empleados con metadatos de paginación

### Lógica del Repositorio

**Repositorio**: `EmployeeRepository.getEmployeesByRestaurant()` en `employee.repository.js`

#### Construcción de Filtros:
1. **Filtro Base**: `{ restaurantId: restaurantId }`
2. **Filtro por Rol**: Añade `roleId` si está presente en los filtros
3. **Filtro por Estado**: Añade `user: { status: status }` si está presente
4. **Filtro de Búsqueda**: Añade `OR` clause para buscar en `name`, `lastname`, y `email` con `contains` (case-sensitive para compatibilidad con MySQL)

#### Consultas Paralelas:
1. **Lista de Empleados**: `prisma.userRoleAssignment.findMany()` con:
   - `where`: Cláusula construida con filtros
   - `skip`/`take`: Para paginación
   - `orderBy`: Ordenamiento por nombre y apellido
   - `include`: Usuario, rol y restaurante

2. **Conteo Total**: `prisma.userRoleAssignment.count()` con la misma cláusula `where`

#### Metadatos de Paginación:
- `currentPage`, `pageSize`, `totalItems`, `totalPages`
- `hasNextPage`, `hasPrevPage`, `nextPage`, `prevPage`

### Ejemplo de Query Parameters

```
GET /api/restaurant/employees?page=1&pageSize=10&roleId=5&status=active&search=maria
```

### Estructura de la Respuesta

**Importante**: Cada empleado en la respuesta incluye:
- **`assignmentId`**: ID de la `UserRoleAssignment` (CRÍTICO para actualizaciones)
- **`id`**: ID del usuario empleado
- **Resto de campos**: Información del usuario, rol y restaurante

El campo `assignmentId` es esencial para realizar actualizaciones mediante `PATCH /api/restaurant/employees/:assignmentId`.

### Ejemplo de Respuesta Exitosa (200 OK)

```json
{
    "status": "success",
    "message": "Empleados obtenidos exitosamente",
    "timestamp": "2025-10-19T18:48:02.284Z",
    "data": {
        "employees": [
            {
                "assignmentId": 2,
                "id": 2,
                "name": "Ana",
                "lastname": "García",
                "email": "ana.garcia@pizzeria.com",
                "phone": "2222222222",
                "status": "active",
                "emailVerifiedAt": "2025-10-19T17:52:40.913Z",
                "phoneVerifiedAt": "2025-10-19T17:52:40.913Z",
                "createdAt": "2025-10-19T17:52:40.914Z",
                "updatedAt": "2025-10-19T17:52:40.914Z",
                "role": {
                    "id": 4,
                    "name": "owner",
                    "displayName": "Dueño de Restaurante",
                    "description": "Control total sobre uno o más negocios en la app."
                },
                "restaurant": {
                    "id": 1,
                    "name": "Pizzería de Ana"
                }
            },
            {
                "assignmentId": 3,
                "id": 3,
                "name": "Carlos",
                "lastname": "Rodriguez",
                "email": "carlos.rodriguez@pizzeria.com",
                "phone": "3333333333",
                "status": "active",
                "emailVerifiedAt": "2025-10-19T17:52:41.175Z",
                "phoneVerifiedAt": "2025-10-19T17:52:41.175Z",
                "createdAt": "2025-10-19T17:52:41.177Z",
                "updatedAt": "2025-10-19T17:52:41.177Z",
                "role": {
                    "id": 5,
                    "name": "branch_manager",
                    "displayName": "Gerente de Sucursal",
                    "description": "Gestiona las operaciones diarias de una sucursal específica."
                },
                "restaurant": {
                    "id": 1,
                    "name": "Pizzería de Ana"
                }
            },
            {
                "assignmentId": 7,
                "id": 7,
                "name": "Empleado",
                "lastname": "Prueba",
                "email": "nuevo.empleado.test@pizzeria.com",
                "phone": "9998887777",
                "status": "active",
                "emailVerifiedAt": "2025-10-19T18:38:27.570Z",
                "phoneVerifiedAt": "2025-10-19T18:38:27.570Z",
                "createdAt": "2025-10-19T18:38:27.571Z",
                "updatedAt": "2025-10-19T18:38:27.571Z",
                "role": {
                    "id": 6,
                    "name": "order_manager",
                    "displayName": "Gestor de Pedidos",
                    "description": "Acepta y gestiona los pedidos entrantes en una sucursal."
                },
                "restaurant": {
                    "id": 1,
                    "name": "Pizzería de Ana"
                }
            }
        ],
        "pagination": {
            "currentPage": 1,
            "pageSize": 15,
            "totalItems": 3,
            "totalPages": 1,
            "hasNextPage": false,
            "hasPrevPage": false,
            "nextPage": null,
            "prevPage": null
        }
    }
}
```

### Manejo de Errores

#### Error 400 - Validación de Query Parameters
```json
{
  "status": "error",
  "message": "Validation error",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "pageSize",
      "message": "El tamaño de página debe estar entre 1 y 100"
    },
    {
      "field": "status", 
      "message": "El estado debe ser: active, inactive, pending o suspended"
    }
  ]
}
```

#### Error 403 - Permisos Insuficientes
```json
{
  "status": "error",
  "message": "No tienes permisos para consultar empleados. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

#### Error 403 - Ubicación No Configurada
```json
{
  "status": "error",
  "message": "Debes configurar la ubicación de tu restaurante antes de poder consultar empleados",
  "code": "RESTAURANT_LOCATION_REQUIRED"
}
```

#### Error 404 - Usuario No Encontrado
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "NOT_FOUND"
}
```

#### Error 500 - Error Interno del Servidor
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

### Características del Endpoint

- **Paginación Flexible**: Control de página y tamaño, máximo 100 items por página
- **Filtrado Avanzado**: Por rol, estado y búsqueda de texto en múltiples campos
- **Búsqueda Case-Sensitive**: Búsqueda por nombre, apellido y email (compatible con MySQL)
- **Ordenamiento**: Lista ordenada por nombre y apellido
- **Metadatos Completos**: Información detallada de paginación y navegación
- **Optimización**: Consultas paralelas para mejor rendimiento
- **Seguridad**: Solo owners pueden consultar empleados de su restaurante

---

## Endpoint PATCH /api/restaurant/employees/:assignmentId

### Descripción
Permite al Owner actualizar el rol y/o estado de un empleado específico mediante el ID de su asignación (UserRoleAssignment). El endpoint valida que el empleado pertenezca al restaurante del owner y aplica las restricciones de roles permitidos.

### Middlewares Aplicados

1. **`authenticateToken`**: Verifica que el usuario esté autenticado mediante JWT
2. **`requireRole(['owner'])`**: Verifica que el usuario tenga rol de owner
3. **`requireRestaurantLocation`**: Verifica que el owner tenga configurada la ubicación de su restaurante
4. **`validateParams(assignmentParamsSchema)`**: Valida el parámetro de ruta `:assignmentId`
5. **`validate(updateEmployeeSchema)`**: Valida el body de la petición usando Zod

### Esquemas Zod

#### `assignmentParamsSchema` - Validación de Parámetros
```javascript
const assignmentParamsSchema = z.object({
  assignmentId: z
    .string({
      required_error: 'El ID de asignación es requerido'
    })
    .regex(/^\d+$/, 'El ID de asignación debe ser un número')
    .transform(Number)
    .positive('ID de asignación inválido')
});
```

#### `updateEmployeeSchema` - Validación del Body
```javascript
const updateEmployeeSchema = z.object({
  roleId: z
    .number({
      invalid_type_error: 'El rol debe ser un número'
    })
    .int('El rol debe ser un número entero')
    .positive('Debe seleccionar un rol válido')
    .optional(),
    
  status: z
    .enum(['active', 'inactive', 'suspended'], {
      errorMap: () => ({ message: 'Estado inválido. Debe ser: active, inactive o suspended' })
    })
    .optional()
}).refine(
  data => data.roleId !== undefined || data.status !== undefined,
  {
    message: 'Debe proporcionar al menos uno de los campos: roleId o status',
    path: ['roleId']
  }
);
```

### Lógica del Controlador

**Controlador**: `updateEmployee` en `restaurant-admin.controller.js`

1. **Extracción de Datos**: Obtiene `assignmentId` de `req.params`, `ownerUserId` de `req.user` y `updateData` de `req.body`
2. **Delegación al Repositorio**: Llama a `EmployeeRepository.updateEmployeeAssignment(assignmentId, updateData, ownerUserId, req.id)`
3. **Respuesta**: Devuelve `ResponseService.success()` con los datos actualizados del empleado

### Lógica del Repositorio

**Repositorio**: `EmployeeRepository.updateEmployeeAssignment()` en `employee.repository.js`

#### Proceso de Validación:
1. **Verificación de Owner**: Obtiene `restaurantId` del owner usando `UserService.getUserWithRoles()`
2. **Búsqueda de Asignación**: Encuentra `UserRoleAssignment` por ID incluyendo datos del usuario, rol y restaurante
3. **Validación de Pertenencia**: Verifica que `assignment.restaurantId === ownerRestaurantId`
4. **Campos Actualizables**: Inicializa `updatedFields = []` para tracking

#### Actualización de Rol:
- **Validación del Rol**: Verifica que el nuevo `roleId` existe y pertenece a roles válidos de empleados
- **Roles Permitidos**: `['branch_manager', 'order_manager', 'kitchen_staff', 'driver_restaurant']`
- **Actualización**: `prisma.userRoleAssignment.update()` con nuevo `roleId`

#### Actualización de Estado:
- **Actualización Directa**: `prisma.user.update()` en el usuario para cambiar `status`
- **Estados Válidos**: `'active'`, `'inactive'`, `'suspended'`

#### Respuesta:
- **Datos Finales**: Reconsulta la asignación actualizada con includes completos
- **Estructura**: `{ assignment, employee, updatedFields }`

### Payload de Ejemplo

#### Actualizar Solo el Rol:
```json
{
  "roleId": 5
}
```

#### Actualizar Solo el Estado:
```json
{
  "status": "inactive"
}
```

#### Actualizar Ambos:
```json
{
  "roleId": 5,
  "status": "inactive"
}
```

### Ejemplo de Respuesta Exitosa (200 OK)

```json
{
    "status": "success",
    "message": "Empleado actualizado exitosamente",
    "timestamp": "2025-10-19T19:13:34.171Z",
    "data": {
        "assignment": {
            "id": 7,
            "roleId": 5,
            "restaurantId": 1,
            "branchId": null
        },
        "employee": {
            "id": 7,
            "name": "Empleado",
            "lastname": "Prueba",
            "email": "nuevo.empleado.test@pizzeria.com",
            "phone": "9998887777",
            "status": "inactive",
            "emailVerifiedAt": "2025-10-19T18:38:27.570Z",
            "phoneVerifiedAt": "2025-10-19T18:38:27.570Z",
            "createdAt": "2025-10-19T18:38:27.571Z",
            "updatedAt": "2025-10-19T19:13:33.601Z",
            "role": {
                "id": 5,
                "name": "branch_manager",
                "displayName": "Gerente de Sucursal",
                "description": "Gestiona las operaciones diarias de una sucursal específica."
            },
            "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana"
            }
        },
        "updatedFields": [
            "roleId",
            "status"
        ]
    }
}
```

### Manejo de Errores

#### Error 400 - Validación de Request Body
```json
{
  "status": "error",
  "message": "Debe proporcionar al menos uno de los campos: roleId o status",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "roleId",
      "message": "Debe proporcionar al menos uno de los campos: roleId o status"
    }
  ]
}
```

#### Error 400 - Rol Inválido
```json
{
  "status": "error",
  "message": "Rol no válido para empleados",
  "code": "INVALID_EMPLOYEE_ROLE",
  "details": {
    "roleId": 4,
    "roleName": "owner",
    "validRoles": ["branch_manager", "order_manager", "kitchen_staff", "driver_restaurant"]
  }
}
```

#### Error 404 - Asignación No Encontrada
```json
{
  "status": "error",
  "message": "Asignación de empleado no encontrada",
  "code": "ASSIGNMENT_NOT_FOUND",
  "details": {
    "assignmentId": 999
  }
}
```

#### Error 403 - Acceso Denegado
```json
{
  "status": "error",
  "message": "No tienes permisos para actualizar este empleado",
  "code": "FORBIDDEN_ACCESS",
  "details": {
    "assignmentId": 5,
    "assignmentRestaurantId": 2,
    "ownerRestaurantId": 1
  }
}
```

#### Error 404 - Owner No Encontrado
```json
{
  "status": "error",
  "message": "Usuario owner no encontrado",
  "code": "OWNER_NOT_FOUND"
}
```

#### Error 403 - Sin Restaurante Asignado
```json
{
  "status": "error",
  "message": "No tienes un restaurante asignado para actualizar empleados",
  "code": "NO_RESTAURANT_ASSIGNED",
  "details": {
    "userId": 123
  }
}
```

### Características del Endpoint

- **Validación Estricta**: Solo permite actualizar roles válidos para empleados, excluyendo 'owner'
- **Flexibilidad**: Permite actualizar solo rol, solo estado, o ambos campos simultáneamente
- **Seguridad**: Verificación de pertenencia al restaurante del owner
- **Tracking**: Devuelve `updatedFields` para indicar qué campos fueron modificados
- **Atomicidad**: Cada actualización es independiente, fallando solo la operación específica
- **Logging Completo**: Registra todas las operaciones para auditoría
- **Respuesta Completa**: Incluye datos actualizados del empleado, rol y restaurante

---

## 🛠️ Notas Técnicas y Solución de Problemas

### Error Crítico Solucionado - Búsqueda de Empleados (GET /employees)

**Problema**: El endpoint `GET /api/restaurant/employees` fallaba con error 500 cuando se utilizaban filtros de búsqueda (`search` parameter).

**Error Prisma Original**:
```
Unknown argument `mode`. Did you mean `lte`? Available options are marked with ?.
```

**Causa**: El código utilizaba `mode: 'insensitive'` en las consultas Prisma, que es específico de PostgreSQL y no soportado en MySQL.

**Solución Implementada**: 
1. **Eliminación de `mode: 'insensitive'`** en todas las cláusulas de búsqueda en `src/repositories/employee.repository.js`
2. **Búsqueda case-sensitive**: Ahora se usa solo `contains` sin el parámetro `mode`
3. **Compatibilidad MySQL**: Asegura que las consultas funcionen correctamente en la base de datos MySQL del proyecto

**Código Corregido**:
```javascript
// ❌ ANTES (causaba error en MySQL):
{
  user: {
    name: {
      contains: search,
      mode: 'insensitive'  // No soportado en MySQL
    }
  }
}

// ✅ DESPUÉS (funciona en MySQL):
{
  user: {
    name: {
      contains: search  // Case-sensitive pero funcional
    }
  }
}
```

**Impacto**: 
- ✅ **Búsqueda de empleados ahora funciona correctamente**
- ✅ **Filtros por nombre, apellido y email operativos**
- ⚠️ **Búsqueda es case-sensitive** (se puede mejorar en futuras versiones)

**Nota**: Para implementar búsqueda case-insensitive en MySQL, se requeriría usar consultas SQL raw o modificar la configuración de la base de datos, lo cual está fuera del alcance de esta corrección inmediata.

### 🚨 Error Crítico Solucionado - Falta assignmentId en GET /employees

**Problema**: El endpoint `GET /api/restaurant/employees` no incluía el campo `assignmentId` necesario para que el frontend pudiera actualizar empleados usando `PATCH /api/restaurant/employees/:assignmentId`.

**Error Frontend**:
```
Error: No se puede actualizar empleado - assignmentId es null
```

**Causa**: El repositorio `EmployeeRepository.getEmployeesByRestaurant()` mapeaba los resultados pero no incluía el `assignment.id` (ID de `UserRoleAssignment`).

**Solución Implementada**: 
1. **Añadido campo `assignmentId`** en el mapeo de la respuesta del método `getEmployeesByRestaurant()`
2. **Documentación actualizada** para reflejar la nueva estructura de respuesta
3. **Explicación clara** sobre la diferencia entre `assignmentId` (para PATCH) e `id` (ID del usuario)

**Código Corregido**:
```javascript
// ❌ ANTES (faltaba assignmentId):
const employees = assignments.map(assignment => ({
  id: assignment.user.id, // Solo ID del usuario
  name: assignment.user.name,
  // ... resto de campos
}));

// ✅ DESPUÉS (incluye assignmentId crítico):
const employees = assignments.map(assignment => ({
  assignmentId: assignment.id, // ID de la UserRoleAssignment (CRÍTICO)
  id: assignment.user.id, // ID del usuario
  name: assignment.user.name,
  // ... resto de campos
}));
```

**Estructura de Respuesta Corregida**:
```json
{
  "employees": [
    {
      "assignmentId": 2, // ← CRÍTICO para PATCH /employees/:assignmentId
      "id": 2,           // ← ID del usuario
      "name": "Ana",
      // ... resto de campos
    }
  ]
}
```

**Impacto**: 
- ✅ **Frontend puede ahora actualizar empleados correctamente**
- ✅ **PATCH /api/restaurant/employees/:assignmentId funciona como esperado**
- ✅ **Documentación actualizada con la estructura correcta**
- ✅ **Solución del problema reportado por el equipo de Flutter**
