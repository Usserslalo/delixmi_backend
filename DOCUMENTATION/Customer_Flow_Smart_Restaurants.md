# 🍽️ Customer Flow - Exploración Inteligente de Restaurantes

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Sistema Geo-Inteligente](#sistema-geo-inteligente)
3. [Endpoints Disponibles](#endpoints-disponibles)
4. [Modelos de Datos](#modelos-de-datos)
5. [Ejemplos de Integración Flutter](#ejemplos-de-integración-flutter)
6. [Casos de Uso](#casos-de-uso)
7. [Manejo de Errores](#manejo-de-errores)

---

## 📖 Descripción General

El sistema de **Exploración Inteligente de Restaurantes** permite a los clientes descubrir restaurantes cercanos ordenados por proximidad. El sistema calcula automáticamente las distancias desde la ubicación del usuario hasta cada sucursal usando la **fórmula de Haversine**.

### **Características Principales**

✅ **Ordenamiento Inteligente por Proximidad** - Los restaurantes se ordenan por su sucursal más cercana  
✅ **Cálculo de Distancias en Tiempo Real** - Distancia en km a cada sucursal  
✅ **Detección de Horarios** - Indica si el restaurante está abierto o cerrado  
✅ **Paginación Eficiente** - Soporte para grandes catálogos  
✅ **Filtros Múltiples** - Por categoría, búsqueda de texto y más  
✅ **Modo Offline** - Funciona sin coordenadas (sin ordenamiento)

---

## 🗺️ Sistema Geo-Inteligente

### **¿Cómo Funciona?**

1. **Cliente envía su ubicación** (lat/lng como query params)
2. **Backend calcula distancias** usando fórmula de Haversine
3. **Agrega campo `distance`** a cada sucursal (en km)
4. **Calcula distancia mínima** por restaurante (sucursal más cercana)
5. **Ordena resultados** por proximidad (más cercanos primero)

### **Fórmula de Haversine**

El sistema reutiliza el servicio de geolocalización existente:

```javascript
// Servicio: src/services/geolocation.service.js
const distance = calculateDistance(
  { lat: userLat, lng: userLng },
  { lat: branchLat, lng: branchLng }
);
// Retorna distancia en kilómetros
```

---

## 🔌 Endpoints Disponibles

### **1. Listar Restaurantes con Ordenamiento Inteligente**

**Endpoint:** `GET /api/restaurants`

**Autenticación:** No requerida

**Descripción:** Obtiene la lista de restaurantes activos. Si se proporcionan coordenadas, ordena por proximidad.

#### **Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `page` | Integer | No | Número de página (default: 1) |
| `pageSize` | Integer | No | Tamaño de página (default: 10, max: 100) |
| `category` | String | No | Filtrar por categoría de restaurante |
| `search` | String | No | Búsqueda de texto en nombre/descripción |
| `lat` | Float | No* | Latitud del usuario (-90 a 90) |
| `lng` | Float | No* | Longitud del usuario (-180 a 180) |

**\*Nota:** Si se proporciona `lat`, también se debe proporcionar `lng` (y viceversa)

#### **Ejemplos de Request:**

**Sin coordenadas (sin ordenamiento):**
```http
GET http://localhost:3000/api/restaurants?page=1&pageSize=10
```

**Con coordenadas (ordenado por proximidad):**
```http
GET http://localhost:3000/api/restaurants?page=1&pageSize=10&lat=20.488765&lng=-99.234567
```

**Con filtros y coordenadas:**
```http
GET http://localhost:3000/api/restaurants?category=Pizzas&search=Ana&lat=20.488765&lng=-99.234567
```

#### **Response (200 OK) - Sin Coordenadas:**
```json
{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana",
        "description": "Las mejores pizzas artesanales",
        "category": "Pizzas",
        "logoUrl": "https://...",
        "coverPhotoUrl": "https://...",
        "rating": 4.5,
        "isOpen": true,
        "minDistance": null,
        "branches": [
          {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Av. Insurgentes 10, Centro",
            "latitude": 20.484123,
            "longitude": -99.216345,
            "phone": "7711234567",
            "usesPlatformDrivers": true,
            "deliveryFee": 20.00,
            "estimatedDeliveryMin": 25,
            "estimatedDeliveryMax": 35,
            "deliveryRadius": 8.0,
            "isOpen": true,
            "distance": null,
            "schedule": [
              {
                "dayOfWeek": 0,
                "openingTime": "00:00:00",
                "closingTime": "23:59:59",
                "isClosed": false
              }
            ]
          }
        ]
      }
    ],
    "pagination": {
      "totalRestaurants": 2,
      "currentPage": 1,
      "pageSize": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "geolocation": null
  }
}
```

#### **Response (200 OK) - Con Coordenadas (Ordenado por Proximidad):**
```json
{
  "status": "success",
  "data": {
    "restaurants": [
      {
        "id": 1,
        "name": "Pizzería de Ana",
        "description": "Las mejores pizzas artesanales",
        "category": "Pizzas",
        "logoUrl": "https://...",
        "coverPhotoUrl": "https://...",
        "rating": 4.5,
        "isOpen": true,
        "minDistance": 2.35,
        "branches": [
          {
            "id": 1,
            "name": "Sucursal Centro",
            "address": "Av. Insurgentes 10, Centro",
            "latitude": 20.484123,
            "longitude": -99.216345,
            "phone": "7711234567",
            "usesPlatformDrivers": true,
            "deliveryFee": 20.00,
            "estimatedDeliveryMin": 25,
            "estimatedDeliveryMax": 35,
            "deliveryRadius": 8.0,
            "isOpen": true,
            "distance": 2.35,
            "schedule": [...]
          },
          {
            "id": 2,
            "name": "Sucursal Río",
            "address": "Paseo del Roble 205",
            "latitude": 20.475890,
            "longitude": -99.225678,
            "phone": "7717654321",
            "usesPlatformDrivers": true,
            "deliveryFee": 0.00,
            "estimatedDeliveryMin": 20,
            "estimatedDeliveryMax": 30,
            "deliveryRadius": 10.0,
            "isOpen": true,
            "distance": 3.12,
            "schedule": [...]
          }
        ]
      },
      {
        "id": 2,
        "name": "Sushi Master Kenji",
        "description": "Auténtico sushi japonés",
        "category": "Sushi",
        "logoUrl": "https://...",
        "coverPhotoUrl": "https://...",
        "rating": 4.8,
        "isOpen": true,
        "minDistance": 2.89,
        "branches": [
          {
            "id": 4,
            "name": "Sucursal Principal Sushi",
            "address": "Av. Juárez 85, Centro",
            "latitude": 20.486789,
            "longitude": -99.212345,
            "phone": "7714567890",
            "usesPlatformDrivers": true,
            "deliveryFee": 25.00,
            "estimatedDeliveryMin": 30,
            "estimatedDeliveryMax": 40,
            "deliveryRadius": 7.0,
            "isOpen": true,
            "distance": 2.89,
            "schedule": [...]
          }
        ]
      }
    ],
    "pagination": {
      "totalRestaurants": 2,
      "currentPage": 1,
      "pageSize": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "geolocation": {
      "userLocation": {
        "latitude": 20.488765,
        "longitude": -99.234567
      },
      "sortedByProximity": true
    }
  }
}
```

#### **Errores Comunes:**

**400 Bad Request - Coordenadas incompletas:**
```json
{
  "status": "error",
  "message": "Debes proporcionar tanto latitud (lat) como longitud (lng)"
}
```

**400 Bad Request - Latitud inválida:**
```json
{
  "status": "error",
  "message": "La latitud debe estar entre -90 y 90"
}
```

**400 Bad Request - Longitud inválida:**
```json
{
  "status": "error",
  "message": "La longitud debe estar entre -180 y 180"
}
```

---

### **2. Obtener Restaurante por ID con Distancias**

**Endpoint:** `GET /api/restaurants/:id`

**Autenticación:** No requerida

**Descripción:** Obtiene un restaurante específico con su menú completo. Si se proporcionan coordenadas, calcula distancias a las sucursales.

#### **Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | Integer | Sí | ID del restaurante |

#### **Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `lat` | Float | No* | Latitud del usuario (-90 a 90) |
| `lng` | Float | No* | Longitud del usuario (-180 a 180) |

**\*Nota:** Si se proporciona `lat`, también se debe proporcionar `lng` (y viceversa)

#### **Ejemplos de Request:**

**Sin coordenadas:**
```http
GET http://localhost:3000/api/restaurants/1
```

**Con coordenadas (calcula distancias):**
```http
GET http://localhost:3000/api/restaurants/1?lat=20.488765&lng=-99.234567
```

#### **Response (200 OK) - Con Coordenadas:**
```json
{
  "status": "success",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales",
      "category": "Pizzas",
      "rating": 4.5,
      "logoUrl": "https://...",
      "coverPhotoUrl": "https://...",
      "createdAt": "2025-01-09T00:00:00.000Z",
      "isOpen": true,
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro",
          "latitude": 20.484123,
          "longitude": -99.216345,
          "phone": "7711234567",
          "usesPlatformDrivers": true,
          "deliveryFee": 20.00,
          "estimatedDeliveryMin": 25,
          "estimatedDeliveryMax": 35,
          "deliveryRadius": 8.0,
          "isOpen": true,
          "distance": 2.35,
          "schedule": [...]
        }
      ],
      "menu": [
        {
          "id": 1,
          "name": "Pizzas",
          "subcategories": [
            {
              "id": 1,
              "name": "Pizzas Tradicionales",
              "displayOrder": 1,
              "products": [
                {
                  "id": 1,
                  "name": "Pizza Hawaiana",
                  "description": "La clásica pizza con jamón y piña",
                  "imageUrl": "https://...",
                  "price": 150.00,
                  "modifierGroups": [
                    {
                      "id": 1,
                      "name": "Tamaño",
                      "minSelection": 1,
                      "maxSelection": 1,
                      "required": true,
                      "options": [
                        {
                          "id": 1,
                          "name": "Personal (6 pulgadas)",
                          "price": 0.00
                        },
                        {
                          "id": 2,
                          "name": "Mediana (10 pulgadas)",
                          "price": 25.00
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    "geolocation": {
      "userLocation": {
        "latitude": 20.488765,
        "longitude": -99.234567
      },
      "distanceCalculated": true
    }
  }
}
```

#### **Errores Comunes:**

**404 Not Found:**
```json
{
  "status": "error",
  "message": "Restaurante no encontrado o no está activo"
}
```

---

## 📊 Modelos de Datos

### **Restaurant**
```typescript
interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  rating: number;
  isOpen: boolean;           // true si al menos una sucursal está abierta
  minDistance: number | null; // Distancia a la sucursal más cercana (solo con coordenadas)
  branches: Branch[];
  menu?: Category[];          // Solo en GET /restaurants/:id
}
```

### **Branch (Sucursal)**
```typescript
interface Branch {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  usesPlatformDrivers: boolean;
  deliveryFee: number;
  estimatedDeliveryMin: number;
  estimatedDeliveryMax: number;
  deliveryRadius: number;     // Radio de cobertura en km
  isOpen: boolean;            // true si está abierta en el momento actual
  distance: number | null;    // Distancia en km (null si no se proporcionaron coordenadas)
  schedule: BranchSchedule[];
}
```

### **GeolocationInfo**
```typescript
interface GeolocationInfo {
  userLocation: {
    latitude: number;
    longitude: number;
  };
  sortedByProximity?: boolean;      // En GET /restaurants
  distanceCalculated?: boolean;     // En GET /restaurants/:id
}
```

### **BranchSchedule**
```typescript
interface BranchSchedule {
  dayOfWeek: number;      // 0=Domingo, 1=Lunes, ..., 6=Sábado
  openingTime: string;    // "HH:MM:SS"
  closingTime: string;    // "HH:MM:SS"
  isClosed: boolean;      // true si está cerrado este día
}
```

---

## 💻 Ejemplos de Integración Flutter

### **1. Service Layer**

```dart
// lib/services/restaurant_service.dart
import 'package:dio/dio.dart';
import '../models/restaurant_list_response.dart';
import '../models/restaurant_detail_response.dart';

class RestaurantService {
  final Dio _dio;
  
  RestaurantService(this._dio);
  
  /// Obtiene restaurantes con ordenamiento opcional por proximidad
  Future<RestaurantListResponse> getRestaurants({
    int page = 1,
    int pageSize = 10,
    String? category,
    String? search,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final queryParams = {
        'page': page,
        'pageSize': pageSize,
        if (category != null) 'category': category,
        if (search != null) 'search': search,
        if (latitude != null) 'lat': latitude,
        if (longitude != null) 'lng': longitude,
      };
      
      final response = await _dio.get(
        '/restaurants',
        queryParameters: queryParams,
      );
      
      return RestaurantListResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }
  
  /// Obtiene detalle de un restaurante con distancias opcionales
  Future<RestaurantDetailResponse> getRestaurantById(
    int id, {
    double? latitude,
    double? longitude,
  }) async {
    try {
      final queryParams = {
        if (latitude != null) 'lat': latitude,
        if (longitude != null) 'lng': longitude,
      };
      
      final response = await _dio.get(
        '/restaurants/$id',
        queryParameters: queryParams,
      );
      
      return RestaurantDetailResponse.fromJson(response.data);
    } catch (e) {
      rethrow;
    }
  }
}
```

### **2. Modelos de Datos**

```dart
// lib/models/restaurant.dart
class Restaurant {
  final int id;
  final String name;
  final String? description;
  final String? category;
  final String? logoUrl;
  final String? coverPhotoUrl;
  final double rating;
  final bool isOpen;
  final double? minDistance;
  final List<Branch> branches;
  
  Restaurant({
    required this.id,
    required this.name,
    this.description,
    this.category,
    this.logoUrl,
    this.coverPhotoUrl,
    required this.rating,
    required this.isOpen,
    this.minDistance,
    required this.branches,
  });
  
  factory Restaurant.fromJson(Map<String, dynamic> json) {
    return Restaurant(
      id: json['id'],
      name: json['name'],
      description: json['description'],
      category: json['category'],
      logoUrl: json['logoUrl'],
      coverPhotoUrl: json['coverPhotoUrl'],
      rating: (json['rating'] as num).toDouble(),
      isOpen: json['isOpen'],
      minDistance: json['minDistance'] != null 
          ? (json['minDistance'] as num).toDouble() 
          : null,
      branches: (json['branches'] as List)
          .map((b) => Branch.fromJson(b))
          .toList(),
    );
  }
}

class Branch {
  final int id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final String? phone;
  final bool usesPlatformDrivers;
  final double deliveryFee;
  final int estimatedDeliveryMin;
  final int estimatedDeliveryMax;
  final double deliveryRadius;
  final bool isOpen;
  final double? distance;
  
  Branch({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.phone,
    required this.usesPlatformDrivers,
    required this.deliveryFee,
    required this.estimatedDeliveryMin,
    required this.estimatedDeliveryMax,
    required this.deliveryRadius,
    required this.isOpen,
    this.distance,
  });
  
  factory Branch.fromJson(Map<String, dynamic> json) {
    return Branch(
      id: json['id'],
      name: json['name'],
      address: json['address'],
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      phone: json['phone'],
      usesPlatformDrivers: json['usesPlatformDrivers'],
      deliveryFee: (json['deliveryFee'] as num).toDouble(),
      estimatedDeliveryMin: json['estimatedDeliveryMin'],
      estimatedDeliveryMax: json['estimatedDeliveryMax'],
      deliveryRadius: (json['deliveryRadius'] as num).toDouble(),
      isOpen: json['isOpen'],
      distance: json['distance'] != null 
          ? (json['distance'] as num).toDouble() 
          : null,
    );
  }
}
```

### **3. Provider/State Management**

```dart
// lib/providers/restaurant_provider.dart
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import '../services/restaurant_service.dart';
import '../models/restaurant.dart';

class RestaurantProvider with ChangeNotifier {
  final RestaurantService _restaurantService;
  
  RestaurantProvider(this._restaurantService);
  
  List<Restaurant> _restaurants = [];
  bool _isLoading = false;
  String? _error;
  Position? _userPosition;
  bool _sortedByProximity = false;
  
  List<Restaurant> get restaurants => _restaurants;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get sortedByProximity => _sortedByProximity;
  
  /// Obtiene la ubicación del usuario
  Future<void> getUserLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        print('Servicios de ubicación deshabilitados');
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          print('Permisos de ubicación denegados');
          return;
        }
      }

      _userPosition = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      
      print('Ubicación obtenida: ${_userPosition?.latitude}, ${_userPosition?.longitude}');
      notifyListeners();
    } catch (e) {
      print('Error obteniendo ubicación: $e');
    }
  }
  
  /// Carga restaurantes con ordenamiento inteligente
  Future<void> loadRestaurants({
    int page = 1,
    int pageSize = 10,
    String? category,
    String? search,
    bool useLocation = true,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    
    try {
      // Si useLocation es true y no tenemos posición, intentar obtenerla
      if (useLocation && _userPosition == null) {
        await getUserLocation();
      }
      
      final response = await _restaurantService.getRestaurants(
        page: page,
        pageSize: pageSize,
        category: category,
        search: search,
        latitude: useLocation ? _userPosition?.latitude : null,
        longitude: useLocation ? _userPosition?.longitude : null,
      );
      
      _restaurants = response.data.restaurants;
      _sortedByProximity = response.data.geolocation?.sortedByProximity ?? false;
      _error = null;
      
      print('${_restaurants.length} restaurantes cargados');
      if (_sortedByProximity) {
        print('Restaurantes ordenados por proximidad');
      }
    } catch (e) {
      _error = e.toString();
      _restaurants = [];
      _sortedByProximity = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
  
  /// Obtiene restaurantes cercanos (fuerza uso de ubicación)
  Future<void> loadNearbyRestaurants() async {
    await loadRestaurants(useLocation: true);
  }
  
  /// Obtiene todos los restaurantes (sin ordenar por ubicación)
  Future<void> loadAllRestaurants() async {
    await loadRestaurants(useLocation: false);
  }
}
```

### **4. Widget de UI**

```dart
// lib/screens/restaurants_list_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/restaurant_provider.dart';
import '../models/restaurant.dart';

class RestaurantsListScreen extends StatefulWidget {
  const RestaurantsListScreen({Key? key}) : super(key: key);
  
  @override
  State<RestaurantsListScreen> createState() => _RestaurantsListScreenState();
}

class _RestaurantsListScreenState extends State<RestaurantsListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<RestaurantProvider>().loadNearbyRestaurants();
    });
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurantes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.my_location),
            onPressed: () {
              context.read<RestaurantProvider>().loadNearbyRestaurants();
            },
            tooltip: 'Restaurantes cercanos',
          ),
        ],
      ),
      body: Consumer<RestaurantProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }
          
          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 64, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(provider.error!),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => provider.loadNearbyRestaurants(),
                    child: const Text('Reintentar'),
                  ),
                ],
              ),
            );
          }
          
          if (provider.restaurants.isEmpty) {
            return const Center(
              child: Text('No hay restaurantes disponibles'),
            );
          }
          
          return Column(
            children: [
              // Indicador de ordenamiento
              if (provider.sortedByProximity)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  color: Colors.green.shade50,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: const [
                      Icon(Icons.location_on, size: 16, color: Colors.green),
                      SizedBox(width: 8),
                      Text(
                        'Ordenado por proximidad',
                        style: TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              
              // Lista de restaurantes
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: provider.restaurants.length,
                  itemBuilder: (context, index) {
                    final restaurant = provider.restaurants[index];
                    return _RestaurantCard(restaurant: restaurant);
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;
  
  const _RestaurantCard({required this.restaurant});
  
  @override
  Widget build(BuildContext context) {
    // Obtener la sucursal más cercana
    final nearestBranch = restaurant.branches.isNotEmpty
        ? restaurant.branches.reduce((a, b) {
            if (a.distance == null) return b;
            if (b.distance == null) return a;
            return a.distance! < b.distance! ? a : b;
          })
        : null;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          Navigator.pushNamed(
            context,
            '/restaurant-detail',
            arguments: restaurant.id,
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Imagen de portada
            if (restaurant.coverPhotoUrl != null)
              Stack(
                children: [
                  Image.network(
                    restaurant.coverPhotoUrl!,
                    height: 150,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) {
                      return Container(
                        height: 150,
                        color: Colors.grey.shade200,
                        child: const Icon(Icons.restaurant, size: 64),
                      );
                    },
                  ),
                  
                  // Badge de distancia
                  if (restaurant.minDistance != null)
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.location_on,
                              color: Colors.white,
                              size: 16,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${restaurant.minDistance!.toStringAsFixed(2)} km',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  
                  // Badge de estado (abierto/cerrado)
                  Positioned(
                    top: 8,
                    left: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: restaurant.isOpen
                            ? Colors.green
                            : Colors.red,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        restaurant.isOpen ? 'ABIERTO' : 'CERRADO',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            
            // Información del restaurante
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      // Logo
                      if (restaurant.logoUrl != null)
                        CircleAvatar(
                          radius: 24,
                          backgroundImage: NetworkImage(restaurant.logoUrl!),
                        ),
                      const SizedBox(width: 12),
                      
                      // Nombre y rating
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              restaurant.name,
                              style: Theme.of(context).textTheme.titleLarge,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                const Icon(
                                  Icons.star,
                                  color: Colors.amber,
                                  size: 16,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  restaurant.rating.toStringAsFixed(1),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                if (restaurant.category != null) ...[
                                  const SizedBox(width: 8),
                                  Text(
                                    '• ${restaurant.category}',
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  
                  if (restaurant.description != null) ...[
                    const SizedBox(height: 12),
                    Text(
                      restaurant.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: Colors.grey.shade700),
                    ),
                  ],
                  
                  // Información de la sucursal más cercana
                  if (nearestBranch != null) ...[
                    const Divider(height: 24),
                    Row(
                      children: [
                        Icon(
                          Icons.store,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            nearestBranch.name,
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 12,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          Icons.delivery_dining,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          nearestBranch.deliveryFee > 0
                              ? '\$${nearestBranch.deliveryFee.toStringAsFixed(2)}'
                              : 'Envío gratis',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          Icons.access_time,
                          size: 16,
                          color: Colors.grey.shade600,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${nearestBranch.estimatedDeliveryMin}-${nearestBranch.estimatedDeliveryMax} min',
                          style: TextStyle(
                            color: Colors.grey.shade600,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🎯 Casos de Uso

### **Caso 1: Usuario Busca Restaurantes Cercanos**

**Flujo:**
1. App obtiene ubicación GPS del usuario
2. Llama a `GET /restaurants?lat=20.488765&lng=-99.234567`
3. Backend calcula distancias y ordena por proximidad
4. App muestra lista ordenada con badges de distancia

**Beneficio:** Usuario ve primero los restaurantes más cercanos

### **Caso 2: Usuario Explora Sin Compartir Ubicación**

**Flujo:**
1. Usuario deniega permisos de ubicación
2. App llama a `GET /restaurants` (sin coordenadas)
3. Backend devuelve lista sin ordenar (orden por `createdAt`)
4. App muestra restaurantes sin información de distancia

**Beneficio:** La app funciona incluso sin GPS

### **Caso 3: Usuario Filtra por Categoría y Proximidad**

**Flujo:**
1. Usuario selecciona categoría "Pizzas"
2. App llama a `GET /restaurants?category=Pizzas&lat=20.488765&lng=-99.234567`
3. Backend filtra por categoría Y ordena por distancia
4. App muestra solo pizzerías ordenadas por cercanía

**Beneficio:** Búsqueda precisa con ordenamiento inteligente

---

## ⚠️ Manejo de Errores

### **Tabla de Errores**

| Código | Descripción | Solución Flutter |
|--------|-------------|------------------|
| `400` | Coordenadas incompletas/inválidas | Validar lat/lng antes de enviar |
| `404` | Restaurante no encontrado | Refrescar lista |
| `500` | Error interno del servidor | Mostrar mensaje de reintentar |

### **Ejemplo de Manejo en Flutter:**

```dart
Future<void> _loadRestaurants() async {
  try {
    await restaurantProvider.loadNearbyRestaurants();
  } on DioException catch (e) {
    if (e.response?.statusCode == 400) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.response?.data['message'] ?? 'Error en coordenadas'),
          backgroundColor: Colors.orange,
        ),
      );
    } else if (e.response?.statusCode == 500) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Error del servidor. Intenta de nuevo.'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
```

---

## 📝 Notas Importantes

1. **Campo `distance`:** Siempre es `null` si no se proporcionan coordenadas
2. **Campo `minDistance`:** Solo existe en restaurantes cuando se usan coordenadas
3. **Ordenamiento:** Solo aplica cuando se proporcionan lat/lng
4. **Rendimiento:** El cálculo de distancias es eficiente (O(n) donde n = número de sucursales)
5. **Precisión:** La fórmula de Haversine es precisa para distancias cortas (<100 km)

---

## 🚀 Mejoras Futuras

1. **Cache de Ubicación:** Guardar última ubicación del usuario
2. **Filtro por Radio:** `?maxDistance=5` para limitar resultados
3. **Ordenamiento Híbrido:** Combinar distancia + rating + precio
4. **Mapa Interactivo:** Mostrar restaurantes en Google Maps
5. **Notificaciones:** Alertar cuando nuevos restaurantes cercanos se unan

---

**Fecha de Actualización:** 9 de Enero, 2025  
**Versión del API:** 1.0  
**Autor:** Equipo Backend Delixmi

