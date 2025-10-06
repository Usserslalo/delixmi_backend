const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Obtener el carrito del usuario autenticado
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscar todos los carritos del usuario
    const carts = await prisma.cart.findMany({
      where: {
        userId: userId
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            status: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                imageUrl: true,
                price: true,
                isAvailable: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    // Calcular totales para cada carrito
    const cartsWithTotals = carts.map(cart => {
      const subtotal = cart.items.reduce((sum, item) => {
        return sum + (Number(item.priceAtAdd) * item.quantity);
      }, 0);

      // Calcular tarifa de envío (simplificado - se puede hacer más complejo)
      const deliveryFee = subtotal > 0 ? 25.00 : 0;
      const total = subtotal + deliveryFee;

      return {
        id: cart.id,
        restaurant: cart.restaurant,
        items: cart.items.map(item => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          priceAtAdd: Number(item.priceAtAdd),
          subtotal: Number(item.priceAtAdd) * item.quantity,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        })),
        totals: {
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          total: total
        },
        itemCount: cart.items.length,
        totalQuantity: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      };
    });

    // Calcular total general
    const grandTotal = cartsWithTotals.reduce((sum, cart) => sum + cart.totals.total, 0);
    const totalItems = cartsWithTotals.reduce((sum, cart) => sum + cart.totalQuantity, 0);

    res.status(200).json({
      status: 'success',
      message: 'Carrito obtenido exitosamente',
      data: {
        carts: cartsWithTotals,
        summary: {
          totalCarts: cartsWithTotals.length,
          totalItems: totalItems,
          grandTotal: grandTotal
        },
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Agregar producto al carrito
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const addToCart = async (req, res) => {
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

    const userId = req.user.id;
    const { productId, quantity = 1 } = req.body;

    // 1. Verificar que el producto existe y está disponible
    const product = await prisma.product.findUnique({
      where: { id: productId },
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

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Producto no encontrado',
        code: 'PRODUCT_NOT_FOUND'
      });
    }

    if (!product.isAvailable) {
      return res.status(400).json({
        status: 'error',
        message: 'El producto no está disponible',
        code: 'PRODUCT_UNAVAILABLE'
      });
    }

    if (product.restaurant.status !== 'active') {
      return res.status(400).json({
        status: 'error',
        message: 'El restaurante no está activo',
        code: 'RESTAURANT_INACTIVE'
      });
    }

    // 2. Verificar si el usuario ya tiene un carrito para este restaurante
    let cart = await prisma.cart.findUnique({
      where: {
        userId_restaurantId: {
          userId: userId,
          restaurantId: product.restaurantId
        }
      }
    });

    // 3. Si no existe carrito, crear uno nuevo
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId,
          restaurantId: product.restaurantId
        }
      });
    }

    // 4. Verificar si el producto ya está en el carrito
    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: productId
        }
      }
    });

    if (existingItem) {
      // Actualizar cantidad del item existente
      const updatedItem = await prisma.cartItem.update({
        where: {
          id: existingItem.id
        },
        data: {
          quantity: existingItem.quantity + quantity
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              price: true,
              isAvailable: true
            }
          }
        }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Cantidad actualizada en el carrito',
        data: {
          cartItem: {
            id: updatedItem.id,
            product: updatedItem.product,
            quantity: updatedItem.quantity,
            priceAtAdd: Number(updatedItem.priceAtAdd),
            subtotal: Number(updatedItem.priceAtAdd) * updatedItem.quantity
          },
          action: 'quantity_updated'
        }
      });
    } else {
      // Crear nuevo item en el carrito
      const newItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
          priceAtAdd: product.price
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              imageUrl: true,
              price: true,
              isAvailable: true
            }
          }
        }
      });

      return res.status(201).json({
        status: 'success',
        message: 'Producto agregado al carrito exitosamente',
        data: {
          cartItem: {
            id: newItem.id,
            product: newItem.product,
            quantity: newItem.quantity,
            priceAtAdd: Number(newItem.priceAtAdd),
            subtotal: Number(newItem.priceAtAdd) * newItem.quantity
          },
          action: 'item_added'
        }
      });
    }

  } catch (error) {
    console.error('Error agregando al carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar cantidad de un item en el carrito
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const updateCartItem = async (req, res) => {
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

    const userId = req.user.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Verificar que el item pertenece al usuario
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: parseInt(itemId),
        cart: {
          userId: userId
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            isAvailable: true
          }
        }
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Item del carrito no encontrado',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    if (!cartItem.product.isAvailable) {
      return res.status(400).json({
        status: 'error',
        message: 'El producto ya no está disponible',
        code: 'PRODUCT_UNAVAILABLE'
      });
    }

    // Si la cantidad es 0, eliminar el item
    if (quantity === 0) {
      await prisma.cartItem.delete({
        where: { id: parseInt(itemId) }
      });

      return res.status(200).json({
        status: 'success',
        message: 'Producto eliminado del carrito',
        data: {
          action: 'item_removed',
          itemId: parseInt(itemId)
        }
      });
    }

    // Actualizar cantidad
    const updatedItem = await prisma.cartItem.update({
      where: { id: parseInt(itemId) },
      data: { quantity: quantity },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            imageUrl: true,
            price: true,
            isAvailable: true
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Cantidad actualizada exitosamente',
      data: {
        cartItem: {
          id: updatedItem.id,
          product: updatedItem.product,
          quantity: updatedItem.quantity,
          priceAtAdd: Number(updatedItem.priceAtAdd),
          subtotal: Number(updatedItem.priceAtAdd) * updatedItem.quantity
        },
        action: 'quantity_updated'
      }
    });

  } catch (error) {
    console.error('Error actualizando item del carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar item del carrito
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { itemId } = req.params;

    // Verificar que el item pertenece al usuario
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: parseInt(itemId),
        cart: {
          userId: userId
        }
      },
      include: {
        product: {
          select: {
            name: true
          }
        }
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        status: 'error',
        message: 'Item del carrito no encontrado',
        code: 'CART_ITEM_NOT_FOUND'
      });
    }

    // Eliminar el item
    await prisma.cartItem.delete({
      where: { id: parseInt(itemId) }
    });

    res.status(200).json({
      status: 'success',
      message: 'Producto eliminado del carrito exitosamente',
      data: {
        removedItem: {
          id: parseInt(itemId),
          productName: cartItem.product.name
        },
        action: 'item_removed'
      }
    });

  } catch (error) {
    console.error('Error eliminando del carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Limpiar carrito completo
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.query;

    let whereClause = { userId: userId };
    
    // Si se especifica restaurantId, limpiar solo ese carrito
    if (restaurantId) {
      whereClause.restaurantId = parseInt(restaurantId);
    }

    // Encontrar carritos a eliminar
    const cartsToDelete = await prisma.cart.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (cartsToDelete.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'No se encontraron carritos para limpiar',
        code: 'NO_CARTS_FOUND'
      });
    }

    // Eliminar carritos (los items se eliminan por cascade)
    await prisma.cart.deleteMany({
      where: whereClause
    });

    // Preparar respuesta
    const deletedItems = cartsToDelete.reduce((total, cart) => total + cart.items.length, 0);

    res.status(200).json({
      status: 'success',
      message: restaurantId 
        ? 'Carrito del restaurante limpiado exitosamente'
        : 'Todos los carritos limpiados exitosamente',
      data: {
        deletedCarts: cartsToDelete.length,
        deletedItems: deletedItems,
        restaurants: cartsToDelete.map(cart => ({
          id: cart.restaurantId,
          name: cart.restaurant.name
        })),
        action: 'cart_cleared'
      }
    });

  } catch (error) {
    console.error('Error limpiando carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener resumen del carrito (conteo de items y total)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const getCartSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    // Obtener conteo de items y totales
    const carts = await prisma.cart.findMany({
      where: {
        userId: userId
      },
      include: {
        items: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    // Calcular resumen
    let totalItems = 0;
    let totalQuantity = 0;
    let grandTotal = 0;
    let activeRestaurants = 0;

    carts.forEach(cart => {
      if (cart.restaurant.status === 'active') {
        activeRestaurants++;
        cart.items.forEach(item => {
          totalItems++;
          totalQuantity += item.quantity;
          grandTotal += Number(item.priceAtAdd) * item.quantity;
        });
      }
    });

    // Agregar tarifa de envío estimada
    const estimatedDeliveryFee = totalQuantity > 0 ? 25.00 : 0;
    const estimatedTotal = grandTotal + estimatedDeliveryFee;

    res.status(200).json({
      status: 'success',
      message: 'Resumen del carrito obtenido exitosamente',
      data: {
        summary: {
          totalCarts: carts.length,
          activeRestaurants: activeRestaurants,
          totalItems: totalItems,
          totalQuantity: totalQuantity,
          subtotal: grandTotal,
          estimatedDeliveryFee: estimatedDeliveryFee,
          estimatedTotal: estimatedTotal
        },
        retrievedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error obteniendo resumen del carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Validar carrito antes del checkout
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const validateCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { restaurantId } = req.body;

    // Obtener carrito específico o todos los carritos
    let whereClause = { userId: userId };
    if (restaurantId) {
      whereClause.restaurantId = parseInt(restaurantId);
    }

    const carts = await prisma.cart.findMany({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                isAvailable: true,
                restaurant: {
                  select: {
                    id: true,
                    name: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const validationResults = [];
    let isValid = true;
    let totalItems = 0;
    let totalValue = 0;

    carts.forEach(cart => {
      const cartValidation = {
        cartId: cart.id,
        restaurant: cart.restaurant,
        items: [],
        isValid: true,
        issues: []
      };

      // Validar estado del restaurante
      if (cart.restaurant.status !== 'active') {
        cartValidation.isValid = false;
        cartValidation.issues.push({
          type: 'restaurant_inactive',
          message: 'El restaurante no está activo'
        });
        isValid = false;
      }

      cart.items.forEach(item => {
        const itemValidation = {
          itemId: item.id,
          product: item.product,
          quantity: item.quantity,
          priceAtAdd: Number(item.priceAtAdd),
          currentPrice: Number(item.product.price),
          isValid: true,
          issues: []
        };

        // Validar disponibilidad del producto
        if (!item.product.isAvailable) {
          itemValidation.isValid = false;
          itemValidation.issues.push({
            type: 'product_unavailable',
            message: 'El producto ya no está disponible'
          });
          cartValidation.isValid = false;
          isValid = false;
        }

        // Validar estado del restaurante del producto
        if (item.product.restaurant.status !== 'active') {
          itemValidation.isValid = false;
          itemValidation.issues.push({
            type: 'product_restaurant_inactive',
            message: 'El restaurante del producto no está activo'
          });
          cartValidation.isValid = false;
          isValid = false;
        }

        // Verificar cambio de precio
        if (Number(item.priceAtAdd) !== Number(item.product.price)) {
          itemValidation.issues.push({
            type: 'price_changed',
            message: `El precio cambió de $${item.priceAtAdd} a $${item.product.price}`,
            oldPrice: Number(item.priceAtAdd),
            newPrice: Number(item.product.price)
          });
        }

        cartValidation.items.push(itemValidation);
        
        if (itemValidation.isValid) {
          totalItems++;
          totalValue += Number(item.priceAtAdd) * item.quantity;
        }
      });

      validationResults.push(cartValidation);
    });

    res.status(200).json({
      status: 'success',
      message: 'Validación del carrito completada',
      data: {
        isValid: isValid,
        validationResults: validationResults,
        summary: {
          totalCarts: carts.length,
          validItems: totalItems,
          totalValue: totalValue,
          issuesFound: validationResults.reduce((total, cart) => total + cart.issues.length, 0)
        },
        validatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error validando carrito:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartSummary,
  validateCart
};
