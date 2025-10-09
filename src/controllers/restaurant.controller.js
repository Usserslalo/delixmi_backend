const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Función auxiliar para convertir tiempo HH:MM:SS a minutos desde medianoche
 * @param {string} timeStr - Tiempo en formato "HH:MM:SS"
 * @returns {number} - Minutos desde medianoche
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes, seconds] = timeStr.split(':').map(Number);
  return hours * 60 + minutes + Math.round(seconds / 60);
};

/**
 * Función auxiliar para obtener la hora actual en zona horaria de México
 * @returns {string} - Hora actual en formato HH:MM:SS
 */
const getCurrentTimeInMexico = () => {
  const now = new Date();
  // México está en UTC-6 (horario estándar) o UTC-5 (horario de verano)
  // Para simplificar, usamos UTC-6 (horario estándar de México)
  const mexicoOffset = -6 * 60; // -6 horas en minutos
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const mexicoTime = new Date(utc + (mexicoOffset * 60000));
  
  const hours = mexicoTime.getHours().toString().padStart(2, '0');
  const minutes = mexicoTime.getMinutes().toString().padStart(2, '0');
  const seconds = mexicoTime.getSeconds().toString().padStart(2, '0');
  
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Función auxiliar para calcular si una sucursal está abierta
 * @param {Array} schedule - Array de horarios de la sucursal
 * @returns {boolean} - true si está abierta, false si está cerrada
 */
const calculateIsOpen = (schedule) => {
  try {
    // Obtener la fecha y hora actual en zona horaria de México
    const now = new Date();
    const mexicoOffset = -6 * 60; // -6 horas en minutos
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mexicoTime = new Date(utc + (mexicoOffset * 60000));
    
    // Obtener el día de la semana (0 = Domingo, 1 = Lunes, ..., 6 = Sábado)
    const dayOfWeek = mexicoTime.getDay();
    
    // Buscar el horario para el día actual
    const todaySchedule = schedule.find(s => s.dayOfWeek === dayOfWeek);
    
    if (!todaySchedule) {
      return false; // No hay horario para este día
    }
    
    // Si está cerrado este día
    if (todaySchedule.isClosed) {
      return false;
    }
    
    // Obtener la hora actual en formato HH:MM:SS
    const currentTime = getCurrentTimeInMexico();
    
    // Convertir todos los tiempos a minutos para comparación numérica
    const currentMinutes = timeToMinutes(currentTime);
    const openingMinutes = timeToMinutes(todaySchedule.openingTime);
    const closingMinutes = timeToMinutes(todaySchedule.closingTime);
    
    console.log(`🕐 Debug isOpen:`, {
      currentTime,
      currentMinutes,
      openingTime: todaySchedule.openingTime,
      openingMinutes,
      closingTime: todaySchedule.closingTime,
      closingMinutes,
      dayOfWeek,
      dayName: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dayOfWeek]
    });
    
    // Manejar horarios nocturnos (que cruzan la medianoche)
    if (openingMinutes > closingMinutes) {
      // Horario nocturno: abierto desde openingTime hasta closingTime del día siguiente
      // Ejemplo: 22:00-06:00 (1320 minutos - 360 minutos)
      const isOpen = currentMinutes >= openingMinutes || currentMinutes < closingMinutes;
      console.log(`🌙 Horario nocturno: ${isOpen ? 'ABIERTO' : 'CERRADO'}`);
      return isOpen;
    } else {
      // Horario normal: abierto desde openingTime hasta closingTime del mismo día
      // Ejemplo: 09:00-22:00 (540 minutos - 1320 minutos)
      const isOpen = currentMinutes >= openingMinutes && currentMinutes < closingMinutes;
      console.log(`☀️ Horario normal: ${isOpen ? 'ABIERTO' : 'CERRADO'}`);
      return isOpen;
    }
    
  } catch (error) {
    console.error('Error calculando isOpen:', error);
    return false; // En caso de error, asumir cerrado
  }
};

