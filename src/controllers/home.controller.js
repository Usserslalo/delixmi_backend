const { PrismaClient } = require('@prisma/client');
const cacheService = require('../services/cache.service');
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');
const { calculateDistance } = require('../services/geolocation.service');

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
    const now = new Date();
    const mexicoOffset = -6 * 60;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mexicoTime = new Date(utc + (mexicoOffset * 60000));
    
    const dayOfWeek = mexicoTime.getDay();
    const todaySchedule = schedule.find(s => s.dayOfWeek === dayOfWeek);
    
    if (!todaySchedule || todaySchedule.isClosed) {
      return false;
    }
    
    const currentTime = getCurrentTimeInMexico();
    const currentMinutes = timeToMinutes(currentTime);
    const openingMinutes = timeToMinutes(todaySchedule.openingTime);
    const closingMinutes = timeToMinutes(todaySchedule.closingTime);
    
    if (openingMinutes > closingMinutes) {
      return currentMinutes >= openingMinutes || currentMinutes < closingMinutes;
    } else {
      return currentMinutes >= openingMinutes && currentMinutes < closingMinutes;
    }
  } catch (error) {
    console.error('Error calculando isOpen:', error);
    return false;
  }
};

/**
 * Controlador para obtener el dashboard unificado de la HomeScreen
 * Combina categorías, restaurantes destacados, cobertura y resumen del carrito
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getHomeDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const requestId = req.id;
    const userLat = req.query.lat ? parseFloat(req.query.lat) : null;
    const userLng = req.query.lng ? parseFloat(req.query.lng) : null;
    const addressId = req.query.addressId ? parseInt(req.query.addressId) : null;

    logger.info('Obteniendo dashboard de HomeScreen', {
      requestId,
      meta: { userId, userLat, userLng, addressId }
    });

    // Generar clave de caché basada en parámetros
    const cacheKey = `home_dashboard:${userId}:${userLat || 'no_lat'}:${userLng || 'no_lng'}:${addressId || 'default_address'}`;
    
    // Intentar obtener del caché primero
    let dashboardData = cacheService.get(cacheKey);
    let cacheHit = false;

    if (dashboardData) {
      cacheHit = true;
      logger.info('Cache HIT - Dashboard obtenido del caché', {
        requestId,
        meta: { cacheKey, cacheStats: cacheService.getStats() }
      });
    } else {
      logger.info('Cache MISS - Consultando base de datos', {
        requestId,
        meta: { cacheKey }
      });

      // Ejecutar consultas en paralelo para optimizar performance
      const [
        categories,
        addresses,
        cartSummary,
        restaurants
      ] = await Promise.all([
        // 1. Obtener categorías con caché
        getCategoriesWithCache(),
        
        // 2. Obtener direcciones del usuario
        getUserAddresses(userId),
        
        // 3. Obtener resumen del carrito
        getCartSummary(userId),
        
        // 4. Obtener restaurantes destacados (primeros 10)
        getFeaturedRestaurants(userLat, userLng)
      ]);

      // 5. Verificar cobertura si se proporciona dirección
      let coverageInfo = null;
      if (addressId && addresses.length > 0) {
        const selectedAddress = addresses.find(addr => addr.id === addressId);
        if (selectedAddress) {
          coverageInfo = await checkCoverageForAddress(selectedAddress, restaurants);
        }
      }

      // 6. Procesar restaurantes con información adicional
      const processedRestaurants = await processRestaurantsForDashboard(restaurants, userLat, userLng);

      dashboardData = {
        categories: categories,
        addresses: addresses,
        cartSummary: cartSummary,
        restaurants: processedRestaurants,
        coverage: coverageInfo,
        userLocation: userLat && userLng ? {
          latitude: userLat,
          longitude: userLng
        } : null,
        metadata: {
          totalRestaurants: processedRestaurants.length,
          totalCategories: categories.length,
          hasActiveCart: cartSummary && cartSummary.itemCount > 0,
          coverageVerified: coverageInfo !== null
        }
      };

      // Almacenar en caché por 5 minutos (300 segundos)
      const cacheStored = cacheService.set(cacheKey, dashboardData, 300);
      
      if (cacheStored) {
        logger.info('Dashboard almacenado en caché exitosamente', {
          requestId,
          meta: { cacheKey, ttl: '300 segundos (5 minutos)' }
        });
      }
    }

    // Respuesta exitosa
    return ResponseService.success(
      res,
      'Dashboard de HomeScreen obtenido exitosamente',
      {
        ...dashboardData,
        cache: {
          hit: cacheHit,
          key: cacheKey,
          stats: cacheService.getStats()
        }
      }
    );

  } catch (error) {
    logger.error('Error obteniendo dashboard de HomeScreen', {
      requestId: req.id,
      meta: {
        userId: req.user?.id,
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res, 
      'Error interno del servidor al obtener el dashboard'
    );
  }
};

/**
 * Obtiene categorías con caché optimizado
 * @returns {Promise<Array>} Array de categorías
 */
