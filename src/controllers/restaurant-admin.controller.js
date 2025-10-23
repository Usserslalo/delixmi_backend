const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../config/socket');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const UserService = require('../services/user.service');
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');
const { checkRestaurantAccess, checkRestaurantOwnership } = require('../middleware/restaurantAccess.middleware');
const RestaurantRepository = require('../repositories/restaurant.repository');
const ProductRepository = require('../repositories/product.repository');
const SubcategoryRepository = require('../repositories/subcategory.repository');
const EmployeeRepository = require('../repositories/employee.repository');
const OrderRepository = require('../repositories/order.repository');
const fs = require('fs');
const path = require('path');
const { verifyFileExists } = require('../utils/fileVerifier');

const prisma = new PrismaClient();

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
    restaurant: {
      id: order.restaurant.id,
      name: order.restaurant.name
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
 * Obtiene los pedidos de la sucursal principal del restaurante con filtros y paginación
 * REFACTORIZADO: Usa OrderRepository y sigue el modelo "one Owner = one Restaurant"
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantOrders = async (req, res) => {
  const ownerUserId = req.user.id;
  const filters = req.query; // Ya validados por Zod middleware

  // 1. Obtener información del usuario y verificar que es owner
  const userWithRoles = await UserService.getUserWithRoles(ownerUserId, req.id);

  if (!userWithRoles) {
    return ResponseService.notFound(res, 'Usuario no encontrado');
  }

  // 2. Obtener restaurantId del owner
  const ownerAssignments = userWithRoles.userRoleAssignments.filter(
    assignment => assignment.role.name === 'owner' && assignment.restaurantId
  );

  if (ownerAssignments.length === 0) {
    return ResponseService.forbidden(
      res, 
      'Acceso denegado. Se requiere ser owner de un restaurante',
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  const restaurantId = ownerAssignments[0].restaurantId;

  // 3. Obtener pedidos directamente del restaurante
  const result = await OrderRepository.getOrdersForRestaurant(restaurantId, filters);

  return ResponseService.success(
    res,
    'Pedidos obtenidos exitosamente',
    result
  );
};

/**
 * Actualiza el estado de un pedido específico
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status, rejectionReason } = req.body;
  const userId = req.user.id;

  logger.info('Solicitud de actualización de estado de pedido', {
    requestId: req.id,
    meta: { 
      orderId: orderId.toString(), 
      newStatus: status, 
      rejectionReason,
      userId 
    }
  });

  // Llamar al método del repositorio con toda la lógica de validación
  const updatedOrder = await OrderRepository.updateOrderStatus(
    orderId, 
    status, 
    userId, 
    req.id,
    rejectionReason
  );

  return ResponseService.success(
    res,
    `Estado del pedido actualizado a '${status}'`,
    { order: updatedOrder }
  );
};

/**
 * Obtiene la lista de subcategorías del restaurante para el panel de administración
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantSubcategories = async (req, res) => {
  const userId = req.user.id;

  // 1. Obtener información del usuario y sus roles usando UserService estandarizado
  const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

  if (!userWithRoles) {
    return ResponseService.notFound(res, 'Usuario no encontrado');
  }

  // 2. Verificar que el usuario tenga roles de restaurante
  const restaurantRoles = ['owner', 'restaurant_manager'];
  const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
  const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));

  if (!hasRestaurantRole) {
    return ResponseService.forbidden(
      res, 
      'Acceso denegado. Se requieren permisos de restaurante',
      'INSUFFICIENT_PERMISSIONS'
    );
  }

  // 3. Obtener el restaurantId del usuario
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

  // 4. Obtener filtros validados de req.query (ya validados por Zod)
  const filters = req.query;

  // 5. Llamar al repositorio para obtener subcategorías con paginación
  const result = await SubcategoryRepository.findByRestaurantId(restaurantId, filters);

  // 6. Respuesta exitosa
  return ResponseService.success(
    res,
    'Subcategorías obtenidas exitosamente',
    result
  );
};

/**
 * Crea una nueva subcategoría para el menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createSubcategory = async (req, res) => {
  const userId = req.user.id;
  
  // Los datos ya están validados por Zod
  const newSubcategory = await SubcategoryRepository.create(req.body, userId, req.id);

  return ResponseService.success(
    res,
    'Subcategoría creada exitosamente',
    {
      subcategory: newSubcategory
    },
    201
  );
};

/**
 * Actualiza una subcategoría existente del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateSubcategory = async (req, res) => {
  const { subcategoryId } = req.params;
  const userId = req.user.id;

  const updatedSubcategory = await SubcategoryRepository.update(subcategoryId, req.body, userId, req.id);

  return ResponseService.success(res, 'Subcategoría actualizada exitosamente', {
    subcategory: updatedSubcategory
  });
};

/**
 * Elimina una subcategoría del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteSubcategory = async (req, res) => {
  const { subcategoryId } = req.params;
  const userId = req.user.id;

  const deletedSubcategory = await SubcategoryRepository.delete(subcategoryId, userId, req.id);

  return ResponseService.success(res, 'Subcategoría eliminada exitosamente', {
    deletedSubcategory
  });
};

/**
 * Obtiene la lista de productos del restaurante para el panel de administración
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantProducts = async (req, res) => {
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

  // 2. Verificar que el usuario tenga roles de restaurante (owner o restaurant_manager)
  const restaurantRoles = ['owner', 'restaurant_manager'];
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
        },
        modifierGroups: {
          include: {
            modifierGroup: {
              include: {
                options: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    createdAt: true,
                    updatedAt: true
                  },
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
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
    modifierGroups: product.modifierGroups.map(pm => ({
      id: pm.modifierGroup.id,
      name: pm.modifierGroup.name,
      minSelection: pm.modifierGroup.minSelection,
      maxSelection: pm.modifierGroup.maxSelection,
      restaurantId: pm.modifierGroup.restaurantId,
      options: pm.modifierGroup.options.map(option => ({
        id: option.id,
        name: option.name,
        price: Number(option.price),
        createdAt: option.createdAt,
        updatedAt: option.updatedAt
      })),
      createdAt: pm.modifierGroup.createdAt,
      updatedAt: pm.modifierGroup.updatedAt
    })),
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
};

/**
 * Crea un nuevo producto en el menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createProduct = async (req, res) => {
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
};

/**
 * Actualiza un producto existente del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateProduct = async (req, res) => {
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
};

/**
 * Elimina un producto del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteProduct = async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  // Convertir productId a número (por si Zod no lo hizo correctamente)
  const productIdNum = parseInt(productId, 10);

  // Eliminar el producto usando el repositorio con toda la lógica de negocio
  const deletedProductInfo = await ProductRepository.delete(productIdNum, userId, req.id);

  // Respuesta exitosa
  return ResponseService.success(
    res,
    'Producto eliminado exitosamente',
    {
      deletedProduct: deletedProductInfo
    },
    200
  );
};

/**
 * Obtiene el perfil completo del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantProfile = async (req, res) => {
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
      schedule: {
        select: {
          id: true,
          dayOfWeek: true,
          isClosed: true,
          openingTime: true,
          closingTime: true
        },
        orderBy: {
          dayOfWeek: 'asc'
        }
      },
      _count: {
        select: {
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
  
  logger.info('Verificando archivos para restaurante', {
    requestId: req.id,
    meta: { restaurantId: restaurant.id, restaurantName: restaurant.name }
  });
  logger.debug('Uploads path configurado', {
    requestId: req.id,
    meta: { uploadsPath }
  });
  
  const verifiedLogoUrl = verifyFileExists(restaurant.logoUrl, uploadsPath);
  const verifiedCoverPhotoUrl = verifyFileExists(restaurant.coverPhotoUrl, uploadsPath);
  
  // Determinar si necesitamos limpiar la base de datos
  let needsDbUpdate = false;
  const updateData = {};
  
  if (restaurant.logoUrl && !verifiedLogoUrl) {
    logger.warn('URL de logo obsoleta detectada, limpiando en BD', {
      requestId: req.id,
      meta: { restaurantId: restaurant.id, logoUrl: restaurant.logoUrl }
    });
    updateData.logoUrl = null;
    needsDbUpdate = true;
  }
  
  if (restaurant.coverPhotoUrl && !verifiedCoverPhotoUrl) {
    logger.warn('URL de cover obsoleta detectada, limpiando en BD', {
      requestId: req.id,
      meta: { restaurantId: restaurant.id, coverPhotoUrl: restaurant.coverPhotoUrl }
    });
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
      logger.info('Base de datos actualizada para restaurante', {
        requestId: req.id,
        meta: { restaurantId: restaurant.id }
      });
    } catch (error) {
      logger.error('Error actualizando BD para restaurante', {
        requestId: req.id,
        error: error.message,
        stack: error.stack,
        meta: { restaurantId: restaurant.id }
      });
    }
  }
  
  // Log para debugging
  logger.debug('Resultado de verificación de archivos', {
    requestId: req.id,
    meta: {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      originalLogoUrl: restaurant.logoUrl,
      verifiedLogoUrl: verifiedLogoUrl,
      originalCoverPhotoUrl: restaurant.coverPhotoUrl,
      verifiedCoverPhotoUrl: verifiedCoverPhotoUrl,
      databaseUpdated: needsDbUpdate
    }
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
    deliveryInfo: {
      deliveryFee: Number(restaurant.deliveryFee || 0),
      deliveryRadius: Number(restaurant.deliveryRadius || 0),
      usesPlatformDrivers: restaurant.usesPlatformDrivers || false,
      estimatedDeliveryMin: restaurant.estimatedDeliveryMin || 30,
      estimatedDeliveryMax: restaurant.estimatedDeliveryMax || 60
    },
    schedule: restaurant.schedule.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][schedule.dayOfWeek],
      isClosed: schedule.isClosed,
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime
    })),
    statistics: {
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
};

/**
 * Actualiza la información del restaurante del dueño autenticado
 * REFACTORIZADO: Ahora usa middleware de control de acceso
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateRestaurantProfile = async (req, res) => {
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
    deliveryInfo: {
      deliveryFee: Number(updatedRestaurant.deliveryFee || 0),
      deliveryRadius: Number(updatedRestaurant.deliveryRadius || 0),
      usesPlatformDrivers: updatedRestaurant.usesPlatformDrivers || false,
      estimatedDeliveryMin: updatedRestaurant.estimatedDeliveryMin || 30,
      estimatedDeliveryMax: updatedRestaurant.estimatedDeliveryMax || 60
    },
    schedule: updatedRestaurant.schedule ? updatedRestaurant.schedule.map(schedule => ({
      id: schedule.id,
      dayOfWeek: schedule.dayOfWeek,
      dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][schedule.dayOfWeek],
      isClosed: schedule.isClosed,
      openingTime: schedule.openingTime,
      closingTime: schedule.closingTime
    })) : [],
    statistics: {
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
};

/**
 * Crear una nueva sucursal para el restaurante del dueño autenticado
 * REFACTORIZADO: Ahora usa middleware de control de acceso
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */


/**
 * Actualizar una sucursal existente del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

/**
 * Eliminar una sucursal existente del restaurante del dueño autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

/**
 * Obtiene el horario semanal de una sucursal específica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

/**
 * Actualiza el horario semanal completo de una sucursal específica
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

/**
 * Actualiza el horario de un día específico de una sucursal
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

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

    logger.info('Procesando rechazo de pedido', {
      requestId: req.id,
      meta: { orderId, userId }
    });

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
            restaurantId: true
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
    const restaurantRoles = ['owner', 'restaurant_manager', 'order_manager'];
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
        restaurant: true
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
    logger.debug('Datos de depuración de reembolso', {
      requestId: req.id,
      meta: {
        orderId: order.id,
        paymentId: order.payment.id,
        providerPaymentId: order.payment.providerPaymentId
      }
    });

    // 4. Verificar que el pedido pertenece al restaurante del usuario
    let hasAccess = false;

    // Verificar si es owner del restaurante
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId === order.restaurantId
    );

    if (ownerAssignment) {
      hasAccess = true;
    } else {
      // Verificar si es manager del restaurante
      const managerAssignment = userWithRoles.userRoleAssignments.find(
        assignment => 
          (assignment.role.name === 'restaurant_manager' || assignment.role.name === 'order_manager') &&
          assignment.restaurantId === order.restaurantId
      );

      if (managerAssignment) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      logger.warn('Usuario no tiene permisos para rechazar el pedido', {
        requestId: req.id,
        meta: { userId, orderId }
      });
      return res.status(403).json({
        status: 'error',
        message: 'No tienes permisos para rechazar este pedido',
        details: {
          orderId: orderId,
          restaurantId: order.restaurantId,
          suggestion: 'Verifica que tienes permisos para este restaurante'
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

    logger.info('Iniciando reembolso para pago', {
      requestId: req.id,
      meta: { providerPaymentId: order.payment.providerPaymentId }
    });

    // 8. Procesar reembolso en Mercado Pago
    let refundResult;
    try {
      // Obtener el providerPaymentId real (ID numérico del pago en Mercado Pago)
      const mpPaymentId = order.payment.providerPaymentId;
      
      logger.debug('Procesando reembolso para pago ID', {
        requestId: req.id,
        meta: { mpPaymentId }
      });
      
      // Procesar reembolso completo usando directamente el ID del pago
      refundResult = await payment.refund({
        id: mpPaymentId,
        body: {
          amount: order.total
        }
      });

      logger.info('Reembolso procesado exitosamente', {
        requestId: req.id,
        meta: {
          refundId: refundResult.id,
          status: refundResult.status,
          amount: refundResult.amount,
          originalPaymentId: mpPaymentId
        }
      });

    } catch (mpError) {
      // En producción, lanzar el error para detener el proceso
      if (process.env.NODE_ENV === 'production') {
        logger.error('Error procesando reembolso en Mercado Pago', {
          requestId: req.id,
          error: mpError.message,
          stack: mpError.stack,
          meta: {
            paymentId: order.payment.providerPaymentId,
            amount: order.total
          }
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
        logger.warn('Fallo en el reembolso de prueba de MP, continuando de todos modos', {
          requestId: req.id,
          meta: {
            paymentId: order.payment.providerPaymentId,
            amount: order.total,
            error: mpError.message
          }
        });
        
        // Simular un resultado de reembolso exitoso para desarrollo
        refundResult = {
          id: `dev_refund_${Date.now()}`,
          status: 'approved',
          amount: order.total
        };
        
        logger.info('Simulando reembolso exitoso en desarrollo', {
          requestId: req.id,
          meta: {
            refundId: refundResult.id,
            status: refundResult.status,
            amount: refundResult.amount,
            note: 'Simulado para entorno de desarrollo'
          }
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
        restaurant: true,
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

    logger.info('Pedido rechazado exitosamente y reembolso procesado', {
      requestId: req.id,
      meta: { orderId }
    });

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
    logger.info('Notificación de rechazo enviada a la sala', {
      requestId: req.id,
      meta: { customerRoom }
    });

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
          restaurant: {
            id: updatedOrder.restaurant.id,
            name: updatedOrder.restaurant.name
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
    logger.error('Error rechazando pedido', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      meta: { orderId, userId }
    });

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
          restaurantId: true
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
  const allowedRoles = ['owner', 'restaurant_manager'];
  const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
  const hasAllowedRole = userRoles.some(role => allowedRoles.includes(role));

  if (!hasAllowedRole) {
    return res.status(403).json({
      status: 'error',
      message: 'Acceso denegado. Se requieren permisos de owner o restaurant_manager',
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
    // Si es restaurant_manager, obtener el restaurantId directamente
    const managerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'restaurant_manager' && assignment.restaurantId
    );

    if (managerAssignment) {
      restaurantId = managerAssignment.restaurantId;
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
};

/**
 * Obtiene el estado de configuración de ubicación del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLocationStatus = async (req, res) => {
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

  // 4. Verificar el estado de configuración de ubicación y obtener datos completos
  const isLocationSet = await RestaurantRepository.getLocationStatus(restaurantId);
  const locationData = await RestaurantRepository.getLocationData(restaurantId);

  return ResponseService.success(
    res,
    'Estado de ubicación obtenido exitosamente',
    {
      isLocationSet: isLocationSet,
      location: locationData
    }
  );
};

/**
 * Actualiza la ubicación del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateLocation = async (req, res) => {
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

  // 4. Los datos ya fueron validados por Zod
  const data = req.body;

  // 5. Actualizar la ubicación usando el repositorio
  const updatedRestaurant = await RestaurantRepository.updateLocation(restaurantId, data);

  return ResponseService.success(
    res,
    'Ubicación del restaurante actualizada exitosamente',
    {
      restaurant: updatedRestaurant
    }
  );
};

/**
 * Obtiene la información de la sucursal principal del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

/**
 * Actualiza los detalles operativos de la sucursal principal
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */

/**
 * Crea un nuevo empleado para el restaurante del owner
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const createEmployee = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const employeeData = req.body;

    // Delegar la lógica al repositorio
    const result = await EmployeeRepository.createEmployeeForRestaurant(
      employeeData, 
      ownerUserId, 
      req.id
    );

    return ResponseService.success(
      res,
      'Empleado creado exitosamente',
      result,
      201
    );

  } catch (error) {
    // El repositorio maneja los errores con estructura específica
    if (error.status) {
      return res.status(error.status).json({
        status: 'error',
        message: error.message,
        code: error.code,
        details: error.details || null
      });
    }

    // Para errores no controlados, usar ResponseService
    logger.error('Error creando empleado', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      meta: { userId }
    });
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Obtiene la lista de empleados del restaurante del owner
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getEmployees = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const filters = req.query;

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(ownerUserId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignment = userWithRoles.userRoleAssignments.find(
      assignment => assignment.role.name === 'owner' && assignment.restaurantId
    );

    if (!ownerAssignment) {
      logger.warn('Usuario no tiene rol de owner o restaurante asignado', {
        requestId: req.id,
        meta: { ownerUserId }
      });
      
      return ResponseService.forbidden(
        res, 
        'No tienes permisos para consultar empleados. Se requiere rol de owner',
        null,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    const restaurantId = ownerAssignment.restaurantId;

    // 3. Delegar la lógica al repositorio
    const result = await EmployeeRepository.getEmployeesByRestaurant(restaurantId, filters);

    return ResponseService.success(
      res,
      'Empleados obtenidos exitosamente',
      result
    );

  } catch (error) {
    // El repositorio maneja los errores con estructura específica
    if (error.status) {
      return res.status(error.status).json({
        status: 'error',
        message: error.message,
        code: error.code,
        details: error.details || null
      });
    }

    // Para errores no controlados, usar ResponseService
    logger.error('Error obteniendo empleados', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      meta: { userId }
    });
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualiza el rol y/o estado de un empleado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateEmployee = async (req, res) => {
  try {
    const assignmentId = req.params.assignmentId;
    const ownerUserId = req.user.id;
    const updateData = req.body;

    // Delegar la lógica al repositorio
    const result = await EmployeeRepository.updateEmployeeAssignment(
      assignmentId,
      updateData,
      ownerUserId,
      req.id
    );

    return ResponseService.success(
      res,
      'Empleado actualizado exitosamente',
      result
    );

  } catch (error) {
    // El repositorio maneja los errores con estructura específica
    if (error.status) {
      return res.status(error.status).json({
        status: 'error',
        message: error.message,
        code: error.code,
        details: error.details || null
      });
    }

    // Para errores no controlados, usar ResponseService
    logger.error('Error actualizando empleado', {
      requestId: req.id,
      error: error.message,
      stack: error.stack,
      meta: { userId, employeeId }
    });
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Obtiene la billetera del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantWallet = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const requestId = req.id || 'unknown';
    
    logger.info('Buscando billetera del restaurante', { 
      requestId, 
      ownerUserId 
    });

    // Obtener restaurantId del usuario
    const restaurantId = await UserService.getRestaurantIdByOwnerId(ownerUserId, requestId);
    if (!restaurantId) {
      logger.warn('Restaurante no encontrado para el propietario', { 
        requestId, 
        ownerUserId 
      });
      return ResponseService.error(
        res,
        'Restaurante no encontrado para este propietario',
        null,
        404,
        'RESTAURANT_NOT_FOUND'
      );
    }

    logger.info('RestaurantId obtenido, buscando billetera', { 
      requestId, 
      ownerUserId, 
      restaurantId 
    });

    const wallet = await RestaurantRepository.getWallet(restaurantId, requestId);

    logger.info('Billetera obtenida exitosamente', { 
      requestId, 
      ownerUserId, 
      restaurantId,
      walletId: wallet?.id 
    });

    return ResponseService.success(
      res,
      'Billetera del restaurante obtenida exitosamente',
      { wallet },
      200
    );

  } catch (error) {
    logger.error('Error en getRestaurantWallet', {
      requestId: req.id || 'unknown',
      ownerUserId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    if (error.status === 404) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
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
 * Obtiene las transacciones de la billetera del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantWalletTransactions = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const requestId = req.id || 'unknown';
    const filters = {
      page: req.query.page,
      pageSize: req.query.pageSize,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo
    };

    // Obtener restaurantId del usuario
    const restaurantId = await UserService.getRestaurantIdByOwnerId(ownerUserId, requestId);
    if (!restaurantId) {
      return ResponseService.error(
        res,
        'Restaurante no encontrado para este propietario',
        null,
        404,
        'RESTAURANT_NOT_FOUND'
      );
    }

    const result = await RestaurantRepository.getWalletTransactions(restaurantId, filters, requestId);

    return ResponseService.success(
      res,
      'Transacciones de billetera obtenidas exitosamente',
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
 * Obtiene el resumen de ganancias del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantEarningsSummary = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const requestId = req.id || 'unknown';
    const { dateFrom, dateTo } = req.query;

    // Obtener restaurantId del usuario
    const restaurantId = await UserService.getRestaurantIdByOwnerId(ownerUserId, requestId);
    if (!restaurantId) {
      return ResponseService.error(
        res,
        'Restaurante no encontrado para este propietario',
        null,
        404,
        'RESTAURANT_NOT_FOUND'
      );
    }

    const summary = await RestaurantRepository.getEarningsSummary(restaurantId, dateFrom, dateTo, requestId);

    return ResponseService.success(
      res,
      'Resumen de ganancias obtenido exitosamente',
      summary,
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
 * Obtiene el resumen completo del dashboard del restaurante
 * Endpoint "cerebro" que consolida todas las métricas en una sola llamada eficiente
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getDashboardSummary = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const requestId = req.id || 'unknown';
    
    logger.info('Obteniendo resumen del dashboard', { 
      requestId, 
      ownerUserId 
    });

    // Obtener restaurantId del usuario
    const restaurantId = await UserService.getRestaurantIdByOwnerId(ownerUserId, requestId);
    if (!restaurantId) {
      return ResponseService.error(
        res,
        'Restaurante no encontrado para este propietario',
        null,
        404,
        'RESTAURANT_NOT_FOUND'
      );
    }

    // Obtener información del restaurante para operaciones
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        deliveryFee: true,
        deliveryRadius: true,
        usesPlatformDrivers: true,
        estimatedDeliveryMin: true,
        estimatedDeliveryMax: true
      }
    });
    
    if (!restaurant) {
      return ResponseService.error(
        res,
        'Restaurante no encontrado',
        null,
        404,
        'RESTAURANT_NOT_FOUND'
      );
    }

    // Fechas para filtros de "hoy"
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Ejecutar todas las consultas en paralelo para máxima eficiencia
    const [
      walletData,
      todayEarnings,
      orderCounts,
      productCount,
      employeeCount,
      categoryCount,
      scheduleData
    ] = await Promise.all([
      // 1. Datos financieros - Billetera
      prisma.restaurantWallet.findUnique({
        where: { restaurantId: restaurantId },
        select: { balance: true }
      }),

      // 2. Ganancias de hoy
      prisma.order.aggregate({
        where: {
          restaurantId: restaurantId,
          status: 'delivered',
          orderDeliveredAt: {
            gte: startOfToday,
            lt: endOfToday
          }
        },
        _sum: {
          restaurantPayout: true,
          subtotal: true
        }
      }),

      // 3. Conteos de pedidos por estado - usando consultas separadas para evitar ambigüedad
      Promise.all([
        prisma.order.count({
          where: {
            restaurantId: restaurantId,
            status: 'pending'
          }
        }),
        prisma.order.count({
          where: {
            restaurantId: restaurantId,
            status: 'preparing'
          }
        }),
        prisma.order.count({
          where: {
            restaurantId: restaurantId,
            status: 'ready_for_pickup'
          }
        }),
        prisma.order.count({
          where: {
            restaurantId: restaurantId,
            status: 'delivered',
            orderDeliveredAt: {
              gte: startOfToday,
              lt: endOfToday
            }
          }
        })
      ]),

      // 4. Conteo de productos activos
      prisma.product.count({
        where: {
          restaurantId: restaurantId,
          isAvailable: true
        }
      }),

      // 5. Conteo de empleados activos
      prisma.userRoleAssignment.count({
        where: {
          restaurantId: restaurantId,
          user: { status: 'active' },
          role: { name: { in: ['restaurant_manager', 'order_manager', 'kitchen_staff'] } }
        }
      }),

      // 6. Conteo de categorías
      prisma.subcategory.count({
        where: {
          restaurantId: restaurantId
        }
      }),

      // 7. Horarios del restaurante
      prisma.restaurantSchedule.findFirst({
        where: {
          restaurantId: restaurantId,
          dayOfWeek: today.getDay() // 0 = Domingo, 1 = Lunes, etc.
        },
        select: {
          isClosed: true,
          openingTime: true,
          closingTime: true
        }
      })
    ]);

    // Procesar conteos de pedidos - ahora es un array de conteos
    const [pendingCount, preparingCount, readyForPickupCount, deliveredTodayCount] = orderCounts;

    // Determinar estado del restaurante
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    let isOpen = false;
    let nextOpeningTime = null;
    let nextClosingTime = null;
    let currentDaySchedule = null;

    if (scheduleData) {
      if (scheduleData.isClosed) {
        isOpen = false;
        nextOpeningTime = "Mañana";
      } else {
        const openingTime = scheduleData.openingTime;
        const closingTime = scheduleData.closingTime;
        
        // Convertir horarios a formato comparable (HH:MM)
        const openingTimeFormatted = openingTime.substring(0, 5); // "10:00:00" -> "10:00"
        const closingTimeFormatted = closingTime.substring(0, 5); // "17:30:00" -> "17:30"
        
        // Comparar horarios correctamente
        isOpen = currentTime >= openingTimeFormatted && currentTime < closingTimeFormatted;
        nextClosingTime = closingTimeFormatted;
        
        // Log para debug
        logger.debug('Cálculo de horarios del restaurante', {
          requestId,
          currentTime,
          openingTimeFormatted,
          closingTimeFormatted,
          isOpen,
          restaurantId
        });
        
        if (!isOpen && currentTime < openingTimeFormatted) {
          nextOpeningTime = openingTimeFormatted;
        }
        
        currentDaySchedule = {
          day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()],
          opening: openingTimeFormatted,
          closing: closingTimeFormatted
        };
      }
    }

    // Construir respuesta según estructura v1.0 requerida
    const dashboardData = {
      financials: {
        walletBalance: walletData ? Number(walletData.balance) : 0,
        todaySales: Number(todayEarnings._sum.subtotal || 0),
        todayEarnings: Number(todayEarnings._sum.restaurantPayout || 0)
      },
      operations: {
        pendingOrdersCount: pendingCount || 0,
        preparingOrdersCount: preparingCount || 0,
        readyForPickupCount: readyForPickupCount || 0,
        deliveredTodayCount: deliveredTodayCount || 0
      },
      storeStatus: {
        isOpen: isOpen,
        nextOpeningTime: nextOpeningTime,
        nextClosingTime: nextClosingTime,
        currentDaySchedule: currentDaySchedule
      },
      quickStats: {
        activeProductsCount: productCount,
        activeEmployeesCount: employeeCount,
        totalCategories: categoryCount
      }
    };

    logger.info('Resumen del dashboard obtenido exitosamente', {
      requestId,
      restaurantId,
      financials: dashboardData.financials,
      operations: dashboardData.operations
    });

    return ResponseService.success(
      res,
      'Resumen del dashboard obtenido exitosamente',
      dashboardData,
      200
    );

  } catch (error) {
    logger.error('Error en getDashboardSummary', {
      requestId: req.id || 'unknown',
      ownerUserId: req.user?.id,
      error: error.message,
      stack: error.stack
    });

    if (error.status) {
      return ResponseService.error(
        res,
        error.message,
        error.details || null,
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
  rejectOrder,
  formatOrderForSocket,
  deactivateProductsByTag,
  getLocationStatus,
  updateLocation,
  createEmployee,
  getEmployees,
  updateEmployee,
  getRestaurantWallet,
  getRestaurantWalletTransactions,
  getRestaurantEarningsSummary,
  getDashboardSummary
};

