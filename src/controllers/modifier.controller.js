const { PrismaClient } = require('@prisma/client');
const ModifierRepository = require('../repositories/modifier.repository');
const ResponseService = require('../services/response.service');

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

    // 1. Obtener información de roles del usuario
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
              }
            },
            restaurantId: true,
            branchId: true
          }
        }
      }
    });

    if (!userWithRoles) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }

    // 2. Verificar que el usuario sea owner o branch_manager
    const ownerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId
    );

    const branchManagerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'branch_manager' && assignment.restaurantId
    );

    if (!ownerRole && !branchManagerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para ver grupos de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del usuario
    const restaurantId = ownerRole ? ownerRole.restaurantId : branchManagerRole.restaurantId;

    // 4. Obtener todos los grupos de modificadores del restaurante
    const modifierGroups = await prisma.modifierGroup.findMany({
      where: {
        restaurantId: restaurantId
      },
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
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // 5. Formatear respuesta
    const formattedGroups = modifierGroups.map(group => ({
      id: group.id,
      name: group.name,
      minSelection: group.minSelection,
      maxSelection: group.maxSelection,
      restaurantId: group.restaurantId,
      options: group.options.map(option => ({
        id: option.id,
        name: option.name,
        price: Number(option.price),
        createdAt: option.createdAt,
        updatedAt: option.updatedAt
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt
    }));

    // 6. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Grupos de modificadores obtenidos exitosamente',
      data: {
        modifierGroups: formattedGroups,
        total: formattedGroups.length
      }
    });

  } catch (error) {
    console.error('Error obteniendo grupos de modificadores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
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
    const userId = req.user.id;
    const { optionId } = req.params;

    // Convertir optionId a número
    const optionIdNum = parseInt(optionId);

    // 1. Obtener información de roles del usuario
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
              }
            },
            restaurantId: true,
            branchId: true
          }
        }
      }
    });

    if (!userWithRoles) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }

    // 2. Verificar que el usuario sea owner o branch_manager
    const ownerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId
    );

    const branchManagerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'branch_manager' && assignment.restaurantId
    );

    if (!ownerRole && !branchManagerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar opciones de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del usuario
    const restaurantId = ownerRole ? ownerRole.restaurantId : branchManagerRole.restaurantId;

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
      return res.status(404).json({
        status: 'error',
        message: 'Opción de modificador no encontrada',
        code: 'MODIFIER_OPTION_NOT_FOUND'
      });
    }

    // 5. Eliminar la opción de modificador
    await prisma.modifierOption.delete({
      where: { id: optionIdNum }
    });

    // 6. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Opción de modificador eliminada exitosamente',
      data: {
        deletedOption: {
          id: existingOption.id,
          name: existingOption.name,
          price: Number(existingOption.price),
          modifierGroupId: existingOption.modifierGroupId,
          deletedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error eliminando opción de modificador:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
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
