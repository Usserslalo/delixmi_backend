# Documentación API - Perfil Owner (Propietario de Restaurante)

## 🔐 Autenticación - Login

### Endpoint de Login
**POST** `/api/auth/login`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/auth/login`
- **Archivo de ruta:** `src/routes/auth.routes.js`
- **Prefijo montado:** `/api/auth` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **Rate Limiting** (`loginLimiter`)
   - Archivo: `src/middleware/rateLimit.middleware.js`
   - Configuración: 5 intentos máximos por IP cada 15 minutos
   - Propósito: Protección contra ataques de fuerza bruta

2. **Validación con Zod** (`validate(loginSchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Schema: `src/validations/auth.validation.js` - `loginSchema`

#### Validaciones de Entrada (Zod Schema)

```javascript
const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El correo electrónico es requerido',
      invalid_type_error: 'El correo electrónico debe ser un texto'
    })
    .email('Debe ser un correo electrónico válido')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser un texto'
    })
    .min(1, 'La contraseña no puede estar vacía')
});
```

#### Request Body
```json
{
  "email": "ana.garcia@pizzeria.com",
  "password": "supersecret"
}
```

#### Controlador - Lógica de Negocio
**Archivo:** `src/controllers/auth.controller.js`

##### Flujo del Controlador `login`:

1. **Extracción de datos** (pre-validados por Zod):
   ```javascript
   const { email, password } = req.body;
   ```

2. **Búsqueda del usuario** con relaciones:
   ```javascript
   const user = await prisma.user.findUnique({
     where: { email },
     select: {
       id: true,
       name: true,
       lastname: true,
       email: true,
       phone: true,
       password: true,
       status: true,
       emailVerifiedAt: true,
       phoneVerifiedAt: true,
       createdAt: true,
       updatedAt: true,
       userRoleAssignments: {
         select: {
           roleId: true,
           role: {
             select: {
               name: true,
               displayName: true
             }
           },
           restaurantId: true,
           branchId: true
         }
       }
     }
   });
   ```

3. **Validaciones de seguridad**:
   - **Usuario existe:** `if (!user)` → Error 401
   - **Contraseña válida:** `bcrypt.compare(password, user.password)` → Error 401
   - **Cuenta activa:** `user.status === 'active'` → Error 403

4. **Generación de tokens**:
   - **Access Token:** JWT firmado con `JWT_SECRET`, expira en 15 minutos
   - **Refresh Token:** 64 bytes hexadecimales, hasheado y guardado en BD

#### Respuesta Exitosa

**Status Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "timestamp": "2025-10-18T17:08:21.198Z",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjE4LCJyb2xlTmFtZSI6Im93bmVyIiwiZW1haWwiOiJhbmEuZ2FyY2lhQHBpenplcmlhLmNvbSIsImlhdCI6MTc2MDgwNzI5OCwiZXhwIjoxNzYwODA4MTk4LCJhdWQiOiJkZWxpeG1pLWFwcCIsImlzcyI6ImRlbGl4bWktYXBpIn0.o6FKnmbZwl0lEIAMj0f4QYfBf3uvKocqh3uPJ_QObxk",
    "refreshToken": "b8e0fb6f077c5976d062a1856aafa51474dd3445b27e77ca875a2127579a8c414b04ddbe573aa2817b341fdf1ddafd235434d6c14d5130f8240d42efde79901f",
    "user": {
      "id": 18,
      "name": "Ana",
      "lastname": "García",
      "email": "ana.garcia@pizzeria.com",
      "phone": "2222222222",
      "status": "active",
      "emailVerifiedAt": "2025-10-17T21:13:09.116Z",
      "phoneVerifiedAt": "2025-10-17T21:13:09.116Z",
      "createdAt": "2025-10-17T21:13:09.118Z",
      "updatedAt": "2025-10-17T21:13:09.118Z",
      "roles": [
        {
          "roleId": 14,
          "roleName": "owner",
          "roleDisplayName": "Dueño de Restaurante",
          "restaurantId": 3,
          "branchId": null
        }
      ]
    },
    "expiresIn": "15m"
  }
}
```

#### Estructura de la Respuesta

- **`status`**: Estado de la respuesta (`"success"`)
- **`message`**: Mensaje descriptivo
- **`timestamp`**: Timestamp ISO de la respuesta
- **`data.accessToken`**: Token JWT para autenticación en requests posteriores
- **`data.refreshToken`**: Token para renovar el access token cuando expire
- **`data.user`**: Información completa del usuario logueado
  - **`user.roles`**: Array con roles del usuario (Owner → restaurantId: 3)

#### Uso del Token de Acceso

Para requests posteriores que requieran autenticación, incluir header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Manejo de Errores

El endpoint maneja varios tipos de errores con códigos específicos:

- **400 Bad Request**: Errores de validación Zod
- **401 Unauthorized**: Credenciales incorrectas o usuario no encontrado
- **403 Forbidden**: Cuenta no verificada/inactiva
- **429 Too Many Requests**: Rate limit excedido
- **500 Internal Server Error**: Errores internos del servidor

#### Servicios Utilizados

- **ResponseService**: `src/services/response.service.js` - Respuestas consistentes
- **bcrypt**: Comparación segura de contraseñas
- **jsonwebtoken**: Generación y firma de tokens JWT
- **PrismaClient**: Acceso a base de datos MySQL

---

## 🏢 Perfil del Restaurante - Obtener

### Endpoint de Perfil del Restaurante
**GET** `/api/restaurant/profile`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/profile`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js` (líneas 32-36)
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **`authenticateToken`** (aplicado a todas las rutas del router)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica JWT token, extrae información del usuario y roles
   - Adjunta `req.user` con información completa del usuario autenticado

2. **`requireRole(['owner'])`** (específico de esta ruta)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica que el usuario tenga rol 'owner'
   - Rechaza acceso si no tiene el rol requerido

#### Request Configuration
- **Headers requeridos:**
  ```
  Authorization: Bearer {accessToken}
  ```

- **Sin body** (request GET sin parámetros)

#### Controlador - Lógica de Negocio
**Archivo:** `src/controllers/restaurant-admin.controller.js` (función `getRestaurantProfile`, líneas 2306-2491)

##### Flujo del Controlador:

1. **Extracción de datos del usuario autenticado:**
   ```javascript
   const userId = req.user.id;
   ```

2. **Verificación de roles y obtención de información completa:**
   ```javascript
   const userWithRoles = await UserService.getUserWithRoles(userId, req.id);
   const ownerAssignments = userWithRoles.userRoleAssignments.filter(
     assignment => assignment.role.name === 'owner'
   );
   ```

3. **Obtención del restaurantId asociado al owner:**
   ```javascript
   const ownerAssignment = ownerAssignments.find(
     assignment => assignment.restaurantId !== null
   );
   const restaurantId = ownerAssignment.restaurantId;
   ```

4. **Consulta principal con Prisma (incluye relaciones):**
   ```javascript
   const restaurant = await prisma.restaurant.findUnique({
     where: { id: restaurantId },
     include: {
       owner: {
         select: { id: true, name: true, lastname: true, email: true, phone: true }
       },
       branches: {
         where: { status: 'active' },
         select: { id: true, name: true, address: true, phone: true, status: true, createdAt: true, updatedAt: true },
         orderBy: { name: 'asc' }
       },
       _count: {
         select: { branches: true, subcategories: true, products: true }
       }
     }
   });
   ```

5. **Verificación y limpieza de archivos de imagen:**
   ```javascript
   const verifiedLogoUrl = verifyFileExists(restaurant.logoUrl, uploadsPath);
   const verifiedCoverPhotoUrl = verifyFileExists(restaurant.coverPhotoUrl, uploadsPath);
   ```

#### Lógica de Acceso a Datos
- **ORM:** Prisma Client con MySQL
- **Estrategia:** Utiliza `restaurantId` del token JWT (viene en `req.user.roles[].restaurantId`)
- **Query principal:** `prisma.restaurant.findUnique()` con múltiples `include` para obtener datos relacionados
- **Verificación de archivos:** Los URLs de imágenes se verifican físicamente para limpiar referencias obsoletas

#### Respuesta Exitosa

**Status Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Perfil del restaurante obtenido exitosamente",
  "timestamp": "2025-10-18T17:13:14.052Z",
  "data": {
    "restaurant": {
      "id": 3,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la región, con ingredientes frescos y locales.",
      "logoUrl": null,
      "coverPhotoUrl": null,
      "phone": "+52 771 123 4567",
      "email": "contacto@pizzeriadeana.com",
      "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
      "status": "active",
      "owner": {
        "id": 18,
        "name": "Ana",
        "lastname": "García",
        "email": "ana.garcia@pizzeria.com",
        "phone": "2222222222"
      },
      "branches": [
        {
          "id": 5,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "phone": "7711234567",
          "status": "active",
          "createdAt": "2025-10-17T21:13:11.052Z",
          "updatedAt": "2025-10-17T21:13:11.052Z"
        },
        {
          "id": 7,
          "name": "Sucursal El Fitzhi",
          "address": "Calle Morelos 45, El Fitzhi, Ixmiquilpan, Hgo.",
          "phone": "7719876543",
          "status": "active",
          "createdAt": "2025-10-17T21:13:11.754Z",
          "updatedAt": "2025-10-17T21:13:11.754Z"
        },
        {
          "id": 6,
          "name": "Sucursal Río",
          "address": "Paseo del Roble 205, Barrio del Río, Ixmiquilpan, Hgo.",
          "phone": "7717654321",
          "status": "active",
          "createdAt": "2025-10-17T21:13:11.500Z",
          "updatedAt": "2025-10-17T21:13:11.500Z"
        }
      ],
      "statistics": {
        "totalBranches": 3,
        "totalSubcategories": 9,
        "totalProducts": 10
      },
      "createdAt": "2025-10-17T21:13:10.412Z",
      "updatedAt": "2025-10-18T04:54:45.553Z"
    }
  }
}
```

