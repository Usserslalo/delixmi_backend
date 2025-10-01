const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Obtiene los pedidos para el panel de administración del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = 'confirmed', page = 1, pageSize = 10 } = req.query;

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

    // Validar status del pedido
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Estado de pedido inválido',
        validStatuses: validStatuses
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

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: restaurantRoles,
        current: userRoles
      });
    }

    // 3. Determinar el branch_id para filtrar pedidos
    let branchIds = [];
    
    // Si el usuario es owner y no tiene branch_id específico, obtener todas las sucursales de sus restaurantes
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId && !assignment.branchId
    );

    if (ownerAssignments.length > 0) {
      // Owner sin branch específico - obtener todas las sucursales de sus restaurantes
      const restaurantIds = ownerAssignments.map(assignment => assignment.restaurantId);
      const branches = await prisma.branch.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          status: 'active'
        },
        select: { id: true }
      });
      branchIds = branches.map(branch => branch.id);
    } else {
      // Usuario con branch específico o otros roles
      const specificBranchAssignments = userWithRoles.userRoleAssignments.filter(
        assignment => assignment.branchId
      );
      branchIds = specificBranchAssignments.map(assignment => assignment.branchId);
    }

    if (branchIds.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontraron sucursales asignadas para este usuario',
        code: 'NO_BRANCH_ASSIGNED'
      });
    }

    // 4. Calcular offset para paginación
    const offset = (pageNum - 1) * pageSizeNum;

    // 5. Obtener pedidos con filtros
    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: {
          branchId: { in: branchIds },
          status: status
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
              references: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
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
          orderPlacedAt: 'desc'
        },
        skip: offset,
        take: pageSizeNum
      }),
      prisma.order.count({
        where: {
          branchId: { in: branchIds },
          status: status
        }
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
      orderDeliveredAt: order.orderDeliveredAt,
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
        references: order.address.references
      },
      branch: {
        id: order.branch.id,
        name: order.branch.name,
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
      message: 'Pedidos obtenidos exitosamente',
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
        filters: {
          status: status,
          branchIds: branchIds
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo pedidos del restaurante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Actualiza el estado de un pedido específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validar que orderId sea un número válido
    const orderIdNum = parseInt(orderId);
    if (isNaN(orderIdNum)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de pedido inválido',
        code: 'INVALID_ORDER_ID'
      });
    }

    // 1. Obtener información del usuario y verificar autorización
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Determinar los branch_ids permitidos para el usuario
    let allowedBranchIds = [];
    
    // Si el usuario es owner y no tiene branch_id específico, obtener todas las sucursales de sus restaurantes
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId && !assignment.branchId
    );

    if (ownerAssignments.length > 0) {
      // Owner sin branch específico - obtener todas las sucursales de sus restaurantes
      const restaurantIds = ownerAssignments.map(assignment => assignment.restaurantId);
      const branches = await prisma.branch.findMany({
        where: {
          restaurantId: { in: restaurantIds },
          status: 'active'
        },
        select: { id: true }
      });
      allowedBranchIds = branches.map(branch => branch.id);
    } else {
      // Usuario con branch específico o otros roles
      const specificBranchAssignments = userWithRoles.userRoleAssignments.filter(
        assignment => assignment.branchId
      );
      allowedBranchIds = specificBranchAssignments.map(assignment => assignment.branchId);
    }

    if (allowedBranchIds.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontraron sucursales asignadas para este usuario',
        code: 'NO_BRANCH_ASSIGNED'
      });
    }

    // 4. Buscar el pedido con autorización de seguridad
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        branchId: { in: allowedBranchIds }
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
            references: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
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
      }
    });

    if (!existingOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Pedido no encontrado o no tienes permisos para modificarlo',
        code: 'ORDER_NOT_FOUND'
      });
    }

    // 5. Actualizar el estado del pedido
    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: { 
        status: status,
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
            references: true
          }
        },
        branch: {
          select: {
            id: true,
            name: true,
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
      }
    });

    // 6. Formatear respuesta
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
        references: updatedOrder.address.references
      },
      branch: {
        id: updatedOrder.branch.id,
        name: updatedOrder.branch.name,
        restaurant: {
          id: updatedOrder.branch.restaurant.id,
          name: updatedOrder.branch.restaurant.name
        }
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

    // 7. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Estado del pedido actualizado exitosamente',
      data: {
        order: formattedOrder,
        previousStatus: existingOrder.status,
        newStatus: status,
        updatedBy: {
          userId: userId,
          roles: userRoles
        }
      }
    });

  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Obtiene la lista de subcategorías del restaurante para el panel de administración
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantSubcategories = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, page = 1, pageSize = 20 } = req.query;

    // Validar parámetros de paginación
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);

    if (pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de paginación inválidos',
        details: {
          page: 'Debe ser un número mayor a 0',
          pageSize: 'Debe ser un número entre 1 y 100'
        }
      });
    }

    // 1. Obtener información del usuario y sus roles
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

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: restaurantRoles,
        current: userRoles
      });
    }

    // 3. Obtener el restaurant_id del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = userRestaurantAssignment.restaurantId;

    // 4. Construir filtros para la consulta
    const whereClause = {
      restaurantId: restaurantId
    };

    // Filtro opcional por categoría global
    if (categoryId !== undefined) {
      const categoryIdNum = parseInt(categoryId);
      
      // Verificar que la categoría existe
      const category = await prisma.category.findUnique({
        where: { id: categoryIdNum }
      });

      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Categoría no encontrada',
          code: 'CATEGORY_NOT_FOUND'
        });
      }

      whereClause.categoryId = categoryIdNum;
    }

    // 5. Calcular offset para paginación
    const offset = (pageNum - 1) * pageSizeNum;

    // 6. Obtener subcategorías con filtros, ordenamiento y paginación
    const [subcategories, totalCount] = await Promise.all([
      prisma.subcategory.findMany({
        where: whereClause,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              imageUrl: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          },
          _count: {
            select: {
              products: true
            }
          }
        },
        orderBy: {
          displayOrder: 'asc'
        },
        skip: offset,
        take: pageSizeNum
      }),
      prisma.subcategory.count({
        where: whereClause
      })
    ]);

    // 7. Calcular información de paginación
    const totalPages = Math.ceil(totalCount / pageSizeNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // 8. Formatear respuesta
    const formattedSubcategories = subcategories.map(subcategory => ({
      id: subcategory.id,
      name: subcategory.name,
      displayOrder: subcategory.displayOrder,
      productsCount: subcategory._count.products,
      category: {
        id: subcategory.category.id,
        name: subcategory.category.name,
        imageUrl: subcategory.category.imageUrl
      },
      restaurant: {
        id: subcategory.restaurant.id,
        name: subcategory.restaurant.name
      },
      createdAt: subcategory.createdAt,
      updatedAt: subcategory.updatedAt
    }));

    // 9. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Subcategorías obtenidas exitosamente',
      data: {
        subcategories: formattedSubcategories,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        },
        filters: {
          restaurantId: restaurantId,
          categoryId: categoryId ? parseInt(categoryId) : null
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo subcategorías del restaurante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Crea una nueva subcategoría para el menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createSubcategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { categoryId, name, displayOrder = 0 } = req.body;

    // 1. Obtener información del usuario y sus roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 2. Verificar que el usuario tenga roles de restaurante (owner o branch_manager)
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurant_id del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = userRestaurantAssignment.restaurantId;

    // 4. Verificar que la categoría existe
    const categoryIdNum = parseInt(categoryId);
    const category = await prisma.category.findUnique({
      where: { id: categoryIdNum },
      select: {
        id: true,
        name: true
      }
    });

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Categoría no encontrada',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    // 5. Crear la subcategoría
    try {
      const newSubcategory = await prisma.subcategory.create({
        data: {
          restaurantId: restaurantId,
          categoryId: categoryIdNum,
          name: name.trim(),
          displayOrder: parseInt(displayOrder)
        },
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // 6. Formatear respuesta
      const formattedSubcategory = {
        id: newSubcategory.id,
        name: newSubcategory.name,
        displayOrder: newSubcategory.displayOrder,
        category: {
          id: newSubcategory.category.id,
          name: newSubcategory.category.name
        },
        restaurant: {
          id: newSubcategory.restaurant.id,
          name: newSubcategory.restaurant.name
        },
        createdAt: newSubcategory.createdAt,
        updatedAt: newSubcategory.updatedAt
      };

      // 7. Respuesta exitosa
      res.status(201).json({
        status: 'success',
        message: 'Subcategoría creada exitosamente',
        data: {
          subcategory: formattedSubcategory
        }
      });

    } catch (error) {
      // Manejar error de restricción única (P2002)
      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante',
          code: 'DUPLICATE_SUBCATEGORY',
          details: {
            categoryId: categoryIdNum,
            categoryName: category.name,
            subcategoryName: name.trim()
          }
        });
      }
      
      // Re-lanzar el error para que sea manejado por el catch externo
      throw error;
    }

  } catch (error) {
    console.error('Error creando subcategoría:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Actualiza una subcategoría existente del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateSubcategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subcategoryId } = req.params;
    const { categoryId, name, displayOrder } = req.body;

    // Convertir subcategoryId a número
    const subcategoryIdNum = parseInt(subcategoryId);

    // 1. Obtener información del usuario y sus roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurant_id del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = userRestaurantAssignment.restaurantId;

    // 4. Buscar la subcategoría existente
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum },
      select: {
        id: true,
        name: true,
        displayOrder: true,
        restaurantId: true,
        categoryId: true,
        restaurant: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingSubcategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Subcategoría no encontrada',
        code: 'SUBCATEGORY_NOT_FOUND'
      });
    }

    // 5. Verificar autorización: la subcategoría debe pertenecer al restaurante del usuario
    if (existingSubcategory.restaurantId !== restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para editar esta subcategoría',
        code: 'FORBIDDEN',
        details: {
          subcategoryId: subcategoryIdNum,
          restaurantId: existingSubcategory.restaurantId,
          restaurantName: existingSubcategory.restaurant.name
        }
      });
    }

    // 6. Si se está cambiando la categoría, verificar que existe
    if (categoryId !== undefined) {
      const categoryIdNum = parseInt(categoryId);
      
      const newCategory = await prisma.category.findUnique({
        where: { id: categoryIdNum },
        select: {
          id: true,
          name: true
        }
      });

      if (!newCategory) {
        return res.status(404).json({
          status: 'error',
          message: 'Categoría no encontrada',
          code: 'CATEGORY_NOT_FOUND'
        });
      }
    }

    // 7. Preparar los datos de actualización (solo campos enviados)
    const updateData = {};
    
    if (categoryId !== undefined) {
      updateData.categoryId = parseInt(categoryId);
    }
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (displayOrder !== undefined) {
      updateData.displayOrder = parseInt(displayOrder);
    }

    // Si no hay campos para actualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    // 8. Actualizar la subcategoría
    try {
      const updatedSubcategory = await prisma.subcategory.update({
        where: { id: subcategoryIdNum },
        data: updateData,
        include: {
          category: {
            select: {
              id: true,
              name: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // 9. Formatear respuesta
      const formattedSubcategory = {
        id: updatedSubcategory.id,
        name: updatedSubcategory.name,
        displayOrder: updatedSubcategory.displayOrder,
        category: {
          id: updatedSubcategory.category.id,
          name: updatedSubcategory.category.name
        },
        restaurant: {
          id: updatedSubcategory.restaurant.id,
          name: updatedSubcategory.restaurant.name
        },
        createdAt: updatedSubcategory.createdAt,
        updatedAt: updatedSubcategory.updatedAt
      };

      // 10. Respuesta exitosa
      res.status(200).json({
        status: 'success',
        message: 'Subcategoría actualizada exitosamente',
        data: {
          subcategory: formattedSubcategory,
          updatedFields: Object.keys(updateData)
        }
      });

    } catch (error) {
      // Manejar error de restricción única (P2002)
      if (error.code === 'P2002') {
        return res.status(409).json({
          status: 'error',
          message: 'Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante',
          code: 'DUPLICATE_SUBCATEGORY',
          details: {
            subcategoryId: subcategoryIdNum,
            attemptedName: name ? name.trim() : existingSubcategory.name,
            categoryId: categoryId ? parseInt(categoryId) : existingSubcategory.categoryId
          }
        });
      }
      
      // Re-lanzar el error para que sea manejado por el catch externo
      throw error;
    }

  } catch (error) {
    console.error('Error actualizando subcategoría:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Elimina una subcategoría del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteSubcategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subcategoryId } = req.params;

    // Convertir subcategoryId a número
    const subcategoryIdNum = parseInt(subcategoryId);

    // 1. Obtener información del usuario y sus roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurant_id del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = userRestaurantAssignment.restaurantId;

    // 4. Buscar la subcategoría existente
    const existingSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum },
      select: {
        id: true,
        name: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingSubcategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Subcategoría no encontrada',
        code: 'SUBCATEGORY_NOT_FOUND'
      });
    }

    // 5. Verificar autorización: la subcategoría debe pertenecer al restaurante del usuario
    if (existingSubcategory.restaurantId !== restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar esta subcategoría',
        code: 'FORBIDDEN',
        details: {
          subcategoryId: subcategoryIdNum,
          restaurantId: existingSubcategory.restaurantId,
          restaurantName: existingSubcategory.restaurant.name
        }
      });
    }

    // 6. Verificar si la subcategoría tiene productos asociados
    const productsCount = await prisma.product.count({
      where: {
        subcategoryId: subcategoryIdNum
      }
    });

    if (productsCount > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar la subcategoría porque todavía contiene productos',
        code: 'SUBCATEGORY_HAS_PRODUCTS',
        details: {
          subcategoryId: subcategoryIdNum,
          subcategoryName: existingSubcategory.name,
          productsCount: productsCount,
          suggestion: 'Mueva o elimine los productos primero antes de eliminar la subcategoría'
        }
      });
    }

    // 7. Eliminar la subcategoría
    await prisma.subcategory.delete({
      where: { id: subcategoryIdNum }
    });

    // 8. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Subcategoría eliminada exitosamente',
      data: {
        deletedSubcategory: {
          id: existingSubcategory.id,
          name: existingSubcategory.name,
          categoryName: existingSubcategory.category.name,
          restaurantName: existingSubcategory.restaurant.name
        }
      }
    });

  } catch (error) {
    console.error('Error eliminando subcategoría:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Obtiene la lista de productos del restaurante para el panel de administración
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantProducts = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subcategoryId, isAvailable, page = 1, pageSize = 20 } = req.query;

    // Validar parámetros de paginación
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);

    if (pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Parámetros de paginación inválidos',
        details: {
          page: 'Debe ser un número mayor a 0',
          pageSize: 'Debe ser un número entre 1 y 100'
        }
      });
    }

    // 1. Obtener información del usuario y sus roles
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

    // 2. Verificar que el usuario tenga roles de restaurante (owner o branch_manager)
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de restaurante',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: restaurantRoles,
        current: userRoles
      });
    }

    // 3. Obtener los restaurant_ids del usuario
    const userRestaurantIds = userWithRoles.userRoleAssignments
      .filter(assignment => restaurantRoles.includes(assignment.role.name))
      .map(assignment => assignment.restaurantId)
      .filter(id => id !== null);

    if (userRestaurantIds.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontraron restaurantes asignados para este usuario',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    // 4. Construir filtros para la consulta
    const whereClause = {
      restaurantId: { in: userRestaurantIds }
    };

    // Filtro opcional por subcategoría
    if (subcategoryId !== undefined) {
      const subcategoryIdNum = parseInt(subcategoryId);
      
      // Verificar que la subcategoría pertenezca a uno de los restaurantes del usuario
      const subcategory = await prisma.subcategory.findFirst({
        where: {
          id: subcategoryIdNum,
          restaurantId: { in: userRestaurantIds }
        }
      });

      if (!subcategory) {
        return res.status(404).json({
          status: 'error',
          message: 'Subcategoría no encontrada o no pertenece a tu restaurante',
          code: 'SUBCATEGORY_NOT_FOUND'
        });
      }

      whereClause.subcategoryId = subcategoryIdNum;
    }

    // Filtro opcional por disponibilidad
    if (isAvailable !== undefined) {
      whereClause.isAvailable = isAvailable === 'true';
    }

    // 5. Calcular offset para paginación
    const offset = (pageNum - 1) * pageSizeNum;

    // 6. Obtener productos con filtros y paginación
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          subcategory: {
            select: {
              id: true,
              name: true,
              displayOrder: true,
              category: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { subcategory: { displayOrder: 'asc' } },
          { name: 'asc' }
        ],
        skip: offset,
        take: pageSizeNum
      }),
      prisma.product.count({
        where: whereClause
      })
    ]);

    // 7. Calcular información de paginación
    const totalPages = Math.ceil(totalCount / pageSizeNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // 8. Formatear respuesta
    const formattedProducts = products.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
      price: Number(product.price),
      isAvailable: product.isAvailable,
      subcategory: {
        id: product.subcategory.id,
        name: product.subcategory.name,
        displayOrder: product.subcategory.displayOrder,
        category: {
          id: product.subcategory.category.id,
          name: product.subcategory.category.name
        }
      },
      restaurant: {
        id: product.restaurant.id,
        name: product.restaurant.name
      },
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    // 9. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Productos obtenidos exitosamente',
      data: {
        products: formattedProducts,
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        },
        filters: {
          restaurantIds: userRestaurantIds,
          subcategoryId: subcategoryId ? parseInt(subcategoryId) : null,
          isAvailable: isAvailable !== undefined ? (isAvailable === 'true') : null
        }
      }
    });

  } catch (error) {
    console.error('Error obteniendo productos del restaurante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Crea un nuevo producto en el menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subcategoryId, name, description, imageUrl, price, isAvailable = true } = req.body;

    // Convertir subcategoryId a número
    const subcategoryIdNum = parseInt(subcategoryId);

    // 1. Buscar la subcategoría y obtener su restaurant_id
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum },
      select: {
        id: true,
        name: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    if (!subcategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Subcategoría no encontrada',
        code: 'SUBCATEGORY_NOT_FOUND'
      });
    }

    // 2. Obtener información de roles del usuario
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 3. Verificar autorización: el usuario debe tener permisos sobre el restaurante de la subcategoría
    const ownerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === subcategory.restaurantId
    );

    const branchManagerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'branch_manager' && assignment.restaurantId === subcategory.restaurantId
    );

    // Si no es owner ni branch_manager del restaurante, denegar acceso
    if (!ownerRole && !branchManagerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para añadir productos a esta subcategoría',
        code: 'FORBIDDEN',
        details: {
          subcategoryId: subcategoryIdNum,
          restaurantId: subcategory.restaurantId,
          restaurantName: subcategory.restaurant.name
        }
      });
    }

    // 4. Crear el producto
    const newProduct = await prisma.product.create({
      data: {
        restaurantId: subcategory.restaurantId,
        subcategoryId: subcategoryIdNum,
        name: name.trim(),
        description: description ? description.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        price: parseFloat(price),
        isAvailable: isAvailable
      },
      include: {
        subcategory: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // 5. Formatear respuesta
    const formattedProduct = {
      id: newProduct.id,
      name: newProduct.name,
      description: newProduct.description,
      imageUrl: newProduct.imageUrl,
      price: Number(newProduct.price),
      isAvailable: newProduct.isAvailable,
      subcategory: {
        id: newProduct.subcategory.id,
        name: newProduct.subcategory.name,
        category: {
          id: newProduct.subcategory.category.id,
          name: newProduct.subcategory.category.name
        }
      },
      restaurant: {
        id: newProduct.restaurant.id,
        name: newProduct.restaurant.name
      },
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt
    };

    // 6. Respuesta exitosa
    res.status(201).json({
      status: 'success',
      message: 'Producto creado exitosamente',
      data: {
        product: formattedProduct
      }
    });

  } catch (error) {
    console.error('Error creando producto:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Actualiza un producto existente del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { subcategoryId, name, description, imageUrl, price, isAvailable } = req.body;

    // Convertir productId a número
    const productIdNum = parseInt(productId);

    // 1. Buscar el producto existente
    const existingProduct = await prisma.product.findUnique({
      where: { id: productIdNum },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        isAvailable: true,
        restaurantId: true,
        subcategoryId: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        status: 'error',
        message: 'Producto no encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // 2. Obtener información de roles del usuario
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 3. Verificar autorización: el usuario debe tener permisos sobre el restaurante del producto
    const ownerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === existingProduct.restaurantId
    );

    const branchManagerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'branch_manager' && assignment.restaurantId === existingProduct.restaurantId
    );

    // Si no es owner ni branch_manager del restaurante, denegar acceso
    if (!ownerRole && !branchManagerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para editar este producto',
        code: 'FORBIDDEN',
        details: {
          productId: productIdNum,
          restaurantId: existingProduct.restaurantId,
          restaurantName: existingProduct.restaurant.name
        }
      });
    }

    // 4. Si se está cambiando la subcategoría, verificar que pertenezca al mismo restaurante
    if (subcategoryId !== undefined) {
      const subcategoryIdNum = parseInt(subcategoryId);
      
      const newSubcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryIdNum },
        select: {
          id: true,
          restaurantId: true,
          name: true
        }
      });

      if (!newSubcategory) {
        return res.status(404).json({
          status: 'error',
          message: 'Subcategoría no encontrada',
          code: 'SUBCATEGORY_NOT_FOUND'
        });
      }

      // Verificar que la nueva subcategoría pertenezca al mismo restaurante
      if (newSubcategory.restaurantId !== existingProduct.restaurantId) {
        return res.status(400).json({
          status: 'error',
          message: 'La subcategoría debe pertenecer al mismo restaurante del producto',
          code: 'INVALID_SUBCATEGORY',
          details: {
            productRestaurantId: existingProduct.restaurantId,
            subcategoryRestaurantId: newSubcategory.restaurantId
          }
        });
      }
    }

    // 5. Preparar los datos de actualización (solo campos enviados)
    const updateData = {};
    
    if (subcategoryId !== undefined) {
      updateData.subcategoryId = parseInt(subcategoryId);
    }
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    
    if (description !== undefined) {
      updateData.description = description ? description.trim() : null;
    }
    
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl ? imageUrl.trim() : null;
    }
    
    if (price !== undefined) {
      updateData.price = parseFloat(price);
    }
    
    if (isAvailable !== undefined) {
      updateData.isAvailable = isAvailable;
    }

    // Si no hay campos para actualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    // 6. Actualizar el producto
    const updatedProduct = await prisma.product.update({
      where: { id: productIdNum },
      data: updateData,
      include: {
        subcategory: {
          select: {
            id: true,
            name: true,
            category: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // 7. Formatear respuesta
    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      imageUrl: updatedProduct.imageUrl,
      price: Number(updatedProduct.price),
      isAvailable: updatedProduct.isAvailable,
      subcategory: {
        id: updatedProduct.subcategory.id,
        name: updatedProduct.subcategory.name,
        category: {
          id: updatedProduct.subcategory.category.id,
          name: updatedProduct.subcategory.category.name
        }
      },
      restaurant: {
        id: updatedProduct.restaurant.id,
        name: updatedProduct.restaurant.name
      },
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt
    };

    // 8. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Producto actualizado exitosamente',
      data: {
        product: formattedProduct,
        updatedFields: Object.keys(updateData)
      }
    });

  } catch (error) {
    console.error('Error actualizando producto:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
    });
  }
};

