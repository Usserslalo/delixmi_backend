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
    // TODO: Implementar lógica completa
  }

  /**
   * Elimina una subcategoría
   * @param {number} subcategoryId - ID de la subcategoría
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición
   * @returns {Promise<Object>} Información de la subcategoría eliminada
   */
  static async delete(subcategoryId, userId, requestId) {
    // TODO: Implementar lógica completa
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
