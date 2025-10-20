# 📋 INVENTARIO FINAL COMPLETO - Endpoints del Owner

## 🎯 Resumen Ejecutivo

Este inventario contiene **todos los endpoints accesibles** para usuarios autenticados con el rol `owner` en el sistema Delixmi Backend. La información está organizada por módulos funcionales y incluye detalles sobre métodos HTTP, rutas, estado actual y roles adicionales que pueden acceder a cada endpoint.

---

## 📊 Estadísticas Generales

- **Total de Endpoints**: 44 endpoints
- **Endpoints Solo Owner**: 23 endpoints
- **Endpoints Compartidos**: 21 endpoints
- **Estado Refactorizado**: 28 endpoints (64%)
- **Estado Nuevo**: 8 endpoints (18%)
- **Estado Original**: 8 endpoints (18%)

---

## 🔐 1. AUTENTICACIÓN Y PERFIL USUARIO (`/api/auth/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 1 | POST | `/api/auth/login` | **Refactorizado** | Todos | Inicio de sesión con rate limiting |
| 2 | GET | `/api/auth/profile` | Original | Todos | Obtener perfil del usuario autenticado |
| 3 | PUT | `/api/auth/profile` | Original | Todos | Actualizar perfil del usuario autenticado |
| 4 | PUT | `/api/auth/change-password` | Original | Todos | Cambiar contraseña del usuario |
| 5 | POST | `/api/auth/refresh-token` | Original | Todos | Refrescar access token |
| 6 | POST | `/api/auth/logout` | Original | Todos | Cerrar sesión |
| 7 | GET | `/api/auth/verify` | Original | Todos | Verificar validez del token |
| 8 | POST | `/api/auth/forgot-password` | Original | Todos | Solicitar reset de contraseña |
| 9 | POST | `/api/auth/reset-password` | Original | Todos | Reset de contraseña con token |

---

## 🏪 2. PERFIL Y UBICACIÓN DEL RESTAURANTE (`/api/restaurant/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 10 | GET | `/api/restaurant/profile` | **Refactorizado** | Ninguno | Obtener perfil completo del restaurante |
| 11 | PATCH | `/api/restaurant/profile` | **Refactorizado** | Ninguno | Actualizar información del restaurante |
| 12 | GET | `/api/restaurant/location-status` | **Nuevo** | Ninguno | Obtener estado de configuración de ubicación |
| 13 | PATCH | `/api/restaurant/location` | **Nuevo** | Ninguno | Actualizar ubicación principal del restaurante |
| 14 | GET | `/api/restaurant/primary-branch` | **Nuevo** | Ninguno | Obtener información de la sucursal principal |
| 15 | PATCH | `/api/restaurant/primary-branch` | **Nuevo** | Ninguno | Actualizar detalles operativos de la sucursal principal |

---

## 🏢 3. GESTIÓN DE SUCURSALES (`/api/restaurant/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 16 | GET | `/api/restaurant/branches` | Original | Ninguno | Obtener todas las sucursales con filtros |
| 17 | POST | `/api/restaurant/branches` | Original | Ninguno | Crear nueva sucursal |
| 18 | PATCH | `/api/restaurant/branches/:branchId` | Original | Ninguno | Actualizar sucursal existente |
| 19 | DELETE | `/api/restaurant/branches/:branchId` | Original | Ninguno | Eliminar sucursal existente |
| 20 | GET | `/api/restaurant/branches/:branchId/schedule` | **Refactorizado** | branch_manager | Obtener horario semanal de sucursal |
| 21 | PATCH | `/api/restaurant/branches/:branchId/schedule` | **Refactorizado** | branch_manager | Actualizar horario semanal completo |
| 22 | PATCH | `/api/restaurant/branches/:branchId/schedule/:dayOfWeek` | **Refactorizado** | branch_manager | Actualizar horario de día específico |

---