#### Estructura de la Respuesta

- **`status`**: Estado de la respuesta (`"success"`)
- **`message`**: Mensaje descriptivo de la operación
- **`timestamp`**: Timestamp ISO de la respuesta
- **`data.restaurant`**: Objeto completo del restaurante con:
  - **Datos básicos:** `id`, `name`, `description`, `phone`, `email`, `address`, `status`
  - **URLs de imágenes:** `logoUrl`, `coverPhotoUrl` (verificadas físicamente)
  - **`owner`**: Información del propietario del restaurante
  - **`branches`**: Array de sucursales activas ordenadas alfabéticamente
  - **`statistics`**: Contadores agregados (sucursales, subcategorías, productos)
  - **Timestamps:** `createdAt`, `updatedAt`

#### Manejo de Errores

**401 Unauthorized - Token faltante:**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**401 Unauthorized - Token inválido:**
```json
{
  "status": "error",
  "message": "Token inválido",
  "code": "INVALID_TOKEN"
}
```

**403 Forbidden - Rol incorrecto:**
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["owner"],
  "current": ["customer"]
}
```

**403 Forbidden - Sin restaurante asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este owner",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Restaurante no encontrado:**
```json
{
  "status": "error",
  "message": "Restaurante no encontrado",
  "code": "RESTAURANT_NOT_FOUND"
}
```

#### Servicios Utilizados

- **UserService**: `src/services/user.service.js` - `getUserWithRoles()` para obtener información completa del usuario
- **ResponseService**: `src/services/response.service.js` - Respuestas consistentes y manejo de errores
- **PrismaClient**: Acceso a base de datos MySQL con consultas relacionales
- **fs/path**: Verificación física de archivos de imagen para limpieza de URLs obsoletas

#### Funciones Auxiliares

- **`verifyFileExists()`**: Verifica que los archivos de imagen existan físicamente en el servidor
- **`UserService.getUserWithRoles()`**: Obtiene información completa del usuario con sus roles y asignaciones

---

## 🏢 Perfil del Restaurante - Actualizar

### Endpoint de Actualización del Perfil del Restaurante
**PATCH** `/api/restaurant/profile`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/profile`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js` (líneas 52-57)
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **`authenticateToken`** (aplicado a todas las rutas del router)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica JWT token, extrae información del usuario y roles

2. **`requireRole(['owner'])`** (específico de esta ruta)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica que el usuario tenga rol 'owner'

3. **`validate(updateProfileSchema)`** (nuevo - refactorizado)
   - Archivo: `src/middleware/validate.middleware.js`
   - Schema: `src/validations/restaurant-admin.validation.js` - `updateProfileSchema`

#### Validaciones de Entrada (Zod Schema)

```javascript
const updateProfileSchema = z.object({
  name: z
    .string({ invalid_type_error: 'El nombre debe ser un texto' })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .trim()
    .optional(),
  
  description: z
    .string({ invalid_type_error: 'La descripción debe ser un texto' })
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),
  
  phone: z
    .string({ invalid_type_error: 'El teléfono debe ser un texto' })
    .min(10, 'El teléfono debe tener al menos 10 caracteres')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(/^[\+]?[\d\s\-\(\)]+$/, 'El formato del teléfono no es válido')
    .trim()
    .optional(),
  
  email: z
    .string({ invalid_type_error: 'El email debe ser un texto' })
    .email('El email debe tener un formato válido')
    .max(150, 'El email no puede exceder 150 caracteres')
    .toLowerCase()
    .trim()
    .optional(),
  
  address: z
    .string({ invalid_type_error: 'La dirección debe ser un texto' })
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .trim()
    .optional(),
  
  logoUrl: z
    .string({ invalid_type_error: 'La URL del logo debe ser un texto' })
    .url('La URL del logo no es válida')
    .max(255, 'La URL del logo no puede exceder 255 caracteres')
    .trim()
    .nullable()
    .optional(),
  
  coverPhotoUrl: z
    .string({ invalid_type_error: 'La URL de la foto de portada debe ser un texto' })
    .url('La URL de la foto de portada no es válida')
    .max(255, 'La URL de la foto de portada no puede exceder 255 caracteres')
    .trim()
    .nullable()
    .optional()
}).strict(); // No permitir campos adicionales
```

#### Request Configuration
- **Headers requeridos:**
  ```
  Authorization: Bearer {accessToken}
  Content-Type: application/json
  ```

- **Body:** Tipo `raw` con formato `JSON` (todos los campos opcionales)

**Ejemplo de Request Body:**
```json
{
  "name": "Pizzería de Ana (Actualizado)",
  "phone": "+52 555 123 4567"
}
```

#### Controlador - Lógica de Negocio
**Archivo:** `src/controllers/restaurant-admin.controller.js` (función `updateRestaurantProfile`, líneas 2500-2619)

##### Flujo del Controlador (Refactorizado):

1. **Extracción de datos del usuario autenticado:**
   ```javascript
   const userId = req.user.id;
   ```

2. **Verificación de roles y obtención de información completa:**
   ```javascript
   const userWithRoles = await UserService.getUserWithRoles(userId, req.id);
   const ownerAssignments = userWithRoles.userRoleAssignments.filter(
     assignment => assignment.role.name === 'owner'
   );
   ```

3. **Obtención del restaurantId asociado al owner:**
   ```javascript
   const ownerAssignment = ownerAssignments.find(
     assignment => assignment.restaurantId !== null
   );
   const restaurantId = ownerAssignment.restaurantId;
   ```

4. **Verificación de existencia del restaurante usando Repository:**
   ```javascript
   const existingRestaurant = await RestaurantRepository.findById(restaurantId);
   ```

5. **Validación de datos y actualización usando Repository:**
   ```javascript
   const dataToUpdate = req.body; // Ya validado por Zod
   const updatedRestaurant = await RestaurantRepository.updateProfile(restaurantId, dataToUpdate);
   ```

#### Lógica de Acceso a Datos (Refactorizada)
- **ORM:** Prisma Client con MySQL
- **Patrón Repository:** `src/repositories/restaurant.repository.js`
- **Estrategia:** Utiliza `restaurantId` del token JWT y Repository para actualizaciones
- **Método principal:** `RestaurantRepository.updateProfile()` que maneja la actualización con relaciones

#### Respuesta Exitosa

**Status Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Información del restaurante actualizada exitosamente",
  "timestamp": "2025-10-18T17:23:27.976Z",
  "data": {
    "restaurant": {
      "id": 3,
      "name": "Pizzería de Ana (Actualizado)",
      "description": "Las mejores pizzas artesanales de la región, con ingredientes frescos y locales.",
      "logoUrl": null,
      "coverPhotoUrl": null,
      "phone": "+52 555 123 4567",
      "email": "contacto@pizzeriadeana.com",
      "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
      "status": "active",
      "owner": {
        "id": 18,
        "name": "Ana",
        "lastname": "García",
        "email": "ana.garcia@pizzeria.com",
        "phone": "2222222222"
      },
      "branches": [
        {
          "id": 5,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "phone": "7711234567",
          "status": "active",
          "createdAt": "2025-10-17T21:13:11.052Z",
          "updatedAt": "2025-10-17T21:13:11.052Z"
        },
        {
          "id": 7,
          "name": "Sucursal El Fitzhi",
          "address": "Calle Morelos 45, El Fitzhi, Ixmiquilpan, Hgo.",
          "phone": "7719876543",
          "status": "active",
          "createdAt": "2025-10-17T21:13:11.754Z",
          "updatedAt": "2025-10-17T21:13:11.754Z"
        },
        {
          "id": 6,
          "name": "Sucursal Río",
          "address": "Paseo del Roble 205, Barrio del Río, Ixmiquilpan, Hgo.",
          "phone": "7717654321",
          "status": "active",
          "createdAt": "2025-10-17T21:13:11.500Z",
          "updatedAt": "2025-10-17T21:13:11.500Z"
        }
      ],
      "statistics": {
        "totalBranches": 3,
        "totalSubcategories": 9,
        "totalProducts": 10
      },
      "createdAt": "2025-10-17T21:13:10.412Z",
      "updatedAt": "2025-10-18T17:23:27.402Z"
    },
    "updatedFields": [
      "name",
      "phone"
    ],
    "updatedBy": {
      "userId": 18,
      "userName": "Ana García"
    }
  }
}
```

