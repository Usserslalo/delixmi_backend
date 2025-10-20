const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../config/socket');
const { formatOrderForSocket } = require('./restaurant-admin.controller');
const DriverRepository = require('../repositories/driver.repository');
const ResponseService = require('../services/response.service');

const prisma = new PrismaClient();

/**
 * Obtiene los pedidos disponibles para el repartidor autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAvailableOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      page: req.query.page,
      pageSize: req.query.pageSize
    };

    // Llamar al método del repositorio para obtener pedidos disponibles
    const result = await DriverRepository.getAvailableOrdersForDriver(
      userId, 
      filters, 
      req.id
    );

    // Respuesta exitosa usando ResponseService
    return ResponseService.success(
      res,
      `Pedidos disponibles obtenidos exitosamente`,
      {
        orders: result.orders,
        pagination: result.pagination,
        driverInfo: {
          userId: userId,
          userName: `${req.user.name} ${req.user.lastname}`
        }
      }
    );

  } catch (error) {
    // Manejar errores específicos del repositorio
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }

    if (error.status === 400) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    // Error interno del servidor
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Acepta un pedido disponible para entrega
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const acceptOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Llamar al método del repositorio para manejar toda la lógica
    const result = await DriverRepository.acceptOrder(
      orderId, 
      userId, 
      req.id
    );

    return ResponseService.success(
      res,
      'Pedido aceptado exitosamente',
      result,
      200
    );

  } catch (error) {
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }
    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }
    if (error.status === 409) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Marca un pedido como entregado/completado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const completeOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Llamar al método del repositorio para manejar toda la lógica
    const result = await DriverRepository.completeOrder(
      orderId, 
      userId, 
      req.id
    );

    return ResponseService.success(
      res,
      'Pedido marcado como entregado exitosamente',
      {
        order: result.order,
        driverInfo: result.driverInfo,
        deliveryStats: result.deliveryStats
      },
      200
    );

  } catch (error) {
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }
    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Función auxiliar para formatear el tiempo de entrega
 * @param {number} deliveryTimeMs - Tiempo de entrega en milisegundos
 * @returns {string} Tiempo formateado
 */
const formatDeliveryTime = (deliveryTimeMs) => {
  const minutes = Math.floor(deliveryTimeMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Actualizar el estado de disponibilidad del repartidor
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateDriverStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status: newStatus } = req.body;

    // Llamar al método del repositorio para actualizar el estado
    const result = await DriverRepository.updateDriverStatus(
      userId, 
      newStatus, 
      req.id
    );

    // Respuesta exitosa usando ResponseService
    return ResponseService.success(
      res,
      `Estado del repartidor actualizado a '${newStatus}' exitosamente`,
      {
        profile: result.profile,
        statusChange: result.statusChange,
        updatedBy: {
          userId: userId,
          userName: `${req.user.name} ${req.user.lastname}`
        }
      }
    );

  } catch (error) {
    // Manejar errores específicos del repositorio
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }

    if (error.status === 409) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    // Error interno del servidor
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Obtener la entrega activa actual del repartidor
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCurrentOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    // Llamar al método del repositorio para obtener entrega activa
    const activeOrder = await DriverRepository.getCurrentOrderForDriver(
      userId, 
      req.id
    );

    // Manejar respuesta según si hay entrega activa o no
    if (activeOrder) {
      // Respuesta exitosa con entrega activa
      return ResponseService.success(
        res,
        'Entrega activa obtenida exitosamente',
        {
          order: activeOrder
        },
        200
      );
    } else {
      // Respuesta exitosa sin entrega activa
      return ResponseService.success(
        res,
        'No tienes una entrega activa en este momento',
        {
          order: null
        },
        200
      );
    }

  } catch (error) {
    // Manejar errores específicos del repositorio
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }

    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    // Error interno del servidor
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Obtener el historial de entregas completadas del repartidor
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getDriverOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const filters = {
      page: req.query.page,
      pageSize: req.query.pageSize
    };

    const result = await DriverRepository.getDriverOrderHistory(userId, filters, req.id);

    return ResponseService.success(
      res,
      'Historial de pedidos obtenido exitosamente',
      result,
      200
    );

  } catch (error) {
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }
    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Actualizar la ubicación GPS del repartidor en tiempo real
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateDriverLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const locationData = {
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };

    // Llamar al método del repositorio para actualizar ubicación
    const result = await DriverRepository.updateDriverLocation(
      userId, 
      locationData, 
      req.id
    );

    // Respuesta exitosa usando ResponseService
    return ResponseService.success(
      res,
      'Ubicación actualizada exitosamente',
      {
        profile: result.profile,
        locationUpdate: result.locationUpdate
      },
      200
    );

  } catch (error) {
    // Manejar errores específicos del repositorio
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }

    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    if (error.status === 409) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }

    // Error interno del servidor
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

/**
 * Obtener el perfil completo del repartidor
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getDriverProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await DriverRepository.getDriverProfile(userId, req.id);

    return ResponseService.success(
      res,
      'Perfil del repartidor obtenido exitosamente',
      { profile },
      200
    );

  } catch (error) {
    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
        error.status,
        error.code
      );
    }
    if (error.status === 403) {
      return ResponseService.error(
        res,
        error.message,
        null,
        error.status,
        error.code
      );
    }
    return ResponseService.error(
      res,
      'Error interno del servidor',
      null,
      500,
      'INTERNAL_ERROR'
    );
  }
};

module.exports = {
  getAvailableOrders,
  acceptOrder,
  completeOrder,
  updateDriverStatus,
  getCurrentOrder,
  getDriverOrderHistory,
  updateDriverLocation,
  getDriverProfile
};
