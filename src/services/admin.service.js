const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

/**
 * Servicio para operaciones complejas del Super Admin
 * Maneja lógica de negocio, transacciones y operaciones críticas
 */

class AdminService {
  
  // ========================================
  // FASE 1: SEGURIDAD, ROLES Y USUARIOS
  // ========================================

  /**
   * Actualizar estado de usuario con auditoría
   */
  static async updateUserStatus(userId, newStatus, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      // Obtener usuario actual
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, lastname: true, status: true }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      // Actualizar estado
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { status: newStatus },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          status: true,
          updatedAt: true
        }
      });

      // Crear log de auditoría
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_USER_STATUS',
          entity: 'USER',
          entityId: BigInt(userId),
          details: {
            previousStatus: currentUser.status,
            newStatus: newStatus,
            targetUser: {
              id: currentUser.id,
              name: currentUser.name,
              lastname: currentUser.lastname
            }
          }
        }
      });

      return updatedUser;
    });
  }

  /**
   * Marcar usuario como sospechoso con auditoría
   */
  static async updateUserSuspicious(userId, isSuspicious, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, lastname: true, isSuspicious: true }
      });

      if (!currentUser) {
        throw new Error('Usuario no encontrado');
      }

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { isSuspicious },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          isSuspicious: true,
          updatedAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_USER_SUSPICIOUS',
          entity: 'USER',
          entityId: BigInt(userId),
          details: {
            previousSuspicious: currentUser.isSuspicious,
            newSuspicious: isSuspicious,
            targetUser: {
              id: currentUser.id,
              name: currentUser.name,
              lastname: currentUser.lastname
            }
          }
        }
      });

      return updatedUser;
    });
  }

  /**
   * Resetear contraseña de usuario
   */
  static async resetUserPassword(userId, newPassword, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, lastname: true, email: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Hashear nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Generar token de reset
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetExpires = new Date();
      resetExpires.setMinutes(resetExpires.getMinutes() + 15);

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
          passwordResetToken: hashedToken,
          passwordResetExpiresAt: resetExpires,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          updatedAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'RESET_USER_PASSWORD',
          entity: 'USER',
          entityId: BigInt(userId),
          details: {
            targetUser: {
              id: user.id,
              name: user.name,
              lastname: user.lastname,
              email: user.email
            },
            resetToken: resetToken
          }
        }
      });

      return { user: updatedUser, resetToken };
    });
  }

  /**
   * Actualizar permisos de rol
   */
  static async updateRolePermissions(roleId, permissions, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({
        where: { id: roleId },
        select: { id: true, name: true, displayName: true }
      });

      if (!role) {
        throw new Error('Rol no encontrado');
      }

      const results = [];

      for (const permission of permissions) {
        if (permission.action === 'add') {
          await tx.roleHasPermission.upsert({
            where: {
              roleId_permissionId: {
                roleId: roleId,
                permissionId: permission.permissionId
              }
            },
            update: {},
            create: {
              roleId: roleId,
              permissionId: permission.permissionId
            }
          });
          results.push({ action: 'added', permissionId: permission.permissionId });
        } else if (permission.action === 'remove') {
          await tx.roleHasPermission.deleteMany({
            where: {
              roleId: roleId,
              permissionId: permission.permissionId
            }
          });
          results.push({ action: 'removed', permissionId: permission.permissionId });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_ROLE_PERMISSIONS',
          entity: 'USER',
          entityId: BigInt(roleId),
          details: {
            role: {
              id: role.id,
              name: role.name,
              displayName: role.displayName
            },
            changes: results
          }
        }
      });

      return results;
    });
  }

  /**
   * Asignar rol a usuario
   */
  static async assignUserRole(userId, roleId, restaurantId, branchId, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, lastname: true, email: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const role = await tx.role.findUnique({
        where: { id: roleId },
        select: { id: true, name: true, displayName: true }
      });

      if (!role) {
        throw new Error('Rol no encontrado');
      }

      // Verificar si ya existe la asignación
      const existingAssignment = await tx.userRoleAssignment.findFirst({
        where: {
          userId: userId,
          roleId: roleId,
          restaurantId: restaurantId || null,
          branchId: branchId || null
        }
      });

      if (existingAssignment) {
        throw new Error('El usuario ya tiene este rol asignado');
      }

      const assignment = await tx.userRoleAssignment.create({
        data: {
          userId: userId,
          roleId: roleId,
          restaurantId: restaurantId || null,
          branchId: branchId || null
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true
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

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ASSIGN_USER_ROLE',
          entity: 'USER',
          entityId: BigInt(userId),
          details: {
            targetUser: {
              id: user.id,
              name: user.name,
              lastname: user.lastname,
              email: user.email
            },
            role: {
              id: role.id,
              name: role.name,
              displayName: role.displayName
            },
            restaurantId: restaurantId,
            branchId: branchId
          }
        }
      });

      return assignment;
    });
  }

  /**
   * Eliminar sesiones de usuario
   */
  static async deleteUserSessions(userId, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, lastname: true, email: true }
      });

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      const deletedCount = await tx.refreshToken.deleteMany({
        where: { userId: userId }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'DELETE_USER_SESSIONS',
          entity: 'USER',
          entityId: BigInt(userId),
          details: {
            targetUser: {
              id: user.id,
              name: user.name,
              lastname: user.lastname,
              email: user.email
            },
            deletedSessionsCount: deletedCount.count
          }
        }
      });

      return { deletedCount: deletedCount.count };
    });
  }

  // ========================================
  // FASE 2: CONFIGURACIÓN GLOBAL Y GEOGRAFÍA
  // ========================================

  /**
   * Actualizar configuración global
   */
  static async updateGlobalConfig(configData, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const currentConfig = await tx.globalConfig.findUnique({
        where: { id: 1 }
      });

      const updatedConfig = await tx.globalConfig.update({
        where: { id: 1 },
        data: {
          ...configData,
          updatedAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_GLOBAL_CONFIG',
          entity: 'CONFIG',
          entityId: BigInt(1),
          details: {
            previousConfig: currentConfig,
            newConfig: configData
          }
        }
      });

      return updatedConfig;
    });
  }

  /**
   * Crear área de servicio
   */
  static async createServiceArea(areaData, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const serviceArea = await tx.serviceArea.create({
        data: areaData
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'CREATE_SERVICE_AREA',
          entity: 'SERVICE_AREA',
          entityId: BigInt(serviceArea.id),
          details: {
            serviceArea: {
              id: serviceArea.id,
              name: serviceArea.name,
              type: serviceArea.type
            }
          }
        }
      });

      return serviceArea;
    });
  }

  // ========================================
  // FASE 3: RESTAURANTES Y CATÁLOGO
  // ========================================

  /**
   * Verificar restaurante manualmente
   */
  static async verifyRestaurant(restaurantId, isManuallyVerified, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true, isManuallyVerified: true }
      });

      if (!restaurant) {
        throw new Error('Restaurante no encontrado');
      }

      const updatedRestaurant = await tx.restaurant.update({
        where: { id: restaurantId },
        data: { isManuallyVerified },
        select: {
          id: true,
          name: true,
          isManuallyVerified: true,
          updatedAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'VERIFY_RESTAURANT',
          entity: 'RESTAURANT',
          entityId: BigInt(restaurantId),
          details: {
            restaurant: {
              id: restaurant.id,
              name: restaurant.name
            },
            previousVerified: restaurant.isManuallyVerified,
            newVerified: isManuallyVerified
          }
        }
      });

      return updatedRestaurant;
    });
  }

  /**
   * Ajustar stock de producto con log de inventario
   */
  static async adjustProductStock(productId, change, reason, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { id: true, name: true, stockQuantity: true }
      });

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      const newQuantity = product.stockQuantity + change;
      
      if (newQuantity < 0) {
        throw new Error('No se puede reducir el stock por debajo de 0');
      }

      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stockQuantity: newQuantity },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          updatedAt: true
        }
      });

      await tx.productInventoryLog.create({
        data: {
          productId: productId,
          userId: adminUserId,
          change: change,
          newQuantity: newQuantity,
          reason: reason
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ADJUST_PRODUCT_STOCK',
          entity: 'INVENTORY_LOG',
          entityId: BigInt(productId),
          details: {
            product: {
              id: product.id,
              name: product.name
            },
            previousStock: product.stockQuantity,
            change: change,
            newStock: newQuantity,
            reason: reason
          }
        }
      });

      return updatedProduct;
    });
  }

  // ========================================
  // FASE 4: FINANZAS Y BILLETERAS
  // ========================================

  /**
   * Ajustar billetera de restaurante
   */
  static async adjustRestaurantWallet(restaurantId, amount, description, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true }
      });

      if (!restaurant) {
        throw new Error('Restaurante no encontrado');
      }

      // Obtener o crear billetera
      let wallet = await tx.restaurantWallet.findUnique({
        where: { restaurantId: restaurantId }
      });

      if (!wallet) {
        wallet = await tx.restaurantWallet.create({
          data: {
            restaurantId: restaurantId,
            balance: 0
          }
        });
      }

      const newBalance = parseFloat(wallet.balance) + amount;
      const transactionType = amount > 0 ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT';

      const updatedWallet = await tx.restaurantWallet.update({
        where: { restaurantId: restaurantId },
        data: { balance: newBalance }
      });

      const transaction = await tx.restaurantWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: transactionType,
          amount: Math.abs(amount),
          balanceAfter: newBalance,
          description: description
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ADJUST_RESTAURANT_WALLET',
          entity: 'TRANSACTION',
          entityId: BigInt(transaction.id),
          details: {
            restaurant: {
              id: restaurant.id,
              name: restaurant.name
            },
            amount: amount,
            previousBalance: parseFloat(wallet.balance),
            newBalance: newBalance,
            description: description
          }
        }
      });

      return {
        wallet: updatedWallet,
        transaction: transaction
      };
    });
  }

  /**
   * Ajustar billetera de repartidor
   */
  static async adjustDriverWallet(driverId, amount, description, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const driver = await tx.user.findUnique({
        where: { id: driverId },
        select: { id: true, name: true, lastname: true }
      });

      if (!driver) {
        throw new Error('Repartidor no encontrado');
      }

      // Obtener o crear billetera
      let wallet = await tx.driverWallet.findUnique({
        where: { driverId: driverId }
      });

      if (!wallet) {
        wallet = await tx.driverWallet.create({
          data: {
            driverId: driverId,
            balance: 0
          }
        });
      }

      const newBalance = parseFloat(wallet.balance) + amount;
      const transactionType = amount > 0 ? 'ADJUSTMENT_CREDIT' : 'ADJUSTMENT_DEBIT';

      const updatedWallet = await tx.driverWallet.update({
        where: { driverId: driverId },
        data: { balance: newBalance }
      });

      const transaction = await tx.driverWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: transactionType,
          amount: Math.abs(amount),
          balanceAfter: newBalance,
          description: description
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'ADJUST_DRIVER_WALLET',
          entity: 'TRANSACTION',
          entityId: BigInt(transaction.id),
          details: {
            driver: {
              id: driver.id,
              name: driver.name,
              lastname: driver.lastname
            },
            amount: amount,
            previousBalance: parseFloat(wallet.balance),
            newBalance: newBalance,
            description: description
          }
        }
      });

      return {
        wallet: updatedWallet,
        transaction: transaction
      };
    });
  }

  /**
   * Procesar pagos a restaurantes
   */
  static async processRestaurantPayouts(adminUserId) {
    return await prisma.$transaction(async (tx) => {
      // Obtener transacciones pendientes de pago
      const pendingTransactions = await tx.restaurantWalletTransaction.findMany({
        where: {
          isPaidOut: false,
          type: {
            in: ['RESTAURANT_ORDER_CREDIT', 'RESTAURANT_PLATFORM_FEE_DEBIT']
          }
        },
        include: {
          wallet: {
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      const processedTransactions = [];

      for (const transaction of pendingTransactions) {
        const updatedTransaction = await tx.restaurantWalletTransaction.update({
          where: { id: transaction.id },
          data: {
            isPaidOut: true,
            paidOutAt: new Date()
          }
        });

        processedTransactions.push(updatedTransaction);
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROCESS_RESTAURANT_PAYOUTS',
          entity: 'TRANSACTION',
          entityId: BigInt(0),
          details: {
            processedCount: processedTransactions.length,
            totalAmount: processedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
          }
        }
      });

      return {
        processedCount: processedTransactions.length,
        transactions: processedTransactions
      };
    });
  }

  /**
   * Procesar pagos a repartidores
   */
  static async processDriverPayouts(adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const pendingTransactions = await tx.driverWalletTransaction.findMany({
        where: {
          isPaidOut: false,
          type: {
            in: ['DRIVER_DELIVERY_FEE_CREDIT', 'DRIVER_TIPS_CREDIT']
          }
        },
        include: {
          wallet: {
            include: {
              driver: {
                select: {
                  id: true,
                  name: true,
                  lastname: true
                }
              }
            }
          }
        }
      });

      const processedTransactions = [];

      for (const transaction of pendingTransactions) {
        const updatedTransaction = await tx.driverWalletTransaction.update({
          where: { id: transaction.id },
          data: {
            isPaidOut: true,
            paidOutAt: new Date()
          }
        });

        processedTransactions.push(updatedTransaction);
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'PROCESS_DRIVER_PAYOUTS',
          entity: 'TRANSACTION',
          entityId: BigInt(0),
          details: {
            processedCount: processedTransactions.length,
            totalAmount: processedTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0)
          }
        }
      });

      return {
        processedCount: processedTransactions.length,
        transactions: processedTransactions
      };
    });
  }

  // ========================================
  // FASE 5: LOGÍSTICA Y REPARTIDORES
  // ========================================

  /**
   * Actualizar KYC de repartidor
   */
  static async updateDriverKyc(driverId, kycData, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const driver = await tx.user.findUnique({
        where: { id: driverId },
        select: { id: true, name: true, lastname: true }
      });

      if (!driver) {
        throw new Error('Repartidor no encontrado');
      }

      const currentProfile = await tx.driverProfile.findUnique({
        where: { userId: driverId },
        select: { kycStatus: true, rfc: true, domicilioFiscal: true, opcionPagoDefinitivo: true }
      });

      if (!currentProfile) {
        throw new Error('Perfil de repartidor no encontrado');
      }

      const updatedProfile = await tx.driverProfile.update({
        where: { userId: driverId },
        data: kycData,
        select: {
          userId: true,
          kycStatus: true,
          rfc: true,
          domicilioFiscal: true,
          opcionPagoDefinitivo: true,
          updatedAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'UPDATE_DRIVER_KYC',
          entity: 'DRIVER',
          entityId: BigInt(driverId),
          details: {
            driver: {
              id: driver.id,
              name: driver.name,
              lastname: driver.lastname
            },
            previousKyc: currentProfile,
            newKyc: kycData
          }
        }
      });

      return updatedProfile;
    });
  }

  /**
   * Bloquear/desbloquear repartidor
   */
  static async blockDriver(driverId, isBlocked, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const driver = await tx.user.findUnique({
        where: { id: driverId },
        select: { id: true, name: true, lastname: true }
      });

      if (!driver) {
        throw new Error('Repartidor no encontrado');
      }

      const currentProfile = await tx.driverProfile.findUnique({
        where: { userId: driverId },
        select: { isBlocked: true }
      });

      if (!currentProfile) {
        throw new Error('Perfil de repartidor no encontrado');
      }

      const updatedProfile = await tx.driverProfile.update({
        where: { userId: driverId },
        data: { isBlocked },
        select: {
          userId: true,
          isBlocked: true,
          updatedAt: true
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'BLOCK_DRIVER',
          entity: 'DRIVER',
          entityId: BigInt(driverId),
          details: {
            driver: {
              id: driver.id,
              name: driver.name,
              lastname: driver.lastname
            },
            previousBlocked: currentProfile.isBlocked,
            newBlocked: isBlocked
          }
        }
      });

      return updatedProfile;
    });
  }

  /**
   * Forzar asignación de repartidor a orden
   */
  static async forceDriverAssignment(orderId, driverId, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true, deliveryDriverId: true, status: true }
      });

      if (!order) {
        throw new Error('Orden no encontrada');
      }

      const driver = await tx.user.findUnique({
        where: { id: driverId },
        select: { id: true, name: true, lastname: true }
      });

      if (!driver) {
        throw new Error('Repartidor no encontrado');
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { deliveryDriverId: driverId },
        select: {
          id: true,
          deliveryDriverId: true,
          updatedAt: true
        }
      });

      await tx.driverAssignmentLog.create({
        data: {
          orderId: orderId,
          driverId: driverId,
          status: 'ACCEPTED',
          rejectionReason: 'NONE',
          assignedAt: new Date(),
          respondedAt: new Date(),
          responseTimeSeconds: 0,
          isAutoAssigned: false
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'FORCE_DRIVER_ASSIGNMENT',
          entity: 'ORDER',
          entityId: BigInt(orderId),
          details: {
            orderId: orderId,
            previousDriverId: order.deliveryDriverId,
            newDriverId: driverId,
            driver: {
              id: driver.id,
              name: driver.name,
              lastname: driver.lastname
            }
          }
        }
      });

      return updatedOrder;
    });
  }

  // ========================================
  // FASE 6: SOPORTE, AUDITORÍA Y COMMS
  // ========================================

  /**
   * Enviar mensaje masivo
   */
  static async sendMessage(messageData, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      const message = await tx.adminMessage.create({
        data: {
          senderId: adminUserId,
          recipientId: messageData.recipientId || null,
          restaurantId: messageData.restaurantId || null,
          subject: messageData.subject,
          body: messageData.body,
          type: 'system',
          isGlobal: messageData.isGlobal
        }
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'SEND_MESSAGE',
          entity: 'MESSAGE',
          entityId: BigInt(message.id),
          details: {
            message: {
              id: message.id,
              subject: message.subject,
              isGlobal: message.isGlobal
            }
          }
        }
      });

      return message;
    });
  }

  /**
   * Crear notificación masiva
   */
  static async broadcastNotification(notificationData, adminUserId) {
    return await prisma.$transaction(async (tx) => {
      let targetUsers = [];

      if (notificationData.userIds && notificationData.userIds.length > 0) {
        targetUsers = notificationData.userIds;
      } else if (notificationData.restaurantIds && notificationData.restaurantIds.length > 0) {
        // Obtener usuarios de restaurantes específicos
        const restaurantUsers = await tx.userRoleAssignment.findMany({
          where: {
            restaurantId: { in: notificationData.restaurantIds }
          },
          select: { userId: true }
        });
        targetUsers = restaurantUsers.map(ura => ura.userId);
      } else {
        // Obtener todos los usuarios activos
        const allUsers = await tx.user.findMany({
          where: { status: 'active' },
          select: { id: true }
        });
        targetUsers = allUsers.map(user => user.id);
      }

      const notifications = [];
      for (const userId of targetUsers) {
        const notification = await tx.notification.create({
          data: {
            userId: userId,
            title: notificationData.title,
            message: notificationData.message,
            type: notificationData.type
          }
        });
        notifications.push(notification);
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: 'BROADCAST_NOTIFICATION',
          entity: 'NOTIFICATION',
          entityId: BigInt(0),
          details: {
            notificationCount: notifications.length,
            title: notificationData.title,
            type: notificationData.type
          }
        }
      });

      return {
        sentCount: notifications.length,
        notifications: notifications
      };
    });
  }
}

module.exports = AdminService;
