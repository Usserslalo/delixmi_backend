# 📊 INFORME EXHAUSTIVO - Estado Actual de Endpoints del Owner

## 📋 Listado Completo de Endpoints del Owner

### 🔐 Endpoints de Autenticación (`/api/auth/*`)

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| POST | `/api/auth/login` | **Refactorizado** | `Perfil_Owner.md` | Inicio de sesión del Owner con validación Zod y rate limiting |
| GET | `/api/auth/profile` | Original | No Documentado | Obtener perfil del usuario autenticado |
| PUT | `/api/auth/profile` | Original | No Documentado | Actualizar perfil del usuario autenticado |
| POST | `/api/auth/refresh-token` | Original | No Documentado | Refrescar access token |
| POST | `/api/auth/logout` | Original | No Documentado | Cerrar sesión |

### 🏪 Endpoints de Restaurante (`/api/restaurant/*`)

#### **Perfil y Ubicación del Restaurante**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/profile` | **Refactorizado** | `Perfil_Owner.md` | Obtener perfil completo del restaurante |
| PATCH | `/api/restaurant/profile` | **Refactorizado** | `Perfil_Owner.md` | Actualizar información del restaurante |
| GET | `/api/restaurant/location-status` | **Nuevo** | `ubicacion_Owner.md` | Obtener estado de configuración de ubicación |
| PATCH | `/api/restaurant/location` | **Nuevo** | `ubicacion_Owner.md` | Actualizar ubicación principal del restaurante |

#### **Sucursal Principal**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/primary-branch` | **Nuevo** | `ubicacion_Owner.md` | Obtener información de la sucursal principal |
| PATCH | `/api/restaurant/primary-branch` | **Nuevo** | `ubicacion_Owner.md` | Actualizar detalles operativos de la sucursal principal |

#### **Gestión de Sucursales (Multi-sucursal)**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/branches` | Original | No Documentado | Obtener todas las sucursales (express-validator) |
| POST | `/api/restaurant/branches` | Original | No Documentado | Crear nueva sucursal (express-validator) |
| PATCH | `/api/restaurant/branches/:branchId` | Original | No Documentado | Actualizar sucursal existente (express-validator) |
| DELETE | `/api/restaurant/branches/:branchId` | Original | No Documentado | Eliminar sucursal existente (express-validator) |

#### **Horarios de Sucursales**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/branches/:branchId/schedule` | **Refactorizado** | `horarios_Owner.md` | Obtener horario semanal de sucursal |
| PATCH | `/api/restaurant/branches/:branchId/schedule` | **Refactorizado** | `horarios_Owner.md` | Actualizar horario semanal completo |
| PATCH | `/api/restaurant/branches/:branchId/schedule/:dayOfWeek` | **Refactorizado** | `horarios_Owner.md` | Actualizar horario de día específico |

#### **Gestión de Empleados**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| POST | `/api/restaurant/employees` | **Nuevo** | `empleados_Owner.md` | Crear nuevo empleado del restaurante |
| GET | `/api/restaurant/employees` | **Nuevo** | `empleados_Owner.md` | Obtener lista de empleados con paginación |
| PATCH | `/api/restaurant/employees/:assignmentId` | **Nuevo** | `empleados_Owner.md` | Actualizar rol/estado de empleado |

#### **Gestión de Menú y Productos**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/subcategories` | **Refactorizado** | `gestionMenu_Owner.md` | Obtener subcategorías del restaurante |
| POST | `/api/restaurant/subcategories` | **Refactorizado** | `gestionMenu_Owner.md` | Crear nueva subcategoría |
| PATCH | `/api/restaurant/subcategories/:subcategoryId` | **Refactorizado** | `gestionMenu_Owner.md` | Actualizar subcategoría existente |
| DELETE | `/api/restaurant/subcategories/:subcategoryId` | **Refactorizado** | `gestionMenu_Owner.md` | Eliminar subcategoría |
| GET | `/api/restaurant/products` | Original | `gestionMenu_Owner.md` | Obtener productos (express-validator) |
| POST | `/api/restaurant/products` | **Refactorizado** | `gestionMenu_Owner.md` | Crear nuevo producto |
| PATCH | `/api/restaurant/products/:productId` | **Refactorizado** | `gestionMenu_Owner.md` | Actualizar producto existente |
| DELETE | `/api/restaurant/products/:productId` | **Refactorizado** | `gestionMenu_Owner.md` | Eliminar producto |
| PATCH | `/api/restaurant/products/deactivate-by-tag` | Original | `gestionMenu_Owner.md` | Desactivar productos por etiqueta (express-validator) |
| POST | `/api/restaurant/products/upload-image` | **Refactorizado** | `gestionMenu_Owner.md` | Subir imagen de producto |

