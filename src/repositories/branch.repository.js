const { prisma } = require('../config/database');
const UserService = require('../services/user.service');
const { logger } = require('../config/logger');

/**
 * Repositorio para manejar operaciones de sucursales
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class BranchRepository {
  
  /**
   * Busca la sucursal principal (única) asociada a un restaurante
   * @param {number} restaurantId - ID del restaurante
   * @returns {Promise<Object|null>} Sucursal encontrada o null
   */
  static async findPrimaryBranchByRestaurantId(restaurantId) {
    return await prisma.branch.findFirst({
      where: {
        restaurantId: restaurantId,
        status: 'active'
      },
      select: {
        id: true,
        restaurantId: true,
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
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });
  }

  /**
   * Actualiza los detalles operativos de la sucursal principal
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} updateData - Datos a actualizar (validados por Zod)
   * @param {number} ownerUserId - ID del usuario owner
   * @param {string} requestId - ID de la request para logging
   * @returns {Promise<Object>} Sucursal actualizada con campos modificados
   */
  static async updatePrimaryBranchDetails(restaurantId, updateData, ownerUserId, requestId) {
    try {
      logger.debug('Iniciando actualización de detalles de sucursal principal', {
        requestId,
        meta: { restaurantId, updateData, ownerUserId }
      });

      // 1. Buscar la sucursal principal
      const primaryBranch = await this.findPrimaryBranchByRestaurantId(restaurantId);

      if (!primaryBranch) {
        throw {
          status: 404,
          message: 'Sucursal principal no encontrada',
          code: 'PRIMARY_BRANCH_NOT_FOUND',
          details: { restaurantId }
        };
      }

      logger.debug('Sucursal principal encontrada', {
        requestId,
        meta: { branchId: primaryBranch.id, restaurantId }
      });

      // 2. Validación de tiempos de entrega (considerando valores existentes)
      const finalMinTime = updateData.estimatedDeliveryMin !== undefined 
        ? updateData.estimatedDeliveryMin 
        : primaryBranch.estimatedDeliveryMin;
      
      const finalMaxTime = updateData.estimatedDeliveryMax !== undefined 
        ? updateData.estimatedDeliveryMax 
        : primaryBranch.estimatedDeliveryMax;

      if (finalMinTime >= finalMaxTime) {
        throw {
          status: 400,
          message: 'El tiempo mínimo de entrega debe ser menor que el tiempo máximo',
          code: 'INVALID_DELIVERY_TIMES',
          details: {
            estimatedDeliveryMin: finalMinTime,
            estimatedDeliveryMax: finalMaxTime,
            suggestion: 'El tiempo mínimo debe ser menor que el máximo'
          }
        };
      }

      // 3. Preparar datos para actualización (solo campos presentes)
      const preparedData = {};
      const updatedFields = [];

      if (updateData.name !== undefined) {
        preparedData.name = updateData.name;
        updatedFields.push('name');
      }

      if (updateData.phone !== undefined) {
        preparedData.phone = updateData.phone;
        updatedFields.push('phone');
      }

      if (updateData.usesPlatformDrivers !== undefined) {
        preparedData.usesPlatformDrivers = updateData.usesPlatformDrivers;
        updatedFields.push('usesPlatformDrivers');
      }

      if (updateData.deliveryFee !== undefined) {
        preparedData.deliveryFee = updateData.deliveryFee;
        updatedFields.push('deliveryFee');
      }

      if (updateData.estimatedDeliveryMin !== undefined) {
        preparedData.estimatedDeliveryMin = updateData.estimatedDeliveryMin;
        updatedFields.push('estimatedDeliveryMin');
      }

      if (updateData.estimatedDeliveryMax !== undefined) {
        preparedData.estimatedDeliveryMax = updateData.estimatedDeliveryMax;
        updatedFields.push('estimatedDeliveryMax');
      }

      if (updateData.deliveryRadius !== undefined) {
        preparedData.deliveryRadius = updateData.deliveryRadius;
        updatedFields.push('deliveryRadius');
      }

      if (updateData.status !== undefined) {
        preparedData.status = updateData.status;
        updatedFields.push('status');
      }

      if (updatedFields.length === 0) {
        throw {
          status: 400,
          message: 'No se proporcionó ningún campo válido para actualizar',
          code: 'NO_FIELDS_TO_UPDATE'
        };
      }

      logger.debug('Datos preparados para actualización', {
        requestId,
        meta: { branchId: primaryBranch.id, updatedFields, preparedData }
      });

      // 4. Actualizar la sucursal
      const updatedBranch = await prisma.branch.update({
        where: { id: primaryBranch.id },
        data: preparedData,
        select: {
          id: true,
          restaurantId: true,
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
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      logger.info('Detalles de sucursal principal actualizados exitosamente', {
        requestId,
        meta: { 
          branchId: updatedBranch.id, 
          restaurantId,
          updatedFields 
        }
      });

      return {
        branch: updatedBranch,
        updatedFields
      };

    } catch (error) {
      logger.error('Error actualizando detalles de sucursal principal', {
        requestId,
        meta: { 
          restaurantId, 
          updateData,
          ownerUserId,
          error: error.message 
        }
      });

      // Si es un error controlado (con status), lo relanzamos
      if (error.status) {
        throw error;
      }

      // Error interno no controlado
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        originalError: error.message
      };
    }
  }
}

module.exports = BranchRepository;