const getCategoriesWithCache = async () => {
  const cacheKey = 'categories:all';
  let categories = cacheService.get(cacheKey);

  if (!categories) {
    categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        subcategories: {
          select: {
            id: true,
            name: true,
            displayOrder: true,
            restaurantId: true
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

    // Cache por 1 hora
    cacheService.set(cacheKey, categories, 3600);
  }

  return categories;
};

/**
 * Obtiene direcciones del usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Array>} Array de direcciones
 */
const getUserAddresses = async (userId) => {
  return await prisma.address.findMany({
    where: {
      userId: userId
    },
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
      latitude: true,
      longitude: true,
      references: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
};

/**
 * Obtiene resumen del carrito del usuario
 * @param {number} userId - ID del usuario
 * @returns {Promise<Object|null>} Resumen del carrito
 */
const getCartSummary = async (userId) => {
  const cart = await prisma.cart.findFirst({
    where: {
      userId: userId
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              price: true
            }
          },
          modifiers: {
            include: {
              modifierOption: {
                select: {
                  name: true,
                  price: true
                }
              }
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

  if (!cart || cart.items.length === 0) {
    return null;
  }

  // Calcular totales
  let subtotal = 0;
  let itemCount = 0;

  cart.items.forEach(item => {
    let itemPrice = Number(item.priceAtAdd);
    
    // Agregar precio de modificadores
    item.modifiers.forEach(modifier => {
      itemPrice += Number(modifier.modifierOption.price);
    });
    
    subtotal += itemPrice * item.quantity;
    itemCount += item.quantity;
  });

  return {
    cartId: cart.id,
    restaurantId: cart.restaurant.id,
    restaurantName: cart.restaurant.name,
    itemCount: itemCount,
    subtotal: Number(subtotal.toFixed(2)),
    deliveryFee: 0, // Se calculará al hacer checkout
    total: Number(subtotal.toFixed(2))
  };
};

/**
 * Obtiene restaurantes destacados para el dashboard
 * @param {number|null} userLat - Latitud del usuario
 * @param {number|null} userLng - Longitud del usuario
 * @returns {Promise<Array>} Array de restaurantes destacados
 */
const getFeaturedRestaurants = async (userLat, userLng) => {
  const where = {
    status: 'active'
  };

  // Si hay coordenadas, priorizar restaurantes cercanos
  const orderBy = userLat && userLng ? 
    { rating: 'desc' } : 
    { rating: 'desc' };

  return await prisma.restaurant.findMany({
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
    take: 10, // Primeros 10 restaurantes destacados
    orderBy: orderBy
  });
};

/**
 * Verifica cobertura para una dirección específica
 * @param {Object} address - Dirección del usuario
 * @param {Array} restaurants - Array de restaurantes
 * @returns {Promise<Object>} Información de cobertura
 */
const checkCoverageForAddress = async (address, restaurants) => {
  const addressCoords = {
    lat: Number(address.latitude),
    lng: Number(address.longitude)
  };

  let coveredRestaurants = 0;
  let totalRestaurants = 0;
  const coverageDetails = [];

  restaurants.forEach(restaurant => {
    restaurant.branches.forEach(branch => {
      totalRestaurants++;
      
      const branchCoords = {
        lat: Number(branch.latitude),
        lng: Number(branch.longitude)
      };
      
      const distance = calculateDistance(addressCoords, branchCoords);
      const deliveryRadiusKm = Number(branch.deliveryRadius);
      const isCovered = distance <= deliveryRadiusKm;
      
      if (isCovered) {
        coveredRestaurants++;
      }
      
      coverageDetails.push({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        branchId: branch.id,
        branchName: branch.name,
        distance: Number(distance.toFixed(2)),
        deliveryRadius: deliveryRadiusKm,
        isCovered: isCovered
      });
    });
  });

  return {
    addressId: address.id,
    addressAlias: address.alias,
    hasCoverage: coveredRestaurants > 0,
    coveragePercentage: totalRestaurants > 0 ? 
      Math.round((coveredRestaurants / totalRestaurants) * 100) : 0,
    coveredRestaurants: coveredRestaurants,
    totalRestaurants: totalRestaurants,
    details: coverageDetails
  };
};

/**
 * Procesa restaurantes para el dashboard con información adicional
 * @param {Array} restaurants - Array de restaurantes
 * @param {number|null} userLat - Latitud del usuario
 * @param {number|null} userLng - Longitud del usuario
 * @returns {Promise<Array>} Array de restaurantes procesados
 */
const processRestaurantsForDashboard = async (restaurants, userLat, userLng) => {
  return restaurants.map(restaurant => {
    // Procesar branches para añadir isOpen y convertir números
    const processedBranches = restaurant.branches.map(branch => {
      const branchData = {
        ...branch,
        latitude: Number(branch.latitude),
        longitude: Number(branch.longitude),
        deliveryFee: Number(branch.deliveryFee),
        deliveryRadius: Number(branch.deliveryRadius),
        isOpen: calculateIsOpen(branch.schedule)
      };

      // Calcular distancia si se proporcionaron coordenadas
      if (userLat !== null && userLng !== null) {
        const distance = calculateDistance(
          { lat: userLat, lng: userLng },
          { lat: branchData.latitude, lng: branchData.longitude }
        );
        branchData.distance = Number(distance.toFixed(2));
      } else {
        branchData.distance = null;
      }

      return branchData;
    });

    // Un restaurante está abierto si AL MENOS UNA sucursal está abierta
    const restaurantIsOpen = processedBranches.some(branch => branch.isOpen);

    // Calcular distancia mínima del restaurante
    let minDistance = null;
    if (userLat !== null && userLng !== null && processedBranches.length > 0) {
      const distances = processedBranches
        .filter(branch => branch.distance !== null)
        .map(branch => branch.distance);
      
      if (distances.length > 0) {
        minDistance = Math.min(...distances);
      }
    }

    return {
      ...restaurant,
      rating: restaurant.rating ? Number(restaurant.rating) : 0,
      isOpen: restaurantIsOpen,
      branches: processedBranches,
      minDistance: minDistance,
      // Metadatos adicionales para el frontend
      deliveryTime: processedBranches.length > 0 ? 
        Math.round((processedBranches[0].estimatedDeliveryMin + processedBranches[0].estimatedDeliveryMax) / 2) : 30,
      minDeliveryFee: processedBranches.length > 0 ? 
        Math.min(...processedBranches.map(b => Number(b.deliveryFee))) : 25,
      // Información adicional útil
      isPromoted: false, // TODO: Implementar sistema de promociones
      estimatedWaitTime: 15, // TODO: Calcular basado en órdenes activas
      minOrderAmount: 0, // TODO: Configurar por restaurante
      paymentMethods: ['efectivo', 'tarjeta'], // TODO: Obtener de configuración
      deliveryZones: processedBranches.map(b => b.neighborhood || 'Zona de cobertura') // TODO: Mejorar
    };
  });
};

module.exports = {
  getHomeDashboard
};
