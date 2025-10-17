const { PrismaClient } = require('@prisma/client');
const cacheService = require('../services/cache.service');
const ResponseService = require('../services/response.service');
const { logger } = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Función auxiliar para obtener emoji basado en el nombre de la categoría
 * @param {string} categoryName - Nombre de la categoría
 * @returns {string} Emoji correspondiente
 */
const getCategoryEmoji = (categoryName) => {
  const emojiMap = {
    // Comida mexicana
    'Mexicana': '🌮',
    'Tacos': '🌮',
    'Mexican Food': '🌮',
    
    // Pizza
    'Pizza': '🍕',
    'Pizzas': '🍕',
    'Pizzería': '🍕',
    
    // Hamburguesas
    'Hamburguesas': '🍔',
    'Burgers': '🍔',
    'Hamburgers': '🍔',
    
    // Comida china
    'China': '🥡',
    'Chinese': '🥡',
    'Comida China': '🥡',
    
    // Sushi
    'Sushi': '🍣',
    'Japanese': '🍣',
    'Japonesa': '🍣',
    
    // Pollo
    'Pollo': '🍗',
    'Chicken': '🍗',
    'Pollo Frito': '🍗',
    
    // Comida italiana
    'Italiana': '🍝',
    'Italian': '🍝',
    'Pasta': '🍝',
    
    // Mariscos
    'Mariscos': '🦐',
    'Seafood': '🦐',
    'Pescado': '🐟',
    
    // Vegetariana
    'Vegetariana': '🥗',
    'Vegetarian': '🥗',
    'Vegana': '🌱',
    'Vegan': '🌱',
    
    // Postres
    'Postres': '🍰',
    'Desserts': '🍰',
    'Dulces': '🍭',
    
    // Bebidas
    'Bebidas': '🥤',
    'Drinks': '🥤',
    'Café': '☕',
    'Coffee': '☕',
    
    // Desayunos
    'Desayunos': '🥞',
    'Breakfast': '🥞',
    
    // Comida rápida
    'Rápida': '⚡',
    'Fast Food': '⚡',
    'Comida Rápida': '⚡',
    
    // Buffet
    'Buffet': '🍽️',
    'All You Can Eat': '🍽️',
    
    // Barbacoa
    'Barbacoa': '🥩',
    'BBQ': '🥩',
    'Asados': '🥩',
    
    // Sandwich
    'Sandwich': '🥪',
    'Sandwiches': '🥪',
    
    // Comida india
    'India': '🍛',
    'Indian': '🍛',
    
    // Comida tailandesa
    'Tailandesa': '🍜',
    'Thai': '🍜',
    
    // Comida coreana
    'Coreana': '🍲',
    'Korean': '🍲',
    
    // Comida árabe
    'Árabe': '🥙',
    'Arabic': '🥙',
    'Mediterránea': '🥙',
    
    // Por defecto
    'default': '🍽️'
  };

  // Buscar emoji por coincidencia exacta o parcial
  const lowerCategoryName = categoryName.toLowerCase();
  
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (lowerCategoryName.includes(key.toLowerCase()) || 
        categoryName.toLowerCase().includes(key.toLowerCase())) {
      return emoji;
    }
  }
  
  return emojiMap.default;
};

