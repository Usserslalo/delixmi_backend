const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Controlador para obtener la lista de restaurantes activos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurants = async (req, res) => {
  try {
    // Obtener parámetros de paginación
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    // Validar parámetros
    if (page < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'El número de página debe ser mayor a 0'
      });
    }
    
    if (pageSize < 1 || pageSize > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'El tamaño de página debe estar entre 1 y 100'
      });
    }

    // Calcular offset para la paginación
    const skip = (page - 1) * pageSize;

    // Consultar restaurantes activos con paginación
    const [restaurants, totalRestaurants] = await Promise.all([
      prisma.restaurant.findMany({
        where: {
          status: 'active'
        },
        select: {
          id: true,
          name: true,
          description: true,
          logoUrl: true,
          coverPhotoUrl: true
        },
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.restaurant.count({
        where: {
          status: 'active'
        }
      })
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalRestaurants / pageSize);

    // Estructurar respuesta
    const response = {
      status: 'success',
      data: {
        restaurants: restaurants,
        pagination: {
          totalRestaurants: totalRestaurants,
          currentPage: page,
          pageSize: pageSize,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error al obtener restaurantes:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener restaurantes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Controlador para obtener un restaurante específico por ID con su menú completo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurantById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'El ID del restaurante debe ser un número válido'
      });
    }

    // Obtener el restaurante con su menú completo
    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: parseInt(id),
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        description: true,
        logoUrl: true,
        coverPhotoUrl: true,
        createdAt: true
      }
    });

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado o no está activo'
      });
    }

    // Obtener el menú completo del restaurante
    const menu = await prisma.category.findMany({
      where: {
        subcategories: {
          some: {
            restaurantId: parseInt(id)
          }
        }
      },
      select: {
        id: true,
        name: true,
        subcategories: {
          where: {
            restaurantId: parseInt(id)
          },
          select: {
            id: true,
            name: true,
            displayOrder: true,
            products: {
              where: {
                isAvailable: true
              },
              select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                price: true
              },
              orderBy: {
                name: 'asc'
              }
            }
          },
          orderBy: {
            displayOrder: 'asc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Filtrar categorías que tengan subcategorías con productos
    const filteredMenu = menu
      .map(category => ({
        ...category,
        subcategories: category.subcategories.filter(subcategory => 
          subcategory.products.length > 0
        )
      }))
      .filter(category => category.subcategories.length > 0);

    // Agregar el menú al objeto del restaurante
    const restaurantWithMenu = {
      ...restaurant,
      menu: filteredMenu
    };

    res.status(200).json({
      status: 'success',
      data: {
        restaurant: restaurantWithMenu
      }
    });

  } catch (error) {
    console.error('Error al obtener restaurante por ID:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener el restaurante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById
};
