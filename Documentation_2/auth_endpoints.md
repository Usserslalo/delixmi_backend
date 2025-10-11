# Documentación de Endpoints de Autenticación

## Introducción

Bienvenido a la documentación oficial de los endpoints de autenticación de Delixmi Backend. Este backend está desplegado en producción en Render.com y conectado a una base de datos MySQL en AWS RDS. La API está completamente funcional y lista para ser consumida por el frontend.

Todos los endpoints implementan validación robusta con **Zod**, manejo de errores estandarizado y respuestas JSON consistentes. La autenticación se realiza mediante **JSON Web Tokens (JWT)** con una duración de 24 horas.

### URL Base de la API

```
https://delixmi-backend.onrender.com
```

### Formato de Respuestas

Todas las respuestas de la API siguen un formato estándar:

**Respuesta Exitosa:**
```json
{
  "status": "success",
  "message": "Descripción del resultado",
  "data": {
    // ... datos de respuesta
  }
}
```

**Respuesta de Error:**
```json
{
  "status": "error",
  "message": "Descripción del error",
  "code": "ERROR_CODE",
  "data": null
}
```

---

## Endpoints

### 1. Registro de Usuario

Registra un nuevo usuario en el sistema y envía un correo electrónico de verificación automáticamente.

#### **Método y Ruta**
```
POST /api/auth/register
```

#### **Headers Requeridos**
```
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "name": "Juan",
  "lastname": "Pérez",
  "email": "juan.perez@example.com",
  "phone": "5512345678",
  "password": "MiContraseña123"
}
```

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `name` | string | ✅ Sí | Mínimo 2 caracteres, máximo 100 caracteres |
| `lastname` | string | ✅ Sí | Mínimo 2 caracteres, máximo 100 caracteres |
| `email` | string | ✅ Sí | Debe ser un correo electrónico válido, máximo 150 caracteres |
| `phone` | string | ✅ Sí | Mínimo 10 caracteres, máximo 20 caracteres, solo números y símbolos válidos (+, -, (), espacio) |
| `password` | string | ✅ Sí | Mínimo 8 caracteres, máximo 128 caracteres |

#### **Respuesta Exitosa (201 Created)**

```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@example.com",
      "phone": "5512345678",
      "status": "pending",
      "createdAt": "2024-10-11T10:30:00.000Z"
    },
    "emailSent": true
  }
}
```

#### **Respuestas de Error**

**Error 400 - Datos Inválidos**
```json
{
  "status": "error",
  "message": "El nombre debe tener al menos 2 caracteres",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "name",
      "message": "El nombre debe tener al menos 2 caracteres",
      "code": "too_small"
    }
  ],
  "data": null
}
```

**Error 409 - Usuario Ya Existe**
```json
{
  "status": "error",
  "message": "El correo electrónico ya está en uso",
  "code": "USER_EXISTS",
  "data": null
}
```

**Error 500 - Error al Enviar Correo de Verificación**
```json
{
  "status": "error",
  "message": "Usuario creado, pero no se pudo enviar el correo de verificación. Por favor, solicita un reenvío.",
  "code": "EMAIL_SEND_ERROR",
  "data": {
    "userId": 1,
    "email": "juan.perez@example.com"
  }
}
```

**Nota:** Este error ocurre cuando el usuario se registra correctamente en la base de datos, pero el sistema no puede enviar el correo electrónico de verificación. El usuario ha sido creado y puede solicitar un reenvío del correo usando el endpoint `/api/auth/resend-verification`.

**Error 500 - Error Interno del Servidor**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "data": null
}
```

---

### 2. Inicio de Sesión

Autentica a un usuario y devuelve un token JWT para acceder a los endpoints protegidos.

#### **Método y Ruta**
```
POST /api/auth/login
```

#### **Headers Requeridos**
```
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "email": "juan.perez@example.com",
  "password": "MiContraseña123"
}
```

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `email` | string | ✅ Sí | Debe ser un correo electrónico válido |
| `password` | string | ✅ Sí | No puede estar vacío |

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@example.com",
      "phone": "5512345678",
      "status": "active",
      "emailVerifiedAt": "2024-10-11T10:35:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-10-11T10:30:00.000Z",
      "updatedAt": "2024-10-11T10:35:00.000Z",
      "roles": [
        {
          "roleId": 1,
          "roleName": "customer",
          "roleDisplayName": "Cliente",
          "restaurantId": null,
          "branchId": null
        }
      ]
    },
    "expiresIn": "24h"
  }
}
```

