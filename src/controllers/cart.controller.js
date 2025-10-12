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
            },
            modifiers: {
              include: {
                modifierOption: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    modifierGroup: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
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
          modifiers: item.modifiers.map(mod => ({
            id: mod.modifierOption.id,
            name: mod.modifierOption.name,
            price: Number(mod.modifierOption.price),
            group: mod.modifierOption.modifierGroup
          })),
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
    const { productId, quantity = 1, modifiers = [] } = req.body;

    // Extraer IDs de opciones de modificadores del nuevo formato
    const modifierOptionIds = modifiers.map(mod => mod.selectedOptionId);

    console.log('📝 Agregar al carrito:', {
      userId,
      productId,
      quantity,
      modifiers,
      modifierOptionIds
    });

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

    // 2. Obtener grupos de modificadores asociados al producto
    const productModifierGroups = await prisma.productModifier.findMany({
      where: {
        productId: productId
      },
      include: {
        modifierGroup: {
          include: {
            options: true
          }
        }
      }
    });

    // 3. Verificar si el usuario ya tiene un carrito para este restaurante
    let cart = await prisma.cart.findUnique({
      where: {
        userId_restaurantId: {
          userId: userId,
          restaurantId: product.restaurantId
        }
      }
    });

    // Si no existe carrito, crear uno nuevo
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: userId,
          restaurantId: product.restaurantId
        }
      });
    }

    // 4. Validar modificadores si se proporcionan
    let modifierOptions = [];
    let totalModifierPrice = 0;
    
    if (modifierOptionIds && modifierOptionIds.length > 0) {
      // Verificar que los modificadores existen y pertenecen al restaurante correcto
      modifierOptions = await prisma.modifierOption.findMany({
        where: {
          id: { in: modifierOptionIds },
          modifierGroup: {
            restaurantId: product.restaurantId
          }
        },
        include: {
          modifierGroup: {
            select: {
              id: true,
              name: true,
              minSelection: true,
              maxSelection: true
            }
          }
        }
      });

      if (modifierOptions.length !== modifierOptionIds.length) {
        return res.status(400).json({
          status: 'error',
          message: 'Algunos modificadores no son válidos para este producto',
          code: 'INVALID_MODIFIERS'
        });
      }

      // Calcular precio total de modificadores
      totalModifierPrice = modifierOptions.reduce((sum, option) => sum + Number(option.price), 0);
    }

    // 5. Validar que los modificadores enviados correspondan a los grupos correctos
    if (modifiers.length > 0) {
      for (const modifier of modifiers) {
        const { modifierGroupId, selectedOptionId } = modifier;
        
        // Verificar que el grupo existe en el producto
        const productGroup = productModifierGroups.find(pg => pg.modifierGroup.id === modifierGroupId);
        if (!productGroup) {
          return res.status(400).json({
            status: 'error',
            message: `El grupo de modificadores ${modifierGroupId} no pertenece a este producto`,
            code: 'INVALID_MODIFIER_GROUP'
          });
        }
        
        // Verificar que la opción seleccionada pertenece al grupo correcto
        const option = modifierOptions.find(opt => opt.id === selectedOptionId);
        if (!option) {
          return res.status(400).json({
            status: 'error',
            message: `La opción ${selectedOptionId} no existe`,
            code: 'INVALID_MODIFIER_OPTION'
          });
        }
        
        if (option.modifierGroup.id !== modifierGroupId) {
          return res.status(400).json({
            status: 'error',
            message: `La opción ${selectedOptionId} no pertenece al grupo ${modifierGroupId}`,
            code: 'MODIFIER_GROUP_MISMATCH',
            details: {
              expectedGroupId: modifierGroupId,
              actualGroupId: option.modifierGroup.id,
              optionName: option.name,
              groupName: option.modifierGroup.name
            }
          });
        }
      }
    }

    // 6. Validar que se cumplan los requisitos de selección de modificadores REQUERIDOS
    const requiredGroups = productModifierGroups.filter(pg => pg.modifierGroup.minSelection > 0);
    
    if (requiredGroups.length > 0) {
      // Agrupar modificadores seleccionados por grupo
      const selectedModifiersByGroup = {};
      modifierOptions.forEach(option => {
        const groupId = option.modifierGroup.id;
        if (!selectedModifiersByGroup[groupId]) {
          selectedModifiersByGroup[groupId] = [];
        }
        selectedModifiersByGroup[groupId].push(option);
      });

      // Verificar cada grupo requerido
      const missingGroups = [];
      const invalidSelectionGroups = [];

      for (const pg of requiredGroups) {
        const groupId = pg.modifierGroup.id;
        const groupName = pg.modifierGroup.name;
        const minSelection = pg.modifierGroup.minSelection;
        const maxSelection = pg.modifierGroup.maxSelection;
        
        const selectedCount = selectedModifiersByGroup[groupId]?.length || 0;

        // Validar selección mínima
        if (selectedCount < minSelection) {
          missingGroups.push({
            groupId: groupId,
            groupName: groupName,
            minRequired: minSelection,
            maxAllowed: maxSelection,
            selected: selectedCount
          });
        }

        // Validar selección máxima
        if (selectedCount > maxSelection) {
          invalidSelectionGroups.push({
            groupId: groupId,
            groupName: groupName,
            minRequired: minSelection,
            maxAllowed: maxSelection,
            selected: selectedCount
          });
        }
      }

      // Si hay grupos con selecciones faltantes o inválidas
      if (missingGroups.length > 0 || invalidSelectionGroups.length > 0) {
        const errorDetails = {
          productId: productId,
          productName: product.name,
          errors: []
        };

        if (missingGroups.length > 0) {
          errorDetails.errors.push({
            type: 'MISSING_REQUIRED_MODIFIERS',
            message: 'Faltan modificadores requeridos',
            groups: missingGroups
          });
        }

        if (invalidSelectionGroups.length > 0) {
          errorDetails.errors.push({
            type: 'INVALID_MODIFIER_SELECTION',
            message: 'Selección de modificadores fuera de rango permitido',
            groups: invalidSelectionGroups
          });
        }

        return res.status(400).json({
          status: 'error',
          message: 'Este producto requiere que selecciones modificadores antes de agregarlo al carrito',
          code: 'MODIFIERS_REQUIRED',
          details: errorDetails
        });
      }
    }

    // 7. Validar que los modificadores seleccionados pertenecen a grupos del producto
    // (Esta validación ya se hizo en el paso 5, así que podemos omitirla o dejarla como doble validación)
    if (modifierOptions.length > 0) {
      const validGroupIds = productModifierGroups.map(pg => pg.modifierGroup.id);
      const invalidModifiers = modifierOptions.filter(
        option => !validGroupIds.includes(option.modifierGroup.id)
      );

      if (invalidModifiers.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Algunos modificadores no pertenecen a este producto',
          code: 'INVALID_PRODUCT_MODIFIERS',
          details: {
            invalidModifiers: invalidModifiers.map(m => ({
              id: m.id,
              name: m.name,
              groupName: m.modifierGroup.name
            }))
          }
        });
      }
    }

    // 8. Calcular precio total del item
    const totalItemPrice = Number(product.price) + totalModifierPrice;
    
    // 9. Verificar si ya existe un item idéntico en el carrito
    // Para productos sin modificadores, buscamos solo por productId
    // Para productos con modificadores, necesitamos verificar que tengan exactamente los mismos modificadores
    let existingItem = null;
    
    if (modifierOptions.length === 0) {
      // Producto sin modificadores - buscar por productId únicamente
      existingItem = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          productId: productId,
          modifiers: {
            none: {} // No debe tener modificadores
          }
        },
        include: {
          modifiers: true
        }
      });
    } else {
      // Producto con modificadores - buscar por productId y modificadores exactos
      const existingItems = await prisma.cartItem.findMany({
        where: {
          cartId: cart.id,
          productId: productId
        },
        include: {
          modifiers: {
            include: {
              modifierOption: true
            }
          }
        }
      });
      
      // Verificar si existe un item con exactamente los mismos modificadores
      for (const item of existingItems) {
        const itemModifierIds = item.modifiers.map(mod => mod.modifierOptionId).sort();
        const requestedModifierIds = modifierOptionIds.sort();
        
        if (itemModifierIds.length === requestedModifierIds.length &&
            itemModifierIds.every((id, index) => id === requestedModifierIds[index])) {
          existingItem = item;
          break;
        }
      }
    }

    let cartItem;
    let action;

    if (existingItem) {
      // 10a. Si existe item idéntico, actualizar cantidad
      cartItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
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
          },
          modifiers: {
            include: {
              modifierOption: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  modifierGroup: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });
      action = 'quantity_updated';
    } else {
      // 10b. Si no existe, crear nuevo item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
          priceAtAdd: totalItemPrice
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
          },
          modifiers: {
            include: {
              modifierOption: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  modifierGroup: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // 11. Crear registros de modificadores si existen
      if (modifierOptions.length > 0) {
        await prisma.cartItemModifier.createMany({
          data: modifierOptions.map(option => ({
            cartItemId: cartItem.id,
            modifierOptionId: option.id
          }))
        });

        // Obtener el item actualizado con modificadores
        cartItem = await prisma.cartItem.findUnique({
          where: { id: cartItem.id },
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
            },
            modifiers: {
              include: {
                modifierOption: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    modifierGroup: {
                      select: {
                        id: true,
                        name: true
                      }
                    }
                  }
                }
              }
            }
          }
        });
      }
      action = 'item_added';
    }

    // 12. Calcular subtotal
    const subtotal = Number(cartItem.priceAtAdd) * cartItem.quantity;

    return res.status(action === 'item_added' ? 201 : 200).json({
      status: 'success',
      message: action === 'item_added' 
        ? 'Producto agregado al carrito exitosamente'
        : 'Cantidad actualizada en el carrito',
      data: {
        cartItem: {
          id: cartItem.id,
          product: cartItem.product,
          quantity: cartItem.quantity,
          priceAtAdd: Number(cartItem.priceAtAdd),
          subtotal: subtotal,
          modifiers: cartItem.modifiers.map(mod => ({
            id: mod.modifierOption.id,
            name: mod.modifierOption.name,
            price: Number(mod.modifierOption.price),
            group: mod.modifierOption.modifierGroup
          }))
        },
        action: action
      }
    });

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
