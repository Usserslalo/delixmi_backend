# 🔌 Integración Socket.io - Notificaciones en Tiempo Real

## 📋 Resumen

Se ha implementado exitosamente la integración de Socket.io en la aplicación Delixmi Backend para proporcionar notificaciones en tiempo real cuando se confirman pedidos a través del webhook de Mercado Pago.

## 🚀 Funcionalidades Implementadas

### ✅ 1. Configuración de Socket.io
- **Archivo**: `src/config/socket.js`
- **Funcionalidades**:
  - Inicialización de Socket.io con configuración CORS
  - Gestión de salas por sucursal (`branch_1`, `branch_2`, etc.)
  - Eventos de conexión y desconexión
  - Estadísticas de conexión en tiempo real
  - Manejo robusto de errores

### ✅ 2. Integración en el Servidor
- **Archivo**: `src/server.js`
- **Cambios**:
  - Creación de servidor HTTP con `http.createServer()`
  - Inicialización de Socket.io
  - Configuración de CORS para Socket.io

### ✅ 3. Notificaciones Automáticas
- **Archivo**: `src/controllers/webhook.controller.js`
- **Funcionalidades**:
  - Emisión automática de eventos cuando un pago es aprobado
  - Envío de notificaciones solo a la sucursal específica
  - Datos completos del pedido en la notificación

## 📡 Eventos Socket.io Disponibles

### Eventos del Cliente → Servidor

| Evento | Descripción | Parámetros |
|--------|-------------|------------|
| `join_branch_room` | Unirse a una sala de sucursal | `{ branchId: number }` |
| `leave_branch_room` | Salir de una sala de sucursal | `{ branchId: number }` |
| `get_connection_info` | Obtener información de conexión | - |

### Eventos del Servidor → Cliente

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `new_order` | Nuevo pedido confirmado | Objeto completo del pedido |
| `joined_branch_room` | Confirmación de unión a sala | `{ branchId, room, message }` |
| `left_branch_room` | Confirmación de salida de sala | `{ branchId, room, message }` |
| `connection_info` | Información de conexión | `{ socketId, connectedAt, rooms }` |
| `room_stats` | Estadísticas de la sala | `{ room, connectedClients }` |
| `error` | Error en operación | `{ message }` |

## 🔧 Estructura de la Notificación `new_order`

```javascript
{
  type: 'new_order',
  orderId: 123,
  orderNumber: '000123',
  customer: {
    id: 456,
    name: 'Juan',
    lastname: 'Pérez',
    email: 'juan@example.com',
    phone: '+525512345678'
  },
  items: [
    {
      id: 789,
      productName: 'Pizza Margherita',
      quantity: 2,
      unitPrice: 150.00,
      totalPrice: 300.00
    }
  ],
  address: {
    id: 101,
    alias: 'Casa',
    street: 'Av. Reforma 123',
    exterior_number: '123',
    interior_number: 'A',
    neighborhood: 'Centro',
    city: 'Ciudad de México',
    state: 'CDMX',
    zip_code: '06000',
    latitude: 19.4326,
    longitude: -99.1332
  },
  payment: {
    amount: 350.00,
    status: 'completed',
    providerPaymentId: '1234567890'
  },
  orderStatus: 'confirmed',
  paymentStatus: 'completed',
  totalAmount: 350.00,
  createdAt: '2024-01-01T12:00:00.000Z',
  confirmedAt: '2024-01-01T12:01:00.000Z',
  branchId: 1,
  timestamp: '2024-01-01T12:01:00.000Z'
}
```

## 💻 Implementación en el Frontend

### Conexión Básica

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Unirse a una sala de sucursal
socket.emit('join_branch_room', { branchId: 1 });

// Escuchar nuevos pedidos
socket.on('new_order', (orderData) => {
  console.log('Nuevo pedido recibido:', orderData);
  // Actualizar la UI con el nuevo pedido
  updateOrdersList(orderData);
});

// Confirmación de unión a sala
socket.on('joined_branch_room', (data) => {
  console.log('Conectado a sala:', data.room);
});

