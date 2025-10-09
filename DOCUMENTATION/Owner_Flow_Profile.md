# 🏪 Owner Flow - Gestión del Perfil del Restaurante

## 📋 Índice
1. [Resumen de la Funcionalidad](#resumen-de-la-funcionalidad)
2. [Flujo de Actualización de Imágenes](#flujo-de-actualización-de-imágenes)
3. [Endpoints Disponibles](#endpoints-disponibles)
4. [Modelos de Datos](#modelos-de-datos)
5. [Códigos de Error](#códigos-de-error)
6. [Casos de Uso](#casos-de-uso)

---

## 📖 Resumen de la Funcionalidad

### **Objetivo**

Permitir a los usuarios con rol de **owner** (dueño de restaurante) ver y actualizar la información de su restaurante, incluyendo:

- ✅ Nombre del restaurante
- ✅ Descripción del restaurante
- ✅ Logo del restaurante (imagen)
- ✅ Foto de portada del restaurante (imagen)
- ✅ Visualización de estadísticas (sucursales, productos, subcategorías)

### **Endpoints Involucrados**

Esta funcionalidad utiliza **4 endpoints principales**:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/restaurant/profile` | Obtener perfil completo del restaurante |
| `PATCH` | `/api/restaurant/profile` | Actualizar información del restaurante |
| `POST` | `/api/restaurant/uploads/logo` | Subir logo del restaurante |
| `POST` | `/api/restaurant/uploads/cover` | Subir foto de portada del restaurante |

---

## 📸 Flujo de Actualización de Imágenes

### **⚠️ PROCESO OBLIGATORIO DE 2 PASOS**

Para cambiar el logo o la foto de portada del restaurante, **SIEMPRE** se debe seguir este flujo de 2 pasos:

```
┌─────────────────────────────────────────────────────────────┐
│                    PASO A: SUBIR IMAGEN                     │
├─────────────────────────────────────────────────────────────┤
│  POST /api/restaurant/uploads/logo                          │
│  (o)                                                         │
│  POST /api/restaurant/uploads/cover                         │
│                                                              │
│  Request:  FormData con archivo (campo: "image")           │
│  Response: { "logoUrl": "http://..." }                      │
│            o                                                 │
│            { "coverPhotoUrl": "http://..." }                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PASO B: GUARDAR URL EN EL PERFIL               │
├─────────────────────────────────────────────────────────────┤
│  PATCH /api/restaurant/profile                              │
│                                                              │
│  Body: {                                                     │
│    "logoUrl": "http://localhost:3000/uploads/logos/..."     │
│    (o)                                                       │
│    "coverPhotoUrl": "http://localhost:3000/uploads/covers/..│
│  }                                                           │
│                                                              │
│  Response: Perfil actualizado con nueva URL                 │
└─────────────────────────────────────────────────────────────┘
```

### **¿Por Qué 2 Pasos?**

1. **Separación de Responsabilidades:**
   - El endpoint de upload maneja SOLO la subida del archivo
   - El endpoint de profile maneja SOLO la actualización de datos

2. **Flexibilidad:**
   - Puedes subir una imagen sin guardarla inmediatamente
   - Puedes cancelar la operación después de subir
   - Puedes previsualizar antes de guardar

3. **Mejor Manejo de Errores:**
   - Si falla la subida, no se actualiza el perfil
   - Si falla la actualización del perfil, la imagen queda disponible

### **Ejemplo Completo:**

```
PASO A - Subir Logo:
POST /api/restaurant/uploads/logo
Content-Type: multipart/form-data
Authorization: Bearer {token}

FormData:
  image: logo.jpg

→ Response: {
    "status": "success",
    "data": {
      "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg"
    }
  }

PASO B - Guardar URL en Perfil:
PATCH /api/restaurant/profile
Content-Type: application/json
Authorization: Bearer {token}

{
  "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg"
}

→ Response: {
    "status": "success",
    "data": {
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana",
        "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg",
        ...
      }
    }
  }
```

---

## 🔌 Endpoints Disponibles

### **1. Obtener Perfil del Restaurante**

**Endpoint:** `GET /api/restaurant/profile`

**Método:** `GET`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`

**Descripción:** Obtiene la información completa del restaurante asociado al owner autenticado, incluyendo datos del propietario, sucursales activas y estadísticas.

#### **Headers:**
```http
Authorization: Bearer {token}
```

#### **Request Body:**
No requiere body (es un GET)

#### **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Perfil del restaurante obtenido exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la región",
      "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg",
      "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_1759881067436_2921.jpg",
      "phone": null,
      "email": null,
      "address": null,
      "status": "active",
      "owner": {
        "id": 2,
        "name": "Ana",
        "lastname": "García",
        "email": "ana.garcia@pizzeria.com",
        "phone": "2222222222"
      },
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "phone": "7711234567",
          "status": "active",
          "createdAt": "2025-01-09T00:00:00.000Z",
          "updatedAt": "2025-01-09T00:00:00.000Z"
        },
        {
          "id": 2,
          "name": "Sucursal Río",
          "address": "Paseo del Roble 205, Barrio del Río",
          "phone": "7717654321",
          "status": "active",
          "createdAt": "2025-01-09T00:00:00.000Z",
          "updatedAt": "2025-01-09T00:00:00.000Z"
        }
      ],
      "statistics": {
        "totalBranches": 3,
        "totalSubcategories": 9,
        "totalProducts": 10
      },
      "createdAt": "2025-01-09T00:00:00.000Z",
      "updatedAt": "2025-01-09T00:00:00.000Z"
    }
  }
}
```

#### **Errores Posibles:**

**401 Unauthorized - Token inválido o expirado:**
```json
{
  "status": "error",
  "message": "Token inválido o expirado",
  "code": "INVALID_TOKEN"
}
```

**403 Forbidden - Usuario sin rol de owner:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - Owner sin restaurante asignado:**
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

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "error": "Mensaje de error técnico (solo en desarrollo)"
}
```

