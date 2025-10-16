const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../config/socket');
const { isWithinCoverage } = require('../services/geolocation.service');
const PricingService = require('../services/pricing.service');
const OrderService = require('../services/order.service');
const MercadoPagoService = require('../services/mercadopago.service');
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');

const prisma = new PrismaClient();

// Las funciones de cálculo de precios y tiempo estimado ahora están en PricingService
// La configuración de Mercado Pago ahora está en MercadoPagoService

/**
 * Crea una preferencia de pago en Mercado Pago
 * REFACTORIZADO: Ahora usa servicios dedicados siguiendo principios de Clean Code y SRP
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createPreference = async (req, res) => {
  try {
    const requestId = req.id;
    const userId = req.user.id;

    logger.info('Iniciando creación de preferencia de pago', {
      requestId,
      meta: { userId }
    });

    // 1. Validar entrada básica
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return ResponseService.validationError(
        res, 
        'Datos de entrada inválidos',
        errors.array()
      );
    }

    const { addressId, items, specialInstructions, useCart = false, restaurantId } = req.body;

    // Validaciones básicas
    if (useCart && !restaurantId) {
      return ResponseService.badRequest(
        res, 
        'El restaurantId es obligatorio cuando se usa el carrito (useCart: true)'
      );
    }

    if (!useCart && (!items || items.length === 0)) {
      return ResponseService.badRequest(
        res, 
        'Debe proporcionar items o usar el carrito (useCart: true con restaurantId)'
      );
    }

    // 2. Verificar que la dirección pertenece al usuario
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId: userId }
    });

    if (!address) {
      return ResponseService.notFound(
        res, 
        'Dirección no encontrada o no pertenece al usuario'
      );
    }

    // 3. Obtener items del carrito o validar items directos
    let itemsToProcess = [];
    let products = [];
    let branch = null;

    if (useCart) {
      // Obtener items del carrito
      const cart = await prisma.cart.findUnique({
        where: {
          userId_restaurantId: { userId: userId, restaurantId: restaurantId }
        },
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, price: true, isAvailable: true }
              }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        return ResponseService.badRequest(
          res, 
          'Carrito vacío o no encontrado'
        );
      }

      itemsToProcess = cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd
      }));
    } else {
      itemsToProcess = items;
    }

    // 4. Obtener productos y validar disponibilidad
    const productIds = itemsToProcess.map(item => item.productId);
    products = await prisma.product.findMany({
      where: { id: { in: productIds }, isAvailable: true },
      include: {
        restaurant: {
          select: {
            id: true, name: true, commissionRate: true,
            branches: {
              where: { status: 'active' },
              select: { id: true, name: true, latitude: true, longitude: true },
              take: 1
            }
          }
        }
      }
    });

    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      return ResponseService.badRequest(
        res, 
        'Algunos productos no están disponibles',
        { missingProducts: missingIds }
      );
    }

    // 5. Obtener sucursal y validar cobertura
    const firstProduct = products[0];
    if (!firstProduct.restaurant.branches || firstProduct.restaurant.branches.length === 0) {
      return ResponseService.internalError(
        res, 
        'No se encontró una sucursal activa para este restaurante'
      );
    }

    branch = firstProduct.restaurant.branches[0];

    // Validar cobertura
    const isCovered = isWithinCoverage(branch, address);
    if (!isCovered) {
      return ResponseService.conflict(
        res, 
        'Lo sentimos, tu dirección está fuera del área de entrega de esta sucursal',
        {
          restaurant: firstProduct.restaurant.name,
          branch: branch.name,
          address: `${address.street} ${address.exteriorNumber}, ${address.neighborhood}, ${address.city}`,
          deliveryRadius: `${Number(branch.deliveryRadius).toFixed(2)} km`,
          suggestion: 'Por favor, elige otra dirección o restaurante más cercano'
        },
        'OUT_OF_COVERAGE_AREA'
      );
    }

    // 6. Validar horario de la sucursal
    const validationResult = await OrderService.validateOrderProcessing(branch.id, requestId);
    if (!validationResult.isValid) {
      return ResponseService.conflict(
        res, 
        validationResult.reason,
        validationResult.details
      );
    }

    // 7. Calcular precios usando PricingService
    const pricingDetails = await PricingService.calculateOrderPricing(
      itemsToProcess, 
      products, 
      branch, 
      address, 
      requestId
    );

    // Validar precios calculados
    if (!PricingService.validatePricing(pricingDetails, requestId)) {
      return ResponseService.internalError(
        res, 
        'Error en el cálculo de precios'
      );
    }

    // 8. Calcular tiempo estimado de entrega
    const estimatedDeliveryTime = PricingService.calculateEstimatedDeliveryTime(
      pricingDetails.travelTimeMinutes || 0, 
      itemsToProcess.length,
      firstProduct.restaurant.name,
      requestId
    );

    // Agregar tiempo estimado a deliveryDetails
    if (pricingDetails.deliveryDetails) {
      pricingDetails.deliveryDetails.estimatedDeliveryTime = estimatedDeliveryTime;
    }

    // 9. Crear orden en la base de datos usando OrderService
    const createdOrder = await OrderService.createOrderInDatabase(
      itemsToProcess,
      pricingDetails,
      userId,
      branch.id,
      addressId,
      'mercadopago',
      specialInstructions,
      requestId
    );

    // 10. Preparar items para Mercado Pago
    const mpItems = itemsToProcess.map(item => {
            const product = products.find(p => p.id === item.productId);
      const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
            return {
        title: product.name,
        description: product.description || `Producto de ${product.restaurant.name}`,
              quantity: item.quantity,
        unit_price: itemPrice,
        restaurantName: product.restaurant.name
      };
    });

    // 11. Crear preferencia en Mercado Pago usando MercadoPagoService
    const externalReference = MercadoPagoService.generateExternalReference();
    const mpResponse = await MercadoPagoService.createPreference(
      mpItems,
      req.user,
      pricingDetails,
      externalReference,
      requestId
    );

    // 12. Actualizar el payment con el external reference
    await prisma.payment.updateMany({
      where: { orderId: createdOrder.id },
      data: { providerPaymentId: externalReference }
    });

    logger.info('Preferencia de pago creada exitosamente', {
      requestId,
      meta: {
        orderId: createdOrder.id,
        preferenceId: mpResponse.id,
        externalReference,
        total: pricingDetails.total
      }
    });

    // 13. Respuesta exitosa
    return ResponseService.success(
      res,
      'Preferencia de pago creada exitosamente',
      {
        init_point: mpResponse.init_point,
        preference_id: mpResponse.id,
        external_reference: externalReference,
        total: pricingDetails.total,
        subtotal: pricingDetails.subtotal,
        delivery_fee: pricingDetails.deliveryFee,
        service_fee: pricingDetails.serviceFee,
        delivery_details: pricingDetails.deliveryDetails,
        estimated_delivery_time: estimatedDeliveryTime,
        cart_used: useCart,
        cart_cleared: false,
        cart_clearing_note: "El carrito se limpiará cuando el pago sea confirmado"
      }
    );

  } catch (error) {
    logger.error('Error creando preferencia de pago', {
      requestId: req.id,
      meta: {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      }
    });
    
    // Manejar errores específicos de Mercado Pago
    if (error.response) {
      const errorDetails = MercadoPagoService.handleMercadoPagoError(error, req.id);
      return ResponseService.error(
        res, 
        errorDetails.message, 
        errorDetails.details, 
        errorDetails.status, 
        errorDetails.code
      );
    }

    return ResponseService.internalError(
      res, 
      'Error interno del servidor'
    );
  }
};

/**
 * Obtiene el estado de un pago específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user.id;

    // Buscar el pago en la base de datos
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: paymentId,
        order: {
          customerId: userId
        }
      },
      include: {
        order: {
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    restaurant: true
                  }
                }
              }
            },
            address: true
          }
        }
      }
    });

    if (!payment) {
      return ResponseService.notFound(
        res, 
        'Pago no encontrado'
      );
    }

    return ResponseService.success(
      res,
      'Estado del pago obtenido exitosamente',
      {
        payment: {
          id: payment.id,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          provider: payment.provider,
          providerPaymentId: payment.providerPaymentId,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt
        },
        order: {
          id: payment.order.id,
          status: payment.order.status,
          subtotal: payment.order.subtotal,
          deliveryFee: payment.order.deliveryFee,
          total: payment.order.total,
          specialInstructions: payment.order.specialInstructions,
          orderPlacedAt: payment.order.orderPlacedAt,
          items: payment.order.orderItems.map(item => ({
            productName: item.product.name,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            restaurant: item.product.restaurant.name
          })),
          address: payment.order.address
        }
      }
    );

  } catch (error) {
    logger.error('Error obteniendo estado del pago', {
      requestId: req.id,
      meta: {
        userId: req.user?.id,
        paymentId: req.params?.paymentId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res, 
      'Error interno del servidor'
    );
  }
};

/**
 * Crea una orden de pago en efectivo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createCashOrder = async (req, res) => {
  try {
    console.log('💵 Iniciando creación de orden de pago en efectivo...');

    // 1. Validar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Errores de validación:', errors.array());
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { addressId, items, specialInstructions, useCart = false, restaurantId } = req.body;
    const userId = req.user.id;

    console.log(`👤 Usuario: ${userId}, Dirección: ${addressId}, useCart: ${useCart}`);

    // 1.1. Validar que si useCart es true, restaurantId sea obligatorio
    if (useCart && !restaurantId) {
      return res.status(400).json({
        status: 'error',
        message: 'El restaurantId es obligatorio cuando se usa el carrito (useCart: true)'
      });
    }

    // 1.2. Validar que si no usa carrito, items sea obligatorio
    if (!useCart && (!items || items.length === 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Debe proporcionar items o usar el carrito (useCart: true con restaurantId)'
      });
    }

    // 2. Validar que la dirección existe y pertenece al usuario
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: userId
      }
    });

    if (!address) {
      console.log('❌ Dirección no encontrada o no pertenece al usuario');
      return res.status(404).json({
        status: 'error',
        message: 'Dirección no encontrada'
      });
    }

    console.log('✅ Dirección validada:', {
      id: address.id,
      alias: address.alias,
      street: address.street,
      neighborhood: address.neighborhood
    });

    // 3. Si useCart es true, obtener items del carrito
    let cartItems = [];
    let itemsToProcess = items || [];
    
    if (useCart) {
      console.log(`🛒 Obteniendo items del carrito para restaurante ${restaurantId}`);
      
      const cart = await prisma.cart.findUnique({
        where: {
          userId_restaurantId: {
            userId: userId,
            restaurantId: restaurantId
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  isAvailable: true
                }
              }
            }
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Carrito vacío o no encontrado'
        });
      }

      cartItems = cart.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtAdd: item.priceAtAdd
      }));
      
      itemsToProcess = cartItems;
      console.log(`✅ ${cartItems.length} items obtenidos del carrito`);
    }

    // 4. VALIDACIÓN DE COBERTURA TEMPRANA
    // Obtener el primer producto para determinar la sucursal
    if (!itemsToProcess || itemsToProcess.length === 0) {
      console.log('❌ No se proporcionaron productos');
      return res.status(400).json({
        status: 'error',
        message: 'Debe proporcionar al menos un producto'
      });
    }

    const firstProductId = itemsToProcess[0].productId;
    const productForBranch = await prisma.product.findUnique({
      where: { id: firstProductId },
      select: {
        restaurant: {
          select: {
            id: true,
            name: true,
            branches: {
              where: { status: 'active' },
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true,
                deliveryRadius: true
              },
              take: 1
            }
          }
        }
      }
    });

    if (productForBranch?.restaurant?.branches?.[0]) {
      const branch = productForBranch.restaurant.branches[0];
      const isCovered = isWithinCoverage(branch, address);

      if (!isCovered) {
        console.log('❌ Dirección fuera del área de cobertura:', {
          branchId: branch.id,
          branchName: branch.name,
          addressId: address.id,
          addressAlias: address.alias
        });

        return res.status(409).json({
          status: 'error',
          message: 'Lo sentimos, tu dirección está fuera del área de entrega de esta sucursal',
          code: 'OUT_OF_COVERAGE_AREA',
          details: {
            restaurant: productForBranch.restaurant.name,
            branch: branch.name,
            address: `${address.street} ${address.exteriorNumber}, ${address.neighborhood}, ${address.city}`,
            deliveryRadius: `${Number(branch.deliveryRadius).toFixed(2)} km`,
            suggestion: 'Por favor, elige otra dirección o restaurante más cercano'
          }
        });
      }

      console.log('✅ Dirección dentro del área de cobertura');
    }

    // 5. Validar y obtener productos
    const productIds = itemsToProcess.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      include: {
        restaurant: {
          include: {
            branches: true
          }
        }
      }
    });

    if (products.length !== productIds.length) {
      console.log('❌ Algunos productos no fueron encontrados');
      return res.status(404).json({
        status: 'error',
        message: 'Uno o más productos no fueron encontrados'
      });
    }

    // 6. Validar que todos los productos son del mismo restaurante
    const restaurantIds = [...new Set(products.map(p => p.restaurant.id))];
    if (restaurantIds.length > 1) {
      console.log('❌ Los productos deben ser del mismo restaurante');
      return res.status(400).json({
        status: 'error',
        message: 'Todos los productos deben ser del mismo restaurante'
      });
    }

    const restaurant = products[0].restaurant;
    console.log(`✅ Restaurante validado: ${restaurant.name} (ID: ${restaurant.id})`);

    // 7. Obtener el branchId del primer producto
    const firstProduct = products[0];
    let branchId = 1; // Valor por defecto
    
    console.log(`🔍 Producto seleccionado:`, {
      productId: firstProduct.id,
      productName: firstProduct.name,
      restaurantId: firstProduct.restaurant.id,
      restaurantName: firstProduct.restaurant.name,
      branchesCount: firstProduct.restaurant.branches ? firstProduct.restaurant.branches.length : 0,
      branches: firstProduct.restaurant.branches
    });
    
    if (firstProduct.restaurant.branches && firstProduct.restaurant.branches.length > 0) {
      branchId = firstProduct.restaurant.branches[0].id;
      console.log(`✅ BranchId obtenido del producto: ${branchId}`);
    } else {
      console.log(`⚠️ No se encontraron sucursales para el restaurante ${firstProduct.restaurant.name}, usando branchId por defecto: ${branchId}`);
    }

    // 8. Validar horario de la sucursal
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const currentTime = currentDate.toTimeString().slice(0, 8); // HH:MM:SS

    console.log(`🔍 Validando horario de sucursal ${branchId} - Día: ${currentDayOfWeek}, Hora: ${currentTime}`);

    const branchSchedule = await prisma.branchSchedule.findFirst({
      where: {
        branchId: branchId,
        dayOfWeek: currentDayOfWeek
      }
    });

    if (!branchSchedule) {
      console.log(`❌ No se encontró horario para la sucursal ${branchId} en el día ${currentDayOfWeek}`);
      return res.status(409).json({
        status: 'error',
        message: 'El restaurante está cerrado hoy'
      });
    }

    if (branchSchedule.isClosed) {
      console.log(`❌ Sucursal ${branchId} está cerrada hoy (isClosed: true)`);
      return res.status(409).json({
        status: 'error',
        message: 'El restaurante está cerrado hoy'
      });
    }

    // Validar que la hora actual esté dentro del horario de atención
    const openingTime = branchSchedule.openingTime; // Ya es string HH:MM:SS
    const closingTime = branchSchedule.closingTime; // Ya es string HH:MM:SS

    console.log(`🕐 Horario de hoy: ${openingTime} a ${closingTime}, Hora actual: ${currentTime}`);

    // Convertir tiempos a minutos para comparación correcta
    const timeToMinutes = (timeString) => {
      const [hours, minutes, seconds] = timeString.split(':').map(Number);
      return hours * 60 + minutes + seconds / 60;
    };

    const currentMinutes = timeToMinutes(currentTime);
    const openingMinutes = timeToMinutes(openingTime);
    const closingMinutes = timeToMinutes(closingTime);

    // Verificar si estamos en horario de 24 horas (00:00:00 a 23:59:59)
    const is24Hours = openingMinutes === 0 && closingMinutes >= 1439; // 23:59 = 1439 minutos

    if (!is24Hours && (currentMinutes < openingMinutes || currentMinutes > closingMinutes)) {
      console.log(`❌ Hora actual ${currentTime} está fuera del horario de atención ${openingTime}-${closingTime}`);
      return res.status(409).json({
        status: 'error',
        message: `El restaurante está cerrado en este momento. Horario de hoy: ${openingTime} a ${closingTime}`
      });
    }

    console.log(`✅ Sucursal ${branchId} está abierta - continuando con el proceso de pago`);

    // 9. Obtener la sucursal para cálculos
    const branch = firstProduct.restaurant.branches[0];

    // 10. CALCULAR PRECIOS USANDO LA FUNCIÓN CENTRALIZADA
    let pricing;
    try {
      pricing = await calculateOrderPricing(itemsToProcess, products, branch, address);
    } catch (error) {
      console.error('❌ Error calculando precios:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Error en el cálculo de precios',
        error: error.message
      });
    }

    const { subtotal, deliveryFee, serviceFee, total, deliveryDetails, travelTimeMinutes } = pricing;

    // 11. Calcular tiempo estimado de entrega
    const estimatedDeliveryTime = calculateEstimatedDeliveryTime(
      travelTimeMinutes || 0, 
      itemsToProcess.length, 
      restaurant.name
    );

    // 12. Construir items de la orden
    const orderItems = [];
    for (const item of itemsToProcess) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        console.log(`❌ Producto no encontrado: ${item.productId}`);
        return res.status(404).json({
          status: 'error',
          message: `Producto con ID ${item.productId} no encontrado`
        });
      }

      if (!product.isAvailable) {
        console.log(`❌ Producto no disponible: ${product.name}`);
        return res.status(400).json({
          status: 'error',
          message: `El producto ${product.name} no está disponible`
        });
      }

      const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
      const itemTotal = itemPrice * item.quantity;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        pricePerUnit: itemPrice,
        total: itemTotal
      });

      console.log(`✅ Producto: ${product.name} x${item.quantity} = $${itemTotal}`);
    }

    // 13. Crear orden y pago usando transacción
    console.log('💾 Creando orden y pago en efectivo...');
    
    const result = await prisma.$transaction(async (tx) => {
      // Crear la orden
      const order = await tx.order.create({
        data: {
          customerId: userId,
          branchId: branchId,
          addressId: addressId,
          status: 'pending',
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          total: total,
          commissionRateSnapshot: restaurant.commissionRate,
          platformFee: serviceFee,
          restaurantPayout: subtotal - (subtotal * restaurant.commissionRate / 100),
          paymentMethod: 'cash',
          paymentStatus: 'pending',
          specialInstructions: specialInstructions || null,
          orderPlacedAt: new Date()
        }
      });

      console.log(`✅ Orden creada con ID: ${order.id}`);

      // Crear items de la orden
      for (const item of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit
          }
        });
      }

      console.log(`✅ ${orderItems.length} items de orden creados`);

      // Crear registro de pago
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: total,
          currency: 'MXN',
          provider: 'cash',
          providerPaymentId: `cash_${order.id}_${Date.now()}`,
          status: 'pending'
        }
      });

      console.log(`✅ Pago en efectivo creado con ID: ${payment.id}`);

      return { order, payment };
    });

    // 14. Limpiar carrito del restaurante específico (solo si se usó carrito)
    if (useCart) {
      console.log('🛒 Limpiando carrito del restaurante...');
      try {
        await prisma.cart.deleteMany({
          where: {
            userId: userId,
            restaurantId: restaurant.id
          }
        });
        console.log(`✅ Carrito del restaurante ${restaurant.id} limpiado exitosamente`);
      } catch (error) {
        console.log('⚠️ Error limpiando carrito:', error.message);
        // No fallar el pedido por error en limpieza del carrito
      }
    }

    // 15. Emitir evento de nueva orden por Socket.io
    console.log('📡 Emitiendo evento de nueva orden...');
    try {
      const io = getIo();
      io.to(`branch_${branchId}`).emit('new_order', {
        orderId: Number(result.order.id),
        customerId: Number(userId),
        restaurantName: restaurant.name,
        total: Number(total),
        items: orderItems.length,
        estimatedDeliveryTime: estimatedDeliveryTime.timeRange,
        orderPlacedAt: result.order.orderPlacedAt
      });
      console.log(`✅ Evento emitido a la sala branch_${branchId}`);
    } catch (error) {
      console.log('⚠️ Socket.io no disponible:', error.message);
    }

    // 16. Respuesta exitosa
    console.log('🎉 Orden de pago en efectivo creada exitosamente');
    
    res.status(201).json({
      status: 'success',
      message: 'Orden de pago en efectivo creada exitosamente',
      data: {
        order: {
          id: Number(result.order.id),
          status: result.order.status,
          subtotal: Number(result.order.subtotal),
          deliveryFee: Number(result.order.deliveryFee),
          serviceFee: Number(result.order.platformFee),
          total: Number(result.order.total),
          paymentMethod: result.order.paymentMethod,
          paymentStatus: result.order.paymentStatus,
          estimatedDeliveryTime: estimatedDeliveryTime,
          deliveryDetails: deliveryDetails ? {
            distance: deliveryDetails.distance,
            duration: deliveryDetails.duration,
            distanceText: deliveryDetails.distanceText,
            durationText: deliveryDetails.durationText,
            calculation: deliveryDetails.calculation,
            isDefault: deliveryDetails.isDefault,
            estimatedDeliveryTime: estimatedDeliveryTime
          } : null,
          items: orderItems,
          orderPlacedAt: result.order.orderPlacedAt
        },
        payment: {
          id: Number(result.payment.id),
          amount: Number(result.payment.amount),
          currency: result.payment.currency,
          provider: result.payment.provider,
          status: result.payment.status
        },
        cartUsed: useCart,
        cartCleared: useCart,
        message: useCart ? 'Carrito del restaurante limpiado automáticamente' : 'Pedido creado desde items directos'
      }
    });

  } catch (error) {
    console.error('❌ Error creando orden de pago en efectivo:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createPreference,
  getPaymentStatus,
  createCashOrder
};
