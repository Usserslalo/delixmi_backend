# 🔐 Sistema de Autenticación Completo - Delixmi Backend

## 📋 Índice
1. [Resumen de Cambios](#resumen-de-cambios)
2. [Endpoints Disponibles](#endpoints-disponibles)
3. [Flujo de Autenticación](#flujo-de-autenticación)
4. [Tokens y Seguridad](#tokens-y-seguridad)
5. [Manejo de Errores](#manejo-de-errores)
6. [Rate Limiting](#rate-limiting)
7. [Validaciones](#validaciones)
8. [Ejemplos de Uso](#ejemplos-de-uso)
9. [Consideraciones de Frontend](#consideraciones-de-frontend)

---

## 🔄 Resumen de Cambios

### **Nuevas Características Implementadas:**
- ✅ **Refresh Tokens** para sesiones persistentes
- ✅ **Rate Limiting** para prevenir abuso
- ✅ **Validación robusta** con Zod
- ✅ **Manejo de errores** centralizado
- ✅ **Content Security Policy** mejorada
- ✅ **Logging detallado** para debugging
- ✅ **Verificación de email** con página web
- ✅ **Restablecimiento de contraseña** completo

### **Cambios en Seguridad:**
- 🔒 **JWT con expiración corta** (15 minutos por defecto)
- 🔒 **Refresh tokens rotativos** (30 días por defecto)
- 🔒 **Rate limiting** en endpoints críticos
- 🔒 **Validación estricta** de datos de entrada
- 🔒 **CSP** para prevenir XSS

---

## 🌐 Endpoints Disponibles

### **Base URL:** `https://delixmi-backend.onrender.com`

### **1. Registro de Usuario**
```http
POST /api/auth/register
Content-Type: application/json

{
    "name": "Eduardo",
    "lastname": "Simon", 
    "email": "usuario@example.com",
    "phone": "5555555555",
    "password": "Password123!"
}
```

**Respuesta Exitosa (201):**
```json
{
    "status": "success",
    "message": "Usuario registrado exitosamente. Por favor, verifica tu correo electrónico para activar tu cuenta.",
    "timestamp": "2025-10-17T04:48:29.795Z",
    "data": {
        "user": {
            "id": 12,
            "name": "Eduardo",
            "lastname": "Simon",
            "email": "usuario@example.com",
            "phone": "5555555555",
            "status": "pending",
            "createdAt": "2025-10-17T04:48:29.217Z"
        },
        "emailSent": true
    }
}
```

### **2. Inicio de Sesión**
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "usuario@example.com",
    "password": "Password123!"
}
```

**Respuesta Exitosa (200):**
```json
{
    "status": "success",
    "message": "Inicio de sesión exitoso",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0...",
        "user": {
            "id": 12,
            "name": "Eduardo",
            "lastname": "Simon",
            "email": "usuario@example.com",
            "phone": "5555555555",
            "status": "active",
            "emailVerifiedAt": "2025-10-17T04:48:30.000Z",
            "phoneVerifiedAt": null,
            "createdAt": "2025-10-17T04:48:29.217Z",
            "updatedAt": "2025-10-17T04:48:30.000Z",
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
        "expiresIn": "15m"
    }
}
```

### **3. Renovar Access Token**
```http
POST /api/auth/refresh-token
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN_EXPIRADO

{
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
}
```

**Respuesta Exitosa (200):**
```json
{
    "status": "success",
    "message": "Tokens renovados exitosamente",
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "nuevo_refresh_token_aqui...",
        "expiresIn": "15m"
    }
}
```

### **4. Cerrar Sesión**
```http
POST /api/auth/logout
Content-Type: application/json

{
    "refreshToken": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0..."
}
```

### **5. Verificar Email**
```http
GET /api/auth/verify-email?token=TOKEN_DE_VERIFICACION
```

**Respuesta Exitosa (200):**
```json
{
    "status": "success",
    "message": "Tu cuenta ha sido verificada con éxito. Ya puedes iniciar sesión.",
    "data": {
        "user": {
            "id": 12,
            "email": "usuario@example.com",
            "name": "Eduardo",
            "status": "active",
            "emailVerifiedAt": "2025-10-17T04:48:30.000Z"
        },
        "verified": true
    }
}
```

### **6. Reenviar Verificación**
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
    "email": "usuario@example.com"
}
```

### **7. Solicitar Reset de Contraseña**
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
    "email": "usuario@example.com"
}
```

### **8. Reset de Contraseña**
```http
POST /api/auth/reset-password
Content-Type: application/json

{
    "token": "TOKEN_DE_RESET",
    "newPassword": "NuevaPassword123!"
}
```

### **9. Cambiar Contraseña (Autenticado)**
```http
PUT /api/auth/change-password
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN

{
    "currentPassword": "PasswordActual123!",
    "newPassword": "NuevaPassword123!"
}
```

### **10. Obtener Perfil**
```http
GET /api/auth/profile
Authorization: Bearer ACCESS_TOKEN
```

### **11. Actualizar Perfil**
```http
PUT /api/auth/profile
Content-Type: application/json
Authorization: Bearer ACCESS_TOKEN

{
    "name": "Nuevo Nombre",
    "lastname": "Nuevo Apellido",
    "phone": "5555555556"
}
```

### **12. Verificar Token**
```http
GET /api/auth/verify
Authorization: Bearer ACCESS_TOKEN
```

---

## 🔄 Flujo de Autenticación

### **1. Registro y Verificación:**
```
1. Usuario se registra → POST /api/auth/register
2. Recibe email de verificación
3. Hace clic en enlace → GET /email-verification?token=...
4. Página web verifica automáticamente → GET /api/auth/verify-email
5. Usuario puede iniciar sesión
```

### **2. Login y Sesión Persistente:**
```
1. Usuario hace login → POST /api/auth/login
2. Recibe accessToken (15min) + refreshToken (30 días)
3. Usa accessToken para requests autenticados
4. Cuando accessToken expira, usa refreshToken → POST /api/auth/refresh-token
5. Recibe nuevo accessToken + nuevo refreshToken
6. Continúa usando la app sin re-login
```

### **3. Logout:**
```
1. Usuario hace logout → POST /api/auth/logout
2. Envía refreshToken para invalidarlo
3. Elimina tokens del cliente
4. Usuario debe hacer login nuevamente
```

---

## 🔐 Tokens y Seguridad

### **Access Token:**
- **Duración:** 15 minutos (configurable)
- **Uso:** Autenticación en requests
- **Header:** `Authorization: Bearer ACCESS_TOKEN`
- **Contenido:** userId, roleId, roleName, email

### **Refresh Token:**
- **Duración:** 30 días (configurable)
- **Uso:** Renovar access tokens
- **Almacenamiento:** Base de datos (hasheado)
- **Rotación:** Se genera uno nuevo en cada renovación

### **Token de Verificación de Email:**
- **Duración:** 1 hora
- **Uso:** Verificar cuentas de email
- **URL:** `/email-verification?token=...`

### **Token de Reset de Contraseña:**
- **Duración:** 15 minutos
- **Uso:** Restablecer contraseñas
- **Almacenamiento:** Base de datos (hasheado)

---

## ⚠️ Manejo de Errores

### **Códigos de Error Comunes:**

#### **400 - Bad Request:**
```json
{
    "status": "error",
    "message": "Datos de entrada inválidos",
    "code": "VALIDATION_ERROR",
    "errors": [
        {
            "field": "email",
            "message": "El email es requerido"
        }
    ]
}
```

#### **401 - Unauthorized:**
```json
{
    "status": "error",
    "message": "Credenciales incorrectas",
    "code": "INVALID_CREDENTIALS"
}
```

#### **403 - Forbidden:**
```json
{
    "status": "error",
    "message": "Cuenta no verificada. Por favor, verifica tu correo electrónico.",
    "code": "ACCOUNT_NOT_VERIFIED"
}
```

#### **404 - Not Found:**
```json
{
    "status": "error",
    "message": "Usuario no encontrado",
    "code": "USER_NOT_FOUND"
}
```

#### **409 - Conflict:**
```json
{
    "status": "error",
    "message": "El correo electrónico ya está en uso",
    "code": "USER_EXISTS"
}
```

#### **429 - Too Many Requests:**
```json
{
    "status": "error",
    "message": "Demasiados intentos. Intenta más tarde.",
    "code": "RATE_LIMIT_EXCEEDED"
}
```

#### **500 - Internal Server Error:**
```json
{
    "status": "error",
    "message": "Error interno del servidor",
    "code": "INTERNAL_ERROR"
}
```

---

## 🚦 Rate Limiting

### **Endpoints con Rate Limiting:**

#### **Login:** 5 intentos por IP cada 15 minutos
#### **Forgot Password:** 3 intentos por IP cada hora

### **Headers de Rate Limiting:**
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1640995200
```

---

## ✅ Validaciones

### **Registro:**
- `name`: Requerido, string, 2-50 caracteres
- `lastname`: Requerido, string, 2-50 caracteres
- `email`: Requerido, email válido, único
- `phone`: Requerido, string, 10-15 caracteres, único
- `password`: Requerido, string, mínimo 8 caracteres, debe contener mayúscula, minúscula, número y símbolo

### **Login:**
- `email`: Requerido, email válido
- `password`: Requerido, string

### **Cambio de Contraseña:**
- `currentPassword`: Requerido, string
- `newPassword`: Requerido, string, mínimo 8 caracteres, debe contener mayúscula, minúscula, número y símbolo

---

## 💻 Consideraciones de Frontend

### **1. Almacenamiento de Tokens:**
```javascript
// Almacenar tokens de forma segura
localStorage.setItem('accessToken', response.data.accessToken);
localStorage.setItem('refreshToken', response.data.refreshToken);

// O usar SecureStore en React Native
await SecureStore.setItemAsync('accessToken', response.data.accessToken);
await SecureStore.setItemAsync('refreshToken', response.data.refreshToken);
```

### **2. Interceptor para Renovación Automática:**
```javascript
// Interceptor de Axios para renovar tokens automáticamente
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post('/api/auth/refresh-token', {
            refreshToken
          });
          
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Reintentar request original
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return axios.request(error.config);
        } catch (refreshError) {
          // Refresh falló, redirigir a login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### **3. Manejo de Estados de Usuario:**
```javascript
// Verificar si usuario está verificado
if (user.status !== 'active') {
  // Mostrar mensaje de verificación
  showVerificationMessage();
}

// Verificar si email está verificado
if (!user.emailVerifiedAt) {
  // Mostrar banner de verificación
  showEmailVerificationBanner();
}
```

### **4. Página de Verificación de Email:**
- **URL:** `https://delixmi-backend.onrender.com/email-verification?token=...`
- **Funcionalidad:** Verificación automática al cargar
- **Estados:** Loading, Success, Error, Already Verified
- **Deep Links:** Soporte para abrir app móvil

### **5. Manejo de Errores Específicos:**
```javascript
// Manejar errores específicos del backend
const handleAuthError = (error) => {
  switch (error.response?.data?.code) {
    case 'ACCOUNT_NOT_VERIFIED':
      showVerificationModal();
      break;
    case 'INVALID_CREDENTIALS':
      showLoginError('Credenciales incorrectas');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      showRateLimitError();
      break;
    default:
      showGenericError();
  }
};
```

### **6. Logout Completo:**
```javascript
const logout = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (refreshToken) {
    try {
      await axios.post('/api/auth/logout', { refreshToken });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  }
  
  // Limpiar almacenamiento local
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  
  // Redirigir a login
  window.location.href = '/login';
};
```

---

## 🔧 Configuración de Variables de Entorno

### **Backend (.env):**
```env
JWT_SECRET=tu_jwt_secret_aqui
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=30
SENDGRID_API_KEY=tu_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@delixmi.com
FRONTEND_URL=https://tu-frontend.com
```

### **Frontend:**
```env
REACT_APP_API_URL=https://delixmi-backend.onrender.com
REACT_APP_APP_SCHEME=delixmi
```

---

## 📱 Soporte Móvil

### **Deep Links:**
- **Esquema:** `delixmi://`
- **Verificación:** `delixmi://verify-email?token=...`
- **Reset Password:** `delixmi://reset-password?token=...`

### **Universal Links (iOS):**
- Configurar en `apple-app-site-association`
- Dominio: `https://delixmi-backend.onrender.com`

### **App Links (Android):**
- Configurar en `assetlinks.json`
- Dominio: `https://delixmi-backend.onrender.com`

---

## 🧪 Testing

### **Endpoints de Testing:**
```http
# Obtener token de verificación para testing
GET /api/auth/get-verification-token/:userId
Headers: x-test-key: test
```

### **Datos de Prueba:**
```json
{
  "name": "Test",
  "lastname": "User",
  "email": "test@example.com",
  "phone": "5555555555",
  "password": "Test123!"
}
```

---

## 📞 Soporte

Para cualquier duda o problema con la implementación, contactar al equipo de backend.

**Última actualización:** 17 de Octubre, 2025
**Versión:** 1.0.0

