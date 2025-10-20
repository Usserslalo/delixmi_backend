/**
 * Servicio para gestionar notificaciones a repartidores
 * Maneja las notificaciones cuando un pedido cambia a estado 'preparing'
 */
const { prisma } = require('../config/database');
const { getIo } = require('../config/socket');
const { logger } = require('../config/logger');

/**
 * Calcula la distancia entre dos puntos geográficos usando la fórmula de Haversine
 * @param {number} lat1 - Latitud del primer punto
 * @param {number} lon1 - Longitud del primer punto
 * @param {number} lat2 - Latitud del segundo punto
 * @param {number} lon2 - Longitud del segundo punto
 * @returns {number} Distancia en kilómetros
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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

class NotificationService {
  
  /**
   * Notifica a repartidores disponibles sobre un nuevo pedido
   * @param {Object} order - Objeto del pedido con todas las relaciones necesarias
   * @param {string} requestId - ID de la request para logging
   */
  static async notifyAvailableOrder(order, requestId = null) {
    try {
      logger.info('Iniciando notificación a repartidores', {
        requestId,
        meta: {
          orderId: order.id.toString(),
          branchId: order.branchId,
          usesPlatformDrivers: order.branch?.usesPlatformDrivers
        }
      });

      const io = getIo();
      if (!io) {
        logger.warn('Socket.io no está disponible para notificaciones', {
          requestId,
          meta: { orderId: order.id.toString() }
        });
        return;
      }

      // Verificar que el pedido tenga la información necesaria
      if (!order.branch) {
        logger.error('Pedido no tiene información de sucursal', {
          requestId,
          meta: { orderId: order.id.toString() }
        });
        return;
      }

      let eligibleDrivers = [];

      // Lógica principal basada en usesPlatformDrivers
      if (order.branch.usesPlatformDrivers) {
        // Repartidores de Plataforma
        eligibleDrivers = await this.getPlatformDrivers(order.branch, requestId);
      } else {
        // Repartidores del Restaurante
        eligibleDrivers = await this.getRestaurantDrivers(order.branch, requestId);
      }

      if (eligibleDrivers.length === 0) {
        logger.info('No se encontraron repartidores disponibles', {
          requestId,
          meta: {
            orderId: order.id.toString(),
            branchId: order.branchId,
            usesPlatformDrivers: order.branch.usesPlatformDrivers
          }
        });
        return;
      }

      // Construir el payload de notificación
      const payload = this.buildNotificationPayload(order);

      // Emitir evento a cada repartidor elegible
      let notifiedCount = 0;
      for (const driver of eligibleDrivers) {
        try {
          io.to(`user_${driver.userId}`).emit('available_order', payload);
          notifiedCount++;
          
          logger.debug('Notificación enviada a repartidor', {
            requestId,
            meta: {
              orderId: order.id.toString(),
              driverId: driver.userId,
              driverName: driver.userName,
              driverLocation: {
                latitude: driver.currentLatitude,
                longitude: driver.currentLongitude
              }
            }
          });
        } catch (error) {
          logger.error('Error enviando notificación a repartidor individual', {
            requestId,
            meta: {
              orderId: order.id.toString(),
              driverId: driver.userId,
              error: error.message
            }
          });
        }
      }

      logger.info('Notificaciones de pedido enviadas exitosamente', {
        requestId,
        meta: {
          orderId: order.id.toString(),
          totalDrivers: eligibleDrivers.length,
          notifiedCount,
          usesPlatformDrivers: order.branch.usesPlatformDrivers
        }
      });

    } catch (error) {
      logger.error('Error en notifyAvailableOrder', {
        requestId,
        meta: {
          orderId: order.id?.toString(),
          error: error.message,
          stack: error.stack
        }
      });
      throw error;
    }
  }

  /**
   * Obtiene repartidores de plataforma disponibles dentro del radio
   * @param {Object} branch - Información de la sucursal
   * @param {string} requestId - ID de la request
   * @returns {Array} Lista de repartidores elegibles
   */
  static async getPlatformDrivers(branch, requestId) {
    try {
      const maxRadius = 10; // km - Radio configurable
      const branchLat = Number(branch.latitude);
      const branchLon = Number(branch.longitude);

      if (!branchLat || !branchLon) {
        logger.warn('Sucursal no tiene coordenadas para buscar repartidores', {
          requestId,
          meta: { branchId: branch.id }
        });
        return [];
      }

      // Buscar repartidores activos con perfil de driver
      const drivers = await prisma.driverProfile.findMany({
        where: {
          status: 'online'
        },
        include: {
          user: {
            include: {
              userRoleAssignments: {
                include: {
                  role: true
                }
              }
            }
          }
        }
      });

      // Filtrar por rol driver_platform y distancia
      const eligibleDrivers = drivers.filter(driverProfile => {
        // Verificar que tenga el rol driver_platform
        const hasPlatformRole = driverProfile.user.userRoleAssignments.some(
          assignment => assignment.role.name === 'driver_platform'
        );

        if (!hasPlatformRole) return false;

        // Verificar coordenadas y distancia
        const driverLat = Number(driverProfile.currentLatitude);
        const driverLon = Number(driverProfile.currentLongitude);

        if (!driverLat || !driverLon) return false;

        const distance = calculateDistance(branchLat, branchLon, driverLat, driverLon);
        
        return distance <= maxRadius;
      });

      // Mapear resultado para incluir información necesaria
      return eligibleDrivers.map(driverProfile => ({
        userId: driverProfile.userId,
        userName: `${driverProfile.user.name} ${driverProfile.user.lastname}`,
        currentLatitude: driverProfile.currentLatitude,
        currentLongitude: driverProfile.currentLongitude,
        status: driverProfile.status
      }));

    } catch (error) {
      logger.error('Error obteniendo repartidores de plataforma', {
        requestId,
        meta: {
          branchId: branch.id,
          error: error.message
        }
      });
      return [];
    }
  }

  /**
   * Obtiene repartidores del restaurante disponibles
   * @param {Object} branch - Información de la sucursal
   * @param {string} requestId - ID de la request
   * @returns {Array} Lista de repartidores elegibles
   */
  static async getRestaurantDrivers(branch, requestId) {
    try {
      // Buscar usuarios con rol driver_restaurant para este restaurante
      const roleAssignments = await prisma.userRoleAssignment.findMany({
        where: {
          restaurantId: branch.restaurantId,
          role: {
            name: 'driver_restaurant'
          }
        },
        include: {
          user: {
            include: {
              driverProfile: true
            }
          }
        }
      });

      // Filtrar solo los que tienen perfil de driver y están online
      const eligibleDrivers = roleAssignments
        .filter(assignment => 
          assignment.user.driverProfile && 
          assignment.user.driverProfile.status === 'online'
        )
        .map(assignment => ({
          userId: assignment.user.id,
          userName: `${assignment.user.name} ${assignment.user.lastname}`,
          currentLatitude: assignment.user.driverProfile.currentLatitude,
          currentLongitude: assignment.user.driverProfile.currentLongitude,
          status: assignment.user.driverProfile.status
        }));

      return eligibleDrivers;

    } catch (error) {
      logger.error('Error obteniendo repartidores del restaurante', {
        requestId,
        meta: {
          branchId: branch.id,
          restaurantId: branch.restaurantId,
          error: error.message
        }
      });
      return [];
    }
  }

  /**
   * Construye el payload de notificación para repartidores
   * @param {Object} order - Objeto del pedido completo
   * @returns {Object} Payload estructurado
   */
  static buildNotificationPayload(order) {
    return {
      orderId: order.id.toString(),
      status: order.status,
      restaurant: {
        id: order.branch.restaurant.id,
        name: order.branch.restaurant.name,
        logoUrl: order.branch.restaurant.logoUrl
      },
      branch: {
        id: order.branch.id,
        name: order.branch.name,
        address: order.branch.address,
        latitude: Number(order.branch.latitude),
        longitude: Number(order.branch.longitude)
      },
      customer: order.customer ? {
        id: order.customer.id,
        name: order.customer.name,
        lastname: order.customer.lastname,
        fullName: `${order.customer.name} ${order.customer.lastname}`,
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
        fullAddress: `${order.address.street} ${order.address.exteriorNumber}${order.address.interiorNumber ? ' Int. ' + order.address.interiorNumber : ''}, ${order.address.neighborhood}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}`,
        latitude: Number(order.address.latitude),
        longitude: Number(order.address.longitude)
      } : null,
      orderAmount: {
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        total: Number(order.total)
      },
      specialInstructions: order.specialInstructions,
      orderPlacedAt: order.orderPlacedAt,
      message: `Nuevo pedido #${order.id.toString()} disponible para recogida en ${order.branch.restaurant.name}`,
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = NotificationService;