---

### **2. Actualizar Perfil del Restaurante**

**Endpoint:** `PATCH /api/restaurant/profile`

**Método:** `PATCH`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`

**Descripción:** Actualiza la información del restaurante asociado al owner autenticado. Todos los campos son opcionales - solo se actualizan los campos enviados.

#### **Headers:**
```http
Authorization: Bearer {token}
Content-Type: application/json
```

#### **Request Body:**
```json
{
  "name": "Pizzería de Ana - Renovada",
  "description": "Las mejores pizzas artesanales con ingredientes 100% orgánicos",
  "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg",
  "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_1759881067436_2921.jpg"
}
```

**Campos Disponibles:**

| Campo | Tipo | Requerido | Validación | Descripción |
|-------|------|-----------|------------|-------------|
| `name` | String | No | 1-150 caracteres | Nombre del restaurante |
| `description` | String | No | Máximo 1000 caracteres | Descripción del restaurante |
| `logoUrl` | String | No | URL válida, máximo 255 caracteres | URL del logo (debe ser de upload previo) |
| `coverPhotoUrl` | String | No | URL válida, máximo 255 caracteres | URL de la portada (debe ser de upload previo) |

**⚠️ Nota Importante:** Los campos `logoUrl` y `coverPhotoUrl` deben ser URLs obtenidas de los endpoints de upload (`POST /api/restaurant/uploads/logo` o `POST /api/restaurant/uploads/cover`).

#### **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Información del restaurante actualizada exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana - Renovada",
      "description": "Las mejores pizzas artesanales con ingredientes 100% orgánicos",
      "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg",
      "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_1759881067436_2921.jpg",
      "phone": null,
      "email": null,
      "address": null,
      "status": "active",
      "owner": {
        "id": 2,
        "name": "Ana",
        "lastname": "García",
        "email": "ana.garcia@pizzeria.com",
        "phone": "2222222222"
      },
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro",
          "phone": "7711234567",
          "status": "active",
          "createdAt": "2025-01-09T00:00:00.000Z",
          "updatedAt": "2025-01-09T00:00:00.000Z"
        }
      ],
      "statistics": {
        "totalBranches": 3,
        "totalSubcategories": 9,
        "totalProducts": 10
      },
      "createdAt": "2025-01-09T00:00:00.000Z",
      "updatedAt": "2025-01-09T00:00:00.000Z"
    },
    "updatedFields": ["name", "description", "logoUrl", "coverPhotoUrl"],
    "updatedBy": {
      "userId": 2,
      "userName": "Ana García"
    }
  }
}
```

#### **Errores Posibles:**

**400 Bad Request - Datos de entrada inválidos:**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "El nombre debe tener entre 1 y 150 caracteres",
      "param": "name",
      "location": "body"
    }
  ]
}
```

**400 Bad Request - No se proporcionaron campos:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**401 Unauthorized - Token inválido:**
```json
{
  "status": "error",
  "message": "Token inválido o expirado",
  "code": "INVALID_TOKEN"
}
```

**403 Forbidden - Rol insuficiente:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - Owner sin restaurante:**
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

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "error": "Mensaje de error técnico (solo en desarrollo)"
}
```

