const { prisma } = require('../config/database');
const { logger } = require('../config/logger');
const UserService = require('../services/user.service');
const BranchRepository = require('./branch.repository');

/**
 * Repositorio para manejar operaciones de órdenes
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class OrderRepository {
  
  /**
   * Obtiene las órdenes de una sucursal con filtros y paginación
   * @param {number} branchId - ID de la sucursal
   * @param {Object} filters - Filtros y parámetros de paginación
   * @param {number} filters.page - Página actual (default: 1)
   * @param {number} filters.pageSize - Tamaño de página (default: 10)
   * @param {string} [filters.status] - Estado de la orden (opcional)
   * @param {string} [filters.dateFrom] - Fecha de inicio (ISO string, opcional)
   * @param {string} [filters.dateTo] - Fecha de fin (ISO string, opcional)
   * @param {string} filters.sortBy - Campo por el cual ordenar (default: 'orderPlacedAt')
   * @param {string} filters.sortOrder - Orden ('asc' | 'desc', default: 'desc')
   * @param {string} [filters.search] - Término de búsqueda (opcional)
   * @returns {Promise<Object>} Objeto con orders y pagination
   */
  static async getOrdersForBranch(branchId, filters) {
    try {
      // Construir where clause
      const where = {
        branchId: branchId
      };

      // Agregar filtro por estado si se proporciona
      if (filters.status) {
        where.status = filters.status;
      }

      // Agregar filtro por rango de fechas si se proporciona
      if (filters.dateFrom || filters.dateTo) {
        where.orderPlacedAt = {};
        if (filters.dateFrom) {
          where.orderPlacedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.orderPlacedAt.lte = new Date(filters.dateTo);
        }
      }

      // Agregar búsqueda por texto si se proporciona
      if (filters.search) {
        where.OR = [
          {
            id: {
              equals: parseInt(filters.search) || -1 // Si no es número, usar -1 para que no coincida
            }
          },
          {
            customer: {
              name: {
                contains: filters.search,
                mode: 'insensitive'
              }
            }
          },
          {
            customer: {
              email: {
                contains: filters.search,
                mode: 'insensitive'
              }
            }
          }
        ];
      }

      // Construir orderBy clause
      const orderBy = {};
      orderBy[filters.sortBy] = filters.sortOrder;

      // Calcular skip y take para paginación
      const skip = (filters.page - 1) * filters.pageSize;
      const take = filters.pageSize;

      logger.info('Ejecutando consulta de órdenes con filtros', {
        branchId,
        where,
        orderBy,
        skip,
        take
      });

      // Ejecutar consultas en paralelo
      const [orders, totalCount] = await prisma.$transaction([
        // Consulta principal con include completo
        prisma.order.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
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
            deliveryDriver: {
              select: {
                id: true,
                name: true,
                lastname: true,
                phone: true
              }
            },
            payment: {
              select: {
                id: true,
                status: true,
                provider: true,
                providerPaymentId: true,
                amount: true,
                currency: true
              }
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                    price: true
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
            }
          }
        }),
        // Contar total de registros
        prisma.order.count({ where })
      ]);

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(totalCount / filters.pageSize);
      const hasNextPage = filters.page < totalPages;
      const hasPreviousPage = filters.page > 1;

      // Formatear órdenes
      const formattedOrders = orders.map(order => ({
        id: order.id.toString(),
        status: order.status,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        commissionRateSnapshot: Number(order.commissionRateSnapshot),
        platformFee: Number(order.platformFee),
        restaurantPayout: Number(order.restaurantPayout),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        specialInstructions: order.specialInstructions,
        orderPlacedAt: order.orderPlacedAt,
        orderDeliveredAt: order.orderDeliveredAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: order.customer ? {
          id: order.customer.id,
          name: order.customer.name,
          lastname: order.customer.lastname,
          fullName: `${order.customer.name} ${order.customer.lastname}`,
          email: order.customer.email,
          phone: order.customer.phone
        } : null,
        address: order.address ? {
          id: order.address.id,
          alias: order.address.alias,
          street: order.address.street,
          exteriorNumber: order.address.exteriorNumber,
          interiorNumber: order.address.interiorNumber,
          neighborhood: order.address.neighborhood,
          city: order.address.city,
          state: order.address.state,
          zipCode: order.address.zipCode,
          references: order.address.references,
          fullAddress: `${order.address.street} ${order.address.exteriorNumber}${order.address.interiorNumber ? ' Int. ' + order.address.interiorNumber : ''}, ${order.address.neighborhood}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}`
        } : null,
        deliveryDriver: order.deliveryDriver ? {
          id: order.deliveryDriver.id,
          name: order.deliveryDriver.name,
          lastname: order.deliveryDriver.lastname,
          fullName: `${order.deliveryDriver.name} ${order.deliveryDriver.lastname}`,
          phone: order.deliveryDriver.phone
        } : null,
        payment: order.payment ? {
          id: order.payment.id.toString(),
          status: order.payment.status,
          provider: order.payment.provider,
          providerPaymentId: order.payment.providerPaymentId,
          amount: Number(order.payment.amount),
          currency: order.payment.currency
        } : null,
        orderItems: order.orderItems ? order.orderItems.map(item => ({
          id: item.id.toString(),
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            price: Number(item.product.price)
          } : null,
          modifiers: item.modifiers ? item.modifiers.map(modifier => ({
            id: modifier.id.toString(),
            modifierOption: modifier.modifierOption ? {
              id: modifier.modifierOption.id,
              name: modifier.modifierOption.name,
              price: Number(modifier.modifierOption.price),
              modifierGroup: modifier.modifierOption.modifierGroup ? {
                id: modifier.modifierOption.modifierGroup.id,
                name: modifier.modifierOption.modifierGroup.name
              } : null
            } : null
          })) : []
        })) : []
      }));

      logger.info('Consulta de órdenes completada', {
        branchId,
        totalFound: totalCount,
        returned: formattedOrders.length,
        page: filters.page,
        pageSize: filters.pageSize
      });

      return {
        orders: formattedOrders,
        pagination: {
          currentPage: filters.page,
          pageSize: filters.pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage
        }
      };

    } catch (error) {
      logger.error('Error en getOrdersForBranch', {
        branchId,
        filters,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Actualiza el estado de un pedido específico con validaciones de transición y permisos
   * @param {BigInt} orderId - ID del pedido
   * @param {string} newStatus - Nuevo estado del pedido
   * @param {number} userId - ID del usuario que realiza la actualización
   * @param {string} requestId - ID de la request para logging
   * @returns {Promise<Object>} Pedido actualizado con relaciones completas
   */
  static async updateOrderStatus(orderId, newStatus, userId, requestId) {
    try {
      logger.debug('Iniciando actualización de estado de pedido', {
        requestId,
        meta: { orderId: orderId.toString(), newStatus, userId }
      });

      // 1. Obtener información del usuario y verificar roles
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

      if (!userWithRoles) {
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      // 2. Obtener restaurantId del usuario
      const ownerAssignments = userWithRoles.userRoleAssignments.filter(
        assignment => ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'].includes(assignment.role.name) && assignment.restaurantId
      );

      if (ownerAssignments.length === 0) {
        throw {
          status: 403,
          message: 'Acceso denegado. Se requieren permisos de restaurante',
          code: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      const restaurantId = ownerAssignments[0].restaurantId;
      const userRole = ownerAssignments[0].role.name;

      logger.debug('Usuario autorizado', {
        requestId,
        meta: { userId, restaurantId, userRole }
      });

      // 3. Obtener la sucursal principal
      const primaryBranch = await BranchRepository.findPrimaryBranchByRestaurantId(restaurantId);

      if (!primaryBranch) {
        throw {
          status: 404,
          message: 'Sucursal principal no encontrada',
          code: 'PRIMARY_BRANCH_NOT_FOUND'
        };
      }

      // 4. Buscar el pedido con relaciones necesarias
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          branch: {
            select: {
              id: true,
              restaurantId: true
            }
          },
          payment: {
            select: {
              id: true,
              status: true,
              provider: true,
              amount: true
            }
          }
        }
      });

      if (!order) {
        throw {
          status: 404,
          message: 'Pedido no encontrado',
          code: 'ORDER_NOT_FOUND'
        };
      }

      logger.debug('Pedido encontrado', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
          currentStatus: order.status,
          branchId: order.branchId,
          primaryBranchId: primaryBranch.id
        }
      });

      // 5. Validar que el pedido pertenece a la sucursal principal del usuario
      if (order.branchId !== primaryBranch.id) {
        throw {
          status: 403,
          message: 'Acceso denegado. El pedido no pertenece a tu restaurante',
          code: 'FORBIDDEN_ORDER_ACCESS'
        };
      }

      // 6. Validar transición de estado
      const currentStatus = order.status;
      
      // Definir transiciones válidas y roles requeridos
      const validTransitions = {
        'pending': {
          'confirmed': ['owner', 'branch_manager', 'order_manager'],
          'cancelled': ['owner', 'branch_manager', 'order_manager']
        },
        'confirmed': {
          'preparing': ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'],
          'cancelled': ['owner', 'branch_manager', 'order_manager']
        },
        'preparing': {
          'ready_for_pickup': ['owner', 'branch_manager', 'order_manager', 'kitchen_staff']
        },
        'ready_for_pickup': {
          'out_for_delivery': ['owner', 'branch_manager', 'order_manager']
        },
        'out_for_delivery': {
          'delivered': ['owner', 'branch_manager', 'order_manager']
        }
      };

      // Estados finales que no permiten más cambios
      const finalStates = ['delivered', 'cancelled', 'refunded'];

      if (finalStates.includes(currentStatus)) {
        throw {
          status: 409,
          message: 'No se puede cambiar el estado de un pedido finalizado',
          code: 'ORDER_IN_FINAL_STATE',
          details: { currentStatus }
        };
      }

      if (!validTransitions[currentStatus] || !validTransitions[currentStatus][newStatus]) {
        throw {
          status: 409,
          message: `Transición de estado inválida: ${currentStatus} → ${newStatus}`,
          code: 'INVALID_STATUS_TRANSITION',
          details: { 
            currentStatus, 
            newStatus,
            validTransitions: Object.keys(validTransitions[currentStatus] || {})
          }
        };
      }

      const allowedRoles = validTransitions[currentStatus][newStatus];
      if (!allowedRoles.includes(userRole)) {
        throw {
          status: 403,
          message: `Tu rol '${userRole}' no tiene permisos para cambiar el estado de ${currentStatus} a ${newStatus}`,
          code: 'STATUS_UPDATE_NOT_ALLOWED_FOR_ROLE',
          details: { 
            userRole, 
            currentStatus, 
            newStatus, 
            allowedRoles 
          }
        };
      }

      logger.info('Transición de estado validada', {
        requestId,
        meta: { 
          orderId: orderId.toString(),
          currentStatus, 
          newStatus, 
          userRole 
        }
      });

      // 7. Actualizar el estado del pedido
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: newStatus,
          updatedAt: new Date()
        }
      });

      // 8. Emitir evento WebSocket (si está disponible)
      try {
        const { getIo } = require('../config/socket');
        const io = getIo();
        if (io) {
          io.emit('order_update', {
            orderId: orderId.toString(),
            newStatus,
            updatedAt: new Date()
          });
          logger.debug('Evento WebSocket order_update emitido', {
            requestId,
            meta: { orderId: orderId.toString(), newStatus }
          });
        }
      } catch (socketError) {
        logger.warn('Error emitiendo evento WebSocket', {
          requestId,
          meta: { error: socketError.message }
        });
      }

      // 9. Efectos secundarios según el nuevo estado
      if (newStatus === 'cancelled' && order.payment && order.payment.status === 'completed' && order.payment.provider !== 'cash') {
        // TODO: Implementar llamada a PaymentService.initiateRefund()
        logger.info('Pedido cancelado requiere reembolso', {
          requestId,
          meta: { 
            orderId: orderId.toString(),
            paymentId: order.payment.id.toString(),
            amount: order.payment.amount
          }
        });
      }

      if (newStatus === 'preparing') {
        // TODO: Implementar llamada a NotificationService.notifyAvailableOrder()
        logger.info('Pedido listo para preparación - notificar drivers disponibles', {
          requestId,
          meta: { orderId: orderId.toString() }
        });
      }

      // 10. Obtener el pedido actualizado con relaciones completas
      const updatedOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
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
          deliveryDriver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              phone: true
            }
          },
          payment: {
            select: {
              id: true,
              status: true,
              provider: true,
              providerPaymentId: true,
              amount: true,
              currency: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                  price: true
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
          }
        }
      });

      // 11. Formatear la respuesta
      const formattedOrder = {
        id: updatedOrder.id.toString(),
        status: updatedOrder.status,
        subtotal: Number(updatedOrder.subtotal),
        deliveryFee: Number(updatedOrder.deliveryFee),
        total: Number(updatedOrder.total),
        commissionRateSnapshot: Number(updatedOrder.commissionRateSnapshot),
        platformFee: Number(updatedOrder.platformFee),
        restaurantPayout: Number(updatedOrder.restaurantPayout),
        paymentMethod: updatedOrder.paymentMethod,
        paymentStatus: updatedOrder.paymentStatus,
        specialInstructions: updatedOrder.specialInstructions,
        orderPlacedAt: updatedOrder.orderPlacedAt,
        orderDeliveredAt: updatedOrder.orderDeliveredAt,
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt,
        customer: updatedOrder.customer ? {
          id: updatedOrder.customer.id,
          name: updatedOrder.customer.name,
          lastname: updatedOrder.customer.lastname,
          fullName: `${updatedOrder.customer.name} ${updatedOrder.customer.lastname}`,
          email: updatedOrder.customer.email,
          phone: updatedOrder.customer.phone
        } : null,
        address: updatedOrder.address ? {
          id: updatedOrder.address.id,
          alias: updatedOrder.address.alias,
          street: updatedOrder.address.street,
          exteriorNumber: updatedOrder.address.exteriorNumber,
          interiorNumber: updatedOrder.address.interiorNumber,
          neighborhood: updatedOrder.address.neighborhood,
          city: updatedOrder.address.city,
          state: updatedOrder.address.state,
          zipCode: updatedOrder.address.zipCode,
          references: updatedOrder.address.references,
          fullAddress: `${updatedOrder.address.street} ${updatedOrder.address.exteriorNumber}${updatedOrder.address.interiorNumber ? ' Int. ' + updatedOrder.address.interiorNumber : ''}, ${updatedOrder.address.neighborhood}, ${updatedOrder.address.city}, ${updatedOrder.address.state} ${updatedOrder.address.zipCode}`
        } : null,
        deliveryDriver: updatedOrder.deliveryDriver ? {
          id: updatedOrder.deliveryDriver.id,
          name: updatedOrder.deliveryDriver.name,
          lastname: updatedOrder.deliveryDriver.lastname,
          fullName: `${updatedOrder.deliveryDriver.name} ${updatedOrder.deliveryDriver.lastname}`,
          phone: updatedOrder.deliveryDriver.phone
        } : null,
        payment: updatedOrder.payment ? {
          id: updatedOrder.payment.id.toString(),
          status: updatedOrder.payment.status,
          provider: updatedOrder.payment.provider,
          providerPaymentId: updatedOrder.payment.providerPaymentId,
          amount: Number(updatedOrder.payment.amount),
          currency: updatedOrder.payment.currency
        } : null,
        orderItems: updatedOrder.orderItems ? updatedOrder.orderItems.map(item => ({
          id: item.id.toString(),
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            price: Number(item.product.price)
          } : null,
          modifiers: item.modifiers ? item.modifiers.map(modifier => ({
            id: modifier.id.toString(),
            modifierOption: modifier.modifierOption ? {
              id: modifier.modifierOption.id,
              name: modifier.modifierOption.name,
              price: Number(modifier.modifierOption.price),
              modifierGroup: modifier.modifierOption.modifierGroup ? {
                id: modifier.modifierOption.modifierGroup.id,
                name: modifier.modifierOption.modifierGroup.name
              } : null
            } : null
          })) : []
        })) : []
      };

      logger.info('Estado de pedido actualizado exitosamente', {
        requestId,
        meta: { 
          orderId: orderId.toString(),
          previousStatus: currentStatus,
          newStatus,
          userRole,
          userId
        }
      });

      return formattedOrder;

    } catch (error) {
      logger.error('Error actualizando estado de pedido', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
          newStatus, 
          userId,
          error: error.message,
          code: error.code
        }
      });

      // Si es un error controlado (con status), lo relanzamos
      if (error.status) {
        throw error;
      }

      // Error interno no controlado
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        originalError: error.message
      };
    }
  }
}

module.exports = OrderRepository;
