const { PrismaClient } = require('@prisma/client');
const { getIo } = require('../config/socket');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const UserService = require('../services/user.service');
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');
const { checkRestaurantAccess, checkRestaurantOwnership, checkBranchAccess } = require('../middleware/restaurantAccess.middleware');
const RestaurantRepository = require('../repositories/restaurant.repository');
const ProductRepository = require('../repositories/product.repository');
const SubcategoryRepository = require('../repositories/subcategory.repository');
const ScheduleRepository = require('../repositories/schedule.repository');
const BranchRepository = require('../repositories/branch.repository');
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
 * Obtiene los pedidos de la sucursal principal del restaurante con filtros y paginación
 * REFACTORIZADO: Usa OrderRepository y sigue el modelo "one Owner = one primary branch"
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantOrders = async (req, res) => {
  try {
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

    // 3. Obtener la sucursal principal
    const primaryBranch = await BranchRepository.findPrimaryBranchByRestaurantId(restaurantId);
    
    if (!primaryBranch) {
      return ResponseService.notFound(
        res, 
        'Sucursal principal no encontrada. Configure la ubicación del restaurante primero.',
        null,
        'PRIMARY_BRANCH_NOT_FOUND'
      );
    }

    // 4. Obtener pedidos usando el repositorio
    const result = await OrderRepository.getOrdersForBranch(primaryBranch.id, filters);

    return ResponseService.success(
      res,
      'Pedidos obtenidos exitosamente',
      result
    );

  } catch (error) {
    logger.error('Error obteniendo pedidos del restaurante', {
      userId: req.user.id,
      error: error.message,
      stack: error.stack
    });
    
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

    logger.info('Solicitud de actualización de estado de pedido', {
      requestId: req.id,
      meta: { 
        orderId: orderId.toString(), 
        newStatus: status, 
        userId 
      }
    });

    // Llamar al método del repositorio con toda la lógica de validación
    const updatedOrder = await OrderRepository.updateOrderStatus(
      orderId, 
      status, 
      userId, 
      req.id
    );

    return ResponseService.success(
      res,
      `Estado del pedido actualizado a '${status}'`,
      { order: updatedOrder }
    );

  } catch (error) {
    // Asegurar que orderId se convierta a string para evitar problemas de BigInt
    const orderIdStr = req.params.orderId ? req.params.orderId.toString() : String(req.params.orderId || 'unknown');
    
    logger.error('Error en controlador updateOrderStatus', {
      requestId: req.id,
      meta: { 
        orderId: orderIdStr, 
        status: req.body.status,
        userId: req.user.id,
        error: error.message || 'Error desconocido',
        code: error.code || 'UNKNOWN_ERROR'
      }
    });

    // Manejar errores específicos del repositorio
    if (error.status) {
      switch (error.status) {
        case 403:
          return ResponseService.forbidden(
            res, 
            error.message, 
            null, 
            error.code
          );
        case 404:
          return ResponseService.notFound(
            res, 
            error.message, 
            null, 
            error.code
          );
        case 409:
          return ResponseService.conflict(
            res, 
            error.message, 
            null, 
            error.code
          );
        default:
          return ResponseService.internalError(res, error.message);
      }
    }

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

    // 1. Obtener información del usuario y sus roles usando UserService estandarizado
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

  } catch (error) {
    console.error('Error obteniendo subcategorías del restaurante:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.details, error.code);
      } else if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      }
    }
    
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

    } catch (error) {
    console.error('Error creando subcategoría:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
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
    const { subcategoryId } = req.params;
    const userId = req.user.id;

    const updatedSubcategory = await SubcategoryRepository.update(subcategoryId, req.body, userId, req.id);

    return ResponseService.success(res, 'Subcategoría actualizada exitosamente', {
      subcategory: updatedSubcategory
    });

  } catch (error) {
    console.error('Error actualizando subcategoría:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      } else if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Elimina una subcategoría del menú del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const deleteSubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const userId = req.user.id;

    const deletedSubcategory = await SubcategoryRepository.delete(subcategoryId, userId, req.id);

    return ResponseService.success(res, 'Subcategoría eliminada exitosamente', {
      deletedSubcategory
    });

  } catch (error) {
    console.error('Error eliminando subcategoría:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
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

  } catch (error) {
    console.error('Error eliminando producto:', error);
    
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

    // Delegar la lógica al repositorio
    const scheduleData = await ScheduleRepository.getWeeklySchedule(branchId, userId, req.id);

    return ResponseService.success(
      res,
      'Horario de sucursal obtenido exitosamente',
      scheduleData
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
    console.error('❌ Error obteniendo horario de sucursal:', error);
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
    const { schedules } = req.body;

    // Delegar la lógica al repositorio
    const updatedScheduleData = await ScheduleRepository.updateWeeklySchedule(branchId, schedules, userId, req.id);

    return ResponseService.success(
      res,
      'Horario de sucursal actualizado exitosamente',
      updatedScheduleData
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
    console.error('❌ Error actualizando horario de sucursal:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualiza el horario de un día específico de una sucursal
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateSingleDaySchedule = async (req, res) => {
  try {
    const { branchId, dayOfWeek } = req.params;
    const userId = req.user.id;
    const dayData = req.body;

    // Delegar la lógica al repositorio
    const updatedDayData = await ScheduleRepository.updateSingleDaySchedule(
      branchId, 
      parseInt(dayOfWeek), 
      dayData, 
      userId, 
      req.id
    );

    return ResponseService.success(
      res,
      'Horario del día actualizado exitosamente',
      updatedDayData
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
    console.error('❌ Error actualizando horario de día específico:', error);
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

/**
 * Obtiene el estado de configuración de ubicación del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getLocationStatus = async (req, res) => {
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

  } catch (error) {
    console.error('Error obteniendo estado de ubicación:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualiza la ubicación del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateLocation = async (req, res) => {
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

  } catch (error) {
    console.error('Error actualizando ubicación del restaurante:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Obtiene la información de la sucursal principal del restaurante
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getPrimaryBranch = async (req, res) => {
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

    // 4. Buscar la sucursal principal usando BranchRepository
    const primaryBranch = await BranchRepository.findPrimaryBranchByRestaurantId(restaurantId);

    if (!primaryBranch) {
      return ResponseService.notFound(
        res,
        'Sucursal principal no encontrada',
        'PRIMARY_BRANCH_NOT_FOUND'
      );
    }

    return ResponseService.success(
      res,
      'Sucursal principal obtenida exitosamente',
      {
        branch: primaryBranch
      }
    );

  } catch (error) {
    console.error('Error obteniendo sucursal principal:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

/**
 * Actualiza los detalles operativos de la sucursal principal
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updatePrimaryBranchDetails = async (req, res) => {
  try {
    const ownerUserId = req.user.id;
    const updateData = req.body;

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(ownerUserId, req.id);

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

    // 4. Delegar la lógica al repositorio
    const result = await BranchRepository.updatePrimaryBranchDetails(
      restaurantId,
      updateData,
      ownerUserId,
      req.id
    );

    return ResponseService.success(
      res,
      'Detalles de sucursal principal actualizados exitosamente',
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

    console.error('Error actualizando detalles de sucursal principal:', error);
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};

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
    console.error('❌ Error creando empleado:', error);
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
    console.error('❌ Error obteniendo empleados:', error);
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
    console.error('❌ Error actualizando empleado:', error);
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

    // Obtener sucursal principal para operaciones
    const primaryBranch = await BranchRepository.findPrimaryBranchByRestaurantId(restaurantId);
    if (!primaryBranch) {
      return ResponseService.error(
        res,
        'Sucursal principal no encontrada',
        null,
        404,
        'PRIMARY_BRANCH_NOT_FOUND'
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
          branch: { restaurantId: restaurantId },
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
            branch: { restaurantId: restaurantId },
            status: 'pending'
          }
        }),
        prisma.order.count({
          where: {
            branch: { restaurantId: restaurantId },
            status: 'preparing'
          }
        }),
        prisma.order.count({
          where: {
            branch: { restaurantId: restaurantId },
            status: 'ready_for_pickup'
          }
        }),
        prisma.order.count({
          where: {
            branch: { restaurantId: restaurantId },
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
          role: { name: { in: ['branch_manager', 'order_manager', 'kitchen_staff'] } }
        }
      }),

      // 6. Conteo de categorías
      prisma.subcategory.count({
        where: {
          restaurantId: restaurantId
        }
      }),

      // 7. Horarios de la sucursal
      prisma.branchSchedule.findFirst({
        where: {
          branchId: primaryBranch.id,
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
  createBranch,
  getRestaurantBranches,
  updateBranch,
  deleteBranch,
  getBranchSchedule,
  updateBranchSchedule,
  updateSingleDaySchedule,
  rejectOrder,
  formatOrderForSocket,
  deactivateProductsByTag,
  getLocationStatus,
  updateLocation,
  getPrimaryBranch,
  updatePrimaryBranchDetails,
  createEmployee,
  getEmployees,
  updateEmployee,
  getRestaurantWallet,
  getRestaurantWalletTransactions,
  getRestaurantEarningsSummary,
  getDashboardSummary
};

