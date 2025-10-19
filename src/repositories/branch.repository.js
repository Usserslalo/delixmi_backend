const { prisma } = require('../config/database');

/**
 * Repositorio para manejar operaciones de sucursales
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class BranchRepository {
  
  /**
   * Busca la sucursal principal (única) asociada a un restaurante
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Sucursal encontrada o null
   */
  static async findPrimaryBranchByRestaurantId(restaurantId) {
    return await prisma.branch.findFirst({
      where: {
        restaurantId: restaurantId,
        status: 'active'
      },
      select: {
        id: true,
        restaurantId: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        usesPlatformDrivers: true,
        deliveryFee: true,
        estimatedDeliveryMin: true,
        estimatedDeliveryMax: true,
        deliveryRadius: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }
}

module.exports = BranchRepository;