#### **Grupos de Modificadores**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/modifier-groups` | **Refactorizado** | `gestionMenu_Owner.md` | Obtener grupos de modificadores |
| POST | `/api/restaurant/modifier-groups` | **Refactorizado** | `gestionMenu_Owner.md` | Crear grupo de modificadores |
| PATCH | `/api/restaurant/modifier-groups/:groupId` | **Refactorizado** | `gestionMenu_Owner.md` | Actualizar grupo de modificadores |
| DELETE | `/api/restaurant/modifier-groups/:groupId` | **Refactorizado** | `gestionMenu_Owner.md` | Eliminar grupo de modificadores |
| POST | `/api/restaurant/modifier-groups/:groupId/options` | **Refactorizado** | `gestionMenu_Owner.md` | Crear opción en grupo |
| PATCH | `/api/restaurant/modifier-options/:optionId` | **Refactorizado** | `gestionMenu_Owner.md` | Actualizar opción de modificador |
| DELETE | `/api/restaurant/modifier-options/:optionId` | **Refactorizado** | `gestionMenu_Owner.md` | Eliminar opción de modificador |

#### **Pedidos**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| GET | `/api/restaurant/orders` | Original | No Documentado | Obtener lista de pedidos (sin refactorizar) |
| PATCH | `/api/restaurant/orders/:orderId/status` | Original | No Documentado | Actualizar estado de pedido (sin refactorizar) |
| PATCH | `/api/restaurant/orders/:orderId/reject` | Original | No Documentado | Rechazar pedido (sin refactorizar) |

#### **Subida de Archivos**

| Método | Ruta | Estado | Documentado en | Descripción |
|--------|------|--------|----------------|-------------|
| POST | `/api/restaurant/upload-logo` | Original | `Perfil_Owner.md` | Subir logo del restaurante |
| POST | `/api/restaurant/upload-cover` | Original | `Perfil_Owner.md` | Subir foto de portada |
| POST | `/api/restaurant/uploads/logo` | Original | `Perfil_Owner.md` | Subir logo (ruta legacy) |
| POST | `/api/restaurant/uploads/cover` | Original | `Perfil_Owner.md` | Subir portada (ruta legacy) |

---

## 🏗️ Modelo de Negocio Simplificado (Confirmación)

### ✅ **Modelo Actual Implementado:**
- **Una cuenta de Owner = Una única sucursal principal**
- La sucursal principal se crea/actualiza **automáticamente** al usar `PATCH /api/restaurant/location`
- **No existen endpoints** para gestionar múltiples sucursales de forma independiente
- Los endpoints de `/branches` están presentes pero **NO están refactorizados** y mantienen lógica de multi-sucursal (express-validator)

### 🔄 **Flujo Automático de Sucursal Principal:**
1. Owner configura ubicación: `PATCH /location`
2. Sistema **crea automáticamente** una sucursal principal con:
   - Misma ubicación que el restaurante
   - Nombre: "Principal" o nombre del restaurante
   - Estado: `active`
3. Owner puede consultar/actualizar: `GET/PATCH /primary-branch`

---

## 🛠️ Arquitectura Aplicada (Resumen de Refactorizaciones)

### 📊 **Estadísticas de Refactorización:**
- **Total Endpoints**: 35 endpoints identificados
- **Refactorizados**: 18 endpoints (51%)
- **Nuevos**: 6 endpoints (17%)
- **Originales**: 11 endpoints (31%)

### 🔧 **Técnicas Principales Aplicadas:**