#### **Respuestas de Error**

**Error 400 - Datos Inválidos**
```json
{
  "status": "error",
  "message": "Debe ser un correo electrónico válido",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Debe ser un correo electrónico válido",
      "code": "invalid_string"
    }
  ],
  "data": null
}
```

**Error 401 - Credenciales Incorrectas**
```json
{
  "status": "error",
  "message": "Credenciales incorrectas",
  "code": "INVALID_CREDENTIALS",
  "data": null
}
```

**Error 403 - Cuenta No Verificada**
```json
{
  "status": "error",
  "message": "Cuenta no verificada. Por favor, verifica tu correo electrónico.",
  "code": "ACCOUNT_NOT_VERIFIED",
  "data": null
}
```

---

### 3. Verificación de Email

Verifica el correo electrónico del usuario mediante el token enviado por email.

#### **Método y Ruta**
```
GET /api/auth/verify-email?token={verification_token}
```

#### **Parámetros de Query**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `token` | string | ✅ Sí | Token JWT de verificación enviado por email |

#### **Respuesta Exitosa (200 OK)**

**Respuesta HTML:** Esta ruta devuelve una página HTML informativa con el resultado de la verificación.

**Caso Exitoso:**
- Página HTML con mensaje: "🎉 ¡Cuenta Verificada!"
- La cuenta del usuario se activa automáticamente (status: `active`)
- Se registra la fecha de verificación en `emailVerifiedAt`

**Casos de Error:**
- Token inválido o expirado: Página HTML con error y opción de solicitar nuevo enlace
- Usuario ya verificado: Página HTML informando que ya está verificado
- Usuario no encontrado: Página HTML con error

---

### 4. Reenvío de Verificación

Reenvía el correo de verificación a un usuario que no ha verificado su cuenta.

#### **Método y Ruta**
```
POST /api/auth/resend-verification
```

#### **Headers Requeridos**
```
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "email": "juan.perez@example.com"
}
```

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `email` | string | ✅ Sí | Debe ser un correo electrónico válido |

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Nuevo enlace de verificación enviado a tu correo electrónico",
  "data": {
    "email": "juan.perez@example.com",
    "emailSent": true
  }
}
```

#### **Respuestas de Error**

**Error 400 - Cuenta Ya Verificada**
```json
{
  "status": "error",
  "message": "La cuenta ya está verificada",
  "code": "ALREADY_VERIFIED",
  "data": null
}
```

**Error 404 - Usuario No Encontrado**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND",
  "data": null
}
```

---

### 5. Solicitud de Restablecimiento de Contraseña

Envía un correo electrónico con un enlace para restablecer la contraseña.

#### **Método y Ruta**
```
POST /api/auth/forgot-password
```

#### **Headers Requeridos**
```
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "email": "juan.perez@example.com"
}
```

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `email` | string | ✅ Sí | Debe ser un correo electrónico válido |

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña."
}
```

**Nota de Seguridad:** Por razones de seguridad, la API siempre devuelve la misma respuesta, independientemente de si el correo existe o no, para prevenir la enumeración de usuarios.

#### **Respuestas de Error**

**Error 400 - Datos Inválidos**
```json
{
  "status": "error",
  "message": "Debe ser un correo electrónico válido",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Debe ser un correo electrónico válido",
      "code": "invalid_string"
    }
  ],
  "data": null
}
```

---

### 6. Restablecimiento de Contraseña

Restablece la contraseña del usuario utilizando el token enviado por email.

#### **Método y Ruta**
```
POST /api/auth/reset-password
```

#### **Headers Requeridos**
```
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2",
  "newPassword": "NuevaContraseña456"
}
```

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `token` | string | ✅ Sí | Exactamente 64 caracteres hexadecimales |
| `newPassword` | string | ✅ Sí | Mínimo 8 caracteres, máximo 128 caracteres |

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Contraseña actualizada exitosamente.",
  "data": {
    "userId": 1,
    "email": "juan.perez@example.com"
  }
}
```

