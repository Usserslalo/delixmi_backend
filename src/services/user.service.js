/**
 * Servicio centralizado para operaciones relacionadas con usuarios
 * Encapsula consultas comunes de Prisma para usuarios y sus relaciones
 */
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../config/logger');

const prisma = new PrismaClient();

class UserService {
  /**
   * Obtiene un usuario con sus roles y relaciones básicas
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<Object|null>} Usuario con roles o null si no existe
   */
  static async getUserWithRoles(userId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          userRoleAssignments: {
            select: {
              roleId: true,
              role: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  description: true
                }
              },
              restaurantId: true,
              branchId: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              },
              branch: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado', {
          requestId,
          meta: { userId }
        });
        return null;
      }

      logger.debug('Usuario obtenido con roles', {
        requestId,
        meta: { 
          userId, 
          roleCount: user.userRoleAssignments.length,
          roles: user.userRoleAssignments.map(ra => ra.role.name)
        }
      });

      return user;
    } catch (error) {
      logger.error('Error al obtener usuario con roles', {
        requestId,
        meta: { userId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Obtiene un usuario con roles y perfil de repartidor
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<Object|null>} Usuario con roles y perfil de repartidor o null si no existe
   */
  static async getUserWithRolesAndDriverProfile(userId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          userRoleAssignments: {
            select: {
              roleId: true,
              role: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  description: true
                }
              },
              restaurantId: true,
              branchId: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              },
              branch: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          driverProfile: {
            select: {
              id: true,
              vehicleType: true,
              licensePlate: true,
              status: true,
              currentLatitude: true,
              currentLongitude: true,
              lastSeenAt: true,
              kycStatus: true
            }
          }
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado', {
          requestId,
          meta: { userId }
        });
        return null;
      }

      logger.debug('Usuario obtenido con roles y perfil de repartidor', {
        requestId,
        meta: { 
          userId, 
          roleCount: user.userRoleAssignments.length,
          hasDriverProfile: !!user.driverProfile
        }
      });

      return user;
    } catch (error) {
      logger.error('Error al obtener usuario con roles y perfil de repartidor', {
        requestId,
        meta: { userId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Obtiene un usuario con roles y direcciones
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<Object|null>} Usuario con roles y direcciones o null si no existe
   */
  static async getUserWithRolesAndAddresses(userId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          userRoleAssignments: {
            select: {
              roleId: true,
              role: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  description: true
                }
              },
              restaurantId: true,
              branchId: true,
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              },
              branch: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          addresses: {
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
              references: true,
              latitude: true,
              longitude: true,
              isDefault: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: {
              isDefault: 'desc'
            }
          }
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado', {
          requestId,
          meta: { userId }
        });
        return null;
      }

      logger.debug('Usuario obtenido con roles y direcciones', {
        requestId,
        meta: { 
          userId, 
          roleCount: user.userRoleAssignments.length,
          addressCount: user.addresses.length
        }
      });

      return user;
    } catch (error) {
      logger.error('Error al obtener usuario con roles y direcciones', {
        requestId,
        meta: { userId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Verifica si un usuario tiene un rol específico
   * @param {number} userId - ID del usuario
   * @param {string} roleName - Nombre del rol a verificar
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<boolean>} True si el usuario tiene el rol, false en caso contrario
   */
  static async userHasRole(userId, roleName, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          userRoleAssignments: {
            select: {
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado para verificar rol', {
          requestId,
          meta: { userId, roleName }
        });
        return false;
      }

      const hasRole = user.userRoleAssignments.some(
        assignment => assignment.role.name === roleName
      );

      logger.debug('Verificación de rol completada', {
        requestId,
        meta: { userId, roleName, hasRole }
      });

      return hasRole;
    } catch (error) {
      logger.error('Error al verificar rol de usuario', {
        requestId,
        meta: { userId, roleName, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Obtiene los roles de un usuario como array de strings
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<string[]>} Array de nombres de roles
   */
  static async getUserRoles(userId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          userRoleAssignments: {
            select: {
              role: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado para obtener roles', {
          requestId,
          meta: { userId }
        });
        return [];
      }

      const roles = user.userRoleAssignments.map(
        assignment => assignment.role.name
      );

      logger.debug('Roles de usuario obtenidos', {
        requestId,
        meta: { userId, roles }
      });

      return roles;
    } catch (error) {
      logger.error('Error al obtener roles de usuario', {
        requestId,
        meta: { userId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Verifica si un usuario puede acceder a un restaurante específico
   * @param {number} userId - ID del usuario
   * @param {number} restaurantId - ID del restaurante
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<boolean>} True si el usuario puede acceder al restaurante
   */
  static async userCanAccessRestaurant(userId, restaurantId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          userRoleAssignments: {
            select: {
              role: {
                select: {
                  name: true
                }
              },
              restaurantId: true
            }
          }
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado para verificar acceso a restaurante', {
          requestId,
          meta: { userId, restaurantId }
        });
        return false;
      }

      // Super admin puede acceder a cualquier restaurante
      const isSuperAdmin = user.userRoleAssignments.some(
        assignment => assignment.role.name === 'super_admin'
      );

      if (isSuperAdmin) {
        logger.debug('Acceso concedido: Super Admin', {
          requestId,
          meta: { userId, restaurantId }
        });
        return true;
      }

      // Verificar si el usuario tiene acceso específico al restaurante
      const canAccess = user.userRoleAssignments.some(
        assignment => assignment.restaurantId === restaurantId
      );

      logger.debug('Verificación de acceso a restaurante completada', {
        requestId,
        meta: { userId, restaurantId, canAccess }
      });

      return canAccess;
    } catch (error) {
      logger.error('Error al verificar acceso a restaurante', {
        requestId,
        meta: { userId, restaurantId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Obtiene información básica de un usuario (sin roles)
   * @param {number} userId - ID del usuario
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<Object|null>} Usuario básico o null si no existe
   */
  static async getBasicUserInfo(userId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          phone: true,
          status: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        logger.warn('Usuario no encontrado', {
          requestId,
          meta: { userId }
        });
        return null;
      }

      logger.debug('Información básica de usuario obtenida', {
        requestId,
        meta: { userId }
      });

      return user;
    } catch (error) {
      logger.error('Error al obtener información básica de usuario', {
        requestId,
        meta: { userId, error: error.message }
      });
      throw error;
    }
  }

  /**
   * Obtiene el ID del restaurante asociado a un usuario owner
   * @param {number} ownerId - ID del usuario owner
   * @param {string} requestId - ID de la petición para logging (opcional)
   * @returns {Promise<number|null>} ID del restaurante o null si no existe
   */
  static async getRestaurantIdByOwnerId(ownerId, requestId = null) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: ownerId },
        select: {
          userRoleAssignments: {
            where: {
              role: { name: 'owner' },
              restaurantId: { not: null }
            },
            select: {
              restaurantId: true
            }
          }
        }
      });

      if (!user || !user.userRoleAssignments.length) {
        logger.warn('Restaurante no encontrado para el owner', {
          requestId,
          meta: { ownerId }
        });
        return null;
      }

      const restaurantId = user.userRoleAssignments[0].restaurantId;

      logger.debug('Restaurant ID obtenido para owner', {
        requestId,
        meta: { ownerId, restaurantId }
      });

      return restaurantId;
    } catch (error) {
      logger.error('Error al obtener restaurant ID por owner ID', {
        requestId,
        meta: { ownerId, error: error.message }
      });
      throw error;
    }
  }
}

module.exports = UserService;
