# FASE 2: CONFIGURACIÓN GLOBAL Y GEOGRAFÍA - Documentación de Endpoints

## Resumen
Esta fase incluye 4 endpoints para la gestión de configuración global del sistema y áreas de servicio geográficas.

---

## 1. Actualizar Configuración Global

### Endpoint
```
PATCH /api/admin/settings/global
```

### Parámetros de Entrada
- **Body** (todos los campos son opcionales):
```json
{
  "defaultDeliveryRadius": 5.0,
  "globalCommissionRate": 15.5,
  "baseDeliveryFee": 25.0,
  "systemTerms": "Términos y condiciones actualizados...",
  "systemPrivacyPolicy": "Política de privacidad actualizada...",
  "minAppVersionCustomer": "1.2.0",
  "minAppVersionDriver": "1.1.5",
  "minAppVersionRestaurant": "1.0.8"
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Configuración global actualizada exitosamente",
  "data": {
    "config": {
      "id": 1,
      "defaultDeliveryRadius": 5.0,
      "globalCommissionRate": 15.5,
      "baseDeliveryFee": 25.0,
      "systemTerms": "Términos y condiciones actualizados...",
      "systemPrivacyPolicy": "Política de privacidad actualizada...",
      "minAppVersionCustomer": "1.2.0",
      "minAppVersionDriver": "1.1.5",
      "minAppVersionRestaurant": "1.0.8",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "updatedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos (valores fuera de rango, formato incorrecto)
- **500**: Error interno del servidor

---

## 2. Obtener Configuración Global

### Endpoint
```
GET /api/admin/settings/global
```

### Parámetros de Entrada
- **Query Params**: Ninguno

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Configuración global obtenida exitosamente",
  "data": {
    "config": {
      "id": 1,
      "defaultDeliveryRadius": 5.0,
      "globalCommissionRate": 15.5,
      "baseDeliveryFee": 25.0,
      "systemTerms": "Términos y condiciones del sistema...",
      "systemPrivacyPolicy": "Política de privacidad del sistema...",
      "minAppVersionCustomer": "1.2.0",
      "minAppVersionDriver": "1.1.5",
      "minAppVersionRestaurant": "1.0.8",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Códigos de Error Esperados
- **404**: Configuración global no encontrada
- **500**: Error interno del servidor

---

## 3. Crear Área de Servicio

### Endpoint
```
POST /api/admin/service-areas
```

### Parámetros de Entrada
- **Body**:
```json
{
  "name": "Zona Centro",
  "description": "Área de servicio del centro de la ciudad",
  "type": "CITY" | "NEIGHBORHOOD" | "CUSTOM_POLYGON",
  "centerLatitude": 19.4326,
  "centerLongitude": -99.1332,
  "radiusKm": 5.0,
  "polygonCoordinates": [
    {
      "lat": 19.4326,
      "lng": -99.1332
    },
    {
      "lat": 19.4426,
      "lng": -99.1432
    },
    {
      "lat": 19.4226,
      "lng": -99.1232
    }
  ]
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Área de servicio creada exitosamente",
  "data": {
    "serviceArea": {
      "id": 3,
      "name": "Zona Centro",
      "description": "Área de servicio del centro de la ciudad",
      "type": "CITY",
      "centerLatitude": 19.4326,
      "centerLongitude": -99.1332,
      "radiusKm": 5.0,
      "polygonCoordinates": [
        {
          "lat": 19.4326,
          "lng": -99.1332
        },
        {
          "lat": 19.4426,
          "lng": -99.1432
        },
        {
          "lat": 19.4226,
          "lng": -99.1232
        }
      ],
      "isActive": true,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "createdBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos (coordenadas fuera de rango, polígono inválido)
- **500**: Error interno del servidor

---

## 4. Actualizar Área de Servicio

### Endpoint
```
PATCH /api/admin/service-areas/:id
```

### Parámetros de Entrada
- **URL Param**: `id` (integer) - ID del área de servicio
- **Body** (todos los campos son opcionales):
```json
{
  "name": "Zona Centro Actualizada",
  "description": "Descripción actualizada del área",
  "centerLatitude": 19.4326,
  "centerLongitude": -99.1332,
  "radiusKm": 7.0,
  "polygonCoordinates": [
    {
      "lat": 19.4326,
      "lng": -99.1332
    },
    {
      "lat": 19.4426,
      "lng": -99.1432
    }
  ],
  "isActive": false
}
```

### Payload de Respuesta Exitosa
```json
{
  "status": "success",
  "message": "Área de servicio actualizada exitosamente",
  "data": {
    "serviceArea": {
      "id": 3,
      "name": "Zona Centro Actualizada",
      "description": "Descripción actualizada del área",
      "type": "CITY",
      "centerLatitude": 19.4326,
      "centerLongitude": -99.1332,
      "radiusKm": 7.0,
      "polygonCoordinates": [
        {
          "lat": 19.4326,
          "lng": -99.1332
        },
        {
          "lat": 19.4426,
          "lng": -99.1432
        }
      ],
      "isActive": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "updatedBy": {
      "userId": 1,
      "userName": "Admin Sistema",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Códigos de Error Esperados
- **400**: Datos de entrada inválidos
- **404**: Área de servicio no encontrada
- **500**: Error interno del servidor

---

## Notas Importantes para el Frontend

1. **Coordenadas Geográficas**: 
   - Latitud: -90 a 90
   - Longitud: -180 a 180
   - Formato decimal con hasta 6 decimales

2. **Polígonos**: 
   - Mínimo 3 puntos para formar un polígono válido
   - Array de objetos con `lat` y `lng`

3. **Tipos de Área**:
   - `CITY`: Área circular con radio
   - `NEIGHBORHOOD`: Área circular pequeña
   - `CUSTOM_POLYGON`: Área definida por polígono personalizado

4. **Versiones de App**: Formato semántico (ej: "1.2.0")

5. **Validaciones Especiales**:
   - Radio máximo: 100 km
   - Tasa de comisión: 0-100%
   - Tarifa base: 0-1000 pesos