#### Estructura de la Respuesta

- **`status`**: Estado de la respuesta (`"success"`)
- **`message`**: Mensaje descriptivo de la operación
- **`timestamp`**: Timestamp ISO de la respuesta
- **`data.restaurant`**: Objeto completo del restaurante actualizado con:
  - **Datos básicos actualizados:** `name`, `phone`, `description`, etc.
  - **URLs de imágenes:** `logoUrl`, `coverPhotoUrl`
  - **`owner`**: Información del propietario (no cambia)
  - **`branches`**: Array de sucursales activas (no cambia)
  - **`statistics`**: Contadores agregados (no cambia)
  - **Timestamps:** `createdAt`, `updatedAt` (actualizado automáticamente)
- **`data.updatedFields`**: Array con los nombres de los campos que fueron actualizados
- **`data.updatedBy`**: Información del usuario que realizó la actualización

#### Manejo de Errores

**400 Bad Request - Validación Zod fallida:**
```json
{
  "status": "error",
  "message": "El nombre debe tener al menos 3 caracteres",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "name",
      "message": "El nombre debe tener al menos 3 caracteres",
      "code": "too_small"
    }
  ]
}
```

**400 Bad Request - Sin campos para actualizar:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**401 Unauthorized - Token faltante/inválido:**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden - Permisos insuficientes:**
```json
{
  "status": "error",
  "message": "Permisos insuficientes",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["owner"],
  "current": ["customer"]
}
```

