/**
 * Repositorio para operaciones relacionadas con horarios de sucursales
 * Encapsula la lógica de negocio para gestión de horarios
 */
const { PrismaClient } = require('@prisma/client');
const UserService = require('../services/user.service');
const { logger } = require('../config/logger');

const prisma = new PrismaClient();

class ScheduleRepository {
  
  /**
   * Obtiene el horario semanal completo de una sucursal
   * @param {number} branchId - ID de la sucursal
   * @param {number} userId - ID del usuario autenticado
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Datos del horario semanal con información de la sucursal
   */
  static async getWeeklySchedule(branchId, userId, requestId) {
    try {
      logger.debug('Consultando horario de sucursal', {
        requestId,
        meta: { branchId, userId }
      });

      // 1. Obtener información del usuario y verificar permisos
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

      if (!userWithRoles) {
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      // 2. Verificar que el usuario tenga roles de restaurante
      const restaurantRoles = ['owner', 'branch_manager'];
      const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
      const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

      if (!hasRestaurantRole) {
        throw {
          status: 403,
          message: 'Acceso denegado. Se requieren permisos de restaurante',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            required: restaurantRoles,
            current: userRoles
          }
        };
      }

      // 3. Verificar que la sucursal existe y obtener información
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              ownerId: true
            }
          }
        }
      });

      if (!branch) {
        throw {
          status: 404,
          message: 'Sucursal no encontrada',
          code: 'BRANCH_NOT_FOUND',
          details: {
            branchId: branchId,
            suggestion: 'Verifica que el ID de la sucursal sea correcto'
          }
        };
      }

      // 4. Verificar autorización de acceso a la sucursal
      let hasAccess = false;

      // Verificar si es owner del restaurante
      const ownerAssignment = userWithRoles.userRoleAssignments.find(
        assignment => assignment.role.name === 'owner' && assignment.restaurantId === branch.restaurant.id
      );

      if (ownerAssignment) {
        hasAccess = true;
      } else {
        // Verificar si es branch_manager con acceso específico a esta sucursal
        const branchManagerAssignment = userWithRoles.userRoleAssignments.find(
          assignment => 
            assignment.role.name === 'branch_manager' && 
            assignment.restaurantId === branch.restaurant.id &&
            (assignment.branchId === branchId || assignment.branchId === null)
        );

        if (branchManagerAssignment) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        logger.warn('Acceso denegado a sucursal', {
          requestId,
          meta: { userId, branchId, restaurantId: branch.restaurant.id }
        });
        
        throw {
          status: 403,
          message: 'No tienes permisos para acceder a esta sucursal',
          code: 'BRANCH_ACCESS_DENIED',
          details: {
            branchId: branchId,
            restaurantId: branch.restaurant.id,
            suggestion: 'Verifica que tienes permisos de owner o branch_manager para esta sucursal'
          }
        };
      }

      // 5. Consultar horarios de la sucursal
      const schedules = await prisma.branchSchedule.findMany({
        where: {
          branchId: branchId
        },
        orderBy: {
          dayOfWeek: 'asc'
        }
      });

      logger.debug('Horarios obtenidos exitosamente', {
        requestId,
        meta: { branchId, scheduleCount: schedules.length }
      });

      // 6. Formatear respuesta
      const formattedSchedules = schedules.map(schedule => ({
        id: schedule.id,
        dayOfWeek: schedule.dayOfWeek,
        dayName: this.getDayName(schedule.dayOfWeek),
        openingTime: schedule.openingTime,
        closingTime: schedule.closingTime,
        isClosed: schedule.isClosed
      }));

      return {
        branch: {
          id: branch.id,
          name: branch.name,
          restaurant: {
            id: branch.restaurant.id,
            name: branch.restaurant.name
          }
        },
        schedules: formattedSchedules
      };

    } catch (error) {
      logger.error('Error obteniendo horario de sucursal', {
        requestId,
        meta: { branchId, userId, error: error.message }
      });

      // Si es un error controlado (con status), lo relanzamos
      if (error.status) {
        throw error;
      }

      // Para errores de Prisma, los mapeamos
      if (error.code === 'P2025') {
        throw {
          status: 404,
          message: 'Sucursal no encontrada',
          code: 'BRANCH_NOT_FOUND',
          details: {
            branchId: branchId,
            suggestion: 'Verifica que el ID de la sucursal sea correcto'
          }
        };
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

  /**
   * Actualiza el horario semanal completo de una sucursal
   * @param {number} branchId - ID de la sucursal
   * @param {Array} scheduleData - Array con 7 objetos de horario (Domingo a Sábado)
   * @param {number} userId - ID del usuario autenticado
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Datos del horario actualizado
   */
  static async updateWeeklySchedule(branchId, scheduleData, userId, requestId) {
    // TODO: Implementar para PATCH de semana completa
  }

  /**
   * Actualiza el horario de un día específico de una sucursal
   * @param {number} branchId - ID de la sucursal
   * @param {number} dayOfWeek - Día de la semana (0=Domingo, 1=Lunes, ..., 6=Sábado)
   * @param {Object} dayData - Datos del horario para el día
   * @param {number} userId - ID del usuario autenticado
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Datos del horario actualizado para el día
   */
  static async updateSingleDaySchedule(branchId, dayOfWeek, dayData, userId, requestId) {
    // TODO: Implementar para gestión día x día
  }

  /**
   * Función auxiliar para obtener el nombre del día de la semana
   * @param {number} dayOfWeek - Número del día (0=Domingo, 1=Lunes, ..., 6=Sábado)
   * @returns {string} Nombre del día
   */
  static getDayName(dayOfWeek) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[dayOfWeek] || 'Día inválido';
  }
}

module.exports = ScheduleRepository;
