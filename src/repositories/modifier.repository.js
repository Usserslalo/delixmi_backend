const { PrismaClient } = require('@prisma/client');
const UserService = require('../services/user.service');

const prisma = new PrismaClient();

class ModifierRepository {
  /**
   * Crea un nuevo grupo de modificadores
   * @param {Object} data - Datos del grupo de modificadores
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Grupo de modificadores creado
   */
  static async createGroup(data, userId, requestId) {
    const { name, minSelection = 1, maxSelection = 1 } = data;

    // 1. Obtener información del usuario y sus roles usando UserService estandarizado
    const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

    if (!userWithRoles) {
      throw {
        status: 404,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
    }

    // 2. Verificar que el usuario tenga roles de restaurante (owner o branch_manager)
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      throw {
        status: 403,
        message: 'No tienes permiso para crear grupos de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    // 3. Obtener el restaurantId del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      throw {
        status: 403,
        message: 'No se encontró un restaurante asignado para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      };
    }

    const restaurantId = userRestaurantAssignment.restaurantId;

    // 4. Validación de negocio: minSelection <= maxSelection
    if (minSelection > maxSelection) {
      throw {
        status: 400,
        message: 'La selección mínima no puede ser mayor que la selección máxima',
        code: 'INVALID_SELECTION_RANGE'
      };
    }

    // 5. Crear el grupo de modificadores
    const newModifierGroup = await prisma.modifierGroup.create({
      data: {
        name: name.trim(),
        restaurantId: restaurantId,
        minSelection: parseInt(minSelection),
        maxSelection: parseInt(maxSelection)
      },
      include: {
        options: {
          select: {
            id: true,
            name: true,
            price: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    // 6. Retornar el grupo creado formateado
    return {
      id: newModifierGroup.id,
      name: newModifierGroup.name,
      minSelection: newModifierGroup.minSelection,
      maxSelection: newModifierGroup.maxSelection,
      restaurantId: newModifierGroup.restaurantId,
      options: newModifierGroup.options,
      createdAt: newModifierGroup.createdAt,
      updatedAt: newModifierGroup.updatedAt
    };
  }

  /**
   * Obtiene grupos de modificadores por restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de grupos de modificadores
   */
  static async getGroups(restaurantId, filters = {}) {
    // TODO: Implementar lógica completa
  }

  /**
   * Actualiza un grupo de modificadores existente
   * @param {number} groupId - ID del grupo
   * @param {Object} data - Datos para actualizar
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Grupo de modificadores actualizado
   */
  static async updateGroup(groupId, data, userId, requestId) {
    // TODO: Implementar lógica completa
  }

  /**
   * Elimina un grupo de modificadores
   * @param {number} groupId - ID del grupo
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Información del grupo eliminado
   */
  static async deleteGroup(groupId, userId, requestId) {
    // TODO: Implementar lógica completa
  }

  /**
   * Crea una nueva opción de modificador en un grupo específico
   * @param {number} groupId - ID del grupo de modificadores
   * @param {Object} data - Datos de la opción
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Opción de modificador creada
   */
  static async createOption(groupId, data, userId, requestId) {
    // TODO: Implementar lógica completa
  }

  /**
   * Actualiza una opción de modificador existente
   * @param {number} optionId - ID de la opción
   * @param {Object} data - Datos para actualizar
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Opción de modificador actualizada
   */
  static async updateOption(optionId, data, userId, requestId) {
    // TODO: Implementar lógica completa
  }

  /**
   * Elimina una opción de modificador
   * @param {number} optionId - ID de la opción
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Información de la opción eliminada
   */
  static async deleteOption(optionId, userId, requestId) {
    // TODO: Implementar lógica completa
  }
}

module.exports = ModifierRepository;