## 👥 4. GESTIÓN DE EMPLEADOS (`/api/restaurant/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 23 | POST | `/api/restaurant/employees` | **Nuevo** | Ninguno | Crear nuevo empleado del restaurante |
| 24 | GET | `/api/restaurant/employees` | **Nuevo** | Ninguno | Obtener lista de empleados con paginación |
| 25 | PATCH | `/api/restaurant/employees/:assignmentId` | **Nuevo** | Ninguno | Actualizar rol/estado de empleado |

---

## 🍽️ 5. GESTIÓN DE MENÚ Y PRODUCTOS (`/api/restaurant/*`)

### 5.1 Subcategorías
| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 26 | GET | `/api/restaurant/subcategories` | **Refactorizado** | branch_manager | Obtener subcategorías del restaurante |
| 27 | POST | `/api/restaurant/subcategories` | **Refactorizado** | branch_manager | Crear nueva subcategoría |
| 28 | PATCH | `/api/restaurant/subcategories/:subcategoryId` | **Refactorizado** | branch_manager | Actualizar subcategoría existente |
| 29 | DELETE | `/api/restaurant/subcategories/:subcategoryId` | **Refactorizado** | branch_manager | Eliminar subcategoría |

### 5.2 Productos
| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 30 | GET | `/api/restaurant/products` | **Refactorizado** | branch_manager | Obtener productos con filtros |
| 31 | POST | `/api/restaurant/products` | **Refactorizado** | branch_manager | Crear nuevo producto |
| 32 | PATCH | `/api/restaurant/products/:productId` | **Refactorizado** | branch_manager | Actualizar producto existente |
| 33 | DELETE | `/api/restaurant/products/:productId` | **Refactorizado** | branch_manager | Eliminar producto |
| 34 | PATCH | `/api/restaurant/products/deactivate-by-tag` | Original | branch_manager | Desactivar productos por etiqueta |
| 35 | POST | `/api/restaurant/products/upload-image` | **Refactorizado** | branch_manager | Subir imagen de producto |

### 5.3 Grupos de Modificadores
| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 36 | GET | `/api/restaurant/modifier-groups` | **Refactorizado** | branch_manager | Obtener grupos de modificadores |
| 37 | POST | `/api/restaurant/modifier-groups` | **Refactorizado** | branch_manager | Crear grupo de modificadores |
| 38 | PATCH | `/api/restaurant/modifier-groups/:groupId` | **Refactorizado** | branch_manager | Actualizar grupo de modificadores |
| 39 | DELETE | `/api/restaurant/modifier-groups/:groupId` | **Refactorizado** | branch_manager | Eliminar grupo de modificadores |
| 40 | POST | `/api/restaurant/modifier-groups/:groupId/options` | **Refactorizado** | branch_manager | Crear opción en grupo |
| 41 | PATCH | `/api/restaurant/modifier-options/:optionId` | **Refactorizado** | branch_manager | Actualizar opción de modificador |
| 42 | DELETE | `/api/restaurant/modifier-options/:optionId` | **Refactorizado** | branch_manager | Eliminar opción de modificador |

---

## 📦 6. GESTIÓN DE PEDIDOS (`/api/restaurant/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 43 | GET | `/api/restaurant/orders` | **Refactorizado** | branch_manager, order_manager, kitchen_staff | Obtener lista de pedidos con filtros |
| 44 | PATCH | `/api/restaurant/orders/:orderId/status` | **Refactorizado** | branch_manager, order_manager, kitchen_staff | Actualizar estado de pedido |
| 45 | PATCH | `/api/restaurant/orders/:orderId/reject` | **Refactorizado** | branch_manager, order_manager | Rechazar pedido con reembolso |

---

