const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Controlador para obtener todas las categorías disponibles
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCategories = async (req, res) => {
  try {
    console.log('📂 Obteniendo categorías...');

    // Obtener todas las categorías con sus subcategorías
    const categories = await prisma.category.findMany({
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

    console.log(`✅ ${categories.length} categorías encontradas`);

    res.status(200).json({
      status: 'success',
      message: 'Categorías obtenidas exitosamente',
      data: {
        categories: categories
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener categorías',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Controlador para obtener una categoría específica por ID
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el ID sea un número
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'El ID de la categoría debe ser un número válido'
      });
    }

    console.log(`📂 Obteniendo categoría ID: ${id}`);

    // Obtener la categoría con sus subcategorías
    const category = await prisma.category.findFirst({
      where: {
        id: parseInt(id)
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

    if (!category) {
      return res.status(404).json({
        status: 'error',
        message: 'Categoría no encontrada'
      });
    }

    console.log(`✅ Categoría encontrada: ${category.name}`);

    res.status(200).json({
      status: 'success',
      message: 'Categoría obtenida exitosamente',
      data: {
        category: category
      }
    });

  } catch (error) {
    console.error('❌ Error al obtener categoría por ID:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener la categoría',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById
};
