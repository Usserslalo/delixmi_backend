# 💰 Sistema de Métricas Financieras - Driver

## 📋 Resumen General

El sistema de métricas financieras para drivers proporciona endpoints para consultar información sobre billeteras virtuales, transacciones y resúmenes de ganancias. Estos endpoints permiten a los repartidores acceder a información detallada sobre sus ingresos.

## 🔐 Autenticación y Autorización

Todos los endpoints requieren:
- **Token JWT** válido en header `Authorization: Bearer <token>`
- **Rol** `driver_platform` o `driver_restaurant`
- **Usuario** autenticado con perfil de driver válido

---

## 📊 Endpoints Disponibles

### 1. 🏦 Consultar Saldo de Billetera

**GET** `/api/driver/wallet/balance`

#### Descripción
Obtiene el saldo actual de la billetera virtual del repartidor.

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['driver_platform', 'driver_restaurant'])`)

#### Lógica del Controlador
```javascript
const getDriverWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const wallet = await DriverRepository.getWallet(userId, req.id);
    
    return ResponseService.success(
      res,
      'Billetera obtenida exitosamente',
      { wallet }
    );
  } catch (error) {
    // Manejo de errores específicos (404, 403, etc.)
  }
};
```

#### Lógica del Repositorio
```javascript
static async getWallet(userId, requestId) {
  // Validar roles de driver
  const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
  
  // Buscar billetera del driver
  const wallet = await prisma.driverWallet.findUnique({
    where: { userId },
    include: { user: { select: { id: true, name: true, lastname: true } } }
  });
  
  if (!wallet) {
    throw { status: 404, message: 'Billetera no encontrada' };
  }
  
  // Formatear respuesta (convertir Decimal a Number)
  return {
    id: wallet.id,
    balance: Number(wallet.balance),
    userId: wallet.userId,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
    user: wallet.user
  };
}
```

#### Ejemplo de Respuesta Exitosa (200) *(Respuesta real de prueba - Postman)*
```json
{
  "status": "success",
  "message": "Billetera obtenida exitosamente",
  "timestamp": "2025-10-20T22:13:11.551Z",
  "data": {
    "wallet": {
      "id": 1,
      "driverId": 4,
      "balance": 25,
      "updatedAt": "2025-10-20T22:10:57.729Z"
    }
  }
}
```

#### Manejo de Errores

##### Error 404 - Billetera No Encontrada
```json
{
  "status": "error",
  "message": "Billetera no encontrada",
  "code": "WALLET_NOT_FOUND"
}
```

---

### 2. 📋 Consultar Transacciones

**GET** `/api/driver/wallet/transactions`

#### Descripción
Obtiene el historial de transacciones de la billetera del repartidor con paginación y filtros de fecha.

#### Parámetros de Consulta
| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `page` | Number | No | Número de página (default: 1) | `1` |
| `pageSize` | Number | No | Tamaño de página (default: 10, max: 50) | `20` |
| `dateFrom` | String | No | Fecha de inicio (ISO datetime) | `2025-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin (ISO datetime) | `2025-01-31T23:59:59Z` |

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['driver_platform', 'driver_restaurant'])`)
3. **Validación de Query** (`validateQuery(metricsQuerySchema)`)

#### Esquema de Validación
```javascript
const metricsQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0).optional().default(1),
  pageSize: z.string().regex(/^\d+$/).transform(Number).refine(val => val > 0 && val <= 50).optional().default(10),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
}).refine(data => {
  if (data.dateFrom && data.dateTo) {
    return new Date(data.dateFrom) <= new Date(data.dateTo);
  }
  return true;
});
```

#### Lógica del Repositorio
```javascript
static async getWalletTransactions(userId, filters, requestId) {
  const { page = 1, pageSize = 10, dateFrom, dateTo } = filters;
  const skip = (page - 1) * pageSize;
  
  // Construir filtros de fecha
  const whereClause = {
    driverWallet: { userId },
    ...(dateFrom && dateTo && {
      createdAt: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo)
      }
    })
  };
  
  // Ejecutar consultas en paralelo
  const [transactions, totalCount] = await Promise.all([
    prisma.driverWalletTransaction.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        order: {
          select: { id: true, total: true, status: true }
        }
      }
    }),
    prisma.driverWalletTransaction.count({ where: whereClause })
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
      status: t.order.status
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
GET /api/driver/wallet/transactions?page=1&pageSize=10&dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Ejemplo de Respuesta Exitosa (200) *(Respuesta real de prueba - Postman)*
```json
{
  "status": "success",
  "message": "Transacciones de billetera obtenidas exitosamente",
  "timestamp": "2025-10-20T22:13:47.880Z",
  "data": {
    "transactions": [
      {
        "id": "1",
        "type": "EARNING_CARD",
        "amount": 25,
        "balanceAfter": 25,
        "description": "Pedido #1",
        "createdAt": "2025-10-20T22:10:57.541Z",
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

### 3. 📈 Resumen de Ganancias

**GET** `/api/driver/metrics/earnings`

#### Descripción
Obtiene un resumen consolidado de las ganancias del repartidor en un período específico.

#### Parámetros de Consulta
| Parámetro | Tipo | Requerido | Descripción | Ejemplo |
|-----------|------|-----------|-------------|---------|
| `dateFrom` | String | No | Fecha de inicio (ISO datetime) | `2025-01-01T00:00:00Z` |
| `dateTo` | String | No | Fecha de fin (ISO datetime) | `2025-01-31T23:59:59Z` |

#### Middlewares Aplicados
1. **Autenticación** (`authenticateToken`)
2. **Control de Roles** (`requireRole(['driver_platform', 'driver_restaurant'])`)
3. **Validación de Query** (`validateQuery(metricsQuerySchema)`)

#### Lógica del Repositorio
```javascript
static async getEarningsSummary(userId, dateFrom, dateTo, requestId) {
  // Validar roles de driver
  const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
  
  // Construir filtros de fecha
  const dateFilter = {};
  if (dateFrom && dateTo) {
    dateFilter.createdAt = {
      gte: new Date(dateFrom),
      lte: new Date(dateTo)
    };
  }
  
  // Agregar filtro de usuario
  const whereClause = {
    driverWallet: { userId },
    ...dateFilter
  };
  
  // Obtener estadísticas agregadas
  const [totalEarnings, totalDebts, transactionCount, ordersCount] = await Promise.all([
    prisma.driverWalletTransaction.aggregate({
      where: { ...whereClause, type: 'earning' },
      _sum: { amount: true },
      _count: true
    }),
    prisma.driverWalletTransaction.aggregate({
      where: { ...whereClause, type: 'debt' },
      _sum: { amount: true },
      _count: true
    }),
    prisma.driverWalletTransaction.count({ where: whereClause }),
    prisma.order.count({
      where: {
        deliveryDriverId: userId,
        status: 'delivered',
        ...(dateFrom && dateTo && {
          orderDeliveredAt: {
            gte: new Date(dateFrom),
            lte: new Date(dateTo)
          }
        })
      }
    })
  ]);
  
  const earnings = Number(totalEarnings._sum.amount || 0);
  const debts = Math.abs(Number(totalDebts._sum.amount || 0));
  const netEarnings = earnings - debts;
  
  return {
    period: {
      from: dateFrom || null,
      to: dateTo || null
    },
    summary: {
      totalEarnings: earnings,
      totalDebts: debts,
      netEarnings: netEarnings,
      ordersDelivered: ordersCount,
      transactionsCount: transactionCount
    },
    breakdown: {
      earningsCount: totalEarnings._count || 0,
      debtsCount: totalDebts._count || 0
    }
  };
}
```

#### Ejemplo de Request
```bash
GET /api/driver/metrics/earnings?dateFrom=2025-01-01T00:00:00Z&dateTo=2025-01-31T23:59:59Z
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
      "totalEarnings": 150.75,
      "totalDebts": 25.00,
      "netEarnings": 125.75,
      "ordersDelivered": 8,
      "transactionsCount": 12
    },
    "breakdown": {
      "earningsCount": 8,
      "debtsCount": 4
    }
  }
}
```

---

## 🔧 Características Técnicas

### Validación de Datos
- **Zod Schemas**: Validación robusta de parámetros de consulta
- **Fecha Coherencia**: Verificación de que `dateFrom` ≤ `dateTo`
- **Límites de Paginación**: Control de `pageSize` máximo (50)

### Formateo de Datos
- **Decimal Conversion**: Conversión automática de `Decimal` a `Number`
- **BigInt Serialization**: IDs convertidos a strings para JSON
- **Timestamps**: Formato ISO 8601 consistente

### Manejo de Errores
- **404**: Billetera no encontrada
- **403**: Permisos insuficientes
- **400**: Parámetros de consulta inválidos
- **500**: Error interno del servidor

### Performance
- **Consultas Paralelas**: Uso de `Promise.all` para optimizar tiempos de respuesta
- **Paginación Eficiente**: Skip/take con índices de base de datos
- **Filtros Indexados**: Consultas optimizadas por `userId` y fechas

---

## 🔗 Relación con Sistema de Billeteras

Estos endpoints están integrados con el sistema de billeteras virtuales implementado en el `DriverRepository.completeOrder`:

- **Automatic Updates**: Las transacciones se crean automáticamente cuando se completa un pedido
- **Balance Management**: El saldo se actualiza en tiempo real
- **Transaction History**: Todas las operaciones quedan registradas para auditoría

El sistema garantiza consistencia entre la finalización de pedidos y el registro financiero, proporcionando transparencia completa de las ganancias del repartidor.
