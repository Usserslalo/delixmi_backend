# API de Geocodificación Inversa - Delixmi Backend

## 📍 Descripción
Este endpoint permite convertir coordenadas geográficas (latitud y longitud) en componentes estructurados de una dirección utilizando Google Maps Geocoding API.

## 🔐 Autenticación y Autorización
- **Autenticación**: Requiere token JWT válido
- **Rol requerido**: `customer`

---

## 📡 Endpoint

### **POST /api/geocoding/reverse**

Convierte coordenadas (lat, lng) en componentes de dirección estructurados.

---

## 📥 Request

### Headers
```json
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

### Body (JSON)
```json
{
  "latitude": 20.488765,
  "longitude": -99.234567
}
```

### Validaciones
- **latitude**: 
  - Requerido
  - Tipo: Float
  - Rango: -90 a 90
  
- **longitude**: 
  - Requerido
  - Tipo: Float
  - Rango: -180 a 180

---

## 📤 Response

### Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Geocodificación inversa realizada exitosamente",
  "data": {
    "address": {
      "street": "Av. Felipe Ángeles",
      "exterior_number": "21",
      "neighborhood": "San Nicolás",
      "city": "Ixmiquilpan",
      "state": "Hidalgo",
      "state_short": "Hgo.",
      "zip_code": "42300",
      "country": "México",
      "country_code": "MX",
      "formatted_address": "Av. Felipe Ángeles 21, San Nicolás, 42300 Ixmiquilpan, Hgo., México",
      "coordinates": {
        "latitude": 20.488765,
        "longitude": -99.234567
      },
      "place_id": "ChIJXXXXXXXXXXXXXXXXXXXXXX",
      "location_type": "ROOFTOP"
    },
    "rawResult": {
      "formatted_address": "Av. Felipe Ángeles 21, San Nicolás, 42300 Ixmiquilpan, Hgo., México",
      "place_id": "ChIJXXXXXXXXXXXXXXXXXXXXXX",
      "types": ["street_address"]
    },
    "metadata": {
      "hasMinimumData": true,
      "requestedAt": "2024-01-01T12:00:00.000Z",
      "provider": "Google Maps Geocoding API"
    }
  }
}
```

---

## ❌ Respuestas de Error

### Error 400 - Validación de Datos
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "type": "field",
      "value": "95",
      "msg": "La latitud debe ser un número decimal entre -90 y 90",
      "path": "latitude",
      "location": "body"
    }
  ]
}
```

### Error 401 - No Autenticado
```json
{
  "status": "error",
  "message": "Token no proporcionado",
  "code": "NO_TOKEN"
}
```

### Error 403 - Rol Insuficiente
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requiere rol de cliente",
  "code": "INSUFFICIENT_PERMISSIONS",
  "required": ["customer"],
  "current": ["admin"]
}
```

### Error 404 - Sin Resultados
```json
{
  "status": "error",
  "message": "No se encontró ninguna dirección para las coordenadas proporcionadas",
  "code": "NO_RESULTS_FOUND",
  "data": {
    "latitude": 0.0,
    "longitude": 0.0
  }
}
```

### Error 503 - Servicio No Disponible
```json
{
  "status": "error",
  "message": "Servicio de geocodificación no disponible. Por favor, contacte al administrador.",
  "code": "SERVICE_UNAVAILABLE",
  "data": null
}
```

### Error 500 - Error Interno
```json
{
  "status": "error",
  "message": "Error interno del servidor al procesar la geocodificación",
  "code": "INTERNAL_ERROR",
  "data": null
}
```

---

## 🔧 Configuración Requerida

### Variables de Entorno
Asegúrate de tener configurada la siguiente variable en tu archivo `.env`:

```bash
MAPS_API_KEY=tu_google_maps_api_key_aqui
```

**Nota**: Sin esta configuración, el endpoint devolverá un error 503.

---

## 🌍 Ejemplo de Uso con cURL

```bash
curl -X POST http://localhost:4000/api/geocoding/reverse \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 20.488765,
    "longitude": -99.234567
  }'
```

---

## 📱 Ejemplo de Uso desde Flutter

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> reverseGeocode(double lat, double lng) async {
  final url = Uri.parse('http://localhost:4000/api/geocoding/reverse');
  final token = 'tu_jwt_token_aqui';
  
  try {
    final response = await http.post(
      url,
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'latitude': lat,
        'longitude': lng,
      }),
    );
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data']['address'];
    } else {
      throw Exception('Error: ${response.body}');
    }
  } catch (e) {
    print('Error en geocodificación: $e');
    rethrow;
  }
}

