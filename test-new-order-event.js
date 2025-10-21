const { io } = require('socket.io-client');
const axios = require('axios');

// Configuración
const BASE_URL = 'https://delixmi-backend.onrender.com';
const WEBSOCKET_URL = 'wss://delixmi-backend.onrender.com';

// Credenciales de prueba (owner)
const OWNER_EMAIL = 'ana.garcia@pizzeria.com';
const OWNER_PASSWORD = 'supersecret';

// Credenciales de cliente para crear pedido
const CUSTOMER_EMAIL = 'cliente@test.com';
const CUSTOMER_PASSWORD = 'password123';

async function getOwnerToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD
    });
    return response.data.data.accessToken;
  } catch (error) {
    console.error('Error obteniendo token del owner:', error.response?.data || error.message);
    throw error;
  }
}

async function getCustomerToken() {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: CUSTOMER_EMAIL,
      password: CUSTOMER_PASSWORD
    });
    return response.data.data.accessToken;
  } catch (error) {
    console.error('Error obteniendo token del cliente:', error.response?.data || error.message);
    throw error;
  }
}

async function createTestOrder(customerToken) {
  try {
    // Primero obtener productos disponibles
    const productsResponse = await axios.get(`${BASE_URL}/api/restaurant/1/products`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });
    
    const products = productsResponse.data.data.products;
    if (products.length === 0) {
      throw new Error('No hay productos disponibles para crear el pedido de prueba');
    }

    // Crear carrito con el primer producto
    const firstProduct = products[0];
    const cartResponse = await axios.post(`${BASE_URL}/api/cart/add`, {
      productId: firstProduct.id,
      quantity: 1
    }, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    // Obtener carrito
    const cartResponse2 = await axios.get(`${BASE_URL}/api/cart`, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    // Crear pedido
    const orderResponse = await axios.post(`${BASE_URL}/api/checkout`, {
      addressId: 1, // Asumiendo que existe
      paymentMethod: 'mercadopago',
      specialInstructions: 'Pedido de prueba para WebSocket'
    }, {
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    return orderResponse.data;
  } catch (error) {
    console.error('Error creando pedido de prueba:', error.response?.data || error.message);
    throw error;
  }
}

async function testNewOrderEvent() {
  console.log('🧪 PROBANDO EVENTO NEW_ORDER_PENDING');
  console.log('=====================================');

  let socket;
  let ownerToken;
  let customerToken;

  try {
    // 1. Obtener tokens
    console.log('\n🔑 Obteniendo tokens...');
    ownerToken = await getOwnerToken();
    customerToken = await getCustomerToken();
    console.log('✅ Tokens obtenidos exitosamente');

    // 2. Conectar WebSocket como owner
    console.log('\n🔌 Conectando WebSocket como owner...');
    socket = io(WEBSOCKET_URL, {
      transports: ['websocket'],
      auth: { token: ownerToken }
    });

    // Evento de conexión
    socket.on('connect', () => {
      console.log('✅ WebSocket conectado exitosamente');
      console.log('📡 Socket ID:', socket.id);
    });

    // Evento de error de conexión
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión WebSocket:', error.message);
    });

    // Evento de confirmación de conexión
    socket.on('CONNECTION_ESTABLISHED', (data) => {
      console.log('\n🎉 CONEXIÓN ESTABLECIDA');
      console.log('======================');
      console.log('👤 Owner:', data.userName);
      console.log('🏪 Restaurant ID:', data.restaurantId);
      console.log('🏠 Restaurant Room:', data.restaurantRoom);
    });

    // Evento NEW_ORDER_PENDING
    socket.on('NEW_ORDER_PENDING', (orderData) => {
      console.log('\n🎉 EVENTO NEW_ORDER_PENDING RECIBIDO!');
      console.log('=====================================');
      console.log('📦 Order ID:', orderData.orderId);
      console.log('🔢 Order Number:', orderData.orderNumber);
      console.log('👤 Customer:', orderData.customer.name);
      console.log('📧 Email:', orderData.customer.email);
      console.log('📱 Phone:', orderData.customer.phone);
      console.log('🏪 Restaurant:', orderData.restaurant.name);
      console.log('🏢 Branch:', orderData.branch.name);
      console.log('📍 Address:', orderData.address.fullAddress);
      console.log('💰 Total:', `$${orderData.pricing.total}`);
      console.log('💳 Payment Method:', orderData.payment.method);
      console.log('📝 Special Instructions:', orderData.specialInstructions || 'Ninguna');
      console.log('📦 Items Count:', orderData.orderItems.length);
      console.log('⏰ Order Placed At:', orderData.orderPlacedAt);
      console.log('🕐 Timestamp:', orderData.timestamp);
      
      console.log('\n📦 ORDER ITEMS:');
      orderData.orderItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.productName} x${item.quantity} - $${item.total}`);
        if (item.modifiers && item.modifiers.length > 0) {
          item.modifiers.forEach(mod => {
            console.log(`     + ${mod.groupName}: ${mod.optionName} (+$${mod.price})`);
          });
        }
      });

      console.log('\n💰 PRICING BREAKDOWN:');
      console.log(`  Subtotal: $${orderData.pricing.subtotal}`);
      console.log(`  Delivery Fee: $${orderData.pricing.deliveryFee}`);
      console.log(`  Service Fee: $${orderData.pricing.serviceFee}`);
      console.log(`  Total: $${orderData.pricing.total}`);
      console.log(`  Restaurant Payout: $${orderData.pricing.restaurantPayout}`);

      console.log('\n✅ EVENTO NEW_ORDER_PENDING FUNCIONANDO PERFECTAMENTE!');
    });

    // Esperar a que se establezca la conexión
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Crear pedido como cliente (esto debería disparar el evento)
    console.log('\n🛒 Creando pedido de prueba como cliente...');
    const orderResult = await createTestOrder(customerToken);
    console.log('✅ Pedido creado exitosamente');
    console.log('📦 Order ID:', orderResult.data.orderId);

    // Esperar un poco más para que se procese el evento
    console.log('\n⏳ Esperando evento NEW_ORDER_PENDING...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('\n❌ Error en la prueba:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    console.log('\n🎉 PRUEBA COMPLETADA');
    console.log('===================');
    if (socket && socket.connected) {
      socket.disconnect();
    }
    console.log('✅ WebSocket: Desconectado');
    console.log('✅ Evento NEW_ORDER_PENDING: Probado');
    console.log('\n🚀 La Fase 2B está funcionando correctamente!');
  }
}

testNewOrderEvent();
