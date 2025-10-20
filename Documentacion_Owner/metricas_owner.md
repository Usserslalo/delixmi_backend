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

#### Ejemplo de Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Billetera del restaurante obtenida exitosamente",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "data": {
    "wallet": {
      "id": 1,
      "balance": 2450.80,
      "restaurantId": 1,
      "createdAt": "2025-01-20T08:00:00.000Z",
      "updatedAt": "2025-01-27T09:45:00.000Z",
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana",
        "ownerId": 1
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
| `dateFrom` | String | No | Fecha de inicio (ISO datetime) | `2025-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin (ISO datetime) | `2025-01-31T23:59:59Z` |

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

#### Lógica del Repositorio
```javascript
static async getWalletTransactions(restaurantId, filters, requestId) {
  const { page = 1, pageSize = 10, dateFrom, dateTo } = filters;
  const skip = (page - 1) * pageSize;
  
  // Construir filtros de fecha
  const whereClause = {
    restaurantWallet: { restaurantId },
    ...(dateFrom && dateTo && {
      createdAt: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    })
  };
  
  // Ejecutar consultas en paralelo
  const [transactions, totalCount] = await Promise.all([
    prisma.restaurantWalletTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        order: {
          select: { 
            id: true, 
            total: true, 
            status: true,
            restaurantPayout: true,
            paymentMethod: true
          }
        }
      }
    }),
    prisma.restaurantWalletTransaction.count({ where: whereClause })
  ]);
  
  // Formatear transacciones (convertir Decimal a Number)
  const formattedTransactions = transactions.map(t => ({
    id: t.id,
    amount: Number(t.amount),
    type: t.type,
    description: t.description,
    orderId: t.orderId,
    createdAt: t.createdAt,
    order: t.order ? {
      id: t.order.id.toString(),
      total: Number(t.order.total),
      restaurantPayout: Number(t.order.restaurantPayout || 0),
      status: t.order.status,
      paymentMethod: t.order.paymentMethod
    } : null
  }));
  
  // Calcular metadatos de paginación
  const totalPages = Math.ceil(totalCount / pageSize);
  
  return {
    transactions: formattedTransactions,
    pagination: {
      currentPage: page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    }
  };
}
```

#### Ejemplo de Request
```bash
GET /api/restaurant/wallet/transactions?page=1&pageSize=10&dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Transacciones de billetera obtenidas exitosamente",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "data": {
    "transactions": [
      {
        "id": 1,
        "amount": 420.00,
        "type": "earning",
        "description": "Ganancias del pedido #5",
        "orderId": "5",
        "createdAt": "2025-01-27T09:45:00.000Z",
        "order": {
          "id": "5",
          "total": 505,
          "restaurantPayout": 420,
          "status": "delivered",
          "paymentMethod": "card"
        }
      },
      {
        "id": 2,
        "amount": 180.00,
        "type": "earning",
        "description": "Ganancias del pedido #3",
        "orderId": "3",
        "createdAt": "2025-01-26T14:20:00.000Z",
        "order": {
          "id": "3",
          "total": 205,
          "restaurantPayout": 180,
          "status": "delivered",
          "paymentMethod": "cash"
        }
      }
    ],
    "pagination": {
      "currentPage": 1,
      "pageSize": 10,
      "totalCount": 2,
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
| `dateFrom` | String | No | Fecha de inicio (ISO datetime) | `2025-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin (ISO datetime) | `2025-01-31T23:59:59Z` |

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['owner'])`)
3. **Verificación de Ubicación** (`requireRestaurantLocation`)
4. **Validación de Query** (`validateQuery(metricsQuerySchema)`)

#### Lógica del Repositorio
```javascript
static async getEarningsSummary(restaurantId, dateFrom, dateTo, requestId) {
  // Construir filtros de fecha
  const dateFilter = {};
  if (dateFrom && dateTo) {
    dateFilter.createdAt = {
      gte: new Date(dateFrom),
      lte: new Date(dateTo)
    };
  }
  
  // Agregar filtro de restaurante
  const whereClause = {
    restaurantWallet: { restaurantId },
    ...dateFilter
  };
  
  // Obtener estadísticas agregadas de transacciones
  const [totalEarnings, transactionCount, ordersCount, totalRevenue] = await Promise.all([
    prisma.restaurantWalletTransaction.aggregate({
      where: { ...whereClause, type: 'earning' },
      _sum: { amount: true },
      _count: true
    }),
    prisma.restaurantWalletTransaction.count({ where: whereClause }),
    prisma.order.count({
      where: {
        branch: { restaurantId },
        status: 'delivered',
        ...(dateFrom && dateTo && {
          orderDeliveredAt: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        })
      }
    }),
    prisma.order.aggregate({
      where: {
        branch: { restaurantId },
        status: 'delivered',
        ...(dateFrom && dateTo && {
          orderDeliveredAt: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        })
      },
      _sum: { restaurantPayout: true }
    })
  ]);
  
  const earnings = Number(totalEarnings._sum.amount || 0);
  const revenue = Number(totalRevenue._sum.restaurantPayout || 0);
  
  return {
    period: {
      from: dateFrom || null,
      to: dateTo || null
    },
    summary: {
      totalEarnings: earnings,
      totalRevenue: revenue,
      ordersDelivered: ordersCount,
      transactionsCount: transactionCount,
      averageOrderValue: ordersCount > 0 ? revenue / ordersCount : 0
    },
    breakdown: {
      earningsCount: totalEarnings._count || 0,
      earningsPercentage: revenue > 0 ? (earnings / revenue) * 100 : 0
    }
  };
}
```

#### Ejemplo de Request
```bash
GET /api/restaurant/metrics/earnings?dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Resumen de ganancias obtenido exitosamente",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "data": {
    "period": {
      "from": "2025-01-01T00:00:00.000Z",
      "to": "2025-01-31T23:59:59.000Z"
    },
    "summary": {
      "totalEarnings": 2450.80,
      "totalRevenue": 2800.00,
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
