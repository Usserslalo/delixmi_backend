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