## 💰 7. MÉTRICAS Y FINANZAS (`/api/restaurant/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 46 | GET | `/api/restaurant/wallet/balance` | **Refactorizado** | Ninguno | Obtener saldo de la billetera |
| 47 | GET | `/api/restaurant/wallet/transactions` | **Refactorizado** | Ninguno | Obtener transacciones de la billetera |
| 48 | GET | `/api/restaurant/metrics/earnings` | **Refactorizado** | Ninguno | Obtener resumen de ganancias |

---

## 📁 8. SUBIDA DE ARCHIVOS (`/api/restaurant/*`)

| # | Método | Ruta | Estado | Roles Adicionales | Descripción |
|---|--------|------|--------|-------------------|-------------|
| 49 | POST | `/api/restaurant/upload-logo` | Original | Ninguno | Subir logo del restaurante |
| 50 | POST | `/api/restaurant/upload-cover` | Original | Ninguno | Subir foto de portada |
| 51 | POST | `/api/restaurant/uploads/logo` | Original | Ninguno | Subir logo (ruta legacy) |
| 52 | POST | `/api/restaurant/uploads/cover` | Original | Ninguno | Subir portada (ruta legacy) |

---

## 📋 Resumen por Estado de Refactorización

### ✅ **Refactorizados (28 endpoints)**
- Autenticación: 1 endpoint
- Perfil y ubicación: 6 endpoints
- Horarios de sucursales: 3 endpoints
- Gestión de empleados: 3 endpoints
- Menú y productos: 15 endpoints
- Pedidos: 3 endpoints
- Métricas: 3 endpoints

### 🆕 **Nuevos (8 endpoints)**
- Perfil y ubicación: 4 endpoints
- Gestión de empleados: 3 endpoints
- Pedidos: 1 endpoint

### 🔄 **Originales/Sin Refactorizar (8 endpoints)**
- Autenticación: 7 endpoints
- Gestión de sucursales: 4 endpoints
- Subida de archivos: 4 endpoints
- Productos: 1 endpoint

---

## 🔒 Matriz de Permisos por Rol

### **Owner (Rol Principal)**
- **Acceso Total**: 52 endpoints
- **Exclusivos**: 23 endpoints (solo owner)
- **Compartidos**: 21 endpoints (con otros roles)

### **Roles que Comparten Endpoints con Owner:**

#### **branch_manager**
- **Comparte**: 21 endpoints
- **Principales módulos**: Horarios, menú, productos, modificadores, pedidos

#### **order_manager** 
- **Comparte**: 2 endpoints
- **Módulo**: Gestión de pedidos

#### **kitchen_staff**
- **Comparte**: 1 endpoint
- **Módulo**: Consulta de pedidos únicamente

---

## 🎯 Endpoints Críticos para Implementación Flutter

### **Prioridad Alta (Esenciales para funcionamiento básico)**
1. `POST /api/auth/login` - Autenticación
2. `GET /api/restaurant/profile` - Datos del restaurante
3. `GET /api/restaurant/orders` - Lista de pedidos
4. `PATCH /api/restaurant/orders/:orderId/status` - Gestión de pedidos

### **Prioridad Media (Funcionalidades principales)**
1. Gestión de menú completa (productos, subcategorías, modificadores)
2. Gestión de empleados
3. Métricas y finanzas
4. Perfil y ubicación

### **Prioridad Baja (Funcionalidades avanzadas)**
1. Gestión multi-sucursal
2. Subida de archivos
3. Endpoints de autenticación adicionales

---

## ✅ Checklist de Confirmación

- [x] **Total de endpoints identificados**: 52 endpoints
- [x] **Endpoints organizados por módulo**: 8 módulos funcionales
- [x] **Estados de refactorización documentados**: Refactorizado/Nuevo/Original
- [x] **Roles adicionales identificados**: 3 roles adicionales
- [x] **Matriz de permisos completa**: Owner + roles compartidos
- [x] **Priorización para Flutter**: 3 niveles de prioridad

---

*Inventario generado el $(date) basado en análisis exhaustivo del código fuente en `src/routes/restaurant-admin.routes.js` y archivos relacionados.*