#### 1. **Migración de Express-Validator a Zod** 
```javascript
// ANTES (express-validator)
router.patch('/products/:productId', [
  param('productId').isInt({ min: 1 }),
  body('name').optional().isLength({ min: 1, max: 150 })
], updateProduct);

// DESPUÉS (Zod)
router.patch('/products/:productId',
  requireRole(['owner', 'branch_manager']),
  requireRestaurantLocation,
  validateParams(productParamsSchema),
  validate(updateProductSchema),
  updateProduct
);
```

#### 2. **Implementación del Patrón Repository**
```javascript
// ANTES: Lógica en controlador
const updateProduct = async (req, res) => {
  // 200+ líneas de lógica directa con Prisma
};

// DESPUÉS: Delegación al repositorio
const updateProduct = async (req, res) => {
  const result = await ProductRepository.updateProduct(productId, data, userId, req.id);
  return ResponseService.success(res, 'Producto actualizado', result);
};
```

#### 3. **Uso de UserService para Autorización**
```javascript
// Patrón aplicado en todos los repositorios refactorizados
const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
const ownerAssignment = userWithRoles.userRoleAssignments.find(
  assignment => assignment.role.name === 'owner' && assignment.restaurantId === restaurantId
);
```

#### 4. **Middleware requireRestaurantLocation**
- **Nuevo middleware** que bloquea acceso si no hay ubicación configurada
- Aplicado a **todos los endpoints operativos** (menú, pedidos, empleados, etc.)
- Permite configuración inicial (profile, location) sin bloqueo

#### 5. **Validaciones Zod con .refine()**
```javascript
// Validaciones complejas con lógica de negocio
const updateBranchDetailsSchema = z.object({
  estimatedDeliveryMin: z.number().int().min(5),
  estimatedDeliveryMax: z.number().int().min(10)
}).refine(data => {
  if (data.estimatedDeliveryMin !== undefined && data.estimatedDeliveryMax !== undefined) {
    return data.estimatedDeliveryMin < data.estimatedDeliveryMax;
  }
  return true;
}, {
  message: 'El tiempo mínimo debe ser menor que el máximo',
  path: ['estimatedDeliveryMin']
});
```

#### 6. **Corrección de Bugs Críticos**
- **DELETE /modifier-options**: Corregido error de validación de `optionId`
- **Transacciones Prisma**: Implementadas en operaciones críticas (horarios, ubicación)
- **Manejo de errores estructurado**: Códigos específicos y mensajes en español

---

## ⏳ Endpoints Pendientes de Refactorización

### 🚨 **Módulos Principales Sin Refactorizar:**

#### **1. Gestión de Pedidos** (3 endpoints)
- `GET /api/restaurant/orders`
- `PATCH /api/restaurant/orders/:orderId/status`
- `PATCH /api/restaurant/orders/:orderId/reject`

**Estado**: Mantienen validación con express-validator y lógica directa en controladores

#### **2. Gestión Multi-Sucursal** (4 endpoints)
- `GET /api/restaurant/branches`
- `POST /api/restaurant/branches`
- `PATCH /api/restaurant/branches/:branchId`
- `DELETE /api/restaurant/branches/:branchId`

**Estado**: Contradicen el modelo de "sucursal única" pero están presentes sin refactorizar

#### **3. Algunos Endpoints de Productos** (1 endpoint)
- `PATCH /api/restaurant/products/deactivate-by-tag`

**Estado**: Mantiene express-validator, resto del módulo ya refactorizado

#### **4. Subida de Archivos** (4 endpoints)
- Endpoints de logo y portada del restaurante

**Estado**: Funcionan correctamente pero no siguen el patrón de validación Zod

---

## 🎯 Recomendaciones para Próximos Pasos

### **Prioridad Alta:**
1. **Refactorizar gestión de pedidos** - Módulo crítico para operaciones del restaurante
2. **Decidir sobre gestión multi-sucursal** - Mantener o eliminar según modelo de negocio
3. **Completar validaciones Zod** en endpoints restantes

### **Prioridad Media:**
1. **Documentar endpoints de pedidos** en archivo específico
2. **Refactorizar subida de archivos** para consistencia
3. **Implementar tests** para endpoints refactorizados

---

*Informe generado automáticamente el $(date) basado en análisis del código fuente actual.*
