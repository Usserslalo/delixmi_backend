# 💰 Sistema de Métricas Financieras - Owner

## 📋 Resumen General

El sistema de métricas financieras para propietarios de restaurantes proporciona endpoints para consultar información sobre billeteras virtuales, transacciones y resúmenes de ganancias del restaurante. Estos endpoints permiten a los owners acceder a información detallada sobre los ingresos de su negocio.

## 🔐 Autenticación y Autorización

Todos los endpoints requieren:
- **Token JWT** válido en header `Authorization: Bearer <token>`
- **Rol** `owner` del restaurante
- **Ubicación configurada** del restaurante (middleware `requireRestaurantLocation`)

---

## 📊 Endpoints Disponibles

### 1. 🏦 Consultar Saldo de Billetera del Restaurante

**GET** `/api/restaurant/wallet/balance`

#### Descripción
Obtiene el saldo actual de la billetera virtual del restaurante del propietario autenticado.

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['owner'])`)
3. **Verificación de Ubicación** (`requireRestaurantLocation`)

#### Lógica del Controlador
```javascript
const getRestaurantWallet = async (req, res) => {
  try {
    const ownerUserId = req.user.id;

    // Obtener restaurantId del usuario
    const restaurantId = await UserService.getRestaurantIdByOwnerId(ownerUserId, req.id);
    if (!restaurantId) {
      return ResponseService.error(
        res,
        'Restaurante no encontrado para este propietario',
        null,
        404,
        'RESTAURANT_NOT_FOUND'
      );
    }

    const wallet = await RestaurantRepository.getWallet(restaurantId, req.id);

    return ResponseService.success(
      res,
      'Billetera del restaurante obtenida exitosamente',
      { wallet },
      200
    );

  } catch (error) {
    // Manejo de errores específicos
    if (error.status === 404) {
      return ResponseService.error(res, error.message, error.details, error.status, error.code);
    }
    return ResponseService.error(res, 'Error interno del servidor', null, 500, 'INTERNAL_ERROR');
  }
};
```

#### Lógica del Repositorio
```javascript
static async getWallet(restaurantId, requestId) {
  // Buscar billetera del restaurante
  const wallet = await prisma.restaurantWallet.findUnique({
    where: { restaurantId },
    include: { 
      restaurant: { 
        select: { id: true, name: true, ownerId: true } 
      } 
    }
  });
  
  if (!wallet) {
    throw { 
      status: 404, 
      message: 'Billetera del restaurante no encontrada',
      code: 'RESTAURANT_WALLET_NOT_FOUND'
    };
  }
  
  // Formatear respuesta (convertir Decimal a Number)
  return {
    id: wallet.id,
    balance: Number(wallet.balance),
    restaurantId: wallet.restaurantId,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
    restaurant: {
      id: wallet.restaurant.id,
      name: wallet.restaurant.name,
      ownerId: wallet.restaurant.ownerId
    }
  };
}
```

#### Ejemplo de Respuesta Exitosa (200) *(Respuesta real de prueba - Postman)*
```json
{
  "status": "success",
  "message": "Billetera del restaurante obtenida exitosamente",
  "timestamp": "2025-10-20T22:12:18.970Z",
  "data": {
    "wallet": {
      "id": 1,
      "restaurantId": 1,
      "balance": 420,
      "updatedAt": "2025-10-20T22:10:58.199Z",
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana",
        "ownerId": 2
      }
    }
  }
}
```

#### Manejo de Errores

##### Error 404 - Restaurante No Encontrado
```json
{
  "status": "error",
  "message": "Restaurante no encontrado para este propietario",
  "code": "RESTAURANT_NOT_FOUND"
}
```

##### Error 404 - Billetera No Encontrada
```json
{
  "status": "error",
  "message": "Billetera del restaurante no encontrada",
  "code": "RESTAURANT_WALLET_NOT_FOUND"
}
```

---

### 2. 📋 Consultar Transacciones del Restaurante

**GET** `/api/restaurant/wallet/transactions`

#### Descripción
Obtiene el historial de transacciones de la billetera del restaurante con paginación y filtros de fecha.

#### Parámetros de Consulta
| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `page` | Number | No | Número de página (default: 1) | `1` |
| `pageSize` | Number | No | Tamaño de página (default: 10, max: 50) | `20` |
| `dateFrom` | String | No | Fecha de inicio (filtra por `createdAt` de transacciones) | `2025-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin (filtra por `createdAt` de transacciones) | `2025-01-31T23:59:59Z` |

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['owner'])`)
3. **Verificación de Ubicación** (`requireRestaurantLocation`)
4. **Validación de Query** (`validateQuery(metricsQuerySchema)`)

#### Esquema de Validación
```javascript
const metricsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/, 'La página debe ser un número').transform(Number)
    .refine(val => val > 0, 'La página debe ser mayor a 0').optional().default(1),
  pageSize: z.string().regex(/^\d+$/, 'El tamaño de página debe ser un número').transform(Number)
    .refine(val => val > 0, 'El tamaño de página debe ser mayor a 0')
    .refine(val => val <= 50, 'El tamaño de página no puede ser mayor a 50').optional().default(10),
  dateFrom: z.string().datetime('Formato de fecha inválido para dateFrom').optional(),
  dateTo: z.string().datetime('Formato de fecha inválido para dateTo').optional()
}).refine(data => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
}, {
  message: "dateFrom debe ser anterior o igual a dateTo",
  path: ["dateFrom"]
});
```

#### Lógica del Repositorio (Implementación Real)
```javascript
static async getWalletTransactions(restaurantId, filters, requestId) {
  try {
    const wallet = await prisma.restaurantWallet.findUnique({
      where: { restaurantId: restaurantId }
    });

    if (!wallet) {
      throw {
        status: 404,
        message: 'Billetera no encontrada',
        code: 'WALLET_NOT_FOUND'
      };
    }

    // Construir filtros de fecha
    let dateFilter = {};
    if (filters.dateFrom || filters.dateTo) {
      dateFilter.createdAt = {};
      if (filters.dateFrom) {
        dateFilter.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        dateFilter.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const where = {
      walletId: wallet.id,
      ...dateFilter
    };

    const skip = (filters.page - 1) * filters.pageSize;
    const take = filters.pageSize;

    const [transactions, totalCount] = await prisma.$transaction([
      prisma.restaurantWalletTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              status: true,
              total: true
            }
          }
        }
      }),
      prisma.restaurantWalletTransaction.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / filters.pageSize);

    return {
      transactions: transactions.map(tx => ({
        id: tx.id.toString(),
        type: tx.type,
        amount: Number(tx.amount),
        balanceAfter: Number(tx.balanceAfter),
        description: tx.description,
        createdAt: tx.createdAt,
        order: tx.order ? {
          id: tx.order.id.toString(),
          status: tx.order.status,
          total: Number(tx.order.total)
        } : null
      })),
      pagination: {
        currentPage: filters.page,
        pageSize: filters.pageSize,
        totalCount,
        totalPages,
        hasNextPage: filters.page < totalPages,
        hasPreviousPage: filters.page > 1
      }
    };

  } catch (error) {
    if (error.status) {
      throw error;
    }

    throw {
      status: 500,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    };
  }
}
```

#### Ejemplo de Request
```bash
GET /api/restaurant/wallet/transactions?page=1&pageSize=10&dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200) *(Respuesta real de prueba - Postman)*
```json
{
  "status": "success",
  "message": "Transacciones de billetera obtenidas exitosamente",
  "timestamp": "2025-10-20T22:14:35.474Z",
  "data": {
    "transactions": [
      {
        "id": "1",
        "type": "EARNING",
        "amount": 420,
        "balanceAfter": 420,
        "description": "Ganancia Pedido #1",
        "createdAt": "2025-10-20T22:10:58.011Z",
        "order": {
          "id": "1",
          "status": "delivered",
          "total": 505
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

---

### 3. 📈 Resumen de Ganancias del Restaurante

**GET** `/api/restaurant/metrics/earnings`

#### Descripción
Obtiene un resumen consolidado de las ganancias del restaurante en un período específico.

#### Parámetros de Consulta
| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `dateFrom` | String | No | Fecha de inicio del período (filtra por `orderDeliveredAt`) | `2025-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin del período (filtra por `orderDeliveredAt`) | `2025-01-31T23:59:59Z` |

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['owner'])`)
3. **Verificación de Ubicación** (`requireRestaurantLocation`)
4. **Validación de Query** (`validateQuery(metricsQuerySchema)`)

#### Lógica del Repositorio (Implementación Real)
```javascript
static async getEarningsSummary(restaurantId, dateFrom, dateTo, requestId) {
  try {
    // Construir filtros de fecha para las órdenes entregadas
    let dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.orderDeliveredAt = {};
      if (dateFrom) {
        dateFilter.orderDeliveredAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.orderDeliveredAt.lte = new Date(dateTo);
      }
    }

    const where = {
      branch: {
        restaurantId: restaurantId
      },
      status: 'delivered',
      ...dateFilter
    };

    const [orderStats] = await prisma.$transaction([
      prisma.order.aggregate({
        where,
        _sum: {
          restaurantPayout: true,
          subtotal: true
        },
        _count: {
          id: true
        }
      })
    ]);

    return {
      totalEarnings: Number(orderStats._sum.restaurantPayout || 0),
      totalRevenue: Number(orderStats._sum.subtotal || 0),
      totalOrders: orderStats._count.id,
      averageEarningPerOrder: orderStats._count.id > 0 
        ? Number(orderStats._sum.restaurantPayout || 0) / orderStats._count.id 
        : 0,
      period: {
        from: dateFrom || null,
        to: dateTo || null
      }
    };

  } catch (error) {
    if (error.status) {
      throw error;
    }

    throw {
      status: 500,
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    };
  }
}
```

#### Ejemplo de Request
```bash
GET /api/restaurant/metrics/earnings?dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200) *(Estructura Real del Backend)*
```json
{
  "status": "success",
  "message": "Resumen de ganancias obtenido exitosamente",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "data": {
    "totalEarnings": 726.25,
    "totalRevenue": 830.00,
    "totalOrders": 2,
    "averageEarningPerOrder": 363.125,
    "period": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z"
    }
  }
}
```