**404 Not Found - Restaurante no encontrado:**
```json
{
  "status": "error",
  "message": "Restaurante no encontrado",
  "code": "RESTAURANT_NOT_FOUND"
}
```

#### Servicios Utilizados

- **UserService**: `src/services/user.service.js` - `getUserWithRoles()` para obtener información completa del usuario
- **RestaurantRepository**: `src/repositories/restaurant.repository.js` - Patrón Repository para operaciones de base de datos
- **ResponseService**: `src/services/response.service.js` - Respuestas consistentes y manejo de errores

#### Mejoras Implementadas (Refactorización)

1. **Patrón Repository**: Separación de la lógica de acceso a datos
2. **Validación Zod**: Esquemas más robustos y mantenibles
3. **Código más limpio**: Eliminación de validaciones manuales y lógica repetitiva
4. **Mejor mantenibilidad**: Cambios futuros más fáciles de implementar

---

## 🖼️ Subida de Logo del Restaurante

### Endpoint de Subida de Logo
**POST** `/api/restaurant/upload-logo`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/upload-logo`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js` (líneas 1103-1109)
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **`authenticateToken`** (aplicado a todas las rutas del router)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica JWT token y extrae información del usuario

2. **`requireRole(['owner'])`** (específico de esta ruta)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica que el usuario tenga rol 'owner'

