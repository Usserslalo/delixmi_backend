# Documentación API - Configuración de Ubicación del Restaurante

## Introducción

La configuración de la ubicación principal del restaurante es **obligatoria** para acceder a la mayoría de las funciones de administración del Owner. Este sistema garantiza que todos los restaurantes tengan configurada su ubicación geográfica antes de poder gestionar su menú, pedidos, sucursales y demás funcionalidades operativas.

Una vez configurada la ubicación, el Owner podrá acceder a todas las funciones del sistema. Si la ubicación no está configurada, recibirá un error 403 con el código `LOCATION_REQUIRED` al intentar acceder a las rutas protegidas.

---

## Endpoint GET /api/restaurant/location-status

### Descripción
Obtiene el estado de configuración de ubicación del restaurante del owner autenticado.

### Middlewares
- `authenticateToken`: Verifica que el usuario esté autenticado
- `requireRole(['owner'])`: Verifica que el usuario tenga rol de owner

### Lógica del Controlador y Repositorio

**Controlador**: `getLocationStatus` en `restaurant-admin.controller.js`
1. Obtiene el `userId` del token autenticado
2. Verifica que el usuario sea owner y tenga un restaurante asignado
3. Llama a `RestaurantRepository.getLocationStatus(restaurantId)` para verificar estado
4. Llama a `RestaurantRepository.getLocationData(restaurantId)` para obtener datos completos

**Repositorio**: `getLocationStatus` y `getLocationData` en `restaurant.repository.js`

**Método para verificar estado:**
```javascript
static async getLocationStatus(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      latitude: true,
      longitude: true
    }
  });

  if (!restaurant) {
    return false;
  }

  return restaurant.latitude !== null && restaurant.longitude !== null;
}
```

**Método para obtener datos completos:**
```javascript
static async getLocationData(restaurantId) {
  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      latitude: true,
      longitude: true,
      address: true
    }
  });

  if (!restaurant || restaurant.latitude === null || restaurant.longitude === null) {
    return null;
  }

  return {
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    address: restaurant.address
  };
}
```

### Mejora de UX - Datos Completos de Ubicación

**🎯 Problema Resuelto**: El endpoint ahora devuelve tanto el estado (`isLocationSet`) como los datos completos de ubicación (`location`) en una sola petición. Esto permite al frontend:

1. **Cargar la ubicación guardada** sin cambiar automáticamente la ubicación actual
2. **Mostrar el mapa** con la ubicación exacta guardada en la base de datos
3. **Evitar cambios accidentales** de la ubicación al solo revisar la configuración actual
4. **Mantener UX consistente** entre estados de ubicación configurada/no configurada

### Respuesta Exitosa

**Caso 1: Ubicación NO configurada**
```json
{
    "status": "success",
    "message": "Estado de ubicación obtenido exitosamente",
    "timestamp": "2025-10-18T23:17:27.910Z",
    "data": {
        "isLocationSet": false,
        "location": null
    }
}
```

**Caso 2: Ubicación configurada**
```json
{
    "status": "success",
    "message": "Estado de ubicación obtenido exitosamente",
    "timestamp": "2025-10-18T23:18:00.567Z",
    "data": {
        "isLocationSet": true,
        "location": {
            "latitude": "19.432608",
            "longitude": "-99.133209",
            "address": "Plaza de la Constitución S/N, Centro Histórico, CDMX"
        }
    }
}
```

### Manejo de Errores

**Error 403 - Permisos Insuficientes**
```json
{
    "status": "error",
    "message": "Acceso denegado. Se requiere rol de owner",
    "code": "INSUFFICIENT_PERMISSIONS"
}
```

**Error 404 - Usuario No Encontrado**
```json
{
    "status": "error",
    "message": "Usuario no encontrado",
    "code": "NOT_FOUND"
}
```

---

## Endpoint PATCH /api/restaurant/location

### Descripción
Actualiza la ubicación principal del restaurante del owner autenticado.

