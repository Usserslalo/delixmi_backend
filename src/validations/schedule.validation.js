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

/**
 * Esquema de validación para un día individual del horario
 */
const scheduleDaySchema = z.object({
  dayOfWeek: z
    .number({
      required_error: 'El día de la semana es requerido',
      invalid_type_error: 'El día de la semana debe ser un número'
    })
    .int({ message: 'El día de la semana debe ser un número entero' })
    .min(0, 'El día de la semana debe ser mayor o igual a 0 (Domingo)')
    .max(6, 'El día de la semana debe ser menor o igual a 6 (Sábado)'),
    
  openingTime: z
    .string({
      required_error: 'La hora de apertura es requerida',
      invalid_type_error: 'La hora de apertura debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de apertura debe estar en formato HH:MM:SS válido (ej: 09:30:00)'
    ),
    
  closingTime: z
    .string({
      required_error: 'La hora de cierre es requerida',
      invalid_type_error: 'La hora de cierre debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de cierre debe estar en formato HH:MM:SS válido (ej: 22:30:00)'
    ),
    
  isClosed: z
    .boolean({
      required_error: 'El campo isClosed es requerido',
      invalid_type_error: 'El campo isClosed debe ser un valor booleano'
    })
}).refine(data => {
  // Solo validar horarios lógicos si no está cerrado
  if (data.isClosed) {
    return true;
  }
  
  // Crear objetos Date para comparar horarios
  const openingTime = new Date(`1970-01-01T${data.openingTime}`);
  const closingTime = new Date(`1970-01-01T${data.closingTime}`);
  
  return openingTime < closingTime;
}, {
  message: "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado",
  path: ["openingTime"]
});

/**
 * Esquema de validación para actualizar el horario semanal completo
 */
const updateWeeklyScheduleSchema = z.object({
  schedules: z
    .array(scheduleDaySchema, {
      required_error: 'El campo schedules es requerido',
      invalid_type_error: 'El campo schedules debe ser un array'
    })
    .length(7, 'Se deben proporcionar exactamente 7 días de horario (Domingo a Sábado)')
    .refine(schedules => {
      // Validar que todos los días 0-6 estén presentes y sean únicos
      const dayOfWeeks = schedules.map(s => s.dayOfWeek);
      const expectedDays = [0, 1, 2, 3, 4, 5, 6];
      
      // Verificar que no hay duplicados
      const uniqueDays = [...new Set(dayOfWeeks)];
      if (uniqueDays.length !== 7) {
        return false;
      }
      
      // Verificar que están todos los días esperados
      return expectedDays.every(day => dayOfWeeks.includes(day));
    }, {
      message: 'Los horarios deben incluir exactamente un día para cada día de la semana (0=Domingo a 6=Sábado) sin duplicados',
      path: ['schedules']
    })
});

/**
 * Esquema de validación para parámetros de horario de día específico
 */
const singleDayParamsSchema = z.object({
  branchId: z
    .string({ required_error: 'El ID de la sucursal es requerido' })
    .regex(/^\d+$/, 'El ID de la sucursal debe ser un número')
    .transform(Number)
    .refine(val => val > 0, 'El ID de la sucursal debe ser mayor que 0'),
  
  dayOfWeek: z
    .string({ required_error: 'El día de la semana es requerido' })
    .regex(/^[0-6]$/, 'El día de la semana debe ser un número entre 0 (Domingo) y 6 (Sábado)')
    .transform(Number)
});

/**
 * Esquema de validación para actualizar un día específico del horario
 */
const updateSingleDaySchema = z.object({
  openingTime: z
    .string({
      required_error: 'La hora de apertura es requerida',
      invalid_type_error: 'La hora de apertura debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de apertura debe estar en formato HH:MM:SS válido (ej: 09:30:00)'
    ),
    
  closingTime: z
    .string({
      required_error: 'La hora de cierre es requerida',
      invalid_type_error: 'La hora de cierre debe ser un string'
    })
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/,
      'La hora de cierre debe estar en formato HH:MM:SS válido (ej: 22:30:00)'
    ),
    
  isClosed: z
    .boolean({
      required_error: 'El campo isClosed es requerido',
      invalid_type_error: 'El campo isClosed debe ser un valor booleano'
    })
}).refine(data => {
  // Solo validar horarios lógicos si no está cerrado
  if (data.isClosed) {
    return true;
  }
  
  // Crear objetos Date para comparar horarios
  const openingTime = new Date(`1970-01-01T${data.openingTime}`);
  const closingTime = new Date(`1970-01-01T${data.closingTime}`);
  
  return openingTime < closingTime;
}, {
  message: "La hora de apertura debe ser anterior a la hora de cierre cuando el día no está cerrado",
  path: ["openingTime"]
});

module.exports = {
  scheduleParamsSchema,
  scheduleDaySchema,
  updateWeeklyScheduleSchema,
  singleDayParamsSchema,
  updateSingleDaySchema
};
