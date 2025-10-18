const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../config/socket');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const UserService = require('../services/user.service');
const ResponseService = require('../services/response.service');
const { checkRestaurantAccess, checkRestaurantOwnership, checkBranchAccess } = require('../middleware/restaurantAccess.middleware');
const RestaurantRepository = require('../repositories/restaurant.repository');
const ProductRepository = require('../repositories/product.repository');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Función helper para verificar si un archivo existe físicamente en el servidor
 * @param {string} url - URL del archivo a verificar
 * @param {string} uploadsPath - Ruta base del directorio de uploads
 * @returns {string|null} URL si el archivo existe, null si no existe
 */
const verifyFileExists = (url, uploadsPath) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  
  try {
    // Extraer el nombre del archivo y tipo de la URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const type = urlParts[urlParts.length - 2]; // 'logos' o 'covers'
    
    // Validar que sea una URL de nuestro dominio y tenga formato válido
    if (!url.includes('/uploads/') || !url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      console.warn(`⚠️ URL inválida o no es una imagen: ${url}`);
      return null;
    }
    
    // Construir múltiples rutas posibles del archivo en el servidor
    const possiblePaths = [
      path.join(uploadsPath, type, filename),
      path.join(__dirname, '../public/uploads', type, filename),
      path.join(process.cwd(), 'public/uploads', type, filename)
    ];
    
    // Verificar si el archivo existe físicamente en alguna ruta
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Archivo existe físicamente: ${filename} en ${filePath}`);
        return url;
      }
    }
    
    // Si no se encuentra en ninguna ruta
    console.warn(`🧹 LIMPIANDO URL obsoleta - archivo no existe: ${filename}`);
    console.warn(`📂 Rutas verificadas:`, possiblePaths);
    return null;
  } catch (error) {
    console.error(`❌ Error verificando archivo ${url}:`, error);
    return null;
  }
};

/**
 * Función auxiliar para formatear un objeto order para Socket.io
 * Convierte todos los BigInt a String para evitar errores de serialización
 * @param {Object} order - Objeto del pedido con BigInt
 * @returns {Object} Objeto formateado para Socket.io
 */
const formatOrderForSocket = (order) => {
  return {
    id: order.id.toString(),
    status: order.status,
    subtotal: Number(order.subtotal),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    specialInstructions: order.specialInstructions,
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
    items: order.orderItems ? order.orderItems.map(item => ({
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
    })) : [],
    ...(order.deliveryDriver && {
      driver: {
        id: order.deliveryDriver.id,
        name: `${order.deliveryDriver.name} ${order.deliveryDriver.lastname}`,
        phone: order.deliveryDriver.phone
      }
    })
  };
};

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
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requieren permisos de restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
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
      specialInstructions: order.specialInstructions,
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
    return ResponseService.success(
      res,
      'Pedidos obtenidos exitosamente',
      {
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
    );

  } catch (error) {
    console.error('Error obteniendo pedidos del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
      return ResponseService.badRequest(res, 'ID de pedido inválido', null, 'INVALID_ORDER_ID');
    }

    // 1. Obtener información del usuario y verificar autorización
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager', 'order_manager', 'kitchen_staff'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requieren permisos de restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
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
      return ResponseService.forbidden(
        res, 
        'No se encontraron sucursales asignadas para este usuario',
        'NO_BRANCH_ASSIGNED'
      );
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
      return ResponseService.notFound(
        res, 
        'Pedido no encontrado o no tienes permisos para modificarlo',
        'ORDER_NOT_FOUND'
      );
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

    // 7. Emitir notificación en tiempo real al cliente
    try {
      const io = getIo();
      const customerId = updatedOrder.customer.id;
      const formattedOrder = formatOrderForSocket(updatedOrder);
      
      io.to(`user_${customerId}`).emit('order_status_update', {
        order: formattedOrder,
        orderId: formattedOrder.id,
        status: formattedOrder.status,
        previousStatus: existingOrder.status,
        updatedAt: formattedOrder.updatedAt,
        message: `Tu pedido #${formattedOrder.id} ha cambiado de estado a: ${status}`
      });
      console.log(`📢 Notificación enviada al cliente ${customerId} sobre actualización del pedido ${formattedOrder.id}`);
    } catch (socketError) {
      console.error('Error enviando notificación Socket.io:', socketError);
      // No fallar la respuesta por error de socket
    }

    // 8. Notificar a repartidores cuando el pedido esté listo para recogida
    if (status === 'ready_for_pickup') {
      try {
        const io = getIo();
        const formattedOrder = formatOrderForSocket(updatedOrder);
        
        io.to('drivers_channel').emit('new_order_available', {
          order: formattedOrder,
          orderId: formattedOrder.id,
          status: formattedOrder.status,
          restaurant: {
            id: updatedOrder.branch.restaurant.id,
            name: updatedOrder.branch.restaurant.name
          },
          branch: {
            id: updatedOrder.branch.id,
            name: updatedOrder.branch.name
          },
          customer: {
            id: updatedOrder.customer.id,
            name: updatedOrder.customer.name,
            lastname: updatedOrder.customer.lastname
          },
          address: {
            id: updatedOrder.address.id,
            alias: updatedOrder.address.alias,
            fullAddress: `${updatedOrder.address.street} ${updatedOrder.address.exteriorNumber}${updatedOrder.address.interiorNumber ? ' Int. ' + updatedOrder.address.interiorNumber : ''}, ${updatedOrder.address.neighborhood}, ${updatedOrder.address.city}, ${updatedOrder.address.state} ${updatedOrder.address.zipCode}`,
            references: updatedOrder.address.references
          },
          total: Number(updatedOrder.total),
          deliveryFee: Number(updatedOrder.deliveryFee),
          specialInstructions: updatedOrder.specialInstructions,
          message: `Nuevo pedido #${formattedOrder.id} listo para recogida en ${updatedOrder.branch.name}`,
          createdAt: new Date().toISOString()
        });
        console.log(`🚚 Notificación enviada a todos los repartidores sobre nuevo pedido ${formattedOrder.id} listo para recogida`);
      } catch (socketError) {
        console.error('Error enviando notificación a repartidores:', socketError);
        // No fallar la respuesta por error de socket
      }
    }

    // 9. Respuesta exitosa
    return ResponseService.success(
      res,
      'Estado del pedido actualizado exitosamente',
      {
        order: formattedOrder,
        previousStatus: existingOrder.status,
        newStatus: status,
        updatedBy: {
          userId: userId,
          roles: userRoles
        }
      }
    );

  } catch (error) {
    console.error('Error actualizando estado del pedido:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
      return ResponseService.badRequest(
        res, 
        'Parámetros de paginación inválidos',
        {
          page: 'Debe ser un número mayor a 0',
          pageSize: 'Debe ser un número entre 1 y 100'
        }
      );
    }

    // 1. Obtener información del usuario y sus roles
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requieren permisos de restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
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
        return ResponseService.notFound(
          res, 
          'Categoría no encontrada',
          'CATEGORY_NOT_FOUND'
        );
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
    return ResponseService.success(
      res,
      'Subcategorías obtenidas exitosamente',
      {
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
    );

  } catch (error) {
    console.error('Error obteniendo subcategorías del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante (owner o branch_manager)
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requieren permisos de restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    // 3. Obtener el restaurant_id del usuario
    const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
      assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
    );

    if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
      return ResponseService.forbidden(
        res, 
        'No se encontró un restaurante asignado para este usuario',
        'NO_RESTAURANT_ASSIGNED'
      );
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
      return ResponseService.notFound(
        res, 
        'Categoría no encontrada',
        'CATEGORY_NOT_FOUND'
      );
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
      return ResponseService.success(
        res,
        'Subcategoría creada exitosamente',
        {
          subcategory: formattedSubcategory
        },
        201
      );

    } catch (error) {
      // Manejar error de restricción única (P2002)
      if (error.code === 'P2002') {
        return ResponseService.conflict(
          res,
          'Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante',
          {
            categoryId: categoryIdNum,
            categoryName: category.name,
            subcategoryName: name.trim()
          },
          'DUPLICATE_SUBCATEGORY'
        );
      }
      
      // Re-lanzar el error para que sea manejado por el catch externo
      throw error;
    }

  } catch (error) {
    console.error('Error creando subcategoría:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requieren permisos de restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
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
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tenga roles de restaurante
    const restaurantRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

    if (!hasRestaurantRole) {
      return ResponseService.forbidden(
        res, 
        'Acceso denegado. Se requieren permisos de restaurante',
        'INSUFFICIENT_PERMISSIONS'
      );
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
    return ResponseService.success(
      res,
      'Subcategoría eliminada exitosamente',
      {
        deletedSubcategory: {
          id: existingSubcategory.id,
          name: existingSubcategory.name,
          categoryName: existingSubcategory.category.name,
          restaurantName: existingSubcategory.restaurant.name
        }
      }
    );

  } catch (error) {
    console.error('Error eliminando subcategoría:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
      return ResponseService.badRequest(
        res, 
        'Parámetros de paginación inválidos',
        {
          page: 'Debe ser un número mayor a 0',
          pageSize: 'Debe ser un número entre 1 y 100'
        }
      );
    }

    // 1. Obtener información del usuario y sus roles
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
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
    return ResponseService.success(
      res,
      'Productos obtenidos exitosamente',
      {
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
    );

  } catch (error) {
    console.error('Error obteniendo productos del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
    const { modifierGroupIds = [], ...productData } = req.body;

    // Crear el producto usando el repositorio con toda la lógica de negocio
    const newProduct = await ProductRepository.create(
      productData, 
      modifierGroupIds, 
      userId, 
      req.id
    );

    // Obtener grupos de modificadores asociados para formatear la respuesta
    const associatedModifierGroups = await ProductRepository.getAssociatedModifierGroups(newProduct.id);

    // Formatear respuesta
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
      modifierGroups: associatedModifierGroups.map(group => ({
        id: group.id,
        name: group.name,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        options: group.options.map(option => ({
          id: option.id,
          name: option.name,
          price: Number(option.price)
        }))
      })),
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt
    };

    // Respuesta exitosa
    return ResponseService.success(
      res,
      'Producto creado exitosamente',
      {
        product: formattedProduct
      },
      201
    );

  } catch (error) {
    console.error('Error creando producto:', error);
    
    // Manejar errores específicos del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
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
    const { modifierGroupIds = undefined, ...productData } = req.body;

    // Actualizar el producto usando el repositorio con toda la lógica de negocio
    const updatedProduct = await ProductRepository.update(
      productId, 
      productData, 
      modifierGroupIds, 
      userId, 
      req.id
    );

    // Obtener grupos de modificadores asociados para formatear la respuesta
    const associatedModifierGroups = await ProductRepository.getAssociatedModifierGroups(updatedProduct.id);

    // Formatear respuesta completa
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
      modifierGroups: associatedModifierGroups.map(group => ({
        id: group.id,
        name: group.name,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        options: group.options.map(option => ({
          id: option.id,
          name: option.name,
          price: Number(option.price)
        }))
      })),
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt
    };

    // Preparar lista de campos actualizados
    const updatedFields = Object.keys(productData);
    if (modifierGroupIds !== undefined) {
      updatedFields.push('modifierGroupIds');
    }

    // Respuesta exitosa
    return ResponseService.success(
      res,
      'Producto actualizado exitosamente',
      {
        product: formattedProduct,
        updatedFields: updatedFields
      }
    );

  } catch (error) {
    // Manejo de errores específicos del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.details, error.code);
      }
    }
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Elimina un producto del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Eliminar el producto usando el repositorio con toda la lógica de negocio
    const deletedProductInfo = await ProductRepository.delete(productId, userId, req.id);

    // Respuesta exitosa
    return ResponseService.success(
      res,
      'Producto eliminado exitosamente',
      {
        deletedProduct: deletedProductInfo
      },
      200
    );

  } catch (error) {
    // Manejo de errores específicos del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 409) {
        // Error de conflicto - producto en uso
        return res.status(409).json({
          status: 'error',
          message: error.message,
          code: error.code,
          details: error.details,
          suggestion: error.suggestion,
          data: null
        });
      }
    }
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Obtiene el perfil completo del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantProfile = async (req, res) => {
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
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 4. Buscar el restaurante completo en la base de datos
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        },
        branches: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            status: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            name: 'asc'
          }
        },
        _count: {
          select: {
            branches: true,
            subcategories: true,
            products: true
          }
        }
      }
    });

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // 5. Verificar que los archivos de imagen existen físicamente y limpiar URLs obsoletas
    const uploadsPath = path.join(__dirname, '../../public/uploads');
    
    console.log(`🔍 Verificando archivos para restaurante ${restaurant.id} (${restaurant.name})`);
    console.log(`📂 Uploads path: ${uploadsPath}`);
    
    const verifiedLogoUrl = verifyFileExists(restaurant.logoUrl, uploadsPath);
    const verifiedCoverPhotoUrl = verifyFileExists(restaurant.coverPhotoUrl, uploadsPath);
    
    // Determinar si necesitamos limpiar la base de datos
    let needsDbUpdate = false;
    const updateData = {};
    
    if (restaurant.logoUrl && !verifiedLogoUrl) {
      console.log(`🧹 URL de logo obsoleta detectada, limpiando en BD: ${restaurant.logoUrl}`);
      updateData.logoUrl = null;
      needsDbUpdate = true;
    }
    
    if (restaurant.coverPhotoUrl && !verifiedCoverPhotoUrl) {
      console.log(`🧹 URL de cover obsoleta detectada, limpiando en BD: ${restaurant.coverPhotoUrl}`);
      updateData.coverPhotoUrl = null;
      needsDbUpdate = true;
    }
    
    // Actualizar la base de datos si es necesario
    if (needsDbUpdate) {
      try {
        await prisma.restaurant.update({
          where: { id: restaurant.id },
          data: updateData
        });
        console.log(`✅ Base de datos actualizada para restaurante ${restaurant.id}`);
      } catch (error) {
        console.error(`❌ Error actualizando BD para restaurante ${restaurant.id}:`, error);
      }
    }
    
    // Log para debugging
    console.log('🔍 Resultado de verificación de archivos:', {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      originalLogoUrl: restaurant.logoUrl,
      verifiedLogoUrl: verifiedLogoUrl,
      originalCoverPhotoUrl: restaurant.coverPhotoUrl,
      verifiedCoverPhotoUrl: verifiedCoverPhotoUrl,
      databaseUpdated: needsDbUpdate
    });

    // 6. Formatear respuesta
    const formattedRestaurant = {
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      logoUrl: verifiedLogoUrl,
      coverPhotoUrl: verifiedCoverPhotoUrl,
      phone: restaurant.phone,
      email: restaurant.email,
      address: restaurant.address,
      status: restaurant.status,
      owner: {
        id: restaurant.owner.id,
        name: restaurant.owner.name,
        lastname: restaurant.owner.lastname,
        email: restaurant.owner.email,
        phone: restaurant.owner.phone
      },
      branches: restaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        status: branch.status,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt
      })),
      statistics: {
        totalBranches: restaurant._count.branches,
        totalSubcategories: restaurant._count.subcategories,
        totalProducts: restaurant._count.products
      },
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt
    };

    // 7. Respuesta exitosa
    return ResponseService.success(
      res,
      'Perfil del restaurante obtenido exitosamente',
      {
        restaurant: formattedRestaurant
      }
    );

  } catch (error) {
    console.error('Error obteniendo perfil del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualiza la información del restaurante del dueño autenticado
 * REFACTORIZADO: Ahora usa middleware de control de acceso
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateRestaurantProfile = async (req, res) => {
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
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 4. Verificar que el restaurante existe
    const existingRestaurant = await RestaurantRepository.findById(restaurantId);

    if (!existingRestaurant) {
      return ResponseService.notFound(
        res, 
        'Restaurante no encontrado',
        'RESTAURANT_NOT_FOUND'
      );
    }

    // 5. El body ya fue validado por Zod - obtener datos limpios
    const dataToUpdate = req.body;

    // Si no hay campos para actualizar
    if (Object.keys(dataToUpdate).length === 0) {
      return ResponseService.badRequest(
        res, 
        'No se proporcionaron campos para actualizar',
        'NO_FIELDS_TO_UPDATE'
      );
    }

    // 6. Usar el Repositorio para actualizar
    const updatedRestaurant = await RestaurantRepository.updateProfile(restaurantId, dataToUpdate);

    // 7. Formatear respuesta
    const formattedRestaurant = {
      id: updatedRestaurant.id,
      name: updatedRestaurant.name,
      description: updatedRestaurant.description,
      logoUrl: updatedRestaurant.logoUrl,
      coverPhotoUrl: updatedRestaurant.coverPhotoUrl,
      phone: updatedRestaurant.phone,
      email: updatedRestaurant.email,
      address: updatedRestaurant.address,
      status: updatedRestaurant.status,
      owner: {
        id: updatedRestaurant.owner.id,
        name: updatedRestaurant.owner.name,
        lastname: updatedRestaurant.owner.lastname,
        email: updatedRestaurant.owner.email,
        phone: updatedRestaurant.owner.phone
      },
      branches: updatedRestaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        status: branch.status,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt
      })),
      statistics: {
        totalBranches: updatedRestaurant._count.branches,
        totalSubcategories: updatedRestaurant._count.subcategories,
        totalProducts: updatedRestaurant._count.products
      },
      createdAt: updatedRestaurant.createdAt,
      updatedAt: updatedRestaurant.updatedAt
    };

    // 8. Respuesta exitosa
    return ResponseService.success(
      res,
      'Información del restaurante actualizada exitosamente',
      {
        restaurant: formattedRestaurant,
        updatedFields: Object.keys(dataToUpdate),
        updatedBy: {
          userId: userId,
          userName: `${req.user.name} ${req.user.lastname}`
        }
      }
    );

  } catch (error) {
    console.error('Error actualizando información del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Crear una nueva sucursal para el restaurante del dueño autenticado
 * REFACTORIZADO: Ahora usa middleware de control de acceso
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createBranch = async (req, res) => {
  try {
    const userId = req.user.id;
    const restaurantId = req.params.restaurantId;
    const { 
      name, 
      address, 
      latitude, 
      longitude, 
      phone, 
      openingTime, 
      closingTime, 
      usesPlatformDrivers 
    } = req.body;

    // 4. Verificar que el restaurante existe y está activo
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        status: true
      }
    });

    if (!existingRestaurant) {
      return ResponseService.notFound(
        res, 
        'Restaurante no encontrado',
        'RESTAURANT_NOT_FOUND'
      );
    }

    if (existingRestaurant.status !== 'active') {
      return ResponseService.forbidden(
        res, 
        'No se pueden crear sucursales para un restaurante inactivo',
        'RESTAURANT_INACTIVE'
      );
    }

    // 5. Verificar que no existe otra sucursal con el mismo nombre en el restaurante
    const existingBranch = await prisma.branch.findFirst({
      where: {
        restaurantId: restaurantId,
        name: name.trim(),
        status: 'active'
      },
      select: {
        id: true,
        name: true
      }
    });

    if (existingBranch) {
      return ResponseService.conflict(
        res, 
        'Ya existe una sucursal con este nombre en el restaurante',
        {
          existingBranch: {
            id: existingBranch.id,
            name: existingBranch.name
          }
        },
        'BRANCH_NAME_EXISTS'
      );
    }

    // 6. Preparar los datos para crear la sucursal
    const branchData = {
      restaurantId: restaurantId,
      name: name.trim(),
      address: address.trim(),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      status: 'active'
    };

    // Campos opcionales
    if (phone !== undefined && phone !== null && phone.trim() !== '') {
      branchData.phone = phone.trim();
    }

    if (openingTime !== undefined && openingTime !== null) {
      branchData.openingTime = new Date(`1970-01-01T${openingTime}`);
    }

    if (closingTime !== undefined && closingTime !== null) {
      branchData.closingTime = new Date(`1970-01-01T${closingTime}`);
    }

    if (usesPlatformDrivers !== undefined) {
      branchData.usesPlatformDrivers = Boolean(usesPlatformDrivers);
    }

    // 7. Crear la nueva sucursal
    const newBranch = await prisma.branch.create({
      data: branchData,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    // 8. Formatear respuesta
    const formattedBranch = {
      id: newBranch.id,
      name: newBranch.name,
      address: newBranch.address,
      coordinates: {
        latitude: Number(newBranch.latitude),
        longitude: Number(newBranch.longitude)
      },
      phone: newBranch.phone,
      openingTime: newBranch.openingTime ? newBranch.openingTime.toTimeString().slice(0, 8) : null,
      closingTime: newBranch.closingTime ? newBranch.closingTime.toTimeString().slice(0, 8) : null,
      usesPlatformDrivers: newBranch.usesPlatformDrivers,
      status: newBranch.status,
      restaurant: {
        id: newBranch.restaurant.id,
        name: newBranch.restaurant.name,
        status: newBranch.restaurant.status
      },
      createdAt: newBranch.createdAt,
      updatedAt: newBranch.updatedAt
    };

    // 9. Respuesta exitosa
    res.status(201).json({
      status: 'success',
      message: 'Sucursal creada exitosamente',
      data: {
        branch: formattedBranch,
        createdBy: {
          userId: userId,
          userName: `${userWithRoles.name} ${userWithRoles.lastname}`
        }
      }
    });

  } catch (error) {
    console.error('Error creando sucursal:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Ya existe una sucursal con este nombre en el restaurante',
        code: 'DUPLICATE_BRANCH_NAME'
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        status: 'error',
        message: 'Referencia de restaurante inválida',
        code: 'INVALID_RESTAURANT_REFERENCE'
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
 * Obtener todas las sucursales del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantBranches = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, pageSize = 20 } = req.query;

    // Validar parámetros de paginación
    const pageNum = parseInt(page);
    const pageSizeNum = parseInt(pageSize);
    
    if (pageNum < 1 || pageSizeNum < 1 || pageSizeNum > 100) {
      return ResponseService.badRequest(
        res, 
        'Parámetros de paginación inválidos',
        {
          page: 'Debe ser un número mayor a 0',
          pageSize: 'Debe ser un número entre 1 y 100'
        }
      );
    }

    // Validar status si se proporciona
    const validStatuses = ['active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return ResponseService.badRequest(
        res, 
        'Estado de sucursal inválido',
        { validStatuses: validStatuses }
      );
    }

    // 1. Obtener información del usuario y verificar que es owner
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

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 4. Verificar que el restaurante existe
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        status: true
      }
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // 5. Construir filtros para la consulta
    const whereClause = {
      restaurantId: restaurantId
    };

    // Añadir filtro por status si se proporciona
    if (status) {
      whereClause.status = status;
    }

    // 6. Obtener el total de sucursales para la paginación
    const totalBranches = await prisma.branch.count({
      where: whereClause
    });

    // 7. Calcular información de paginación
    const totalPages = Math.ceil(totalBranches / pageSizeNum);
    const skip = (pageNum - 1) * pageSizeNum;

    // 8. Obtener las sucursales con paginación
    const branches = await prisma.branch.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        address: true,
        latitude: true,
        longitude: true,
        phone: true,
        usesPlatformDrivers: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            orders: true,
            userRoleAssignments: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // Primero las activas
        { name: 'asc' }
      ],
      skip: skip,
      take: pageSizeNum
    });

    // 9. Formatear las sucursales
    const formattedBranches = branches.map(branch => ({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      coordinates: {
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude)
      },
      phone: branch.phone,
      usesPlatformDrivers: branch.usesPlatformDrivers,
      status: branch.status,
      statistics: {
        totalOrders: branch._count.orders,
        totalStaff: branch._count.userRoleAssignments
      },
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt
    }));

    // 10. Respuesta exitosa
    return ResponseService.success(
      res,
      'Sucursales obtenidas exitosamente',
      {
        branches: formattedBranches,
        restaurant: {
          id: existingRestaurant.id,
          name: existingRestaurant.name,
          status: existingRestaurant.status
        },
        pagination: {
          currentPage: pageNum,
          pageSize: pageSizeNum,
          totalBranches: totalBranches,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: {
          status: status || 'all'
        },
        requestedBy: {
          userId: userId,
          userName: `${userWithRoles.name} ${userWithRoles.lastname}`
        }
      }
    );

  } catch (error) {
    console.error('Error obteniendo sucursales del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualizar una sucursal existente del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateBranch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { branchId } = req.params;
    const { 
      name, 
      address, 
      latitude, 
      longitude, 
      phone, 
      openingTime, 
      closingTime, 
      usesPlatformDrivers 
    } = req.body;

    // Convertir branchId a número
    const branchIdNum = parseInt(branchId);

    // 1. Obtener información del usuario y verificar que es owner
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

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 4. AUTORIZACIÓN DE PERTENENCIA - Buscar la sucursal específica del owner
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id: branchIdNum,
        restaurantId: restaurantId // ✅ CRÍTICO: Solo sucursales del restaurante del owner
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    // 5. Verificar si la sucursal existe y pertenece al owner
    if (!existingBranch) {
      return res.status(404).json({
        status: 'error',
        message: 'Sucursal no encontrada o no tienes permisos para editarla',
        code: 'BRANCH_NOT_FOUND_OR_NO_PERMISSION',
        details: {
          branchId: branchIdNum,
          restaurantId: restaurantId,
          possibleReasons: [
            'La sucursal no existe',
            'La sucursal no pertenece a tu restaurante',
            'No tienes permisos para editarla'
          ]
        }
      });
    }

    // 6. Preparar los datos de actualización (solo campos enviados)
    const updateData = {};

    if (name !== undefined) {
      // Verificar que no existe otra sucursal con el mismo nombre en el restaurante
      if (name.trim() !== existingBranch.name) {
        const duplicateBranch = await prisma.branch.findFirst({
          where: {
            restaurantId: restaurantId,
            name: name.trim(),
            status: 'active',
            id: {
              not: branchIdNum // Excluir la sucursal actual
            }
          },
          select: {
            id: true,
            name: true
          }
        });

        if (duplicateBranch) {
          return res.status(409).json({
            status: 'error',
            message: 'Ya existe otra sucursal con este nombre en el restaurante',
            code: 'BRANCH_NAME_EXISTS',
            details: {
              existingBranch: {
                id: duplicateBranch.id,
                name: duplicateBranch.name
              }
            }
          });
        }
      }
      updateData.name = name.trim();
    }

    if (address !== undefined) {
      updateData.address = address.trim();
    }

    if (latitude !== undefined) {
      updateData.latitude = parseFloat(latitude);
    }

    if (longitude !== undefined) {
      updateData.longitude = parseFloat(longitude);
    }

    if (phone !== undefined) {
      if (phone === null || phone.trim() === '') {
        updateData.phone = null;
      } else {
        updateData.phone = phone.trim();
      }
    }

    if (openingTime !== undefined) {
      if (openingTime === null || openingTime.trim() === '') {
        updateData.openingTime = null;
      } else {
        updateData.openingTime = new Date(`1970-01-01T${openingTime}`);
      }
    }

    if (closingTime !== undefined) {
      if (closingTime === null || closingTime.trim() === '') {
        updateData.closingTime = null;
      } else {
        updateData.closingTime = new Date(`1970-01-01T${closingTime}`);
      }
    }

    if (usesPlatformDrivers !== undefined) {
      updateData.usesPlatformDrivers = Boolean(usesPlatformDrivers);
    }

    // Si no hay campos para actualizar
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron campos para actualizar',
        code: 'NO_FIELDS_TO_UPDATE'
      });
    }

    // 7. Actualizar la sucursal
    const updatedBranch = await prisma.branch.update({
      where: {
        id: branchIdNum
      },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        _count: {
          select: {
            orders: true,
            userRoleAssignments: true
          }
        }
      }
    });

    // 8. Formatear respuesta
    const formattedBranch = {
      id: updatedBranch.id,
      name: updatedBranch.name,
      address: updatedBranch.address,
      coordinates: {
        latitude: Number(updatedBranch.latitude),
        longitude: Number(updatedBranch.longitude)
      },
      phone: updatedBranch.phone,
      openingTime: updatedBranch.openingTime ? updatedBranch.openingTime.toTimeString().slice(0, 8) : null,
      closingTime: updatedBranch.closingTime ? updatedBranch.closingTime.toTimeString().slice(0, 8) : null,
      usesPlatformDrivers: updatedBranch.usesPlatformDrivers,
      status: updatedBranch.status,
      restaurant: {
        id: updatedBranch.restaurant.id,
        name: updatedBranch.restaurant.name,
        status: updatedBranch.restaurant.status
      },
      statistics: {
        totalOrders: updatedBranch._count.orders,
        totalStaff: updatedBranch._count.userRoleAssignments
      },
      createdAt: updatedBranch.createdAt,
      updatedAt: updatedBranch.updatedAt
    };

    // 9. Respuesta exitosa
    return ResponseService.success(
      res,
      'Sucursal actualizada exitosamente',
      {
        branch: formattedBranch,
        updatedFields: Object.keys(updateData),
        updatedBy: {
          userId: userId,
          userName: `${userWithRoles.name} ${userWithRoles.lastname}`
        }
      }
    );

  } catch (error) {
    console.error('Error actualizando sucursal:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2025') {
      return ResponseService.notFound(
        res, 
        'Sucursal no encontrada',
        'BRANCH_NOT_FOUND'
      );
    }

    if (error.code === 'P2002') {
      return ResponseService.conflict(
        res, 
        'Ya existe una sucursal con este nombre en el restaurante',
        'DUPLICATE_BRANCH_NAME'
      );
    }

    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Eliminar una sucursal existente del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteBranch = async (req, res) => {
  try {
    const userId = req.user.id;
    const { branchId } = req.params;

    // Convertir branchId a número
    const branchIdNum = parseInt(branchId);

    // 1. Obtener información del usuario y verificar que es owner
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

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 4. AUTORIZACIÓN DE PERTENENCIA - Buscar la sucursal específica del owner
    const existingBranch = await prisma.branch.findFirst({
      where: {
        id: branchIdNum,
        restaurantId: restaurantId // ✅ CRÍTICO: Solo sucursales del restaurante del owner
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        _count: {
          select: {
            orders: true,
            userRoleAssignments: true
          }
        }
      }
    });

    // 5. Verificar si la sucursal existe y pertenece al owner
    if (!existingBranch) {
      return res.status(404).json({
        status: 'error',
        message: 'Sucursal no encontrada o no tienes permisos para eliminarla',
        code: 'BRANCH_NOT_FOUND_OR_NO_PERMISSION',
        details: {
          branchId: branchIdNum,
          restaurantId: restaurantId,
          possibleReasons: [
            'La sucursal no existe',
            'La sucursal no pertenece a tu restaurante',
            'No tienes permisos para eliminarla'
          ]
        }
      });
    }

    // 6. VALIDACIÓN DE CONTENIDO - Verificar si existen pedidos asociados
    if (existingBranch._count.orders > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar la sucursal porque tiene pedidos asociados. Considera desactivarla en su lugar.',
        code: 'BRANCH_HAS_ORDERS',
        details: {
          branchId: branchIdNum,
          branchName: existingBranch.name,
          totalOrders: existingBranch._count.orders,
          totalStaff: existingBranch._count.userRoleAssignments,
          suggestion: 'Usa PATCH para cambiar el status a "inactive" en lugar de eliminar'
        }
      });
    }

    // 7. Verificar si hay personal asignado a la sucursal
    if (existingBranch._count.userRoleAssignments > 0) {
      return res.status(409).json({
        status: 'error',
        message: 'No se puede eliminar la sucursal porque tiene personal asignado. Considera desactivarla en su lugar.',
        code: 'BRANCH_HAS_STAFF',
        details: {
          branchId: branchIdNum,
          branchName: existingBranch.name,
          totalStaff: existingBranch._count.userRoleAssignments,
          totalOrders: existingBranch._count.orders,
          suggestion: 'Reasigna el personal a otras sucursales o usa PATCH para cambiar el status a "inactive"'
        }
      });
    }

    // 8. Eliminar la sucursal
    await prisma.branch.delete({
      where: {
        id: branchIdNum
      }
    });

    // 9. Respuesta exitosa
    return ResponseService.success(
      res,
      'Sucursal eliminada exitosamente',
      {
        deletedBranch: {
          id: branchIdNum,
          name: existingBranch.name,
          address: existingBranch.address,
          restaurant: {
            id: existingBranch.restaurant.id,
            name: existingBranch.restaurant.name
          }
        },
        deletedBy: {
          userId: userId,
          userName: `${userWithRoles.name} ${userWithRoles.lastname}`
        },
        deletedAt: new Date().toISOString()
      }
    );

  } catch (error) {
    console.error('Error eliminando sucursal:', error);
    
    // Manejar errores específicos de Prisma
    if (error.code === 'P2025') {
      return ResponseService.notFound(
        res, 
        'Sucursal no encontrada',
        'BRANCH_NOT_FOUND'
      );
    }

    if (error.code === 'P2003') {
      return ResponseService.conflict(
        res, 
        'No se puede eliminar la sucursal porque tiene relaciones activas',
        {
          suggestion: 'Considera desactivar la sucursal en lugar de eliminarla'
        },
        'BRANCH_HAS_ACTIVE_RELATIONS'
      );
    }

    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Obtiene el horario semanal de una sucursal específica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getBranchSchedule = async (req, res) => {
  try {
    const { branchId } = req.params;
    const userId = req.user.id;
    const branchIdNum = parseInt(branchId);

    console.log(`🔍 Consultando horario de sucursal ${branchId} por usuario ${userId}`);

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
        code: 'INSUFFICIENT_PERMISSIONS',
        required: restaurantRoles,
        current: userRoles
      });
    }

    // 3. Verificar que la sucursal existe y obtener información
    const branch = await prisma.branch.findUnique({
      where: { id: branchIdNum },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        status: 'error',
        message: 'Sucursal no encontrada',
        details: {
          branchId: branchId,
          suggestion: 'Verifica que el ID de la sucursal sea correcto'
        }
      });
    }

    // 4. Verificar autorización de acceso a la sucursal
    let hasAccess = false;

    // Verificar si es owner del restaurante
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === branch.restaurantId
    );

    if (ownerAssignment) {
      hasAccess = true;
    } else {
      // Verificar si es branch_manager con acceso específico a esta sucursal
      const branchManagerAssignment = userWithRoles.userRoleAssignments.find(
        assignment => 
          assignment.role.name === 'branch_manager' && 
          assignment.restaurantId === branch.restaurantId &&
          (assignment.branchId === branchIdNum || assignment.branchId === null)
      );

      if (branchManagerAssignment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      console.log(`❌ Usuario ${userId} no tiene permisos para acceder a la sucursal ${branchId}`);
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para acceder a esta sucursal',
        details: {
          branchId: branchId,
          restaurantId: branch.restaurantId,
          suggestion: 'Verifica que tienes permisos de owner o branch_manager para esta sucursal'
        }
      });
    }

    // Consultar horarios de la sucursal
    const schedules = await prisma.branchSchedule.findMany({
      where: {
        branchId: parseInt(branchId)
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    });

    console.log(`✅ Horario de sucursal ${branchId} consultado exitosamente. ${schedules.length} registros encontrados`);

    // Formatear respuesta
    const formattedSchedules = schedules.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      dayName: getDayName(schedule.dayOfWeek),
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime,
      isClosed: schedule.isClosed
    }));

    return ResponseService.success(
      res,
      'Horario de sucursal obtenido exitosamente',
      {
        branch: {
          id: branch.id,
          name: branch.name,
          restaurant: {
            id: branch.restaurant.id,
            name: branch.restaurant.name
          }
        },
        schedules: formattedSchedules
      }
    );

  } catch (error) {
    console.error('❌ Error obteniendo horario de sucursal:', error);

    if (error.code === 'P2025') {
      return ResponseService.notFound(
        res, 
        'Sucursal no encontrada',
        {
          branchId: req.params.branchId,
          suggestion: 'Verifica que el ID de la sucursal sea correcto'
        }
      );
    }

    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualiza el horario semanal completo de una sucursal específica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateBranchSchedule = async (req, res) => {
  try {
    const { branchId } = req.params;
    const userId = req.user.id;
    const branchIdNum = parseInt(branchId);
    const scheduleData = req.body;

    console.log(`🔧 Actualizando horario de sucursal ${branchId} por usuario ${userId}`);

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
        code: 'INSUFFICIENT_PERMISSIONS',
        required: restaurantRoles,
        current: userRoles
      });
    }

    // 3. Verificar que la sucursal existe y obtener información
    const branch = await prisma.branch.findUnique({
      where: { id: branchIdNum },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            ownerId: true
          }
        }
      }
    });

    if (!branch) {
      return res.status(404).json({
        status: 'error',
        message: 'Sucursal no encontrada',
        details: {
          branchId: branchId,
          suggestion: 'Verifica que el ID de la sucursal sea correcto'
        }
      });
    }

    // 4. Verificar autorización de acceso a la sucursal
    let hasAccess = false;

    // Verificar si es owner del restaurante
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === branch.restaurantId
    );

    if (ownerAssignment) {
      hasAccess = true;
    } else {
      // Verificar si es branch_manager con acceso específico a esta sucursal
      const branchManagerAssignment = userWithRoles.userRoleAssignments.find(
        assignment => 
          assignment.role.name === 'branch_manager' && 
          assignment.restaurantId === branch.restaurantId &&
          (assignment.branchId === branchIdNum || assignment.branchId === null)
      );

      if (branchManagerAssignment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      console.log(`❌ Usuario ${userId} no tiene permisos para actualizar la sucursal ${branchId}`);
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para actualizar esta sucursal',
        details: {
          branchId: branchId,
          restaurantId: branch.restaurantId,
          suggestion: 'Verifica que tienes permisos de owner o branch_manager para esta sucursal'
        }
      });
    }

    // 5. Validar horarios lógicos (openingTime < closingTime cuando no está cerrado)
    for (const scheduleItem of scheduleData) {
      if (!scheduleItem.isClosed) {
        const openingTime = new Date(`1970-01-01T${scheduleItem.openingTime}`);
        const closingTime = new Date(`1970-01-01T${scheduleItem.closingTime}`);
        
        if (openingTime >= closingTime) {
          return res.status(400).json({
            status: 'error',
            message: 'Horario inválido',
            details: {
              dayOfWeek: scheduleItem.dayOfWeek,
              dayName: getDayName(scheduleItem.dayOfWeek),
              error: 'La hora de apertura debe ser anterior a la hora de cierre'
            }
          });
        }
      }
    }

    // 6. Actualización transaccional del horario
    const result = await prisma.$transaction(async (tx) => {
      // Eliminar todos los horarios existentes de la sucursal
      await tx.branchSchedule.deleteMany({
        where: {
          branchId: branchIdNum
        }
      });

      // Crear los nuevos horarios
      const newSchedules = scheduleData.map(item => ({
        branchId: branchIdNum,
        dayOfWeek: item.dayOfWeek,
        openingTime: item.openingTime,
        closingTime: item.closingTime,
        isClosed: item.isClosed
      }));

      const createdSchedules = await tx.branchSchedule.createMany({
        data: newSchedules
      });

      return createdSchedules;
    });

    console.log(`✅ Horario de sucursal ${branchId} actualizado exitosamente. ${result.count} registros creados`);

    // 7. Obtener el horario actualizado para la respuesta
    const updatedSchedules = await prisma.branchSchedule.findMany({
      where: {
        branchId: branchIdNum
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    });

    // 8. Formatear respuesta
    const formattedSchedules = updatedSchedules.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      dayName: getDayName(schedule.dayOfWeek),
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime,
      isClosed: schedule.isClosed
    }));

    return ResponseService.success(
      res,
      'Horario de sucursal actualizado exitosamente',
      {
        branch: {
          id: branch.id,
          name: branch.name,
          restaurant: {
            id: branch.restaurant.id,
            name: branch.restaurant.name
          }
        },
        schedules: formattedSchedules
      }
    );

  } catch (error) {
    console.error('❌ Error actualizando horario de sucursal:', error);

    if (error.code === 'P2025') {
      return ResponseService.notFound(
        res, 
        'Sucursal no encontrada',
        {
          branchId: req.params.branchId,
          suggestion: 'Verifica que el ID de la sucursal sea correcto'
        }
      );
    }

    if (error.code === 'P2002') {
      return ResponseService.badRequest(
        res, 
        'Conflicto de datos',
        {
          suggestion: 'Ya existe un horario para este día de la semana en esta sucursal'
        }
      );
    }

    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Rechaza un pedido confirmado y procesa reembolso automático
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const rejectOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;
    const orderIdNum = parseInt(orderId);

    console.log(`🚫 Procesando rechazo de pedido ${orderId} por usuario ${userId}`);

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
    const restaurantRoles = ['owner', 'branch_manager', 'order_manager'];
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

    // 3. Buscar el pedido y verificar autorización
    const order = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: {
        payment: true,
        customer: true,
        branch: {
          include: {
            restaurant: true
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Pedido no encontrado',
        details: {
          orderId: orderId,
          suggestion: 'Verifica que el ID del pedido sea correcto'
        }
      });
    }

    // --- DATOS DE DEPURACIÓN DE REEMBOLSO ---
    console.log('--- DATOS DE DEPURACIÓN DE REEMBOLSO ---');
    console.log('ID de Pedido a Rechazar:', order.id);
    console.log('Payment ID en la BD:', order.payment.id);
    console.log('Provider Payment ID que se usará para el reembolso:', order.payment.providerPaymentId);
    console.log('-----------------------------------------');

    // 4. Verificar que el pedido pertenece a una sucursal del usuario
    let hasAccess = false;

    // Verificar si es owner del restaurante
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === order.branch.restaurantId
    );

    if (ownerAssignment) {
      hasAccess = true;
    } else {
      // Verificar si es branch_manager u order_manager con acceso a esta sucursal
      const managerAssignment = userWithRoles.userRoleAssignments.find(
        assignment => 
          (assignment.role.name === 'branch_manager' || assignment.role.name === 'order_manager') &&
          assignment.restaurantId === order.branch.restaurantId &&
          (assignment.branchId === order.branchId || assignment.branchId === null)
      );

      if (managerAssignment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      console.log(`❌ Usuario ${userId} no tiene permisos para rechazar el pedido ${orderId}`);
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para rechazar este pedido',
        details: {
          orderId: orderId,
          restaurantId: order.branch.restaurantId,
          suggestion: 'Verifica que tienes permisos para esta sucursal'
        }
      });
    }

    // 5. Verificar que el pedido está en estado 'confirmed'
    if (order.status !== 'confirmed') {
      return res.status(400).json({
        status: 'error',
        message: 'Solo se pueden rechazar pedidos confirmados',
        details: {
          currentStatus: order.status,
          validStatuses: ['confirmed']
        }
      });
    }

    // 6. Verificar que el pago existe y está aprobado
    if (!order.payment || order.payment.status !== 'approved') {
      return res.status(400).json({
        status: 'error',
        message: 'No se puede procesar reembolso para este pedido',
        details: {
          reason: 'El pago no está aprobado o no existe'
        }
      });
    }

    // 7. Configurar Mercado Pago para reembolso
    const client = new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      options: { timeout: 10000 }
    });
    const payment = new Payment(client);

    console.log(`💳 Iniciando reembolso para pago ${order.payment.providerPaymentId}`);

    // 8. Procesar reembolso en Mercado Pago
    let refundResult;
    try {
      // Obtener el providerPaymentId real (ID numérico del pago en Mercado Pago)
      const mpPaymentId = order.payment.providerPaymentId;
      
      console.log(`🔍 Procesando reembolso para pago ID: ${mpPaymentId}`);
      
      // Procesar reembolso completo usando directamente el ID del pago
      refundResult = await payment.refund({
        id: mpPaymentId,
        body: {
          amount: order.total
        }
      });

      console.log(`✅ Reembolso procesado exitosamente:`, {
        refundId: refundResult.id,
        status: refundResult.status,
        amount: refundResult.amount,
        originalPaymentId: mpPaymentId
      });

    } catch (mpError) {
      // En producción, lanzar el error para detener el proceso
      if (process.env.NODE_ENV === 'production') {
        console.error('❌ Error procesando reembolso en Mercado Pago:', mpError);
        console.error('Detalles del error:', {
          paymentId: order.payment.providerPaymentId,
          amount: order.total,
          error: mpError.message
        });
        
        return res.status(400).json({
          status: 'error',
          message: 'Error procesando reembolso',
          details: {
            error: mpError.message,
            paymentId: order.payment.providerPaymentId,
            suggestion: 'Contacta al soporte técnico si el problema persiste'
          }
        });
      } else {
        // En desarrollo, ignorar el error y continuar como si el reembolso fuera exitoso
        console.warn('⚠️ Fallo en el reembolso de prueba de MP, continuando de todos modos...');
        console.warn('Detalles del error (desarrollo):', {
          paymentId: order.payment.providerPaymentId,
          amount: order.total,
          error: mpError.message
        });
        
        // Simular un resultado de reembolso exitoso para desarrollo
        refundResult = {
          id: `dev_refund_${Date.now()}`,
          status: 'approved',
          amount: order.total
        };
        
        console.log(`🔧 Simulando reembolso exitoso en desarrollo:`, {
          refundId: refundResult.id,
          status: refundResult.status,
          amount: refundResult.amount,
          note: 'Simulado para entorno de desarrollo'
        });
      }
    }

    // 9. Actualización transaccional en la base de datos
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Actualizar el pedido
      const updatedOrder = await tx.order.update({
        where: { id: orderIdNum },
        data: {
          status: 'rejected',
          paymentStatus: 'refunded',
          rejectionReason: reason,
          rejectedAt: new Date()
        },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  restaurant: true
                }
              }
            }
          },
          customer: true,
          address: true,
          branch: {
            include: {
              restaurant: true
            }
          },
          payment: true
        }
      });

      // Actualizar el pago
      await tx.payment.update({
        where: { id: order.payment.id },
        data: {
          status: 'refunded',
          refundId: refundResult.id,
          refundedAt: new Date()
        }
      });

      return updatedOrder;
    });

    console.log(`✅ Pedido ${orderId} rechazado exitosamente y reembolso procesado`);

    // 10. Notificar al cliente por Socket.io
    const io = getIo();
    const customerRoom = `customer_${order.customerId}`;
    
    const notificationData = {
      orderId: updatedOrder.id,
      status: 'rejected',
      message: 'Tu pedido ha sido rechazado y el reembolso ha sido procesado',
      reason: reason,
      refundAmount: order.total,
      refundId: refundResult.id,
      timestamp: new Date().toISOString()
    };

    io.to(customerRoom).emit('order_status_update', notificationData);
    console.log(`📡 Notificación de rechazo enviada a la sala '${customerRoom}'`);

    // 11. Respuesta exitosa
    return ResponseService.success(
      res,
      'Pedido rechazado exitosamente y reembolso procesado',
      {
        order: {
          id: updatedOrder.id,
          status: updatedOrder.status,
          paymentStatus: updatedOrder.paymentStatus,
          rejectionReason: updatedOrder.rejectionReason,
          rejectedAt: updatedOrder.rejectedAt,
          total: updatedOrder.total,
          customer: {
            id: updatedOrder.customer.id,
            name: updatedOrder.customer.name,
            email: updatedOrder.customer.email
          },
          branch: {
            id: updatedOrder.branch.id,
            name: updatedOrder.branch.name,
            restaurant: {
              id: updatedOrder.branch.restaurant.id,
              name: updatedOrder.branch.restaurant.name
            }
          }
        },
        refund: {
          id: refundResult.id,
          status: refundResult.status,
          amount: refundResult.amount
        }
      }
    );

  } catch (error) {
    console.error('❌ Error rechazando pedido:', error);

    if (error.code === 'P2025') {
      return ResponseService.notFound(
        res, 
        'Pedido no encontrado',
        {
          orderId: req.params.orderId,
          suggestion: 'Verifica que el ID del pedido sea correcto'
        }
      );
    }

    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Función auxiliar para obtener el nombre del día de la semana
 * @param {number} dayOfWeek - Número del día (0=Domingo, 1=Lunes, ..., 6=Sábado)
 * @returns {string} Nombre del día
 */
const getDayName = (dayOfWeek) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[dayOfWeek] || 'Día inválido';
};