/**
 * Elimina un producto del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    // Convertir productId a número
    const productIdNum = parseInt(productId);

    // 1. Buscar el producto existente
    const existingProduct = await prisma.product.findUnique({
      where: { id: productIdNum },
      select: {
        id: true,
        name: true,
        restaurantId: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        },
        subcategory: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!existingProduct) {
      return res.status(404).json({
        status: 'error',
        message: 'Producto no encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    // 2. Obtener información de roles del usuario
    const userWithRoles = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userRoleAssignments: {
          select: {
            roleId: true,
            role: {
              select: {
                name: true
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

    // 3. Verificar autorización: el usuario debe tener permisos sobre el restaurante del producto
    const ownerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === existingProduct.restaurantId
    );

    const branchManagerRole = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'branch_manager' && assignment.restaurantId === existingProduct.restaurantId
    );

    // Si no es owner ni branch_manager del restaurante, denegar acceso
    if (!ownerRole && !branchManagerRole) {
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permiso para eliminar este producto',
        code: 'FORBIDDEN',
        details: {
          productId: productIdNum,
          restaurantId: existingProduct.restaurantId,
          restaurantName: existingProduct.restaurant.name
        }
      });
    }

    // 4. Eliminar el producto
    await prisma.product.delete({
      where: { id: productIdNum }
    });

    // 5. Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Producto eliminado exitosamente',
      data: {
        deletedProduct: {
          id: existingProduct.id,
          name: existingProduct.name,
          restaurantId: existingProduct.restaurantId,
          restaurantName: existingProduct.restaurant.name,
          subcategoryName: existingProduct.subcategory.name
        }
      }
    });

  } catch (error) {
    console.error('Error eliminando producto:', error);
    
    // Manejar error de foreign key constraint (si hay pedidos que referencian este producto)
    if (error.code === 'P2003') {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar el producto porque está asociado a pedidos existentes',
        code: 'PRODUCT_IN_USE',
        suggestion: 'Considera marcar el producto como no disponible en lugar de eliminarlo'
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
  getRestaurantOrders,
  updateOrderStatus,
  getRestaurantSubcategories,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
  getRestaurantProducts,
  createProduct,
  updateProduct,
  deleteProduct
};

