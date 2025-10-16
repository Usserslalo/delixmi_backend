const { z } = require('zod');

/**
 * Esquemas de validación con Zod para los endpoints de autenticación
 */

// Esquema para el registro de usuarios
const registerSchema = z.object({
  name: z
    .string({
      required_error: 'El nombre es requerido',
      invalid_type_error: 'El nombre debe ser un texto'
    })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim(),
  
  lastname: z
    .string({
      required_error: 'El apellido es requerido',
      invalid_type_error: 'El apellido debe ser un texto'
    })
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .trim(),
  
  email: z
    .string({
      required_error: 'El correo electrónico es requerido',
      invalid_type_error: 'El correo electrónico debe ser un texto'
    })
    .email('Debe ser un correo electrónico válido')
    .max(150, 'El correo electrónico no puede exceder 150 caracteres')
    .toLowerCase()
    .trim(),
  
  phone: z
    .string({
      required_error: 'El teléfono es requerido',
      invalid_type_error: 'El teléfono debe ser un texto'
    })
    .min(10, 'El teléfono debe tener al menos 10 caracteres')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(/^[0-9+\-() ]+$/, 'El teléfono solo puede contener números y símbolos válidos (+, -, (), espacio)')
    .trim(),
  
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser un texto'
    })
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede exceder 128 caracteres')
});

// Esquema para el inicio de sesión
const loginSchema = z.object({
  email: z
    .string({
      required_error: 'El correo electrónico es requerido',
      invalid_type_error: 'El correo electrónico debe ser un texto'
    })
    .email('Debe ser un correo electrónico válido')
    .toLowerCase()
    .trim(),
  
  password: z
    .string({
      required_error: 'La contraseña es requerida',
      invalid_type_error: 'La contraseña debe ser un texto'
    })
    .min(1, 'La contraseña no puede estar vacía')
});

// Esquema para solicitar restablecimiento de contraseña
const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: 'El correo electrónico es requerido',
      invalid_type_error: 'El correo electrónico debe ser un texto'
    })
    .email('Debe ser un correo electrónico válido')
    .toLowerCase()
    .trim()
});

// Esquema para restablecer contraseña con token
const resetPasswordSchema = z.object({
  token: z
    .string({
      required_error: 'El token es requerido',
      invalid_type_error: 'El token debe ser un texto'
    })
    .length(64, 'El token debe tener exactamente 64 caracteres')
    .regex(/^[a-f0-9]+$/i, 'El token debe contener solo caracteres hexadecimales'),
  
  newPassword: z
    .string({
      required_error: 'La nueva contraseña es requerida',
      invalid_type_error: 'La nueva contraseña debe ser un texto'
    })
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(128, 'La nueva contraseña no puede exceder 128 caracteres')
});

// Esquema para reenvío de verificación
const resendVerificationSchema = z.object({
  email: z
    .string({
      required_error: 'El correo electrónico es requerido',
      invalid_type_error: 'El correo electrónico debe ser un texto'
    })
    .email('Debe ser un correo electrónico válido')
    .toLowerCase()
    .trim()
});

// Esquema para actualizar perfil
const updateProfileSchema = z.object({
  name: z
    .string({
      invalid_type_error: 'El nombre debe ser un texto'
    })
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .trim()
    .optional(),
  
  lastname: z
    .string({
      invalid_type_error: 'El apellido debe ser un texto'
    })
    .min(2, 'El apellido debe tener al menos 2 caracteres')
    .max(100, 'El apellido no puede exceder 100 caracteres')
    .trim()
    .optional(),
  
  phone: z
    .string({
      invalid_type_error: 'El teléfono debe ser un texto'
    })
    .min(10, 'El teléfono debe tener al menos 10 caracteres')
    .max(20, 'El teléfono no puede exceder 20 caracteres')
    .regex(/^[0-9+\-() ]+$/, 'El teléfono solo puede contener números y símbolos válidos (+, -, (), espacio)')
    .trim()
    .optional()
}).strict(); // No permitir campos adicionales

// Esquema para cambiar contraseña
const changePasswordSchema = z.object({
  currentPassword: z
    .string({
      required_error: 'La contraseña actual es requerida',
      invalid_type_error: 'La contraseña actual debe ser un texto'
    })
    .min(1, 'La contraseña actual no puede estar vacía'),
  
  newPassword: z
    .string({
      required_error: 'La nueva contraseña es requerida',
      invalid_type_error: 'La nueva contraseña debe ser un texto'
    })
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(128, 'La nueva contraseña no puede exceder 128 caracteres')
});

// Esquema para refresh token
const refreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'El refresh token es requerido',
      invalid_type_error: 'El refresh token debe ser un texto'
    })
    .length(128, 'El refresh token debe tener exactamente 128 caracteres')
    .regex(/^[a-f0-9]+$/i, 'El refresh token debe contener solo caracteres hexadecimales')
});

// Esquema para logout
const logoutSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'El refresh token es requerido',
      invalid_type_error: 'El refresh token debe ser un texto'
    })
    .length(128, 'El refresh token debe tener exactamente 128 caracteres')
    .regex(/^[a-f0-9]+$/i, 'El refresh token debe contener solo caracteres hexadecimales')
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  updateProfileSchema,
  changePasswordSchema,
  refreshTokenSchema,
  logoutSchema
};