/**
 * Desactivar todos los productos que contengan una etiqueta específica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deactivateProductsByTag = async (req, res) => {
  try {
    const { tag } = req.body;
    const userId = req.user.id;

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

    // 2. Verificar que el usuario tenga roles de restaurante apropiados
    const allowedRoles = ['owner', 'branch_manager'];
    const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
    const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));

    if (!hasAllowedRole) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requieren permisos de owner o branch_manager',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Determinar el restaurantId del usuario
    let restaurantId = null;
    
    // Si el usuario es owner, obtener su restaurantId
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId
    );

    if (ownerAssignment) {
      restaurantId = ownerAssignment.restaurantId;
    } else {
      // Si es branch_manager, obtener el restaurantId a través de la sucursal
      const branchAssignment = userWithRoles.userRoleAssignments.find(
        assignment => assignment.role.name === 'branch_manager' && assignment.branchId
      );

      if (branchAssignment) {
        const branch = await prisma.branch.findUnique({
          where: { id: branchAssignment.branchId },
          select: { restaurantId: true }
        });

        if (branch) {
          restaurantId = branch.restaurantId;
        }
      }
    }

    if (!restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se pudo determinar el restaurante asociado al usuario',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // 4. Actualizar productos que contengan la etiqueta
    const result = await prisma.product.updateMany({
      where: {
        restaurantId: restaurantId,
        tags: {
          contains: tag
        }
      },
      data: {
        isAvailable: false,
        updatedAt: new Date()
      }
    });

    // 5. Respuesta exitosa
    return ResponseService.success(
      res,
      `Se desactivaron ${result.count} productos que contienen la etiqueta "${tag}"`,
      {
        tag: tag,
        productsUpdated: result.count,
        restaurantId: restaurantId,
        updatedAt: new Date().toISOString()
      }
    );

  } catch (error) {
    console.error('Error desactivando productos por etiqueta:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
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
  deleteProduct,
  getRestaurantProfile,
  updateRestaurantProfile,
  createBranch,
  getRestaurantBranches,
  updateBranch,
  deleteBranch,
  getBranchSchedule,
  updateBranchSchedule,
  rejectOrder,
  formatOrderForSocket,
  deactivateProductsByTag
};

