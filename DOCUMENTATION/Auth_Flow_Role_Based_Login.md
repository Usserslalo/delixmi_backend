# 🔐 Guía de Implementación: Login Unificado y Redirección por Rol

## 📋 Índice
1. [Objetivo](#objetivo)
2. [Verificación del Backend](#verificación-del-backend)
3. [Análisis de la Respuesta del Login](#análisis-de-la-respuesta-del-login)
4. [Implementación en Flutter](#implementación-en-flutter)
5. [Creación de Pantallas por Rol](#creación-de-pantallas-por-rol)
6. [Gestión de Rutas](#gestión-de-rutas)
7. [Casos Especiales](#casos-especiales)
8. [Testing](#testing)

---

## 🎯 Objetivo

Esta guía explica cómo implementar un **sistema de login unificado** que redirige automáticamente a los usuarios a diferentes pantallas según su rol en el sistema.

### **Roles Disponibles en Delixmi:**

| Rol | roleName | Pantalla Destino |
|-----|----------|------------------|
| Super Administrador | `super_admin` | `/admin_dashboard` |
| Gestor de Plataforma | `platform_manager` | `/platform_dashboard` |
| Agente de Soporte | `support_agent` | `/support_dashboard` |
| Dueño de Restaurante | `owner` | `/owner_dashboard` |
| Gerente de Sucursal | `branch_manager` | `/branch_dashboard` |
| Gestor de Pedidos | `order_manager` | `/orders_dashboard` |
| Personal de Cocina | `kitchen_staff` | `/kitchen_dashboard` |
| Repartidor de Plataforma | `driver_platform` | `/driver_dashboard` |
| Repartidor de Restaurante | `driver_restaurant` | `/driver_dashboard` |
| Cliente | `customer` | `/customer_home` |

---

## ✅ Verificación del Backend

### **Confirmación Técnica:**

✅ **El endpoint `POST /api/auth/login` YA soporta múltiples roles**

**Archivo analizado:** `src/controllers/auth.controller.js` (líneas 260-286)

**Estructura de la respuesta:**
```javascript
{
  status: 'success',
  message: 'Inicio de sesión exitoso',
  data: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    user: {
      id: 1,
      name: 'Sofia',
      lastname: 'López',
      email: 'sofia.lopez@email.com',
      phone: '4444444444',
      status: 'active',
      roles: [  // ← Array de roles
        {
          roleId: 10,
          roleName: 'customer',           // ← Campo clave para redirección
          roleDisplayName: 'Cliente',
          restaurantId: null,
          branchId: null
        }
      ]
    },
    expiresIn: '24h'
  }
}
```

### **Campos Críticos para Frontend:**

| Campo | Ubicación | Descripción |
|-------|-----------|-------------|
| `user.roles` | Array | Lista de roles del usuario |
| `roles[0].roleName` | String | Nombre técnico del rol (ej: 'customer', 'owner') |
| `roles[0].roleDisplayName` | String | Nombre legible del rol (ej: 'Cliente', 'Dueño de Restaurante') |
| `roles[0].restaurantId` | Int/null | ID del restaurante (si aplica) |
| `roles[0].branchId` | Int/null | ID de la sucursal (si aplica) |

---

## 🔍 Análisis de la Respuesta del Login

### **Paso 1: Entender la Estructura**

Cuando un usuario inicia sesión exitosamente, el backend devuelve un objeto JSON con esta estructura:

```json
{
  "status": "success",
  "message": "Inicio de sesión exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsInJvbGVJZCI6MTAsInJvbGVOYW1lIjoiY3VzdG9tZXIiLCJlbWFpbCI6InNvZmlhLmxvcGV6QGVtYWlsLmNvbSIsImlhdCI6MTcwNDgzNjQwMCwiZXhwIjoxNzA0OTIyODAwLCJpc3MiOiJkZWxpeG1pLWFwaSIsImF1ZCI6ImRlbGl4bWktYXBwIn0.xyz",
    "user": {
      "id": 5,
      "name": "Sofía",
      "lastname": "López",
      "email": "sofia.lopez@email.com",
      "phone": "4444444444",
      "status": "active",
      "emailVerifiedAt": "2025-01-09T00:00:00.000Z",
      "phoneVerifiedAt": "2025-01-09T00:00:00.000Z",
      "createdAt": "2025-01-09T00:00:00.000Z",
      "updatedAt": "2025-01-09T00:00:00.000Z",
      "roles": [
        {
          "roleId": 10,
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

### **Paso 2: Identificar el Rol Principal**

El array `user.roles` contiene todos los roles asignados al usuario. Para la redirección, usamos el **primer rol** del array:

```dart
final primaryRole = loginResponse.user.roles.first.roleName;
```

### **Ejemplos de Roles:**

**Usuario Cliente (Sofia):**
```json
"roles": [
  {
    "roleName": "customer",
    "roleDisplayName": "Cliente",
    "restaurantId": null,
    "branchId": null
  }
]
```

**Usuario Owner (Ana - Dueña de Pizzería):**
```json
"roles": [
  {
    "roleName": "owner",
    "roleDisplayName": "Dueño de Restaurante",
    "restaurantId": 1,
    "branchId": null
  }
]
```

**Usuario Branch Manager (Carlos - Gerente de Sucursal):**
```json
"roles": [
  {
    "roleName": "branch_manager",
    "roleDisplayName": "Gerente de Sucursal",
    "restaurantId": 1,
    "branchId": 1
  }
]
```

**Usuario Driver (Miguel - Repartidor de Plataforma):**
```json
"roles": [
  {
    "roleName": "driver_platform",
    "roleDisplayName": "Repartidor de Plataforma",
    "restaurantId": null,
    "branchId": null
  }
]
```

---

## 💻 Implementación en Flutter

### **Paso 1: Crear Modelos de Datos**

```dart
// lib/models/auth/user_role.dart
class UserRole {
  final int roleId;
  final String roleName;
  final String roleDisplayName;
  final int? restaurantId;
  final int? branchId;
  
  UserRole({
    required this.roleId,
    required this.roleName,
    required this.roleDisplayName,
    this.restaurantId,
    this.branchId,
  });
  
  factory UserRole.fromJson(Map<String, dynamic> json) {
    return UserRole(
      roleId: json['roleId'],
      roleName: json['roleName'],
      roleDisplayName: json['roleDisplayName'],
      restaurantId: json['restaurantId'],
      branchId: json['branchId'],
    );
  }
  
  Map<String, dynamic> toJson() {
    return {
      'roleId': roleId,
      'roleName': roleName,
      'roleDisplayName': roleDisplayName,
      'restaurantId': restaurantId,
      'branchId': branchId,
    };
  }
}
```

```dart
// lib/models/auth/user.dart
class User {
  final int id;
  final String name;
  final String lastname;
  final String email;
  final String phone;
  final String status;
  final DateTime? emailVerifiedAt;
  final DateTime? phoneVerifiedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<UserRole> roles;
  
  User({
    required this.id,
    required this.name,
    required this.lastname,
    required this.email,
    required this.phone,
    required this.status,
    this.emailVerifiedAt,
    this.phoneVerifiedAt,
    required this.createdAt,
    required this.updatedAt,
    required this.roles,
  });
  
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      name: json['name'],
      lastname: json['lastname'],
      email: json['email'],
      phone: json['phone'],
      status: json['status'],
      emailVerifiedAt: json['emailVerifiedAt'] != null
          ? DateTime.parse(json['emailVerifiedAt'])
          : null,
      phoneVerifiedAt: json['phoneVerifiedAt'] != null
          ? DateTime.parse(json['phoneVerifiedAt'])
          : null,
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      roles: (json['roles'] as List)
          .map((r) => UserRole.fromJson(r))
          .toList(),
    );
  }
  
  // Método auxiliar para obtener el rol principal
  UserRole get primaryRole => roles.first;
  
  // Método auxiliar para verificar si tiene un rol específico
  bool hasRole(String roleName) {
    return roles.any((role) => role.roleName == roleName);
  }
  
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'lastname': lastname,
      'email': email,
      'phone': phone,
      'status': status,
      'emailVerifiedAt': emailVerifiedAt?.toIso8601String(),
      'phoneVerifiedAt': phoneVerifiedAt?.toIso8601String(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'roles': roles.map((r) => r.toJson()).toList(),
    };
  }
}
```

```dart
// lib/models/auth/login_response.dart
class LoginResponse {
  final String status;
  final String message;
  final LoginData data;
  
  LoginResponse({
    required this.status,
    required this.message,
    required this.data,
  });
  
  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    return LoginResponse(
      status: json['status'],
      message: json['message'],
      data: LoginData.fromJson(json['data']),
    );
  }
}

class LoginData {
  final String token;
  final User user;
  final String expiresIn;
  
  LoginData({
    required this.token,
    required this.user,
    required this.expiresIn,
  });
  
  factory LoginData.fromJson(Map<String, dynamic> json) {
    return LoginData(
      token: json['token'],
      user: User.fromJson(json['user']),
      expiresIn: json['expiresIn'],
    );
  }
}
```

---

### **Paso 2: Implementar la Lógica de Redirección**

```dart
// lib/services/auth_service.dart
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/auth/login_response.dart';

class AuthService {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  
  AuthService(this._dio, this._storage);
  
  /// Inicia sesión y devuelve la respuesta completa
  Future<LoginResponse> login(String email, String password) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );
      
      final loginResponse = LoginResponse.fromJson(response.data);
      
      // Guardar token en almacenamiento seguro
      await _storage.write(
        key: 'auth_token',
        value: loginResponse.data.token,
      );
      
      // Guardar información del usuario
      await _storage.write(
        key: 'user_data',
        value: jsonEncode(loginResponse.data.user.toJson()),
      );
      
      return loginResponse;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw Exception('Usuario no encontrado');
      } else if (e.response?.statusCode == 401) {
        throw Exception('Credenciales inválidas');
      } else if (e.response?.statusCode == 403) {
        throw Exception('Cuenta no verificada. Por favor, verifica tu correo electrónico.');
      }
      rethrow;
    }
  }
  
  /// Cierra sesión
  Future<void> logout() async {
    try {
      // Llamar al endpoint de logout (opcional)
      await _dio.post('/auth/logout');
    } catch (e) {
      print('Error en logout del servidor: $e');
    } finally {
      // Limpiar almacenamiento local
      await _storage.delete(key: 'auth_token');
      await _storage.delete(key: 'user_data');
    }
  }
}
```

---

### **Paso 3: Implementar Redirección en la Pantalla de Login**

```dart
// lib/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);
  
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  
  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
  
  /// Maneja la lógica de login y redirección
  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    
    setState(() => _isLoading = true);
    
    try {
      final authService = context.read<AuthService>();
      
      // Realizar login
      final loginResponse = await authService.login(
        _emailController.text.trim(),
        _passwordController.text,
      );
      
      // Obtener el rol principal del usuario
      final user = loginResponse.data.user;
      
      if (user.roles.isEmpty) {
        // Caso raro: usuario sin roles
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Error: Usuario sin roles asignados'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
      
      final primaryRole = user.roles.first.roleName;
      
      // Guardar en provider si lo usas
      context.read<AuthProvider>().setUser(user);
      
      // Redirigir según el rol
      _redirectByRole(primaryRole, user);
      
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }
  
  /// Redirige al usuario a la pantalla correcta según su rol
  void _redirectByRole(String roleName, User user) {
    // Logging para debugging
    print('🔑 Redirigiendo usuario con rol: $roleName');
    
    switch (roleName) {
      // ===== ROLES DE PLATAFORMA =====
      case 'super_admin':
        Navigator.pushReplacementNamed(context, '/admin_dashboard');
        break;
        
      case 'platform_manager':
        Navigator.pushReplacementNamed(context, '/platform_dashboard');
        break;
        
      case 'support_agent':
        Navigator.pushReplacementNamed(context, '/support_dashboard');
        break;
      
      // ===== ROLES DE RESTAURANTE =====
      case 'owner':
        Navigator.pushReplacementNamed(
          context,
          '/owner_dashboard',
          arguments: {
            'restaurantId': user.roles.first.restaurantId,
          },
        );
        break;
        
      case 'branch_manager':
        Navigator.pushReplacementNamed(
          context,
          '/branch_dashboard',
          arguments: {
            'restaurantId': user.roles.first.restaurantId,
            'branchId': user.roles.first.branchId,
          },
        );
        break;
        
      case 'order_manager':
        Navigator.pushReplacementNamed(
          context,
          '/orders_dashboard',
          arguments: {
            'restaurantId': user.roles.first.restaurantId,
            'branchId': user.roles.first.branchId,
          },
        );
        break;
        
      case 'kitchen_staff':
        Navigator.pushReplacementNamed(
          context,
          '/kitchen_dashboard',
          arguments: {
            'branchId': user.roles.first.branchId,
          },
        );
        break;
      
      // ===== ROLES DE REPARTIDORES =====
      case 'driver_platform':
      case 'driver_restaurant':
        Navigator.pushReplacementNamed(context, '/driver_dashboard');
        break;
      
      // ===== ROL DE CLIENTE =====
      case 'customer':
        Navigator.pushReplacementNamed(context, '/customer_home');
        break;
      
      // ===== ROL NO RECONOCIDO =====
      default:
        print('⚠️ Rol no reconocido: $roleName');
        Navigator.pushReplacementNamed(context, '/unsupported_role');
        break;
    }
  }
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Iniciar Sesión'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              const Icon(
                Icons.restaurant,
                size: 80,
                color: Colors.orange,
              ),
              const SizedBox(height: 24),
              const Text(
                'Delixmi',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 48),
              
              // Email
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Correo Electrónico',
                  prefixIcon: Icon(Icons.email),
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Por favor ingresa tu correo';
                  }
                  if (!value.contains('@')) {
                    return 'Ingresa un correo válido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              
              // Password
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: Icon(Icons.lock),
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Por favor ingresa tu contraseña';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              
              // Botón de Login
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Iniciar Sesión'),
                ),
              ),
              
              const SizedBox(height: 16),
              
              // Link de registro
              TextButton(
                onPressed: () {
                  Navigator.pushNamed(context, '/register');
                },
                child: const Text('¿No tienes cuenta? Regístrate'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 🏗️ Creación de Pantallas por Rol

### **Pantalla: Owner Dashboard (Placeholder)**

```dart
// lib/screens/owner/owner_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class OwnerDashboardScreen extends StatelessWidget {
  const OwnerDashboardScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    // Obtener restaurantId de los argumentos de navegación
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final restaurantId = args?['restaurantId'];
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel de Owner'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await _handleLogout(context);
            },
            tooltip: 'Cerrar Sesión',
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.business_center,
              size: 80,
              color: Colors.orange,
            ),
            const SizedBox(height: 24),
            const Text(
              'Este será el panel de administración del owner',
              style: TextStyle(fontSize: 18),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            if (restaurantId != null)
              Text(
                'Restaurante ID: $restaurantId',
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () async {
                await _handleLogout(context);
              },
              icon: const Icon(Icons.logout),
              label: const Text('Cerrar Sesión'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
  
  Future<void> _handleLogout(BuildContext context) async {
    try {
      final authService = context.read<AuthService>();
      await authService.logout();
      
      if (context.mounted) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/login',
          (route) => false,
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error al cerrar sesión: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
```

---

### **Pantalla: Customer Home (Ya existe)**

```dart
// lib/screens/customer/customer_home_screen.dart
// Esta pantalla ya debería estar implementada
// Solo asegúrate de que tenga el botón de logout

class CustomerHomeScreen extends StatelessWidget {
  const CustomerHomeScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Delixmi - Cliente'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final authService = context.read<AuthService>();
              await authService.logout();
              
              if (context.mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
      body: const Center(
        child: Text('Pantalla principal de cliente'),
      ),
    );
  }
}
```

---

### **Pantalla: Driver Dashboard (Placeholder)**

```dart
// lib/screens/driver/driver_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class DriverDashboardScreen extends StatelessWidget {
  const DriverDashboardScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel de Repartidor'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final authService = context.read<AuthService>();
              await authService.logout();
              
              if (context.mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.delivery_dining,
              size: 80,
              color: Colors.blue,
            ),
            const SizedBox(height: 24),
            const Text(
              'Este será el panel del repartidor',
              style: TextStyle(fontSize: 18),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () async {
                final authService = context.read<AuthService>();
                await authService.logout();
                
                if (context.mounted) {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/login',
                    (route) => false,
                  );
                }
              },
              icon: const Icon(Icons.logout),
              label: const Text('Cerrar Sesión'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
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

### **Pantalla: Rol No Soportado (Error Handling)**

```dart
// lib/screens/auth/unsupported_role_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class UnsupportedRoleScreen extends StatelessWidget {
  const UnsupportedRoleScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rol No Soportado'),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.warning_amber_rounded,
                size: 80,
                color: Colors.orange,
              ),
              const SizedBox(height: 24),
              const Text(
                'Rol No Soportado',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Tu cuenta tiene un rol que aún no está implementado en la aplicación móvil. Por favor, contacta al administrador.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () async {
                  final authService = context.read<AuthService>();
                  await authService.logout();
                  
                  if (context.mounted) {
                    Navigator.pushNamedAndRemoveUntil(
                      context,
                      '/login',
                      (route) => false,
                    );
                  }
                },
                child: const Text('Cerrar Sesión'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

---

## 🛣️ Gestión de Rutas

### **Configuración en main.dart**

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'screens/auth/login_screen.dart';
import 'screens/auth/unsupported_role_screen.dart';
import 'screens/customer/customer_home_screen.dart';
import 'screens/owner/owner_dashboard_screen.dart';
import 'screens/driver/driver_dashboard_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Delixmi',
      theme: ThemeData(
        primarySwatch: Colors.orange,
      ),
      initialRoute: '/login',
      routes: {
        // ===== AUTENTICACIÓN =====
        '/login': (context) => const LoginScreen(),
        '/unsupported_role': (context) => const UnsupportedRoleScreen(),
        
        // ===== CLIENTE =====
        '/customer_home': (context) => const CustomerHomeScreen(),
        
        // ===== OWNER =====
        '/owner_dashboard': (context) => const OwnerDashboardScreen(),
        
        // ===== REPARTIDOR =====
        '/driver_dashboard': (context) => const DriverDashboardScreen(),
        
        // ===== ADMIN (Placeholder) =====
        '/admin_dashboard': (context) => const Scaffold(
          body: Center(child: Text('Admin Dashboard - Próximamente')),
        ),
        
        // ===== OTROS ROLES (Placeholders) =====
        '/platform_dashboard': (context) => const Scaffold(
          body: Center(child: Text('Platform Manager - Próximamente')),
        ),
        '/support_dashboard': (context) => const Scaffold(
          body: Center(child: Text('Support Agent - Próximamente')),
        ),
        '/branch_dashboard': (context) => const Scaffold(
          body: Center(child: Text('Branch Manager - Próximamente')),
        ),
        '/orders_dashboard': (context) => const Scaffold(
          body: Center(child: Text('Order Manager - Próximamente')),
        ),
        '/kitchen_dashboard': (context) => const Scaffold(
          body: Center(child: Text('Kitchen Staff - Próximamente')),
        ),
      },
    );
  }
}
```

---

## ⚙️ Casos Especiales

### **Caso 1: Usuario con Múltiples Roles**

Algunos usuarios pueden tener más de un rol asignado. Por ejemplo, un usuario podría ser:
- Owner de un restaurante
- Customer (para hacer pedidos personales)

**Estrategia recomendada:**
```dart
// Usar el primer rol como principal
final primaryRole = user.roles.first.roleName;