### Middlewares
- `authenticateToken`: Verifica que el usuario esté autenticado
- `requireRole(['owner'])`: Verifica que el usuario tenga rol de owner
- `validate(updateLocationSchema)`: Valida el payload usando Zod

### Esquema Zod `updateLocationSchema`

**Archivo**: `src/validations/restaurant-admin.validation.js`

```javascript
const updateLocationSchema = z.object({
  latitude: z
    .number({
      invalid_type_error: 'La latitud debe ser un número'
    })
    .min(-90, 'La latitud debe ser mayor o igual a -90')
    .max(90, 'La latitud debe ser menor o igual a 90'),
  
  longitude: z
    .number({
      invalid_type_error: 'La longitud debe ser un número'
    })
    .min(-180, 'La longitud debe ser mayor o igual a -180')
    .max(180, 'La longitud debe ser menor o igual a 180'),
  
  address: z
    .string({
      invalid_type_error: 'La dirección debe ser un texto'
    })
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(255, 'La dirección no puede exceder 255 caracteres')
    .trim()
    .optional()
}).strict();
```

### Lógica del Controlador y Repositorio

**Controlador**: `updateLocation` en `restaurant-admin.controller.js`
1. Obtiene el `userId` del token autenticado
2. Verifica que el usuario sea owner y tenga un restaurante asignado
3. Obtiene los datos validados del `req.body`
4. Llama a `RestaurantRepository.updateLocation(restaurantId, data)`

**Repositorio**: `updateLocation` en `restaurant.repository.js`

El método `updateLocation` ahora implementa un comportamiento mejorado que, además de actualizar la ubicación del restaurante, también gestiona automáticamente la sucursal principal asociada:

```javascript
static async updateLocation(restaurantId, data) {
  return await prisma.$transaction(async (tx) => {
    // 1. Actualizar el restaurante
    const updatedRestaurant = await tx.restaurant.update({
      where: { id: restaurantId },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address || undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        updatedAt: true
      }
    });

    // 2. Buscar si existe una sucursal asociada a este restaurante
    const existingBranch = await tx.branch.findFirst({
      where: {
        restaurantId: restaurantId
      }
    });

    if (existingBranch) {
      // 3a. Si existe la sucursal, actualizarla con los mismos datos de ubicación
      await tx.branch.update({
        where: {
          id: existingBranch.id
        },
        data: {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || undefined,
          updatedAt: new Date()
        }
      });
    } else {
      // 3b. Si no existe la sucursal, crearla
      await tx.branch.create({
        data: {
          restaurantId: restaurantId,
          name: updatedRestaurant.name || 'Principal',
          address: data.address || undefined,
          latitude: data.latitude,
          longitude: data.longitude,
          status: 'active'
        }
      });
    }

    return updatedRestaurant;
  });
}
```

#### Gestión Automática de Sucursal Principal

El método `updateLocation` ahora incluye lógica adicional para garantizar que la ubicación de la sucursal principal siempre esté sincronizada con la ubicación del restaurante:

1. **Actualmente existe una sucursal**: Se actualiza automáticamente con los mismos datos de ubicación (latitude, longitude, address)

2. **No existe sucursal**: Se crea automáticamente una nueva sucursal con:
   - Nombre: "Principal" o el nombre del restaurante (si está disponible)
   - Estado: `active`
   - Mismos datos de ubicación que el restaurante

3. **Transacción atómica**: Toda la operación se ejecuta dentro de una transacción de base de datos, garantizando consistencia en caso de errores.

Esta simplificación elimina la necesidad de gestionar sucursales manualmente, ya que cada restaurante ahora tiene automáticamente una única sucursal que refleja su ubicación principal.

### Payload de Ejemplo

```json
{
  "latitude": 20.5880,
  "longitude": -100.3899,
  "address": "Calle Corregidora 1, Centro, Querétaro"
}
```

### Respuesta Exitosa

