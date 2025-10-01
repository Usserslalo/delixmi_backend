# 🛒 API de Checkout - Mercado Pago Integration

Este documento describe la implementación completa del sistema de checkout con Mercado Pago Checkout Pro para Delixmi.

## 📋 Endpoints Disponibles

### 1. Crear Preferencia de Pago
**POST** `/api/checkout/create-preference`

Crea una preferencia de pago en Mercado Pago y retorna la URL de pago.

#### Headers Requeridos
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

#### Body de la Request
```json
{
  "addressId": 1,
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ]
}
```

#### Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Preferencia de pago creada exitosamente",
  "data": {
    "init_point": "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=...",
    "preference_id": "123456789-abc-def-ghi",
    "external_reference": "delixmi_uuid-unico",
    "total": 125.50,
    "subtotal": 100.00,
    "delivery_fee": 25.00,
    "service_fee": 0.50,
    "delivery_details": {
      "distance": 2.5,
      "duration": 8.5,
      "distanceText": "2.5 km",
      "durationText": "8 min",
      "calculation": {
        "tarifaBase": 15.00,
        "costoPorKm": 5.00,
        "distancia": 2.5,
        "tarifaCalculada": 27.50,
        "tarifaFinal": 27.50,
        "tarifaMinima": 20.00,
        "ahorro": 0
      },
      "isDefault": false
    }
  }
}
```

#### Errores Posibles
- **400**: Datos inválidos o productos no disponibles
- **401**: Token de autenticación inválido
- **404**: Dirección no encontrada
- **500**: Error interno del servidor

### 2. Obtener Estado del Pago
**GET** `/api/checkout/payment-status/:paymentId`

Obtiene el estado actual de un pago específico.

#### Headers Requeridos
```
Authorization: Bearer <jwt_token>
```

#### Parámetros de URL
- `paymentId`: El external_reference del pago (string)

#### Respuesta Exitosa (200)
```json
{
  "status": "success",
  "data": {
    "payment": {
      "id": 1,
      "amount": 125.50,
      "currency": "MXN",
      "status": "completed",
      "provider": "mercadopago",
      "providerPaymentId": "delixmi_uuid-unico",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:35:00.000Z"
    },
    "order": {
      "id": 1,
      "status": "confirmed",
      "subtotal": 100.00,
      "deliveryFee": 25.00,
      "total": 125.50,
      "orderPlacedAt": "2024-01-15T10:30:00.000Z",
      "items": [
        {
          "productName": "Hamburguesa Clásica",
          "quantity": 2,
          "pricePerUnit": 50.00,
          "restaurant": "Burger Palace"
        }
      ],
      "address": {
        "alias": "Casa",
        "street": "Av. Principal 123",
        "neighborhood": "Centro",
        "city": "Ciudad de México"
      }
    }
  }
}
```

## 🔧 Características Técnicas

### Seguridad
- ✅ **Validación de precios**: Los precios se obtienen directamente de la base de datos, no del cliente
- ✅ **Verificación de productos**: Solo productos disponibles pueden ser agregados al carrito
- ✅ **Autenticación JWT**: Todas las rutas están protegidas con middleware de autenticación
- ✅ **Validación de direcciones**: Se verifica que la dirección pertenezca al usuario autenticado

### Cálculos Automáticos
- **Subtotal**: Suma de (precio × cantidad) de todos los productos
- **Delivery Fee**: Calculado dinámicamente basado en distancia real usando Google Maps API
  - Tarifa base: $15.00 MXN
  - Costo por km: $5.00 MXN
  - Tarifa mínima: $20.00 MXN
  - Fórmula: `max(15.00 + (distancia_km × 5.00), 20.00)`
- **Service Fee**: 5% del subtotal
- **Total**: Subtotal + Delivery Fee + Service Fee

### Configuración de Mercado Pago
- **Moneda**: MXN (Peso Mexicano)
- **Métodos de pago**: Todos los disponibles en México
- **Cuotas**: Hasta 12 meses sin interés
- **Auto return**: Redirección automática al aprobar el pago

### URLs de Redirección
- **Success**: `${FRONTEND_URL}/checkout/success`
- **Failure**: `${FRONTEND_URL}/checkout/failure`
- **Pending**: `${FRONTEND_URL}/checkout/pending`
- **Notification**: `${FRONTEND_URL}/api/webhooks/mercadopago`

## 📊 Estados de Pago

| Estado | Descripción |
|--------|-------------|
| `pending` | Pago iniciado, esperando confirmación |
| `processing` | Pago en proceso |
| `completed` | Pago aprobado y completado |
| `failed` | Pago falló |
| `cancelled` | Pago cancelado |
| `refunded` | Pago reembolsado |

## 🚀 Uso en el Frontend

### 1. Crear Preferencia
```javascript
const createPayment = async (cartItems, addressId) => {
  try {
    const response = await fetch('/api/checkout/create-preference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        addressId: addressId,
        items: cartItems
      })
    });

    const data = await response.json();
    
    if (data.status === 'success') {
      // Redirigir al usuario a Mercado Pago
      window.location.href = data.data.init_point;
    }
  } catch (error) {
    console.error('Error creando preferencia:', error);
  }
};
```

### 2. Verificar Estado del Pago
```javascript
const checkPaymentStatus = async (paymentId) => {
  try {
    const response = await fetch(`/api/checkout/payment-status/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    if (data.status === 'success') {
      console.log('Estado del pago:', data.data.payment.status);
    }
  } catch (error) {
    console.error('Error verificando pago:', error);
  }
};
```

## 🔗 Variables de Entorno Requeridas

```env
# Credenciales de Mercado Pago
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx

# Google Maps API
MAPS_API_KEY=your-google-maps-api-key

# URLs del Frontend
FRONTEND_URL=http://localhost:3000

# Base de datos
DATABASE_URL=mysql://user:password@localhost:3306/delixmi

# JWT
JWT_SECRET=your-secret-key
```

## 📝 Notas Importantes

1. **Webhooks**: La URL de notificación está configurada pero necesita implementación del endpoint webhook
2. **Branch ID**: Actualmente hardcodeado como 1, debería venir del request en futuras versiones
3. **Comisión**: Configurada en 10% por defecto, debería ser dinámica por restaurante
4. **Delivery Fee**: ✅ Calculado dinámicamente usando Google Maps API basado en distancia real
5. **Service Fee**: 5% del subtotal, debería ser configurable
6. **Google Maps**: Requiere API key válida para calcular distancias. En caso de error, usa tarifa por defecto de $25.00

## 🧪 Testing

Para probar la integración:

1. **Crear usuario y dirección** usando los endpoints de auth
2. **Obtener productos disponibles** de un restaurante
3. **Crear preferencia** con productos válidos
4. **Usar tarjetas de prueba** de Mercado Pago para simular pagos

### Tarjetas de Prueba Mercado Pago
- **Aprobada**: 4509 9535 6623 3704
- **Rechazada**: 4000 0000 0000 0002
- **Pendiente**: 4000 0000 0000 0010
