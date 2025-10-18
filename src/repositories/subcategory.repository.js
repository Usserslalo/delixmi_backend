const { PrismaClient } = require('@prisma/client');
const UserService = require('../services/user.service');

const prisma = new PrismaClient();

class SubcategoryRepository {
  /**
   * Crea una nueva subcategoría
   * @param {Object} data - Datos de la subcategoría
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Subcategoría creada
   */
  static async create(data, userId, requestId) {
    const { categoryId, name, displayOrder = 0 } = data;

    // 1. Obtener información del usuario y sus roles
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
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    // 3. Obtener el restaurant_id del usuario
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

    // 4. Verificar que la categoría existe
    const categoryIdNum = parseInt(categoryId);
    const category = await SubcategoryRepository.validateCategoryExists(categoryIdNum);

    if (!category) {
      throw {
        status: 404,
        message: 'Categoría no encontrada',
        code: 'CATEGORY_NOT_FOUND',
        details: {
          categoryId: categoryIdNum
        }
      };
    }

    // 5. Crear la subcategoría
    try {
      const newSubcategory = await prisma.subcategory.create({
        data: {
          restaurantId: restaurantId,
          categoryId: categoryIdNum,
          name: name.trim(),
          displayOrder: parseInt(displayOrder)
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // 6. Formatear y retornar respuesta
      return {
        id: newSubcategory.id,
        name: newSubcategory.name,
        displayOrder: newSubcategory.displayOrder,
        category: {
          id: newSubcategory.category.id,
          name: newSubcategory.category.name
        },
        restaurant: {
          id: newSubcategory.restaurant.id,
          name: newSubcategory.restaurant.name
        },
        createdAt: newSubcategory.createdAt,
        updatedAt: newSubcategory.updatedAt
      };

    } catch (error) {
      // Manejar error de restricción única (P2002)
      if (error.code === 'P2002') {
        throw {
          status: 409,
          message: 'Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante',
          code: 'DUPLICATE_SUBCATEGORY',
          details: {
            categoryId: categoryIdNum,
            categoryName: category.name,
            subcategoryName: name.trim()
          }
        };
      }
      
      // Re-lanzar errores no manejados
      throw error;
    }
  }

  /**
   * Actualiza una subcategoría existente
   * @param {number} subcategoryId - ID de la subcategoría
   * @param {Object} data - Datos a actualizar
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Subcategoría actualizada
   */
  static async update(subcategoryId, data, userId, requestId) {
    const { categoryId, name, displayOrder } = data;

    // 1. Obtener información del usuario y sus roles
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
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    // 3. Obtener el restaurant_id del usuario
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

    // 4. Buscar la subcategoría existente
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      select: {
        id: true,
        name: true,
        displayOrder: true,
        restaurantId: true,
        categoryId: true,
        restaurant: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingSubcategory) {
      throw {
        status: 404,
        message: 'Subcategoría no encontrada',
        code: 'SUBCATEGORY_NOT_FOUND',
        details: {
          subcategoryId: subcategoryId
        }
      };
    }

    // 5. Verificar autorización: la subcategoría debe pertenecer al restaurante del usuario
    if (existingSubcategory.restaurantId !== restaurantId) {
      throw {
        status: 403,
        message: 'No tienes permiso para editar esta subcategoría',
        code: 'FORBIDDEN',
        details: {
          subcategoryId: subcategoryId,
          restaurantId: existingSubcategory.restaurantId,
          restaurantName: existingSubcategory.restaurant.name
        }
      };
    }

    // 6. Si se está cambiando la categoría, verificar que existe
    if (categoryId !== undefined) {
      const categoryIdNum = parseInt(categoryId);
      const newCategory = await SubcategoryRepository.validateCategoryExists(categoryIdNum);

      if (!newCategory) {
        throw {
          status: 404,
          message: 'Categoría no encontrada',
          code: 'CATEGORY_NOT_FOUND',
          details: {
            categoryId: categoryIdNum
          }
        };
      }
    }

    // 7. Preparar los datos de actualización (solo campos enviados)
    const updateData = {};
    
    if (categoryId !== undefined) {
      updateData.categoryId = parseInt(categoryId);
    }
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (displayOrder !== undefined) {
      updateData.displayOrder = parseInt(displayOrder);
    }

    // Si no hay campos para actualizar
    if (Object.keys(updateData).length === 0) {
      throw {
        status: 400,
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      };
    }

    // 8. Actualizar la subcategoría
    try {
      const updatedSubcategory = await prisma.subcategory.update({
        where: { id: subcategoryId },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // 9. Formatear y retornar respuesta
      return {
        id: updatedSubcategory.id,
        name: updatedSubcategory.name,
        displayOrder: updatedSubcategory.displayOrder,
        category: {
          id: updatedSubcategory.category.id,
          name: updatedSubcategory.category.name
        },
        restaurant: {
          id: updatedSubcategory.restaurant.id,
          name: updatedSubcategory.restaurant.name
        },
        createdAt: updatedSubcategory.createdAt,
        updatedAt: updatedSubcategory.updatedAt,
        updatedFields: Object.keys(updateData)
      };

    } catch (error) {
      // Manejar error de restricción única (P2002)
      if (error.code === 'P2002') {
        throw {
          status: 409,
          message: 'Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante',
          code: 'DUPLICATE_SUBCATEGORY',
          details: {
            subcategoryId: subcategoryId,
            attemptedName: name ? name.trim() : existingSubcategory.name,
            categoryId: categoryId ? parseInt(categoryId) : existingSubcategory.categoryId
          }
        };
      }
      
      // Re-lanzar errores no manejados
      throw error;
    }
  }

  /**
   * Elimina una subcategoría
   * @param {number} subcategoryId - ID de la subcategoría
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Información de la subcategoría eliminada
   */
  static async delete(subcategoryId, userId, requestId) {
    const subcategoryIdNum = parseInt(subcategoryId);

    // 1. Obtener información del usuario y sus roles
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
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    // 3. Obtener el restaurant_id del usuario
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

    // 4. Buscar la subcategoría existente
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum },
      select: {
        id: true,
        name: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingSubcategory) {
      throw {
        status: 404,
        message: 'Subcategoría no encontrada',
        code: 'SUBCATEGORY_NOT_FOUND',
        details: {
          subcategoryId: subcategoryIdNum
        }
      };
    }

    // 5. Verificar autorización: la subcategoría debe pertenecer al restaurante del usuario
    if (existingSubcategory.restaurantId !== restaurantId) {
      throw {
        status: 403,
        message: 'No tienes permiso para eliminar esta subcategoría',
        code: 'FORBIDDEN',
        details: {
          subcategoryId: subcategoryIdNum,
          restaurantId: existingSubcategory.restaurantId,
          restaurantName: existingSubcategory.restaurant.name
        }
      };
    }

    // 6. VERIFICACIÓN CRÍTICA: Verificar si la subcategoría tiene productos asociados
    const productsCount = await prisma.product.count({
      where: {
        subcategoryId: subcategoryIdNum
      }
    });

    if (productsCount > 0) {
      throw {
        status: 409,
        message: 'No se puede eliminar la subcategoría porque todavía contiene productos',
        code: 'SUBCATEGORY_HAS_PRODUCTS',
        details: {
          subcategoryId: subcategoryIdNum,
          subcategoryName: existingSubcategory.name,
          productsCount: productsCount,
          suggestion: 'Mueva o elimine los productos primero antes de eliminar la subcategoría'
        }
      };
    }

    // 7. Eliminar la subcategoría
    await prisma.subcategory.delete({
      where: { id: subcategoryIdNum }
    });

    // 8. Retornar información de la subcategoría eliminada
    return {
      id: existingSubcategory.id,
      name: existingSubcategory.name,
      categoryName: existingSubcategory.category.name,
      restaurantName: existingSubcategory.restaurant.name
    };
  }

  /**
   * Busca una subcategoría por ID
   * @param {number} subcategoryId - ID de la subcategoría
   * @returns {Promise<Object|null>} Subcategoría encontrada o null
   */
  static async findById(subcategoryId) {
    // TODO: Implementar lógica completa
  }

  /**
   * Busca subcategorías por restaurante con filtros
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} filters - Filtros de búsqueda
   * @returns {Promise<Array>} Lista de subcategorías
   */
  static async findByRestaurantId(restaurantId, filters) {
    // TODO: Implementar lógica completa
  }

  /**
   * Cuenta los productos en una subcategoría
   * @param {number} subcategoryId - ID de la subcategoría
   * @returns {Promise<number>} Cantidad de productos
   */
  static async countProductsInSubcategory(subcategoryId) {
    return await prisma.product.count({
      where: {
        subcategoryId: subcategoryId
      }
    });
  }

  /**
   * Valida que una categoría existe
   * @param {number} categoryId - ID de la categoría
   * @returns {Promise<Object|null>} Categoría encontrada o null
   */
  static async validateCategoryExists(categoryId) {
    return await prisma.category.findUnique({
      where: { id: categoryId },
      select: {
        id: true,
        name: true
      }
    });
  }
}

module.exports = SubcategoryRepository;
