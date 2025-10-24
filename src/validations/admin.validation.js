const { z } = require('zod');

// ========================================
// FASE 1: SEGURIDAD, ROLES Y USUARIOS
// ========================================

// PATCH /users/:id/status
const updateUserStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'inactive', 'suspended', 'deleted'], {
    errorMap: () => ({ message: 'El estado debe ser uno de: pending, active, inactive, suspended, deleted' })
  })
});

// PATCH /users/:id/suspicious
const updateUserSuspiciousSchema = z.object({
  isSuspicious: z.boolean({
    errorMap: () => ({ message: 'isSuspicious debe ser un valor booleano' })
  })
});

// POST /users/:id/reset-password
const resetUserPasswordSchema = z.object({
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]/, 
      'La contraseña debe contener al menos: 1 letra minúscula, 1 mayúscula, 1 número y 1 carácter especial')
});

// PATCH /roles/:id/permissions
const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.object({
    permissionId: z.number().int().positive('El ID del permiso debe ser un número entero positivo'),
    action: z.enum(['add', 'remove'], {
      errorMap: () => ({ message: 'La acción debe ser "add" o "remove"' })
    })
  })).min(1, 'Debe proporcionar al menos un permiso')
});

// POST /users/:userId/role
const assignUserRoleSchema = z.object({
  roleId: z.number().int().positive('El ID del rol debe ser un número entero positivo'),
  restaurantId: z.number().int().positive('El ID del restaurante debe ser un número entero positivo').optional(),
  branchId: z.number().int().positive('El ID de la sucursal debe ser un número entero positivo').optional()
});

// POST /roles
const createRoleSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .regex(/^[a-z_]+$/, 'El nombre debe contener solo letras minúsculas y guiones bajos'),
  displayName: z.string()
    .min(2, 'El nombre para mostrar debe tener al menos 2 caracteres')
    .max(100, 'El nombre para mostrar no puede exceder 100 caracteres'),
  description: z.string()
    .max(500, 'La descripción no puede exceder 500 caracteres')
    .optional()
});

// ========================================
// FASE 2: CONFIGURACIÓN GLOBAL Y GEOGRAFÍA
// ========================================

// PATCH /settings/global
const updateGlobalConfigSchema = z.object({
  defaultDeliveryRadius: z.number()
    .positive('El radio de entrega por defecto debe ser positivo')
    .max(50, 'El radio de entrega no puede exceder 50 km')
    .optional(),
  globalCommissionRate: z.number()
    .min(0, 'La tasa de comisión no puede ser negativa')
    .max(100, 'La tasa de comisión no puede exceder 100%')
    .optional(),
  baseDeliveryFee: z.number()
    .min(0, 'La tarifa base de entrega no puede ser negativa')
    .max(1000, 'La tarifa base de entrega no puede exceder $1000')
    .optional(),
  systemTerms: z.string()
    .max(10000, 'Los términos del sistema no pueden exceder 10000 caracteres')
    .optional(),
  systemPrivacyPolicy: z.string()
    .max(10000, 'La política de privacidad no puede exceder 10000 caracteres')
    .optional(),
  minAppVersionCustomer: z.string()
    .regex(/^\d+\.\d+\.\d+$/, 'La versión debe seguir el formato semántico (ej: 1.0.0)')
    .optional(),
  minAppVersionDriver: z.string()
    .regex(/^\d+\.\d+\.\d+$/, 'La versión debe seguir el formato semántico (ej: 1.0.0)')
    .optional(),
  minAppVersionRestaurant: z.string()
    .regex(/^\d+\.\d+\.\d+$/, 'La versión debe seguir el formato semántico (ej: 1.0.0)')
    .optional()
});

// POST /service-areas
const createServiceAreaSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  description: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  type: z.enum(['CITY', 'NEIGHBORHOOD', 'CUSTOM_POLYGON'], {
    errorMap: () => ({ message: 'El tipo debe ser uno de: CITY, NEIGHBORHOOD, CUSTOM_POLYGON' })
  }),
  centerLatitude: z.number()
    .min(-90, 'La latitud debe estar entre -90 y 90')
    .max(90, 'La latitud debe estar entre -90 y 90')
    .optional(),
  centerLongitude: z.number()
    .min(-180, 'La longitud debe estar entre -180 y 180')
    .max(180, 'La longitud debe estar entre -180 y 180')
    .optional(),
  radiusKm: z.number()
    .positive('El radio debe ser positivo')
    .max(100, 'El radio no puede exceder 100 km')
    .optional(),
  polygonCoordinates: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })).min(3, 'Un polígono debe tener al menos 3 puntos').optional()
});