// Manejar errores
socket.on('error', (error) => {
  console.error('Error de Socket.io:', error);
});
```

### Ejemplo con React

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function RestaurantDashboard({ branchId }) {
  const [socket, setSocket] = useState(null);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Conectar al servidor
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    // Unirse a la sala de la sucursal
    newSocket.emit('join_branch_room', { branchId });

    // Escuchar nuevos pedidos
    newSocket.on('new_order', (orderData) => {
      setOrders(prev => [orderData, ...prev]);
      
      // Mostrar notificación
      showNotification(`Nuevo pedido #${orderData.orderNumber} de ${orderData.customer.name}`);
    });

    // Cleanup
    return () => {
      newSocket.emit('leave_branch_room', { branchId });
      newSocket.close();
    };
  }, [branchId]);

  return (
    <div>
      <h2>Pedidos en Tiempo Real</h2>
      {orders.map(order => (
        <div key={order.orderId} className="order-card">
          <h3>Pedido #{order.orderNumber}</h3>
          <p>Cliente: {order.customer.name} {order.customer.lastname}</p>
          <p>Total: ${order.totalAmount}</p>
          <p>Estado: {order.orderStatus}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🔧 Configuración del Entorno

### Variables de Entorno

```env
# URL del frontend para CORS
FRONTEND_URL=http://localhost:3000

# Puerto del servidor
PORT=3000
```

### Instalación de Dependencias

```bash
# Socket.io ya está instalado en package.json
npm install socket.io socket.io-client
```

## 📊 Monitoreo y Logs

### Logs del Servidor

El servidor registra automáticamente:
- ✅ Conexiones y desconexiones de clientes
- ✅ Unión a salas de sucursales
- ✅ Emisión de notificaciones
- ✅ Estadísticas de conexión cada 30 segundos
- ❌ Errores de Socket.io

### Ejemplo de Logs

```
🔌 Socket.io inicializado correctamente
🔗 Cliente conectado: abc123def456
📍 Cliente abc123def456 se unió a la sala: branch_1
📡 Notificación enviada a la sala: branch_1
📊 Estadísticas Socket.io - Clientes conectados: 3
```

## 🛡️ Seguridad y Consideraciones

### ✅ Implementadas
- **CORS configurado** para el frontend específico
- **Validación de branchId** en eventos
- **Manejo de errores** robusto
- **Logs detallados** para debugging
- **Transacciones de base de datos** atómicas

### 🔒 Recomendaciones Adicionales
- **Autenticación JWT** en eventos sensibles
- **Rate limiting** para prevenir spam
- **Validación de permisos** por sucursal
- **Encriptación** para datos sensibles

## 🧪 Testing

### Probar la Conexión

```bash
# 1. Iniciar el servidor
npm run dev

# 2. Verificar que Socket.io esté funcionando
# Buscar en los logs: "🔌 Socket.io inicializado correctamente"

# 3. Probar webhook de Mercado Pago
# Enviar una notificación de pago aprobado

# 4. Verificar notificación en tiempo real
# Los logs mostrarán: "📡 Notificación enviada a la sala: branch_X"
```

### Herramientas de Testing

- **Socket.io Client Tools**: Para probar conexiones
- **Postman**: Para simular webhooks
- **Browser DevTools**: Para debugging en el frontend

## 🚀 Próximos Pasos

### Funcionalidades Futuras
- [ ] **Notificaciones push** para móviles
- [ ] **Chat en tiempo real** entre cliente y restaurante
- [ ] **Actualizaciones de estado** de pedidos
- [ ] **Notificaciones a repartidores**
- [ ] **Dashboard en tiempo real** con métricas

### Optimizaciones
- [ ] **Redis adapter** para múltiples instancias
- [ ] **Compresión** de datos
- [ ] **Reconexión automática** en el frontend
- [ ] **Persistencia** de mensajes

## 📞 Soporte

Para cualquier problema o pregunta sobre la implementación de Socket.io:

1. **Revisar logs** del servidor
2. **Verificar conexión** del frontend
3. **Validar branchId** en eventos
4. **Comprobar CORS** configuration

---

**✅ Implementación completada exitosamente**

La integración de Socket.io está lista para uso en producción. Los restaurantes recibirán notificaciones instantáneas cuando se confirman nuevos pedidos, mejorando significativamente la experiencia del usuario y la eficiencia operativa.
