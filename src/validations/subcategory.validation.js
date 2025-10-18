const { z } = require('zod');

/**
 * Esquema de validación para crear una subcategoría
 */
const createSubcategorySchema = z.object({
  categoryId: z
    .number({ required_error: 'El ID de la categoría es requerido' })
    .int({ message: 'El ID de la categoría debe ser un número entero' })
    .min(1, 'El ID de la categoría debe ser mayor a 0'),
  name: z
    .string({ required_error: 'El nombre de la subcategoría es requerido' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim()),
  displayOrder: z
    .number({ message: 'El orden de visualización debe ser un número' })
    .int({ message: 'El orden de visualización debe ser un número entero' })
    .min(0, 'El orden de visualización debe ser mayor o igual a 0')
    .optional()
    .default(0)
}).strict();

/**
 * Esquema de validación para actualizar una subcategoría
 */
const updateSubcategorySchema = z.object({
  categoryId: z
    .number({ message: 'El ID de la categoría debe ser un número' })
    .int({ message: 'El ID de la categoría debe ser un número entero' })
    .min(1, 'El ID de la categoría debe ser mayor a 0')
    .optional(),
  name: z
    .string({ message: 'El nombre debe ser una cadena de texto' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim())
    .optional(),
  displayOrder: z
    .number({ message: 'El orden de visualización debe ser un número' })
    .int({ message: 'El orden de visualización debe ser un número entero' })
    .min(0, 'El orden de visualización debe ser mayor o igual a 0')
    .optional()
}).strict();

/**
 * Esquema de validación para parámetros de subcategoría en la URL
 */
const subcategoryParamsSchema = z.object({
  subcategoryId: z
    .string({ required_error: 'El ID de la subcategoría es requerido' })
    .regex(/^\d+$/, 'El ID de la subcategoría debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID de la subcategoría debe ser mayor que 0')
});

/**
 * Esquema de validación para query parameters del listado de subcategorías
 */
const subcategoryQuerySchema = z.object({
  categoryId: z
    .string()
    .regex(/^\d+$/, 'El ID de categoría debe ser un número')
    .transform((val) => parseInt(val, 10))
    .optional(),
  page: z
    .string()
    .regex(/^\d+$/, 'El número de página debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El número de página debe ser mayor a 0')
    .optional()
    .default('1'),
  pageSize: z
    .string()
    .regex(/^\d+$/, 'El tamaño de página debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0 && val <= 100, 'El tamaño de página debe ser entre 1 y 100')
    .optional()
    .default('20')
});

module.exports = {
  createSubcategorySchema,
  updateSubcategorySchema,
  subcategoryParamsSchema,
  subcategoryQuerySchema
};
