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
  "email": "maria.garcia@pizzeria.com",
  "password": "contraseña123",
  "name": "María",
  "lastname": "García",
  "phone": "7771234567",
  "roleId": 5
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
  "timestamp": "2025-10-19T18:00:00.000Z",
  "data": {
    "employee": {
      "id": 7,
      "name": "María",
      "lastname": "García",
      "email": "maria.garcia@pizzeria.com",
      "phone": "7771234567",
      "status": "active",
      "emailVerifiedAt": "2025-10-19T18:00:00.000Z",
      "phoneVerifiedAt": "2025-10-19T18:00:00.000Z",
      "createdAt": "2025-10-19T18:00:00.000Z",
      "updatedAt": "2025-10-19T18:00:00.000Z",
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