// Opcional: Permitir cambio de rol en la app
class RoleSwitcher extends StatelessWidget {
  final List<UserRole> roles;
  
  const RoleSwitcher({Key? key, required this.roles}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    if (roles.length <= 1) return const SizedBox.shrink();
    
    return DropdownButton<String>(
      value: roles.first.roleName,
      items: roles.map((role) {
        return DropdownMenuItem(
          value: role.roleName,
          child: Text(role.roleDisplayName),
        );
      }).toList(),
      onChanged: (newRole) {
        // Cambiar de vista según el rol seleccionado
        _redirectByRole(newRole!);
      },
    );
  }
}
```

---

### **Caso 2: Validación de Estado de Cuenta**

El backend verifica que la cuenta esté `active` antes de permitir el login:

```dart
try {
  final loginResponse = await authService.login(email, password);
  // Login exitoso...
} on DioException catch (e) {
  if (e.response?.statusCode == 403) {
    // Cuenta no verificada
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cuenta No Verificada'),
        content: const Text(
          'Por favor, verifica tu correo electrónico antes de iniciar sesión.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Navegar a pantalla de reenvío de verificación
              Navigator.pushNamed(context, '/resend-verification');
            },
            child: const Text('Reenviar Verificación'),
          ),
        ],
      ),
    );
  }
}
```

---

### **Caso 3: Persistencia de Sesión**

Para mantener la sesión activa entre reinicios de la app:

```dart
// lib/main.dart
class MyApp extends StatefulWidget {
  const MyApp({Key? key}) : super(key: key);
  
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  String _initialRoute = '/login';
  bool _isChecking = true;
  