3. **`upload.single('logo')`** (middleware de Multer)
   - Archivo: `src/config/multer.js`
   - **Función:** Procesa la subida de un solo archivo con el campo name 'logo'
   - **Configuración:**
     - **Almacenamiento:** Disco local en `public/uploads/logos/`
     - **Formato filename:** `logo_{timestamp}_{randomNumber}.{extension}`
     - **Límites:** 5MB máximo, solo 1 archivo
     - **Filtros:** Solo imágenes JPG, JPEG, PNG

4. **`handleMulterError`** (manejo de errores de Multer)
   - Archivo: `src/config/multer.js`
   - **Función:** Captura y formatea errores específicos de Multer

#### Controlador: uploadRestaurantLogo
**Archivo:** `src/controllers/upload.controller.js` (líneas 32-120)

##### Flujo del Controlador (Actualizado):

1. **Verificación de archivo subido:**
   ```javascript
   if (!req.file) {
     return res.status(400).json({
       status: 'error',
       message: 'No se proporcionó ningún archivo',
       code: 'NO_FILE_PROVIDED'
     });
   }
   ```

2. **Obtención del restaurantId del usuario autenticado:**
   ```javascript
   const userId = req.user.id;
   const userWithRoles = await UserService.getUserWithRoles(userId, req.id);
   
   // Verificar rol de owner y obtener restaurantId
   const ownerAssignments = userWithRoles.userRoleAssignments.filter(
     assignment => assignment.role.name === 'owner'
   );
   const ownerAssignment = ownerAssignments.find(
     assignment => assignment.restaurantId !== null
   );
   const restaurantId = ownerAssignment.restaurantId;
   ```

