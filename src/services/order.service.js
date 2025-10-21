const { PrismaClient } = require('@prisma/client');
const { logger } = require('../config/logger');
const { socketManager } = require('../websocket/socket-manager');

const prisma = new PrismaClient();

class OrderService {
  /**
   * Crea una orden en la base de datos con todos sus datos relacionados
   * @param {Array} items - Items del pedido
   * @param {Object} pricingDetails - Detalles de precios calculados
   * @param {number} userId - ID del usuario
   * @param {number} branchId - ID de la sucursal
   * @param {number} addressId - ID de la dirección
   * @param {string} paymentMethod - Método de pago ('mercadopago' o 'cash')
   * @param {string} [specialInstructions] - Instrucciones especiales
   * @param {string} [requestId] - ID de la solicitud para logging
   * @param {Array} [cartItems] - Items del carrito con modificadores (opcional)
   * @returns {Promise<Object>} Orden creada con todos sus datos relacionados
   */
  static async createOrderInDatabase(items, pricingDetails, userId, branchId, addressId, paymentMethod, specialInstructions = null, requestId, cartItems = null) {
    try {
      logger.info('Iniciando creación de orden en base de datos', {
        requestId,
        meta: {
          userId,
          branchId,
          addressId,
          paymentMethod,
          itemsCount: items.length
        }
      });

      // Obtener información de la sucursal para cálculos de comisión
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              commissionRate: true
            }
          }
        }
      });

      if (!branch) {
        throw new Error(`Sucursal con ID ${branchId} no encontrada`);
      }

      const { subtotal, deliveryFee, serviceFee, total } = pricingDetails;
      const commissionRate = branch.restaurant.commissionRate || 10.00;
      const restaurantPayout = subtotal - (subtotal * commissionRate / 100);

      // Usar transacción para asegurar consistencia de datos
      const result = await prisma.$transaction(async (tx) => {
        // 1. Crear la orden
        const order = await tx.order.create({
          data: {
            customerId: userId,
            branchId: branchId,
            addressId: addressId,
            subtotal: subtotal,
            deliveryFee: deliveryFee,
            total: total,
            commissionRateSnapshot: commissionRate,
            platformFee: serviceFee,
            restaurantPayout: restaurantPayout,
            paymentMethod: paymentMethod,
            paymentStatus: 'pending',
            status: 'pending',
            specialInstructions: specialInstructions,
            orderPlacedAt: new Date()
          }
        });

        logger.info('Orden creada exitosamente', {
          requestId,
          meta: {
            orderId: order.id,
            userId,
            branchId,
            total: total
          }
        });

        // 2. Crear items de la orden y copiar modificadores si es necesario
        const orderItems = [];
        const cartItemsMap = new Map();
        
        // Mapear items del carrito por productId para acceso rápido
        if (cartItems && cartItems.length > 0) {
          cartItems.forEach(cartItem => {
            cartItemsMap.set(cartItem.productId, cartItem);
          });
        }

        for (const item of items) {
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              productId: item.productId,
              quantity: item.quantity,
              pricePerUnit: item.priceAtAdd ? Number(item.priceAtAdd) : Number(item.price)
            }
          });
          orderItems.push(orderItem);

          // 2.1. Copiar modificadores del carrito al item de la orden
          const cartItem = cartItemsMap.get(item.productId);
          if (cartItem && cartItem.modifiers && cartItem.modifiers.length > 0) {
            logger.info('Copiando modificadores del carrito al item de orden', {
              requestId,
              meta: {
                orderId: order.id,
                orderItemId: orderItem.id,
                productId: item.productId,
                modifiersCount: cartItem.modifiers.length
              }
            });

            // Crear registros OrderItemModifier para cada modificador del carrito
            for (const cartModifier of cartItem.modifiers) {
              await tx.orderItemModifier.create({
                data: {
                  orderItemId: orderItem.id,
                  modifierOptionId: cartModifier.modifierOption.id
                }
              });
            }

            logger.info('Modificadores copiados exitosamente', {
              requestId,
              meta: {
                orderItemId: orderItem.id,
                modifiersCopied: cartItem.modifiers.length
              }
            });
          }
        }

        logger.info('Items de orden creados', {
          requestId,
          meta: {
            orderId: order.id,
            itemsCount: orderItems.length
          }
        });

        // 3. Crear registro de pago
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: total,
            currency: 'MXN',
            provider: paymentMethod,
            providerPaymentId: paymentMethod === 'cash' 
              ? `cash_${order.id}_${Date.now()}` 
              : null, // Se establecerá después para MercadoPago
            status: 'pending'
          }
        });

        logger.info('Registro de pago creado', {
          requestId,
          meta: {
            paymentId: payment.id,
            orderId: order.id,
            amount: total,
            provider: paymentMethod
          }
        });

        return { order, payment, orderItems };
      });

      // Obtener la orden completa con todos los datos relacionados
      const completeOrder = await prisma.order.findUnique({
        where: { id: result.order.id },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  restaurant: true
                }
              },
              modifiers: {
                include: {
                  modifierOption: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      modifierGroup: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          },
          address: {
            select: {
              id: true,
              alias: true,
              street: true,
              exteriorNumber: true,
              interiorNumber: true,
              neighborhood: true,
              city: true,
              state: true,
              zipCode: true,
              references: true
            }
          },
          branch: {
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true
                }
              }
            }
          }
        }
      });

      logger.info('Orden creada completamente con datos relacionados', {
        requestId,
        meta: {
          orderId: completeOrder.id,
          customerId: completeOrder.customerId,
          branchId: completeOrder.branchId,
          total: completeOrder.total,
          itemsCount: completeOrder.orderItems.length
        }
      });

      // Emitir evento NEW_ORDER_PENDING a los owners del restaurante
      try {
        const restaurantId = completeOrder.branch.restaurant.id;
        
        // Preparar datos del evento
        const orderEventData = {
          orderId: completeOrder.id,
          orderNumber: `#${completeOrder.id.toString().padStart(6, '0')}`,
          customer: {
            id: completeOrder.customer.id,
            name: `${completeOrder.customer.name} ${completeOrder.customer.lastname}`,
            email: completeOrder.customer.email,
            phone: completeOrder.customer.phone
          },
          restaurant: {
            id: completeOrder.branch.restaurant.id,
            name: completeOrder.branch.restaurant.name,
            logoUrl: completeOrder.branch.restaurant.logoUrl
          },
          branch: {
            id: completeOrder.branch.id,
            name: completeOrder.branch.name
          },
          address: {
            alias: completeOrder.address.alias,
            fullAddress: `${completeOrder.address.street} ${completeOrder.address.exteriorNumber}${completeOrder.address.interiorNumber ? ` Int. ${completeOrder.address.interiorNumber}` : ''}, ${completeOrder.address.neighborhood}, ${completeOrder.address.city}, ${completeOrder.address.state} ${completeOrder.address.zipCode}`,
            references: completeOrder.address.references
          },
          orderItems: completeOrder.orderItems.map(item => ({
            id: item.id,
            productName: item.product.name,
            quantity: item.quantity,
            pricePerUnit: Number(item.pricePerUnit),
            total: Number(item.pricePerUnit) * item.quantity,
            modifiers: item.modifiers.map(mod => ({
              groupName: mod.modifierOption.modifierGroup.name,
              optionName: mod.modifierOption.name,
              price: Number(mod.modifierOption.price)
            }))
          })),
          pricing: {
            subtotal: Number(completeOrder.subtotal),
            deliveryFee: Number(completeOrder.deliveryFee),
            serviceFee: Number(completeOrder.platformFee),
            total: Number(completeOrder.total),
            restaurantPayout: Number(completeOrder.restaurantPayout)
          },
          payment: {
            method: completeOrder.paymentMethod,
            status: 'pending'
          },
          specialInstructions: completeOrder.specialInstructions,
          status: completeOrder.status,
          orderPlacedAt: completeOrder.orderPlacedAt,
          timestamp: new Date().toISOString()
        };

        // Emitir evento al room del restaurante
        socketManager.emitToRestaurant(restaurantId, 'NEW_ORDER_PENDING', orderEventData);

        logger.info('Evento NEW_ORDER_PENDING emitido exitosamente', {
          requestId,
          meta: {
            orderId: completeOrder.id,
            restaurantId,
            eventData: {
              orderNumber: orderEventData.orderNumber,
              customerName: orderEventData.customer.name,
              total: orderEventData.pricing.total,
              itemsCount: orderEventData.orderItems.length
            }
          }
        });

      } catch (socketError) {
        // No fallar la creación de la orden si hay error en WebSocket
        logger.error('Error emitiendo evento NEW_ORDER_PENDING', {
          requestId,
          meta: {
            orderId: completeOrder.id,
            error: socketError.message,
            stack: socketError.stack
          }
        });
      }

      return completeOrder;

    } catch (error) {
      logger.error('Error creando orden en base de datos', {
        requestId,
        meta: {
          error: error.message,
          stack: error.stack,
          userId,
          branchId,
          addressId,
          paymentMethod
        }
      });
      throw error;
    }
  }

  /**
   * Actualiza el estado de una orden
   * @param {number} orderId - ID de la orden
   * @param {string} status - Nuevo estado
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Promise<Object>} Orden actualizada
   */
  static async updateOrderStatus(orderId, status, requestId) {
    try {
      logger.info('Actualizando estado de orden', {
        requestId,
        meta: { orderId, newStatus: status }
      });

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: status,
          updatedAt: new Date()
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true
            }
          },
          branch: {
            include: {
              restaurant: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      logger.info('Estado de orden actualizado exitosamente', {
        requestId,
        meta: {
          orderId,
          oldStatus: status,
          newStatus: updatedOrder.status
        }
      });

      return updatedOrder;

    } catch (error) {
      logger.error('Error actualizando estado de orden', {
        requestId,
        meta: {
          error: error.message,
          orderId,
          status
        }
      });
      throw error;
    }
  }

  /**
   * Obtiene una orden por su ID con todos los datos relacionados
   * @param {number} orderId - ID de la orden
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Promise<Object|null>} Orden con datos relacionados o null si no existe
   */
  static async getOrderById(orderId, requestId) {
    try {
      logger.info('Obteniendo orden por ID', {
        requestId,
        meta: { orderId }
      });

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  restaurant: {
                    select: {
                      id: true,
                      name: true,
                      logoUrl: true
                    }
                  }
                }
              },
              modifiers: {
                include: {
                  modifierOption: {
                    select: {
                      id: true,
                      name: true,
                      price: true,
                      modifierGroup: {
                        select: {
                          id: true,
                          name: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          },
          address: {
            select: {
              id: true,
              alias: true,
              street: true,
              exteriorNumber: true,
              interiorNumber: true,
              neighborhood: true,
              city: true,
              state: true,
              zipCode: true,
              references: true
            }
          },
          branch: {
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  logoUrl: true
                }
              }
            }
          },
          payments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              provider: true,
              status: true,
              createdAt: true,
              updatedAt: true
            }
          }
        }
      });

      if (order) {
        logger.info('Orden obtenida exitosamente', {
          requestId,
          meta: {
            orderId,
            customerId: order.customerId,
            status: order.status,
            total: order.total
          }
        });
      } else {
        logger.warn('Orden no encontrada', {
          requestId,
          meta: { orderId }
        });
      }

      return order;

    } catch (error) {
      logger.error('Error obteniendo orden por ID', {
        requestId,
        meta: {
          error: error.message,
          orderId
        }
      });
      throw error;
    }
  }

  /**
   * Valida que una orden puede ser procesada (horarios, disponibilidad, etc.)
   * @param {number} branchId - ID de la sucursal
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Promise<Object>} Resultado de la validación
   */
  static async validateOrderProcessing(branchId, requestId) {
    try {
      logger.info('Validando procesamiento de orden', {
        requestId,
        meta: { branchId }
      });

      const currentDate = new Date();
      const currentDayOfWeek = currentDate.getDay(); // 0=Domingo, 1=Lunes, ..., 6=Sábado
      const currentTime = currentDate.toTimeString().slice(0, 8); // HH:MM:SS

      // Consultar el horario de la sucursal para el día actual
      const branchSchedule = await prisma.branchSchedule.findFirst({
        where: {
          branchId: branchId,
          dayOfWeek: currentDayOfWeek
        }
      });

      if (!branchSchedule) {
        logger.warn('No se encontró horario para la sucursal', {
          requestId,
          meta: { branchId, dayOfWeek: currentDayOfWeek }
        });
        return {
          isValid: false,
          reason: 'El restaurante está cerrado hoy',
          details: { branchId, dayOfWeek: currentDayOfWeek }
        };
      }

      if (branchSchedule.isClosed) {
        logger.warn('Sucursal cerrada hoy', {
          requestId,
          meta: { branchId, isClosed: true }
        });
        return {
          isValid: false,
          reason: 'El restaurante está cerrado hoy',
          details: { branchId, isClosed: true }
        };
      }

      // Validar que la hora actual esté dentro del horario de atención
      const openingTime = branchSchedule.openingTime;
      const closingTime = branchSchedule.closingTime;

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
        logger.warn('Hora actual fuera del horario de atención', {
          requestId,
          meta: {
            branchId,
            currentTime,
            openingTime,
            closingTime
          }
        });
        return {
          isValid: false,
          reason: `El restaurante está cerrado en este momento. Horario de hoy: ${openingTime} a ${closingTime}`,
          details: {
            branchId,
            currentTime,
            openingTime,
            closingTime
          }
        };
      }

      logger.info('Validación de procesamiento de orden exitosa', {
        requestId,
        meta: {
          branchId,
          currentTime,
          openingTime,
          closingTime,
          is24Hours
        }
      });

      return {
        isValid: true,
        reason: 'Orden puede ser procesada',
        details: {
          branchId,
          currentTime,
          openingTime,
          closingTime,
          is24Hours
        }
      };

    } catch (error) {
      logger.error('Error validando procesamiento de orden', {
        requestId,
        meta: {
          error: error.message,
          branchId
        }
      });
      throw error;
    }
  }
}

module.exports = OrderService;