```json
{
    "status": "success",
    "message": "Ubicación del restaurante actualizada exitosamente",
    "timestamp": "2025-10-19T17:20:51.271Z",
    "data": {
        "restaurant": {
            "id": 1,
            "name": "Pizzería de Ana",
            "latitude": "20.588",
            "longitude": "-100.3899",
            "address": "Calle Corregidora 1, Centro, Querétaro",
            "updatedAt": "2025-10-19T17:20:50.557Z"
        }
    }
}
```

### Manejo de Errores

**Error 400 - Validación Zod Fallida**
```json
{
    "status": "error",
    "message": "Datos de entrada inválidos",
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

**Error 403 - Permisos Insuficientes**
```json
{
    "status": "error",
    "message": "Acceso denegado. Se requiere rol de owner",
    "code": "INSUFFICIENT_PERMISSIONS"
}
```

**Error 404 - Usuario No Encontrado**
```json
{
    "status": "error",
    "message": "Usuario no encontrado",
    "code": "NOT_FOUND"
}
```

---

## Endpoint GET /api/restaurant/primary-branch

### Descripción
Obtiene la información de la sucursal principal (única activa) asociada al restaurante del owner autenticado. Este endpoint es especialmente útil para aplicaciones Flutter que necesitan mostrar la información de la sucursal única del restaurante.

### Middlewares
- `authenticateToken`: Verifica que el usuario esté autenticado
- `requireRole(['owner'])`: Verifica que el usuario tenga rol de owner

### Lógica del Controlador y Repositorio

**Controlador**: `getPrimaryBranch` en `restaurant-admin.controller.js`

1. **Validación de Usuario**: Obtiene el `userId` del token autenticado y verifica que el usuario tenga rol de owner
2. **Obtención del Restaurant**: Usa `UserService.getUserWithRoles()` para obtener el `restaurantId` asociado al owner
3. **Búsqueda de Sucursal**: Llama a `BranchRepository.findPrimaryBranchByRestaurantId(restaurantId)` para obtener la sucursal principal
4. **Validación de Resultado**: Si la sucursal no existe, devuelve error 404; si existe, devuelve la información completa

**Repositorio**: Utiliza `BranchRepository.findPrimaryBranchByRestaurantId()` que:
- Busca la primera sucursal activa (`status: 'active'`) asociada al restaurante
- Devuelve información completa de la sucursal incluyendo ubicación, horarios de entrega, configuración, etc.

### Respuesta Exitosa

```json
{
    "status": "success",
    "message": "Sucursal principal obtenida exitosamente",
    "timestamp": "2025-10-19T17:30:00.000Z",
    "data": {
        "branch": {
            "id": 1,
            "restaurantId": 1,
            "name": "Pizzería de Ana",
            "address": "Calle Corregidora 1, Centro, Querétaro",
            "latitude": "20.588",
            "longitude": "-100.3899",
            "phone": null,
            "usesPlatformDrivers": true,
            "deliveryFee": "25.00",
            "estimatedDeliveryMin": 25,
            "estimatedDeliveryMax": 35,
            "deliveryRadius": "5.00",
            "status": "active",
            "createdAt": "2025-10-18T22:30:00.000Z",
            "updatedAt": "2025-10-19T17:20:50.557Z"
        }
    }
}
```

### Manejo de Errores

**Error 404 - Sucursal Principal No Encontrada**
```json
{
    "status": "error",
    "message": "Sucursal principal no encontrada",
    "code": "PRIMARY_BRANCH_NOT_FOUND"
}
```

**Error 403 - Permisos Insuficientes**
```json
{
    "status": "error",
    "message": "Acceso denegado. Se requiere rol de owner",
    "code": "INSUFFICIENT_PERMISSIONS"
}
```

**Error 403 - Sin Restaurante Asignado**
```json
{
    "status": "error",
    "message": "No se encontró un restaurante asignado para este owner",
    "code": "NO_RESTAURANT_ASSIGNED"
}
```

**Error 404 - Usuario No Encontrado**
```json
{
    "status": "error",
    "message": "Usuario no encontrado",
    "code": "NOT_FOUND"
}
```

### Características del Endpoint

- **Sin middleware de ubicación**: A diferencia de otros endpoints, este NO requiere `requireRestaurantLocation` ya que es información básica que puede necesitarse antes de configurar la ubicación
- **Optimizado para Flutter**: Devuelve toda la información necesaria de la sucursal en una sola petición
- **Información completa**: Incluye datos de ubicación, configuración de entrega, estado de la sucursal, etc.

---

## BranchRepository - Gestión de Sucursal Principal

### Nuevo Repositorio Creado

Se ha creado un nuevo repositorio `BranchRepository` en `src/repositories/branch.repository.js` para facilitar la gestión de la sucursal única de cada restaurante.

### Método `findPrimaryBranchByRestaurantId()`

Este método está diseñado para obtener fácilmente la sucursal principal (única) asociada a un restaurante:

```javascript
/**
 * Busca la sucursal principal (única) asociada a un restaurante
 * @param {number} restaurantId - ID del restaurante
 * @returns {Promise<Object|null>} Sucursal encontrada o null
 */
