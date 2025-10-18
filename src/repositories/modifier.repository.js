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
    const groupIdNum = parseInt(groupId);
    const { name, minSelection, maxSelection } = data;

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
        message: 'No tienes permiso para actualizar grupos de modificadores',
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

    // 4. Verificar que el grupo existe y pertenece al restaurante del usuario
    const existingGroup = await prisma.modifierGroup.findFirst({
      where: {
        id: groupIdNum,
        restaurantId: restaurantId
      }
    });

    if (!existingGroup) {
      throw {
        status: 404,
        message: 'Grupo de modificadores no encontrado',
        code: 'MODIFIER_GROUP_NOT_FOUND'
      };
    }

    // 5. Preparar los datos de actualización (solo campos enviados)
    const updateData = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (minSelection !== undefined) {
      updateData.minSelection = parseInt(minSelection);
    }
    
    if (maxSelection !== undefined) {
      updateData.maxSelection = parseInt(maxSelection);
    }

    // Si no hay campos para actualizar
    if (Object.keys(updateData).length === 0) {
      throw {
        status: 400,
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      };
    }

    // 6. Validar que minSelection <= maxSelection si ambos están presentes
    const finalMinSelection = updateData.minSelection !== undefined ? updateData.minSelection : existingGroup.minSelection;
    const finalMaxSelection = updateData.maxSelection !== undefined ? updateData.maxSelection : existingGroup.maxSelection;

    if (finalMinSelection > finalMaxSelection) {
      throw {
        status: 400,
        message: 'La selección mínima no puede ser mayor que la selección máxima',
        code: 'INVALID_SELECTION_RANGE'
      };
    }

    // 7. Actualizar el grupo de modificadores
    const updatedGroup = await prisma.modifierGroup.update({
      where: { id: groupIdNum },
      data: updateData,
      include: {
        options: {
          select: {
            id: true,
            name: true,
            price: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    // 8. Formatear respuesta
    const formattedGroup = {
      id: updatedGroup.id,
      name: updatedGroup.name,
      minSelection: updatedGroup.minSelection,
      maxSelection: updatedGroup.maxSelection,
      restaurantId: updatedGroup.restaurantId,
      options: updatedGroup.options.map(option => ({
        id: option.id,
        name: option.name,
        price: Number(option.price),
        createdAt: option.createdAt,
        updatedAt: option.updatedAt
      })),
      createdAt: updatedGroup.createdAt,
      updatedAt: updatedGroup.updatedAt
    };

    // 9. Retornar el grupo actualizado y los campos modificados
    return {
      modifierGroup: formattedGroup,
      updatedFields: Object.keys(updateData)
    };
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