#### **Respuestas de Error**

**Error 400 - Token Inválido o Expirado**
```json
{
  "status": "error",
  "message": "Token inválido o expirado.",
  "code": "INVALID_OR_EXPIRED_TOKEN",
  "data": null
}
```

**Error 400 - Validación de Contraseña**
```json
{
  "status": "error",
  "message": "La nueva contraseña debe tener al menos 8 caracteres",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "newPassword",
      "message": "La nueva contraseña debe tener al menos 8 caracteres",
      "code": "too_small"
    }
  ],
  "data": null
}
```

---

## Endpoints Protegidos (Requieren Autenticación)

Los siguientes endpoints requieren que el usuario esté autenticado. Se debe incluir el token JWT en el header `Authorization`.

### Header de Autenticación Requerido
```
Authorization: Bearer {token}
```

Ejemplo:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 7. Obtener Perfil del Usuario

Obtiene la información del perfil del usuario autenticado.

#### **Método y Ruta**
```
GET /api/auth/profile
```

#### **Headers Requeridos**
```
Authorization: Bearer {token}
```

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Perfil obtenido exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@example.com",
      "phone": "5512345678",
      "status": "active",
      "emailVerifiedAt": "2024-10-11T10:35:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-10-11T10:30:00.000Z",
      "updatedAt": "2024-10-11T10:35:00.000Z",
      "roles": [
        {
          "roleId": 1,
          "roleName": "customer",
          "roleDisplayName": "Cliente",
          "restaurantId": null,
          "branchId": null
        }
      ]
    }
  }
}
```

#### **Respuestas de Error**

**Error 401 - Token No Proporcionado**
```json
{
  "status": "error",
  "message": "Token de acceso requerido",
  "code": "MISSING_TOKEN"
}
```

**Error 401 - Token Inválido**
```json
{
  "status": "error",
  "message": "Token inválido",
  "code": "INVALID_TOKEN"
}
```

**Error 401 - Token Expirado**
```json
{
  "status": "error",
  "message": "Token expirado",
  "code": "TOKEN_EXPIRED"
}
```

---

### 8. Actualizar Perfil del Usuario

Actualiza la información del perfil del usuario autenticado.

#### **Método y Ruta**
```
PUT /api/auth/profile
```

#### **Headers Requeridos**
```
Authorization: Bearer {token}
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "name": "Juan Carlos",
  "lastname": "Pérez García",
  "phone": "5587654321"
}
```

**Nota:** Todos los campos son opcionales. Solo se actualizarán los campos proporcionados.

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `name` | string | ❌ No | Si se proporciona: mínimo 2 caracteres, máximo 100 caracteres |
| `lastname` | string | ❌ No | Si se proporciona: mínimo 2 caracteres, máximo 100 caracteres |
| `phone` | string | ❌ No | Si se proporciona: mínimo 10 caracteres, máximo 20 caracteres, solo números y símbolos válidos |

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Perfil actualizado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan Carlos",
      "lastname": "Pérez García",
      "email": "juan.perez@example.com",
      "phone": "5587654321",
      "status": "active",
      "emailVerifiedAt": "2024-10-11T10:35:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-10-11T10:30:00.000Z",
      "updatedAt": "2024-10-11T11:00:00.000Z"
    }
  }
}
```

#### **Respuestas de Error**

**Error 409 - Teléfono Ya Registrado**
```json
{
  "status": "error",
  "message": "Este número de teléfono ya está registrado por otro usuario",
  "code": "PHONE_EXISTS",
  "data": null
}
```

---

### 9. Cambiar Contraseña

Permite al usuario autenticado cambiar su contraseña.

#### **Método y Ruta**
```
PUT /api/auth/change-password
```

#### **Headers Requeridos**
```
Authorization: Bearer {token}
Content-Type: application/json
```

#### **Payload (Body)**

