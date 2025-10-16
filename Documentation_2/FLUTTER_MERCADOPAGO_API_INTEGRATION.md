# 📱 FLUTTER - INTEGRACIÓN API MERCADO PAGO MARKETPLACE

## 🎯 OBJETIVO
Documentación completa de los endpoints de la API de Mercado Pago Marketplace para implementación en Flutter. Esta documentación contiene toda la información necesaria para que Cursor de Flutter pueda crear las vistas de configuración de Mercado Pago en el panel de administración del owner.

---

## 🔗 INFORMACIÓN GENERAL DE LA API

### **Base URL**
```
https://delixmi-backend.onrender.com/api
```

### **Autenticación**
- **Tipo:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer {token}`
- **Content-Type:** `application/json`

### **Roles Requeridos**
- `owner` - Dueño del restaurante
- `platform_manager` - Gestor de la plataforma

---

## 📋 ENDPOINTS DISPONIBLES

### 1. **GET** `/restaurant/{restaurantId}/mercadopago/config`
**Descripción:** Obtiene la configuración actual de Mercado Pago del restaurante

#### **Headers Requeridos:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

#### **Parámetros de Ruta:**
- `restaurantId` (integer, required): ID del restaurante

#### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Configuración de Mercado Pago obtenida exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "owner": {
        "id": 2,
        "name": "Ana García",
        "email": "ana@example.com"
      }
    },
    "mercadopago": {
      "sellerId": "TESTUSER5006169368936892371",
      "accessToken": "TEST-5006169368936892371-093001-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
      "publicKey": "TEST-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
      "connected": true,
      "connectedAt": "2025-01-13T10:30:00.000Z"
    }
  }
}
```

#### **Respuesta Sin Configuración (200):**
```json
{
  "success": true,
  "message": "Restaurante no tiene configuración de Mercado Pago",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "owner": {
        "id": 2,
        "name": "Ana García",
        "email": "ana@example.com"
      }
    },
    "mercadopago": null
  }
}
```

#### **Errores Posibles:**
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Usuario no tiene permisos para acceder al restaurante
- `404 Not Found`: Restaurante no encontrado

---

### 2. **GET** `/restaurant/{restaurantId}/mercadopago/status`
**Descripción:** Obtiene el estado de conexión y estadísticas de Mercado Pago del restaurante

#### **Headers Requeridos:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

#### **Parámetros de Ruta:**
- `restaurantId` (integer, required): ID del restaurante

#### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Estado de Mercado Pago obtenido exitosamente",
  "data": {
    "connection": {
      "isConnected": true,
      "connectedAt": "2025-01-13T10:30:00.000Z",
      "lastValidated": "2025-01-13T15:45:00.000Z"
    },
    "statistics": {
      "totalPayments": 45,
      "totalAmount": 1250.75,
      "platformCommissions": 125.08,
      "netAmount": 1125.67,
      "lastPaymentDate": "2025-01-13T14:20:00.000Z"
    },
    "commission": {
      "rate": 10.0,
      "description": "Comisión del 10% por transacción"
    }
  }
}
```

#### **Respuesta Sin Conexión (200):**
```json
{
  "success": true,
  "message": "Restaurante no tiene configuración de Mercado Pago",
  "data": {
    "connection": {
      "isConnected": false,
      "connectedAt": null,
      "lastValidated": null
    },
    "statistics": {
      "totalPayments": 0,
      "totalAmount": 0.00,
      "platformCommissions": 0.00,
      "netAmount": 0.00,
      "lastPaymentDate": null
    },
    "commission": {
      "rate": 10.0,
      "description": "Comisión del 10% por transacción"
    }
  }
}
```

#### **Errores Posibles:**
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Usuario no tiene permisos para acceder al restaurante
- `404 Not Found`: Restaurante no encontrado

---

### 3. **POST** `/restaurant/{restaurantId}/mercadopago/validate`
**Descripción:** Valida las credenciales de Mercado Pago sin guardarlas

#### **Headers Requeridos:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

#### **Parámetros de Ruta:**
- `restaurantId` (integer, required): ID del restaurante

#### **Body de la Petición:**
```json
{
  "sellerId": "TESTUSER5006169368936892371",
  "accessToken": "TEST-5006169368936892371-093001-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
  "publicKey": "TEST-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890"
}
```

#### **Validaciones del Body:**
- `sellerId`: Required, string, máximo 255 caracteres
- `accessToken`: Required, string, máximo 500 caracteres
- `publicKey`: Required, string, máximo 255 caracteres

#### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Credenciales validadas exitosamente",
  "data": {
    "isValid": true,
    "accountInfo": {
      "email": "test@example.com",
      "nickname": "TESTUSER5006169368936892371",
      "countryId": "AR",
      "userType": "normal"
    },
    "permissions": [
      "payments",
      "marketplace"
    ]
  }
}
```

