const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

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
}

module.exports = DriverRepository;