```json
{
  "currentPassword": "MiContraseña123",
  "newPassword": "NuevaContraseña456"
}
```

#### **Reglas de Validación**

| Campo | Tipo | Requerido | Validación |
|-------|------|-----------|------------|
| `currentPassword` | string | ✅ Sí | No puede estar vacío |
| `newPassword` | string | ✅ Sí | Mínimo 8 caracteres, máximo 128 caracteres |

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Contraseña actualizada exitosamente",
  "data": {
    "userId": 1,
    "updatedAt": "2024-10-11T11:30:00.000Z"
  }
}
```

#### **Respuestas de Error**

**Error 400 - Contraseña Actual Incorrecta**
```json
{
  "status": "error",
  "message": "La contraseña actual es incorrecta",
  "code": "INVALID_CURRENT_PASSWORD",
  "data": null
}
```

---

### 10. Verificar Token

Verifica la validez del token JWT actual.

#### **Método y Ruta**
```
GET /api/auth/verify
```

#### **Headers Requeridos**
```
Authorization: Bearer {token}
```

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Token válido",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@example.com",
      "phone": "5512345678",
      "status": "active",
      "emailVerifiedAt": "2024-10-11T10:35:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-10-11T10:30:00.000Z",
      "updatedAt": "2024-10-11T10:35:00.000Z",
      "roles": [...]
    },
    "valid": true
  }
}
```

---

### 11. Cerrar Sesión

Cierra la sesión del usuario. En un sistema JWT stateless, el cierre de sesión se maneja principalmente en el cliente eliminando el token.

#### **Método y Ruta**
```
POST /api/auth/logout
```

#### **Headers Requeridos**
```
Authorization: Bearer {token}
```

#### **Respuesta Exitosa (200 OK)**

```json
{
  "status": "success",
  "message": "Sesión cerrada exitosamente",
  "data": null
}
```

---

## Códigos de Error Comunes

| Código | Descripción |
|--------|-------------|
| `VALIDATION_ERROR` | Error de validación de datos de entrada |
| `USER_EXISTS` | El usuario ya existe en el sistema |
| `USER_NOT_FOUND` | Usuario no encontrado |
| `INVALID_CREDENTIALS` | Credenciales incorrectas |
| `ACCOUNT_NOT_VERIFIED` | Cuenta no verificada |
| `ALREADY_VERIFIED` | Cuenta ya verificada |
| `INVALID_OR_EXPIRED_TOKEN` | Token inválido o expirado |
| `MISSING_TOKEN` | Token de acceso requerido |
| `INVALID_TOKEN` | Token inválido |
| `TOKEN_EXPIRED` | Token expirado |
| `PHONE_EXISTS` | Teléfono ya registrado |
| `INVALID_CURRENT_PASSWORD` | Contraseña actual incorrecta |
| `EMAIL_SEND_ERROR` | Usuario creado pero error al enviar email de verificación |
| `INTERNAL_ERROR` | Error interno del servidor |

---

## Códigos de Estado HTTP

| Código | Significado |
|--------|-------------|
| `200 OK` | Solicitud exitosa |
| `201 Created` | Recurso creado exitosamente |
| `400 Bad Request` | Datos de entrada inválidos |
| `401 Unauthorized` | No autenticado o credenciales inválidas |
| `403 Forbidden` | No autorizado (cuenta no verificada) |
| `404 Not Found` | Recurso no encontrado |
| `409 Conflict` | Conflicto (ej: usuario ya existe) |
| `500 Internal Server Error` | Error interno del servidor |

---

## Ejemplos de Integración

### Ejemplo en JavaScript (Fetch API)

