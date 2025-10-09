const { PrismaClient } = require('@prisma/client');
const { validateCoverageForBranches } = require('../services/geolocation.service');

const prisma = new PrismaClient();

/**
 * Verifica qué sucursales pueden entregar a una dirección específica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const checkAddressCoverage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.body;

    console.log('🔍 Verificando cobertura para dirección:', {
      userId,
      addressId
    });

    // 1. Validar que addressId esté presente
    if (!addressId) {
      return res.status(400).json({
        status: 'error',
        message: 'El ID de la dirección es requerido',
        code: 'ADDRESS_ID_REQUIRED'
      });
    }

    // 2. Verificar que la dirección existe y pertenece al cliente
    const address = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: userId
      },
      select: {
        id: true,
        alias: true,
        street: true,
        exteriorNumber: true,
        interiorNumber: true,
        neighborhood: true,
        city: true,
        state: true,
        zipCode: true,
        latitude: true,
        longitude: true
      }
    });

    if (!address) {
      return res.status(404).json({
        status: 'error',
        message: 'Dirección no encontrada o no pertenece al usuario',
        code: 'ADDRESS_NOT_FOUND'
      });
    }

    console.log('✅ Dirección encontrada:', {
      id: address.id,
      alias: address.alias,
      coordinates: {
        lat: Number(address.latitude),
        lng: Number(address.longitude)
      }
    });

    // 3. Obtener todas las sucursales activas
    const branches = await prisma.branch.findMany({
      where: {
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        latitude: true,
        longitude: true,
        deliveryRadius: true,
        deliveryFee: true,
        estimatedDeliveryMin: true,
        estimatedDeliveryMax: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            description: true,
            logoUrl: true,
            coverPhotoUrl: true,
            category: true,
            rating: true,
            status: true
          }
        }
      }
    });

    console.log(`📍 Validando cobertura para ${branches.length} sucursales activas`);

    // 4. Validar cobertura para cada sucursal
    const branchesWithCoverage = validateCoverageForBranches(branches, address);

    // 5. Separar sucursales con y sin cobertura
    const coveredBranches = branchesWithCoverage.filter((b) => b.isCovered);
    const notCoveredBranches = branchesWithCoverage.filter((b) => !b.isCovered);

    console.log('📊 Resultado de validación:', {
      totalBranches: branches.length,
      coveredBranches: coveredBranches.length,
      notCoveredBranches: notCoveredBranches.length
    });

    // 6. Formatear respuesta agrupando por restaurante
    const restaurantsMap = new Map();

    branchesWithCoverage.forEach((branch) => {
      const restaurantId = branch.restaurant.id;

      if (!restaurantsMap.has(restaurantId)) {
        restaurantsMap.set(restaurantId, {
          id: branch.restaurant.id,
          name: branch.restaurant.name,
          description: branch.restaurant.description,
          logoUrl: branch.restaurant.logoUrl,
          coverPhotoUrl: branch.restaurant.coverPhotoUrl,
          category: branch.restaurant.category,
          rating: Number(branch.restaurant.rating) || 0,
          status: branch.restaurant.status,
          branches: []
        });
      }

      const restaurant = restaurantsMap.get(restaurantId);
      restaurant.branches.push({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        deliveryRadius: Number(branch.deliveryRadius),
        deliveryFee: Number(branch.deliveryFee),
        estimatedDeliveryMin: branch.estimatedDeliveryMin,
        estimatedDeliveryMax: branch.estimatedDeliveryMax,
        distance: branch.distance,
        isCovered: branch.isCovered,
        coverageInfo: branch.coverageInfo
      });
    });

    const restaurants = Array.from(restaurantsMap.values());

    // 7. Calcular estadísticas
    const stats = {
      totalRestaurants: restaurants.length,
      totalBranches: branches.length,
      coveredBranches: coveredBranches.length,
      notCoveredBranches: notCoveredBranches.length,
      coveragePercentage:
        branches.length > 0
          ? ((coveredBranches.length / branches.length) * 100).toFixed(2)
          : 0
    };

    // 8. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Validación de cobertura completada exitosamente',
      data: {
        address: {
          id: address.id,
          alias: address.alias,
          street: address.street,
          exteriorNumber: address.exteriorNumber,
          interiorNumber: address.interiorNumber,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          zipCode: address.zipCode,
          coordinates: {
            latitude: Number(address.latitude),
            longitude: Number(address.longitude)
          }
        },
        restaurants: restaurants,
        stats: stats,
        hasCoverage: coveredBranches.length > 0,
        recommendedBranches: coveredBranches
          .slice(0, 5)
          .map((b) => ({
            id: b.id,
            name: b.name,
            restaurantName: b.restaurant.name,
            distance: b.distance,
            deliveryFee: Number(b.deliveryFee),
            estimatedDeliveryTime: `${b.estimatedDeliveryMin}-${b.estimatedDeliveryMax} min`
          }))
          .sort((a, b) => a.distance - b.distance),
        validatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error verificando cobertura de dirección:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

module.exports = {
  checkAddressCoverage
};

