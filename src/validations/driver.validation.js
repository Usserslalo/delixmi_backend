const { z } = require('zod');
const { DriverStatus } = require('@prisma/client');

/**
 * Esquema de validación para el cuerpo de la petición del endpoint PATCH /api/driver/status
 */
const updateDriverStatusSchema = z.object({
  status: z.nativeEnum(DriverStatus, {
    required_error: "El estado del repartidor es requerido",
    invalid_type_error: "Estado inválido. Los estados permitidos son: online, offline, busy, unavailable"
  })
});

/**
 * Esquema de validación para query parameters del endpoint GET /api/driver/orders/available
 */
const availableOrdersQuerySchema = z.object({
  // Paginación
  page: z
    .string()
    .regex(/^\d+$/, 'La página debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'La página debe ser mayor a 0')
    .optional()
    .default(1),

  pageSize: z
    .string()
    .regex(/^\d+$/, 'El tamaño de página debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El tamaño de página debe ser mayor a 0')
    .refine(val => val <= 50, 'El tamaño de página no puede ser mayor a 50')
    .optional()
    .default(10)
});

/**
 * Esquema de validación para parámetros de ruta del endpoint PATCH /api/driver/location
 */
const updateLocationSchema = z.object({
  latitude: z
    .number({
      required_error: "La latitud es requerida",
      invalid_type_error: "La latitud debe ser un número"
    })
    .min(-90, 'La latitud debe ser mayor o igual a -90')
    .max(90, 'La latitud debe ser menor o igual a 90'),

  longitude: z
    .number({
      required_error: "La longitud es requerida", 
      invalid_type_error: "La longitud debe ser un número"
    })
    .min(-180, 'La longitud debe ser mayor o igual a -180')
    .max(180, 'La longitud debe ser menor o igual a 180')
});

/**
 * Esquema de validación para parámetros de ruta de endpoints de órdenes
 */
const orderParamsSchema = z.object({
  orderId: z.string().regex(/^\d+$/, 'El ID del pedido debe ser un número válido').transform(Number)
});

module.exports = {
  updateDriverStatusSchema,
  availableOrdersQuerySchema, 
  updateLocationSchema,
  orderParamsSchema
};