  @override
  void initState() {
    super.initState();
    _checkAuthStatus();
  }
  
  Future<void> _checkAuthStatus() async {
    try {
      final storage = FlutterSecureStorage();
      final token = await storage.read(key: 'auth_token');
      final userDataStr = await storage.read(key: 'user_data');
      
      if (token != null && userDataStr != null) {
        // Usuario tiene sesión activa
        final userData = jsonDecode(userDataStr);
        final user = User.fromJson(userData);
        
        if (user.roles.isNotEmpty) {
          final primaryRole = user.roles.first.roleName;
          
          // Determinar ruta inicial según el rol
          switch (primaryRole) {
            case 'owner':
              _initialRoute = '/owner_dashboard';
              break;
            case 'customer':
              _initialRoute = '/customer_home';
              break;
            case 'driver_platform':
            case 'driver_restaurant':
              _initialRoute = '/driver_dashboard';
              break;
            default:
              _initialRoute = '/login';
          }
        }
      }
    } catch (e) {
      print('Error verificando sesión: $e');
      _initialRoute = '/login';
    } finally {
      setState(() => _isChecking = false);
    }
  }
  
  @override
  Widget build(BuildContext context) {
    if (_isChecking) {
      return const MaterialApp(
        home: Scaffold(
          body: Center(child: CircularProgressIndicator()),
        ),
      );
    }
    
    return MaterialApp(
      initialRoute: _initialRoute,
      routes: {
        // ... tus rutas aquí
      },
    );
  }
}
```

---

## 🧪 Testing

### **Suite de Pruebas Recomendada**

#### **Prueba 1: Login como Customer**

**Credenciales:**
- Email: `sofia.lopez@email.com`
- Password: `supersecret`

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Redirección a `/customer_home`
- ✅ Token guardado en storage

---

#### **Prueba 2: Login como Owner**

**Credenciales:**
- Email: `ana.garcia@pizzeria.com`
- Password: `supersecret`

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Redirección a `/owner_dashboard`
- ✅ `restaurantId: 1` pasado como argumento

---

#### **Prueba 3: Login como Driver**

**Credenciales:**
- Email: `miguel.hernandez@repartidor.com`
- Password: `supersecret`

**Resultado esperado:**
- ✅ Login exitoso
- ✅ Redirección a `/driver_dashboard`
- ✅ Token guardado en storage

---

#### **Prueba 4: Credenciales Inválidas**

**Credenciales:**
- Email: `test@test.com`
- Password: `wrongpassword`

**Resultado esperado:**
- ❌ Error 404 o 401
- ❌ Mensaje: "Usuario no encontrado" o "Credenciales inválidas"
- ❌ No hay redirección

---

#### **Prueba 5: Cuenta No Verificada**

**Credenciales:**
- Email de usuario con `status: pending`
- Password correcta

**Resultado esperado:**
- ❌ Error 403
- ❌ Mensaje: "Cuenta no verificada"
- ❌ Opción de reenviar verificación

---

## 📊 Tabla de Referencia: Roles y Rutas

| roleName | roleDisplayName | Ruta Flutter | Status |
|----------|-----------------|--------------|--------|
| `customer` | Cliente | `/customer_home` | ✅ Implementado |
| `owner` | Dueño de Restaurante | `/owner_dashboard` | ⏳ Placeholder |
| `driver_platform` | Repartidor de Plataforma | `/driver_dashboard` | ⏳ Placeholder |
| `driver_restaurant` | Repartidor de Restaurante | `/driver_dashboard` | ⏳ Placeholder |
| `branch_manager` | Gerente de Sucursal | `/branch_dashboard` | ⏳ Placeholder |
| `order_manager` | Gestor de Pedidos | `/orders_dashboard` | ⏳ Placeholder |
| `kitchen_staff` | Personal de Cocina | `/kitchen_dashboard` | ⏳ Placeholder |
| `super_admin` | Super Administrador | `/admin_dashboard` | ⏳ Placeholder |
| `platform_manager` | Gestor de Plataforma | `/platform_dashboard` | ⏳ Placeholder |
| `support_agent` | Agente de Soporte | `/support_dashboard` | ⏳ Placeholder |

---

## 🔐 Seguridad

### **Buenas Prácticas Implementadas:**

1. **Token JWT Seguro:**
   - Guardado en `FlutterSecureStorage` (encriptado)
   - Expiración de 24 horas
   - Incluye información del rol en el payload

2. **Validación de Estado:**
   - Backend verifica que la cuenta esté `active`
   - Frontend maneja estado `pending` correctamente

3. **Logout Seguro:**
   - Limpia token del storage
   - Limpia datos del usuario
   - Redirige a login

4. **Verificación de Rol:**
   - Frontend valida que el array `roles` no esté vacío
   - Maneja roles no reconocidos

---

## 📝 Instrucciones para el Equipo de Flutter

### **Paso 1: Crear Modelos** ✅
- Crear `lib/models/auth/user_role.dart`
- Crear `lib/models/auth/user.dart`
- Crear `lib/models/auth/login_response.dart`

### **Paso 2: Implementar Service** ✅
- Crear `lib/services/auth_service.dart`
- Implementar método `login()`
- Implementar método `logout()`

### **Paso 3: Crear Lógica de Redirección** ✅
- Implementar método `_redirectByRole()` en `LoginScreen`
- Usar `switch` statement para todos los roles
- Pasar argumentos necesarios (`restaurantId`, `branchId`)

### **Paso 4: Crear Pantallas Placeholder** ⏳
- **PRIORITARIO:** `lib/screens/owner/owner_dashboard_screen.dart`
- **PRIORITARIO:** `lib/screens/driver/driver_dashboard_screen.dart`
- Opcional: Otras pantallas de roles

### **Paso 5: Configurar Rutas** ✅
- Registrar todas las rutas en `main.dart`
- Configurar `initialRoute` con verificación de sesión
- Implementar splash screen mientras verifica

### **Paso 6: Implementar Persistencia** ⏳
- Verificar token al iniciar la app
- Redirigir automáticamente si hay sesión activa
- Implementar auto-logout si el token expira

---

## 🎯 Template para Nueva Pantalla de Rol

Use este template para crear pantallas placeholder de otros roles:

```dart
// lib/screens/{role}/role_dashboard_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';

