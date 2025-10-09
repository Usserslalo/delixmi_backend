# 📍 Customer Flow - Validación de Cobertura de Entrega

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Endpoints Disponibles](#endpoints-disponibles)
4. [Flujos de Usuario](#flujos-de-usuario)
5. [Modelos de Datos](#modelos-de-datos)
6. [Ejemplos de Integración Flutter](#ejemplos-de-integración-flutter)
7. [Manejo de Errores](#manejo-de-errores)
8. [Casos de Uso](#casos-de-uso)

---

## 📖 Descripción General

El sistema de **Validación de Cobertura** permite verificar si una dirección de entrega del cliente está dentro del radio de alcance de las sucursales disponibles. Esto garantiza que:

- ✅ Los clientes solo vean restaurantes que pueden entregarles
- ✅ Se eviten pedidos fallidos por dirección fuera de cobertura
- ✅ Los repartidores no viajuen distancias excesivas
- ✅ Se optimice la experiencia de usuario

### **Componentes Clave**

1. **Servicio de Geolocalización**: Calcula distancias usando la fórmula de Haversine
2. **Validación en Checkout**: Verifica cobertura antes de procesar pagos
3. **Endpoint de Consulta**: Permite verificar cobertura de forma independiente
4. **Radio de Entrega por Sucursal**: Cada sucursal define su propio radio de cobertura en kilómetros

---

## 🏗️ Arquitectura del Sistema

### **Fórmula de Haversine**

El sistema utiliza la **fórmula de Haversine** para calcular la distancia real entre dos puntos geográficos en una esfera (la Tierra):

```
a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
c = 2 * atan2(√a, √(1−a))
distancia = R * c
```

Donde:
- `φ` = latitud
- `λ` = longitud
- `R` = radio de la Tierra (6371 km)

### **Validación de Cobertura**

```javascript
// Pseudocódigo del proceso
distancia_real = calcularDistancia(sucursal.coords, direccion_cliente.coords)
esta_cubierto = distancia_real <= sucursal.deliveryRadius

if (!esta_cubierto) {
  return ERROR_OUT_OF_COVERAGE
}
```

---

## 🔌 Endpoints Disponibles

### **1. Verificar Cobertura de Dirección**

**Endpoint:** `POST /api/customer/check-coverage`

**Autenticación:** Requerida (Token JWT)

**Roles Permitidos:** `customer`

**Descripción:** Verifica qué sucursales pueden entregar a una dirección específica del cliente.

#### **Request Body:**
```json
{
  "addressId": 1
}
```

#### **Response (200 OK):**
```json
{
  "status": "success",
  "message": "Validación de cobertura completada exitosamente",
  "data": {
    "address": {
      "id": 1,
      "alias": "Casa",
      "street": "Av. Felipe Ángeles",
      "exteriorNumber": "21",
      "interiorNumber": null,
      "neighborhood": "San Nicolás",
      "city": "Ixmiquilpan",
      "state": "Hidalgo",
      "zipCode": "42300",
      "coordinates": {
        "latitude": 20.488765,
        "longitude": -99.234567
      }
    },
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana",
        "description": "Las mejores pizzas artesanales",
        "logoUrl": "https://...",
        "coverPhotoUrl": "https://...",
        "category": "Pizzas",
        "rating": 4.5,
        "status": "active",
        "branches": [
          {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Av. Insurgentes 10, Centro",
            "phone": "7711234567",
            "latitude": 20.484123,
            "longitude": -99.216345,
            "deliveryRadius": 8.0,
            "deliveryFee": 20.00,
            "estimatedDeliveryMin": 25,
            "estimatedDeliveryMax": 35,
            "distance": 2.35,
            "isCovered": true,
            "coverageInfo": {
              "distanceText": "2.35 km",
              "deliveryRadiusText": "8.00 km",
              "status": "in_coverage",
              "message": "Esta sucursal puede entregar en tu dirección"
            }
          },
          {
            "id": 3,
            "name": "Sucursal El Fitzhi",
            "address": "Calle Morelos 45, El Fitzhi",
            "phone": "7719876543",
            "latitude": 20.492345,
            "longitude": -99.208765,
            "deliveryRadius": 5.0,
            "deliveryFee": 30.00,
            "estimatedDeliveryMin": 30,
            "estimatedDeliveryMax": 45,
            "distance": 6.72,
            "isCovered": false,
            "coverageInfo": {
              "distanceText": "6.72 km",
              "deliveryRadiusText": "5.00 km",
              "status": "out_of_coverage",
              "message": "Tu dirección está a 6.72 km, fuera del radio de entrega de 5.00 km"
            }
          }
        ]
      }
    ],
    "stats": {
      "totalRestaurants": 2,
      "totalBranches": 4,
      "coveredBranches": 3,
      "notCoveredBranches": 1,
      "coveragePercentage": "75.00"
    },
    "hasCoverage": true,
    "recommendedBranches": [
      {
        "id": 1,
        "name": "Sucursal Centro",
        "restaurantName": "Pizzería de Ana",
        "distance": 2.35,
        "deliveryFee": 20.00,
        "estimatedDeliveryTime": "25-35 min"
      }
    ],
    "validatedAt": "2025-01-09T15:30:00.000Z"
  }
}
```

#### **Errores Comunes:**

**400 Bad Request - addressId faltante:**
```json
{
  "status": "error",
  "message": "El ID de la dirección es requerido",
  "code": "ADDRESS_ID_REQUIRED"
}
```

**404 Not Found - Dirección no encontrada:**
```json
{
  "status": "error",
  "message": "Dirección no encontrada o no pertenece al usuario",
  "code": "ADDRESS_NOT_FOUND"
}
```

---

### **2. Validación Automática en Checkout**

**Validación integrada en:**
- `POST /api/checkout/create-preference` (Pago con tarjeta)
- `POST /api/checkout/cash-order` (Pago en efectivo)

Si la dirección está fuera del área de cobertura, el checkout falla con:

**409 Conflict:**
```json
{
  "status": "error",
  "message": "Lo sentimos, tu dirección está fuera del área de entrega de esta sucursal",
  "code": "OUT_OF_COVERAGE_AREA",
  "details": {
    "restaurant": "Pizzería de Ana",
    "branch": "Sucursal El Fitzhi",
    "address": "Av. Felipe Ángeles 21, San Nicolás, Ixmiquilpan",
    "deliveryRadius": "5.00 km",
    "suggestion": "Por favor, elige otra dirección o restaurante más cercano"
  }
}
```

---

## 🔄 Flujos de Usuario

### **Flujo 1: Verificación de Cobertura al Seleccionar Dirección**

```
1. Usuario selecciona/crea una dirección de entrega
   ↓
2. App llama a POST /api/customer/check-coverage
   ↓
3. Backend calcula distancias a todas las sucursales
   ↓
4. App recibe lista de restaurantes con sucursales disponibles
   ↓
5. App muestra SOLO restaurantes con cobertura (isCovered: true)
   ↓
6. Usuario selecciona restaurante y hace pedido
```

### **Flujo 2: Validación en Proceso de Checkout**

```
1. Usuario agrega productos al carrito
   ↓
2. Usuario selecciona dirección de entrega
   ↓
3. Usuario procede al checkout
   ↓
4. Backend valida cobertura automáticamente
   ↓
5a. Si está cubierto → Procesa el pago
5b. Si NO está cubierto → Rechaza con error 409
   ↓
6. App muestra mensaje de error y sugiere cambiar dirección
```

---

## 📊 Modelos de Datos

### **Branch (Sucursal)**
```typescript
interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: number;      // Decimal(10,8)
  longitude: number;     // Decimal(11,8)
  deliveryRadius: number; // Decimal(5,2) - En kilómetros
  deliveryFee: number;
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  status: 'active' | 'inactive' | 'suspended';
}
```

### **Address (Dirección)**
```typescript
interface Address {
  id: number;
  userId: number;
  alias: string;
  street: string;
  exteriorNumber: string;
  interiorNumber?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  references?: string;
  latitude: number;  // Decimal(10,8)
  longitude: number; // Decimal(11,8)
}
```

### **CoverageInfo (Información de Cobertura)**
```typescript
interface CoverageInfo {
  distanceText: string;        // "2.35 km"
  deliveryRadiusText: string;  // "8.00 km"
  status: 'in_coverage' | 'out_of_coverage';
  message: string;             // Mensaje descriptivo
}
```

---

## 💻 Ejemplos de Integración Flutter

### **1. Servicio de Cobertura**

```dart
// lib/services/coverage_service.dart
import 'package:dio/dio.dart';
import '../models/coverage_response.dart';

class CoverageService {
  final Dio _dio;
  
  CoverageService(this._dio);
  
  /// Verifica qué restaurantes pueden entregar a una dirección
  Future<CoverageResponse> checkAddressCoverage(int addressId) async {
    try {
      final response = await _dio.post(
        '/customer/check-coverage',
        data: {'addressId': addressId},
      );
      
      return CoverageResponse.fromJson(response.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Dirección no encontrada');
      } else if (e.response?.statusCode == 409) {
        throw Exception('Dirección fuera del área de cobertura');
      }
      rethrow;
    }
  }
}
```

### **2. Modelo de Respuesta**

```dart
// lib/models/coverage_response.dart
class CoverageResponse {
  final String status;
  final String message;
  final CoverageData data;
  
  CoverageResponse({
    required this.status,
    required this.message,
    required this.data,
  });
  
  factory CoverageResponse.fromJson(Map<String, dynamic> json) {
    return CoverageResponse(
      status: json['status'],
      message: json['message'],
      data: CoverageData.fromJson(json['data']),
    );
  }
}

class CoverageData {
  final Address address;
  final List<RestaurantWithCoverage> restaurants;
  final CoverageStats stats;
  final bool hasCoverage;
  final List<RecommendedBranch> recommendedBranches;
  
  CoverageData({
    required this.address,
    required this.restaurants,
    required this.stats,
    required this.hasCoverage,
    required this.recommendedBranches,
  });
  
  factory CoverageData.fromJson(Map<String, dynamic> json) {
    return CoverageData(
      address: Address.fromJson(json['address']),
      restaurants: (json['restaurants'] as List)
          .map((r) => RestaurantWithCoverage.fromJson(r))
          .toList(),
      stats: CoverageStats.fromJson(json['stats']),
      hasCoverage: json['hasCoverage'],
      recommendedBranches: (json['recommendedBranches'] as List)
          .map((b) => RecommendedBranch.fromJson(b))
          .toList(),
    );
  }
}

class RestaurantWithCoverage {
  final int id;
  final String name;
  final String? logoUrl;
  final double rating;
  final List<BranchWithCoverage> branches;
  
  // Propiedad computada: tiene al menos una sucursal con cobertura
  bool get hasCoveredBranch => 
      branches.any((branch) => branch.isCovered);
  
  RestaurantWithCoverage({
    required this.id,
    required this.name,
    this.logoUrl,
    required this.rating,
    required this.branches,
  });
  
  factory RestaurantWithCoverage.fromJson(Map<String, dynamic> json) {
    return RestaurantWithCoverage(
      id: json['id'],
      name: json['name'],
      logoUrl: json['logoUrl'],
      rating: (json['rating'] as num).toDouble(),
      branches: (json['branches'] as List)
          .map((b) => BranchWithCoverage.fromJson(b))
          .toList(),
    );
  }
}

class BranchWithCoverage {
  final int id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final double deliveryRadius;
  final double deliveryFee;
  final int estimatedDeliveryMin;
  final int estimatedDeliveryMax;
  final double distance;
  final bool isCovered;
  final CoverageInfo coverageInfo;
  
  BranchWithCoverage({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.deliveryRadius,
    required this.deliveryFee,
    required this.estimatedDeliveryMin,
    required this.estimatedDeliveryMax,
    required this.distance,
    required this.isCovered,
    required this.coverageInfo,
  });
  
  factory BranchWithCoverage.fromJson(Map<String, dynamic> json) {
    return BranchWithCoverage(
      id: json['id'],
      name: json['name'],
      address: json['address'],
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      deliveryRadius: (json['deliveryRadius'] as num).toDouble(),
      deliveryFee: (json['deliveryFee'] as num).toDouble(),
      estimatedDeliveryMin: json['estimatedDeliveryMin'],
      estimatedDeliveryMax: json['estimatedDeliveryMax'],
      distance: (json['distance'] as num).toDouble(),
      isCovered: json['isCovered'],
      coverageInfo: CoverageInfo.fromJson(json['coverageInfo']),
    );
  }
}

class CoverageInfo {
  final String distanceText;
  final String deliveryRadiusText;
  final String status;
  final String message;
  
  CoverageInfo({
    required this.distanceText,
    required this.deliveryRadiusText,
    required this.status,
    required this.message,
  });
  
  factory CoverageInfo.fromJson(Map<String, dynamic> json) {
    return CoverageInfo(
      distanceText: json['distanceText'],
      deliveryRadiusText: json['deliveryRadiusText'],
      status: json['status'],
      message: json['message'],
    );
  }
}
```

### **3. Provider/State Management**

```dart
// lib/providers/coverage_provider.dart
import 'package:flutter/foundation.dart';
import '../services/coverage_service.dart';
import '../models/coverage_response.dart';

class CoverageProvider with ChangeNotifier {
  final CoverageService _coverageService;
  
  CoverageProvider(this._coverageService);
  
  CoverageData? _coverageData;
  bool _isLoading = false;
  String? _error;
  
  CoverageData? get coverageData => _coverageData;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  /// Obtiene restaurantes disponibles para una dirección
  List<RestaurantWithCoverage> get availableRestaurants {
    if (_coverageData == null) return [];
    
    // Filtrar solo restaurantes con al menos una sucursal cubierta
    return _coverageData!.restaurants
        .where((r) => r.hasCoveredBranch)
        .toList();
  }
  
  /// Verifica cobertura para una dirección
  Future<void> checkCoverage(int addressId) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      final response = await _coverageService.checkAddressCoverage(addressId);
      _coverageData = response.data;
      _error = null;
    } catch (e) {
      _error = e.toString();
      _coverageData = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  /// Limpia los datos de cobertura
  void clearCoverage() {
    _coverageData = null;
    _error = null;
    notifyListeners();
  }
}
```

### **4. Widget de Pantalla**

```dart
// lib/screens/address_coverage_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/coverage_provider.dart';
import '../models/address.dart';

class AddressCoverageScreen extends StatefulWidget {
  final Address selectedAddress;
  
  const AddressCoverageScreen({
    Key? key,
    required this.selectedAddress,
  }) : super(key: key);
  
  @override
  State<AddressCoverageScreen> createState() => _AddressCoverageScreenState();
}

class _AddressCoverageScreenState extends State<AddressCoverageScreen> {
  @override
  void initState() {
    super.initState();
    // Verificar cobertura al cargar la pantalla
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<CoverageProvider>().checkCoverage(widget.selectedAddress.id);
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurantes Disponibles'),
      ),
      body: Consumer<CoverageProvider>(
        builder: (context, coverageProvider, child) {
          if (coverageProvider.isLoading) {
            return const Center(
              child: CircularProgressIndicator(),
            );
          }
          
          if (coverageProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 64,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Error al verificar cobertura',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      coverageProvider.error!,
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      coverageProvider.checkCoverage(widget.selectedAddress.id);
                    },
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          
          final availableRestaurants = coverageProvider.availableRestaurants;
          
          if (availableRestaurants.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.location_off,
                    size: 64,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Sin cobertura en tu zona',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Lo sentimos, no hay restaurantes disponibles para tu dirección actual. Prueba con otra dirección.',
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: const Text('Cambiar Dirección'),
                  ),
                ],
              ),
            );
          }
          
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Información de la dirección
              Card(
                child: ListTile(
                  leading: const Icon(Icons.location_on),
                  title: Text(widget.selectedAddress.alias),
                  subtitle: Text(
                    '${widget.selectedAddress.street} ${widget.selectedAddress.exteriorNumber}, ${widget.selectedAddress.neighborhood}',
                  ),
                ),
              ),
              const SizedBox(height: 8),
              
              // Estadísticas
              Card(
                color: Colors.green.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildStatItem(
                        context,
                        Icons.restaurant,
                        '${availableRestaurants.length}',
                        'Restaurantes',
                      ),
                      _buildStatItem(
                        context,
                        Icons.store,
                        '${coverageProvider.coverageData!.stats.coveredBranches}',
                        'Sucursales',
                      ),
                      _buildStatItem(
                        context,
                        Icons.check_circle,
                        '${coverageProvider.coverageData!.stats.coveragePercentage}%',
                        'Cobertura',
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              
              // Lista de restaurantes
              Text(
                'Restaurantes Disponibles',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              
              ...availableRestaurants.map((restaurant) {
                final coveredBranches = restaurant.branches
                    .where((b) => b.isCovered)
                    .toList();
                
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ExpansionTile(
                    leading: CircleAvatar(
                      backgroundImage: restaurant.logoUrl != null
                          ? NetworkImage(restaurant.logoUrl!)
                          : null,
                      child: restaurant.logoUrl == null
                          ? const Icon(Icons.restaurant)
                          : null,
                    ),
                    title: Text(restaurant.name),
                    subtitle: Text(
                      '${coveredBranches.length} ${coveredBranches.length == 1 ? 'sucursal' : 'sucursales'} disponible(s)',
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star, color: Colors.amber, size: 16),
                        const SizedBox(width: 4),
                        Text(restaurant.rating.toStringAsFixed(1)),
                      ],
                    ),
                    children: coveredBranches.map((branch) {
                      return ListTile(
                        dense: true,
                        leading: const Icon(Icons.location_on, size: 20),
                        title: Text(branch.name),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'A ${branch.distance.toStringAsFixed(2)} km de distancia',
                              style: const TextStyle(fontSize: 12),
                            ),
                            Text(
                              'Entrega: \$${branch.deliveryFee.toStringAsFixed(2)} • ${branch.estimatedDeliveryMin}-${branch.estimatedDeliveryMax} min',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                        trailing: ElevatedButton(
                          onPressed: () {
                            // Navegar al menú del restaurante
                            Navigator.pushNamed(
                              context,
                              '/restaurant-menu',
                              arguments: {
                                'restaurantId': restaurant.id,
                                'branchId': branch.id,
                              },
                            );
                          },
                          child: const Text('Ver Menú'),
                        ),
                      );
                    }).toList(),
                  ),
                );
              }).toList(),
            ],
          );
        },
      ),
    );
  }
  
  Widget _buildStatItem(
    BuildContext context,
    IconData icon,
    String value,
    String label,
  ) {
    return Column(
      children: [
        Icon(icon, color: Colors.green),
        const SizedBox(height: 4),
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
            color: Colors.green,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}
```

---

## ⚠️ Manejo de Errores

### **Errores Comunes y Soluciones**

| Código de Error | Descripción | Solución Flutter |
|-----------------|-------------|------------------|
| `ADDRESS_ID_REQUIRED` | No se proporcionó addressId | Validar que el campo existe antes de enviar |
| `ADDRESS_NOT_FOUND` | Dirección no encontrada | Refrescar lista de direcciones del usuario |
| `OUT_OF_COVERAGE_AREA` | Dirección fuera de cobertura (checkout) | Mostrar diálogo sugiriendo cambiar dirección |
| `401 Unauthorized` | Token JWT inválido/expirado | Redirigir a login |
| `500 Internal Server Error` | Error en el servidor | Mostrar mensaje genérico y botón de reintentar |

### **Ejemplo de Manejo en Flutter:**

```dart
Future<void> _handleCoverageCheck(int addressId) async {
  try {
    await coverageProvider.checkCoverage(addressId);
    
    if (!coverageProvider.coverageData!.hasCoverage) {
      // No hay cobertura
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Sin cobertura'),
          content: const Text(
            'No hay restaurantes disponibles en tu zona. '
            '¿Deseas seleccionar otra dirección?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/addresses');
              },
              child: const Text('Cambiar Dirección'),
            ),
          ],
        ),
      );
    }
  } on DioException catch (e) {
    if (e.response?.statusCode == 404) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Dirección no encontrada'),
          backgroundColor: Colors.red,
        ),
      );
    } else if (e.response?.statusCode == 401) {
      // Redirigir a login
      Navigator.pushNamedAndRemoveUntil(
        context,
        '/login',
        (route) => false,
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.message}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
```

---

## 🎯 Casos de Uso

### **Caso 1: Cliente Selecciona Dirección y Ve Restaurantes**

**Flujo:**
1. Cliente entra a la app
2. Selecciona una dirección guardada (o crea una nueva)
3. App llama a `POST /api/customer/check-coverage`
4. App filtra y muestra SOLO restaurantes con `isCovered: true`
5. Cliente selecciona restaurante y hace pedido

**Implementación Flutter:**
```dart
void _onAddressSelected(Address address) async {
  setState(() => _isLoading = true);
  
  try {
    await _coverageProvider.checkCoverage(address.id);
    
    if (_coverageProvider.availableRestaurants.isNotEmpty) {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => RestaurantsListScreen(
            address: address,
            restaurants: _coverageProvider.availableRestaurants,
          ),
        ),
      );
    } else {
      _showNoCoverageDialog();
    }
  } catch (e) {
    _showErrorSnackbar(e.toString());
  } finally {
    setState(() => _isLoading = false);
  }
}
```

### **Caso 2: Cliente Intenta Pagar con Dirección Fuera de Cobertura**

**Flujo:**
1. Cliente agrega productos al carrito
2. Cliente selecciona dirección fuera de cobertura
3. Cliente procede al checkout
4. Backend rechaza con `409 Conflict`
5. App muestra error y sugiere cambiar dirección

**Implementación Flutter:**
```dart
Future<void> _processCheckout() async {
  try {
    await _checkoutService.createPreference(
      addressId: selectedAddress.id,
      items: cartItems,
    );
    
    // Navegar a MercadoPago...
  } on DioException catch (e) {
    if (e.response?.statusCode == 409 &&
        e.response?.data['code'] == 'OUT_OF_COVERAGE_AREA') {
      
      final details = e.response?.data['details'];
      
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Fuera del área de entrega'),
          content: Text(
            '${details['message']}\n\n'
            'Restaurante: ${details['restaurant']}\n'
            'Radio de entrega: ${details['deliveryRadius']}\n\n'
            '${details['suggestion']}',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cerrar'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.pushNamed(context, '/addresses');
              },
              child: const Text('Cambiar Dirección'),
            ),
          ],
        ),
      );
    }
  }
}
```

### **Caso 3: Mostrar Distancia y Radio en UI**

**Widget de Sucursal:**
```dart
Widget _buildBranchCard(BranchWithCoverage branch) {
  return Card(
    child: ListTile(
      leading: Icon(
        branch.isCovered ? Icons.check_circle : Icons.cancel,
        color: branch.isCovered ? Colors.green : Colors.red,
      ),
      title: Text(branch.name),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Distancia: ${branch.coverageInfo.distanceText}'),
          Text('Radio de entrega: ${branch.coverageInfo.deliveryRadiusText}'),
          Text(
            branch.coverageInfo.message,
            style: TextStyle(
              color: branch.isCovered ? Colors.green : Colors.red,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    ),
  );
}
```

---

## 📝 Notas Importantes

1. **Caching:** Considera guardar en caché los resultados de cobertura para evitar llamadas repetidas

2. **Actualización de Ubicación:** Si el usuario mueve el mapa para ajustar la ubicación de la dirección, volver a validar cobertura

3. **Radio de Entrega:** Cada sucursal puede tener un radio diferente:
   - Sucursales céntricas: 5-8 km
   - Sucursales periféricas: 10+ km
   - Sucursales con repartidores propios: 3-5 km

4. **UX Recomendada:**
   - Mostrar indicador visual de cobertura en la lista de restaurantes
   - Ordenar restaurantes por distancia (más cercanos primero)
   - Permitir filtrar por "Solo con cobertura"
   - Mostrar en mapa las zonas de cobertura

---

## 🚀 Próximos Pasos

Para mejorar el sistema de cobertura:

1. **Mapa Interactivo:** Mostrar círculos de cobertura en Google Maps
2. **Notificaciones:** Alertar cuando nuevos restaurantes cubran la zona del cliente
3. **Sugerencias Inteligentes:** Sugerir direcciones cercanas con mejor cobertura
4. **Análisis de Datos:** Dashboard para owners mostrando áreas sin cobertura

---

**Fecha de Actualización:** 9 de Enero, 2025
**Versión del API:** 1.0
**Autor:** Equipo Backend Delixmi