/**
 * Controlador para obtener todas las categorías disponibles
 * Implementa caché en memoria para optimizar consultas frecuentes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCategories = async (req, res) => {
  try {
    const cacheKey = 'categories:all';
    const requestId = req.id;

    logger.info('Consultando categorías', {
      requestId,
      meta: { cacheKey }
    });

    // 1. Intentar obtener datos del caché primero
    let categories = cacheService.get(cacheKey);
    let cacheHit = false;

    if (categories) {
      // Cache HIT - Datos encontrados en caché
      cacheHit = true;
      logger.info('Cache HIT - Categorías obtenidas del caché', {
        requestId,
        meta: { 
          cacheKey, 
          categoriesCount: categories.length,
          cacheStats: cacheService.getStats()
        }
      });
    } else {
      // Cache MISS - Datos no encontrados en caché, consultar base de datos
      logger.info('Cache MISS - Consultando base de datos', {
        requestId,
        meta: { cacheKey }
      });

      // Obtener todas las categorías con sus subcategorías
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
              restaurantId: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
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

      // Agregar emojis a las categorías (MANTENER CAMPOS ORIGINALES)
      categories = categories.map(category => ({
        ...category,
        // CAMPOS ORIGINALES (MANTENER COMPATIBILIDAD)
        name: category.name,              // ✅ Campo existente en frontend
        emoji: getCategoryEmoji(category.name), // ✅ Campo existente en frontend
        isActive: true,                   // ✅ Campo existente en frontend
        // CAMPOS NUEVOS (OPCIONALES - NO ROMPEN COMPATIBILIDAD)
        displayName: category.name,       // 🆕 Campo nuevo (alias de name)
        restaurantCount: category.subcategories.length // 🆕 Campo nuevo
      }));

      // Almacenar en caché por 1 hora (3600 segundos)
      const cacheStored = cacheService.set(cacheKey, categories, 3600);
      
      if (cacheStored) {
        logger.info('Datos almacenados en caché exitosamente', {
          requestId,
          meta: { 
            cacheKey, 
            categoriesCount: categories.length,
            ttl: '3600 segundos (1 hora)'
          }
        });
      } else {
        logger.warn('Error almacenando datos en caché', {
          requestId,
          meta: { cacheKey }
        });
      }
    }

    // 2. Respuesta exitosa
    return ResponseService.success(
      res,
      'Categorías obtenidas exitosamente',
      {
        categories: categories,
        cache: {
          hit: cacheHit,
          key: cacheKey,
          stats: cacheService.getStats()
        }
      }
    );

  } catch (error) {
    logger.error('Error obteniendo categorías', {
      requestId: req.id,
      meta: {
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res, 
      'Error interno del servidor al obtener categorías'
    );
  }
};

/**
 * Controlador para obtener una categoría específica por ID
 * Implementa caché en memoria para optimizar consultas frecuentes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const requestId = req.id;
    
    // Validar que el ID sea un número
    if (isNaN(id)) {
      return ResponseService.badRequest(
        res, 
        'El ID de la categoría debe ser un número válido'
      );
    }

    const categoryId = parseInt(id);
    const cacheKey = `category:${categoryId}`;

    logger.info('Consultando categoría por ID', {
      requestId,
      meta: { categoryId, cacheKey }
    });

    // 1. Intentar obtener datos del caché primero
    let category = cacheService.get(cacheKey);
    let cacheHit = false;

    if (category) {
      // Cache HIT - Datos encontrados en caché
      cacheHit = true;
      logger.info('Cache HIT - Categoría obtenida del caché', {
        requestId,
        meta: { 
          categoryId, 
          cacheKey,
          categoryName: category.name,
          cacheStats: cacheService.getStats()
        }
      });
    } else {
      // Cache MISS - Datos no encontrados en caché, consultar base de datos
      logger.info('Cache MISS - Consultando base de datos', {
        requestId,
        meta: { categoryId, cacheKey }
      });

      // Obtener la categoría con sus subcategorías
      category = await prisma.category.findFirst({
        where: {
          id: categoryId
        },
        select: {
          id: true,
          name: true,
          imageUrl: true,
          subcategories: {
            select: {
              id: true,
              name: true,
              displayOrder: true,
              restaurantId: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: {
              displayOrder: 'asc'
            }
          }
        }
      });

      if (category) {
        // Agregar emoji y metadatos (MANTENER CAMPOS ORIGINALES)
        category = {
          ...category,
          // CAMPOS ORIGINALES (MANTENER COMPATIBILIDAD)
          name: category.name,              // ✅ Campo existente en frontend
          emoji: getCategoryEmoji(category.name), // ✅ Campo existente en frontend
          isActive: true,                   // ✅ Campo existente en frontend
          // CAMPOS NUEVOS (OPCIONALES - NO ROMPEN COMPATIBILIDAD)
          displayName: category.name,       // 🆕 Campo nuevo (alias de name)
          restaurantCount: category.subcategories.length // 🆕 Campo nuevo
        };
      }

      if (!category) {
        return ResponseService.notFound(
          res, 
          'Categoría no encontrada'
        );
      }

      // Almacenar en caché por 30 minutos (1800 segundos)
      const cacheStored = cacheService.set(cacheKey, category, 1800);
      
      if (cacheStored) {
        logger.info('Categoría almacenada en caché exitosamente', {
          requestId,
          meta: { 
            categoryId, 
            cacheKey, 
            categoryName: category.name,
            ttl: '1800 segundos (30 minutos)'
          }
        });
      } else {
        logger.warn('Error almacenando categoría en caché', {
          requestId,
          meta: { categoryId, cacheKey }
        });
      }
    }

    // 2. Respuesta exitosa
    return ResponseService.success(
      res,
      'Categoría obtenida exitosamente',
      {
        category: category,
        cache: {
          hit: cacheHit,
          key: cacheKey,
          stats: cacheService.getStats()
        }
      }
    );

  } catch (error) {
    logger.error('Error obteniendo categoría por ID', {
      requestId: req.id,
      meta: {
        categoryId: req.params.id,
        error: error.message,
        stack: error.stack
      }
    });
    
    return ResponseService.internalError(
      res, 
      'Error interno del servidor al obtener la categoría'
    );
  }
};

module.exports = {
  getCategories,
  getCategoryById
};
