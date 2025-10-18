const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Repositorio para manejar operaciones de productos
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class ProductRepository {
  /**
   * Crea un nuevo producto
   * @param {Object} data - Datos del producto
   * @param {Array} modifierGroupIds - IDs de grupos de modificadores
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object>} Producto creado
   */
  static async create(data, modifierGroupIds = [], restaurantId) {
    return await prisma.$transaction(async (tx) => {
      // Crear el producto
      const newProduct = await tx.product.create({
        data: {
          ...data,
          restaurantId: restaurantId
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