// Uso:
void main() async {
  final address = await reverseGeocode(20.488765, -99.234567);
  print('Calle: ${address['street']}');
  print('Ciudad: ${address['city']}');
  print('Estado: ${address['state']}');
  print('CP: ${address['zip_code']}');
}
```

---

## 🧪 Ejemplo de Uso desde Postman

1. **Método**: POST
2. **URL**: `http://localhost:4000/api/geocoding/reverse`
3. **Headers**:
   - `Authorization`: `Bearer <tu_token_jwt>`
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):
```json
{
  "latitude": 20.488765,
  "longitude": -99.234567
}
```

---

## 🔍 Campos de la Respuesta

| Campo | Tipo | Descripción | Nullable |
|-------|------|-------------|----------|
| `street` | String | Nombre de la calle/avenida | Sí |
| `exterior_number` | String | Número exterior del domicilio | Sí |
| `neighborhood` | String | Colonia o barrio | Sí |
| `city` | String | Ciudad o localidad | Sí |
| `state` | String | Estado o provincia (nombre completo) | Sí |
| `state_short` | String | Estado o provincia (abreviado) | Sí |
| `zip_code` | String | Código postal | Sí |
| `country` | String | País (nombre completo) | Sí |
| `country_code` | String | Código de país ISO (ej: MX, US) | Sí |
| `formatted_address` | String | Dirección formateada completa | No |
| `coordinates` | Object | Objeto con latitude y longitude | No |
| `place_id` | String | ID único de Google Maps | No |
| `location_type` | String | Tipo de precisión de la ubicación | No |

---

## 📊 Tipos de Precisión (location_type)

- **ROOFTOP**: Máxima precisión, ubicación exacta
- **RANGE_INTERPOLATED**: Aproximación entre dos puntos
- **GEOMETRIC_CENTER**: Centro geométrico (ej: calle)
- **APPROXIMATE**: Aproximación general (ej: ciudad)

---

## ⚠️ Notas Importantes

1. **Campos Opcionales**: Algunos campos pueden ser `null` si Google Maps no los proporciona para las coordenadas especificadas.

2. **Validación Mínima**: El campo `metadata.hasMinimumData` indica si al menos `city` y `state` están disponibles.

3. **Rate Limits**: Google Maps API tiene límites de uso. Considera implementar caché si planeas hacer muchas consultas.

4. **Seguridad**: El endpoint solo está disponible para usuarios autenticados con rol `customer`.

5. **Timeout**: Las peticiones a Google Maps tienen un timeout de 10 segundos.

6. **No Modifica CRUD**: Este endpoint **NO** crea direcciones automáticamente. Es solo un servicio de consulta para facilitar la entrada de datos al usuario.

---

## 🔄 Integración con el CRUD de Direcciones

El flujo recomendado es:

1. **Usuario selecciona ubicación en el mapa** → Obtiene lat/lng
2. **Frontend llama a** `POST /api/geocoding/reverse` → Obtiene componentes de dirección
3. **Frontend pre-llena el formulario** → Con los datos obtenidos
4. **Usuario revisa/ajusta** → Puede modificar manualmente
5. **Frontend llama a** `POST /api/customer/addresses` → Crea la dirección definitiva

---

## 🐛 Troubleshooting

### Error 503: "Servicio no disponible"
**Causa**: La variable `MAPS_API_KEY` no está configurada en `.env`
**Solución**: Añade tu API Key de Google Maps al archivo `.env`

### Sin resultados para coordenadas válidas
**Causa**: Las coordenadas apuntan a una zona sin datos de Google Maps (ej: océano)
**Solución**: Verifica que las coordenadas correspondan a una ubicación con direcciones

### Error 400: Coordenadas inválidas
**Causa**: Latitud o longitud fuera de rango
**Solución**: Verifica que lat esté entre -90 y 90, y lng entre -180 y 180

---

## 📚 Referencias

- [Google Maps Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding)
- [Address Component Types](https://developers.google.com/maps/documentation/geocoding/overview#Types)

---

**Versión**: 1.0.0  
**Última actualización**: 2024-01-13  
**Autor**: Delixmi Backend Team

