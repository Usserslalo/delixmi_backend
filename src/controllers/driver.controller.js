const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../config/socket');
const { formatOrderForSocket } = require('./restaurant-admin.controller');

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

      // 6. Emitir notificación en tiempo real al cliente
      try {
        const io = getIo();
        const customerId = updatedOrder.customer.id;
        const formattedOrder = formatOrderForSocket(updatedOrder);
        
        io.to(`user_${customerId}`).emit('order_status_update', {
          order: formattedOrder,
          orderId: formattedOrder.id,
          status: formattedOrder.status,
          previousStatus: 'ready_for_pickup',
          updatedAt: formattedOrder.updatedAt,
          driver: formattedOrder.driver,
          message: `¡Tu pedido #${formattedOrder.id} está en camino! Repartidor: ${formattedOrder.driver.name}`
        });
        console.log(`📢 Notificación enviada al cliente ${customerId} sobre aceptación del pedido ${formattedOrder.id} por repartidor`);
      } catch (socketError) {
        console.error('Error enviando notificación Socket.io:', socketError);
        // No fallar la respuesta por error de socket
      }

      // 7. Respuesta exitosa
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

    // 7. Emitir notificación en tiempo real al cliente
    try {
      const io = getIo();
      const customerId = completedOrder.customer.id;
      const formattedOrder = formatOrderForSocket(completedOrder);
      const deliveryTime = completedOrder.orderDeliveredAt - completedOrder.orderPlacedAt;
      
      io.to(`user_${customerId}`).emit('order_status_update', {
        order: formattedOrder,
        orderId: formattedOrder.id,
        status: formattedOrder.status,
        previousStatus: 'out_for_delivery',
        updatedAt: formattedOrder.updatedAt,
        orderDeliveredAt: formattedOrder.orderDeliveredAt,
        driver: formattedOrder.driver,
        deliveryStats: {
          deliveryTime: deliveryTime,
          deliveryTimeFormatted: formatDeliveryTime(deliveryTime)
        },
        message: `¡Tu pedido #${formattedOrder.id} ha sido entregado exitosamente! Tiempo de entrega: ${formatDeliveryTime(deliveryTime)}`
      });
      console.log(`📢 Notificación enviada al cliente ${customerId} sobre entrega completada del pedido ${formattedOrder.id}`);
    } catch (socketError) {
      console.error('Error enviando notificación Socket.io:', socketError);
      // No fallar la respuesta por error de socket
    }

    // 8. Respuesta exitosa
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

/**
 * Actualizar el estado de disponibilidad del repartidor
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateDriverStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;

    // 1. Obtener información del usuario y verificar autorización básica
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        lastname: true,
        email: true,
        phone: true,
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        }
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

    // 4. Actualizar el estado del repartidor
    const updatedDriverProfile = await prisma.driverProfile.update({
      where: { userId: userId },
      data: {
        status: status,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        }
      }
    });

    // 5. Formatear respuesta
    const formattedDriverProfile = {
      userId: updatedDriverProfile.userId,
      vehicleType: updatedDriverProfile.vehicleType,
      licensePlate: updatedDriverProfile.licensePlate,
      status: updatedDriverProfile.status,
      currentLocation: updatedDriverProfile.currentLatitude && updatedDriverProfile.currentLongitude ? {
        latitude: Number(updatedDriverProfile.currentLatitude),
        longitude: Number(updatedDriverProfile.currentLongitude)
      } : null,
      lastSeenAt: updatedDriverProfile.lastSeenAt,
      kycStatus: updatedDriverProfile.kycStatus,
      user: {
        id: updatedDriverProfile.user.id,
        name: updatedDriverProfile.user.name,
        lastname: updatedDriverProfile.user.lastname,
        email: updatedDriverProfile.user.email,
        phone: updatedDriverProfile.user.phone
      },
      roles: userRoles.filter(role => driverRoles.includes(role)),
      createdAt: updatedDriverProfile.createdAt,
      updatedAt: updatedDriverProfile.updatedAt
    };

    // 6. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: `Estado de repartidor actualizado a ${status}`,
      data: {
        driverProfile: formattedDriverProfile,
        statusChange: {
          previousStatus: existingDriverProfile.status,
          newStatus: status,
          changedAt: updatedDriverProfile.lastSeenAt
        },
        updatedBy: {
          userId: userId,
          userName: `${userWithRoles.name} ${userWithRoles.lastname}`
        }
      }
    });

  } catch (error) {
    console.error('Error actualizando estado del repartidor:', error);
    
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
        message: 'Conflicto en la actualización del perfil',
        code: 'UPDATE_CONFLICT'
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
