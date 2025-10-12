const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const { calculateDistance, calculateDeliveryFee } = require('../config/maps');
const { getIo } = require('../config/socket');
const { isWithinCoverage } = require('../services/geolocation.service');

const prisma = new PrismaClient();

/**
 * Redondea un número a 2 decimales para cálculos monetarios
 * @param {number} num - Número a redondear
 * @returns {number} Número redondeado a 2 decimales
 */
const roundToTwoDecimals = (num) => {
  return Math.round(num * 100) / 100;
};

/**
 * Calcula los precios de una orden de manera centralizada
 * @param {Array} items - Items del pedido con productId, quantity, y opcionalmente priceAtAdd
 * @param {Array} products - Productos obtenidos de la base de datos
 * @param {Object} branch - Sucursal del restaurante
 * @param {Object} address - Dirección de entrega
 * @returns {Promise<Object>} Objeto con subtotal, deliveryFee, serviceFee, total y deliveryDetails
 */
const calculateOrderPricing = async (items, products, branch, address) => {
  // 1. Calcular subtotal
  let subtotal = 0;
  
  for (const item of items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      throw new Error(`Producto con ID ${item.productId} no encontrado`);
    }
    
    // Usar priceAtAdd que incluye modificadores, o product.price como fallback
    const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
    const itemTotal = itemPrice * item.quantity;
    subtotal += itemTotal;
  }

  // Redondear subtotal a 2 decimales
  subtotal = roundToTwoDecimals(subtotal);

  // 2. Calcular tarifa de envío dinámicamente basada en distancia
  let deliveryFee = 25.00; // Valor por defecto en caso de error
  let deliveryDetails = null;
  let travelTimeMinutes = 0;

  try {
    // Obtener coordenadas de la dirección de entrega
    const destinationCoords = {
      latitude: Number(address.latitude),
      longitude: Number(address.longitude)
    };

    // Obtener coordenadas de la sucursal
    const originCoords = {
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude)
    };

    // Calcular distancia usando Google Maps
    const distanceResult = await calculateDistance(originCoords, destinationCoords);
    
    // Calcular tarifa de envío basada en la distancia
    const feeCalculation = calculateDeliveryFee(distanceResult.distance);
    deliveryFee = feeCalculation.tarifaFinal;
    travelTimeMinutes = distanceResult.duration;
    
    deliveryDetails = {
      distance: distanceResult.distance,
      duration: distanceResult.duration,
      distanceText: distanceResult.distanceText,
      durationText: distanceResult.durationText,
      calculation: feeCalculation,
      isDefault: distanceResult.isDefault || false
    };

    console.log('✅ Cálculo de tarifa de envío:', {
      origin: `${originCoords.latitude}, ${originCoords.longitude}`,
      destination: `${destinationCoords.latitude}, ${destinationCoords.longitude}`,
      distance: distanceResult.distance,
      deliveryFee: deliveryFee,
      travelTimeMinutes: travelTimeMinutes,
      isDefault: distanceResult.isDefault
    });
  } catch (error) {
    console.error('❌ Error calculando tarifa de envío:', error);
    console.warn('⚠️ Usando valores por defecto debido a error');
    deliveryDetails = {
      isDefault: true,
      error: error.message
    };
  }

  // Redondear deliveryFee a 2 decimales
  deliveryFee = roundToTwoDecimals(deliveryFee);

  // 3. Calcular cuota de servicio (5% del subtotal ya redondeado)
  const serviceFee = roundToTwoDecimals(subtotal * 0.05);
  
  // 4. Calcular total (suma de componentes ya redondeados, y redondear el resultado)
  const total = roundToTwoDecimals(subtotal + deliveryFee + serviceFee);

  console.log('💰 Cálculo de precios centralizado (con redondeo):', {
    subtotal: subtotal.toFixed(2),
    deliveryFee: deliveryFee.toFixed(2),
    serviceFee: serviceFee.toFixed(2),
    total: total.toFixed(2),
    itemsCount: items.length,
    note: 'Todos los valores redondeados a 2 decimales'
  });

  return {
    subtotal,
    deliveryFee,
    serviceFee,
    total,
    deliveryDetails,
    travelTimeMinutes
  };
};

