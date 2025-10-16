const UserService = require('../services/user.service');
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');

/**
 * Middleware para verificar si un usuario autenticado tiene acceso a un restaurante específico
 * Verifica que el usuario tenga roles de restaurant_owner o restaurant_admin para el restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const checkRestaurantAccess = async (req, res, next) => {
  try {
    const requestId = req.id;
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;

    logger.info('Verificando acceso a restaurante', {
      requestId,
      meta: {
        userId,
        restaurantId,
        url: req.originalUrl,
        method: req.method
      }
    });

    // Validar que restaurantId esté presente
    if (!restaurantId) {
      logger.warn('RestaurantId no proporcionado en la ruta', {
        requestId,
        meta: { userId, url: req.originalUrl }
      });
      
      return ResponseService.badRequest(
        res,
        'ID de restaurante requerido en la ruta',
        'RESTAURANT_ID_REQUIRED'
      );
    }

    // Validar que restaurantId sea un número válido
    const restaurantIdNum = parseInt(restaurantId);
    if (isNaN(restaurantIdNum) || restaurantIdNum <= 0) {
      logger.warn('RestaurantId inválido', {
        requestId,
        meta: { userId, restaurantId, url: req.originalUrl }
      });
      
      return ResponseService.badRequest(
        res,
        'ID de restaurante inválido',
        'INVALID_RESTAURANT_ID'
      );
    }

    // Verificar acceso usando UserService
    const hasAccess = await UserService.userCanAccessRestaurant(userId, restaurantIdNum, requestId);

    if (!hasAccess) {
      logger.warn('Acceso denegado a restaurante', {
        requestId,
        meta: {
          userId,
          restaurantId: restaurantIdNum,
          url: req.originalUrl,
          method: req.method
        }
      });
      
      return ResponseService.forbidden(
        res,
        'No tienes permiso para acceder a este restaurante',
        {
          restaurantId: restaurantIdNum,
          requiredRoles: ['restaurant_owner', 'restaurant_admin'],
          suggestion: 'Contacta al administrador si crees que esto es un error'
        },
        'RESTAURANT_ACCESS_DENIED'
      );
    }

    logger.info('Acceso a restaurante autorizado', {
      requestId,
      meta: {
        userId,
        restaurantId: restaurantIdNum,
        url: req.originalUrl
      }
    });

    // Usuario tiene acceso, continuar con el siguiente middleware
    next();

  } catch (error) {
    logger.error('Error verificando acceso a restaurante', {
      requestId: req.id,
      meta: {
        userId: req.user?.id,
        restaurantId: req.params?.restaurantId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res,
      'Error interno del servidor al verificar permisos'
    );
  }
};

/**
 * Middleware para verificar si un usuario es propietario de un restaurante específico
 * Más restrictivo que checkRestaurantAccess - solo permite restaurant_owner
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const checkRestaurantOwnership = async (req, res, next) => {
  try {
    const requestId = req.id;
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;

    logger.info('Verificando propiedad de restaurante', {
      requestId,
      meta: {
        userId,
        restaurantId,
        url: req.originalUrl,
        method: req.method
      }
    });

    // Validar que restaurantId esté presente
    if (!restaurantId) {
      logger.warn('RestaurantId no proporcionado en la ruta', {
        requestId,
        meta: { userId, url: req.originalUrl }
      });
      
      return ResponseService.badRequest(
        res,
        'ID de restaurante requerido en la ruta',
        'RESTAURANT_ID_REQUIRED'
      );
    }

    // Validar que restaurantId sea un número válido
    const restaurantIdNum = parseInt(restaurantId);
    if (isNaN(restaurantIdNum) || restaurantIdNum <= 0) {
      logger.warn('RestaurantId inválido', {
        requestId,
        meta: { userId, restaurantId, url: req.originalUrl }
      });
      
      return ResponseService.badRequest(
        res,
        'ID de restaurante inválido',
        'INVALID_RESTAURANT_ID'
      );
    }

    // Verificar que el usuario sea propietario del restaurante
    const isOwner = await UserService.userHasRole(userId, 'restaurant_owner', requestId);
    
    if (!isOwner) {
      logger.warn('Usuario no es propietario de restaurante', {
        requestId,
        meta: {
          userId,
          restaurantId: restaurantIdNum,
          url: req.originalUrl,
          method: req.method
        }
      });
      
      return ResponseService.forbidden(
        res,
        'Solo el propietario del restaurante puede realizar esta acción',
        {
          restaurantId: restaurantIdNum,
          requiredRole: 'restaurant_owner',
          suggestion: 'Esta acción requiere permisos de propietario'
        },
        'RESTAURANT_OWNERSHIP_REQUIRED'
      );
    }

    // Verificar que el usuario tenga acceso específico a este restaurante
    const hasAccess = await UserService.userCanAccessRestaurant(userId, restaurantIdNum, requestId);

    if (!hasAccess) {
      logger.warn('Propietario sin acceso a este restaurante específico', {
        requestId,
        meta: {
          userId,
          restaurantId: restaurantIdNum,
          url: req.originalUrl,
          method: req.method
        }
      });
      
      return ResponseService.forbidden(
        res,
        'No tienes acceso a este restaurante específico',
        {
          restaurantId: restaurantIdNum,
          requiredRole: 'restaurant_owner',
          suggestion: 'Verifica que seas propietario de este restaurante'
        },
        'RESTAURANT_SPECIFIC_ACCESS_DENIED'
      );
    }

    logger.info('Propiedad de restaurante verificada exitosamente', {
      requestId,
      meta: {
        userId,
        restaurantId: restaurantIdNum,
        url: req.originalUrl
      }
    });

    // Usuario es propietario y tiene acceso, continuar con el siguiente middleware
    next();

  } catch (error) {
    logger.error('Error verificando propiedad de restaurante', {
      requestId: req.id,
      meta: {
        userId: req.user?.id,
        restaurantId: req.params?.restaurantId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res,
      'Error interno del servidor al verificar propiedad'
    );
  }
};

/**
 * Middleware para verificar acceso a sucursal específica
 * Verifica que el usuario tenga acceso a la sucursal del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const checkBranchAccess = async (req, res, next) => {
  try {
    const requestId = req.id;
    const userId = req.user.id;
    const branchId = req.params.branchId;

    logger.info('Verificando acceso a sucursal', {
      requestId,
      meta: {
        userId,
        branchId,
        url: req.originalUrl,
        method: req.method
      }
    });

    // Validar que branchId esté presente
    if (!branchId) {
      logger.warn('BranchId no proporcionado en la ruta', {
        requestId,
        meta: { userId, url: req.originalUrl }
      });
      
      return ResponseService.badRequest(
        res,
        'ID de sucursal requerido en la ruta',
        'BRANCH_ID_REQUIRED'
      );
    }

    // Validar que branchId sea un número válido
    const branchIdNum = parseInt(branchId);
    if (isNaN(branchIdNum) || branchIdNum <= 0) {
      logger.warn('BranchId inválido', {
        requestId,
        meta: { userId, branchId, url: req.originalUrl }
      });
      
      return ResponseService.badRequest(
        res,
        'ID de sucursal inválido',
        'INVALID_BRANCH_ID'
      );
    }

    // Obtener información de la sucursal para verificar el restaurante
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const branch = await prisma.branch.findUnique({
      where: { id: branchIdNum },
      select: { 
        id: true, 
        restaurantId: true,
        name: true,
        restaurant: {
          select: { name: true }
        }
      }
    });

    if (!branch) {
      logger.warn('Sucursal no encontrada', {
        requestId,
        meta: { userId, branchId: branchIdNum }
      });
      
      return ResponseService.notFound(
        res,
        'Sucursal no encontrada',
        'BRANCH_NOT_FOUND'
      );
    }

    // Verificar acceso al restaurante de la sucursal
    const hasAccess = await UserService.userCanAccessRestaurant(userId, branch.restaurantId, requestId);

    if (!hasAccess) {
      logger.warn('Acceso denegado a sucursal', {
        requestId,
        meta: {
          userId,
          branchId: branchIdNum,
          restaurantId: branch.restaurantId,
          url: req.originalUrl,
          method: req.method
        }
      });
      
      return ResponseService.forbidden(
        res,
        'No tienes permiso para acceder a esta sucursal',
        {
          branchId: branchIdNum,
          restaurantId: branch.restaurantId,
          branchName: branch.name,
          restaurantName: branch.restaurant.name,
          requiredRoles: ['restaurant_owner', 'restaurant_admin'],
          suggestion: 'Contacta al administrador si crees que esto es un error'
        },
        'BRANCH_ACCESS_DENIED'
      );
    }

    logger.info('Acceso a sucursal autorizado', {
      requestId,
      meta: {
        userId,
        branchId: branchIdNum,
        restaurantId: branch.restaurantId,
        url: req.originalUrl
      }
    });

    // Agregar información de la sucursal al request para uso posterior
    req.branch = branch;

    // Usuario tiene acceso, continuar con el siguiente middleware
    next();

  } catch (error) {
    logger.error('Error verificando acceso a sucursal', {
      requestId: req.id,
      meta: {
        userId: req.user?.id,
        branchId: req.params?.branchId,
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res,
      'Error interno del servidor al verificar permisos de sucursal'
    );
  }
};

module.exports = {
  checkRestaurantAccess,
  checkRestaurantOwnership,
  checkBranchAccess
};