---

### **3. Subir Logo del Restaurante**

**Endpoint:** `POST /api/restaurant/uploads/logo`

**Método:** `POST`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Sube un archivo de imagen para usar como logo del restaurante. El archivo se almacena en el servidor y se devuelve una URL pública.

#### **Headers:**
```http
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

#### **Request Body (FormData):**
```http
image: {archivo_de_imagen}
```

**Especificaciones del archivo:**
- **Campo:** `image` (nombre del campo en FormData)
- **Formatos permitidos:** JPG, JPEG, PNG
- **Tamaño máximo:** 5 MB
- **Dimensiones recomendadas:** 400x400 px (cuadrado)

#### **Ejemplo de Request (cURL):**
```bash
curl -X POST \
  http://localhost:3000/api/restaurant/uploads/logo \
  -H 'Authorization: Bearer {token}' \
  -F 'image=@/path/to/logo.jpg'
```

#### **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Logo subido exitosamente",
  "data": {
    "logoUrl": "http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg",
    "filename": "logo_1759858518228_9501.jpg",
    "originalName": "mi_logo.jpg",
    "size": 245678,
    "mimetype": "image/jpeg"
  }
}
```

**⚠️ IMPORTANTE:** Debes guardar el valor de `logoUrl` y luego enviarlo a `PATCH /api/restaurant/profile` para actualizar el perfil del restaurante.

#### **Errores Posibles:**

**400 Bad Request - No se proporcionó archivo:**
```json
{
  "status": "error",
  "message": "No se proporcionó ningún archivo",
  "code": "NO_FILE_PROVIDED"
}
```

**400 Bad Request - Formato de archivo inválido:**
```json
{
  "status": "error",
  "message": "Solo se permiten imágenes JPG, JPEG y PNG",
  "code": "INVALID_FILE_TYPE"
}
```

**400 Bad Request - Archivo demasiado grande:**
```json
{
  "status": "error",
  "message": "El archivo es demasiado grande. Máximo 5MB permitido",
  "code": "FILE_TOO_LARGE"
}
```

**401 Unauthorized - Token inválido:**
```json
{
  "status": "error",
  "message": "Token inválido o expirado",
  "code": "INVALID_TOKEN"
}
```

**403 Forbidden - Rol insuficiente:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner o branch_manager",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

---

### **4. Subir Foto de Portada del Restaurante**

**Endpoint:** `POST /api/restaurant/uploads/cover`

**Método:** `POST`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `owner`, `branch_manager`

**Descripción:** Sube un archivo de imagen para usar como foto de portada del restaurante. El archivo se almacena en el servidor y se devuelve una URL pública.

#### **Headers:**
```http
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

#### **Request Body (FormData):**
```http
image: {archivo_de_imagen}
```

**Especificaciones del archivo:**
- **Campo:** `image` (nombre del campo en FormData)
- **Formatos permitidos:** JPG, JPEG, PNG
- **Tamaño máximo:** 5 MB
- **Dimensiones recomendadas:** 1200x400 px (ratio 3:1)

#### **Ejemplo de Request (cURL):**
```bash
curl -X POST \
  http://localhost:3000/api/restaurant/uploads/cover \
  -H 'Authorization: Bearer {token}' \
  -F 'image=@/path/to/cover.jpg'
```

#### **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Foto de portada subida exitosamente",
  "data": {
    "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_1759881067436_2921.jpg",
    "filename": "cover_1759881067436_2921.jpg",
    "originalName": "mi_portada.jpg",
    "size": 512345,
    "mimetype": "image/jpeg"
  }
}
```

**⚠️ IMPORTANTE:** Debes guardar el valor de `coverPhotoUrl` y luego enviarlo a `PATCH /api/restaurant/profile` para actualizar el perfil del restaurante.

#### **Errores Posibles:**

**400 Bad Request - No se proporcionó archivo:**
```json
{
  "status": "error",
  "message": "No se proporcionó ningún archivo",
  "code": "NO_FILE_PROVIDED"
}
```

**400 Bad Request - Formato de archivo inválido:**
```json
{
  "status": "error",
  "message": "Solo se permiten imágenes JPG, JPEG y PNG",
  "code": "INVALID_FILE_TYPE"
}
```