#### **Respuesta de Validación Fallida (400):**
```json
{
  "success": false,
  "message": "Las credenciales proporcionadas no son válidas",
  "data": {
    "isValid": false,
    "errors": [
      {
        "field": "accessToken",
        "message": "El access token no es válido o ha expirado"
      }
    ]
  }
}
```

#### **Errores Posibles:**
- `400 Bad Request`: Datos de entrada inválidos
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Usuario no tiene permisos para acceder al restaurante
- `404 Not Found`: Restaurante no encontrado
- `422 Unprocessable Entity`: Credenciales inválidas

---

### 4. **POST** `/restaurant/{restaurantId}/mercadopago/connect`
**Descripción:** Conecta el restaurante con las credenciales de Mercado Pago

#### **Headers Requeridos:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

#### **Parámetros de Ruta:**
- `restaurantId` (integer, required): ID del restaurante

#### **Body de la Petición:**
```json
{
  "sellerId": "TESTUSER5006169368936892371",
  "accessToken": "TEST-5006169368936892371-093001-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
  "publicKey": "TEST-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890"
}
```

#### **Validaciones del Body:**
- `sellerId`: Required, string, máximo 255 caracteres
- `accessToken`: Required, string, máximo 500 caracteres
- `publicKey`: Required, string, máximo 255 caracteres

#### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Restaurante conectado exitosamente con Mercado Pago",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "mercadopagoConnected": true,
      "mercadopagoConnectedAt": "2025-01-13T16:00:00.000Z"
    },
    "connection": {
      "sellerId": "TESTUSER5006169368936892371",
      "publicKey": "TEST-abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
      "connectedAt": "2025-01-13T16:00:00.000Z"
    }
  }
}
```

#### **Respuesta de Error (400):**
```json
{
  "success": false,
  "message": "No se pudo conectar con Mercado Pago",
  "data": {
    "errors": [
      {
        "field": "accessToken",
        "message": "El access token no es válido"
      }
    ]
  }
}
```

#### **Errores Posibles:**
- `400 Bad Request`: Datos de entrada inválidos o credenciales incorrectas
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Usuario no tiene permisos para acceder al restaurante
- `404 Not Found`: Restaurante no encontrado
- `422 Unprocessable Entity`: Credenciales inválidas o restaurante ya conectado

---

### 5. **DELETE** `/restaurant/{restaurantId}/mercadopago/disconnect`
**Descripción:** Desconecta el restaurante de Mercado Pago

#### **Headers Requeridos:**
```json
{
  "Authorization": "Bearer {jwt_token}",
  "Content-Type": "application/json"
}
```

#### **Parámetros de Ruta:**
- `restaurantId` (integer, required): ID del restaurante

#### **Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Restaurante desconectado exitosamente de Mercado Pago",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "mercadopagoConnected": false,
      "mercadopagoConnectedAt": null
    },
    "disconnectedAt": "2025-01-13T16:30:00.000Z"
  }
}
```

#### **Respuesta Sin Conexión (400):**
```json
{
  "success": false,
  "message": "El restaurante no está conectado a Mercado Pago",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "mercadopagoConnected": false
    }
  }
}
```

#### **Errores Posibles:**
- `400 Bad Request`: Restaurante no está conectado
- `401 Unauthorized`: Token inválido o expirado
- `403 Forbidden`: Usuario no tiene permisos para acceder al restaurante
- `404 Not Found`: Restaurante no encontrado

---

## 🎨 ESTRUCTURA DE DATOS PARA FLUTTER

### **Modelo: MercadoPagoConfig**
```dart
class MercadoPagoConfig {
  final Restaurant restaurant;
  final MercadoPagoInfo? mercadopago;
}

class Restaurant {
  final int id;
  final String name;
  final OwnerInfo owner;
}

class OwnerInfo {
  final int id;
  final String name;
  final String email;
}

class MercadoPagoInfo {
  final String sellerId;
  final String accessToken;
  final String publicKey;
  final bool connected;
  final DateTime? connectedAt;
}
```

### **Modelo: MercadoPagoStatus**
```dart
class MercadoPagoStatus {
  final ConnectionInfo connection;
  final Statistics statistics;
  final CommissionInfo commission;
}

class ConnectionInfo {
  final bool isConnected;
  final DateTime? connectedAt;
  final DateTime? lastValidated;
}

class Statistics {
  final int totalPayments;
  final double totalAmount;
  final double platformCommissions;
  final double netAmount;
  final DateTime? lastPaymentDate;
}

class CommissionInfo {
  final double rate;
  final String description;
}
```

