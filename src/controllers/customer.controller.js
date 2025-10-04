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
        specialInstructions: true,
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
            message: 'Tu pedido está siendo preparado. Te notificaremos cuando un repartidor sea asignado.',
            specialInstructions: order.specialInstructions
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
            message: `Tu pedido está en estado: ${order.status}. El tracking estará disponible cuando esté en camino.`,
            specialInstructions: order.specialInstructions
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
            message: 'Tu pedido está en camino, pero la ubicación del repartidor no está disponible temporalmente.',
            specialInstructions: order.specialInstructions
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
          message: 'Tu pedido está en camino. Puedes seguir su ubicación en tiempo real.',
          specialInstructions: order.specialInstructions
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

/**
 * Obtener el historial de pedidos del cliente autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCustomerOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, pageSize = 10 } = req.query;

    // Convertir parámetros de paginación a números
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    const skip = (pageNum - 1) * pageSizeNum;

    // 1. Verificar que el usuario tenga rol de customer
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

    // Verificar que el usuario tenga rol de customer
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

    // 2. Construir filtros para la consulta
    const whereClause = {
      customerId: userId
    };

    // Añadir filtro por estado si se proporciona
    if (status) {
      whereClause.status = status;
    }

    // 3. Obtener el total de pedidos para la paginación
    const totalOrders = await prisma.order.count({
      where: whereClause
    });

    // 4. Obtener los pedidos con información relacionada
    const orders = await prisma.order.findMany({
      where: whereClause,
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
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            restaurant: {
              select: {
                id: true,
                name: true,
                logoUrl: true
              }
            }
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
            references: true
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
        orderItems: {
          select: {
            id: true,
            quantity: true,
            pricePerUnit: true,
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true
              }
            }
          }
        }
      },
      orderBy: {
        orderPlacedAt: 'desc' // Ordenar por fecha de pedido descendente (más recientes primero)
      },
      skip: skip,
      take: pageSizeNum
    });

    // 5. Calcular información de paginación
    const totalPages = Math.ceil(totalOrders / pageSizeNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // 6. Formatear los pedidos para la respuesta
    const formattedOrders = orders.map(order => ({
      id: order.id.toString(),
      status: order.status,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      specialInstructions: order.specialInstructions,
      orderPlacedAt: order.orderPlacedAt,
      orderDeliveredAt: order.orderDeliveredAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      restaurant: {
        id: order.branch.restaurant.id,
        name: order.branch.restaurant.name,
        logoUrl: order.branch.restaurant.logoUrl,
        branch: {
          id: order.branch.id,
          name: order.branch.name,
          address: order.branch.address,
          phone: order.branch.phone
        }
      },
      deliveryAddress: {
        id: order.address.id,
        alias: order.address.alias,
        street: order.address.street,
        exteriorNumber: order.address.exteriorNumber,
        interiorNumber: order.address.interiorNumber,
        neighborhood: order.address.neighborhood,
        city: order.address.city,
        state: order.address.state,
        zipCode: order.address.zipCode,
        references: order.address.references
      },
      deliveryDriver: order.deliveryDriver ? {
        id: order.deliveryDriver.id,
        name: order.deliveryDriver.name,
        lastname: order.deliveryDriver.lastname,
        phone: order.deliveryDriver.phone
      } : null,
      items: order.orderItems.map(item => ({
        id: item.id.toString(),
        quantity: item.quantity,
        pricePerUnit: Number(item.pricePerUnit),
        subtotal: Number(item.pricePerUnit) * item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl
        }
      }))
    }));

    // 7. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Historial de pedidos obtenido exitosamente',
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          totalOrders: totalOrders,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        },
        filters: {
          status: status || null
        },
        customer: {
          id: userWithRoles.id,
          name: userWithRoles.name,
          lastname: userWithRoles.lastname
        },
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo historial de pedidos:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Crear una nueva dirección de entrega para el cliente autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createCustomerAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      alias,
      street,
      exterior_number,
      interior_number,
      neighborhood,
      city,
      state,
      zip_code,
      references,
      latitude,
      longitude
    } = req.body;

    // 1. Verificar que el usuario tenga rol de customer
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

    // Verificar que el usuario tenga rol de customer
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

    // 2. Verificar si ya existe una dirección con el mismo alias para este usuario
    const existingAddress = await prisma.address.findFirst({
      where: {
        userId: userId,
        alias: alias
      }
    });

    if (existingAddress) {
      return res.status(409).json({
        status: 'error',
        message: 'Ya existe una dirección con este alias',
        code: 'ADDRESS_ALIAS_EXISTS',
        details: {
          alias: alias,
          existingAddressId: existingAddress.id.toString() // ✅ CORREGIDO: Convertir BigInt a String
        }
      });
    }

    // 3. Crear la nueva dirección
    const newAddress = await prisma.address.create({
      data: {
        userId: userId,
        alias: alias,
        street: street,
        exteriorNumber: exterior_number,
        interiorNumber: interior_number || null,
        neighborhood: neighborhood,
        city: city,
        state: state,
        zipCode: zip_code,
        references: references || null,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
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
        references: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            lastname: true
          }
        }
      }
    });

    // 4. Formatear la respuesta
    const formattedAddress = {
      id: newAddress.id,
      alias: newAddress.alias,
      street: newAddress.street,
      exteriorNumber: newAddress.exteriorNumber,
      interiorNumber: newAddress.interiorNumber,
      neighborhood: newAddress.neighborhood,
      city: newAddress.city,
      state: newAddress.state,
      zipCode: newAddress.zipCode,
      references: newAddress.references,
      latitude: Number(newAddress.latitude),
      longitude: Number(newAddress.longitude),
      createdAt: newAddress.createdAt,
      updatedAt: newAddress.updatedAt,
      customer: {
        id: newAddress.user.id,
        name: newAddress.user.name,
        lastname: newAddress.user.lastname
      }
    };

    // 5. Respuesta exitosa
    res.status(201).json({
      status: 'success',
      message: 'Dirección creada exitosamente',
      data: {
        address: formattedAddress
      }
    });

  } catch (error) {
    console.error('Error creando dirección:', error);
    
    // Manejo específico de errores de Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Ya existe una dirección con este alias para este usuario',
        code: 'DUPLICATE_ADDRESS_ALIAS'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Obtener todas las direcciones de entrega del cliente autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCustomerAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Verificar que el usuario tenga rol de customer
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

    // Verificar que el usuario tenga rol de customer
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

    // 2. Obtener todas las direcciones del cliente
    const addresses = await prisma.address.findMany({
      where: {
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
        references: true,
        latitude: true,
        longitude: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            lastname: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc' // Ordenar por fecha de actualización descendente (más recientes primero)
      }
    });

    // 3. Formatear las direcciones para la respuesta
    const formattedAddresses = addresses.map(address => ({
      id: address.id,
      alias: address.alias,
      street: address.street,
      exteriorNumber: address.exteriorNumber,
      interiorNumber: address.interiorNumber,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
      references: address.references,
      latitude: Number(address.latitude),
      longitude: Number(address.longitude),
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
      customer: {
        id: address.user.id,
        name: address.user.name,
        lastname: address.user.lastname
      }
    }));

    // 4. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Direcciones obtenidas exitosamente',
      data: {
        addresses: formattedAddresses,
        totalAddresses: addresses.length,
        customer: {
          id: userWithRoles.id,
          name: userWithRoles.name,
          lastname: userWithRoles.lastname
        },
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo direcciones:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Actualizar una dirección de entrega del cliente autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateCustomerAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.addressId);
    const updateData = req.body;

    // 1. Verificar que el usuario tenga rol de customer
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

    // Verificar que el usuario tenga rol de customer
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

    // 2. Buscar la dirección y verificar que pertenezca al cliente
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: userId // ✅ CRÍTICO: Solo direcciones del cliente autenticado
      }
    });

    if (!existingAddress) {
      return res.status(404).json({
        status: 'error',
        message: 'Dirección no encontrada o no tienes permisos para editarla',
        code: 'ADDRESS_NOT_FOUND_OR_NO_PERMISSION',
        details: {
          addressId: addressId,
          customerId: userId,
          possibleReasons: [
            'La dirección no existe',
            'La dirección no pertenece a este cliente',
            'No tienes permisos para editar esta dirección'
          ]
        }
      });
    }

    // 3. Verificar si se está intentando cambiar el alias y si ya existe
    if (updateData.alias && updateData.alias !== existingAddress.alias) {
      const aliasExists = await prisma.address.findFirst({
        where: {
          userId: userId,
          alias: updateData.alias,
          id: { not: addressId } // Excluir la dirección actual
        }
      });

      if (aliasExists) {
        return res.status(409).json({
          status: 'error',
          message: 'Ya existe una dirección con este alias',
          code: 'ADDRESS_ALIAS_EXISTS',
          details: {
            alias: updateData.alias,
            existingAddressId: aliasExists.id.toString() // ✅ CORREGIDO: Convertir BigInt a String
          }
        });
      }
    }

    // 4. Preparar los datos para la actualización
    const updateFields = {};
    
    if (updateData.alias !== undefined) updateFields.alias = updateData.alias;
    if (updateData.street !== undefined) updateFields.street = updateData.street;
    if (updateData.exterior_number !== undefined) updateFields.exteriorNumber = updateData.exterior_number;
    if (updateData.interior_number !== undefined) updateFields.interiorNumber = updateData.interior_number || null;
    if (updateData.neighborhood !== undefined) updateFields.neighborhood = updateData.neighborhood;
    if (updateData.city !== undefined) updateFields.city = updateData.city;
    if (updateData.state !== undefined) updateFields.state = updateData.state;
    if (updateData.zip_code !== undefined) updateFields.zipCode = updateData.zip_code;
    if (updateData.references !== undefined) updateFields.references = updateData.references || null;
    if (updateData.latitude !== undefined) updateFields.latitude = parseFloat(updateData.latitude);
    if (updateData.longitude !== undefined) updateFields.longitude = parseFloat(updateData.longitude);

    // 5. Actualizar la dirección
    const updatedAddress = await prisma.address.update({
      where: {
        id: addressId
      },
      data: updateFields,
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
        longitude: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            lastname: true
          }
        }
      }
    });

    // 6. Formatear la respuesta
    const formattedAddress = {
      id: updatedAddress.id,
      alias: updatedAddress.alias,
      street: updatedAddress.street,
      exteriorNumber: updatedAddress.exteriorNumber,
      interiorNumber: updatedAddress.interiorNumber,
      neighborhood: updatedAddress.neighborhood,
      city: updatedAddress.city,
      state: updatedAddress.state,
      zipCode: updatedAddress.zipCode,
      references: updatedAddress.references,
      latitude: Number(updatedAddress.latitude),
      longitude: Number(updatedAddress.longitude),
      createdAt: updatedAddress.createdAt,
      updatedAt: updatedAddress.updatedAt,
      customer: {
        id: updatedAddress.user.id,
        name: updatedAddress.user.name,
        lastname: updatedAddress.user.lastname
      }
    };

    // 7. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Dirección actualizada exitosamente',
      data: {
        address: formattedAddress
      }
    });

  } catch (error) {
    console.error('Error actualizando dirección:', error);
    
    // Manejo específico de errores de Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Ya existe una dirección con este alias para este usuario',
        code: 'DUPLICATE_ADDRESS_ALIAS'
      });
    }

    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'La dirección no fue encontrada',
        code: 'ADDRESS_NOT_FOUND'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Eliminar una dirección de entrega del cliente autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteCustomerAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const addressId = parseInt(req.params.addressId);

    // 1. Verificar que el usuario tenga rol de customer
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

    // Verificar que el usuario tenga rol de customer
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

    // 2. Buscar la dirección y verificar que pertenezca al cliente
    const existingAddress = await prisma.address.findFirst({
      where: {
        id: addressId,
        userId: userId // ✅ CRÍTICO: Solo direcciones del cliente autenticado
      },
      select: {
        id: true,
        alias: true,
        street: true,
        exteriorNumber: true,
        neighborhood: true,
        city: true,
        state: true
      }
    });

    if (!existingAddress) {
      return res.status(404).json({
        status: 'error',
        message: 'Dirección no encontrada o no tienes permisos para eliminarla',
        code: 'ADDRESS_NOT_FOUND_OR_NO_PERMISSION',
        details: {
          addressId: addressId,
          customerId: userId,
          possibleReasons: [
            'La dirección no existe',
            'La dirección no pertenece a este cliente',
            'No tienes permisos para eliminar esta dirección'
          ]
        }
      });
    }

    // 3. Verificar si la dirección está siendo utilizada en algún pedido
    const addressInUse = await prisma.order.findFirst({
      where: {
        addressId: addressId
      },
      select: {
        id: true,
        status: true,
        orderPlacedAt: true
      }
    });

    if (addressInUse) {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar la dirección porque está siendo utilizada en pedidos',
        code: 'ADDRESS_IN_USE',
        details: {
          addressId: addressId,
          addressAlias: existingAddress.alias,
          addressInfo: `${existingAddress.street} ${existingAddress.exteriorNumber}, ${existingAddress.neighborhood}, ${existingAddress.city}, ${existingAddress.state}`,
          orderId: addressInUse.id.toString(), // ✅ CORREGIDO: Convertir BigInt a String
          orderStatus: addressInUse.status,
          orderPlacedAt: addressInUse.orderPlacedAt,
          suggestion: 'Elimina o actualiza los pedidos que usan esta dirección antes de eliminarla'
        }
      });
    }

    // 4. Eliminar la dirección
    await prisma.address.delete({
      where: {
        id: addressId
      }
    });

    // 5. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Dirección eliminada exitosamente',
      data: {
        deletedAddress: {
          id: existingAddress.id,
          alias: existingAddress.alias,
          addressInfo: `${existingAddress.street} ${existingAddress.exteriorNumber}, ${existingAddress.neighborhood}, ${existingAddress.city}, ${existingAddress.state}`,
          deletedAt: new Date().toISOString()
        },
        customer: {
          id: userWithRoles.id,
          name: userWithRoles.name,
          lastname: userWithRoles.lastname
        }
      }
    });

  } catch (error) {
    console.error('Error eliminando dirección:', error);
    
    // Manejo específico de errores de Prisma
    if (error.code === 'P2025') {
      return res.status(404).json({
        status: 'error',
        message: 'La dirección no fue encontrada',
        code: 'ADDRESS_NOT_FOUND'
      });
    }

    if (error.code === 'P2003') {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar la dirección porque está siendo utilizada en pedidos',
        code: 'ADDRESS_IN_USE_FOREIGN_KEY'
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
  getDriverLocationForOrder,
  getCustomerOrders,
  createCustomerAddress,
  getCustomerAddresses,
  updateCustomerAddress,
  deleteCustomerAddress
};