**400 Bad Request - Archivo demasiado grande:**
```json
{
  "status": "error",
  "message": "El archivo es demasiado grande. Máximo 5MB permitido",
  "code": "FILE_TOO_LARGE"
}
```

**401 Unauthorized - Token inválido:**
```json
{
  "status": "error",
  "message": "Token inválido o expirado",
  "code": "INVALID_TOKEN"
}
```

**403 Forbidden - Rol insuficiente:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de owner o branch_manager",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

---

## 📊 Modelos de Datos

### **Restaurant (Restaurante)**
```typescript
interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: 'pending_approval' | 'active' | 'inactive' | 'suspended' | 'rejected';
  owner: Owner;
  branches: Branch[];
  statistics: RestaurantStatistics;
  createdAt: string;  // ISO 8601 timestamp
  updatedAt: string;  // ISO 8601 timestamp
}
```

### **Owner (Propietario)**
```typescript
interface Owner {
  id: number;
  name: string;
  lastname: string;
  email: string;
  phone: string;
}
```

### **Branch (Sucursal)**
```typescript
interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;  // ISO 8601 timestamp
  updatedAt: string;  // ISO 8601 timestamp
}
```

### **RestaurantStatistics (Estadísticas)**
```typescript
interface RestaurantStatistics {
  totalBranches: number;
  totalSubcategories: number;
  totalProducts: number;
}
```

### **UploadResponse (Respuesta de Upload)**
```typescript
interface UploadResponse {
  status: 'success';
  message: string;
  data: {
    logoUrl?: string;        // URL del logo (endpoint de logo)
    coverPhotoUrl?: string;  // URL de portada (endpoint de cover)
    filename: string;
    originalName: string;
    size: number;            // Tamaño en bytes
    mimetype: string;        // "image/jpeg" | "image/png"
  };
}
```

---

## ⚠️ Códigos de Error

### **Tabla de Códigos de Error**

| Código HTTP | Code | Descripción | Solución |
|-------------|------|-------------|----------|
| `400` | `NO_FILE_PROVIDED` | No se subió ningún archivo | Verificar que se está enviando el archivo en FormData |
| `400` | `INVALID_FILE_TYPE` | Formato de archivo no permitido | Solo usar JPG, JPEG o PNG |
| `400` | `FILE_TOO_LARGE` | Archivo excede 5MB | Comprimir o redimensionar imagen |
| `400` | `NO_FIELDS_TO_UPDATE` | Body vacío en PATCH | Enviar al menos un campo para actualizar |
| `401` | `INVALID_TOKEN` | Token JWT inválido o expirado | Renovar sesión del usuario |
| `403` | `INSUFFICIENT_PERMISSIONS` | Usuario no tiene rol de owner | Verificar rol del usuario |
| `403` | `NO_RESTAURANT_ASSIGNED` | Owner sin restaurante asignado | Contactar administrador |
| `404` | `RESTAURANT_NOT_FOUND` | Restaurante no existe | Verificar que el owner tenga restaurante |
| `500` | `INTERNAL_ERROR` | Error en el servidor | Reportar error al equipo de backend |

---

## 🎯 Casos de Uso

### **Caso 1: Actualizar Solo el Nombre**

**Flujo:**
1. Owner abre pantalla de editar perfil
2. Owner modifica solo el campo "nombre"
3. App envía PATCH con solo el campo `name`

**Request:**
```http
PATCH /api/restaurant/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nuevo Nombre del Restaurante"
}
```

**Response:**
- ✅ Solo se actualiza `name`
- ✅ Los demás campos permanecen sin cambios
- ✅ Respuesta incluye `updatedFields: ["name"]`

---

### **Caso 2: Cambiar Logo del Restaurante**

**Flujo completo de 2 pasos:**

**PASO A - Subir nueva imagen:**
```http
POST /api/restaurant/uploads/logo
Authorization: Bearer {token}
Content-Type: multipart/form-data

FormData:
  image: nuevo_logo.jpg
```

**Response del PASO A:**
```json
{
  "status": "success",
  "data": {
    "logoUrl": "http://localhost:3000/uploads/logos/logo_NUEVO_123456.jpg"
  }
}
```

**PASO B - Actualizar perfil con la nueva URL:**
```http
PATCH /api/restaurant/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "logoUrl": "http://localhost:3000/uploads/logos/logo_NUEVO_123456.jpg"
}
```