/**
 * Calcula el tiempo estimado de entrega basado en tiempo de viaje y preparación
 * @param {number} travelTimeMinutes - Tiempo de viaje en minutos (desde Google Maps)
 * @param {number} itemCount - Número de productos en el pedido
 * @param {string} restaurantName - Nombre del restaurante (para logging)
 * @returns {Object} Objeto con información del tiempo estimado
 */
const calculateEstimatedDeliveryTime = (travelTimeMinutes, itemCount, restaurantName) => {
  // Tiempo base de preparación (15-25 minutos)
  const basePreparationTime = 20; // 20 minutos como promedio
  
  // Ajuste basado en la cantidad de productos
  // Más productos = más tiempo de preparación
  let preparationTimeAdjustment = 0;
  if (itemCount > 3) {
    preparationTimeAdjustment = Math.ceil((itemCount - 3) * 2); // +2 minutos por producto adicional
  }
  
  const totalPreparationTime = basePreparationTime + preparationTimeAdjustment;
  
  // Si no tenemos datos de viaje, usar tiempo por defecto
  const effectiveTravelTime = travelTimeMinutes > 0 ? travelTimeMinutes : 15; // 15 min por defecto
  
  // Calcular rangos de tiempo
  const minTotalTime = totalPreparationTime + effectiveTravelTime;
  const maxTotalTime = minTotalTime + 10; // Agregar 10 minutos de buffer
  
  // Convertir a formato legible
  const formatTimeRange = (min, max) => {
    if (min === max) {
      return `${min} min`;
    }
    return `${min}-${max} min`;
  };
  
  const timeRange = formatTimeRange(minTotalTime, maxTotalTime);
  
  // Calcular tiempo estimado de entrega (timestamp)
  const now = new Date();
  const estimatedDeliveryTime = new Date(now.getTime() + (maxTotalTime * 60 * 1000));
  
  const result = {
    timeRange: timeRange,
    minMinutes: minTotalTime,
    maxMinutes: maxTotalTime,
    preparationTime: {
      base: basePreparationTime,
      adjustment: preparationTimeAdjustment,
      total: totalPreparationTime
    },
    travelTime: effectiveTravelTime,
    estimatedDeliveryAt: estimatedDeliveryTime.toISOString(),
    breakdown: {
      preparation: `${totalPreparationTime} min`,
      travel: `${effectiveTravelTime} min`,
      buffer: '10 min',
      total: timeRange
    }
  };
  
  console.log(`🕐 Tiempo estimado calculado para ${restaurantName}:`, {
    itemCount,
    preparationTime: result.preparationTime,
    travelTime: effectiveTravelTime,
    timeRange: timeRange,
    estimatedDeliveryAt: estimatedDeliveryTime.toLocaleString()
  });
  
  return result;
};

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

const preference = new Preference(client);

