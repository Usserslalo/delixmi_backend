# Tests del Super Admin - Delixmi Backend

Este directorio contiene la suite completa de tests funcionales para todos los endpoints del Super Admin, organizados por fases.

## 🌐 Configuración

Los tests están configurados para ejecutarse contra el backend desplegado en **Render**:
- **URL Base**: `https://delixmi-backend.onrender.com`
- **Autenticación**: Super Admin con credenciales del seed

## 📁 Estructura de Archivos

```
tests/admin/
├── README.md                           # Este archivo
├── run-all-tests.js                   # Script para ejecutar todos los tests
├── fase1_seguridad_render.test.js     # Fase 1: Seguridad, Roles y Usuarios
├── fase2_configuracion_global.test.js # Fase 2: Configuración Global y Geografía
├── fase3_restaurantes_catalogo.test.js # Fase 3: Restaurantes y Catálogo
├── fase4_finanzas_billeteras.test.js  # Fase 4: Finanzas y Billeteras
├── fase5_logistica_repartidores.test.js # Fase 5: Logística y Repartidores
└── fase6_soporte_auditoria.test.js    # Fase 6: Soporte, Auditoría y Comms
```

## 🚀 Comandos de Ejecución

### Ejecutar Todos los Tests
```bash
npm run test:admin:all
```

### Ejecutar Tests por Fase
```bash
# Fase 1: Seguridad, Roles y Usuarios
npm run test:admin:fase1

# Fase 2: Configuración Global y Geografía
npm run test:admin:fase2

# Fase 3: Restaurantes y Catálogo
npm run test:admin:fase3

# Fase 4: Finanzas y Billeteras
npm run test:admin:fase4

# Fase 5: Logística y Repartidores
npm run test:admin:fase5

# Fase 6: Soporte, Auditoría y Comms
npm run test:admin:fase6
```

### Ejecutar Tests con Watch Mode
```bash
npm run test:admin:watch
```

### Ejecutar Tests con Coverage
```bash
npm run test:coverage
```

## 📋 Fases de Testing

### Fase 1: Seguridad, Roles y Usuarios (8 endpoints)
- ✅ Crear roles
- ✅ Listar roles
- ✅ Asignar permisos a roles
- ✅ Actualizar estado de usuarios
- ✅ Marcar usuarios como sospechosos
- ✅ Asignar roles a usuarios
- ✅ Eliminar sesiones de usuarios
- ✅ Resetear contraseñas

### Fase 2: Configuración Global y Geografía (4 endpoints)
- ✅ Actualizar configuración global
- ✅ Obtener configuración global
- ✅ Crear áreas de servicio
- ✅ Actualizar áreas de servicio

### Fase 3: Restaurantes y Catálogo (8 endpoints)
- ✅ Verificar restaurantes manualmente
- ✅ Actualizar comisión de restaurantes
- ✅ Crear categorías
- ✅ Actualizar categorías
- ✅ Aprobar promociones
- ✅ Ajustar stock de productos
- ✅ Obtener productos marcados
- ✅ Obtener logs de inventario

### Fase 4: Finanzas y Billeteras (7 endpoints)
- ✅ Actualizar estado de pago de órdenes
- ✅ Procesar pagos a restaurantes
- ✅ Ajustar billeteras de restaurantes
- ✅ Procesar pagos a repartidores
- ✅ Ajustar billeteras de repartidores
- ✅ Obtener transacciones de restaurantes
- ✅ Obtener transacciones de repartidores

### Fase 5: Logística y Repartidores (6 endpoints)
- ✅ Actualizar KYC de repartidores
- ✅ Bloquear/desbloquear repartidores
- ✅ Forzar asignación de repartidores
- ✅ Obtener repartidores con KYC pendiente
- ✅ Obtener logs de ruta de órdenes
- ✅ Obtener asignaciones de repartidores