**Response del PASO B:**
```json
{
  "status": "success",
  "message": "Información del restaurante actualizada exitosamente",
  "data": {
    "restaurant": {
      "logoUrl": "http://localhost:3000/uploads/logos/logo_NUEVO_123456.jpg",
      ...
    },
    "updatedFields": ["logoUrl"]
  }
}
```

---

### **Caso 3: Actualizar Múltiples Campos a la Vez**

**Flujo:**
1. Owner edita varios campos (nombre + descripción)
2. App envía PATCH con ambos campos

**Request:**
```http
PATCH /api/restaurant/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Pizzería de Ana - Edición Especial",
  "description": "Ahora con ingredientes orgánicos certificados"
}
```

**Response:**
- ✅ Ambos campos actualizados
- ✅ `updatedFields: ["name", "description"]`

---

### **Caso 4: Cambiar Logo Y Portada Simultáneamente**

**Flujo completo:**

**PASO A1 - Subir logo:**
```http
POST /api/restaurant/uploads/logo
→ Response: { "logoUrl": "http://.../logo_NEW.jpg" }
```

**PASO A2 - Subir portada:**
```http
POST /api/restaurant/uploads/cover
→ Response: { "coverPhotoUrl": "http://.../cover_NEW.jpg" }
```

**PASO B - Actualizar ambas URLs:**
```http
PATCH /api/restaurant/profile
Content-Type: application/json

{
  "logoUrl": "http://localhost:3000/uploads/logos/logo_NEW.jpg",
  "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_NEW.jpg"
}
```

**Response:**
- ✅ Ambas imágenes actualizadas
- ✅ `updatedFields: ["logoUrl", "coverPhotoUrl"]`

---

## 📝 Validaciones de Campos

### **Validación de `name`**
- ✅ Opcional (solo si se envía)
- ✅ Tipo: String
- ✅ Mínimo: 1 carácter
- ✅ Máximo: 150 caracteres
- ✅ Se aplica trim() automáticamente

**Ejemplo válido:**
```json
{ "name": "Pizzería de Ana" }
```

**Ejemplo inválido:**
```json
{ "name": "" }  // ❌ Vacío después de trim
{ "name": "A".repeat(151) }  // ❌ Excede 150 caracteres
```

---

### **Validación de `description`**
- ✅ Opcional (solo si se envía)
- ✅ Tipo: String
- ✅ Máximo: 1000 caracteres
- ✅ Se aplica trim() automáticamente

**Ejemplo válido:**
```json
{ "description": "Las mejores pizzas artesanales con ingredientes frescos" }
```

**Ejemplo inválido:**
```json
{ "description": "A".repeat(1001) }  // ❌ Excede 1000 caracteres
```

---

### **Validación de `logoUrl`**
- ✅ Opcional (solo si se envía)
- ✅ Tipo: String
- ✅ Debe ser una URL válida
- ✅ Máximo: 255 caracteres
- ✅ Se aplica trim() automáticamente

**Ejemplo válido:**
```json
{ "logoUrl": "http://localhost:3000/uploads/logos/logo_123.jpg" }
```

**Ejemplo inválido:**
```json
{ "logoUrl": "esto-no-es-una-url" }  // ❌ No es URL válida
{ "logoUrl": "http://example.com/".repeat(50) }  // ❌ Excede 255 caracteres
```

---

### **Validación de `coverPhotoUrl`**
- ✅ Opcional (solo si se envía)
- ✅ Tipo: String
- ✅ Debe ser una URL válida
- ✅ Máximo: 255 caracteres
- ✅ Se aplica trim() automáticamente

**Ejemplo válido:**
```json
{ "coverPhotoUrl": "http://localhost:3000/uploads/covers/cover_456.jpg" }
```

**Ejemplo inválido:**
```json
{ "coverPhotoUrl": "ruta/local/imagen.jpg" }  // ❌ No es URL válida
```

---

## 🔐 Seguridad y Autorización

### **Verificación de Rol**

El backend verifica automáticamente que:
1. ✅ El usuario esté autenticado (token JWT válido)
2. ✅ El usuario tenga rol de `owner`
3. ✅ El owner tenga un restaurante asignado
4. ✅ El restaurante exista en la base de datos

**Flujo de autorización:**
```
Request → Middleware authenticateToken
         ↓
         Validar token JWT
         ↓
         Extraer userId del token
         ↓
         Middleware requireRole(['owner'])
         ↓
         Verificar rol de owner
         ↓
         Controlador verifica restaurantId
         ↓
         Ejecutar operación
```

### **Contexto Automático**

