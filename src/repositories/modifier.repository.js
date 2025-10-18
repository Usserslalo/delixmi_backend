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
    const groupIdNum = parseInt(groupId);

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
        message: 'No tienes permiso para eliminar grupos de modificadores',
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
      },
      include: {
        options: {
          select: {
            id: true,
            name: true
          }
        },
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!existingGroup) {
      throw {
        status: 404,
        message: 'Grupo de modificadores no encontrado',
        code: 'MODIFIER_GROUP_NOT_FOUND'
      };
    }

    // 5. VALIDACIÓN CRÍTICA 1A: Verificar si el grupo tiene opciones asociadas
    if (existingGroup.options.length > 0) {
      throw {
        status: 409,
        message: 'No se puede eliminar el grupo porque tiene opciones asociadas. Elimina primero las opciones.',
        code: 'GROUP_HAS_OPTIONS',
        details: {
          optionsCount: existingGroup.options.length,
          options: existingGroup.options.map(option => ({
            id: option.id,
            name: option.name
          }))
        }
      };
    }

    // 6. VALIDACIÓN CRÍTICA 1B: Verificar si el grupo está asociado a productos
    if (existingGroup.products.length > 0) {
      throw {
        status: 409,
        message: 'No se puede eliminar el grupo porque está asociado a productos. Desasocia primero los productos.',
        code: 'GROUP_ASSOCIATED_TO_PRODUCTS',
        details: {
          productsCount: existingGroup.products.length,
          products: existingGroup.products.map(pm => ({
            id: pm.product.id,
            name: pm.product.name
          }))
        }
      };
    }

    // 7. Eliminar el grupo de modificadores
    await prisma.modifierGroup.delete({
      where: { id: groupIdNum }
    });

    // 8. Retornar información del grupo eliminado
    return {
      deletedGroup: {
        id: existingGroup.id,
        name: existingGroup.name,
        deletedAt: new Date().toISOString()
      }
    };
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
    const groupIdNum = parseInt(groupId);
    const { name, price } = data;

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
        message: 'No tienes permiso para crear opciones de modificadores',
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
      },
      select: {
        id: true,
        name: true,
        restaurantId: true
      }
    });

    if (!existingGroup) {
      throw {
        status: 404,
        message: 'Grupo de modificadores no encontrado',
        code: 'MODIFIER_GROUP_NOT_FOUND'
      };
    }

    // 5. Crear la opción de modificador
    const newModifierOption = await prisma.modifierOption.create({
      data: {
        name: name.trim(),
        price: parseFloat(price),
        modifierGroupId: groupIdNum
      }
    });

    // 6. Retornar la opción creada formateada
    return {
      id: newModifierOption.id,
      name: newModifierOption.name,
      price: Number(newModifierOption.price),
      modifierGroupId: newModifierOption.modifierGroupId,
      createdAt: newModifierOption.createdAt,
      updatedAt: newModifierOption.updatedAt
    };
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
    const optionIdNum = parseInt(optionId);
    const { name, price } = data;

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
        message: 'No tienes permiso para actualizar opciones de modificadores',
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

    // 4. Verificar que la opción existe y pertenece a un grupo del restaurante del usuario
    const existingOption = await prisma.modifierOption.findFirst({
      where: {
        id: optionIdNum,
        modifierGroup: {
          restaurantId: restaurantId
        }
      },
      include: {
        modifierGroup: {
          select: {
            id: true,
            name: true,
            restaurantId: true
          }
        }
      }
    });

    if (!existingOption) {
      throw {
        status: 404,
        message: 'Opción de modificador no encontrada',
        code: 'MODIFIER_OPTION_NOT_FOUND'
      };
    }

    // 5. Preparar los datos de actualización (solo campos enviados)
    const updateData = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (price !== undefined) {
      updateData.price = parseFloat(price);
    }

    // Si no hay campos para actualizar
    if (Object.keys(updateData).length === 0) {
      throw {
        status: 400,
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      };
    }

    // 6. Actualizar la opción de modificador
    const updatedOption = await prisma.modifierOption.update({
      where: { id: optionIdNum },
      data: updateData,
      include: {
        modifierGroup: {
          select: {
            id: true,
            name: true,
            restaurantId: true
          }
        }
      }
    });

    // 7. Formatear respuesta
    const formattedOption = {
      id: updatedOption.id,
      name: updatedOption.name,
      price: Number(updatedOption.price),
      modifierGroupId: updatedOption.modifierGroupId,
      modifierGroup: {
        id: updatedOption.modifierGroup.id,
        name: updatedOption.modifierGroup.name,
        restaurantId: updatedOption.modifierGroup.restaurantId
      },
      createdAt: updatedOption.createdAt,
      updatedAt: updatedOption.updatedAt
    };

    // 8. Retornar la opción actualizada y los campos modificados
    return {
      modifierOption: formattedOption,
      updatedFields: Object.keys(updateData)
    };
  }

  /**
   * Elimina una opción de modificador
   * @param {number} optionId - ID de la opción
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Información de la opción eliminada
   */
  static async deleteOption(optionId, userId, requestId) {
    const optionIdNum = parseInt(optionId);

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
        message: 'No tienes permiso para eliminar opciones de modificadores',
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

    // 4. Verificar que la opción existe y pertenece a un grupo del restaurante del usuario
    const existingOption = await prisma.modifierOption.findFirst({
      where: {
        id: optionIdNum,
        modifierGroup: {
          restaurantId: restaurantId
        }
      },
      include: {
        modifierGroup: {
          select: {
            id: true,
            name: true,
            restaurantId: true
          }
        }
      }
    });

    if (!existingOption) {
      throw {
        status: 404,
        message: 'Opción de modificador no encontrada',
        code: 'MODIFIER_OPTION_NOT_FOUND'
      };
    }

    // 5. 🚨 VALIDACIÓN CRÍTICA: Verificar si la opción está siendo usada en carritos activos
    const cartItemsCount = await prisma.cartItemModifier.count({
      where: { modifierOptionId: optionIdNum }
    });

    if (cartItemsCount > 0) {
      throw {
        status: 409,
        message: 'No se puede eliminar la opción porque está siendo usada en carritos de compra activos',
        code: 'OPTION_IN_USE_IN_CARTS',
        details: {
          cartItemsCount: cartItemsCount,
          optionId: optionIdNum,
          optionName: existingOption.name
        }
      };
    }

    // 6. Eliminar la opción de modificador
    await prisma.modifierOption.delete({
      where: { id: optionIdNum }
    });

    // 7. Retornar información de la opción eliminada
    return {
      deletedOption: {
        id: existingOption.id,
        name: existingOption.name,
        price: Number(existingOption.price),
        modifierGroupId: existingOption.modifierGroupId,
        deletedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = ModifierRepository;
