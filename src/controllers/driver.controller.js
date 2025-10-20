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

    // 1. Obtener información del usuario y verificar autorización básica
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true,
                displayName: true
              }
            },
            restaurantId: true,
            branchId: true
          }
        }
      }
    });

    if (!userWithRoles) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }

    // 2. Verificar que el usuario tenga roles de repartidor
    const driverRoles = ['driver_platform', 'driver_restaurant'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

    if (!hasDriverRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de repartidor',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: driverRoles,
        current: userRoles
      });
    }

    // 3. CONSULTA ESPECÍFICA - Buscar pedido activo del repartidor
    const currentOrder = await prisma.order.findFirst({
      where: {
        deliveryDriverId: userId, // ✅ CRÍTICO: Solo pedidos asignados a este repartidor
        status: 'out_for_delivery' // ✅ CRÍTICO: Solo pedidos en camino
      },
      select: {
        id: true,
        status: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        paymentMethod: true,
        paymentStatus: true,
        specialInstructions: true,
        orderPlacedAt: true,
        orderDeliveredAt: true,
        createdAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        address: {
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
            references: true,
            latitude: true,
            longitude: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            phone: true,
            usesPlatformDrivers: true,
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        deliveryDriver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                subcategory: {
                  select: {
                    name: true,
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    // 4. Formatear respuesta
    if (currentOrder) {
      // Si hay una entrega activa, formatear los datos
      const formattedOrder = {
        id: currentOrder.id.toString(),
        status: currentOrder.status,
        subtotal: Number(currentOrder.subtotal),
        deliveryFee: Number(currentOrder.deliveryFee),
        total: Number(currentOrder.total),
        specialInstructions: currentOrder.specialInstructions,
        orderPlacedAt: currentOrder.orderPlacedAt,
        orderDeliveredAt: currentOrder.orderDeliveredAt,
        updatedAt: currentOrder.updatedAt,
        customer: {
          id: currentOrder.customer.id,
          name: currentOrder.customer.name,
          lastname: currentOrder.customer.lastname,
          email: currentOrder.customer.email,
          phone: currentOrder.customer.phone
        },
        address: {
          id: currentOrder.address.id,
          alias: currentOrder.address.alias,
          fullAddress: `${currentOrder.address.street} ${currentOrder.address.exteriorNumber}${currentOrder.address.interiorNumber ? ' Int. ' + currentOrder.address.interiorNumber : ''}, ${currentOrder.address.neighborhood}, ${currentOrder.address.city}, ${currentOrder.address.state} ${currentOrder.address.zipCode}`,
          references: currentOrder.address.references,
          coordinates: {
            latitude: Number(currentOrder.address.latitude),
            longitude: Number(currentOrder.address.longitude)
          }
        },
        branch: {
          id: currentOrder.branch.id,
          name: currentOrder.branch.name,
          address: currentOrder.branch.address,
          phone: currentOrder.branch.phone,
          usesPlatformDrivers: currentOrder.branch.usesPlatformDrivers,
          coordinates: {
            latitude: Number(currentOrder.branch.latitude),
            longitude: Number(currentOrder.branch.longitude)
          },
          restaurant: {
            id: currentOrder.branch.restaurant.id,
            name: currentOrder.branch.restaurant.name
          }
        },
        driver: {
          id: currentOrder.deliveryDriver.id,
          name: currentOrder.deliveryDriver.name,
          lastname: currentOrder.deliveryDriver.lastname,
          email: currentOrder.deliveryDriver.email,
          phone: currentOrder.deliveryDriver.phone
        },
        items: currentOrder.orderItems.map(item => ({
          id: item.id.toString(),
          product: {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            price: Number(item.product.price),
            imageUrl: item.product.imageUrl,
            category: {
              subcategory: item.product.subcategory.name,
              category: item.product.subcategory.category.name
            }
          },
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          total: Number(item.pricePerUnit) * item.quantity
        })),
        deliveryInfo: {
          estimatedDeliveryTime: null, // Se puede calcular basado en distancia
          deliveryInstructions: currentOrder.address.references || 'Sin instrucciones especiales'
        }
      };

      // 5. Respuesta exitosa con entrega activa
      res.status(200).json({
        status: 'success',
        message: 'Entrega activa encontrada',
        data: {
          order: formattedOrder,
          driverInfo: {
            userId: userId,
            driverTypes: userRoles.filter(role => driverRoles.includes(role)),
            retrievedAt: new Date().toISOString()
          }
        }
      });
    } else {
      // 6. Respuesta exitosa sin entrega activa
      res.status(200).json({
        status: 'success',
        message: 'No tienes una entrega activa en este momento',
        data: {
          order: null,
          driverInfo: {
            userId: userId,
            driverTypes: userRoles.filter(role => driverRoles.includes(role)),
            status: 'available_for_new_orders',
            retrievedAt: new Date().toISOString()
          }
        }
      });
    }

  } catch (error) {
    console.error('Error obteniendo entrega activa:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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
    const { page = 1, pageSize = 10 } = req.query;

    // Validar parámetros de paginación
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    
    if (pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 50) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de paginación inválidos',
        details: {
          page: 'Debe ser un número mayor a 0',
          pageSize: 'Debe ser un número entre 1 y 50'
        }
      });
    }

    // 1. Obtener información del usuario y verificar autorización básica
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true,
                displayName: true
              }
            },
            restaurantId: true,
            branchId: true
          }
        }
      }
    });

    if (!userWithRoles) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }

    // 2. Verificar que el usuario tenga roles de repartidor
    const driverRoles = ['driver_platform', 'driver_restaurant'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

    if (!hasDriverRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de repartidor',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: driverRoles,
        current: userRoles
      });
    }

    // 3. Obtener el total de entregas completadas para la paginación
    const totalDeliveredOrders = await prisma.order.count({
      where: {
        deliveryDriverId: userId,
        status: 'delivered'
      }
    });

    // 4. Calcular información de paginación
    const totalPages = Math.ceil(totalDeliveredOrders / pageSizeNum);
    const skip = (pageNum - 1) * pageSizeNum;

    // 5. CONSULTA DE HISTORIAL - Buscar pedidos entregados del repartidor
    const deliveredOrders = await prisma.order.findMany({
      where: {
        deliveryDriverId: userId, // ✅ CRÍTICO: Solo pedidos entregados por este repartidor
        status: 'delivered' // ✅ CRÍTICO: Solo pedidos completados
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        address: {
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
            references: true,
            latitude: true,
            longitude: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            phone: true,
            usesPlatformDrivers: true,
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        deliveryDriver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
                imageUrl: true,
                subcategory: {
                  select: {
                    name: true,
                    category: {
                      select: {
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        orderDeliveredAt: 'desc' // ✅ ORDENAMIENTO: Entregas más recientes primero
      },
      skip: skip,
      take: pageSizeNum
    });

    // 6. Formatear las entregas del historial
    const formattedOrders = deliveredOrders.map(order => ({
      id: order.id.toString(),
      status: order.status,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      orderPlacedAt: order.orderPlacedAt,
      orderDeliveredAt: order.orderDeliveredAt,
      updatedAt: order.updatedAt,
      customer: {
        id: order.customer.id,
        name: order.customer.name,
        lastname: order.customer.lastname,
        email: order.customer.email,
        phone: order.customer.phone
      },
      address: {
        id: order.address.id,
        alias: order.address.alias,
        fullAddress: `${order.address.street} ${order.address.exteriorNumber}${order.address.interiorNumber ? ' Int. ' + order.address.interiorNumber : ''}, ${order.address.neighborhood}, ${order.address.city}, ${order.address.state} ${order.address.zipCode}`,
        references: order.address.references,
        coordinates: {
          latitude: Number(order.address.latitude),
          longitude: Number(order.address.longitude)
        }
      },
      branch: {
        id: order.branch.id,
        name: order.branch.name,
        address: order.branch.address,
        phone: order.branch.phone,
        usesPlatformDrivers: order.branch.usesPlatformDrivers,
        coordinates: {
          latitude: Number(order.branch.latitude),
          longitude: Number(order.branch.longitude)
        },
        restaurant: {
          id: order.branch.restaurant.id,
          name: order.branch.restaurant.name
        }
      },
      driver: {
        id: order.deliveryDriver.id,
        name: order.deliveryDriver.name,
        lastname: order.deliveryDriver.lastname,
        email: order.deliveryDriver.email,
        phone: order.deliveryDriver.phone
      },
      items: order.orderItems.map(item => ({
        id: item.id.toString(),
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: Number(item.product.price),
          imageUrl: item.product.imageUrl,
          category: {
            subcategory: item.product.subcategory.name,
            category: item.product.subcategory.category.name
          }
        },
        quantity: item.quantity,
        pricePerUnit: Number(item.pricePerUnit),
        total: Number(item.pricePerUnit) * item.quantity
      })),
      deliveryStats: {
        deliveryTime: order.orderDeliveredAt ? order.orderDeliveredAt - order.orderPlacedAt : null,
        deliveryTimeFormatted: order.orderDeliveredAt ? formatDeliveryTime(order.orderDeliveredAt - order.orderPlacedAt) : null
      }
    }));

    // 7. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Historial de entregas obtenido exitosamente',
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          totalOrders: totalDeliveredOrders,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        driverInfo: {
          userId: userId,
          driverTypes: userRoles.filter(role => driverRoles.includes(role)),
          totalDeliveries: totalDeliveredOrders,
          retrievedAt: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de entregas:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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
    const { latitude, longitude } = req.body;

    // 1. Obtener información del usuario y verificar autorización básica
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true,
                displayName: true
              }
            },
            restaurantId: true,
            branchId: true
          }
        }
      }
    });

    if (!userWithRoles) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado'
      });
    }

    // 2. Verificar que el usuario tenga roles de repartidor
    const driverRoles = ['driver_platform', 'driver_restaurant'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasDriverRole = userRoles.some(role => driverRoles.includes(role));

    if (!hasDriverRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de repartidor',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: driverRoles,
        current: userRoles
      });
    }

    // 3. Buscar el perfil del repartidor
    const existingDriverProfile = await prisma.driverProfile.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        status: true,
        currentLatitude: true,
        currentLongitude: true,
        lastSeenAt: true
      }
    });

    if (!existingDriverProfile) {
      return res.status(404).json({
        status: 'error',
        message: 'Perfil de repartidor no encontrado',
        code: 'DRIVER_PROFILE_NOT_FOUND',
        details: {
          userId: userId,
          suggestion: 'Contacta al administrador para crear tu perfil de repartidor'
        }
      });
    }

    // 4. Actualizar la ubicación del repartidor
    await prisma.driverProfile.update({
      where: { userId: userId },
      data: {
        currentLatitude: parseFloat(latitude),
        currentLongitude: parseFloat(longitude),
        lastSeenAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 5. Respuesta ligera y rápida para tracking en tiempo real
    res.status(200).json({
      status: 'success',
      message: 'Ubicación actualizada',
      data: {
        timestamp: new Date().toISOString(),
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        driverStatus: existingDriverProfile.status
      }
    });

  } catch (error) {
    console.error('Error actualizando ubicación del repartidor:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'Perfil de repartidor no encontrado',
        code: 'DRIVER_PROFILE_NOT_FOUND'
      });
    }

    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Conflicto en la actualización de ubicación',
        code: 'LOCATION_UPDATE_CONFLICT'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

module.exports = {
  getAvailableOrders,
  acceptOrder,
  completeOrder,
  updateDriverStatus,
  getCurrentOrder,
  getDriverOrderHistory,
  updateDriverLocation
};