El owner **NO necesita** especificar su `restaurantId` en las peticiones. El backend lo obtiene automáticamente desde:

```javascript
// Backend obtiene restaurantId del owner automáticamente
const ownerAssignment = userRoleAssignments.find(
  assignment => assignment.role.name === 'owner' && 
                assignment.restaurantId !== null
);

const restaurantId = ownerAssignment.restaurantId;
```

**Beneficio:** Mayor seguridad - un owner solo puede editar SU restaurante.

---

## 📸 Gestión de Imágenes

### **Ubicación de Archivos**

Los archivos subidos se almacenan en:
- **Logos:** `public/uploads/logos/`
- **Portadas:** `public/uploads/covers/`

### **Nomenclatura de Archivos**

El sistema genera nombres únicos para evitar colisiones:
```
logo_{timestamp}_{random}.jpg
cover_{timestamp}_{random}.jpg
```

**Ejemplo:**
```
logo_1759858518228_9501.jpg
cover_1759881067436_2921.jpg
```

### **URL Pública**

Las URLs se construyen con:
```
{BASE_URL}/uploads/{tipo}/{filename}
```

**Ejemplo:**
```
http://localhost:3000/uploads/logos/logo_1759858518228_9501.jpg
```

### **⚠️ Importante: Rutas Relativas vs Absolutas**

**Correcto (URL completa):**
```json
{
  "logoUrl": "http://localhost:3000/uploads/logos/logo_123.jpg"
}
```

**Incorrecto (ruta relativa):**
```json
{
  "logoUrl": "/uploads/logos/logo_123.jpg"  // ❌ No es URL válida
}
```

---

## 🧪 Testing de la API

### **Prueba 1: Obtener Perfil del Restaurante**

**Request:**
```http
GET http://localhost:3000/api/restaurant/profile
Authorization: Bearer {token_de_ana}
```

**Usuario:** Ana García (ana.garcia@pizzeria.com)

**Resultado esperado:**
- ✅ Status 200
- ✅ Datos del restaurante "Pizzería de Ana"
- ✅ Lista de sucursales activas
- ✅ Estadísticas

---

### **Prueba 2: Actualizar Solo Nombre**

**Request:**
```http
PATCH http://localhost:3000/api/restaurant/profile
Authorization: Bearer {token_de_ana}
Content-Type: application/json

{
  "name": "Pizzería de Ana - Premium"
}
```

**Resultado esperado:**
- ✅ Status 200
- ✅ Nombre actualizado
- ✅ `updatedFields: ["name"]`
- ✅ Otros campos sin cambios

---

### **Prueba 3: Subir Logo**

**Request:**
```http
POST http://localhost:3000/api/restaurant/uploads/logo
Authorization: Bearer {token_de_ana}
Content-Type: multipart/form-data

FormData:
  image: [archivo logo.jpg]
```

**Resultado esperado:**
- ✅ Status 200
- ✅ `logoUrl` con URL completa
- ✅ Metadata del archivo (size, mimetype, etc.)

---

### **Prueba 4: Flujo Completo - Cambiar Logo**

**PASO A:**
```http
POST http://localhost:3000/api/restaurant/uploads/logo
→ Obtener logoUrl
```

**PASO B:**
```http
PATCH http://localhost:3000/api/restaurant/profile
Body: { "logoUrl": "{url_del_paso_a}" }
```

**Resultado esperado:**
- ✅ Logo actualizado en el perfil
- ✅ URL guardada en la base de datos
- ✅ Visible en próximos GET

---

### **Prueba 5: Error - Archivo Demasiado Grande**

**Request:**
```http
POST http://localhost:3000/api/restaurant/uploads/logo
FormData:
  image: [archivo de 10MB]
```

**Resultado esperado:**
- ❌ Status 400
- ❌ Code: `FILE_TOO_LARGE`
- ❌ Mensaje descriptivo

---

### **Prueba 6: Error - Usuario sin Rol de Owner**

**Request:**
```http
GET http://localhost:3000/api/restaurant/profile
Authorization: Bearer {token_de_sofia}  // Sofia es customer
```

**Resultado esperado:**
- ❌ Status 403
- ❌ Code: `INSUFFICIENT_PERMISSIONS`
- ❌ Mensaje: "Se requiere rol de owner"

---

## 📋 Checklist de Integración Frontend

### **Implementación de Pantalla "Editar Perfil":**

