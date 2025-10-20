const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

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
                method: true,
                provider: true,
                providerPaymentId: true,
                amount: true
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
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          lastname: order.customer.lastname,
          fullName: `${order.customer.name} ${order.customer.lastname}`,
          email: order.customer.email,
          phone: order.customer.phone
        },
        address: {
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
        },
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
          method: order.payment.method,
          provider: order.payment.provider,
          providerPaymentId: order.payment.providerPaymentId,
          amount: Number(order.payment.amount)
        } : null,
        orderItems: order.orderItems.map(item => ({
          id: item.id.toString(),
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          product: {
            id: item.product.id,
            name: item.product.name,
            imageUrl: item.product.imageUrl,
            price: Number(item.product.price)
          },
          modifiers: item.modifiers.map(modifier => ({
            id: modifier.id.toString(),
            modifierOption: {
              id: modifier.modifierOption.id,
              name: modifier.modifierOption.name,
              price: Number(modifier.modifierOption.price),
              modifierGroup: {
                id: modifier.modifierOption.modifierGroup.id,
                name: modifier.modifierOption.modifierGroup.name
              }
            }
          }))
        }))
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
}

module.exports = OrderRepository;
