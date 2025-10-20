const { z } = require('zod');
const { OrderStatus } = require('@prisma/client');

/**
 * Esquema de validación para query parameters del endpoint GET /api/restaurant/orders
 */
const orderQuerySchema = z.object({
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
    .refine(val => val <= 100, 'El tamaño de página no puede ser mayor a 100')
    .optional()
    .default(10),

  // Filtros
  status: z.nativeEnum(OrderStatus).optional(),

  dateFrom: z
    .string()
    .datetime({ message: "Formato de fecha inválido (YYYY-MM-DDTHH:mm:ssZ)" })
    .optional(),

  dateTo: z
    .string()
    .datetime({ message: "Formato de fecha inválido (YYYY-MM-DDTHH:mm:ssZ)" })
    .optional(),

  // Ordenamiento
  sortBy: z.enum(['orderPlacedAt', 'total']).optional().default('orderPlacedAt'),
  
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),

  // Búsqueda
  search: z
    .string()
    .trim()
    .min(1, 'El término de búsqueda no puede estar vacío')
    .optional()
}).refine(
  (data) => {
    // Validar que dateFrom no sea mayor a dateTo si ambos están presentes
    if (data.dateFrom && data.dateTo) {
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    }
    return true;
  },
  {
    message: "La fecha de inicio no puede ser mayor a la fecha de fin",
    path: ["dateFrom"]
  }
);

/**
 * Esquema de validación para parámetros de ruta del endpoint PATCH /api/restaurant/orders/:orderId/status
 */
const orderParamsSchema = z.object({
  orderId: z.string().regex(/^\d+$/, 'El ID del pedido debe ser un número válido').transform(BigInt)
});

/**
 * Esquema de validación para el cuerpo de la petición del endpoint PATCH /api/restaurant/orders/:orderId/status
 */
const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus, {
    required_error: "El nuevo estado es requerido",
    invalid_type_error: "Estado inválido"
  })
});

module.exports = {
  orderQuerySchema,
  orderParamsSchema,
  updateOrderStatusSchema
};
