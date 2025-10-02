const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * @desc    Obtener lista de todos los restaurantes con filtros y paginación
 * @route   GET /api/admin/restaurants
 * @access  Private (super_admin, platform_manager)
 */
const getRestaurants = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    // Extraer parámetros de consulta con valores por defecto
    const {
      status,
      page = 1,
      pageSize = 10
    } = req.query;

    // Calcular offset para la paginación
    const skip = (page - 1) * pageSize;

    // Construir filtros de consulta
    const where = {};
    if (status) {
      where.status = status;
    }

    // Consulta principal con relaciones necesarias
    const [restaurants, totalCount] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true,
              status: true
            }
          },
          branches: {
            select: {
              id: true,
              name: true,
              status: true,
              address: true,
              phone: true,
              openingTime: true,
              closingTime: true
            }
          },
          _count: {
            select: {
              branches: true,
              products: true,
              subcategories: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: pageSize
      }),
      prisma.restaurant.count({ where })
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Formatear respuesta de restaurantes
    const formattedRestaurants = restaurants.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      logoUrl: restaurant.logoUrl,
      coverPhotoUrl: restaurant.coverPhotoUrl,
      commissionRate: restaurant.commissionRate,
      status: restaurant.status,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
      owner: {
        id: restaurant.owner.id,
        name: restaurant.owner.name,
        lastname: restaurant.owner.lastname,
        fullName: `${restaurant.owner.name} ${restaurant.owner.lastname}`,
        email: restaurant.owner.email,
        phone: restaurant.owner.phone,
        status: restaurant.owner.status
      },
      branches: restaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
        address: branch.address,
        phone: branch.phone,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime
      })),
      statistics: {
        totalBranches: restaurant._count.branches,
        totalProducts: restaurant._count.products,
        totalSubcategories: restaurant._count.subcategories
      }
    }));

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Lista de restaurantes obtenida exitosamente',
      data: {
        restaurants: formattedRestaurants,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          previousPage: hasPreviousPage ? page - 1 : null
        },
        filters: {
          status: status || null
        }
      }
    });

  } catch (error) {
    console.error('Error en getRestaurants (admin):', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener restaurantes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar el estado de un restaurante específico
 * @route   PATCH /api/admin/restaurants/:id/status
 * @access  Private (super_admin, platform_manager)
 */
const updateRestaurantStatus = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Verificar si el restaurante existe
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, status: true }
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // Verificar si el estado actual es el mismo que el nuevo estado
    if (existingRestaurant.status === status) {
      return res.status(400).json({
        status: 'error',
        message: 'El restaurante ya tiene el estado especificado',
        code: 'SAME_STATUS',
        currentStatus: existingRestaurant.status
      });
    }

    // Actualizar el estado del restaurante
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: { 
        status: status,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true,
            status: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            status: true,
            address: true,
            phone: true,
            openingTime: true,
            closingTime: true
          }
        },
        _count: {
          select: {
            branches: true,
            products: true,
            subcategories: true
          }
        }
      }
    });

    // Formatear respuesta del restaurante
    const formattedRestaurant = {
      id: updatedRestaurant.id,
      name: updatedRestaurant.name,
      description: updatedRestaurant.description,
      logoUrl: updatedRestaurant.logoUrl,
      coverPhotoUrl: updatedRestaurant.coverPhotoUrl,
      commissionRate: updatedRestaurant.commissionRate,
      status: updatedRestaurant.status,
      createdAt: updatedRestaurant.createdAt,
      updatedAt: updatedRestaurant.updatedAt,
      owner: {
        id: updatedRestaurant.owner.id,
        name: updatedRestaurant.owner.name,
        lastname: updatedRestaurant.owner.lastname,
        fullName: `${updatedRestaurant.owner.name} ${updatedRestaurant.owner.lastname}`,
        email: updatedRestaurant.owner.email,
        phone: updatedRestaurant.owner.phone,
        status: updatedRestaurant.owner.status
      },
      branches: updatedRestaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
        address: branch.address,
        phone: branch.phone,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime
      })),
      statistics: {
        totalBranches: updatedRestaurant._count.branches,
        totalProducts: updatedRestaurant._count.products,
        totalSubcategories: updatedRestaurant._count.subcategories
      }
    };

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Estado del restaurante actualizado exitosamente',
      data: {
        restaurant: formattedRestaurant,
        statusChange: {
          previousStatus: existingRestaurant.status,
          newStatus: status,
          updatedBy: {
            userId: req.user.id,
            userName: `${req.user.name} ${req.user.lastname}`,
            userEmail: req.user.email
          },
          updatedAt: updatedRestaurant.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error en updateRestaurantStatus:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al actualizar el estado del restaurante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar los detalles de un restaurante específico
 * @route   PATCH /api/admin/restaurants/:id
 * @access  Private (super_admin, platform_manager)
 */
const updateRestaurant = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el restaurante existe
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) },
      select: { 
        id: true, 
        name: true, 
        description: true,
        logoUrl: true,
        coverPhotoUrl: true,
        commissionRate: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // Verificar si hay datos para actualizar
    const hasChanges = Object.keys(updateData).some(key => 
      updateData[key] !== existingRestaurant[key]
    );

    if (!hasChanges) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron cambios para actualizar',
        code: 'NO_CHANGES',
        currentData: existingRestaurant
      });
    }

    // Preparar datos para actualización
    const dataToUpdate = {
      updatedAt: new Date()
    };

    // Solo incluir campos que se proporcionaron en la petición
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.logoUrl !== undefined) dataToUpdate.logoUrl = updateData.logoUrl;
    if (updateData.coverPhotoUrl !== undefined) dataToUpdate.coverPhotoUrl = updateData.coverPhotoUrl;
    if (updateData.commissionRate !== undefined) dataToUpdate.commissionRate = updateData.commissionRate;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;

    // Actualizar el restaurante
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true,
            status: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            status: true,
            address: true,
            phone: true,
            openingTime: true,
            closingTime: true
          }
        },
        _count: {
          select: {
            branches: true,
            products: true,
            subcategories: true
          }
        }
      }
    });

    // Formatear respuesta del restaurante
    const formattedRestaurant = {
      id: updatedRestaurant.id,
      name: updatedRestaurant.name,
      description: updatedRestaurant.description,
      logoUrl: updatedRestaurant.logoUrl,
      coverPhotoUrl: updatedRestaurant.coverPhotoUrl,
      commissionRate: updatedRestaurant.commissionRate,
      status: updatedRestaurant.status,
      createdAt: updatedRestaurant.createdAt,
      updatedAt: updatedRestaurant.updatedAt,
      owner: {
        id: updatedRestaurant.owner.id,
        name: updatedRestaurant.owner.name,
        lastname: updatedRestaurant.owner.lastname,
        fullName: `${updatedRestaurant.owner.name} ${updatedRestaurant.owner.lastname}`,
        email: updatedRestaurant.owner.email,
        phone: updatedRestaurant.owner.phone,
        status: updatedRestaurant.owner.status
      },
      branches: updatedRestaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
        address: branch.address,
        phone: branch.phone,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime
      })),
      statistics: {
        totalBranches: updatedRestaurant._count.branches,
        totalProducts: updatedRestaurant._count.products,
        totalSubcategories: updatedRestaurant._count.subcategories
      }
    };

    // Identificar campos que fueron actualizados
    const updatedFields = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== existingRestaurant[key]) {
        updatedFields[key] = {
          previous: existingRestaurant[key],
          current: updateData[key]
        };
      }
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Restaurante actualizado exitosamente',
      data: {
        restaurant: formattedRestaurant,
        changes: {
          updatedFields,
          updatedBy: {
            userId: req.user.id,
            userName: `${req.user.name} ${req.user.lastname}`,
            userEmail: req.user.email
          },
          updatedAt: updatedRestaurant.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error en updateRestaurant:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al actualizar el restaurante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRestaurants,
  updateRestaurantStatus,
  updateRestaurant
};
