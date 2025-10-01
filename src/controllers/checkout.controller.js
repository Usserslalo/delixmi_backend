const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const { calculateDistance, calculateDeliveryFee } = require('../config/maps');

const prisma = new PrismaClient();

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

    const { addressId, items } = req.body;
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

    // 2. Obtener información de los productos y verificar precios
    const productIds = items.map(item => item.productId);
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

    // 3. Construir items para Mercado Pago con precios reales de la BD
    const mpItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      
      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;

      mpItems.push({
        title: product.name,
        description: product.description || `Producto de ${product.restaurant.name}`,
        quantity: item.quantity,
        currency_id: 'MXN',
        unit_price: Number(product.price)
      });
    }

    // 4. Calcular tarifa de envío dinámicamente basada en distancia
    let deliveryFee = 25.00; // Valor por defecto en caso de error
    let deliveryDetails = null;

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
        deliveryDetails = {
          distance: distanceResult.distance,
          duration: distanceResult.duration,
          distanceText: distanceResult.distanceText,
          durationText: distanceResult.durationText,
          calculation: feeCalculation,
          isDefault: distanceResult.isDefault || false
        };

        console.log('Cálculo de tarifa de envío:', {
          origin: `${originCoords.latitude}, ${originCoords.longitude}`,
          destination: `${destinationCoords.latitude}, ${destinationCoords.longitude}`,
          distance: distanceResult.distance,
          deliveryFee: deliveryFee,
          isDefault: distanceResult.isDefault
        });
      } else {
        console.warn('No se encontró sucursal activa para el producto, usando tarifa por defecto');
      }
    } catch (error) {
      console.error('Error calculando tarifa de envío:', error);
      console.warn('Usando tarifa de envío por defecto debido a error');
    }

    // 5. Calcular otros fees
    const serviceFee = subtotal * 0.05; // 5% del subtotal como fee de servicio
    const total = subtotal + deliveryFee + serviceFee;

    // 6. Generar external_reference único
    const externalReference = `delixmi_${uuidv4()}`;

    // 7. Crear objeto preference para Mercado Pago
    const preferenceData = {
      items: mpItems,
      payer: {
        name: req.user.name,
        surname: req.user.lastname,
        email: req.user.email
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/payment-success`,
        failure: `${process.env.FRONTEND_URL}/payment-failure`,
        pending: `${process.env.FRONTEND_URL}/payment-pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.FRONTEND_URL}/api/webhooks/mercadopago`,
      external_reference: externalReference,
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12
      },
      additional_info: `Pedido de Delixmi - ${items.length} productos`,
      metadata: {
        user_id: userId,
        address_id: addressId,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        service_fee: serviceFee,
        total: total,
        product_count: items.length,
        delivery_details: deliveryDetails ? JSON.stringify(deliveryDetails) : null
      }
    };

    // 8. Crear preferencia en Mercado Pago
    const mpResponse = await preference.create({ body: preferenceData });

    // 9. Guardar información del intento de pago en la base de datos
    await prisma.payment.create({
      data: {
        amount: total,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: externalReference,
        status: 'pending',
        order: {
          create: {
            customerId: userId,
            branchId: 1, // Por ahora hardcodeado, debería venir del request
            addressId: addressId,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            total: total,
            commissionRateSnapshot: 10.00, // Valor por defecto
            platformFee: serviceFee,
            restaurantPayout: subtotal - (subtotal * 0.10), // Resta la comisión
            paymentMethod: 'mercadopago',
            paymentStatus: 'pending',
            orderItems: {
              create: items.map(item => {
                const product = products.find(p => p.id === item.productId);
                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  pricePerUnit: Number(product.price)
                };
              })
            }
          }
        }
      }
    });

    // 10. Respuesta exitosa
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
        delivery_details: deliveryDetails
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

module.exports = {
  createPreference,
  getPaymentStatus
};
