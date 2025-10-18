const { z } = require('zod');

/**
 * Esquema de validación para actualizar el perfil del restaurante
 * Todos los campos son opcionales ya que es un PATCH
 */
const updateProfileSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'El nombre debe ser un texto'
    })
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .trim()
    .optional(),
  
  description: z
    .string({
      invalid_type_error: 'La descripción debe ser un texto'
    })
    .min(10, 'La descripción debe tener al menos 10 caracteres')
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),
  
  phone: z
    .string({
      invalid_type_error: 'El teléfono debe ser un texto'
    })
    .min(10, 'El teléfono debe tener al menos 10 caracteres')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(/^[\+]?[\d\s\-\(\)]+$/, 'El formato del teléfono no es válido')
    .trim()
    .optional(),
  
  email: z
    .string({
      invalid_type_error: 'El email debe ser un texto'
    })
    .email('El email debe tener un formato válido')
    .max(150, 'El email no puede exceder 150 caracteres')
    .toLowerCase()
    .trim()
    .optional(),
  
  address: z
    .string({
      invalid_type_error: 'La dirección debe ser un texto'
    })
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(500, 'La dirección no puede exceder 500 caracteres')
    .trim()
    .optional(),
  
  logoUrl: z
    .string({
      invalid_type_error: 'La URL del logo debe ser un texto'
    })
    .url('La URL del logo no es válida')
    .max(255, 'La URL del logo no puede exceder 255 caracteres')
    .trim()
    .nullable()
    .optional(),
  
  coverPhotoUrl: z
    .string({
      invalid_type_error: 'La URL de la foto de portada debe ser un texto'
    })
    .url('La URL de la foto de portada no es válida')
    .max(255, 'La URL de la foto de portada no puede exceder 255 caracteres')
    .trim()
    .nullable()
    .optional()
}).strict(); // No permitir campos adicionales

module.exports = {
  updateProfileSchema
};
