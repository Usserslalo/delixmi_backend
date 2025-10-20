const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Repositorio para manejar operaciones de restaurantes
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class RestaurantRepository {
  /**
   * Actualiza el perfil de un restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>} Restaurante actualizado
   */
  static async updateProfile(restaurantId, data) {
    return await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        branches: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            branches: true,
            subcategories: true,
            products: true
          }
        }
      }
    });
  }

  /**
   * Obtiene el perfil completo de un restaurante por ID
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Restaurante con relaciones
   */
  static async getProfileById(restaurantId) {
    return await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        branches: {
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            branches: true,
            subcategories: true,
            products: true
          }
        }
      }
    });
  }

  /**
   * Verifica si un restaurante existe
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Restaurante básico
   */
  static async findById(restaurantId) {
    return await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        coverPhotoUrl: true,
        status: true
      }
    });
  }

  /**
   * Verifica si el restaurante tiene configurada su ubicación
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<boolean>} true si latitude y longitude no son null, false en caso contrario
   */
  static async getLocationStatus(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        latitude: true,
        longitude: true
      }
    });

    if (!restaurant) {
      return false;
    }

    return restaurant.latitude !== null && restaurant.longitude !== null;
  }

  /**
   * Obtiene los datos completos de ubicación del restaurante
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Datos de ubicación o null si no está configurada
   */
  static async getLocationData(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        latitude: true,
        longitude: true,
        address: true
      }
    });

    if (!restaurant || restaurant.latitude === null || restaurant.longitude === null) {
      return null;
    }

    return {
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address
    };
  }

  /**
   * Actualiza la ubicación del restaurante y su sucursal principal
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} data - Datos de ubicación { latitude, longitude, address? }
   * @returns {Promise<Object>} Restaurante actualizado
   */
  static async updateLocation(restaurantId, data) {
    return await prisma.$transaction(async (tx) => {
      // 1. Actualizar el restaurante
      const updatedRestaurant = await tx.restaurant.update({
        where: { id: restaurantId },
        data: {
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address || undefined,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          address: true,
          updatedAt: true
        }
      });

      // 2. Buscar si existe una sucursal asociada a este restaurante
      const existingBranch = await tx.branch.findFirst({
        where: {
          restaurantId: restaurantId
        }
      });

      if (existingBranch) {
        // 3a. Si existe la sucursal, actualizarla con los mismos datos de ubicación
        await tx.branch.update({
          where: {
            id: existingBranch.id
          },
          data: {
            latitude: data.latitude,
            longitude: data.longitude,
            address: data.address || undefined,
            updatedAt: new Date()
          }
        });
      } else {
        // 3b. Si no existe la sucursal, crearla
        await tx.branch.create({
          data: {
            restaurantId: restaurantId,
            name: updatedRestaurant.name || 'Principal',
            address: data.address || undefined,
            latitude: data.latitude,
            longitude: data.longitude,
            status: 'active'
          }
        });
      }

      return updatedRestaurant;
    });
  }

  /**
   * Obtiene la billetera del restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Billetera del restaurante
   */
  static async getWallet(restaurantId, requestId) {
    try {
      logger.info('Buscando billetera del restaurante en Repository', {
        requestId,
        restaurantId
      });

      const wallet = await prisma.restaurantWallet.findUnique({
        where: { restaurantId: restaurantId },
        include: { 
          restaurant: { 
            select: { id: true, name: true, ownerId: true } 
          } 
        }
      });

      logger.info('Consulta de billetera completada', {
        requestId,
        restaurantId,
        walletFound: !!wallet,
        walletId: wallet?.id
      });

      if (!wallet) {
        logger.warn('Billetera no encontrada para el restaurante', {
          requestId,
          restaurantId
        });
        throw {
          status: 404,
          message: 'Billetera del restaurante no encontrada',
          code: 'RESTAURANT_WALLET_NOT_FOUND'
        };
      }

      const formattedWallet = {
        id: wallet.id,
        restaurantId: wallet.restaurantId,
        balance: Number(wallet.balance),
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
        restaurant: {
          id: wallet.restaurant.id,
          name: wallet.restaurant.name,
          ownerId: wallet.restaurant.ownerId
        }
      };

      logger.info('Billetera formateada exitosamente', {
        requestId,
        restaurantId,
        walletId: formattedWallet.id,
        balance: formattedWallet.balance
      });

      return formattedWallet;

    } catch (error) {
      logger.error('Error en RestaurantRepository.getWallet', {
        requestId,
        restaurantId,
        error: error.message,
        stack: error.stack
      });

      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Obtiene las transacciones de la billetera del restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} filters - Filtros de paginación y fechas
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Transacciones con paginación
   */
  static async getWalletTransactions(restaurantId, filters, requestId) {
    try {
      const wallet = await prisma.restaurantWallet.findUnique({
        where: { restaurantId: restaurantId }
      });

      if (!wallet) {
        throw {
          status: 404,
          message: 'Billetera no encontrada',
          code: 'WALLET_NOT_FOUND'
        };
      }

      // Construir filtros de fecha
      let dateFilter = {};
      if (filters.dateFrom || filters.dateTo) {
        dateFilter.createdAt = {};
        if (filters.dateFrom) {
          dateFilter.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          dateFilter.createdAt.lte = new Date(filters.dateTo);
        }
      }

      const where = {
        walletId: wallet.id,
        ...dateFilter
      };

      const skip = (filters.page - 1) * filters.pageSize;
      const take = filters.pageSize;

      const [transactions, totalCount] = await prisma.$transaction([
        prisma.restaurantWalletTransaction.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                status: true,
                total: true
              }
            }
          }
        }),
        prisma.restaurantWalletTransaction.count({ where })
      ]);

      const totalPages = Math.ceil(totalCount / filters.pageSize);

      return {
        transactions: transactions.map(tx => ({
          id: tx.id.toString(),
          type: tx.type,
          amount: Number(tx.amount),
          balanceAfter: Number(tx.balanceAfter),
          description: tx.description,
          createdAt: tx.createdAt,
          order: tx.order ? {
            id: tx.order.id.toString(),
            status: tx.order.status,
            total: Number(tx.order.total)
          } : null
        })),
        pagination: {
          currentPage: filters.page,
          pageSize: filters.pageSize,
          totalCount,
          totalPages,
          hasNextPage: filters.page < totalPages,
          hasPreviousPage: filters.page > 1
        }
      };

    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Obtiene resumen de ganancias del restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {string} dateFrom - Fecha de inicio (opcional)
   * @param {string} dateTo - Fecha de fin (opcional)
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Resumen de ganancias
   */
  static async getEarningsSummary(restaurantId, dateFrom, dateTo, requestId) {
    try {
      // Construir filtros de fecha para las órdenes entregadas
      let dateFilter = {};
      if (dateFrom || dateTo) {
        dateFilter.orderDeliveredAt = {};
        if (dateFrom) {
          dateFilter.orderDeliveredAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          dateFilter.orderDeliveredAt.lte = new Date(dateTo);
        }
      }

      const where = {
        branch: {
          restaurantId: restaurantId
        },
        status: 'delivered',
        ...dateFilter
      };

      const [orderStats] = await prisma.$transaction([
        prisma.order.aggregate({
          where,
          _sum: {
            restaurantPayout: true,
            subtotal: true
          },
          _count: {
            id: true
          }
        })
      ]);

      return {
        totalEarnings: Number(orderStats._sum.restaurantPayout || 0),
        totalRevenue: Number(orderStats._sum.subtotal || 0),
        totalOrders: orderStats._count.id,
        averageEarningPerOrder: orderStats._count.id > 0 
          ? Number(orderStats._sum.restaurantPayout || 0) / orderStats._count.id 
          : 0,
        period: {
          from: dateFrom || null,
          to: dateTo || null
        }
      };

    } catch (error) {
      if (error.status) {
        throw error;
      }

      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      };
    }
  }
}

module.exports = RestaurantRepository;
