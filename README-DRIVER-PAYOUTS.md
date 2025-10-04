# Reporte de Saldos de Repartidores (Billetera Virtual)

Este documento describe la implementación del nuevo endpoint financiero para generar reportes de saldos de repartidores utilizando la lógica de "billetera virtual".

## Endpoint

```
GET /api/admin/payouts/drivers
```

## Descripción

Este endpoint calcula el saldo final de cada repartidor en un periodo determinado, aplicando la lógica de "billetera virtual" para manejar los pagos con tarjeta y en efectivo.

## Autenticación y Autorización

- **Autenticación requerida**: Sí (Bearer Token)
- **Roles autorizados**: `super_admin`, `platform_manager`
- **Middleware**: `authenticateToken`, `requireRole`

## Parámetros de Query (Requeridos)

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `startDate` | string | Fecha de inicio del periodo (ISO 8601) | `2024-01-01` |
| `endDate` | string | Fecha de fin del periodo (ISO 8601) | `2024-01-31` |

## Lógica de Billetera Virtual

### Pagos con Tarjeta
- **Comportamiento**: El cliente paga directamente a la plataforma
- **Ganancia del repartidor**: Solo la `deliveryFee`
- **Cálculo**: `payoutBalance += deliveryFee`

### Pagos en Efectivo
- **Comportamiento**: El repartidor cobra el `total` en efectivo del cliente
- **Obligación del repartidor**: Entregar a la plataforma el costo de productos y servicios
- **Cálculo**: `payoutBalance -= (total - deliveryFee)`

### Interpretación del Saldo
- **Saldo Positivo**: La plataforma le debe dinero al repartidor
- **Saldo Negativo**: El repartidor le debe dinero a la plataforma

## Ejemplo de Uso

### Petición

```bash
curl -X GET "http://localhost:3000/api/admin/payouts/drivers?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Respuesta Exitosa (200 OK)

```json
{
  "status": "success",
  "message": "Reporte de saldos de repartidores obtenido exitosamente",
  "data": {
    "payouts": [
      {
        "driverId": 1,
        "driverName": "Juan Pérez",
        "driverEmail": "juan.perez@email.com",
        "driverPhone": "+525512345678",
        "totalDeliveries": 25,
        "payoutBalance": 1250.75,
        "balanceStatus": "positive",
        "cashOrders": {
          "count": 10,
          "totalAmount": 2500.00
        },
        "cardOrders": {
          "count": 15,
          "totalDeliveryFees": 3750.00
        },
        "orders": [
          {
            "orderId": 1001,
            "paymentMethod": "card",
            "total": 150.00,
            "deliveryFee": 25.00,
            "orderDeliveredAt": "2024-01-15T14:30:00.000Z"
          },
          {
            "orderId": 1002,
            "paymentMethod": "cash",
            "total": 200.00,
            "deliveryFee": 30.00,
            "orderDeliveredAt": "2024-01-15T16:45:00.000Z"
          }
        ]
      },
      {
        "driverId": 2,
        "driverName": "María García",
        "driverEmail": "maria.garcia@email.com",
        "driverPhone": "+525598765432",
        "totalDeliveries": 18,
        "payoutBalance": -450.50,
        "balanceStatus": "negative",
        "cashOrders": {
          "count": 12,
          "totalAmount": 1800.00
        },
        "cardOrders": {
          "count": 6,
          "totalDeliveryFees": 900.00
        },
        "orders": [...]
      }
    ],
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "totalDays": 31
    },
    "summary": {
      "totalDrivers": 2,
      "totalDeliveries": 43,
      "totalPayoutBalance": 800.25,
      "driversWithPositiveBalance": 1,
      "driversWithNegativeBalance": 1,
      "averageBalancePerDriver": 400.13
    },
    "generatedAt": "2024-01-31T23:59:59.999Z",
    "generatedBy": {
      "userId": 1,
      "userName": "Admin Usuario",
      "userEmail": "admin@delixmi.com"
    }
  }
}
```

### Respuesta Sin Datos (200 OK)

```json
{
  "status": "success",
  "message": "No se encontraron pedidos entregados por repartidores en el periodo especificado",
  "data": {
    "payouts": [],
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31",
      "totalDays": 31
    },
    "summary": {
      "totalDrivers": 0,
      "totalDeliveries": 0,
      "totalPayoutBalance": 0,
      "driversWithPositiveBalance": 0,
      "driversWithNegativeBalance": 0
    }
  }
}
```

### Respuesta de Error (400 Bad Request)

```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "La fecha de inicio es requerida",
      "param": "startDate",
      "location": "query"
    }
  ]
}
```

## Ejemplos de Cálculo de Saldo

### Repartidor con Pagos Mixtos

**Pedidos del día:**
1. Pedido #1001: Total $150, Delivery Fee $25, Pago con tarjeta
2. Pedido #1002: Total $200, Delivery Fee $30, Pago en efectivo
3. Pedido #1003: Total $120, Delivery Fee $20, Pago con tarjeta

**Cálculo:**
- Pedido #1001 (tarjeta): `+$25` (solo delivery fee)
- Pedido #1002 (efectivo): `-$170` (total - delivery fee = $200 - $30)
- Pedido #1003 (tarjeta): `+$20` (solo delivery fee)

**Saldo Final:** `$25 - $170 + $20 = -$125`
**Interpretación:** El repartidor debe $125 a la plataforma

### Repartidor Solo con Pagos con Tarjeta

**Pedidos del día:**
1. Pedido #2001: Total $100, Delivery Fee $20, Pago con tarjeta
2. Pedido #2002: Total $180, Delivery Fee $25, Pago con tarjeta

**Cálculo:**
- Pedido #2001: `+$20`
- Pedido #2002: `+$25`

**Saldo Final:** `$20 + $25 = $45`
**Interpretación:** La plataforma debe $45 al repartidor

## Casos de Uso

1. **Conciliación Financiera**: Verificar saldos pendientes con repartidores
2. **Pagos Semanales/Mensuales**: Calcular cuánto pagar a cada repartidor
3. **Auditoría de Cobros**: Verificar que los repartidores entreguen el dinero correcto
4. **Análisis de Rendimiento**: Identificar repartidores con mayor volumen y ganancias
5. **Control de Flujo de Caja**: Gestionar el flujo de efectivo de la plataforma

## Notas Técnicas

- Solo se consideran pedidos con status `delivered`
- Solo se incluyen pedidos que tienen `deliveryDriverId` asignado
- Las fechas se procesan incluyendo todo el día (00:00:00 a 23:59:59)
- Los montos se devuelven como números flotantes con 2 decimales
- Los resultados se ordenan por saldo descendente para facilitar el análisis
- Se incluye información detallada de cada pedido para auditoría

## Validaciones de Entrada

- Fechas deben estar en formato ISO 8601 (YYYY-MM-DD)
- `endDate` debe ser posterior o igual a `startDate`
- Ambos parámetros son obligatorios
- Manejo robusto de errores con mensajes descriptivos
