const { z } = require('zod');

/**
 * Esquema de validación para crear un empleado
 */
const createEmployeeSchema = z.object({
  email: z
    .string({
      required_error: 'El email es requerido',
      invalid_type_error: 'El email debe ser un string'
    })
    .email('El email debe tener un formato válido')
    .toLowerCase()
    .trim(),
    
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser un string'
    })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(255, 'La contraseña es demasiado larga'),
    
  name: z
    .string({
      required_error: 'El nombre es requerido',
      invalid_type_error: 'El nombre debe ser un string'
    })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre no puede superar los 100 caracteres')
    .trim(),
    
  lastname: z
    .string({
      required_error: 'El apellido es requerido',
      invalid_type_error: 'El apellido debe ser un string'
    })
    .min(1, 'El apellido no puede estar vacío')
    .max(100, 'El apellido no puede superar los 100 caracteres')
    .trim(),
    
  phone: z
    .string({
      required_error: 'El teléfono es requerido',
      invalid_type_error: 'El teléfono debe ser un string'
    })
    .regex(/^[0-9]{10,15}$/, 'El teléfono debe tener entre 10 y 15 dígitos numéricos')
    .trim(),
    
  roleId: z
    .number({
      required_error: 'El rol es requerido',
      invalid_type_error: 'El rol debe ser un número'
    })
    .int('El rol debe ser un número entero')
    .positive('Debe seleccionar un rol válido')
});

/**
 * Esquema de validación para parámetros de empleado (ID)
 */
const employeeParamsSchema = z.object({
  employeeId: z
    .string({ required_error: 'El ID del empleado es requerido' })
    .regex(/^\d+$/, 'El ID del empleado debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El ID del empleado debe ser mayor que 0')
});

module.exports = {
  createEmployeeSchema,
  employeeParamsSchema
};