### **Modelo: Credentials**
```dart
class Credentials {
  final String sellerId;
  final String accessToken;
  final String publicKey;
}
```

### **Modelo: ValidationResult**
```dart
class ValidationResult {
  final bool isValid;
  final AccountInfo? accountInfo;
  final List<String>? permissions;
  final List<ValidationError>? errors;
}

class AccountInfo {
  final String email;
  final String nickname;
  final String countryId;
  final String userType;
}

class ValidationError {
  final String field;
  final String message;
}
```

---

## 🔧 CONSIDERACIONES TÉCNICAS

### **Manejo de Estados de Carga**
- Implementar loading states para cada operación
- Mostrar indicadores de progreso durante validación y conexión
- Manejar timeouts de red apropiadamente

### **Manejo de Errores**
- Capturar y mostrar errores de red (sin conexión, timeout)
- Mostrar errores de validación específicos del backend
- Implementar retry logic para operaciones fallidas

### **Seguridad**
- **NUNCA** mostrar el access token completo en la UI
- Mostrar solo los últimos 4 caracteres: `****901vwx234yz567890`
- Usar campos de tipo password para input del access token
- Limpiar datos sensibles de la memoria después de usar

### **Validaciones del Cliente**
- Validar formato básico de seller ID (debe empezar con "TESTUSER" en modo prueba)
- Validar longitud de access token (debe tener ~100 caracteres)
- Validar formato de public key (debe empezar con "TEST-" en modo prueba)

### **UX/UI Recomendaciones**
- Mostrar estado de conexión claramente (conectado/desconectado)
- Implementar confirmación antes de desconectar
- Mostrar estadísticas en formato de tarjetas
- Usar iconos consistentes con el tema de la app
- Implementar animaciones suaves para transiciones

---

## 📱 PANTALLAS A IMPLEMENTAR

### **1. Pantalla Principal de Configuración**
- **Ruta:** `/owner_payment_config`
- **Funcionalidades:**
  - Mostrar estado actual de conexión
  - Botón para conectar/desconectar
  - Enlace a estadísticas
  - Información básica de comisiones

### **2. Pantalla de Conexión**
- **Ruta:** `/owner_payment_config/connect`
- **Funcionalidades:**
  - Formulario con 3 campos (sellerId, accessToken, publicKey)
  - Botón de validar credenciales
  - Botón de conectar
  - Mostrar información de la cuenta validada

### **3. Pantalla de Estadísticas**
- **Ruta:** `/owner_payment_config/stats`
- **Funcionalidades:**
  - Mostrar estadísticas de pagos
  - Gráficos de tendencias (opcional)
  - Información de comisiones
  - Historial de pagos recientes

### **4. Dialog de Validación**
- **Tipo:** Modal/Dialog
- **Funcionalidades:**
  - Validar credenciales sin guardar
  - Mostrar información de la cuenta
  - Confirmar antes de conectar

---

## 🚀 INTEGRACIÓN CON DASHBOARD EXISTENTE

### **Agregar al Owner Dashboard**
- Nueva tarjeta en el grid principal
- Icono: `Icons.payment` o `Icons.account_balance_wallet`
- Título: "Configurar Pagos"
- Subtítulo: "Mercado Pago Marketplace"
- Color: Verde para indicar funcionalidad de pagos

### **Navegación**
- Usar el mismo patrón de navegación existente
- Mantener consistencia con otras secciones del dashboard
- Implementar breadcrumbs si es necesario

---

## ⚠️ NOTAS IMPORTANTES

1. **Modo Prueba:** Todas las credenciales de ejemplo son para modo sandbox de Mercado Pago
2. **Producción:** En producción, las credenciales empezarán con "APP_USR-" en lugar de "TEST-"
3. **Comisiones:** La comisión actual es del 10%, pero puede ser configurable por el backend
4. **Webhooks:** El sistema ya maneja webhooks automáticamente, no requiere configuración adicional
5. **Seguridad:** Los access tokens son sensibles, nunca loguearlos o mostrarlos completos

---

## 📞 SOPORTE

Para cualquier duda sobre la implementación de estos endpoints, consultar:
- Documentación de la API: `Documentation_2/MERCADOPAGO_RESTAURANT_API.md`
- Scripts de prueba: `scripts/test-mercadopago-endpoints.js`
- Tests unitarios: `tests/mercadopago-marketplace.service.test.js`