3. **Construcción de URL pública y actualización en BD:**
   ```javascript
   const baseUrl = getBaseUrl(req);
   const fileUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;
   
   // Actualizar el logoUrl en la base de datos
   await RestaurantRepository.updateProfile(restaurantId, { logoUrl: fileUrl });
   ```

4. **Respuesta exitosa:**
   ```javascript
   res.status(200).json({
     status: 'success',
     message: 'Logo subido exitosamente',
     data: {
       logoUrl: fileUrl,
       filename: req.file.filename,
       originalName: req.file.originalname,
       size: req.file.size,
       mimetype: req.file.mimetype,
       restaurantId: restaurantId
     }
   });
   ```

#### Configuración de Postman

##### Headers Requeridos:
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data (automático)
```

##### Body Configuration:
- **Tipo:** `form-data`
- **Key:** `logo` (tipo: File)
- **Value:** Seleccionar archivo de imagen

##### Requisitos del Archivo:
- **Formatos permitidos:** JPG, JPEG, PNG
- **Tamaño máximo:** 5MB
- **Solo un archivo por vez**

#### Respuesta Exitosa

**Status Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Logo subido exitosamente",
  "data": {
    "logoUrl": "https://delixmi-backend.onrender.com/uploads/logos/logo_1760808959176_1798.jpg",
    "filename": "logo_1760808959176_1798.jpg",
    "originalName": "logo.jpg",
    "size": 358751,
    "mimetype": "image/jpeg",
    "restaurantId": 3
  }
}
```

#### Estructura de la Respuesta
- **`status`**: Estado de la respuesta (`"success"`)
- **`message`**: Mensaje descriptivo
- **`data.logoUrl`**: URL completa pública del archivo subido
- **`data.filename`**: Nombre único generado por Multer
- **`data.originalName`**: Nombre original del archivo del usuario
- **`data.size`**: Tamaño del archivo en bytes
- **`data.mimetype`**: Tipo MIME del archivo
- **`data.restaurantId`**: ID del restaurante actualizado

#### Manejo de Errores

**400 Bad Request - Sin archivo:**
```json
{
  "status": "error",
  "message": "No se proporcionó ningún archivo",
  "code": "NO_FILE_PROVIDED"
}
```

**400 Bad Request - Archivo muy grande (>5MB):**
```json
{
  "status": "error",
  "message": "El archivo es demasiado grande. El tamaño máximo permitido es 5MB",
  "code": "FILE_TOO_LARGE"
}
```

**400 Bad Request - Tipo de archivo inválido (.txt):**
```json
{
  "status": "error",
  "message": "Solo se permiten archivos JPG, JPEG y PNG",
  "code": "INVALID_FILE_TYPE"
}
```

**400 Bad Request - No es imagen:**
```json
{
  "status": "error",
  "message": "Solo se permiten archivos de imagen",
  "code": "INVALID_FILE_TYPE"
}
```

**401 Unauthorized - Token faltante/inválido:**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden - Permisos insuficientes:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - Sin restaurante asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este owner",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

#### Lógica de Acceso a Datos
- **Multer:** Maneja la subida y almacenamiento de archivos
- **Almacenamiento:** Disco local en `public/uploads/logos/`
- **Naming:** Nombres únicos basados en timestamp + número aleatorio
- **URLs públicas:** Servidas estáticamente desde `/uploads/logos/`
- **Base de datos:** Actualiza el campo `logoUrl` del restaurante usando `RestaurantRepository`

#### Servicios Utilizados

- **Multer**: `src/config/multer.js` - Manejo de uploads de archivos
- **UserService**: `src/services/user.service.js` - `getUserWithRoles()` para obtener información del usuario
- **RestaurantRepository**: `src/repositories/restaurant.repository.js` - Actualización del campo `logoUrl`
- **ResponseService**: `src/services/response.service.js` - Respuestas consistentes
- **Express.static**: Configurado en `src/server.js` para servir archivos estáticos
- **getBaseUrl()**: Función helper para construir URLs robustas en diferentes entornos

