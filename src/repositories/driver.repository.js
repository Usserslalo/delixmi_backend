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

  /**
   * Acepta un pedido disponible para entrega
   * @param {BigInt} orderId - ID del pedido a aceptar
   * @param {number} userId - ID del repartidor que acepta el pedido
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Pedido actualizado con información completa
   */
  static async acceptOrder(orderId, userId, requestId) {
    try {
      logger.debug('Iniciando aceptación de pedido por repartidor', {
        requestId,
        meta: { orderId: orderId.toString(), userId }
      });

      // 1. Validar que el usuario tenga roles de repartidor
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
      if (!userWithRoles) {
        logger.error('Usuario no encontrado', {
          requestId,
          meta: { userId }
        });
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      const driverRoles = ['driver_platform', 'driver_restaurant'];
      const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
      const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

      if (!hasDriverRole) {
        logger.error('Usuario no tiene permisos de repartidor', {
          requestId,
          meta: { userId, userRoles, requiredRoles: driverRoles }
        });
        throw {
          status: 403,
          message: 'Acceso denegado. Se requieren permisos de repartidor',
          code: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // 2. Determinar criterios de elegibilidad según el tipo de repartidor
      const isPlatformDriver = userRoles.includes('driver_platform');
      const isRestaurantDriver = userRoles.includes('driver_restaurant');

      let orderEligibilityWhere = {};

      if (isPlatformDriver && isRestaurantDriver) {
        // Repartidor híbrido
        const assignedRestaurantIds = userWithRoles.userRoleAssignments
          .filter(assignment => assignment.restaurantId)
          .map(assignment => assignment.restaurantId);

        orderEligibilityWhere = {
          OR: [
            { branch: { usesPlatformDrivers: true } },
            ...(assignedRestaurantIds.length > 0 ? [{
              branch: { 
                restaurantId: { in: assignedRestaurantIds },
                usesPlatformDrivers: false 
              }
            }] : [])
          ]
        };
      } else if (isPlatformDriver) {
        // Solo repartidor de plataforma
        orderEligibilityWhere = {
          branch: { usesPlatformDrivers: true }
        };
      } else if (isRestaurantDriver) {
        // Solo repartidor de restaurante
        const assignedRestaurantIds = userWithRoles.userRoleAssignments
          .filter(assignment => assignment.restaurantId)
          .map(assignment => assignment.restaurantId);

        if (assignedRestaurantIds.length === 0) {
          logger.error('Repartidor de restaurante sin asignaciones', {
            requestId,
            meta: { userId, userRoles }
          });
          throw {
            status: 403,
            message: 'No tienes restaurantes asignados',
            code: 'NO_RESTAURANTS_ASSIGNED'
          };
        }

        orderEligibilityWhere = {
          branch: { 
            restaurantId: { in: assignedRestaurantIds },
            usesPlatformDrivers: false 
          }
        };
      }

      logger.debug('Criterios de elegibilidad determinados', {
        requestId,
        meta: { 
          userId, 
          isPlatformDriver, 
          isRestaurantDriver,
          orderEligibilityWhere
        }
      });

      // 3. TRANSACCIÓN CRÍTICA - Aceptar pedido y actualizar estado del repartidor
      let updatedOrder;
      try {
        updatedOrder = await prisma.$transaction(async (tx) => {
          // 3.1. Intentar asignar el pedido (esto actúa como select-for-update)
          const assignedOrder = await tx.order.update({
            where: {
              id: orderId,
              status: 'ready_for_pickup',
              deliveryDriverId: null,
              ...orderEligibilityWhere
            },
            data: {
              deliveryDriverId: userId,
              status: 'out_for_delivery',
              updatedAt: new Date()
            }
          });

          logger.info('Pedido asignado exitosamente en transacción', {
            requestId,
            meta: { 
              orderId: orderId.toString(), 
              userId,
              newStatus: assignedOrder.status
            }
          });

          // 3.2. Actualizar estado del repartidor a 'busy'
          await tx.driverProfile.update({
            where: { userId: userId },
            data: { 
              status: 'busy',
              lastSeenAt: new Date(),
              updatedAt: new Date()
            }
          });

          logger.info('Estado del repartidor actualizado a busy', {
            requestId,
            meta: { userId }
          });

          return assignedOrder;
        });

      } catch (transactionError) {
        // Manejo específico del error P2025 (Record to update not found)
        if (transactionError.code === 'P2025') {
          logger.warn('Pedido no pudo ser aceptado - ya fue tomado o no es elegible', {
            requestId,
            meta: { 
              orderId: orderId.toString(), 
              userId,
              errorCode: transactionError.code
            }
          });
          throw {
            status: 409,
            message: 'Este pedido ya fue tomado por otro repartidor o no está disponible para ti',
            code: 'ORDER_ALREADY_TAKEN_OR_INVALID'
          };
        }
        throw transactionError;
      }

      // 4. Obtener datos completos del pedido actualizado
      const completeOrder = await prisma.order.findUnique({
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
              references: true,
              latitude: true,
              longitude: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              phone: true,
              usesPlatformDrivers: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          deliveryDriver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrl: true,
                  subcategory: {
                    select: {
                      name: true
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
          }
        }
      });

      if (!completeOrder) {
        logger.error('Error obteniendo datos completos del pedido después de aceptarlo', {
          requestId,
          meta: { orderId: orderId.toString(), userId }
        });
        throw {
          status: 500,
          message: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        };
      }

      // 5. Formatear respuesta
      const formattedOrder = {
        id: completeOrder.id.toString(),
        status: completeOrder.status,
        subtotal: Number(completeOrder.subtotal),
        deliveryFee: Number(completeOrder.deliveryFee),
        total: Number(completeOrder.total),
        paymentMethod: completeOrder.paymentMethod,
        paymentStatus: completeOrder.paymentStatus,
        specialInstructions: completeOrder.specialInstructions,
        orderPlacedAt: completeOrder.orderPlacedAt,
        orderDeliveredAt: completeOrder.orderDeliveredAt,
        updatedAt: completeOrder.updatedAt,
        customer: completeOrder.customer ? {
          id: completeOrder.customer.id,
          name: completeOrder.customer.name,
          lastname: completeOrder.customer.lastname,
          fullName: `${completeOrder.customer.name} ${completeOrder.customer.lastname}`,
          email: completeOrder.customer.email,
          phone: completeOrder.customer.phone
        } : null,
        address: completeOrder.address ? {
          id: completeOrder.address.id,
          alias: completeOrder.address.alias,
          street: completeOrder.address.street,
          exteriorNumber: completeOrder.address.exteriorNumber,
          interiorNumber: completeOrder.address.interiorNumber,
          neighborhood: completeOrder.address.neighborhood,
          city: completeOrder.address.city,
          state: completeOrder.address.state,
          zipCode: completeOrder.address.zipCode,
          references: completeOrder.address.references,
          fullAddress: `${completeOrder.address.street} ${completeOrder.address.exteriorNumber}${completeOrder.address.interiorNumber ? ' Int. ' + completeOrder.address.interiorNumber : ''}, ${completeOrder.address.neighborhood}, ${completeOrder.address.city}, ${completeOrder.address.state} ${completeOrder.address.zipCode}`,
          coordinates: {
            latitude: completeOrder.address.latitude ? Number(completeOrder.address.latitude) : null,
            longitude: completeOrder.address.longitude ? Number(completeOrder.address.longitude) : null
          }
        } : null,
        branch: completeOrder.branch ? {
          id: completeOrder.branch.id,
          name: completeOrder.branch.name,
          address: completeOrder.branch.address,
          phone: completeOrder.branch.phone,
          usesPlatformDrivers: completeOrder.branch.usesPlatformDrivers,
          coordinates: {
            latitude: completeOrder.branch.latitude ? Number(completeOrder.branch.latitude) : null,
            longitude: completeOrder.branch.longitude ? Number(completeOrder.branch.longitude) : null
          },
          restaurant: completeOrder.branch.restaurant ? {
            id: completeOrder.branch.restaurant.id,
            name: completeOrder.branch.restaurant.name
          } : null
        } : null,
        deliveryDriver: completeOrder.deliveryDriver ? {
          id: completeOrder.deliveryDriver.id,
          name: completeOrder.deliveryDriver.name,
          lastname: completeOrder.deliveryDriver.lastname,
          fullName: `${completeOrder.deliveryDriver.name} ${completeOrder.deliveryDriver.lastname}`,
          email: completeOrder.deliveryDriver.email,
          phone: completeOrder.deliveryDriver.phone
        } : null,
        orderItems: completeOrder.orderItems ? completeOrder.orderItems.map(item => ({
          id: item.id.toString(),
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            price: Number(item.product.price),
            imageUrl: item.product.imageUrl,
            category: item.product.subcategory ? item.product.subcategory.name : null
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

      // 6. Enviar notificaciones WebSocket
      try {
        const { getIo } = require('../config/socket');
        const io = getIo();

        if (io && completeOrder.customer && completeOrder.branch) {
          const customerId = completeOrder.customer.id;
          const driverName = `${userWithRoles.name} ${userWithRoles.lastname}`;

          // Notificar al cliente
          io.to(`user_${customerId}`).emit('order_status_update', {
            order: formattedOrder,
            orderId: formattedOrder.id,
            status: formattedOrder.status,
            previousStatus: 'ready_for_pickup',
            updatedAt: formattedOrder.updatedAt,
            driver: formattedOrder.deliveryDriver,
            message: `¡Tu pedido #${formattedOrder.id} está en camino! Repartidor: ${driverName}`
          });

          // Notificar al restaurante
          if (completeOrder.branch.restaurant) {
            const restaurantId = completeOrder.branch.restaurant.id;
            io.to(`restaurant_${restaurantId}`).emit('order_status_update', {
              order: formattedOrder,
              orderId: formattedOrder.id,
              status: formattedOrder.status,
              previousStatus: 'ready_for_pickup',
              updatedAt: formattedOrder.updatedAt,
              driver: formattedOrder.deliveryDriver,
              message: `El repartidor ${driverName} aceptó el pedido #${formattedOrder.id}`
            });
          }

          logger.info('Notificaciones WebSocket enviadas', {
            requestId,
            meta: { 
              orderId: orderId.toString(), 
              customerId,
              restaurantId: completeOrder.branch.restaurant?.id
            }
          });
        }
      } catch (socketError) {
        logger.error('Error enviando notificaciones WebSocket', {
          requestId,
          meta: { 
            orderId: orderId.toString(), 
            error: socketError.message,
            stack: socketError.stack
          }
        });
        // No fallar la respuesta por error de socket
      }

      logger.info('Pedido aceptado exitosamente por repartidor', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
          userId,
          orderStatus: formattedOrder.status
        }
      });

      return {
        order: formattedOrder,
        driverInfo: {
          userId: userId,
          driverName: `${userWithRoles.name} ${userWithRoles.lastname}`,
          driverTypes: userRoles.filter(role => driverRoles.includes(role)),
          acceptedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      // Si el error ya tiene estructura definida, simplemente re-lanzar
      if (error.status) {
        throw error;
      }

      // Para errores inesperados
      logger.error('Error aceptando pedido por repartidor', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
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

  /**
   * Marca un pedido como entregado/completado por el repartidor
   * @param {BigInt} orderId - ID del pedido a completar
   * @param {number} userId - ID del repartidor que completa el pedido
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Pedido completado con información completa
   */
  static async completeOrder(orderId, userId, requestId) {
    try {
      logger.debug('Iniciando completado de pedido por repartidor', {
        requestId,
        meta: { orderId: orderId.toString(), userId }
      });

      // 1. Validar que el usuario tenga roles de repartidor
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
      if (!userWithRoles) {
        logger.error('Usuario no encontrado', {
          requestId,
          meta: { userId }
        });
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      const driverRoles = ['driver_platform', 'driver_restaurant'];
      const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
      const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

      if (!hasDriverRole) {
        logger.error('Usuario no tiene permisos de repartidor', {
          requestId,
          meta: { userId, userRoles, requiredRoles: driverRoles }
        });
        throw {
          status: 403,
          message: 'Acceso denegado. Se requieren permisos de repartidor',
          code: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // 2. Buscar pedido y validar asignación
      const existingOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          status: 'out_for_delivery',
          deliveryDriverId: userId
        },
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
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              phone: true,
              usesPlatformDrivers: true,
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

      if (!existingOrder) {
        logger.warn('Pedido no encontrado o no asignado al repartidor', {
          requestId,
          meta: { orderId: orderId.toString(), userId }
        });
        throw {
          status: 404,
          message: 'Pedido no encontrado, no te pertenece o ya fue entregado',
          code: 'ORDER_NOT_FOUND_OR_NOT_ASSIGNED',
          details: {
            orderId: orderId.toString(),
            userId: userId,
            possibleReasons: [
              'El pedido no existe',
              'El pedido no está asignado a este repartidor',
              'El pedido ya fue entregado',
              'El pedido no está en estado "out_for_delivery"'
            ]
          }
        };
      }

      logger.debug('Pedido encontrado y validado', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
          userId,
          orderStatus: existingOrder.status,
          customerId: existingOrder.customer?.id,
          restaurantId: existingOrder.branch?.restaurant?.id
        }
      });

      // 3. TRANSACCIÓN CRÍTICA - Completar pedido y actualizar estado del repartidor
      let completedOrder;
      try {
        completedOrder = await prisma.$transaction(async (tx) => {
          // 3.1. Actualizar pedido a 'delivered'
          const updatedOrder = await tx.order.update({
            where: { id: orderId },
            data: {
              status: 'delivered',
              orderDeliveredAt: new Date(),
              updatedAt: new Date()
            }
          });

          logger.info('Pedido marcado como entregado en transacción', {
            requestId,
            meta: { 
              orderId: orderId.toString(), 
              userId,
              newStatus: updatedOrder.status,
              deliveredAt: updatedOrder.orderDeliveredAt
            }
          });

          // 3.2. ¡CORRECCIÓN CRÍTICA! Actualizar estado del repartidor a 'online'
          await tx.driverProfile.update({
            where: { userId: userId },
            data: {
              status: 'online', // Volver a disponible para nuevos pedidos
              lastSeenAt: new Date(),
              updatedAt: new Date()
            }
          });

          logger.info('Estado del repartidor actualizado a online', {
            requestId,
            meta: { userId }
          });

          return updatedOrder;
        });

      } catch (transactionError) {
        logger.error('Error en transacción al completar pedido', {
          requestId,
          meta: { 
            orderId: orderId.toString(), 
            userId,
            error: transactionError.message,
            code: transactionError.code
          }
        });
        throw transactionError;
      }

      // 4. Obtener datos completos del pedido actualizado
      const completeOrderData = await prisma.order.findUnique({
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
              references: true,
              latitude: true,
              longitude: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              phone: true,
              usesPlatformDrivers: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          deliveryDriver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true
            }
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  imageUrl: true,
                  subcategory: {
                    select: {
                      name: true
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
          }
        }
      });

      if (!completeOrderData) {
        logger.error('Error obteniendo datos completos del pedido después de completarlo', {
          requestId,
          meta: { orderId: orderId.toString(), userId }
        });
        throw {
          status: 500,
          message: 'Error interno del servidor',
          code: 'INTERNAL_ERROR'
        };
      }

      // 5. Formatear respuesta
      const formattedOrder = {
        id: completeOrderData.id.toString(),
        status: completeOrderData.status,
        subtotal: Number(completeOrderData.subtotal),
        deliveryFee: Number(completeOrderData.deliveryFee),
        total: Number(completeOrderData.total),
        paymentMethod: completeOrderData.paymentMethod,
        paymentStatus: completeOrderData.paymentStatus,
        specialInstructions: completeOrderData.specialInstructions,
        orderPlacedAt: completeOrderData.orderPlacedAt,
        orderDeliveredAt: completeOrderData.orderDeliveredAt,
        updatedAt: completeOrderData.updatedAt,
        customer: completeOrderData.customer ? {
          id: completeOrderData.customer.id,
          name: completeOrderData.customer.name,
          lastname: completeOrderData.customer.lastname,
          fullName: `${completeOrderData.customer.name} ${completeOrderData.customer.lastname}`,
          email: completeOrderData.customer.email,
          phone: completeOrderData.customer.phone
        } : null,
        address: completeOrderData.address ? {
          id: completeOrderData.address.id,
          alias: completeOrderData.address.alias,
          street: completeOrderData.address.street,
          exteriorNumber: completeOrderData.address.exteriorNumber,
          interiorNumber: completeOrderData.address.interiorNumber,
          neighborhood: completeOrderData.address.neighborhood,
          city: completeOrderData.address.city,
          state: completeOrderData.address.state,
          zipCode: completeOrderData.address.zipCode,
          references: completeOrderData.address.references,
          fullAddress: `${completeOrderData.address.street} ${completeOrderData.address.exteriorNumber}${completeOrderData.address.interiorNumber ? ' Int. ' + completeOrderData.address.interiorNumber : ''}, ${completeOrderData.address.neighborhood}, ${completeOrderData.address.city}, ${completeOrderData.address.state} ${completeOrderData.address.zipCode}`,
          coordinates: {
            latitude: completeOrderData.address.latitude ? Number(completeOrderData.address.latitude) : null,
            longitude: completeOrderData.address.longitude ? Number(completeOrderData.address.longitude) : null
          }
        } : null,
        branch: completeOrderData.branch ? {
          id: completeOrderData.branch.id,
          name: completeOrderData.branch.name,
          address: completeOrderData.branch.address,
          phone: completeOrderData.branch.phone,
          usesPlatformDrivers: completeOrderData.branch.usesPlatformDrivers,
          coordinates: {
            latitude: completeOrderData.branch.latitude ? Number(completeOrderData.branch.latitude) : null,
            longitude: completeOrderData.branch.longitude ? Number(completeOrderData.branch.longitude) : null
          },
          restaurant: completeOrderData.branch.restaurant ? {
            id: completeOrderData.branch.restaurant.id,
            name: completeOrderData.branch.restaurant.name
          } : null
        } : null,
        deliveryDriver: completeOrderData.deliveryDriver ? {
          id: completeOrderData.deliveryDriver.id,
          name: completeOrderData.deliveryDriver.name,
          lastname: completeOrderData.deliveryDriver.lastname,
          fullName: `${completeOrderData.deliveryDriver.name} ${completeOrderData.deliveryDriver.lastname}`,
          email: completeOrderData.deliveryDriver.email,
          phone: completeOrderData.deliveryDriver.phone
        } : null,
        orderItems: completeOrderData.orderItems ? completeOrderData.orderItems.map(item => ({
          id: item.id.toString(),
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            price: Number(item.product.price),
            imageUrl: item.product.imageUrl,
            category: item.product.subcategory ? item.product.subcategory.name : null
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

      // 6. ¡CORRECCIÓN CRÍTICA 2! Enviar notificaciones WebSocket
      try {
        const { getIo } = require('../config/socket');
        const io = getIo();

        if (io && completeOrderData.customer && completeOrderData.branch) {
          const customerId = completeOrderData.customer.id;
          const driverName = `${userWithRoles.name} ${userWithRoles.lastname}`;
          const deliveryTime = completeOrderData.orderDeliveredAt && completeOrderData.orderPlacedAt 
            ? completeOrderData.orderDeliveredAt - completeOrderData.orderPlacedAt 
            : null;

          // Notificar al cliente
          io.to(`user_${customerId}`).emit('order_status_update', {
            order: formattedOrder,
            orderId: formattedOrder.id,
            status: formattedOrder.status,
            previousStatus: 'out_for_delivery',
            updatedAt: formattedOrder.updatedAt,
            orderDeliveredAt: formattedOrder.orderDeliveredAt,
            driver: formattedOrder.deliveryDriver,
            deliveryStats: deliveryTime ? {
              deliveryTime: deliveryTime,
              deliveryTimeFormatted: this.formatDeliveryTime(deliveryTime)
            } : null,
            message: `¡Tu pedido #${formattedOrder.id} ha sido entregado exitosamente! Tiempo de entrega: ${deliveryTime ? this.formatDeliveryTime(deliveryTime) : 'N/A'}`
          });

          // ¡NUEVO! Notificar al restaurante
          if (completeOrderData.branch.restaurant) {
            const restaurantId = completeOrderData.branch.restaurant.id;
            io.to(`restaurant_${restaurantId}`).emit('order_status_update', {
              order: formattedOrder,
              orderId: formattedOrder.id,
              status: formattedOrder.status,
              previousStatus: 'out_for_delivery',
              updatedAt: formattedOrder.updatedAt,
              orderDeliveredAt: formattedOrder.orderDeliveredAt,
              driver: formattedOrder.deliveryDriver,
              message: `El pedido #${formattedOrder.id} fue entregado por ${driverName}`
            });
          }

          logger.info('Notificaciones WebSocket enviadas', {
            requestId,
            meta: { 
              orderId: orderId.toString(), 
              customerId,
              restaurantId: completeOrderData.branch.restaurant?.id
            }
          });
        }
      } catch (socketError) {
        logger.error('Error enviando notificaciones WebSocket', {
          requestId,
          meta: { 
            orderId: orderId.toString(), 
            error: socketError.message,
            stack: socketError.stack
          }
        });
        // No fallar la respuesta por error de socket
      }

      logger.info('Pedido completado exitosamente por repartidor', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
          userId,
          orderStatus: formattedOrder.status,
          driverStatusUpdated: 'online'
        }
      });

      return {
        order: formattedOrder,
        driverInfo: {
          userId: userId,
          driverName: `${userWithRoles.name} ${userWithRoles.lastname}`,
          driverTypes: userRoles.filter(role => driverRoles.includes(role)),
          completedAt: formattedOrder.orderDeliveredAt
        },
        deliveryStats: {
          deliveryTime: formattedOrder.orderDeliveredAt && formattedOrder.orderPlacedAt 
            ? formattedOrder.orderDeliveredAt - formattedOrder.orderPlacedAt 
            : null,
          deliveryTimeFormatted: formattedOrder.orderDeliveredAt && formattedOrder.orderPlacedAt 
            ? this.formatDeliveryTime(formattedOrder.orderDeliveredAt - formattedOrder.orderPlacedAt) 
            : null
        }
      };

    } catch (error) {
      // Si el error ya tiene estructura definida, simplemente re-lanzar
      if (error.status) {
        throw error;
      }

      // Para errores inesperados
      logger.error('Error completando pedido por repartidor', {
        requestId,
        meta: { 
          orderId: orderId.toString(), 
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

  /**
   * Actualiza la ubicación GPS del repartidor
   * @param {number} userId - ID del usuario repartidor
   * @param {Object} locationData - Datos de ubicación
   * @param {number} locationData.latitude - Latitud (-90 a 90)
   * @param {number} locationData.longitude - Longitud (-180 a 180)
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Perfil del repartidor actualizado
   */
  static async updateDriverLocation(userId, locationData, requestId) {
    try {
      logger.debug('Iniciando actualización de ubicación del repartidor', {
        requestId,
        meta: { userId, latitude: locationData.latitude, longitude: locationData.longitude }
      });

      // 1. Validar que el usuario tenga roles de repartidor
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
      if (!userWithRoles) {
        logger.error('Usuario no encontrado al actualizar ubicación', {
          requestId,
          meta: { userId }
        });
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      const driverRoles = ['driver_platform', 'driver_restaurant'];
      const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
      const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

      if (!hasDriverRole) {
        logger.error('Usuario no tiene permisos de repartidor para actualizar ubicación', {
          requestId,
          meta: { userId, userRoles, requiredRoles: driverRoles }
        });
        throw {
          status: 403,
          message: 'Acceso denegado. Se requieren permisos de repartidor',
          code: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // 2. Buscar el perfil del repartidor
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
        logger.error('Perfil de repartidor no encontrado para actualizar ubicación', {
          requestId,
          meta: { userId }
        });
        throw {
          status: 404,
          message: 'Perfil de repartidor no encontrado',
          code: 'DRIVER_PROFILE_NOT_FOUND',
          details: {
            userId: userId,
            suggestion: 'Contacta al administrador para crear tu perfil de repartidor'
          }
        };
      }

      logger.debug('Perfil de repartidor encontrado para actualizar ubicación', {
        requestId,
        meta: { 
          userId, 
          currentLocation: {
            latitude: existingDriverProfile.currentLatitude,
            longitude: existingDriverProfile.currentLongitude
          },
          newLocation: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          }
        }
      });

      // 3. Actualizar la ubicación del repartidor
      const updatedDriverProfile = await prisma.driverProfile.update({
        where: { userId: userId },
        data: {
          currentLatitude: parseFloat(locationData.latitude),
          currentLongitude: parseFloat(locationData.longitude),
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

      logger.info('Ubicación del repartidor actualizada exitosamente', {
        requestId,
        meta: { 
          userId,
          previousLocation: {
            latitude: existingDriverProfile.currentLatitude,
            longitude: existingDriverProfile.currentLongitude
          },
          newLocation: {
            latitude: updatedDriverProfile.currentLatitude,
            longitude: updatedDriverProfile.currentLongitude
          },
          updatedAt: updatedDriverProfile.lastSeenAt
        }
      });

      // 4. Formatear respuesta
      const formattedProfile = {
        userId: updatedDriverProfile.userId,
        vehicleType: updatedDriverProfile.vehicleType,
        licensePlate: updatedDriverProfile.licensePlate,
        status: updatedDriverProfile.status,
        currentLocation: {
          latitude: updatedDriverProfile.currentLatitude ? Number(updatedDriverProfile.currentLatitude) : null,
          longitude: updatedDriverProfile.currentLongitude ? Number(updatedDriverProfile.currentLongitude) : null
        },
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
        locationUpdate: {
          previousLocation: {
            latitude: existingDriverProfile.currentLatitude ? Number(existingDriverProfile.currentLatitude) : null,
            longitude: existingDriverProfile.currentLongitude ? Number(existingDriverProfile.currentLongitude) : null
          },
          newLocation: {
            latitude: Number(locationData.latitude),
            longitude: Number(locationData.longitude)
          },
          updatedAt: updatedDriverProfile.lastSeenAt
        }
      };

    } catch (error) {
      // Si el error ya tiene estructura definida, simplemente re-lanzar
      if (error.status) {
        throw error;
      }

      // Para errores inesperados
      logger.error('Error inesperado actualizando ubicación del repartidor', {
        requestId,
        meta: { 
          userId, 
          latitude: locationData.latitude,
          longitude: locationData.longitude,
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
          message: 'Conflicto en la actualización de ubicación',
          code: 'LOCATION_UPDATE_CONFLICT'
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
   * Obtiene la entrega activa actual del repartidor
   * @param {number} userId - ID del usuario repartidor
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object|null>} Pedido activo formateado o null si no hay entrega activa
   */
  static async getCurrentOrderForDriver(userId, requestId) {
    try {
      logger.debug('Iniciando búsqueda de entrega activa del repartidor', {
        requestId,
        meta: { userId }
      });

      // 1. Validar que el usuario tenga roles de repartidor
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
      if (!userWithRoles) {
        logger.error('Usuario no encontrado al buscar entrega activa', {
          requestId,
          meta: { userId }
        });
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      const driverRoles = ['driver_platform', 'driver_restaurant'];
      const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
      const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

      if (!hasDriverRole) {
        logger.error('Usuario no tiene permisos de repartidor para buscar entrega activa', {
          requestId,
          meta: { userId, userRoles, requiredRoles: driverRoles }
        });
        throw {
          status: 403,
          message: 'Acceso denegado. Se requieren permisos de repartidor',
          code: 'INSUFFICIENT_PERMISSIONS'
        };
      }

      // 2. Buscar pedido activo del repartidor
      const activeOrder = await prisma.order.findFirst({
        where: {
          deliveryDriverId: userId,
          status: 'out_for_delivery' // Solo pedidos "en camino"
        },
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
              references: true,
              latitude: true,
              longitude: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              phone: true,
              usesPlatformDrivers: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          deliveryDriver: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
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
                  description: true,
                  price: true,
                  imageUrl: true,
                  subcategory: {
                    select: {
                      name: true,
                      category: {
                        select: {
                          name: true
                        }
                      }
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
          }
        }
      });

      if (!activeOrder) {
        logger.debug('No se encontró entrega activa para el repartidor', {
          requestId,
          meta: { userId }
        });
        return null;
      }

      logger.info('Entrega activa encontrada para el repartidor', {
        requestId,
        meta: { 
          userId,
          orderId: activeOrder.id.toString(),
          customerId: activeOrder.customer?.id,
          restaurantId: activeOrder.branch?.restaurant?.id,
          status: activeOrder.status
        }
      });

      // 3. Formatear respuesta
      const formattedOrder = {
        id: activeOrder.id.toString(),
        status: activeOrder.status,
        subtotal: Number(activeOrder.subtotal),
        deliveryFee: Number(activeOrder.deliveryFee),
        total: Number(activeOrder.total),
        paymentMethod: activeOrder.paymentMethod,
        paymentStatus: activeOrder.paymentStatus,
        specialInstructions: activeOrder.specialInstructions,
        orderPlacedAt: activeOrder.orderPlacedAt,
        orderDeliveredAt: activeOrder.orderDeliveredAt,
        createdAt: activeOrder.createdAt,
        updatedAt: activeOrder.updatedAt,
        customer: activeOrder.customer ? {
          id: activeOrder.customer.id,
          name: activeOrder.customer.name,
          lastname: activeOrder.customer.lastname,
          fullName: `${activeOrder.customer.name} ${activeOrder.customer.lastname}`,
          email: activeOrder.customer.email,
          phone: activeOrder.customer.phone
        } : null,
        address: activeOrder.address ? {
          id: activeOrder.address.id,
          alias: activeOrder.address.alias,
          street: activeOrder.address.street,
          exteriorNumber: activeOrder.address.exteriorNumber,
          interiorNumber: activeOrder.address.interiorNumber,
          neighborhood: activeOrder.address.neighborhood,
          city: activeOrder.address.city,
          state: activeOrder.address.state,
          zipCode: activeOrder.address.zipCode,
          references: activeOrder.address.references,
          fullAddress: `${activeOrder.address.street} ${activeOrder.address.exteriorNumber}${activeOrder.address.interiorNumber ? ' Int. ' + activeOrder.address.interiorNumber : ''}, ${activeOrder.address.neighborhood}, ${activeOrder.address.city}, ${activeOrder.address.state} ${activeOrder.address.zipCode}`,
          coordinates: {
            latitude: activeOrder.address.latitude ? Number(activeOrder.address.latitude) : null,
            longitude: activeOrder.address.longitude ? Number(activeOrder.address.longitude) : null
          }
        } : null,
        branch: activeOrder.branch ? {
          id: activeOrder.branch.id,
          name: activeOrder.branch.name,
          address: activeOrder.branch.address,
          phone: activeOrder.branch.phone,
          usesPlatformDrivers: activeOrder.branch.usesPlatformDrivers,
          coordinates: {
            latitude: activeOrder.branch.latitude ? Number(activeOrder.branch.latitude) : null,
            longitude: activeOrder.branch.longitude ? Number(activeOrder.branch.longitude) : null
          },
          restaurant: activeOrder.branch.restaurant ? {
            id: activeOrder.branch.restaurant.id,
            name: activeOrder.branch.restaurant.name
          } : null
        } : null,
        deliveryDriver: activeOrder.deliveryDriver ? {
          id: activeOrder.deliveryDriver.id,
          name: activeOrder.deliveryDriver.name,
          lastname: activeOrder.deliveryDriver.lastname,
          fullName: `${activeOrder.deliveryDriver.name} ${activeOrder.deliveryDriver.lastname}`,
          email: activeOrder.deliveryDriver.email,
          phone: activeOrder.deliveryDriver.phone
        } : null,
        payment: activeOrder.payment ? {
          id: activeOrder.payment.id.toString(),
          status: activeOrder.payment.status,
          provider: activeOrder.payment.provider,
          providerPaymentId: activeOrder.payment.providerPaymentId,
          amount: Number(activeOrder.payment.amount),
          currency: activeOrder.payment.currency
        } : null,
        orderItems: activeOrder.orderItems ? activeOrder.orderItems.map(item => ({
          id: item.id.toString(),
          productId: item.productId,
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          product: item.product ? {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            price: Number(item.product.price),
            imageUrl: item.product.imageUrl,
            category: {
              subcategory: item.product.subcategory ? item.product.subcategory.name : null,
              category: item.product.subcategory?.category ? item.product.subcategory.category.name : null
            }
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
        })) : [],
        deliveryInfo: {
          estimatedDeliveryTime: null, // Se puede calcular basado en distancia
          deliveryInstructions: activeOrder.address?.references || 'Sin instrucciones especiales'
        }
      };

      return formattedOrder;

    } catch (error) {
      // Si el error ya tiene estructura definida, simplemente re-lanzar
      if (error.status) {
        throw error;
      }

      // Para errores inesperados
      logger.error('Error inesperado obteniendo entrega activa del repartidor', {
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

  /**
   * Función auxiliar para formatear el tiempo de entrega
   * @param {number} deliveryTimeMs - Tiempo de entrega en milisegundos
   * @returns {string} Tiempo formateado
   */
  static formatDeliveryTime(deliveryTimeMs) {
    const minutes = Math.floor(deliveryTimeMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }
}

module.exports = DriverRepository;