#### Campos de la Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `totalEarnings` | Number | Total de ganancias del restaurante (restaurantPayout sumado) |
| `totalRevenue` | Number | Ingresos totales (subtotal de órdenes entregadas) |
| `totalOrders` | Number | Cantidad total de órdenes entregadas |
| `averageEarningPerOrder` | Number | Ganancias promedio por orden entregada |
| `period.from` | String\|null | Fecha de inicio del período (ISO datetime) |
| `period.to` | String\|null | Fecha de fin del período (ISO datetime) |

---

## ⚠️ **CAMBIOS IMPORTANTES - ACTUALIZACIÓN DE DOCUMENTACIÓN**

### **Problemas Identificados y Corregidos**

La documentación ha sido actualizada para reflejar la **implementación real del backend** después de identificar discrepancias importantes:

#### **1. Endpoint `/metrics/earnings` - ESTRUCTURA CORREGIDA**

**❌ Estructura Documentada Anterior (INCORRECTA):**
```json
{
  "data": {
    "period": {...},
    "summary": {
      "totalEarnings": 726.25,
      "totalRevenue": 830,
      "ordersDelivered": 25,
      "transactionsCount": 28,
      "averageOrderValue": 112.00
    },
    "breakdown": {
      "earningsCount": 25,
      "earningsPercentage": 87.5
    }
  }
}
```