#### Registro
```javascript
const registerUser = async (userData) => {
  try {
    const response = await fetch('https://delixmi-backend.onrender.com/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (data.status === 'success') {
      console.log('Usuario registrado:', data.data.user);
      // Mostrar mensaje: "Verifica tu correo electrónico"
      return { success: true, user: data.data.user };
    } else {
      // Manejar errores
      if (data.code === 'EMAIL_SEND_ERROR') {
        console.warn('Usuario creado pero email no enviado:', data.message);
        // El usuario fue creado exitosamente
        // Ofrecer opción de reenviar verificación
        return { 
          success: false, 
          needsResend: true, 
          userId: data.data.userId,
          email: data.data.email,
          message: data.message 
        };
      } else if (data.code === 'USER_EXISTS') {
        console.error('El usuario ya existe');
        // Sugerir login o recuperación de contraseña
        return { success: false, userExists: true, message: data.message };
      } else {
        console.error('Error:', data.message);
        return { success: false, message: data.message };
      }
    }
  } catch (error) {
    console.error('Error de red:', error);
    return { success: false, message: 'Error de conexión' };
  }
};

// Uso
const result = await registerUser({
  name: 'Juan',
  lastname: 'Pérez',
  email: 'juan.perez@example.com',
  phone: '5512345678',
  password: 'MiContraseña123'
});

if (result.success) {
  // Redirigir a pantalla de verificación
} else if (result.needsResend) {
  // Mostrar opción de reenviar email de verificación
  console.log('Solicitar reenvío para:', result.email);
}
```

#### Login
```javascript
const loginUser = async (credentials) => {
  try {
    const response = await fetch('https://delixmi-backend.onrender.com/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (data.status === 'success') {
      // Guardar el token en localStorage o contexto de la app
      localStorage.setItem('authToken', data.data.token);
      console.log('Usuario autenticado:', data.data.user);
      return data.data;
    } else {
      console.error('Error:', data.message);
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Error de autenticación:', error);
    throw error;
  }
};

// Uso
loginUser({
  email: 'juan.perez@example.com',
  password: 'MiContraseña123'
});
```

#### Petición Autenticada
```javascript
const getUserProfile = async () => {
  const token = localStorage.getItem('authToken');

  try {
    const response = await fetch('https://delixmi-backend.onrender.com/api/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.status === 'success') {
      console.log('Perfil del usuario:', data.data.user);
      return data.data.user;
    } else {
      console.error('Error:', data.message);
      // Si el token expiró, redirigir al login
      if (data.code === 'TOKEN_EXPIRED') {
        // Redirigir a login
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Mejores Prácticas

### 1. Manejo de Tokens
- **Almacenamiento Seguro:** Guarda el token en `localStorage` (web) o almacenamiento seguro (móvil)
- **Incluir en Todas las Peticiones:** Agrega el header `Authorization: Bearer {token}` en todas las peticiones a endpoints protegidos
- **Renovación:** El token expira en 24 horas. Implementa lógica para renovar el token o solicitar re-autenticación

### 2. Manejo de Errores
- **Verificar `status`:** Siempre verifica si `data.status === 'success'` antes de procesar la respuesta
- **Mostrar Mensajes:** Usa `data.message` para mostrar mensajes al usuario
- **Códigos de Error:** Usa `data.code` para manejar errores específicos programáticamente
- **Error EMAIL_SEND_ERROR en Registro:** 
  - Este error indica que el usuario **sí fue creado** exitosamente
  - Ofrece al usuario la opción de reenviar el correo de verificación
  - Usa el `userId` y `email` proporcionados en `data.data` para el reenvío
  - No solicites al usuario que se registre nuevamente (causaría error `USER_EXISTS`)

### 3. Validación del Frontend
- Implementa validación en el frontend para proporcionar retroalimentación inmediata
- La validación del backend es la fuente de verdad, pero la validación del frontend mejora la UX

### 4. Seguridad
- **HTTPS:** Todas las peticiones deben usar HTTPS (la API lo requiere)
- **No Exponer Tokens:** Nunca registres tokens en consola en producción
- **Logout Seguro:** Al cerrar sesión, elimina el token del almacenamiento local

### 5. Rate Limiting
- El endpoint de login tiene rate limiting: 5 intentos por IP cada 15 minutos
- El endpoint de forgot-password tiene rate limiting: 3 intentos por IP cada hora
- Implementa manejo apropiado cuando se alcance el límite (HTTP 429)

---

## Soporte

Para preguntas, problemas o sugerencias sobre la API, contacta al equipo de backend.

**Estado del Servicio:** Producción ✅  
**Última Actualización:** Octubre 2024  
**Versión de la API:** 1.0.0

