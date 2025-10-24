# 🔐 Endpoints de Autenticación - Actualizados para Schema V7.2

## Descripción
Documentación completa de todos los endpoints de autenticación actualizados para ser compatibles con el schema de Prisma V7.2.

## Cambios Realizados

### ✅ **Correcciones Aplicadas:**
1. **Eliminado campo `branchId`** - Ya no existe en el schema actual
2. **Actualizado middleware de autenticación** - Compatible con nuevo schema
3. **Agregadas validaciones Zod** - Para verificación de teléfono
4. **Corregidos controladores** - Referencias a campos actualizados
5. **Agregado health check** - Para monitoreo del servicio

---

## 📋 **Endpoints Disponibles**

### 1. **Health Check**
```http
GET /api/auth/health
```
**Descripción**: Verificar estado del servicio de autenticación  
**Acceso**: Público  
**Respuesta**:
```json
{
  "status": "success",
  "message": "Servicio de autenticación funcionando correctamente",
  "data": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "service": "auth-service",
    "version": "1.0.0"
  }
}
```

### 2. **Registro de Usuario**
```http
POST /api/auth/register
```
**Descripción**: Registrar un nuevo usuario en la plataforma  
**Acceso**: Público  
**Body**:
```json
{
  "name": "Juan",
  "lastname": "Pérez",
  "email": "juan.perez@email.com",
  "phone": "1234567890",
  "password": "MiContraseña123"
}
```
**Respuesta Exitosa** (201):
```json
{
  "status": "success",
  "message": "Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "phone": "1234567890",
      "status": "pending",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "emailSent": true
  }
}
```

### 3. **Inicio de Sesión**
```http
POST /api/auth/login
```
**Descripción**: Iniciar sesión con email y contraseña  
**Acceso**: Público  
**Rate Limit**: 5 intentos por IP cada 15 minutos  
**Body**:
```json
{
  "email": "juan.perez@email.com",
  "password": "MiContraseña123"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4e5f6...",
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "phone": "1234567890",
      "status": "active",
      "emailVerifiedAt": "2024-01-15T10:30:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "roles": [
        {
          "roleId": 1,
          "roleName": "customer",
          "roleDisplayName": "Cliente",
          "restaurantId": null
        }
      ]
    },
    "expiresIn": "15m"
  }
}
```

### 4. **Obtener Perfil**
```http
GET /api/auth/profile
```
**Descripción**: Obtener información del usuario autenticado  
**Acceso**: Privado (requiere token)  
**Headers**:
```
Authorization: Bearer <access_token>
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Perfil obtenido exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "phone": "1234567890",
      "status": "active",
      "emailVerifiedAt": "2024-01-15T10:30:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "roles": [
        {
          "roleId": 1,
          "roleName": "customer",
          "roleDisplayName": "Cliente",
          "restaurantId": null
        }
      ]
    }
  }
}
```

### 5. **Actualizar Perfil**
```http
PUT /api/auth/profile
```
**Descripción**: Actualizar información del perfil del usuario  
**Acceso**: Privado (requiere token)  
**Body**:
```json
{
  "name": "Juan Carlos",
  "lastname": "Pérez García",
  "phone": "0987654321"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Perfil actualizado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan Carlos",
      "lastname": "Pérez García",
      "email": "juan.perez@email.com",
      "phone": "0987654321",
      "status": "active",
      "emailVerifiedAt": "2024-01-15T10:30:00.000Z",
      "phoneVerifiedAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### 6. **Cambiar Contraseña**
```http
PUT /api/auth/change-password
```
**Descripción**: Cambiar contraseña del usuario autenticado  
**Acceso**: Privado (requiere token)  
**Body**:
```json
{
  "currentPassword": "MiContraseña123",
  "newPassword": "NuevaContraseña456"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Contraseña actualizada exitosamente",
  "data": {
    "userId": 1,
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 7. **Refrescar Token**
```http
POST /api/auth/refresh-token
```
**Descripción**: Obtener nuevo access token usando refresh token  
**Acceso**: Público (pero requiere refresh token válido)  
**Body**:
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Tokens renovados exitosamente",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "b2c3d4e5f6g7...",
    "expiresIn": "15m"
  }
}
```

### 8. **Cerrar Sesión**
```http
POST /api/auth/logout
```
**Descripción**: Cerrar sesión invalidando refresh token  
**Acceso**: Público (pero requiere refresh token válido)  
**Body**:
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Sesión cerrada exitosamente",
  "data": null
}
```

### 9. **Verificar Token**
```http
GET /api/auth/verify
```
**Descripción**: Verificar validez del access token  
**Acceso**: Privado (requiere token)  
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Token válido",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "lastname": "Pérez",
      "email": "juan.perez@email.com",
      "phone": "1234567890",
      "status": "active",
      "roles": [...]
    },
    "valid": true
  }
}
```

### 10. **Verificar Email**
```http
GET /api/auth/verify-email?token=<verification_token>
```
**Descripción**: Verificar email con token de verificación  
**Acceso**: Público  
**Query Params**:
- `token`: Token de verificación JWT

**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Tu cuenta ha sido verificada con éxito. Ya puedes iniciar sesión.",
  "data": {
    "user": {
      "id": 1,
      "email": "juan.perez@email.com",
      "name": "Juan",
      "status": "active",
      "emailVerifiedAt": "2024-01-15T10:30:00.000Z"
    },
    "verified": true
  }
}
```