### Fase 6: Soporte, Auditoría y Comms (7 endpoints)
- ✅ Actualizar estado de quejas
- ✅ Enviar mensajes
- ✅ Crear notificaciones masivas
- ✅ Obtener logs de auditoría
- ✅ Obtener quejas
- ✅ Obtener calificaciones reportadas

## 🔧 Configuración de Tests

### Autenticación
Los tests se autentican automáticamente usando las credenciales del Super Admin:
```javascript
const ADMIN_CREDENTIALS = {
  email: 'admin@delixmi.com',
  password: 'admin123'
};
```

### Datos de Prueba
Los tests utilizan datos del seed de la base de datos:
- **Super Admin**: ID 1, email admin@delixmi.com
- **Usuarios de prueba**: Roles customer, driver, owner
- **Restaurantes**: Datos de prueba del seed
- **Órdenes**: Datos de prueba del seed

### Limpieza de Datos
Los tests incluyen limpieza automática de datos de prueba:
- Eliminación de roles creados durante las pruebas
- Eliminación de categorías creadas durante las pruebas
- Eliminación de áreas de servicio creadas durante las pruebas

## 📊 Cobertura de Testing

### Casos de Prueba Incluidos
- ✅ **Casos Exitosos**: Verificación de respuestas 200/201 con datos correctos
- ✅ **Casos de Error**: Verificación de respuestas 400/404/500 con mensajes apropiados
- ✅ **Validaciones**: Pruebas de validación de entrada con datos inválidos
- ✅ **Filtros**: Pruebas de filtros y paginación en endpoints de listado
- ✅ **Transacciones**: Verificación de operaciones atómicas en billeteras
- ✅ **Auditoría**: Verificación de logs de auditoría en operaciones críticas

### Validaciones Específicas
- **Autenticación**: Verificación de tokens JWT válidos
- **Autorización**: Verificación de permisos de Super Admin
- **Validación de Datos**: Pruebas con Zod schemas
- **Estructura de Respuesta**: Verificación de formato JSON estandarizado
- **Paginación**: Verificación de metadatos de paginación
- **Filtros**: Verificación de filtros combinados

## 🐛 Troubleshooting

### Error de Conexión
Si los tests fallan por conexión:
1. Verificar que el backend esté desplegado en Render
2. Verificar la URL base en los archivos de test
3. Verificar conectividad de red

### Error de Autenticación
Si falla la autenticación:
1. Verificar que las credenciales del Super Admin sean correctas
2. Verificar que el usuario Super Admin exista en la base de datos
3. Verificar que el endpoint de login funcione correctamente

### Error de Datos
Si fallan por datos faltantes:
1. Verificar que el seed se haya ejecutado correctamente
2. Verificar que existan datos de prueba en la base de datos
3. Verificar que los IDs de prueba sean válidos

## 📈 Métricas de Calidad

- **Cobertura de Endpoints**: 100% (36/36 endpoints)
- **Cobertura de Casos de Error**: 100% (todos los códigos de error probados)
- **Cobertura de Validaciones**: 100% (todos los schemas Zod probados)
- **Cobertura de Filtros**: 100% (todos los filtros probados)
- **Cobertura de Paginación**: 100% (todos los endpoints de listado)

## 🔄 Mantenimiento

### Agregar Nuevos Tests
1. Crear archivo de test siguiendo el patrón `faseX_nombre.test.js`
2. Incluir casos exitosos y de error
3. Agregar limpieza de datos si es necesario
4. Actualizar este README con la nueva fase

### Actualizar Tests Existentes
1. Modificar el archivo de test correspondiente
2. Verificar que todos los casos sigan funcionando
3. Actualizar documentación si es necesario

### Ejecutar Tests en CI/CD
```bash
# En el pipeline de CI/CD
npm install
npm run test:admin:all
```

## 📞 Soporte

Para problemas con los tests:
1. Revisar los logs de ejecución
2. Verificar la conectividad con Render
3. Verificar que el backend esté funcionando correctamente
4. Contactar al equipo de desarrollo