#### Configuración de Multer Detallada

```javascript
const upload = multer({
  storage: diskStorage({
    destination: 'public/uploads/logos/',
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const randomNumber = Math.round(Math.random() * 10000);
      const extension = path.extname(file.originalname);
      cb(null, `logo_${timestamp}_${randomNumber}${extension}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Solo imágenes JPG, JPEG, PNG
    if (file.mimetype.startsWith('image/')) {
      const allowedExtensions = ['.jpg', '.jpeg', '.png'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedExtensions.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Solo se permiten archivos JPG, JPEG y PNG'), false);
      }
    } else {
      cb(new Error('Solo se permiten archivos de imagen'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Solo un archivo
  }
});
```

#### Nota Importante
**✅ ACTUALIZADO:** Este endpoint ahora actualiza automáticamente el campo `logoUrl` en la base de datos del restaurante después de subir el archivo exitosamente. Esto significa que el logo aparecerá inmediatamente en el perfil del restaurante cuando se consulte con `GET /api/restaurant/profile`.

---

## 🖼️ Subida de Foto de Portada del Restaurante

### Endpoint de Subida de Foto de Portada
**POST** `/api/restaurant/upload-cover`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/upload-cover`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js` (líneas 1131-1137)
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados
1. **`authenticateToken`** (aplicado a todas las rutas del router)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica JWT token y extrae información del usuario

2. **`requireRole(['owner'])`** (específico de esta ruta)
   - Archivo: `src/middleware/auth.middleware.js`
   - Verifica que el usuario tenga rol 'owner'

3. **`uploadCover.single('cover')`** (middleware de Multer)
   - Archivo: `src/config/multer.js`
   - **Función:** Procesa la subida de un solo archivo con el campo name 'cover'
   - **Configuración:**
     - **Almacenamiento:** Disco local en `public/uploads/covers/`
     - **Formato filename:** `cover_{timestamp}_{randomNumber}.{extension}`
     - **Límites:** 5MB máximo, solo 1 archivo
     - **Filtros:** Solo imágenes JPG, JPEG, PNG

4. **`handleMulterError`** (manejo de errores de Multer)
   - Archivo: `src/config/multer.js`
   - **Función:** Captura y formatea errores específicos de Multer

#### Controlador: uploadRestaurantCover
**Archivo:** `src/controllers/upload.controller.js` (líneas 126-214)

##### Flujo del Controlador:

1. **Verificación de archivo subido:**
   ```javascript
   if (!req.file) {
     return res.status(400).json({
       status: 'error',
       message: 'No se proporcionó ningún archivo',
       code: 'NO_FILE_PROVIDED'
     });
   }
   ```

2. **Obtención del restaurantId del usuario autenticado:**
   ```javascript
   const userId = req.user.id;
   const userWithRoles = await UserService.getUserWithRoles(userId, req.id);
   
   // Verificar rol de owner y obtener restaurantId
   const ownerAssignments = userWithRoles.userRoleAssignments.filter(
     assignment => assignment.role.name === 'owner'
   );
   const ownerAssignment = ownerAssignments.find(
     assignment => assignment.restaurantId !== null
   );
   const restaurantId = ownerAssignment.restaurantId;
   ```

3. **Construcción de URL pública y actualización en BD:**
   ```javascript
   const baseUrl = getBaseUrl(req);
   const fileUrl = `${baseUrl}/uploads/covers/${req.file.filename}`;
   
   // Actualizar el coverPhotoUrl en la base de datos
   await RestaurantRepository.updateProfile(restaurantId, { coverPhotoUrl: fileUrl });
   ```

4. **Respuesta exitosa:**
   ```javascript
   res.status(200).json({
     status: 'success',
     message: 'Foto de portada subida exitosamente',
     data: {
       coverPhotoUrl: fileUrl,
       filename: req.file.filename,
       originalName: req.file.originalname,
       size: req.file.size,
       mimetype: req.file.mimetype,
       restaurantId: restaurantId
     }
   });
   ```

#### Configuración de Postman

##### Headers Requeridos:
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data (automático)
```

##### Body Configuration:
- **Tipo:** `form-data`
- **Key:** `cover` (tipo: File)
- **Value:** Seleccionar archivo de imagen

