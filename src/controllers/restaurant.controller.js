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
          coverPhotoUrl: true,
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
        where: {
          status: 'active'
        }
      })
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalRestaurants / pageSize);

    // Procesar restaurantes para añadir isOpen a cada sucursal
    const processedRestaurants = restaurants.map(restaurant => ({
      ...restaurant,
      branches: restaurant.branches.map(branch => ({
        ...branch,
        isOpen: calculateIsOpen(branch.schedule)
      }))
    }));

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

    // Procesar branches para añadir isOpen a cada sucursal
    const processedBranches = restaurant.branches.map(branch => ({
      ...branch,
      isOpen: calculateIsOpen(branch.schedule)
    }));

    // Agregar el menú y branches procesadas al objeto del restaurante
    const restaurantWithMenu = {
      ...restaurant,
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

module.exports = {
  getRestaurants,
  getRestaurantById
};
