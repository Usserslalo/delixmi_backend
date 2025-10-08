const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Crear un nuevo grupo de modificadores
 * POST /api/restaurant/modifier-groups
 */
const createModifierGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, minSelection = 1, maxSelection = 1 } = req.body;

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
        message: 'No tienes permiso para crear grupos de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del usuario
    const restaurantId = ownerRole ? ownerRole.restaurantId : branchManagerRole.restaurantId;

    // 4. Validar que minSelection <= maxSelection
    if (minSelection > maxSelection) {
      return res.status(400).json({
        status: 'error',
        message: 'La selección mínima no puede ser mayor que la selección máxima',
        code: 'INVALID_SELECTION_RANGE'
      });
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

    // 6. Respuesta exitosa
    res.status(201).json({
      status: 'success',
      message: 'Grupo de modificadores creado exitosamente',
      data: {
        modifierGroup: {
          id: newModifierGroup.id,
          name: newModifierGroup.name,
          minSelection: newModifierGroup.minSelection,
          maxSelection: newModifierGroup.maxSelection,
          restaurantId: newModifierGroup.restaurantId,
          options: newModifierGroup.options,
          createdAt: newModifierGroup.createdAt,
          updatedAt: newModifierGroup.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error creando grupo de modificadores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
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
    const userId = req.user.id;
    const { groupId } = req.params;
    const { name, minSelection, maxSelection } = req.body;

    // Convertir groupId a número
    const groupIdNum = parseInt(groupId);

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
        message: 'No tienes permiso para actualizar grupos de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del usuario
    const restaurantId = ownerRole ? ownerRole.restaurantId : branchManagerRole.restaurantId;

    // 4. Verificar que el grupo existe y pertenece al restaurante del usuario
    const existingGroup = await prisma.modifierGroup.findFirst({
      where: {
        id: groupIdNum,
        restaurantId: restaurantId
      }
    });

    if (!existingGroup) {
      return res.status(404).json({
        status: 'error',
        message: 'Grupo de modificadores no encontrado',
        code: 'MODIFIER_GROUP_NOT_FOUND'
      });
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
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    // 6. Validar que minSelection <= maxSelection si ambos están presentes
    const finalMinSelection = updateData.minSelection !== undefined ? updateData.minSelection : existingGroup.minSelection;
    const finalMaxSelection = updateData.maxSelection !== undefined ? updateData.maxSelection : existingGroup.maxSelection;

    if (finalMinSelection > finalMaxSelection) {
      return res.status(400).json({
        status: 'error',
        message: 'La selección mínima no puede ser mayor que la selección máxima',
        code: 'INVALID_SELECTION_RANGE'
      });
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

    // 9. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Grupo de modificadores actualizado exitosamente',
      data: {
        modifierGroup: formattedGroup,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error actualizando grupo de modificadores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Eliminar un grupo de modificadores
 * DELETE /api/restaurant/modifier-groups/:groupId
 */
const deleteModifierGroup = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;

    // Convertir groupId a número
    const groupIdNum = parseInt(groupId);

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
        message: 'No tienes permiso para eliminar grupos de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del usuario
    const restaurantId = ownerRole ? ownerRole.restaurantId : branchManagerRole.restaurantId;

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
      return res.status(404).json({
        status: 'error',
        message: 'Grupo de modificadores no encontrado',
        code: 'MODIFIER_GROUP_NOT_FOUND'
      });
    }

    // 5. Verificar si el grupo tiene opciones asociadas
    if (existingGroup.options.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar el grupo porque tiene opciones asociadas. Elimina primero las opciones.',
        code: 'GROUP_HAS_OPTIONS',
        details: {
          optionsCount: existingGroup.options.length,
          options: existingGroup.options.map(option => ({
            id: option.id,
            name: option.name
          }))
        }
      });
    }

    // 6. Verificar si el grupo está asociado a productos
    if (existingGroup.products.length > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar el grupo porque está asociado a productos. Desasocia primero los productos.',
        code: 'GROUP_ASSOCIATED_TO_PRODUCTS',
        details: {
          productsCount: existingGroup.products.length,
          products: existingGroup.products.map(pm => ({
            id: pm.product.id,
            name: pm.product.name
          }))
        }
      });
    }

    // 7. Eliminar el grupo de modificadores
    await prisma.modifierGroup.delete({
      where: { id: groupIdNum }
    });

    // 8. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Grupo de modificadores eliminado exitosamente',
      data: {
        deletedGroup: {
          id: existingGroup.id,
          name: existingGroup.name,
          deletedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error eliminando grupo de modificadores:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Crear una nueva opción de modificador
 * POST /api/restaurant/modifier-groups/:groupId/options
 */
const createModifierOption = async (req, res) => {
  try {
    const userId = req.user.id;
    const { groupId } = req.params;
    const { name, price } = req.body;

    // Convertir groupId a número
    const groupIdNum = parseInt(groupId);

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
        message: 'No tienes permiso para crear opciones de modificadores',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del usuario
    const restaurantId = ownerRole ? ownerRole.restaurantId : branchManagerRole.restaurantId;

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
      return res.status(404).json({
        status: 'error',
        message: 'Grupo de modificadores no encontrado',
        code: 'MODIFIER_GROUP_NOT_FOUND'
      });
    }

    // 5. Crear la opción de modificador
    const newModifierOption = await prisma.modifierOption.create({
      data: {
        name: name.trim(),
        price: parseFloat(price),
        modifierGroupId: groupIdNum
      }
    });

    // 6. Respuesta exitosa
    res.status(201).json({
      status: 'success',
      message: 'Opción de modificador creada exitosamente',
      data: {
        modifierOption: {
          id: newModifierOption.id,
          name: newModifierOption.name,
          price: Number(newModifierOption.price),
          modifierGroupId: newModifierOption.modifierGroupId,
          createdAt: newModifierOption.createdAt,
          updatedAt: newModifierOption.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error creando opción de modificador:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Actualizar una opción de modificador existente
 * PATCH /api/restaurant/modifier-options/:optionId
 */
const updateModifierOption = async (req, res) => {
  try {
    const userId = req.user.id;
    const { optionId } = req.params;
    const { name, price } = req.body;

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
        message: 'No tienes permiso para actualizar opciones de modificadores',
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
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      });
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

    // 8. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Opción de modificador actualizada exitosamente',
      data: {
        modifierOption: formattedOption,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error actualizando opción de modificador:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
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