**✅ Estructura Real del Backend (CORREGIDA):**
```json
{
  "data": {
    "totalEarnings": 726.25,
    "totalRevenue": 830.00,
    "totalOrders": 2,
    "averageEarningPerOrder": 363.125,
    "period": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z"
    }
  }
}
```

#### **2. Filtros de Fecha - COMPORTAMIENTO CORREGIDO**

- **`/wallet/transactions`**: Filtra por `createdAt` de transacciones
- **`/metrics/earnings`**: Filtra por `orderDeliveredAt` de órdenes entregadas

#### **3. Campos de Respuesta Actualizados**

| Campo Anterior | Campo Real | Descripción |
|---------------|------------|-------------|
| `summary.ordersDelivered` | `totalOrders` | Cantidad de órdenes entregadas |
| `summary.averageOrderValue` | `averageEarningPerOrder` | Ganancias promedio por orden |
| ❌ `breakdown.earningsCount` | ✅ No incluido | Campo no disponible en respuesta real |
| ❌ `breakdown.earningsPercentage` | ✅ No incluido | Campo no disponible en respuesta real |

---

## 🔧 Características Técnicas

### Validación de Datos
- **Zod Schemas**: Validación robusta de parámetros de consulta con mensajes en español
- **Fecha Coherencia**: Verificación de que `dateFrom` ≤ `dateTo`
- **Límites de Paginación**: Control de `pageSize` máximo (50)
- **Autenticación Owner**: Verificación de que el usuario es propietario del restaurante

### Seguridad
- **Verificación de Propiedad**: Solo el owner puede acceder a los datos de su restaurante
- **Ubicación Requerida**: Middleware `requireRestaurantLocation` para restaurantes configurados
- **Control de Roles**: Acceso restringido solo al rol `owner`

### Formateo de Datos
- **Decimal Conversion**: Conversión automática de `Decimal` a `Number`
- **BigInt Serialization**: IDs convertidos a strings para JSON
- **Timestamps**: Formato ISO 8601 consistente
- **Cálculos Financieros**: Precisión en cálculos de porcentajes y promedios

### Manejo de Errores
- **404**: Restaurante o billetera no encontrada
- **403**: Permisos insuficientes o ubicación no configurada
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

### Performance
- **Consultas Paralelas**: Uso de `Promise.all` para optimizar tiempos de respuesta
- **Paginación Eficiente**: Skip/take con índices de base de datos
- **Filtros Indexados**: Consultas optimizadas por `restaurantId` y fechas
- **Agregaciones**: Uso de `aggregate` para cálculos complejos

---

## 🔗 Relación con Sistema de Billeteras

Estos endpoints están integrados con el sistema de billeteras virtuales implementado en el `DriverRepository.completeOrder`:

- **Automatic Updates**: Las transacciones del restaurante se crean automáticamente cuando se completa un pedido
- **Balance Management**: El saldo se actualiza en tiempo real con las `restaurantPayout`
- **Transaction History**: Todas las operaciones quedan registradas para auditoría
- **Commission Tracking**: Seguimiento de comisiones de plataforma y ganancias netas

El sistema garantiza consistencia entre la finalización de pedidos y el registro financiero del restaurante, proporcionando transparencia completa de las ganancias del negocio y permitiendo análisis detallado del rendimiento financiero.
