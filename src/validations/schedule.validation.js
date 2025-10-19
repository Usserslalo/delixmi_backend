const { z } = require('zod');

/**
 * Esquema de validación para parámetros de horarios de sucursales
 */
const scheduleParamsSchema = z.object({
  branchId: z
    .string({ required_error: 'El ID de la sucursal es requerido' })
    .regex(/^\d+$/, 'El ID de la sucursal debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El ID de la sucursal debe ser mayor que 0')
});

module.exports = {
  scheduleParamsSchema
};