// PATCH /service-areas/:id
const updateServiceAreaSchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  description: z.string()
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .optional(),
  centerLatitude: z.number()
    .min(-90, 'La latitud debe estar entre -90 y 90')
    .max(90, 'La latitud debe estar entre -90 y 90')
    .optional(),
  centerLongitude: z.number()
    .min(-180, 'La longitud debe estar entre -180 y 180')
    .max(180, 'La longitud debe estar entre -180 y 180')
    .optional(),
  radiusKm: z.number()
    .positive('El radio debe ser positivo')
    .max(100, 'El radio no puede exceder 100 km')
    .optional(),
  polygonCoordinates: z.array(z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  })).min(3, 'Un polígono debe tener al menos 3 puntos').optional(),
  isActive: z.boolean().optional()
});

// ========================================
// FASE 3: RESTAURANTES Y CATÁLOGO
// ========================================

// PATCH /restaurants/:id/verify
const verifyRestaurantSchema = z.object({
  isManuallyVerified: z.boolean({
    errorMap: () => ({ message: 'isManuallyVerified debe ser un valor booleano' })
  })
});

// PATCH /restaurants/:id/commission
const updateRestaurantCommissionSchema = z.object({
  commissionRate: z.number()
    .min(0, 'La tasa de comisión no puede ser negativa')
    .max(100, 'La tasa de comisión no puede exceder 100%')
});

// POST /categories
const createCategorySchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres'),
  imageUrl: z.string()
    .url('Debe ser una URL válida')
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .optional()
});

// PATCH /categories/:id
const updateCategorySchema = z.object({
  name: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  imageUrl: z.string()
    .url('Debe ser una URL válida')
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .optional()
});

// POST /products/:id/stock/adjust
const adjustProductStockSchema = z.object({
  change: z.number().int('El cambio debe ser un número entero'),
  reason: z.enum(['ORDER_SALE', 'MANUAL_ADJUSTMENT', 'RESTOCK', 'TRANSFER', 'SPOILAGE'], {
    errorMap: () => ({ message: 'La razón debe ser una de: ORDER_SALE, MANUAL_ADJUSTMENT, RESTOCK, TRANSFER, SPOILAGE' })
  })
});

// ========================================
// FASE 4: FINANZAS Y BILLETERAS
// ========================================

// PATCH /orders/:id/payment/status
const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'], {
    errorMap: () => ({ message: 'El estado del pago debe ser uno de: pending, processing, completed, failed, cancelled, refunded' })
  })
});

// POST /wallets/restaurants/:id/adjust
const adjustRestaurantWalletSchema = z.object({
  amount: z.number()
    .refine(val => val !== 0, 'El monto no puede ser cero'),
  description: z.string()
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres')
});

// POST /wallets/drivers/:id/adjust
const adjustDriverWalletSchema = z.object({
  amount: z.number()
    .refine(val => val !== 0, 'El monto no puede ser cero'),
  description: z.string()
    .min(5, 'La descripción debe tener al menos 5 caracteres')
    .max(500, 'La descripción no puede exceder 500 caracteres')
});

// ========================================
// FASE 5: LOGÍSTICA Y REPARTIDORES
// ========================================

// PATCH /drivers/:id/kyc
const updateDriverKycSchema = z.object({
  kycStatus: z.enum(['pending', 'approved', 'rejected', 'under_review'], {
    errorMap: () => ({ message: 'El estado KYC debe ser uno de: pending, approved, rejected, under_review' })
  }),
  rfc: z.string()
    .regex(/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/, 'El RFC debe tener un formato válido')
    .optional(),
  domicilioFiscal: z.string()
    .max(500, 'El domicilio fiscal no puede exceder 500 caracteres')
    .optional(),
  opcionPagoDefinitivo: z.boolean().optional()
});

// PATCH /drivers/:id/block
const blockDriverSchema = z.object({
  isBlocked: z.boolean({
    errorMap: () => ({ message: 'isBlocked debe ser un valor booleano' })
  })
});

// ========================================
// FASE 6: SOPORTE, AUDITORÍA Y COMMS
// ========================================

// PATCH /complaints/:id/status
const updateComplaintStatusSchema = z.object({
  status: z.enum(['pending', 'resolved', 'closed'], {
    errorMap: () => ({ message: 'El estado debe ser uno de: pending, resolved, closed' })
  })
});

// POST /messages/send
const sendMessageSchema = z.object({
  recipientId: z.number().int().positive('El ID del destinatario debe ser un número entero positivo').optional(),
  restaurantId: z.number().int().positive('El ID del restaurante debe ser un número entero positivo').optional(),
  subject: z.string()
    .min(5, 'El asunto debe tener al menos 5 caracteres')
    .max(150, 'El asunto no puede exceder 150 caracteres'),
  body: z.string()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(5000, 'El mensaje no puede exceder 5000 caracteres'),
  isGlobal: z.boolean().default(false)
});

