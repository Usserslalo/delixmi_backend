const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const { calculateDistance, calculateDeliveryFee } = require('../config/maps');
const { getIo } = require('../config/socket');
const { isWithinCoverage } = require('../services/geolocation.service');

const prisma = new PrismaClient();

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

    // 1. Verificar que la dirección pertenece al usuario
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

    // 1.1. VALIDACIÓN DE COBERTURA TEMPRANA
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

    // 2. Si useCart es true, obtener items del carrito
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

    // 3. Obtener información de los productos y verificar precios
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

    // 4. Construir items para Mercado Pago con precios reales de la BD
    const mpItems = [];
    let subtotal = 0;
    const itemsToProcess = useCart ? cartItems : items;

    for (const item of itemsToProcess) {
      const product = products.find(p => p.id === item.productId);
      
      // Usar priceAtAdd que incluye modificadores, o product.price como fallback
      const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      mpItems.push({
        title: product.name,
        description: product.description || `Producto de ${product.restaurant.name}`,
        quantity: item.quantity,
        currency_id: 'MXN',
        unit_price: itemPrice // Precio unitario con modificadores incluidos
      });
    }

    // 5. Calcular tarifa de envío dinámicamente basada en distancia
    let deliveryFee = 25.00; // Valor por defecto en caso de error
    let deliveryDetails = null;
    let estimatedDeliveryTime = null;

    try {
      // Obtener coordenadas de la dirección de entrega
      const destinationCoords = {
        latitude: Number(address.latitude),
        longitude: Number(address.longitude)
      };

      // Obtener coordenadas de la sucursal del primer producto (simplificación)
      const firstProduct = products[0];
      if (firstProduct.restaurant.branches && firstProduct.restaurant.branches.length > 0) {
        const branch = firstProduct.restaurant.branches[0];
        const originCoords = {
          latitude: Number(branch.latitude),
          longitude: Number(branch.longitude)
        };

        // Calcular distancia usando Google Maps
        const distanceResult = await calculateDistance(originCoords, destinationCoords);
        
        // Calcular tarifa de envío basada en la distancia
        const feeCalculation = calculateDeliveryFee(distanceResult.distance);
        deliveryFee = feeCalculation.tarifaFinal;
        
        // 5.1. Calcular tiempo estimado de entrega
        const estimatedTime = calculateEstimatedDeliveryTime(
          distanceResult.duration, 
          itemsToProcess.length,
          firstProduct.restaurant.name
        );
        
        deliveryDetails = {
          distance: distanceResult.distance,
          duration: distanceResult.duration,
          distanceText: distanceResult.distanceText,
          durationText: distanceResult.durationText,
          calculation: feeCalculation,
          isDefault: distanceResult.isDefault || false,
          estimatedDeliveryTime: estimatedTime
        };

        estimatedDeliveryTime = estimatedTime;

        console.log('Cálculo de tarifa de envío y tiempo estimado:', {
          origin: `${originCoords.latitude}, ${originCoords.longitude}`,
          destination: `${destinationCoords.latitude}, ${destinationCoords.longitude}`,
          distance: distanceResult.distance,
          deliveryFee: deliveryFee,
          travelTimeMinutes: distanceResult.duration,
          estimatedDeliveryTime: estimatedTime,
          isDefault: distanceResult.isDefault
        });
      } else {
        console.warn('No se encontró sucursal activa para el producto, usando valores por defecto');
        // Tiempo estimado por defecto cuando no hay datos de distancia
        estimatedDeliveryTime = calculateEstimatedDeliveryTime(0, itemsToProcess.length, 'Restaurante');
        deliveryDetails = {
          estimatedDeliveryTime: estimatedDeliveryTime,
          isDefault: true
        };
      }
    } catch (error) {
      console.error('Error calculando tarifa de envío y tiempo estimado:', error);
      console.warn('Usando valores por defecto debido a error');
      // Tiempo estimado por defecto en caso de error
      estimatedDeliveryTime = calculateEstimatedDeliveryTime(0, itemsToProcess.length, 'Restaurante');
      deliveryDetails = {
        estimatedDeliveryTime: estimatedDeliveryTime,
        isDefault: true
      };
    }

    // 5. Calcular otros fees
    const serviceFee = subtotal * 0.05; // 5% del subtotal como fee de servicio
    const total = subtotal + deliveryFee + serviceFee;

    console.log('💰 Cálculo de totales para Mercado Pago:', {
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      serviceFee: serviceFee,
      total: total,
      itemsCount: mpItems.length
    });

    // 6. Agregar tarifas de envío y servicio como items adicionales para Mercado Pago
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

    // 7. Generar external_reference único
    const externalReference = `delixmi_${uuidv4()}`;

    // 8. Crear objeto preference para Mercado Pago
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

    // 8. Crear preferencia en Mercado Pago
    const mpResponse = await preference.create({ body: preferenceData });

    // 9. Obtener el branchId del primer producto (todos los productos deben ser del mismo restaurante)
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

    // 9.1. Validación de horario de la sucursal
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

    // 9. Crear la Order primero con todos sus datos
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

    // 10. Crear el Payment usando el ID de la Order recién creada
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

    // 11. NO limpiar el carrito aquí - se limpiará cuando el webhook confirme el pago
    if (useCart) {
      console.log(`🛒 Carrito del restaurante ${restaurantId} se mantendrá hasta confirmación de pago`);
    }

    // 12. Respuesta exitosa
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

    const { addressId, items } = req.body;
    const userId = req.user.id;

    console.log(`👤 Usuario: ${userId}, Dirección: ${addressId}, Items: ${items.length}`);

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

    // 2.1. VALIDACIÓN DE COBERTURA TEMPRANA
    // Obtener el primer producto para determinar la sucursal
    if (!items || items.length === 0) {
      console.log('❌ No se proporcionaron productos');
      return res.status(400).json({
        status: 'error',
        message: 'Debe proporcionar al menos un producto'
      });
    }

    const firstProductId = items[0].productId;
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

    // 3. Validar y obtener productos
    if (!items || items.length === 0) {
      console.log('❌ No se proporcionaron productos');
      return res.status(400).json({
        status: 'error',
        message: 'Debe proporcionar al menos un producto'
      });
    }

    const productIds = items.map(item => item.productId);
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

    // 4. Validar que todos los productos son del mismo restaurante
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

    // 5. Obtener el branchId del primer producto
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

    // 6. Validar horario de la sucursal
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

    // 7. Calcular tarifas y tiempo estimado
    const branch = firstProduct.restaurant.branches[0];
    const origin = {
      latitude: parseFloat(branch.latitude),
      longitude: parseFloat(branch.longitude)
    };
    const destination = {
      latitude: parseFloat(address.latitude),
      longitude: parseFloat(address.longitude)
    };

    console.log(`🚚 Calculando tarifa de envío: ${origin.latitude}, ${origin.longitude} → ${destination.latitude}, ${destination.longitude}`);

    const deliveryDetails = await calculateDistance(origin, destination);
    const deliveryFee = deliveryDetails.deliveryFee || 20; // Valor por defecto si falla
    const travelTimeMinutes = deliveryDetails.travelTimeMinutes || 15; // Valor por defecto si falla

    console.log(`💰 Tarifa de envío calculada: $${deliveryFee}, Tiempo de viaje: ${travelTimeMinutes} min`);

    // Calcular tiempo estimado de entrega
    const estimatedDeliveryTime = calculateEstimatedDeliveryTime(
      travelTimeMinutes, 
      items.length, 
      restaurant.name
    );

    // 8. Calcular totales
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
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

      // Usar priceAtAdd si está disponible (incluye modificadores), sino usar product.price
      const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        pricePerUnit: itemPrice,
        total: itemTotal
      });

      console.log(`✅ Producto: ${product.name} x${item.quantity} = $${itemTotal}`);
    }

    const serviceFee = subtotal * 0.05; // 5% de cuota de servicio
    const total = subtotal + deliveryFee + serviceFee;

    // Validar que todos los valores numéricos sean válidos
    if (isNaN(subtotal) || isNaN(deliveryFee) || isNaN(serviceFee) || isNaN(total)) {
      console.log('❌ Error: Valores numéricos inválidos en el cálculo de totales');
      return res.status(500).json({
        status: 'error',
        message: 'Error en el cálculo de totales',
        details: {
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          serviceFee: serviceFee,
          total: total
        }
      });
    }

    console.log(`💰 Totales calculados:`, {
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      serviceFee: serviceFee,
      total: total
    });

    // 9. Crear orden y pago usando transacción
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
          specialInstructions: req.body.specialInstructions || null,
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

    // 10. Limpiar carrito del restaurante específico
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

    // 11. Emitir evento de nueva orden por Socket.io
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

    // 12. Respuesta exitosa
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
          deliveryDetails: {
            distance: deliveryDetails.distance,
            duration: deliveryDetails.travelTimeMinutes,
            distanceText: deliveryDetails.distanceText,
            durationText: deliveryDetails.durationText,
            estimatedDeliveryTime: estimatedDeliveryTime
          },
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
        cartCleared: true,
        message: 'Carrito del restaurante limpiado automáticamente'
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
