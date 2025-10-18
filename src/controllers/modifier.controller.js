const { PrismaClient } = require('@prisma/client');
const ModifierRepository = require('../repositories/modifier.repository');
const ResponseService = require('../services/response.service');
const UserService = require('../services/user.service');

const prisma = new PrismaClient();

/**
 * Crear un nuevo grupo de modificadores
 * POST /api/restaurant/modifier-groups
 */
const createModifierGroup = async (req, res) => {
  try {
    const userId = req.user.id;

    const newModifierGroup = await ModifierRepository.createGroup(req.body, userId, req.id);

    return ResponseService.success(res, 'Grupo de modificadores creado exitosamente', {
      modifierGroup: newModifierGroup
    }, 201);

  } catch (error) {
    console.error('Error creando grupo de modificadores:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Obtener todos los grupos de modificadores del restaurante
 * GET /api/restaurant/modifier-groups
 */
const getModifierGroups = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Obtener información del usuario y sus roles usando UserService estandarizado
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'No tienes permiso para ver grupos de modificadores',
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    // 3. Obtener el restaurantId del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = userRestaurantAssignment.restaurantId;

    // 4. Obtener filtros validados de req.query (ya validados por Zod)
    const filters = req.query;

    // 5. Llamar al repositorio para obtener grupos de modificadores
    const result = await ModifierRepository.getGroups(restaurantId, filters);

    // 6. Respuesta exitosa
    return ResponseService.success(
      res,
      'Grupos de modificadores obtenidos exitosamente',
      result
    );

  } catch (error) {
    console.error('Error obteniendo grupos de modificadores:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualizar un grupo de modificadores existente
 * PATCH /api/restaurant/modifier-groups/:groupId
 */
const updateModifierGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.updateGroup(groupId, req.body, userId, req.id);

    return ResponseService.success(res, 'Grupo de modificadores actualizado exitosamente', result);

  } catch (error) {
    console.error('Error actualizando grupo de modificadores:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Eliminar un grupo de modificadores
 * DELETE /api/restaurant/modifier-groups/:groupId
 */
const deleteModifierGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.deleteGroup(groupId, userId, req.id);

    return ResponseService.success(res, 'Grupo de modificadores eliminado exitosamente', result);

  } catch (error) {
    console.error('Error eliminando grupo de modificadores:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Crear una nueva opción de modificador
 * POST /api/restaurant/modifier-groups/:groupId/options
 */
const createModifierOption = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const newOption = await ModifierRepository.createOption(groupId, req.body, userId, req.id);

    return ResponseService.success(res, 'Opción de modificador creada exitosamente', {
      modifierOption: newOption
    }, 201);

  } catch (error) {
    console.error('Error creando opción de modificador:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualizar una opción de modificador existente
 * PATCH /api/restaurant/modifier-options/:optionId
 */
const updateModifierOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.updateOption(optionId, req.body, userId, req.id);

    return ResponseService.success(res, 'Opción de modificador actualizada exitosamente', result);

  } catch (error) {
    console.error('Error actualizando opción de modificador:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Eliminar una opción de modificador
 * DELETE /api/restaurant/modifier-options/:optionId
 */
const deleteModifierOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.deleteOption(optionId, userId, req.id);

    return ResponseService.success(res, 'Opción de modificador eliminada exitosamente', result);

  } catch (error) {
    console.error('Error eliminando opción de modificador:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

module.exports = {
  createModifierGroup,
  getModifierGroups,
  updateModifierGroup,
  deleteModifierGroup,
  createModifierOption,
  updateModifierOption,
  deleteModifierOption
};
