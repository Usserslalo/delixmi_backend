const { PrismaClient } = require('@prisma/client');
const UserService = require('../services/user.service');
const prisma = new PrismaClient();

/**
 * Repositorio para manejar operaciones de productos
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class ProductRepository {
  /**
   * Crea un nuevo producto con validaciones completas
   * @param {Object} data - Datos del producto (subcategoryId, name, description, imageUrl, price, isAvailable)
   * @param {Array} modifierGroupIds - IDs de grupos de modificadores
   * @param {number} userId - ID del usuario que está creando el producto
   * @param {string} requestId - ID de la request para logging
   * @returns {Promise<Object>} Producto creado con todas las validaciones aplicadas
   */
  static async create(data, modifierGroupIds = [], userId, requestId) {
    const { subcategoryId, name, description, imageUrl, price, isAvailable = true } = data;
    const subcategoryIdNum = parseInt(subcategoryId);

    // 1. Buscar la subcategoría y obtener su restaurant_id
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum },
      select: {
        id: true,
        name: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    if (!subcategory) {
      throw {
        status: 404,
        message: 'Subcategoría no encontrada',
        code: 'SUBCATEGORY_NOT_FOUND'
      };
    }

    // 2. Obtener información de roles del usuario
    const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

    if (!userWithRoles) {
      throw {
        status: 404,
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      };
    }

    // 3. Verificar autorización: el usuario debe tener permisos sobre el restaurante de la subcategoría
    const ownerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === subcategory.restaurantId
    );

    const branchManagerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'branch_manager' && assignment.restaurantId === subcategory.restaurantId
    );

    // Si no es owner ni branch_manager del restaurante, denegar acceso
    if (!ownerRole && !branchManagerRole) {
      throw {
        status: 403,
        message: 'No tienes permiso para añadir productos a esta subcategoría',
        code: 'FORBIDDEN',
        details: {
          subcategoryId: subcategoryIdNum,
          restaurantId: subcategory.restaurantId,
          restaurantName: subcategory.restaurant.name
        }
      };
    }

    // 4. Validar modifierGroupIds si se proporcionan
    if (modifierGroupIds && modifierGroupIds.length > 0) {
      // Verificar que todos los grupos pertenezcan al restaurante
      const validGroups = await prisma.modifierGroup.findMany({
        where: {
          id: { in: modifierGroupIds },
          restaurantId: subcategory.restaurantId
        },
        select: { id: true }
      });

      if (validGroups.length !== modifierGroupIds.length) {
        const invalidIds = modifierGroupIds.filter(id => !validGroups.find(g => g.id === id));
        throw {
          status: 400,
          message: 'Algunos grupos de modificadores no pertenecen a este restaurante',
          code: 'INVALID_MODIFIER_GROUPS',
          details: {
            invalidGroupIds: invalidIds,
            restaurantId: subcategory.restaurantId
          }
        };
      }
    }

    // 5. Crear el producto con transacción para incluir asociaciones de modificadores
    return await prisma.$transaction(async (tx) => {
      // Crear el producto
      const newProduct = await tx.product.create({
        data: {
          restaurantId: subcategory.restaurantId,
          subcategoryId: subcategoryIdNum,
          name: name.trim(),
          description: description ? description.trim() : null,
          imageUrl: imageUrl ? imageUrl.trim() : null,
          price: parseFloat(price),
          isAvailable: isAvailable
        },
        include: {
          subcategory: {
            select: {
              id: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
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

      // Crear asociaciones con grupos de modificadores si se proporcionan
      if (modifierGroupIds && modifierGroupIds.length > 0) {
        await tx.productModifier.createMany({
          data: modifierGroupIds.map(groupId => ({
            productId: newProduct.id,
            modifierGroupId: groupId
          }))
        });
      }

      return newProduct;
    });
  }

  /**
   * Obtiene grupos de modificadores asociados a un producto
   * @param {number} productId - ID del producto
   * @returns {Promise<Array>} Grupos de modificadores asociados
   */
  static async getAssociatedModifierGroups(productId) {
    return await prisma.modifierGroup.findMany({
      where: {
        products: {
          some: {
            productId: productId
          }
        }
      },
      select: {
        id: true,
        name: true,
        minSelection: true,
        maxSelection: true,
        options: {
          select: {
            id: true,
            name: true,
            price: true
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
  }

  /**
   * Actualiza un producto existente
   * @param {number} productId - ID del producto
   * @param {Object} data - Datos a actualizar
   * @param {Array} modifierGroupIds - IDs de grupos de modificadores (opcional)
   * @returns {Promise<Object>} Producto actualizado
   */
  static async update(productId, data, modifierGroupIds = undefined) {
    return await prisma.$transaction(async (tx) => {
      // Actualizar el producto
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          ...data,
          updatedAt: new Date()
        },
        include: {
          subcategory: {
            select: {
              id: true,
              name: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
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

      // Actualizar asociaciones de modificadores si se proporcionan
      if (modifierGroupIds !== undefined) {
        // Eliminar asociaciones existentes
        await tx.productModifier.deleteMany({
          where: { productId: productId }
        });

        // Crear nuevas asociaciones si se proporcionan IDs
        if (modifierGroupIds && modifierGroupIds.length > 0) {
          await tx.productModifier.createMany({
            data: modifierGroupIds.map(groupId => ({
              productId: productId,
              modifierGroupId: groupId
            }))
          });
        }
      }

      return updatedProduct;
    });
  }

  /**
   * Elimina un producto
   * @param {number} productId - ID del producto
   * @returns {Promise<void>}
   */
  static async delete(productId) {
    return await prisma.$transaction(async (tx) => {
      // Eliminar asociaciones con modificadores primero
      await tx.productModifier.deleteMany({
        where: { productId: productId }
      });

      // Eliminar el producto
      await tx.product.delete({
        where: { id: productId }
      });
    });
  }

  /**
   * Encuentra un producto por ID
   * @param {number} productId - ID del producto
   * @returns {Promise<Object|null>} Producto encontrado
   */
  static async findById(productId) {
    return await prisma.product.findUnique({
      where: { id: productId },
      include: {
        subcategory: {
          select: {
            id: true,
            name: true,
            restaurantId: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });
  }

  /**
   * Encuentra items de pedidos activos para un producto
   * @param {number} productId - ID del producto
   * @returns {Promise<Array>} Items de pedidos activos
   */
  static async findActiveOrderItems(productId) {
    return await prisma.orderItem.findMany({
      where: { 
        productId: productId,
        order: {
          status: {
            in: ['pending', 'confirmed', 'preparing']
          }
        }
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      take: 5 // Mostrar máximo 5 pedidos
    });
  }

  /**
   * Busca productos por restaurante con filtros
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} filters - Filtros opcionales
   * @returns {Promise<Array>} Lista de productos
   */
  static async findByRestaurantId(restaurantId, filters = {}) {
    const where = {
      restaurantId: restaurantId,
      ...(filters.subcategoryId && { subcategoryId: filters.subcategoryId }),
      ...(filters.isAvailable !== undefined && { isAvailable: filters.isAvailable })
    };

    return await prisma.product.findMany({
      where,
      include: {
        subcategory: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        modifierGroups: {
          select: {
            id: true,
            name: true,
            minSelection: true,
            maxSelection: true,
            options: {
              select: {
                id: true,
                name: true,
                price: true
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...(filters.skip && { skip: filters.skip }),
      ...(filters.take && { take: filters.take })
    });
  }

  /**
   * Valida que los grupos de modificadores pertenezcan al restaurante
   * @param {Array} modifierGroupIds - IDs de grupos de modificadores
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Array>} Grupos válidos encontrados
   */
  static async validateModifierGroups(modifierGroupIds, restaurantId) {
    return await prisma.modifierGroup.findMany({
      where: {
        id: { in: modifierGroupIds },
        restaurantId: restaurantId
      },
      select: { id: true }
    });
  }
}

module.exports = ProductRepository;