##### Requisitos del Archivo:
- **Formatos permitidos:** JPG, JPEG, PNG
- **Tamaño máximo:** 5MB
- **Solo un archivo por vez**

#### Respuesta Exitosa

**Status Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Foto de portada subida exitosamente",
  "data": {
    "coverPhotoUrl": "https://delixmi-backend.onrender.com/uploads/covers/cover_1760809236169_7914.jpg",
    "filename": "cover_1760809236169_7914.jpg",
    "originalName": "pizza.jpg",
    "size": 300752,
    "mimetype": "image/jpeg",
    "restaurantId": 3
  }
}
```

#### Estructura de la Respuesta
- **`status`**: Estado de la respuesta (`"success"`)
- **`message`**: Mensaje descriptivo
- **`data.coverPhotoUrl`**: URL completa pública del archivo subido
- **`data.filename`**: Nombre único generado por Multer
- **`data.originalName`**: Nombre original del archivo del usuario
- **`data.size`**: Tamaño del archivo en bytes
- **`data.mimetype`**: Tipo MIME del archivo
- **`data.restaurantId`**: ID del restaurante actualizado

#### Manejo de Errores

**400 Bad Request - Sin archivo:**
```json
{
  "status": "error",
  "message": "No se proporcionó ningún archivo",
  "code": "NO_FILE_PROVIDED"
}
```

**400 Bad Request - Archivo muy grande (>5MB):**
```json
{
  "status": "error",
  "message": "El archivo es demasiado grande. El tamaño máximo permitido es 5MB",
  "code": "FILE_TOO_LARGE"
}
```

**400 Bad Request - Tipo de archivo inválido (.txt):**
```json
{
  "status": "error",
  "message": "Solo se permiten archivos JPG, JPEG y PNG",
  "code": "INVALID_FILE_TYPE"
}
```

**400 Bad Request - No es imagen:**
```json
{
  "status": "error",
  "message": "Solo se permiten archivos de imagen",
  "code": "INVALID_FILE_TYPE"
}
```

**401 Unauthorized - Token faltante/inválido:**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**403 Forbidden - Permisos insuficientes:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - Sin restaurante asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este owner",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

#### Lógica de Acceso a Datos
- **Multer:** Maneja la subida y almacenamiento de archivos usando `uploadCover`
- **Almacenamiento:** Disco local en `public/uploads/covers/`
- **Naming:** Nombres únicos basados en timestamp + número aleatorio con prefijo `cover_`
- **URLs públicas:** Servidas estáticamente desde `/uploads/covers/`
- **Base de datos:** Actualiza el campo `coverPhotoUrl` del restaurante usando `RestaurantRepository`

#### Servicios Utilizados

- **Multer uploadCover**: `src/config/multer.js` - Manejo específico de uploads de fotos de portada
- **UserService**: `src/services/user.service.js` - `getUserWithRoles()` para obtener información del usuario
- **RestaurantRepository**: `src/repositories/restaurant.repository.js` - Actualización del campo `coverPhotoUrl`
- **ResponseService**: `src/services/response.service.js` - Respuestas consistentes
- **Express.static**: Configurado en `src/server.js` para servir archivos estáticos
- **getBaseUrl()**: Función helper para construir URLs robustas en diferentes entornos

#### Configuración de Multer para Covers

```javascript
const uploadCover = multer({
  storage: coverStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Solo un archivo
  }
});

// Configuración específica para covers
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/covers');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNumber = Math.round(Math.random() * 10000);
    const extension = path.extname(file.originalname);
    cb(null, `cover_${timestamp}_${randomNumber}${extension}`);
  }
});
```

#### Diferencias con el Endpoint de Logo

| Aspecto | Logo | Foto de Portada |
|---------|------|-----------------|
| **Key en form-data** | `logo` | `cover` |
| **Directorio** | `/uploads/logos/` | `/uploads/covers/` |
| **Prefijo filename** | `logo_` | `cover_` |
| **Campo BD** | `logoUrl` | `coverPhotoUrl` |
| **Middleware** | `upload.single('logo')` | `uploadCover.single('cover')` |

#### Nota Importante
**✅ ACTUALIZADO:** Este endpoint ahora actualiza automáticamente el campo `coverPhotoUrl` en la base de datos del restaurante después de subir el archivo exitosamente. Esto significa que la foto de portada aparecerá inmediatamente en el perfil del restaurante cuando se consulte con `GET /api/restaurant/profile`.
