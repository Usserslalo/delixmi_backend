const { z } = require('zod');

/**
 * Esquema de validación para crear un producto
 */
const createProductSchema = z.object({
  subcategoryId: z
    .number({ 
      required_error: 'El ID de la subcategoría es requerido',
      invalid_type_error: 'El ID de la subcategoría debe ser un número'
    })
    .int({ message: 'El ID de la subcategoría debe ser un número entero' })
    .min(1, 'El ID de la subcategoría debe ser mayor que 0'),

  name: z
    .string({ required_error: 'El nombre del producto es requerido' })
    .min(1, 'El nombre del producto es requerido')
    .max(150, 'El nombre debe tener máximo 150 caracteres')
    .trim(),

  description: z
    .string({ invalid_type_error: 'La descripción debe ser un texto' })
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),

  imageUrl: z
    .string({ invalid_type_error: 'La URL de la imagen debe ser un texto' })
    .url({ message: 'La URL de la imagen no es válida' })
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .trim()
    .optional(),

  price: z
    .number({ 
      required_error: 'El precio del producto es requerido',
      invalid_type_error: 'El precio debe ser un número'
    })
    .positive('El precio debe ser mayor que cero')
    .min(0.01, 'El precio debe ser mayor que cero'),

  isAvailable: z
    .boolean({ invalid_type_error: 'isAvailable debe ser un valor booleano' })
    .optional()
    .default(true),

  modifierGroupIds: z
    .array(
      z.number({ invalid_type_error: 'Los IDs de grupos de modificadores deben ser números' })
        .int({ message: 'Los IDs de grupos de modificadores deben ser números enteros' })
        .min(1, 'Los IDs de grupos de modificadores deben ser mayores que 0')
    )
    .optional()
    .default([])
}).strict();

/**
 * Esquema de validación para actualizar un producto
 */
const updateProductSchema = z.object({
  subcategoryId: z
    .number({ invalid_type_error: 'El ID de la subcategoría debe ser un número' })
    .int({ message: 'El ID de la subcategoría debe ser un número entero' })
    .min(1, 'El ID de la subcategoría debe ser mayor que 0')
    .optional(),

  name: z
    .string({ invalid_type_error: 'El nombre debe ser un texto' })
    .min(1, 'El nombre no puede estar vacío')
    .max(150, 'El nombre debe tener máximo 150 caracteres')
    .trim()
    .optional(),

  description: z
    .string({ invalid_type_error: 'La descripción debe ser un texto' })
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),

  imageUrl: z
    .string({ invalid_type_error: 'La URL de la imagen debe ser un texto' })
    .url({ message: 'La URL de la imagen no es válida' })
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .trim()
    .optional(),

  price: z
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .positive('El precio debe ser mayor que cero')
    .min(0.01, 'El precio debe ser mayor que cero')
    .optional(),

  isAvailable: z
    .boolean({ invalid_type_error: 'isAvailable debe ser un valor booleano' })
    .optional(),

  modifierGroupIds: z
    .array(
      z.number({ invalid_type_error: 'Los IDs de grupos de modificadores deben ser números' })
        .int({ message: 'Los IDs de grupos de modificadores deben ser números enteros' })
        .min(1, 'Los IDs de grupos de modificadores deben ser mayores que 0')
    )
    .optional()
}).strict();

/**
 * Esquema de validación para parámetros de producto
 */
const productParamsSchema = z.object({
  productId: z
    .string({ required_error: 'El ID del producto es requerido' })
    .regex(/^\d+$/, 'El ID del producto debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del producto debe ser mayor que 0')
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productParamsSchema
};
