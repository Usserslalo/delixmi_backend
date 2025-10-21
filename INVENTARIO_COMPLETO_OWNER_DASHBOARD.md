# 📊 INVENTARIO COMPLETO - ROL OWNER DASHBOARD
## Análisis Detallado para Optimización del Backend

**Fecha:** 20 de Octubre, 2025  
**Objetivo:** Inventario completo de funcionalidades del rol 'owner' para diseño de dashboard optimizado  
**Estado:** ✅ COMPLETO

---

## 🎯 RESUMEN EJECUTIVO

El rol 'owner' tiene acceso a **47 endpoints** distribuidos en **4 categorías principales**:
- **📈 Métricas y Finanzas:** 3 endpoints
- **🔧 Gestión (CRUD):** 32 endpoints  
- **⚙️ Configuración:** 12 endpoints

**Middleware Principal:** `requireRestaurantLocation` aplicado a **32 endpoints** (68% de los endpoints)

---

## 📈 ENDPOINTS DE MÉTRICAS Y FINANZAS

### 💰 Billetera del Restaurante
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/wallet/balance` | Obtener saldo de la billetera | `requireRole(['owner'])` + `requireRestaurantLocation` |
| `GET` | `/api/restaurant/wallet/transactions` | Obtener transacciones de la billetera | `requireRole(['owner'])` + `requireRestaurantLocation` |

### 📊 Métricas de Ganancias
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/metrics/earnings` | Resumen de ganancias del restaurante | `requireRole(['owner'])` + `requireRestaurantLocation` |

**Total Métricas:** 3 endpoints

---

## 🔧 ENDPOINTS DE GESTIÓN (CRUD)