### 11. **Reenviar Verificación**
```http
POST /api/auth/resend-verification
```
**Descripción**: Reenviar email de verificación  
**Acceso**: Público  
**Body**:
```json
{
  "email": "juan.perez@email.com"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Nuevo enlace de verificación enviado a tu correo electrónico",
  "data": {
    "email": "juan.perez@email.com",
    "emailSent": true
  }
}
```

### 12. **Solicitar Reset de Contraseña**
```http
POST /api/auth/forgot-password
```
**Descripción**: Solicitar restablecimiento de contraseña  
**Acceso**: Público  
**Rate Limit**: 3 intentos por IP cada hora  
**Body**:
```json
{
  "email": "juan.perez@email.com"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Si tu correo está registrado, recibirás un enlace para restablecer tu contraseña."
}
```

### 13. **Resetear Contraseña**
```http
POST /api/auth/reset-password
```
**Descripción**: Restablecer contraseña con token  
**Acceso**: Público  
**Body**:
```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NuevaContraseña789"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Contraseña actualizada exitosamente.",
  "data": {
    "userId": 1,
    "email": "juan.perez@email.com"
  }
}
```

### 14. **Enviar Verificación por SMS**
```http
POST /api/auth/send-phone-verification
```
**Descripción**: Enviar código OTP de verificación por SMS  
**Acceso**: Privado (requiere token)  
**Headers**:
```
Authorization: Bearer <access_token>
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Código de verificación enviado a tu teléfono",
  "data": {
    "phone": "123***7890",
    "expiresIn": 10,
    "messageSid": "SM1234567890abcdef"
  }
}
```

### 15. **Verificar Teléfono**
```http
POST /api/auth/verify-phone
```
**Descripción**: Verificar código OTP de teléfono  
**Acceso**: Privado (requiere token)  
**Body**:
```json
{
  "otp": "123456"
}
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Número de teléfono verificado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan",
      "phone": "123***7890",
      "phoneVerifiedAt": "2024-01-15T10:30:00.000Z",
      "emailVerifiedAt": "2024-01-15T10:30:00.000Z",
      "status": "active"
    }
  }
}
```

### 16. **Obtener Token de Verificación (Testing)**
```http
GET /api/auth/get-verification-token/:userId
```
**Descripción**: Obtener token de verificación para testing  
**Acceso**: Público (solo para testing)  
**Headers** (opcional):
```
X-Test-Key: <test_key>
```
**Respuesta Exitosa** (200):
```json
{
  "status": "success",
  "message": "Token de verificación generado",
  "data": {
    "user": {
      "id": 1,
      "email": "juan.perez@email.com",
      "name": "Juan",
      "status": "pending",
      "emailVerifiedAt": null
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "verificationUrl": "http://localhost:3000/email-verification?token=..."
  }
}
```

---

## 🔧 **Configuración de Variables de Entorno**

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=7

# Database
DATABASE_URL=mysql://username:password@localhost:3306/delixmi

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@delixmi.com
FRONTEND_URL=http://localhost:3000

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Environment
NODE_ENV=development
```

---

## 🚨 **Códigos de Error Comunes**

| Código | Descripción | Solución |
|--------|-------------|----------|
| `MISSING_TOKEN` | Token de acceso requerido | Incluir header Authorization |
| `INVALID_TOKEN` | Token inválido | Verificar formato del token |
| `TOKEN_EXPIRED` | Token expirado | Renovar token con refresh token |
| `USER_NOT_FOUND` | Usuario no encontrado | Verificar credenciales |
| `INVALID_CREDENTIALS` | Credenciales incorrectas | Verificar email y contraseña |
| `ACCOUNT_NOT_VERIFIED` | Cuenta no verificada | Verificar email primero |
| `ACCOUNT_INACTIVE` | Cuenta inactiva | Contactar soporte |
| `PHONE_EXISTS` | Teléfono ya registrado | Usar otro número |
| `EMAIL_EXISTS` | Email ya registrado | Usar otro email |
| `INVALID_OTP` | Código OTP inválido | Verificar código recibido |
| `OTP_EXPIRED` | Código OTP expirado | Solicitar nuevo código |
| `INVALID_OR_EXPIRED_TOKEN` | Token de reset inválido | Solicitar nuevo reset |

---

## 📝 **Notas Importantes**

1. **Seguridad**: Todos los tokens JWT incluyen información de roles actualizada
2. **Validación**: Todos los endpoints usan validación Zod estricta
3. **Rate Limiting**: Endpoints sensibles tienen límites de intentos
4. **Auditoría**: Todas las operaciones quedan registradas
5. **Compatibilidad**: Totalmente compatible con schema Prisma V7.2
6. **Testing**: Incluye endpoints de testing para desarrollo

---

## 🧪 **Testing**

Para ejecutar las pruebas de autenticación:

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar solo pruebas de autenticación
npm run test:auth

# Ejecutar con cobertura
npm run test:coverage
```

---

## 📚 **Referencias**

- [Schema Prisma V7.2](./prisma/schema.prisma)
- [Seed de Datos](./prisma/seed.js)
- [Validaciones Zod](./src/validations/auth.validation.js)
- [Controladores](./src/controllers/auth.controller.js)
- [Rutas](./src/routes/auth.routes.js)
- [Middleware](./src/middleware/auth.middleware.js)