static async findPrimaryBranchByRestaurantId(restaurantId) {
  return await prisma.branch.findFirst({
    where: {
      restaurantId: restaurantId,
      status: 'active'
    },
    select: {
      id: true,
      restaurantId: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
      phone: true,
      usesPlatformDrivers: true,
      deliveryFee: true,
      estimatedDeliveryMin: true,
      estimatedDeliveryMax: true,
      deliveryRadius: true,
      status: true,
      createdAt: true,
      updatedAt: true
    }
  });
}
```

### Uso en Otros Repositorios

Este método es especialmente útil para otros repositorios que necesiten operar sobre la sucursal única, como:
- **ProductRepository**: Para asociar productos a la sucursal principal automáticamente
- **ScheduleRepository**: Para gestionar horarios de la sucursal principal
- **OrderRepository**: Para procesar pedidos de la sucursal única

**Ejemplo de uso:**
```javascript
const BranchRepository = require('./branch.repository');

// En cualquier repositorio que necesite el branchId
const primaryBranch = await BranchRepository.findPrimaryBranchByRestaurantId(restaurantId);
if (primaryBranch) {
  // Operar con primaryBranch.id
}
```

---

## Middleware requireRestaurantLocation

### Propósito
El middleware `requireRestaurantLocation` bloquea el acceso a las rutas protegidas si el restaurante del owner no tiene configurada su ubicación. Esto garantiza que todas las operaciones comerciales requieran que la ubicación esté establecida.

### Lógica del Middleware

**Archivo**: `src/middleware/location.middleware.js`

1. Obtiene el `userId` del token autenticado
2. Verifica que el usuario sea owner y tenga un restaurante asignado
3. Llama a `RestaurantRepository.getLocationStatus(restaurantId)`
4. Si la ubicación NO está configurada, devuelve error 403
5. Si la ubicación SÍ está configurada, permite continuar con `next()`

### Error 403 Forbidden Específico

Cuando la ubicación no está configurada, el middleware devuelve:

```json
{
    "status": "error",
    "message": "Debe configurar la ubicación de su restaurante primero",
    "code": "LOCATION_REQUIRED"
}
```

Ejemplo real del error:
```json
{
    "status": "error",
    "message": "Debe configurar la ubicación de su restaurante primero",
    "timestamp": "2025-10-18T23:17:37.796Z"
}
```

### Rutas Protegidas por requireRestaurantLocation

El middleware está aplicado a las siguientes categorías de rutas que requieren ubicación configurada:

#### Menú y Productos
- `GET /api/restaurant/products` - Listar productos
- `POST /api/restaurant/products` - Crear producto
- `PATCH /api/restaurant/products/:productId` - Actualizar producto
- `DELETE /api/restaurant/products/:productId` - Eliminar producto
- `PATCH /api/restaurant/products/deactivate-by-tag` - Desactivar productos por etiqueta
- `POST /api/restaurant/products/upload-image` - Subir imagen de producto

#### Categorías y Subcategorías
- `GET /api/restaurant/subcategories` - Listar subcategorías
- `POST /api/restaurant/subcategories` - Crear subcategoría
- `PATCH /api/restaurant/subcategories/:subcategoryId` - Actualizar subcategoría
- `DELETE /api/restaurant/subcategories/:subcategoryId` - Eliminar subcategoría

#### Grupos de Modificadores
- `GET /api/restaurant/modifier-groups` - Listar grupos de modificadores
- `POST /api/restaurant/modifier-groups` - Crear grupo de modificadores
- `PATCH /api/restaurant/modifier-groups/:groupId` - Actualizar grupo
- `DELETE /api/restaurant/modifier-groups/:groupId` - Eliminar grupo

#### Opciones de Modificadores
- `POST /api/restaurant/modifier-groups/:groupId/options` - Crear opción
- `PATCH /api/restaurant/modifier-options/:optionId` - Actualizar opción
- `DELETE /api/restaurant/modifier-options/:optionId` - Eliminar opción

#### Pedidos
- `GET /api/restaurant/orders` - Listar pedidos
- `PATCH /api/restaurant/orders/:orderId/status` - Actualizar estado de pedido
- `PATCH /api/restaurant/orders/:orderId/reject` - Rechazar pedido

#### Sucursales
- `GET /api/restaurant/branches` - Listar sucursales
- `POST /api/restaurant/branches` - Crear sucursal
- `PATCH /api/restaurant/branches/:branchId` - Actualizar sucursal
- `DELETE /api/restaurant/branches/:branchId` - Eliminar sucursal
- `GET /api/restaurant/branches/:branchId/schedule` - Obtener horario de sucursal
- `PATCH /api/restaurant/branches/:branchId/schedule` - Actualizar horario de sucursal

### Rutas NO Protegidas por requireRestaurantLocation

Las siguientes rutas NO requieren ubicación configurada y siempre están accesibles para completar la configuración inicial:

#### Configuración de Perfil
- `GET /api/restaurant/profile` - Obtener perfil del restaurante
- `PATCH /api/restaurant/profile` - Actualizar perfil del restaurante

#### Subida de Archivos
- `POST /api/restaurant/upload-logo` - Subir logo del restaurante
- `POST /api/restaurant/upload-cover` - Subir foto de portada
- `POST /api/restaurant/uploads/logo` - Subir logo (ruta legacy)
- `POST /api/restaurant/uploads/cover` - Subir portada (ruta legacy)

#### Configuración de Ubicación
- `GET /api/restaurant/location-status` - Verificar estado de ubicación
- `PATCH /api/restaurant/location` - Configurar ubicación del restaurante

---

## Flujo de Configuración del Owner

1. **Owner se autentica** en el sistema
2. **Configura perfil básico**: `PATCH /api/restaurant/profile`
3. **Sube imágenes**: `POST /api/restaurant/upload-logo` y `POST /api/restaurant/upload-cover`
4. **Verifica estado y carga ubicación guardada**: `GET /api/restaurant/location-status` (devuelve datos completos)
5. **Configura ubicación obligatoria**: `PATCH /api/restaurant/location`
6. **Verifica y carga la nueva ubicación**: `GET /api/restaurant/location-status` (devuelve datos actualizados)
7. **Accede a todas las funciones**: Menú, pedidos, sucursales, etc.

---

## Base de Datos

### Campos Añadidos al Modelo Restaurant

```prisma
model Restaurant {
  // ... campos existentes
  address        String?  @db.Text
  latitude       Decimal? @db.Decimal(10, 8)
  longitude      Decimal? @db.Decimal(11, 8)
  // ... resto de campos
}
```

- `latitude`: Latitud en formato decimal con 8 decimales de precisión (nullable)
- `longitude`: Longitud en formato decimal con 8 decimales de precisión (nullable)
- `address`: Dirección textual del restaurante (nullable, ya existía)

### Migración Requerida

Antes de usar esta funcionalidad, ejecutar:

```bash
npx prisma migrate dev --name add_restaurant_location
npx prisma generate
```