- [ ] Obtener perfil actual con `GET /api/restaurant/profile`
- [ ] Mostrar campos editables (nombre, descripción)
- [ ] Mostrar imágenes actuales (logo, portada)
- [ ] Implementar botón "Cambiar Logo"
  - [ ] Abrir galería/cámara
  - [ ] Subir imagen con `POST /api/restaurant/uploads/logo`
  - [ ] Guardar URL devuelta
  - [ ] Actualizar perfil con `PATCH /api/restaurant/profile`
- [ ] Implementar botón "Cambiar Portada"
  - [ ] Abrir galería/cámara
  - [ ] Subir imagen con `POST /api/restaurant/uploads/cover`
  - [ ] Guardar URL devuelta
  - [ ] Actualizar perfil con `PATCH /api/restaurant/profile`
- [ ] Implementar botón "Guardar Cambios"
  - [ ] Validar campos antes de enviar
  - [ ] Enviar solo campos modificados
  - [ ] Mostrar mensaje de éxito/error

### **Validaciones en Frontend:**

- [ ] Nombre: 1-150 caracteres
- [ ] Descripción: Máximo 1000 caracteres
- [ ] Imágenes: Solo JPG, JPEG, PNG
- [ ] Tamaño de imagen: Máximo 5 MB
- [ ] Mostrar preview de imagen antes de subir

### **Manejo de Errores:**

- [ ] Mostrar mensaje si falla upload de imagen
- [ ] Mostrar mensaje si falla actualización de perfil
- [ ] Permitir reintentar en caso de error
- [ ] Validar que logoUrl/coverPhotoUrl vengan de uploads

---

## 📐 Especificaciones Técnicas de Imágenes

### **Logo del Restaurante**

| Especificación | Valor Recomendado |
|----------------|-------------------|
| Dimensiones | 400x400 px (cuadrado) |
| Formato | JPG, PNG |
| Tamaño máximo | 5 MB |
| Relación de aspecto | 1:1 |
| Uso | Avatar circular, lista de restaurantes |

**Ejemplo:**
```
┌────────┐
│  LOGO  │ 400x400px
│        │ Cuadrado
└────────┘
```

---

### **Foto de Portada del Restaurante**

| Especificación | Valor Recomendado |
|----------------|-------------------|
| Dimensiones | 1200x400 px (horizontal) |
| Formato | JPG, PNG |
| Tamaño máximo | 5 MB |
| Relación de aspecto | 3:1 |
| Uso | Banner en detalle del restaurante |

**Ejemplo:**
```
┌─────────────────────────────────────┐
│           FOTO DE PORTADA           │ 1200x400px
│           (Banner amplio)            │ Horizontal 3:1
└─────────────────────────────────────┘
```

---

## 🔄 Diagrama de Flujo de Actualización

```
┌─────────────────────────────────────────────────┐
│  INICIO: Owner abre "Editar Perfil"            │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  GET /api/restaurant/profile                    │
│  → Cargar datos actuales                       │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Owner modifica campos (nombre, descripción)    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  ¿Cambió logo o portada?                       │
└─────────────────────────────────────────────────┘
         SÍ ↓                    ↓ NO
┌──────────────────┐    ┌────────────────────┐
│  Subir imagen(es) │    │  Ir a PASO FINAL   │
│  POST /uploads/.. │    └────────────────────┘
└──────────────────┘              ↓
         ↓                        ↓
┌──────────────────┐    ┌────────────────────┐
│  Obtener URL(s)   │    │                    │
└──────────────────┘    │                    │
         ↓              │                    │
         └──────────────┴────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  PASO FINAL:                                    │
│  PATCH /api/restaurant/profile                  │
│  → Enviar SOLO campos modificados               │
│  → Incluir URLs de imágenes si cambiaron        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│  Mostrar mensaje de éxito                       │
│  Actualizar UI con nuevos datos                 │
│  FIN                                            │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Recomendaciones de UX

### **1. Preview de Imágenes**

Antes de subir, mostrar una previsualización:
```dart
// Pseudo-código
File selectedImage = await ImagePicker.pickImage();
→ Mostrar preview en un Container
→ Botón "Confirmar" → POST /uploads/logo
→ Botón "Cancelar" → Descartar imagen
```

### **2. Indicador de Carga**

Durante la subida de imágenes:
```dart
// Pseudo-código
setState(() => isUploading = true);
→ Mostrar CircularProgressIndicator
→ Deshabilitar botones
→ Texto: "Subiendo imagen..."
```

### **3. Confirmación de Cambios**

Antes de guardar cambios:
```dart
// Pseudo-código
if (haycambios) {
  → Mostrar diálogo de confirmación
  → "¿Guardar los cambios?"
  → Botón "Sí" → PATCH /profile
  → Botón "No" → Descartar cambios
}
```

### **4. Validación en Tiempo Real**

Mientras el usuario edita:
```dart
// Pseudo-código
TextFormField(
  validator: (value) {
    if (value.length > 150) {
      return "Máximo 150 caracteres";
    }
    return null;
  },
  onChanged: (value) {
    setState(() => charactersRemaining = 150 - value.length);
  }
)
```

---

## 📚 Notas Importantes

### **1. Contexto Automático del Restaurante**

El owner **NO necesita** enviar el `restaurantId` en ninguna petición. El backend lo obtiene automáticamente del token JWT y de la asignación de rol en la base de datos.

**Ejemplo:**
```javascript
// Backend obtiene restaurantId automáticamente
const ownerAssignment = userRoleAssignments.find(
  assignment => assignment.role.name === 'owner'
);
const restaurantId = ownerAssignment.restaurantId;
```

---

### **2. Campos Opcionales vs Campos Nulos**

En el modelo `Restaurant`, algunos campos pueden ser `null`:
- `description` - Puede ser null si no se proporciona
- `logoUrl` - Puede ser null si no se ha subido logo
- `coverPhotoUrl` - Puede ser null si no se ha subido portada
- `phone`, `email`, `address` - Pueden ser null (no implementados en el schema actual)

**En Flutter:**
```dart
// Manejar campos opcionales
Text(restaurant.description ?? 'Sin descripción disponible')

