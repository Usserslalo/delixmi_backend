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

  /**
   * Verifica si el restaurante tiene configurada su ubicación
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<boolean>} true si latitude y longitude no son null, false en caso contrario
   */
  static async getLocationStatus(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        latitude: true,
        longitude: true
      }
    });

    if (!restaurant) {
      return false;
    }

    return restaurant.latitude !== null && restaurant.longitude !== null;
  }

  /**
   * Obtiene los datos completos de ubicación del restaurante
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Datos de ubicación o null si no está configurada
   */
  static async getLocationData(restaurantId) {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        latitude: true,
        longitude: true,
        address: true
      }
    });

    if (!restaurant || restaurant.latitude === null || restaurant.longitude === null) {
      return null;
    }

    return {
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      address: restaurant.address
    };
  }

  /**
   * Actualiza la ubicación del restaurante
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} data - Datos de ubicación { latitude, longitude, address? }
   * @returns {Promise<Object>} Restaurante actualizado
   */
  static async updateLocation(restaurantId, data) {
    return await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address || undefined,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        address: true,
        updatedAt: true
      }
    });
  }
}

module.exports = RestaurantRepository;
