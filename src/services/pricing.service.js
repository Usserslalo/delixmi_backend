const { calculateDistance, calculateDeliveryFee } = require('../config/maps');
const { logger } = require('../config/logger');

class PricingService {
  /**
   * Redondea un número a 2 decimales para cálculos monetarios
   * @param {number} num - Número a redondear
   * @returns {number} Número redondeado a 2 decimales
   */
  static roundToTwoDecimals(num) {
    return Math.round(num * 100) / 100;
  }

  /**
   * Calcula los precios de una orden de manera centralizada
   * @param {Array} items - Items del pedido con productId, quantity, y opcionalmente priceAtAdd
   * @param {Array} products - Productos obtenidos de la base de datos
   * @param {Object} branch - Sucursal del restaurante
   * @param {Object} address - Dirección de entrega
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Promise<Object>} Objeto con subtotal, deliveryFee, serviceFee, total y deliveryDetails
   */
  static async calculateOrderPricing(items, products, branch, address, requestId) {
    try {
      logger.info('Iniciando cálculo de precios de orden', {
        requestId,
        meta: {
          itemsCount: items.length,
          branchId: branch.id,
          addressId: address.id
        }
      });

      // 1. Calcular subtotal
      let subtotal = 0;
      
      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }
        
        // Usar priceAtAdd que incluye modificadores, o product.price como fallback
        const itemPrice = item.priceAtAdd ? Number(item.priceAtAdd) : Number(product.price);
        const itemTotal = itemPrice * item.quantity;
        subtotal += itemTotal;
      }

      // Redondear subtotal a 2 decimales
      subtotal = this.roundToTwoDecimals(subtotal);

      // 2. Calcular tarifa de envío dinámicamente basada en distancia
      let deliveryFee = 25.00; // Valor por defecto en caso de error
      let deliveryDetails = null;
      let travelTimeMinutes = 0;

      try {
        // Obtener coordenadas de la dirección de entrega
        const destinationCoords = {
          latitude: Number(address.latitude),
          longitude: Number(address.longitude)
        };

        // Obtener coordenadas de la sucursal
        const originCoords = {
          latitude: Number(branch.latitude),
          longitude: Number(branch.longitude)
        };

        // Calcular distancia usando Google Maps
        const distanceResult = await calculateDistance(originCoords, destinationCoords);
        
        // Calcular tarifa de envío basada en la distancia
        const feeCalculation = calculateDeliveryFee(distanceResult.distance);
        deliveryFee = feeCalculation.tarifaFinal;
        travelTimeMinutes = distanceResult.duration;
        
        deliveryDetails = {
          distance: distanceResult.distance,
          duration: distanceResult.duration,
          distanceText: distanceResult.distanceText,
          durationText: distanceResult.durationText,
          calculation: feeCalculation,
          isDefault: distanceResult.isDefault || false
        };

        logger.info('Cálculo de tarifa de envío completado', {
          requestId,
          meta: {
            origin: `${originCoords.latitude}, ${originCoords.longitude}`,
            destination: `${destinationCoords.latitude}, ${destinationCoords.longitude}`,
            distance: distanceResult.distance,
            deliveryFee: deliveryFee,
            travelTimeMinutes: travelTimeMinutes,
            isDefault: distanceResult.isDefault
          }
        });
      } catch (error) {
        logger.error('Error calculando tarifa de envío', {
          requestId,
          meta: {
            error: error.message,
            branchId: branch.id,
            addressId: address.id
          }
        });
        
        logger.warn('Usando valores por defecto debido a error', {
          requestId,
          meta: { error: error.message }
        });
        
        deliveryDetails = {
          isDefault: true,
          error: error.message
        };
      }

      // Redondear deliveryFee a 2 decimales
      deliveryFee = this.roundToTwoDecimals(deliveryFee);

      // 3. Calcular cuota de servicio (5% del subtotal ya redondeado)
      const serviceFee = this.roundToTwoDecimals(subtotal * 0.05);
      
      // 4. Calcular total (suma de componentes ya redondeados, y redondear el resultado)
      const total = this.roundToTwoDecimals(subtotal + deliveryFee + serviceFee);

      logger.info('Cálculo de precios completado', {
        requestId,
        meta: {
          subtotal: subtotal.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          serviceFee: serviceFee.toFixed(2),
          total: total.toFixed(2),
          itemsCount: items.length,
          note: 'Todos los valores redondeados a 2 decimales'
        }
      });