/**
 * Crea una preferencia de pago en Mercado Pago
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createPreference = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { addressId, items, specialInstructions, useCart = false, restaurantId } = req.body;
    const userId = req.user.id;

    // 1. Validar que si useCart es true, restaurantId sea obligatorio
    if (useCart && !restaurantId) {
      return res.status(400).json({
        status: 'error',
        message: 'El restaurantId es obligatorio cuando se usa el carrito (useCart: true)'
      });
    }

    // Validar que si no usa carrito, items sea obligatorio
    if (!useCart && (!items || items.length === 0)) {
      return res.status(400).json({
        status: 'error',
        message: 'Debe proporcionar items o usar el carrito (useCart: true con restaurantId)'
      });
    }

    // 2. Verificar que la dirección pertenece al usuario
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: userId
      }
    });

    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Dirección no encontrada o no pertenece al usuario'
      });
    }

    // 3. VALIDACIÓN DE COBERTURA TEMPRANA
    // Obtener el branchId antes de procesar los items
    let branchIdForValidation = null;
    
    if (useCart && restaurantId) {
      // Si usa carrito, obtener la primera sucursal del restaurante
      const restaurantData = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: {
          branches: {
            where: { status: 'active' },
            select: { id: true, latitude: true, longitude: true, deliveryRadius: true, name: true },
            take: 1
          }
        }
      });
      
      if (restaurantData?.branches?.[0]) {
        branchIdForValidation = restaurantData.branches[0].id;
      }
    } else if (items && items.length > 0) {
      // Si no usa carrito, obtener la sucursal del primer producto
      const firstProduct = await prisma.product.findUnique({
        where: { id: items[0].productId },
        select: {
          restaurant: {
            select: {
              branches: {
                where: { status: 'active' },
                select: { id: true, latitude: true, longitude: true, deliveryRadius: true, name: true },
                take: 1
              }
            }
          }
        }
      });
      
      if (firstProduct?.restaurant?.branches?.[0]) {
        branchIdForValidation = firstProduct.restaurant.branches[0].id;
      }
    }

    // Validar cobertura si tenemos branchId
    if (branchIdForValidation) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchIdForValidation },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          deliveryRadius: true,
          restaurant: {
            select: {
              name: true
            }
          }
        }
      });

      if (branch) {
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
              restaurant: branch.restaurant.name,
              branch: branch.name,
              address: `${address.street} ${address.exteriorNumber}, ${address.neighborhood}, ${address.city}`,
              deliveryRadius: `${Number(branch.deliveryRadius).toFixed(2)} km`,
              suggestion: 'Por favor, elige otra dirección o restaurante más cercano'
            }
          });
        }
        
        console.log('✅ Dirección dentro del área de cobertura');
      }
    }

    // 4. Si useCart es true, obtener items del carrito
    let cartItems = [];
    if (useCart) {
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
    }

    // 5. Obtener información de los productos y verificar precios
    const productIds = useCart ? cartItems.map(item => item.productId) : items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isAvailable: true
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            commissionRate: true,
            branches: {
              where: {
                status: 'active'
              },
              select: {
                id: true,
                name: true,
                latitude: true,
                longitude: true
              },
              take: 1 // Solo necesitamos la primera sucursal activa
            }
          }
        },
        subcategory: {
          select: {
            name: true
          }
        }
      }
    });

    // Verificar que todos los productos existen y están disponibles
    if (products.length !== productIds.length) {
      const foundIds = products.map(p => p.id);
      const missingIds = productIds.filter(id => !foundIds.includes(id));
      
      return res.status(400).json({
        status: 'error',
        message: 'Algunos productos no están disponibles',
        missingProducts: missingIds
      });
    }

    // 6. Obtener la sucursal para cálculos
    const firstProduct = products[0];
    if (!firstProduct.restaurant.branches || firstProduct.restaurant.branches.length === 0) {
      console.error('❌ No se encontró sucursal activa para el restaurante');
      return res.status(500).json({
        status: 'error',
        message: 'No se encontró una sucursal activa para este restaurante'
      });
    }

    const branch = firstProduct.restaurant.branches[0];
    const itemsToProcess = useCart ? cartItems : items;

    // 7. CALCULAR PRECIOS USANDO LA FUNCIÓN CENTRALIZADA
    const pricing = await calculateOrderPricing(itemsToProcess, products, branch, address);
    const { subtotal, deliveryFee, serviceFee, total, deliveryDetails, travelTimeMinutes } = pricing;

    // 8. Calcular tiempo estimado de entrega
    const estimatedDeliveryTime = calculateEstimatedDeliveryTime(
      travelTimeMinutes || 0, 
      itemsToProcess.length,
      firstProduct.restaurant.name
    );

    // Agregar tiempo estimado a deliveryDetails
    if (deliveryDetails) {
      deliveryDetails.estimatedDeliveryTime = estimatedDeliveryTime;
    }

    // 9. Construir items para Mercado Pago
    const mpItems = [];
    for (const item of itemsToProcess) {
      const product = products.find(p => p.id === item.productId);
      const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);

      mpItems.push({
        title: product.name,
        description: product.description || `Producto de ${product.restaurant.name}`,
        quantity: item.quantity,
        currency_id: 'MXN',
        unit_price: itemPrice
      });
    }

    // 10. Agregar tarifas de envío y servicio como items adicionales para Mercado Pago
    if (deliveryFee > 0) {
      mpItems.push({
        title: 'Costo de envío',
        description: 'Tarifa de entrega a domicilio',
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(deliveryFee)
      });
    }

    if (serviceFee > 0) {
      mpItems.push({
        title: 'Cuota de servicio',
        description: 'Tarifa de servicio de la plataforma',
        quantity: 1,
        currency_id: 'MXN',
        unit_price: Number(serviceFee)
      });
    }

    console.log('🛒 Items finales para Mercado Pago:', {
      totalItems: mpItems.length,
      items: mpItems.map(item => ({
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price
      })),
      totalCalculated: mpItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
    });

    // 11. Generar external_reference único
    const externalReference = `delixmi_${uuidv4()}`;

    // 12. Crear objeto preference para Mercado Pago
    const preferenceData = {
      items: mpItems,
      payer: {
        name: req.user.name,
        surname: req.user.lastname,
        email: req.user.email
      },
      back_urls: {
        success: "delixmi://payment/success",
        failure: "delixmi://payment/failure", 
        pending: "delixmi://payment/pending"
      },
      auto_return: "approved",
      notification_url: `${process.env.FRONTEND_URL}/api/webhooks/mercadopago`,
      external_reference: externalReference,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
      additional_info: `Pedido de Delixmi - ${itemsToProcess.length} productos`,
      metadata: {
        user_id: userId,
        address_id: addressId,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total: total,
        product_count: itemsToProcess.length,
        delivery_details: deliveryDetails ? JSON.stringify(deliveryDetails) : null
      }
    };

    // 13. Crear preferencia en Mercado Pago
    const mpResponse = await preference.create({ body: preferenceData });

    // 14. Obtener el branchId de la sucursal ya obtenida
    const branchId = branch.id;
    
    console.log(`🔍 Branch seleccionado:`, {
      branchId: branchId,
      branchName: branch.name,
      restaurantId: firstProduct.restaurant.id,
      restaurantName: firstProduct.restaurant.name
    });

    // 15. Validación de horario de la sucursal
    const currentDate = new Date();
    const currentDayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
    const currentTime = currentDate.toTimeString().slice(0, 8); // HH:MM:SS

    console.log(`🔍 Validando horario de sucursal ${branchId} - Día: ${currentDayOfWeek}, Hora: ${currentTime}`);

    // Consultar el horario de la sucursal para el día actual
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

    // 16. Crear la Order primero con todos sus datos
    const createdOrder = await prisma.order.create({
      data: {
        customerId: userId,
        branchId: branchId,
        addressId: addressId,
        subtotal: subtotal,
        deliveryFee: deliveryFee,
        total: total,
        commissionRateSnapshot: firstProduct.restaurant.commissionRate || 10.00,
        platformFee: serviceFee,
        restaurantPayout: subtotal - (subtotal * (firstProduct.restaurant.commissionRate || 10.00) / 100),
        paymentMethod: 'mercadopago',
        paymentStatus: 'pending',
        status: 'pending',
        specialInstructions: specialInstructions || null,
        orderItems: {
          create: itemsToProcess.map(item => {
            const product = products.find(p => p.id === item.productId);
            return {
              productId: item.productId,
              quantity: item.quantity,
              pricePerUnit: Number(product.price)
            };
          })
        }
      },
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
        customer: true,
        address: true,
        branch: {
          include: {
            restaurant: true
          }
        }
      }
    });

    // 17. Crear el Payment usando el ID de la Order recién creada
    await prisma.payment.create({
      data: {
        amount: total,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: externalReference, // External reference original
        status: 'pending',
        orderId: createdOrder.id
      }
    });

    // 18. NO limpiar el carrito aquí - se limpiará cuando el webhook confirme el pago
    if (useCart) {
      console.log(`🛒 Carrito del restaurante ${restaurantId} se mantendrá hasta confirmación de pago`);
    }

    // 19. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Preferencia de pago creada exitosamente',
      data: {
        init_point: mpResponse.init_point,
        preference_id: mpResponse.id,
        external_reference: externalReference,
        total: total,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        delivery_details: deliveryDetails,
        estimated_delivery_time: estimatedDeliveryTime,
        cart_used: useCart,
        cart_cleared: false,
        cart_clearing_note: "El carrito se limpiará cuando el pago sea confirmado"
      }
    });

  } catch (error) {
    console.error('Error creando preferencia de Mercado Pago:', error);
    
    // Manejar errores específicos de Mercado Pago
    if (error.response) {
      return res.status(400).json({
        status: 'error',
        message: 'Error en Mercado Pago',
        details: error.response.data
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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
      return res.status(404).json({
        status: 'error',
        message: 'Pago no encontrado'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
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
    });

  } catch (error) {
    console.error('Error obteniendo estado del pago:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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
