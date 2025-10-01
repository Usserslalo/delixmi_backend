const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Obtiene los pedidos disponibles para recoger por repartidores
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getAvailableOrders = async (req, res) => {
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

    // 1. Obtener información del usuario y verificar autorización
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

    // 3. Determinar el tipo de repartidor y construir la consulta
    const isPlatformDriver = userRoles.includes('driver_platform');
    const isRestaurantDriver = userRoles.includes('driver_restaurant');

    let whereClause = {
      status: 'ready_for_pickup',
      deliveryDriverId: null // Solo pedidos sin repartidor asignado
    };

    if (isPlatformDriver && isRestaurantDriver) {
      // Usuario con ambos roles - puede ver pedidos de plataforma Y de sus sucursales asignadas
      const assignedBranchIds = userWithRoles.userRoleAssignments
        .filter(assignment => assignment.branchId)
        .map(assignment => assignment.branchId);

      whereClause = {
        status: 'ready_for_pickup',
        deliveryDriverId: null,
        OR: [
          // Pedidos de sucursales que usan repartidores de plataforma
          {
            branch: {
              usesPlatformDrivers: true
            }
          },
          // Pedidos de las sucursales específicamente asignadas al repartidor
          ...(assignedBranchIds.length > 0 ? [{
            branchId: { in: assignedBranchIds }
          }] : [])
        ]
      };
    } else if (isPlatformDriver) {
      // Solo repartidor de plataforma - solo pedidos de sucursales que usan repartidores de plataforma
      whereClause = {
        status: 'ready_for_pickup',
        deliveryDriverId: null,
        branch: {
          usesPlatformDrivers: true
        }
      };
    } else if (isRestaurantDriver) {
      // Solo repartidor de restaurante - solo pedidos de sus sucursales asignadas
      const assignedBranchIds = userWithRoles.userRoleAssignments
        .filter(assignment => assignment.branchId)
        .map(assignment => assignment.branchId);

      if (assignedBranchIds.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'No se encontraron sucursales asignadas para este repartidor',
          code: 'NO_BRANCH_ASSIGNED'
        });
      }

      whereClause = {
        status: 'ready_for_pickup',
        deliveryDriverId: null,
        branchId: { in: assignedBranchIds }
      };
    }

    // 4. Calcular offset para paginación
    const offset = (pageNum - 1) * pageSizeNum;

    // 5. Obtener pedidos disponibles con filtros
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
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
                      name: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          orderPlacedAt: 'asc' // Pedidos más antiguos primero (FIFO)
        },
        skip: offset,
        take: pageSizeNum
      }),
      prisma.order.count({
        where: whereClause
      })
    ]);

    // 6. Calcular información de paginación
    const totalPages = Math.ceil(totalCount / pageSizeNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // 7. Formatear respuesta
    const formattedOrders = orders.map(order => ({
      id: order.id.toString(),
      status: order.status,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      orderPlacedAt: order.orderPlacedAt,
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
      items: order.orderItems.map(item => ({
        id: item.id.toString(),
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: Number(item.product.price),
          imageUrl: item.product.imageUrl,
          category: item.product.subcategory.name
        },
        quantity: item.quantity,
        pricePerUnit: Number(item.pricePerUnit),
        total: Number(item.pricePerUnit) * item.quantity
      }))
    }));

    // 8. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Pedidos disponibles obtenidos exitosamente',
      data: {
        orders: formattedOrders,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        },
        driverInfo: {
          userId: userId,
          driverTypes: userRoles.filter(role => driverRoles.includes(role)),
          assignedBranches: userWithRoles.userRoleAssignments
            .filter(assignment => assignment.branchId)
            .map(assignment => ({
              branchId: assignment.branchId,
              role: assignment.role.name
            }))
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo pedidos disponibles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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

    // Convertir orderId a número
    const orderIdNum = parseInt(orderId);

    // 1. Obtener información del usuario y verificar autorización
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

    // 3. Verificar autorización adicional según el tipo de repartidor
    const isPlatformDriver = userRoles.includes('driver_platform');
    const isRestaurantDriver = userRoles.includes('driver_restaurant');

    // Construir condiciones de autorización para el pedido
    let orderAuthorizationWhere = {};
    
    if (isPlatformDriver && isRestaurantDriver) {
      // Repartidor híbrido - puede aceptar pedidos de plataforma Y de sus sucursales asignadas
      const assignedBranchIds = userWithRoles.userRoleAssignments
        .filter(assignment => assignment.branchId)
        .map(assignment => assignment.branchId);

      orderAuthorizationWhere = {
        OR: [
          // Pedidos de sucursales que usan repartidores de plataforma
          {
            branch: {
              usesPlatformDrivers: true
            }
          },
          // Pedidos de las sucursales específicamente asignadas al repartidor
          ...(assignedBranchIds.length > 0 ? [{
            branchId: { in: assignedBranchIds }
          }] : [])
        ]
      };
    } else if (isPlatformDriver) {
      // Solo repartidor de plataforma - solo pedidos de sucursales que usan repartidores de plataforma
      orderAuthorizationWhere = {
        branch: {
          usesPlatformDrivers: true
        }
      };
    } else if (isRestaurantDriver) {
      // Solo repartidor de restaurante - solo pedidos de sus sucursales asignadas
      const assignedBranchIds = userWithRoles.userRoleAssignments
        .filter(assignment => assignment.branchId)
        .map(assignment => assignment.branchId);

      if (assignedBranchIds.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'No se encontraron sucursales asignadas para este repartidor',
          code: 'NO_BRANCH_ASSIGNED'
        });
      }

      orderAuthorizationWhere = {
        branchId: { in: assignedBranchIds }
      };
    }

    // 4. OPERACIÓN ATÓMICA CRÍTICA - Actualización con verificación de disponibilidad
    // Esta operación previene condiciones de carrera (race conditions)
    try {
      const updatedOrder = await prisma.order.update({
        where: {
          id: orderIdNum,
          status: 'ready_for_pickup',
          deliveryDriverId: null,
          ...orderAuthorizationWhere
        },
        data: {
          deliveryDriverId: userId,
          status: 'out_for_delivery',
          updatedAt: new Date()
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
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // 5. Formatear respuesta exitosa
      const formattedOrder = {
        id: updatedOrder.id.toString(),
        status: updatedOrder.status,
        subtotal: Number(updatedOrder.subtotal),
        deliveryFee: Number(updatedOrder.deliveryFee),
        total: Number(updatedOrder.total),
        orderPlacedAt: updatedOrder.orderPlacedAt,
        orderDeliveredAt: updatedOrder.orderDeliveredAt,
        updatedAt: updatedOrder.updatedAt,
        customer: {
          id: updatedOrder.customer.id,
          name: updatedOrder.customer.name,
          lastname: updatedOrder.customer.lastname,
          email: updatedOrder.customer.email,
          phone: updatedOrder.customer.phone
        },
        address: {
          id: updatedOrder.address.id,
          alias: updatedOrder.address.alias,
          fullAddress: `${updatedOrder.address.street} ${updatedOrder.address.exteriorNumber}${updatedOrder.address.interiorNumber ? ' Int. ' + updatedOrder.address.interiorNumber : ''}, ${updatedOrder.address.neighborhood}, ${updatedOrder.address.city}, ${updatedOrder.address.state} ${updatedOrder.address.zipCode}`,
          references: updatedOrder.address.references,
          coordinates: {
            latitude: Number(updatedOrder.address.latitude),
            longitude: Number(updatedOrder.address.longitude)
          }
        },
        branch: {
          id: updatedOrder.branch.id,
          name: updatedOrder.branch.name,
          address: updatedOrder.branch.address,
          phone: updatedOrder.branch.phone,
          usesPlatformDrivers: updatedOrder.branch.usesPlatformDrivers,
          coordinates: {
            latitude: Number(updatedOrder.branch.latitude),
            longitude: Number(updatedOrder.branch.longitude)
          },
          restaurant: {
            id: updatedOrder.branch.restaurant.id,
            name: updatedOrder.branch.restaurant.name
          }
        },
        driver: {
          id: updatedOrder.deliveryDriver.id,
          name: updatedOrder.deliveryDriver.name,
          lastname: updatedOrder.deliveryDriver.lastname,
          email: updatedOrder.deliveryDriver.email,
          phone: updatedOrder.deliveryDriver.phone
        },
        items: updatedOrder.orderItems.map(item => ({
          id: item.id.toString(),
          product: {
            id: item.product.id,
            name: item.product.name,
            description: item.product.description,
            price: Number(item.product.price),
            imageUrl: item.product.imageUrl,
            category: item.product.subcategory.name
          },
          quantity: item.quantity,
          pricePerUnit: Number(item.pricePerUnit),
          total: Number(item.pricePerUnit) * item.quantity
        }))
      };

      // 6. Respuesta exitosa
      res.status(200).json({
        status: 'success',
        message: 'Pedido aceptado exitosamente',
        data: {
          order: formattedOrder,
          driverInfo: {
            userId: userId,
            driverTypes: userRoles.filter(role => driverRoles.includes(role)),
            acceptedAt: new Date().toISOString()
          }
        }
      });

    } catch (updateError) {
      // Manejo específico de errores de Prisma
      if (updateError.code === 'P2025') {
        // Error P2025: Record to update not found
        // Esto significa que el pedido ya fue tomado por otro repartidor o no existe
        return res.status(409).json({
          status: 'error',
          message: 'Este pedido ya fue tomado por otro repartidor o no está disponible',
          code: 'ORDER_ALREADY_TAKEN',
          details: {
            orderId: orderIdNum,
            reason: 'El pedido fue aceptado por otro repartidor o cambió de estado'
          }
        });
      }

      // Otros errores de Prisma
      throw updateError;
    }

  } catch (error) {
    console.error('Error aceptando pedido:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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

    // 3. AUTORIZACIÓN DE PERTENENCIA - Buscar el pedido específico del repartidor
    // Esta consulta es muy específica y asegura que solo el repartidor asignado pueda completar el pedido
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        status: 'out_for_delivery', // Solo pedidos en camino
        deliveryDriverId: userId // Solo pedidos asignados a este repartidor
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
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // 4. Verificar si el pedido existe y pertenece al repartidor
    if (!existingOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Pedido no encontrado, no te pertenece o ya fue entregado',
        code: 'ORDER_NOT_FOUND_OR_NOT_ASSIGNED',
        details: {
          orderId: orderIdNum,
          userId: userId,
          possibleReasons: [
            'El pedido no existe',
            'El pedido no está asignado a este repartidor',
            'El pedido ya fue entregado',
            'El pedido no está en estado "out_for_delivery"'
          ]
        }
      });
    }

    // 5. Actualizar el pedido como completado
    const completedOrder = await prisma.order.update({
      where: {
        id: orderIdNum
      },
      data: {
        status: 'delivered',
        orderDeliveredAt: new Date(),
        updatedAt: new Date()
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
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // 6. Formatear respuesta exitosa
    const formattedOrder = {
      id: completedOrder.id.toString(),
      status: completedOrder.status,
      subtotal: Number(completedOrder.subtotal),
      deliveryFee: Number(completedOrder.deliveryFee),
      total: Number(completedOrder.total),
      orderPlacedAt: completedOrder.orderPlacedAt,
      orderDeliveredAt: completedOrder.orderDeliveredAt,
      updatedAt: completedOrder.updatedAt,
      customer: {
        id: completedOrder.customer.id,
        name: completedOrder.customer.name,
        lastname: completedOrder.customer.lastname,
        email: completedOrder.customer.email,
        phone: completedOrder.customer.phone
      },
      address: {
        id: completedOrder.address.id,
        alias: completedOrder.address.alias,
        fullAddress: `${completedOrder.address.street} ${completedOrder.address.exteriorNumber}${completedOrder.address.interiorNumber ? ' Int. ' + completedOrder.address.interiorNumber : ''}, ${completedOrder.address.neighborhood}, ${completedOrder.address.city}, ${completedOrder.address.state} ${completedOrder.address.zipCode}`,
        references: completedOrder.address.references,
        coordinates: {
          latitude: Number(completedOrder.address.latitude),
          longitude: Number(completedOrder.address.longitude)
        }
      },
      branch: {
        id: completedOrder.branch.id,
        name: completedOrder.branch.name,
        address: completedOrder.branch.address,
        phone: completedOrder.branch.phone,
        usesPlatformDrivers: completedOrder.branch.usesPlatformDrivers,
        coordinates: {
          latitude: Number(completedOrder.branch.latitude),
          longitude: Number(completedOrder.branch.longitude)
        },
        restaurant: {
          id: completedOrder.branch.restaurant.id,
          name: completedOrder.branch.restaurant.name
        }
      },
      driver: {
        id: completedOrder.deliveryDriver.id,
        name: completedOrder.deliveryDriver.name,
        lastname: completedOrder.deliveryDriver.lastname,
        email: completedOrder.deliveryDriver.email,
        phone: completedOrder.deliveryDriver.phone
      },
      items: completedOrder.orderItems.map(item => ({
        id: item.id.toString(),
        product: {
          id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          price: Number(item.product.price),
          imageUrl: item.product.imageUrl,
          category: item.product.subcategory.name
        },
        quantity: item.quantity,
        pricePerUnit: Number(item.pricePerUnit),
        total: Number(item.pricePerUnit) * item.quantity
      }))
    };

    // 7. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Pedido completado exitosamente',
      data: {
        order: formattedOrder,
        driverInfo: {
          userId: userId,
          driverTypes: userRoles.filter(role => driverRoles.includes(role)),
          completedAt: completedOrder.orderDeliveredAt
        },
        deliveryStats: {
          deliveryTime: completedOrder.orderDeliveredAt - completedOrder.orderPlacedAt,
          deliveryTimeFormatted: formatDeliveryTime(completedOrder.orderDeliveredAt - completedOrder.orderPlacedAt)
        }
      }
    });

  } catch (error) {
    console.error('Error completando pedido:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
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

module.exports = {
  getAvailableOrders,
  acceptOrder,
  completeOrder
};
