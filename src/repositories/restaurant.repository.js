const { prisma } = require('../config/database');

/**
 * Repositorio para manejar operaciones de restaurantes
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class RestaurantRepository {
  /**
   * Actualiza el perfil de un restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>} Restaurante actualizado
   */
  static async updateProfile(restaurantId, data) {
    return await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        branches: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            branches: true,
            subcategories: true,
            products: true
          }
        }
      }
    });
  }

  /**
   * Obtiene el perfil completo de un restaurante por ID
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Restaurante con relaciones
   */
  static async getProfileById(restaurantId) {
    return await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        branches: {
          where: { status: 'active' },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { name: 'asc' }
        },
        _count: {
          select: {
            branches: true,
            subcategories: true,
            products: true
          }
        }
      }
    });
  }

  /**
   * Verifica si un restaurante existe
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Restaurante básico
   */
  static async findById(restaurantId) {
    return await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        coverPhotoUrl: true,
        status: true
      }
    });
  }
}

module.exports = RestaurantRepository;
