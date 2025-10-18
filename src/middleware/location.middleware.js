const RestaurantRepository = require('../repositories/restaurant.repository');
const ResponseService = require('../services/response.service');
const UserService = require('../services/user.service');

/**
 * Middleware para verificar que el restaurante tenga configurada su ubicación
 * Bloquea el acceso a rutas relevantes si no está configurada
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const requireRestaurantLocation = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requiere rol de owner',
        null,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return ResponseService.forbidden(
        res, 
        'No se encontró un restaurante asignado para este owner',
        null,
        'NO_RESTAURANT_ASSIGNED'
      );
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 4. Verificar si la ubicación está configurada
    const isLocationSet = await RestaurantRepository.getLocationStatus(restaurantId);

    if (!isLocationSet) {
      return ResponseService.forbidden(
        res, 
        'Debe configurar la ubicación de su restaurante primero',
        null, 
        'LOCATION_REQUIRED'
      );
    }

    // 5. Si todo está bien, continuar
    next();

  } catch (error) {
    console.error('Error en middleware requireRestaurantLocation:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

module.exports = {
  requireRestaurantLocation
};