class {Role}DashboardScreen extends StatelessWidget {
  const {Role}DashboardScreen({Key? key}) : super(key: key);
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Panel de {RoleName}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              final authService = context.read<AuthService>();
              await authService.logout();
              
              if (context.mounted) {
                Navigator.pushNamedAndRemoveUntil(
                  context,
                  '/login',
                  (route) => false,
                );
              }
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.{icon_name},
              size: 80,
              color: Colors.{color},
            ),
            const SizedBox(height: 24),
            const Text(
              'Este será el panel de {RoleName}',
              style: TextStyle(fontSize: 18),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () async {
                final authService = context.read<AuthService>();
                await authService.logout();
                
                if (context.mounted) {
                  Navigator.pushNamedAndRemoveUntil(
                    context,
                    '/login',
                    (route) => false,
                  );
                }
              },
              icon: const Icon(Icons.logout),
              label: const Text('Cerrar Sesión'),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
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

## 📦 Dependencias Requeridas

Asegúrate de tener estas dependencias en `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP y API
  dio: ^5.4.0
  
  # Almacenamiento seguro
  flutter_secure_storage: ^9.0.0
  
  # State management
  provider: ^6.1.1
  
  # Geolocalización (para ordenamiento de restaurantes)
  geolocator: ^10.1.0
  
  # JSON serialization
  json_annotation: ^4.8.1

dev_dependencies:
  build_runner: ^2.4.7
  json_serializable: ^6.7.1
```

---

## 🎨 UI/UX Recomendaciones

### **Indicadores Visuales por Rol:**

| Rol | Color Principal | Icono |
|-----|-----------------|-------|
| Customer | Orange | `Icons.shopping_bag` |
| Owner | Purple | `Icons.business_center` |
| Driver | Blue | `Icons.delivery_dining` |
| Manager | Green | `Icons.manage_accounts` |
| Kitchen | Red | `Icons.restaurant_menu` |
| Admin | Dark Blue | `Icons.admin_panel_settings` |

### **Ejemplo de Badge de Rol:**

```dart
Widget _buildRoleBadge(String roleName, String roleDisplayName) {
  Color color;
  IconData icon;
  
  switch (roleName) {
    case 'customer':
      color = Colors.orange;
      icon = Icons.shopping_bag;
      break;
    case 'owner':
      color = Colors.purple;
      icon = Icons.business_center;
      break;
    case 'driver_platform':
    case 'driver_restaurant':
      color = Colors.blue;
      icon = Icons.delivery_dining;
      break;
    default:
      color = Colors.grey;
      icon = Icons.person;
  }
  
  return Chip(
    avatar: Icon(icon, color: Colors.white, size: 18),
    label: Text(
      roleDisplayName,
      style: const TextStyle(color: Colors.white),
    ),
    backgroundColor: color,
  );
}
```

---

## ⚠️ Manejo de Errores

### **Códigos de Error del Backend:**

| Código HTTP | Code | Mensaje | Acción Flutter |
|-------------|------|---------|----------------|
| `404` | `USER_NOT_FOUND` | Usuario no encontrado | Mostrar error |
| `401` | `INVALID_CREDENTIALS` | Credenciales inválidas | Mostrar error |
| `403` | `ACCOUNT_NOT_VERIFIED` | Cuenta no verificada | Ofrecer reenviar email |
| `500` | `NO_ROLES_ASSIGNED` | Usuario sin roles | Contactar soporte |

### **Implementación de Manejo:**

```dart
Future<void> _handleLogin() async {
  try {
    final loginResponse = await authService.login(email, password);
    _redirectByRole(loginResponse.data.user.roles.first.roleName, loginResponse.data.user);
  } on DioException catch (e) {
    String errorMessage = 'Error desconocido';
    
    if (e.response != null) {
      final code = e.response!.data['code'];
      
      switch (code) {
        case 'USER_NOT_FOUND':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'INVALID_CREDENTIALS':
          errorMessage = 'Correo o contraseña incorrectos';
          break;
        case 'ACCOUNT_NOT_VERIFIED':
          errorMessage = 'Cuenta no verificada. Revisa tu correo.';
          _showVerificationDialog();
          return;
        case 'NO_ROLES_ASSIGNED':
          errorMessage = 'Error de configuración. Contacta soporte.';
          break;
        default:
          errorMessage = e.response!.data['message'] ?? 'Error al iniciar sesión';
      }
    }
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(errorMessage),
        backgroundColor: Colors.red,
      ),
    );
  }
}
```

---

## 📚 Recursos Adicionales

### **Documentación Relacionada:**
- `DOCUMENTATION/Customer_Flow_Profile.md` - Gestión de perfil de cliente
- `DOCUMENTATION/Customer_Flow_Restaurants.md` - Exploración de restaurantes
- `DOCUMENTATION/Customer_Flow_Coverage.md` - Validación de cobertura
- `DOCUMENTATION/Customer_Flow_Smart_Restaurants.md` - Ordenamiento inteligente

### **Backend Endpoints Relacionados:**
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `GET /api/auth/profile` - Obtener perfil del usuario
- `GET /api/auth/verify` - Verificar validez del token

---

## 🎉 Conclusión

El backend de Delixmi **ya tiene soporte completo** para múltiples roles y proporciona toda la información necesaria en la respuesta del login. El equipo de frontend solo necesita:

1. ✅ Crear los modelos de datos (User, UserRole, LoginResponse)
2. ✅ Implementar la lógica de redirección en la pantalla de login
3. ✅ Crear pantallas placeholder para cada rol
4. ✅ Configurar las rutas en `main.dart`
5. ✅ Implementar persistencia de sesión (opcional pero recomendado)

**No se requieren cambios en el backend.** Todo está listo para la integración.

---

**Fecha de Creación:** 9 de Enero, 2025  
**Versión:** 1.0  
**Autor:** Equipo Backend Delixmi  
**Estado:** ✅ Guía Completa - Lista para Implementación

