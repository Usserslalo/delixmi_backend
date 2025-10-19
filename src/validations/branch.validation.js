const { z } = require('zod');

/**
 * Esquema para validar la actualización de detalles operativos de la sucursal principal
 */
const updateBranchDetailsSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'El nombre debe ser un texto'
    })
    .min(1, 'El nombre no puede estar vacío')
    .max(150, 'El nombre no puede superar los 150 caracteres')
    .trim()
    .optional(),

  phone: z
    .string({
      invalid_type_error: 'El teléfono debe ser un texto'
    })
    .regex(/^[0-9+()-.\s]{10,20}$/, 'Formato de teléfono inválido. Debe tener entre 10 y 20 caracteres y contener solo números, +, -, (, ), . y espacios')
    .nullable()
    .optional(),

  usesPlatformDrivers: z
    .boolean({
      invalid_type_error: 'usesPlatformDrivers debe ser verdadero o falso'
    })
    .optional(),

  deliveryFee: z
    .number({
      invalid_type_error: 'La tarifa de entrega debe ser un número'
    })
    .min(0, 'La tarifa de entrega no puede ser negativa')
    .optional(),

  estimatedDeliveryMin: z
    .number({
      invalid_type_error: 'El tiempo mínimo debe ser un número'
    })
    .int('El tiempo mínimo debe ser un número entero')
    .min(5, 'El tiempo mínimo de entrega debe ser al menos 5 minutos')
    .optional(),

  estimatedDeliveryMax: z
    .number({
      invalid_type_error: 'El tiempo máximo debe ser un número'
    })
    .int('El tiempo máximo debe ser un número entero')
    .min(10, 'El tiempo máximo de entrega debe ser al menos 10 minutos')
    .optional(),

  deliveryRadius: z
    .number({
      invalid_type_error: 'El radio de entrega debe ser un número'
    })
    .min(0.5, 'El radio de entrega mínimo es 0.5 km')
    .max(50, 'El radio de entrega máximo es 50 km')
    .optional(),

  status: z
    .enum(['active', 'inactive', 'suspended'], {
      errorMap: () => ({ message: 'Estado inválido. Debe ser: active, inactive o suspended' })
    })
    .optional()
}).refine(
  data => {
    // Solo validar si ambos valores están presentes en la request
    if (data.estimatedDeliveryMin !== undefined && data.estimatedDeliveryMax !== undefined) {
      return data.estimatedDeliveryMin < data.estimatedDeliveryMax;
    }
    return true; // Si solo uno está presente, la validación se hará en el repositorio
  },
  {
    message: 'El tiempo mínimo de entrega debe ser menor que el tiempo máximo',
    path: ['estimatedDeliveryMin']
  }
);

module.exports = {
  updateBranchDetailsSchema
};
