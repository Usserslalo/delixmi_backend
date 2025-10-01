const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Obtener la ubicación en tiempo real del repartidor para un pedido específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getDriverLocationForOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    // Convertir orderId a número
    const orderIdNum = parseInt(orderId);

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
            }
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

    // 2. Verificar que el usuario tenga rol de customer
    const customerRoles = ['customer'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasCustomerRole = userRoles.some(role => customerRoles.includes(role));

    if (!hasCustomerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de cliente',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: customerRoles,
        current: userRoles
      });
    }

    // 3. AUTORIZACIÓN DE PERTENENCIA - Buscar el pedido específico del cliente
    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        customerId: userId // ✅ CRÍTICO: Solo pedidos del cliente autenticado
      },
      select: {
        id: true,
        status: true,
        deliveryDriverId: true,
        orderPlacedAt: true,
        orderDeliveredAt: true,
        updatedAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            lastname: true
          }
        },
        deliveryDriver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            phone: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            restaurant: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // 4. Verificar si el pedido existe y pertenece al cliente
    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Pedido no encontrado o no tienes permisos para verlo',
        code: 'ORDER_NOT_FOUND_OR_NO_PERMISSION',
        details: {
          orderId: orderIdNum,
          customerId: userId,
          possibleReasons: [
            'El pedido no existe',
            'El pedido no pertenece a este cliente',
            'No tienes permisos para ver este pedido'
          ]
        }
      });
    }

    // 5. VALIDACIÓN DE ESTADO - Verificar si el pedido está en camino
    if (!order.deliveryDriverId) {
      return res.status(200).json({
        status: 'success',
        message: 'El pedido aún no ha sido asignado a un repartidor',
        data: {
          order: {
            id: order.id.toString(),
            status: order.status,
            stage: 'waiting_for_driver_assignment',
            message: 'Tu pedido está siendo preparado. Te notificaremos cuando un repartidor sea asignado.'
          },
          tracking: {
            isTrackingAvailable: false,
            reason: 'no_driver_assigned'
          },
          customer: {
            id: order.customer.id,
            name: order.customer.name,
            lastname: order.customer.lastname
          },
          restaurant: {
            id: order.branch.restaurant.id,
            name: order.branch.restaurant.name,
            branch: {
              id: order.branch.id,
              name: order.branch.name,
              address: order.branch.address
            }
          },
          retrievedAt: new Date().toISOString()
        }
      });
    }

    if (order.status !== 'out_for_delivery') {
      return res.status(200).json({
        status: 'success',
        message: 'El pedido aún no está en camino',
        data: {
          order: {
            id: order.id.toString(),
            status: order.status,
            stage: 'not_in_delivery',
            message: `Tu pedido está en estado: ${order.status}. El tracking estará disponible cuando esté en camino.`
          },
          tracking: {
            isTrackingAvailable: false,
            reason: 'not_out_for_delivery',
            currentStatus: order.status
          },
          driver: {
            id: order.deliveryDriver.id,
            name: order.deliveryDriver.name,
            lastname: order.deliveryDriver.lastname,
            phone: order.deliveryDriver.phone
          },
          customer: {
            id: order.customer.id,
            name: order.customer.name,
            lastname: order.customer.lastname
          },
          restaurant: {
            id: order.branch.restaurant.id,
            name: order.branch.restaurant.name,
            branch: {
              id: order.branch.id,
              name: order.branch.name,
              address: order.branch.address
            }
          },
          retrievedAt: new Date().toISOString()
        }
      });
    }

    // 6. CONSULTA DE UBICACIÓN - Buscar ubicación del repartidor
    const driverLocation = await prisma.driverProfile.findUnique({
      where: { userId: order.deliveryDriverId },
      select: {
        userId: true,
        currentLatitude: true,
        currentLongitude: true,
        lastSeenAt: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            phone: true
          }
        }
      }
    });

    // 7. Verificar si se encontró la ubicación del repartidor
    if (!driverLocation) {
      return res.status(404).json({
        status: 'error',
        message: 'No se pudo obtener la ubicación del repartidor',
        code: 'DRIVER_LOCATION_NOT_FOUND',
        details: {
          orderId: orderIdNum,
          deliveryDriverId: order.deliveryDriverId,
          suggestion: 'El repartidor podría no tener GPS habilitado o no haber actualizado su ubicación recientemente'
        }
      });
    }

    // 8. Verificar si la ubicación está disponible
    if (!driverLocation.currentLatitude || !driverLocation.currentLongitude) {
      return res.status(200).json({
        status: 'success',
        message: 'La ubicación del repartidor no está disponible en este momento',
        data: {
          order: {
            id: order.id.toString(),
            status: order.status,
            stage: 'in_delivery_no_location',
            message: 'Tu pedido está en camino, pero la ubicación del repartidor no está disponible temporalmente.'
          },
          tracking: {
            isTrackingAvailable: false,
            reason: 'no_location_data',
            lastSeenAt: driverLocation.lastSeenAt
          },
          driver: {
            id: driverLocation.user.id,
            name: driverLocation.user.name,
            lastname: driverLocation.user.lastname,
            phone: driverLocation.user.phone,
            status: driverLocation.status
          },
          customer: {
            id: order.customer.id,
            name: order.customer.name,
            lastname: order.customer.lastname
          },
          restaurant: {
            id: order.branch.restaurant.id,
            name: order.branch.restaurant.name,
            branch: {
              id: order.branch.id,
              name: order.branch.name,
              address: order.branch.address
            }
          },
          retrievedAt: new Date().toISOString()
        }
      });
    }

    // 9. Calcular tiempo desde la última actualización
    const now = new Date();
    const lastSeen = driverLocation.lastSeenAt;
    const timeSinceLastUpdate = lastSeen ? now - lastSeen : null;
    const isLocationRecent = timeSinceLastUpdate ? timeSinceLastUpdate < (5 * 60 * 1000) : false; // 5 minutos

    // 10. Formatear respuesta con ubicación disponible
    const response = {
      status: 'success',
      message: 'Ubicación del repartidor obtenida exitosamente',
      data: {
        order: {
          id: order.id.toString(),
          status: order.status,
          stage: 'tracking_available',
          message: 'Tu pedido está en camino. Puedes seguir su ubicación en tiempo real.'
        },
        tracking: {
          isTrackingAvailable: true,
          location: {
            latitude: Number(driverLocation.currentLatitude),
            longitude: Number(driverLocation.currentLongitude),
            lastUpdated: driverLocation.lastSeenAt,
            isRecent: isLocationRecent,
            timeSinceLastUpdate: timeSinceLastUpdate,
            timeSinceLastUpdateFormatted: timeSinceLastUpdate ? formatTimeAgo(timeSinceLastUpdate) : null
          }
        },
        driver: {
          id: driverLocation.user.id,
          name: driverLocation.user.name,
          lastname: driverLocation.user.lastname,
          phone: driverLocation.user.phone,
          status: driverLocation.status
        },
        customer: {
          id: order.customer.id,
          name: order.customer.name,
          lastname: order.customer.lastname
        },
        restaurant: {
          id: order.branch.restaurant.id,
          name: order.branch.restaurant.name,
          branch: {
            id: order.branch.id,
            name: order.branch.name,
            address: order.branch.address
          }
        },
        deliveryInfo: {
          orderPlacedAt: order.orderPlacedAt,
          estimatedDeliveryTime: null, // Se puede calcular basado en distancia
          deliveryInstructions: null // Se puede obtener de la dirección
        },
        retrievedAt: new Date().toISOString()
      }
    };

    // 11. Respuesta exitosa
    res.status(200).json(response);

  } catch (error) {
    console.error('Error obteniendo ubicación del repartidor:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Función auxiliar para formatear tiempo transcurrido
 * @param {number} timeMs - Tiempo en milisegundos
 * @returns {string} Tiempo formateado
 */
const formatTimeAgo = (timeMs) => {
  const minutes = Math.floor(timeMs / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Hace un momento';
  }
};

module.exports = {
  getDriverLocationForOrder
};
