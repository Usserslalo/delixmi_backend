const { prisma } = require('../config/database');
const { logger } = require('../config/logger');
const UserService = require('../services/user.service');

/**
 * Repositorio para manejar operaciones relacionadas con repartidores
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class DriverRepository {

  /**
   * Actualiza el estado de disponibilidad del repartidor
   * @param {number} userId - ID del usuario repartidor
   * @param {string} newStatus - Nuevo estado del repartidor (online, offline, busy, unavailable)
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Perfil del repartidor actualizado
   */
  static async updateDriverStatus(userId, newStatus, requestId) {
    try {
      logger.debug('Iniciando actualización de estado del repartidor', {
        requestId,
        meta: { userId, newStatus }
      });

      // 1. Buscar el perfil del repartidor
      const existingDriverProfile = await prisma.driverProfile.findUnique({
        where: { userId: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!existingDriverProfile) {
        logger.error('Perfil de repartidor no encontrado', {
          requestId,
          meta: { userId, newStatus }
        });

        const error = {
          status: 404,
          message: 'Perfil de repartidor no encontrado',
          code: 'DRIVER_PROFILE_NOT_FOUND',
          details: {
            userId: userId,
            suggestion: 'Contacta al administrador para crear tu perfil de repartidor'
          }
        };
        throw error;
      }

      logger.debug('Perfil de repartidor encontrado', {
        requestId,
        meta: { 
          userId, 
          currentStatus: existingDriverProfile.status,
          newStatus 
        }
      });

      // 2. Actualizar el estado del repartidor
      const updatedDriverProfile = await prisma.driverProfile.update({
        where: { userId: userId },
        data: {
          status: newStatus,
          lastSeenAt: new Date(),
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          }
        }
      });

      logger.info('Estado del repartidor actualizado exitosamente', {
        requestId,
        meta: { 
          userId, 
          previousStatus: existingDriverProfile.status,
          newStatus,
          updatedAt: updatedDriverProfile.updatedAt
        }
      });

      // 3. Formatear respuesta
      const formattedProfile = {
        userId: updatedDriverProfile.userId,
        vehicleType: updatedDriverProfile.vehicleType,
        licensePlate: updatedDriverProfile.licensePlate,
        status: updatedDriverProfile.status,
        currentLocation: updatedDriverProfile.currentLatitude && updatedDriverProfile.currentLongitude ? {
          latitude: Number(updatedDriverProfile.currentLatitude),
          longitude: Number(updatedDriverProfile.currentLongitude)
        } : null,
        lastSeenAt: updatedDriverProfile.lastSeenAt,
        kycStatus: updatedDriverProfile.kycStatus,
        user: {
          id: updatedDriverProfile.user.id,
          name: updatedDriverProfile.user.name,
          lastname: updatedDriverProfile.user.lastname,
          email: updatedDriverProfile.user.email,
          phone: updatedDriverProfile.user.phone
        },
        createdAt: updatedDriverProfile.createdAt,
        updatedAt: updatedDriverProfile.updatedAt
      };

      return {
        profile: formattedProfile,
        statusChange: {
          previousStatus: existingDriverProfile.status,
          newStatus: newStatus,
          changedAt: updatedDriverProfile.lastSeenAt
        }
      };

    } catch (error) {
      // Si el error ya tiene estructura definida (errores conocidos), simplemente re-lanzar
      if (error.status) {
        throw error;
      }

      // Para errores inesperados, crear estructura de error consistente
      logger.error('Error inesperado actualizando estado del repartidor', {
        requestId,
        meta: { 
          userId, 
          newStatus,
          error: error.message,
          stack: error.stack
        }
      });

      // Manejar errores específicos de Prisma
      if (error.code === 'P2025') {
        throw {
          status: 404,
          message: 'Perfil de repartidor no encontrado',
          code: 'DRIVER_PROFILE_NOT_FOUND'
        };
      }

      if (error.code === 'P2002') {
        throw {
          status: 409,
          message: 'Conflicto en la actualización del perfil del repartidor',
          code: 'DRIVER_PROFILE_UPDATE_CONFLICT'
        };
      }

      // Error interno del servidor
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Obtiene el perfil del repartidor por userId
   * @param {number} userId - ID del usuario repartidor
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object|null>} Perfil del repartidor o null si no existe
   */
  static async getDriverProfile(userId, requestId) {
    try {
      const driverProfile = await prisma.driverProfile.findUnique({
        where: { userId: userId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          }
        }
      });

      if (!driverProfile) {
        return null;
      }

      // Formatear respuesta
      return {
        userId: driverProfile.userId,
        vehicleType: driverProfile.vehicleType,
        licensePlate: driverProfile.licensePlate,
        status: driverProfile.status,
        currentLocation: driverProfile.currentLatitude && driverProfile.currentLongitude ? {
          latitude: Number(driverProfile.currentLatitude),
          longitude: Number(driverProfile.currentLongitude)
        } : null,
        lastSeenAt: driverProfile.lastSeenAt,
        kycStatus: driverProfile.kycStatus,
        user: driverProfile.user,
        createdAt: driverProfile.createdAt,
        updatedAt: driverProfile.updatedAt
      };

    } catch (error) {
      logger.error('Error obteniendo perfil del repartidor', {
        requestId,
        meta: { userId, error: error.message }
      });
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      };
    }
  }

  /**
   * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
   * @param {number} lat1 - Latitud del primer punto
   * @param {number} lon1 - Longitud del primer punto
   * @param {number} lat2 - Latitud del segundo punto
   * @param {number} lon2 - Longitud del segundo punto
   * @returns {number} Distancia en kilómetros
   */
  static calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }

  /**
   * Obtiene los pedidos disponibles para un repartidor con filtros críticos
   * @param {number} userId - ID del usuario repartidor
   * @param {Object} filters - Filtros de paginación
   * @param {number} filters.page - Página actual (default: 1)
   * @param {number} filters.pageSize - Tamaño de página (default: 10)
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Objeto con orders y pagination
   */
  static async getAvailableOrdersForDriver(userId, filters, requestId) {
    try {
      logger.debug('Iniciando búsqueda de pedidos disponibles para repartidor', {
        requestId,
        meta: { userId, filters }
      });

      // 1. Obtener perfil del repartidor y validar estado
      const driverProfile = await prisma.driverProfile.findUnique({
        where: { userId },
        select: {
          userId: true,
          status: true,
          currentLatitude: true,
          currentLongitude: true
        }
      });

      if (!driverProfile) {
        logger.error('Perfil de repartidor no encontrado', {
          requestId,
          meta: { userId }
        });
        throw {
          status: 404,
          message: 'Perfil de repartidor no encontrado',
          code: 'DRIVER_PROFILE_NOT_FOUND'
        };
      }

      // VALIDACIÓN CRÍTICA 1: Verificar que el repartidor esté online
      if (driverProfile.status !== 'online') {
        logger.info('Repartidor no está online, retornando lista vacía', {
          requestId,
          meta: { 
            userId, 
            driverStatus: driverProfile.status 
          }
        });
        return {
          orders: [],
          pagination: {
            currentPage: filters.page || 1,
            pageSize: filters.pageSize || 10,
            totalCount: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false
          }
        };
      }

      // Validar que el repartidor tenga ubicación
      const driverLat = Number(driverProfile.currentLatitude);
      const driverLon = Number(driverProfile.currentLongitude);

      if (!driverLat || !driverLon) {
        logger.error('Repartidor no tiene ubicación configurada', {
          requestId,
          meta: { 
            userId, 
            currentLatitude: driverProfile.currentLatitude,
            currentLongitude: driverProfile.currentLongitude 
          }
        });
        throw {
          status: 400,
          message: 'Debes actualizar tu ubicación GPS antes de ver pedidos disponibles',
          code: 'DRIVER_LOCATION_UNKNOWN'
        };
      }

      // 2. Determinar tipo de repartidor y filtro base
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
      if (!userWithRoles) {
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
      const isPlatformDriver = userRoles.includes('driver_platform');
      const isRestaurantDriver = userRoles.includes('driver_restaurant');

      logger.debug('Tipo de repartidor determinado', {
        requestId,
        meta: { 
          userId, 
          isPlatformDriver, 
          isRestaurantDriver,
          roles: userRoles 
        }
      });

      // Construir filtro base para pedidos
      let whereClause = {
        status: 'ready_for_pickup',
        deliveryDriverId: null
      };

      // Determinar filtros específicos según el tipo de repartidor
      if (isPlatformDriver && isRestaurantDriver) {
        // Repartidor híbrido: puede ver pedidos de plataforma Y de sus restaurantes asignados
        const assignedRestaurantIds = userWithRoles.userRoleAssignments
          .filter(assignment => assignment.restaurantId)
          .map(assignment => assignment.restaurantId);

        if (assignedRestaurantIds.length > 0) {
          whereClause.OR = [
            { branch: { usesPlatformDrivers: true } },
            { 
              branch: { 
                restaurantId: { in: assignedRestaurantIds },
                usesPlatformDrivers: false 
              } 
            }
          ];
        } else {
          whereClause.branch = { usesPlatformDrivers: true };
        }
      } else if (isPlatformDriver) {
        // Solo repartidor de plataforma
        whereClause.branch = { usesPlatformDrivers: true };
      } else if (isRestaurantDriver) {
        // Solo repartidor de restaurante
        const assignedRestaurantIds = userWithRoles.userRoleAssignments
          .filter(assignment => assignment.restaurantId)
          .map(assignment => assignment.restaurantId);

        if (assignedRestaurantIds.length === 0) {
          throw {
            status: 403,
            message: 'No tienes restaurantes asignados',
            code: 'NO_RESTAURANTS_ASSIGNED'
          };
        }

        whereClause.branch = { 
          restaurantId: { in: assignedRestaurantIds },
          usesPlatformDrivers: false 
        };
      } else {
        throw {
          status: 403,
          message: 'No tienes permisos de repartidor válidos',
          code: 'INVALID_DRIVER_ROLE'
        };
      }

      // 3. Obtener pedidos candidatos con datos para filtro geográfico
      const candidateOrders = await prisma.order.findMany({
        where: whereClause,
        select: {
          id: true,
          status: true,
          branch: {
            select: {
              id: true,
              latitude: true,
              longitude: true,
              deliveryRadius: true,
              name: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      logger.debug('Pedidos candidatos obtenidos', {
        requestId,
        meta: { 
          userId, 
          candidateCount: candidateOrders.length 
        }
      });

      // 4. FILTRO GEOGRÁFICO - Aplicar distancia Haversine
      const filteredOrders = candidateOrders.filter(order => {
        if (!order.branch) return false;
        
        const branchLat = Number(order.branch.latitude);
        const branchLon = Number(order.branch.longitude);
        
        if (!branchLat || !branchLon) return false;

        const distance = this.calculateDistance(
          driverLat, 
          driverLon, 
          branchLat, 
          branchLon
        );

        const deliveryRadius = Number(order.branch.deliveryRadius) || 10; // Default 10km
        
        return distance <= deliveryRadius;
      });

      logger.info('Filtro geográfico aplicado', {
        requestId,
        meta: { 
          userId, 
          candidateCount: candidateOrders.length,
          filteredCount: filteredOrders.length 
        }
      });

      // 5. Aplicar paginación manualmente
      const totalCount = filteredOrders.length;
      const page = filters.page || 1;
      const pageSize = filters.pageSize || 10;
      const skip = (page - 1) * pageSize;
      const paginatedOrders = filteredOrders.slice(skip, skip + pageSize);

      // 6. Obtener detalles completos solo para la página actual
      let detailedPaginatedOrders = [];
      if (paginatedOrders.length > 0) {
        const orderIds = paginatedOrders.map(order => order.id);
        
        detailedPaginatedOrders = await prisma.order.findMany({
          where: { id: { in: orderIds } },
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
          },
          orderBy: { orderPlacedAt: 'asc' }
        });
      }

      // 7. Calcular metadatos de paginación
      const totalPages = Math.ceil(totalCount / pageSize);
      const pagination = {
        currentPage: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };

      // 8. Formatear respuesta final
      const formattedOrders = detailedPaginatedOrders.map(order => ({
        id: order.id.toString(),
        status: order.status,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total),
        commissionRateSnapshot: order.commissionRateSnapshot ? Number(order.commissionRateSnapshot) : null,
        platformFee: order.platformFee ? Number(order.platformFee) : null,
        restaurantPayout: order.restaurantPayout ? Number(order.restaurantPayout) : null,
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

      logger.info('Pedidos disponibles obtenidos exitosamente', {
        requestId,
        meta: { 
          userId, 
          totalCount,
          returnedCount: formattedOrders.length,
          page,
          pageSize 
        }
      });

      return {
        orders: formattedOrders,
        pagination: pagination
      };

    } catch (error) {
      // Si el error ya tiene estructura definida, simplemente re-lanzar
      if (error.status) {
        throw error;
      }

      // Para errores inesperados
      logger.error('Error obteniendo pedidos disponibles para repartidor', {
        requestId,
        meta: { 
          userId, 
          error: error.message,
          stack: error.stack
        }
      });

      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR'
      };
    }
  }
}

module.exports = DriverRepository;
