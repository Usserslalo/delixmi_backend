const { z } = require('zod');

/**
 * Esquema de validación para crear un grupo de modificadores
 */
const createGroupSchema = z.object({
  name: z
    .string({ required_error: 'El nombre del grupo es requerido' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim()),
  minSelection: z
    .number({ message: 'La selección mínima debe ser un número' })
    .int({ message: 'La selección mínima debe ser un número entero' })
    .min(0, 'La selección mínima debe ser mayor o igual a 0')
    .max(10, 'La selección mínima debe ser menor o igual a 10')
    .optional()
    .default(1),
  maxSelection: z
    .number({ message: 'La selección máxima debe ser un número' })
    .int({ message: 'La selección máxima debe ser un número entero' })
    .min(1, 'La selección máxima debe ser mayor o igual a 1')
    .max(10, 'La selección máxima debe ser menor o igual a 10')
    .optional()
    .default(1)
}).strict()
.refine(data => data.minSelection <= data.maxSelection, {
  message: 'La selección mínima no puede ser mayor que la selección máxima',
  path: ['minSelection']
});

/**
 * Esquema de validación para actualizar un grupo de modificadores
 */
const updateGroupSchema = z.object({
  name: z
    .string({ message: 'El nombre debe ser una cadena de texto' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim())
    .optional(),
  minSelection: z
    .number({ message: 'La selección mínima debe ser un número' })
    .int({ message: 'La selección mínima debe ser un número entero' })
    .min(0, 'La selección mínima debe ser mayor o igual a 0')
    .max(10, 'La selección mínima debe ser menor o igual a 10')
    .optional(),
  maxSelection: z
    .number({ message: 'La selección máxima debe ser un número' })
    .int({ message: 'La selección máxima debe ser un número entero' })
    .min(1, 'La selección máxima debe ser mayor o igual a 1')
    .max(10, 'La selección máxima debe ser menor o igual a 10')
    .optional()
}).strict();

/**
 * Esquema de validación para parámetros de grupo en la URL
 */
const groupParamsSchema = z.object({
  groupId: z
    .string({ required_error: 'El ID del grupo es requerido' })
    .regex(/^\d+$/, 'El ID del grupo debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del grupo debe ser mayor que 0')
});

/**
 * Esquema de validación para crear una opción de modificador
 */
const createOptionSchema = z.object({
  name: z
    .string({ required_error: 'El nombre de la opción es requerido' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim()),
  price: z
    .number({ required_error: 'El precio es requerido' })
    .min(0, 'El precio debe ser mayor o igual a 0')
    .transform(val => parseFloat(val))
}).strict();

/**
 * Esquema de validación para actualizar una opción de modificador
 */
const updateOptionSchema = z.object({
  name: z
    .string({ message: 'El nombre debe ser una cadena de texto' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim())
    .optional(),
  price: z
    .number({ message: 'El precio debe ser un número' })
    .min(0, 'El precio debe ser mayor o igual a 0')
    .transform(val => parseFloat(val))
    .optional()
}).strict();

/**
 * Esquema de validación para parámetros de opción en la URL
 */
const optionParamsSchema = z.object({
  optionId: z
    .string({ required_error: 'El ID de la opción es requerido' })
    .regex(/^\d+$/, 'El ID de la opción debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID de la opción debe ser mayor que 0')
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  groupParamsSchema,
  createOptionSchema,
  updateOptionSchema,
  optionParamsSchema
};
