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
    try {
      logger.debug('Actualizando horario de sucursal', {
        requestId,
        meta: { branchId, userId, scheduleCount: scheduleData.length }
      });

      // 1. Validar que se proporcionen exactamente 7 elementos
      if (!Array.isArray(scheduleData) || scheduleData.length !== 7) {
        throw {
          status: 400,
          message: 'Debe proporcionar exactamente 7 objetos de horario (uno por cada día de la semana)',
          code: 'INVALID_SCHEDULE_COUNT',
          details: {
            expected: 7,
            received: scheduleData.length
          }
        };
      }

      // 2. Validar que los dayOfWeek sean únicos y cubran todos los días 0-6
      const dayOfWeeks = scheduleData.map(item => item.dayOfWeek);
      const uniqueDayOfWeeks = [...new Set(dayOfWeeks)];
      const expectedDays = [0, 1, 2, 3, 4, 5, 6];
      
      if (uniqueDayOfWeeks.length !== 7) {
        throw {
          status: 400,
          message: 'Los dayOfWeek deben ser únicos',
          code: 'DUPLICATE_DAYS',
          details: {
            found: uniqueDayOfWeeks,
            expected: expectedDays
          }
        };
      }

      const missingDays = expectedDays.filter(day => !dayOfWeeks.includes(day));
      if (missingDays.length > 0) {
        throw {
          status: 400,
          message: 'Faltan días de la semana en el horario',
          code: 'MISSING_DAYS',
          details: {
            missingDays,
            expected: expectedDays
          }
        };
      }

      // 3. Obtener información del usuario y verificar permisos
      const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

      if (!userWithRoles) {
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      // 4. Verificar que el usuario tenga roles de restaurante
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

      // 5. Verificar que la sucursal existe y obtener información
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

      // 6. Verificar autorización de acceso a la sucursal
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
        logger.warn('Acceso denegado para actualizar sucursal', {
          requestId,
          meta: { userId, branchId, restaurantId: branch.restaurant.id }
        });
        
        throw {
          status: 403,
          message: 'No tienes permisos para actualizar esta sucursal',
          code: 'BRANCH_UPDATE_DENIED',
          details: {
            branchId: branchId,
            restaurantId: branch.restaurant.id,
            suggestion: 'Verifica que tienes permisos de owner o branch_manager para esta sucursal'
          }
        };
      }

      // 7. Validar horarios lógicos (openingTime < closingTime cuando no está cerrado)
      for (const scheduleItem of scheduleData) {
        if (!scheduleItem.isClosed) {
          const openingTime = new Date(`1970-01-01T${scheduleItem.openingTime}`);
          const closingTime = new Date(`1970-01-01T${scheduleItem.closingTime}`);
          
          if (openingTime >= closingTime) {
            throw {
              status: 400,
              message: 'Horario inválido',
              code: 'INVALID_TIME_RANGE',
              details: {
                dayOfWeek: scheduleItem.dayOfWeek,
                dayName: this.getDayName(scheduleItem.dayOfWeek),
                error: 'La hora de apertura debe ser anterior a la hora de cierre'
              }
            };
          }
        }
      }

      // 8. Actualización transaccional del horario
      const result = await prisma.$transaction(async (tx) => {
        // Eliminar todos los horarios existentes de la sucursal
        await tx.branchSchedule.deleteMany({
          where: {
            branchId: branchId
          }
        });

        // Crear los nuevos horarios
        const newSchedules = scheduleData.map(item => ({
          branchId: branchId,
          dayOfWeek: item.dayOfWeek,
          openingTime: item.openingTime,
          closingTime: item.closingTime,
          isClosed: item.isClosed
        }));

        const createdSchedules = await tx.branchSchedule.createMany({
          data: newSchedules
        });

        return createdSchedules;
      });

      logger.debug('Horarios actualizados exitosamente', {
        requestId,
        meta: { branchId, recordsCreated: result.count }
      });

      // 9. Obtener el horario actualizado para la respuesta
      const updatedSchedules = await prisma.branchSchedule.findMany({
        where: {
          branchId: branchId
        },
        orderBy: {
          dayOfWeek: 'asc'
        }
      });

      // 10. Formatear respuesta
      const formattedSchedules = updatedSchedules.map(schedule => ({
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
      logger.error('Error actualizando horario de sucursal', {
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

      if (error.code === 'P2002') {
        throw {
          status: 409,
          message: 'Conflicto de datos',
          code: 'DUPLICATE_SCHEDULE',
          details: {
            suggestion: 'Ya existe un horario para este día de la semana en esta sucursal'
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