// Mostrar imagen o placeholder
restaurant.logoUrl != null
  ? Image.network(restaurant.logoUrl!)
  : Icon(Icons.restaurant)
```

---

### **3. Estadísticas en Tiempo Real**

El campo `statistics` se calcula en tiempo real en cada petición:
```json
"statistics": {
  "totalBranches": 3,       // Cuenta de sucursales
  "totalSubcategories": 9,  // Cuenta de subcategorías
  "totalProducts": 10       // Cuenta de productos
}
```

Estas estadísticas son **read-only** y no se pueden modificar directamente.

---

### **4. Formato de Timestamps**

Todos los timestamps están en formato **ISO 8601:**
```json
"createdAt": "2025-01-09T00:00:00.000Z",
"updatedAt": "2025-01-09T12:30:45.123Z"
```

**En Flutter:**
```dart
DateTime createdAt = DateTime.parse(restaurant.createdAt);
String formattedDate = DateFormat('dd/MM/yyyy').format(createdAt);
```

---

## 🔗 Endpoints Relacionados

Esta funcionalidad es parte del módulo completo de Owner. Otros endpoints disponibles:

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/restaurant/branches` | Listar sucursales |
| `POST /api/restaurant/branches` | Crear sucursal |
| `GET /api/restaurant/products` | Listar productos |
| `POST /api/restaurant/products` | Crear producto |
| `GET /api/restaurant/orders` | Listar pedidos |

**Nota:** Estos endpoints se documentarán en archivos separados siguiendo el patrón modular.

---

## 📖 Glosario

| Término | Definición |
|---------|------------|
| **Owner** | Dueño de restaurante con control total sobre su negocio |
| **Branch** | Sucursal física del restaurante |
| **FormData** | Formato multipart/form-data para enviar archivos |
| **JWT** | JSON Web Token para autenticación |
| **PATCH** | Método HTTP para actualización parcial |
| **ISO 8601** | Formato estándar de timestamps (YYYY-MM-DDTHH:mm:ss.sssZ) |

---

## 🎉 Resumen

Esta especificación técnica cubre la funcionalidad completa de **Editar Perfil del Restaurante** para el rol de **Owner**, incluyendo:

✅ Consulta de perfil completo  
✅ Actualización de datos de texto (nombre, descripción)  
✅ Subida de imágenes (logo y portada)  
✅ Proceso de 2 pasos para cambiar imágenes  
✅ Validaciones exhaustivas  
✅ Manejo completo de errores  
✅ Casos de uso documentados  

El equipo de frontend tiene toda la información necesaria para implementar esta funcionalidad en Flutter sin necesidad de consultar el código del backend.

---

**Fecha de Creación:** 9 de Enero, 2025  
**Versión del API:** 1.0  
**Autor:** Equipo Backend Delixmi  
**Estado:** ✅ Especificación Completa