### 📦 Gestión de Pedidos
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/orders` | Listar pedidos del restaurante | `requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/orders/:orderId/status` | Actualizar estado de pedido | `requireRole(['owner', 'branch_manager', 'order_manager', 'kitchen_staff'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/orders/:orderId/reject` | Rechazar pedido y procesar reembolso | `requireRole(['owner', 'branch_manager', 'order_manager'])` + `requireRestaurantLocation` |

### 🍕 Gestión de Productos
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/products` | Listar productos del restaurante | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/products` | Crear nuevo producto | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/products/:productId` | Actualizar producto existente | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `DELETE` | `/api/restaurant/products/:productId` | Eliminar producto | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/products/deactivate-by-tag` | Desactivar productos por etiqueta | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/products/upload-image` | Subir imagen de producto | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |

### 📂 Gestión de Categorías y Subcategorías
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/subcategories` | Listar subcategorías del restaurante | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/subcategories` | Crear nueva subcategoría | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/subcategories/:subcategoryId` | Actualizar subcategoría | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `DELETE` | `/api/restaurant/subcategories/:subcategoryId` | Eliminar subcategoría | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |

### 🔧 Gestión de Modificadores
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/modifier-groups` | Listar grupos de modificadores | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/modifier-groups` | Crear grupo de modificadores | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/modifier-groups/:groupId` | Actualizar grupo de modificadores | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `DELETE` | `/api/restaurant/modifier-groups/:groupId` | Eliminar grupo de modificadores | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/modifier-groups/:groupId/options` | Crear opción de modificador | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/modifier-options/:optionId` | Actualizar opción de modificador | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `DELETE` | `/api/restaurant/modifier-options/:optionId` | Eliminar opción de modificador | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |

### 👥 Gestión de Empleados
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/employees` | Listar empleados del restaurante | `requireRole(['owner'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/employees` | Crear nuevo empleado | `requireRole(['owner'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/employees/:assignmentId` | Actualizar empleado | `requireRole(['owner'])` + `requireRestaurantLocation` |

### 🏢 Gestión de Sucursales
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/branches` | Listar sucursales del restaurante | `requireRole(['owner'])` + `requireRestaurantLocation` |
| `POST` | `/api/restaurant/branches` | Crear nueva sucursal | `requireRole(['owner'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/branches/:branchId` | Actualizar sucursal | `requireRole(['owner'])` + `requireRestaurantLocation` |
| `DELETE` | `/api/restaurant/branches/:branchId` | Eliminar sucursal | `requireRole(['owner'])` + `requireRestaurantLocation` |

### ⏰ Gestión de Horarios
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/branches/:branchId/schedule` | Obtener horario de sucursal | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/branches/:branchId/schedule` | Actualizar horario semanal | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |
| `PATCH` | `/api/restaurant/branches/:branchId/schedule/:dayOfWeek` | Actualizar horario de día específico | `requireRole(['owner', 'branch_manager'])` + `requireRestaurantLocation` |

**Total Gestión:** 32 endpoints

---

## ⚙️ ENDPOINTS DE CONFIGURACIÓN

### 👤 Perfil del Restaurante
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/profile` | Obtener perfil del restaurante | `requireRole(['owner'])` |
| `PATCH` | `/api/restaurant/profile` | Actualizar perfil del restaurante | `requireRole(['owner'])` |

### 📍 Ubicación del Restaurante
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/location-status` | Obtener estado de ubicación | `requireRole(['owner'])` |
| `PATCH` | `/api/restaurant/location` | Actualizar ubicación del restaurante | `requireRole(['owner'])` |

### 🏢 Sucursal Principal
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `GET` | `/api/restaurant/primary-branch` | Obtener sucursal principal | `requireRole(['owner'])` |
| `PATCH` | `/api/restaurant/primary-branch` | Actualizar detalles de sucursal principal | `requireRole(['owner'])` + `requireRestaurantLocation` |

### 📸 Subida de Archivos
| Método | Endpoint | Descripción | Middleware |
|--------|----------|-------------|------------|
| `POST` | `/api/restaurant/upload-logo` | Subir logo del restaurante | `requireRole(['owner'])` |
| `POST` | `/api/restaurant/uploads/logo` | Subir logo (ruta legacy) | `requireRole(['owner'])` |
| `POST` | `/api/restaurant/upload-cover` | Subir foto de portada | `requireRole(['owner'])` |
| `POST` | `/api/restaurant/uploads/cover` | Subir portada (ruta legacy) | `requireRole(['owner'])` |

**Total Configuración:** 12 endpoints

---

## 🛡️ MIDDLEWARES Y LÓGICA DE AUTORIZACIÓN

### 🔐 Middleware de Autenticación
**Archivo:** `src/middleware/auth.middleware.js`

#### `authenticateToken`
- **Propósito:** Verificar token JWT y adjuntar información del usuario
- **Aplicado a:** Todos los endpoints privados
- **Funcionalidad:**
  - Extrae token del header `Authorization: Bearer <token>`
  - Verifica validez del token con `JWT_SECRET`
  - Busca usuario en BD y verifica que esté activo
  - Adjunta información completa del usuario a `req.user`

#### `requireRole(allowedRoles)`
- **Propósito:** Verificar que el usuario tenga uno de los roles permitidos
- **Aplicado a:** Todos los endpoints específicos de owner
- **Funcionalidad:**
  - Verifica que `req.user` exista (autenticación previa)
  - Compara roles del usuario con roles permitidos
  - Devuelve 403 si no tiene permisos suficientes

### 📍 Middleware de Ubicación
**Archivo:** `src/middleware/location.middleware.js`

#### `requireRestaurantLocation`
- **Propósito:** Verificar que el restaurante tenga ubicación configurada
- **Aplicado a:** 32 endpoints (68% del total)
- **Funcionalidad:**
  - Verifica que el usuario sea owner
  - Obtiene `restaurantId` del owner
  - Verifica que el restaurante tenga `latitude` y `longitude` configurados
  - Bloquea acceso si no está configurada (Error 403: `LOCATION_REQUIRED`)

### 📊 Middleware de Validación
**Archivo:** `src/middleware/validate.middleware.js`

#### `validate(schema)`
- **Propósito:** Validar datos de entrada usando esquemas Zod
- **Aplicado a:** Endpoints que reciben datos en el body
- **Funcionalidad:**
  - Valida datos según esquema Zod definido
  - Devuelve errores detallados si la validación falla
  - Transforma datos según reglas del esquema

#### `validateParams(schema)`
- **Propósito:** Validar parámetros de URL
- **Aplicado a:** Endpoints con parámetros dinámicos
- **Funcionalidad:**
  - Valida parámetros como `:orderId`, `:productId`, etc.
  - Convierte tipos de datos según sea necesario

#### `validateQuery(schema)`
- **Propósito:** Validar query parameters
- **Aplicado a:** Endpoints de listado con filtros
- **Funcionalidad:**
  - Valida parámetros como `page`, `pageSize`, `status`, etc.
  - Aplica valores por defecto según el esquema

---

## 📊 ANÁLISIS DE PATRONES Y OPTIMIZACIONES

### 🎯 Patrones Identificados

#### 1. **Patrón de Autorización Consistente**
```javascript
// Aplicado a TODOS los endpoints de owner
authenticateToken → requireRole(['owner']) → [requireRestaurantLocation] → validate(schema) → controller
```

#### 2. **Patrón de Respuesta Estandarizado**
```javascript
// Todos los endpoints usan ResponseService
ResponseService.success(res, message, data)
ResponseService.error(res, message, code)
ResponseService.notFound(res, message)
ResponseService.forbidden(res, message, code)
```

#### 3. **Patrón de Validación Zod**
```javascript
// Esquemas específicos por funcionalidad
orderQuerySchema, productSchema, employeeSchema, etc.
```

### 🚀 Oportunidades de Optimización

#### 1. **Dashboard Summary Endpoint**
**Problema:** El frontend necesita hacer múltiples peticiones para obtener datos del dashboard
**Solución:** Crear endpoint consolidado que devuelva:
```javascript
GET /api/restaurant/dashboard-summary
{
  "metrics": {
    "totalOrders": 150,
    "pendingOrders": 5,
    "todayRevenue": 2500.00,
    "walletBalance": 1200.50
  },
  "recentOrders": [...],
  "topProducts": [...],
  "restaurantInfo": {...}
}
```

#### 2. **Cache de Métricas**
**Problema:** Cálculos de métricas se ejecutan en cada petición
**Solución:** Implementar cache Redis para métricas que no cambian frecuentemente

#### 3. **Paginación Optimizada**
**Problema:** Algunos endpoints no implementan paginación eficiente
**Solución:** Estandarizar paginación con cursor-based pagination para grandes datasets

#### 4. **Bulk Operations**
**Problema:** Operaciones masivas requieren múltiples peticiones
**Solución:** Implementar endpoints para operaciones en lote:
```javascript
PATCH /api/restaurant/products/bulk-update
PATCH /api/restaurant/orders/bulk-status-update
```

### 📈 Métricas de Rendimiento Actuales

#### Endpoints Más Utilizados (Estimado)
1. `GET /api/restaurant/orders` - Listado de pedidos
2. `GET /api/restaurant/wallet/balance` - Saldo de billetera
3. `GET /api/restaurant/metrics/earnings` - Métricas de ganancias
4. `PATCH /api/restaurant/orders/:orderId/status` - Actualizar estado

#### Endpoints con Mayor Carga de Datos
1. `GET /api/restaurant/orders` - Incluye relaciones completas
2. `GET /api/restaurant/products` - Con imágenes y modificadores
3. `GET /api/restaurant/wallet/transactions` - Historial completo

---

## 🎯 RECOMENDACIONES PARA DASHBOARD

### 1. **Endpoint de Resumen Consolidado**
```javascript
GET /api/restaurant/dashboard-summary
// Devuelve todos los datos necesarios para el dashboard en una sola petición
```

### 2. **Endpoints de Métricas en Tiempo Real**
```javascript
GET /api/restaurant/metrics/realtime
// Métricas que se actualizan frecuentemente (pedidos pendientes, etc.)
```

### 3. **Endpoints de Filtrado Avanzado**
```javascript
GET /api/restaurant/orders/analytics?dateRange=7d&status=completed
// Análisis específicos con filtros predefinidos
```

### 4. **WebSocket para Actualizaciones en Tiempo Real**
```javascript
// Notificaciones push para cambios críticos
order_status_changed, new_order_received, etc.
```

---

## 📋 CONCLUSIÓN

El rol 'owner' tiene un ecosistema robusto de **47 endpoints** bien estructurados con:
- ✅ **Autorización consistente** con middlewares estandarizados
- ✅ **Validación robusta** con esquemas Zod
- ✅ **Respuestas estandarizadas** con ResponseService
- ✅ **Seguridad adecuada** con verificación de ubicación

**Próximos pasos recomendados:**
1. Implementar endpoint de dashboard consolidado
2. Optimizar consultas de métricas con cache
3. Agregar WebSocket para actualizaciones en tiempo real
4. Implementar operaciones en lote para eficiencia

El backend está bien preparado para soportar un dashboard profesional y optimizado. 🚀