/**
 * Controlador para obtener la lista de restaurantes activos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getRestaurants = async (req, res) => {
  try {
    // Obtener parámetros de paginación y filtros
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const category = req.query.category; // Filtro por categoría
    const search = req.query.search;     // Búsqueda de texto
    
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

    // Construir filtros dinámicos
    const where = {
      status: 'active'
    };
    
    // Filtro por categoría
    if (category) {
      where.category = category;
    }
    
    // Filtro por búsqueda de texto
    if (search) {
      where.OR = [
        {
          name: {
            contains: search
          }
        },
        {
          description: {
            contains: search
          }
        }
      ];
    }

    // Consultar restaurantes activos con paginación y filtros
    const [restaurants, totalRestaurants] = await Promise.all([
      prisma.restaurant.findMany({
        where: where,
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          logoUrl: true,
          coverPhotoUrl: true,
          rating: true,
          branches: {
            where: {
              status: 'active'
            },
            select: {
              id: true,
              name: true,
              address: true,
              latitude: true,
              longitude: true,
              phone: true,
              usesPlatformDrivers: true,
              deliveryFee: true,
              estimatedDeliveryMin: true,
              estimatedDeliveryMax: true,
              deliveryRadius: true,
              schedule: {
                select: {
                  dayOfWeek: true,
                  openingTime: true,
                  closingTime: true,
                  isClosed: true
                },
                orderBy: {
                  dayOfWeek: 'asc'
                }
              }
            }
          }
        },
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc'
        }
      }),
      prisma.restaurant.count({
        where: where
      })
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalRestaurants / pageSize);

    // Procesar restaurantes para añadir isOpen a cada sucursal Y al restaurante
    const processedRestaurants = restaurants.map(restaurant => {
      // Calcular isOpen para cada sucursal y convertir números
      const branchesWithIsOpen = restaurant.branches.map(branch => ({
        ...branch,
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        deliveryFee: Number(branch.deliveryFee),
        deliveryRadius: Number(branch.deliveryRadius),
        isOpen: calculateIsOpen(branch.schedule)
      }));
      
      // Un restaurante está abierto si AL MENOS UNA sucursal está abierta
      const restaurantIsOpen = branchesWithIsOpen.some(branch => branch.isOpen);
      
      return {
        ...restaurant,
        rating: restaurant.rating ? Number(restaurant.rating) : 0,
        isOpen: restaurantIsOpen,
        branches: branchesWithIsOpen
      };
    });

    // Estructurar respuesta
    const response = {
      status: 'success',
      data: {
        restaurants: processedRestaurants,
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
        category: true,
        rating: true,
        logoUrl: true,
        coverPhotoUrl: true,
        createdAt: true,
        branches: {
          where: {
            status: 'active'
          },
          select: {
            id: true,
            name: true,
            address: true,
            latitude: true,
            longitude: true,
            phone: true,
            usesPlatformDrivers: true,
            deliveryFee: true,
            estimatedDeliveryMin: true,
            estimatedDeliveryMax: true,
            deliveryRadius: true,
            schedule: {
              select: {
                dayOfWeek: true,
                openingTime: true,
                closingTime: true,
                isClosed: true
              },
              orderBy: {
                dayOfWeek: 'asc'
              }
            }
          }
        }
      }
    });

    if (!restaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado o no está activo'
      });
    }

    // Obtener el menú completo del restaurante con modificadores
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
                price: true,
                modifierGroups: {
                  select: {
                    modifierGroup: {
                      select: {
                        id: true,
                        name: true,
                        minSelection: true,
                        maxSelection: true,
                        options: {
                          select: {
                            id: true,
                            name: true,
                            price: true
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

    // Filtrar categorías que tengan subcategorías con productos y formatear modificadores
    const filteredMenu = menu
      .map(category => ({
        ...category,
        subcategories: category.subcategories
          .filter(subcategory => subcategory.products.length > 0)
          .map(subcategory => ({
            ...subcategory,
            products: subcategory.products.map(product => ({
              ...product,
              price: Number(product.price),
              // Aplanar estructura de modifierGroups
              modifierGroups: product.modifierGroups.map(pg => ({
                id: pg.modifierGroup.id,
                name: pg.modifierGroup.name,
                minSelection: pg.modifierGroup.minSelection,
                maxSelection: pg.modifierGroup.maxSelection,
                required: pg.modifierGroup.minSelection > 0,
                options: pg.modifierGroup.options.map(option => ({
                  id: option.id,
                  name: option.name,
                  price: Number(option.price)
                }))
              }))
            }))
          }))
      }))
      .filter(category => category.subcategories.length > 0);

    // Procesar branches para añadir isOpen a cada sucursal y convertir números
    const processedBranches = restaurant.branches.map(branch => ({
      ...branch,
      latitude: Number(branch.latitude),
      longitude: Number(branch.longitude),
      deliveryFee: Number(branch.deliveryFee),
      deliveryRadius: Number(branch.deliveryRadius),
      isOpen: calculateIsOpen(branch.schedule)
    }));

    // Un restaurante está abierto si AL MENOS UNA sucursal está abierta
    const restaurantIsOpen = processedBranches.some(branch => branch.isOpen);

    // Agregar el menú y branches procesadas al objeto del restaurante
    const restaurantWithMenu = {
      ...restaurant,
      rating: restaurant.rating ? Number(restaurant.rating) : 0,
      isOpen: restaurantIsOpen,
      branches: processedBranches,
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

/**
 * Controlador para obtener un producto específico con sus modificadores
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getProductById = async (req, res) => {
  try {
    const { restaurantId, productId } = req.params;
    
    // Validar que los IDs sean números
    if (isNaN(restaurantId) || isNaN(productId)) {
      return res.status(400).json({
        status: 'error',
        message: 'Los IDs deben ser números válidos'
      });
    }

    // Obtener el producto con sus modificadores
    const product = await prisma.product.findFirst({
      where: {
        id: parseInt(productId),
        restaurantId: parseInt(restaurantId),
        isAvailable: true
      },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        tags: true,
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
            name: true,
            status: true
          }
        },
        modifierGroups: {
          select: {
            modifierGroup: {
              select: {
                id: true,
                name: true,
                minSelection: true,
                maxSelection: true,
                options: {
                  select: {
                    id: true,
                    name: true,
                    price: true
                  },
                  orderBy: {
                    createdAt: 'asc'
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Producto no encontrado o no está disponible'
      });
    }

    // Verificar que el restaurante esté activo
    if (product.restaurant.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'El restaurante no está activo'
      });
    }

    // Formatear modificadores
    const formattedProduct = {
      ...product,
      price: Number(product.price),
      modifierGroups: product.modifierGroups.map(pg => ({
        id: pg.modifierGroup.id,
        name: pg.modifierGroup.name,
        minSelection: pg.modifierGroup.minSelection,
        maxSelection: pg.modifierGroup.maxSelection,
        required: pg.modifierGroup.minSelection > 0,
        options: pg.modifierGroup.options.map(option => ({
          id: option.id,
          name: option.name,
          price: Number(option.price)
        }))
      }))
    };

    res.status(200).json({
      status: 'success',
      data: {
        product: formattedProduct
      }
    });

  } catch (error) {
    console.error('Error al obtener producto por ID:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener el producto',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRestaurants,
  getRestaurantById,
  getProductById
};