      return {
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        deliveryDetails,
        travelTimeMinutes
      };

    } catch (error) {
      logger.error('Error en cálculo de precios', {
        requestId,
        meta: {
          error: error.message,
          stack: error.stack,
          itemsCount: items.length,
          branchId: branch.id,
          addressId: address.id
        }
      });
      throw error;
    }
  }

  /**
   * Calcula el tiempo estimado de entrega basado en tiempo de viaje y preparación
   * @param {number} travelTimeMinutes - Tiempo de viaje en minutos (desde Google Maps)
   * @param {number} itemCount - Número de productos en el pedido
   * @param {string} restaurantName - Nombre del restaurante (para logging)
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {Object} Objeto con información del tiempo estimado
   */
  static calculateEstimatedDeliveryTime(travelTimeMinutes, itemCount, restaurantName, requestId) {
    try {
      // Tiempo base de preparación (15-25 minutos)
      const basePreparationTime = 20; // 20 minutos como promedio
      
      // Ajuste basado en la cantidad de productos
      // Más productos = más tiempo de preparación
      let preparationTimeAdjustment = 0;
      if (itemCount > 3) {
        preparationTimeAdjustment = Math.ceil((itemCount - 3) * 2); // +2 minutos por producto adicional
      }
      
      const totalPreparationTime = basePreparationTime + preparationTimeAdjustment;
      
      // Si no tenemos datos de viaje, usar tiempo por defecto
      const effectiveTravelTime = travelTimeMinutes > 0 ? travelTimeMinutes : 15; // 15 min por defecto
      
      // Calcular rangos de tiempo
      const minTotalTime = totalPreparationTime + effectiveTravelTime;
      const maxTotalTime = minTotalTime + 10; // Agregar 10 minutos de buffer
      
      // Convertir a formato legible
      const formatTimeRange = (min, max) => {
        if (min === max) {
          return `${min} min`;
        }
        return `${min}-${max} min`;
      };
      
      const timeRange = formatTimeRange(minTotalTime, maxTotalTime);
      
      // Calcular tiempo estimado de entrega (timestamp)
      const now = new Date();
      const estimatedDeliveryTime = new Date(now.getTime() + (maxTotalTime * 60 * 1000));
      
      const result = {
        timeRange: timeRange,
        minMinutes: minTotalTime,
        maxMinutes: maxTotalTime,
        preparationTime: {
          base: basePreparationTime,
          adjustment: preparationTimeAdjustment,
          total: totalPreparationTime
        },
        travelTime: effectiveTravelTime,
        estimatedDeliveryAt: estimatedDeliveryTime.toISOString(),
        breakdown: {
          preparation: `${totalPreparationTime} min`,
          travel: `${effectiveTravelTime} min`,
          buffer: '10 min',
          total: timeRange
        }
      };
      
      logger.info('Tiempo estimado calculado', {
        requestId,
        meta: {
          restaurantName,
          itemCount,
          preparationTime: result.preparationTime,
          travelTime: effectiveTravelTime,
          timeRange: timeRange,
          estimatedDeliveryAt: estimatedDeliveryTime.toLocaleString()
        }
      });
      
      return result;

    } catch (error) {
      logger.error('Error calculando tiempo estimado de entrega', {
        requestId,
        meta: {
          error: error.message,
          travelTimeMinutes,
          itemCount,
          restaurantName
        }
      });
      throw error;
    }
  }

  /**
   * Valida que los precios calculados sean consistentes
   * @param {Object} pricing - Objeto con los precios calculados
   * @param {string} [requestId] - ID de la solicitud para logging
   * @returns {boolean} True si los precios son válidos
   */
  static validatePricing(pricing, requestId) {
    try {
      const { subtotal, deliveryFee, serviceFee, total } = pricing;
      
      // Verificar que todos los valores sean números positivos
      if (subtotal < 0 || deliveryFee < 0 || serviceFee < 0 || total < 0) {
        logger.error('Precios negativos detectados', {
          requestId,
          meta: { subtotal, deliveryFee, serviceFee, total }
        });
        return false;
      }
      
      // Verificar que el total sea consistente
      const calculatedTotal = this.roundToTwoDecimals(subtotal + deliveryFee + serviceFee);
      if (Math.abs(calculatedTotal - total) > 0.01) { // Tolerancia de 1 centavo
        logger.error('Inconsistencia en cálculo de total', {
          requestId,
          meta: {
            calculatedTotal,
            providedTotal: total,
            difference: Math.abs(calculatedTotal - total)
          }
        });
        return false;
      }
      
      logger.debug('Validación de precios exitosa', {
        requestId,
        meta: { subtotal, deliveryFee, serviceFee, total }
      });
      
      return true;

    } catch (error) {
      logger.error('Error validando precios', {
        requestId,
        meta: {
          error: error.message,
          pricing
        }
      });
      return false;
    }
  }
}

module.exports = PricingService;