// POST /notifications/broadcast
const broadcastNotificationSchema = z.object({
  title: z.string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(255, 'El título no puede exceder 255 caracteres'),
  message: z.string()
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(1000, 'El mensaje no puede exceder 1000 caracteres'),
  type: z.enum(['ORDER_UPDATE', 'PROMOTION', 'SYSTEM_ALERT', 'DRIVER_PAYOUT', 'RESTAURANT_PAYOUT', 'DRIVER_ASSIGNMENT', 'RESTAURANT_UPDATE'], {
    errorMap: () => ({ message: 'El tipo debe ser uno de: ORDER_UPDATE, PROMOTION, SYSTEM_ALERT, DRIVER_PAYOUT, RESTAURANT_PAYOUT, DRIVER_ASSIGNMENT, RESTAURANT_UPDATE' })
  }),
  userIds: z.array(z.number().int().positive()).optional(),
  restaurantIds: z.array(z.number().int().positive()).optional()
});

// ========================================
// QUERY PARAMETERS SCHEMAS
// ========================================

// GET /audit-logs
const auditLogsQuerySchema = z.object({
  entity: z.enum(['USER', 'RESTAURANT', 'ORDER', 'TRANSACTION', 'DRIVER', 'CONFIG', 'COMPLAINT', 'RATING', 'MESSAGE', 'PROMOTION', 'SERVICE_AREA', 'INVENTORY_LOG', 'DRIVER_LOG', 'NOTIFICATION', 'RESTAURANT_CONFIG', 'RESTAURANT_SCHEDULE', 'ROUTE_LOG']).optional(),
  userId: z.string().transform(val => parseInt(val)).optional(),
  page: z.string().transform(val => parseInt(val)).default('1'),
  pageSize: z.string().transform(val => parseInt(val)).default('10')
});

// GET /complaints
const complaintsQuerySchema = z.object({
  status: z.enum(['pending', 'resolved', 'closed']).optional(),
  page: z.string().transform(val => parseInt(val)).default('1'),
  pageSize: z.string().transform(val => parseInt(val)).default('10')
});

// GET /inventory-logs
const inventoryLogsQuerySchema = z.object({
  productId: z.string().transform(val => parseInt(val)).optional(),
  reason: z.enum(['ORDER_SALE', 'MANUAL_ADJUSTMENT', 'RESTOCK', 'TRANSFER', 'SPOILAGE']).optional(),
  page: z.string().transform(val => parseInt(val)).default('1'),
  pageSize: z.string().transform(val => parseInt(val)).default('10')
});

// GET /wallets/restaurants/transactions
const restaurantWalletTransactionsQuerySchema = z.object({
  restaurantId: z.string().transform(val => parseInt(val)).optional(),
  isPaidOut: z.string().transform(val => val === 'true').optional(),
  type: z.enum(['RESTAURANT_ORDER_CREDIT', 'RESTAURANT_PAYOUT_DEBIT', 'RESTAURANT_REFUND_DEBIT', 'RESTAURANT_PLATFORM_FEE_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT']).optional(),
  page: z.string().transform(val => parseInt(val)).default('1'),
  pageSize: z.string().transform(val => parseInt(val)).default('10')
});

// GET /wallets/drivers/transactions
const driverWalletTransactionsQuerySchema = z.object({
  driverId: z.string().transform(val => parseInt(val)).optional(),
  isPaidOut: z.string().transform(val => val === 'true').optional(),
  type: z.enum(['DRIVER_DELIVERY_FEE_CREDIT', 'DRIVER_TIPS_CREDIT', 'DRIVER_PAYOUT_DEBIT', 'DRIVER_PENALTY_DEBIT', 'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT']).optional(),
  page: z.string().transform(val => parseInt(val)).default('1'),
  pageSize: z.string().transform(val => parseInt(val)).default('10')
});

module.exports = {
  // Fase 1
  updateUserStatusSchema,
  updateUserSuspiciousSchema,
  resetUserPasswordSchema,
  updateRolePermissionsSchema,
  assignUserRoleSchema,
  createRoleSchema,
  
  // Fase 2
  updateGlobalConfigSchema,
  createServiceAreaSchema,
  updateServiceAreaSchema,
  
  // Fase 3
  verifyRestaurantSchema,
  updateRestaurantCommissionSchema,
  createCategorySchema,
  updateCategorySchema,
  adjustProductStockSchema,
  
  // Fase 4
  updatePaymentStatusSchema,
  adjustRestaurantWalletSchema,
  adjustDriverWalletSchema,
  
  // Fase 5
  updateDriverKycSchema,
  blockDriverSchema,
  
  // Fase 6
  updateComplaintStatusSchema,
  sendMessageSchema,
  broadcastNotificationSchema,
  
  // Query schemas
  auditLogsQuerySchema,
  complaintsQuerySchema,
  inventoryLogsQuerySchema,
  restaurantWalletTransactionsQuerySchema,
  driverWalletTransactionsQuerySchema
};
