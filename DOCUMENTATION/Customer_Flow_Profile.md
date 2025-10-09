# 👤 Flujo del Cliente - Mi Perfil

## 🎯 Descripción General

Este documento describe el flujo completo para la gestión del perfil del cliente, incluyendo la vista "Mi Perfil", edición de datos personales, cambio de contraseña y acceso a funcionalidades de ayuda y soporte.

---

## 🔄 Flujo Completo del Cliente

### 1️⃣ **VISTA "MI PERFIL" PRINCIPAL**

La vista principal muestra la información del usuario y opciones de configuración organizadas de manera elegante y funcional.

#### Endpoint para Obtener Perfil
```
GET /api/auth/profile
```

#### Headers Requeridos
```
Authorization: Bearer <token>
```

#### Respuesta de Ejemplo
```json
{
  "status": "success",
  "message": "Perfil obtenido exitosamente",
  "data": {
    "user": {
      "id": 5,
      "name": "Sofía",
      "lastname": "López",
      "email": "sofia.lopez@email.com",
      "phone": "4444444444",
      "status": "active",
      "emailVerifiedAt": "2025-09-15T10:30:00.000Z",
      "phoneVerifiedAt": "2025-09-15T10:35:00.000Z",
      "createdAt": "2025-09-15T10:30:00.000Z",
      "updatedAt": "2025-09-15T10:30:00.000Z",
      "roles": [
        {
          "roleId": 10,
          "roleName": "customer",
          "roleDisplayName": "Cliente",
          "restaurantId": null,
          "branchId": null
        }
      ]
    }
  }
}
```

#### 🎨 UI - Diseño Premium de "Mi Perfil"

```
┌─────────────────────────────────────┐
│  ← Mi Perfil                        │
├─────────────────────────────────────┤
│                                     │
│  [👤 Avatar con iniciales "SL"]    │
│                                     │
│  Sofía López                        │
│  sofia.lopez@email.com              │
│  📱 444-444-4444                    │
│                                     │
│  Cliente desde Septiembre 2025      │
│                                     │
│  [✏️ Editar perfil]                 │
│                                     │
├─────────────────────────────────────┤
│  ⚙️ Configuración                   │
│                                     │
│  📍 Mis Direcciones                 │
│  📋 Historial de Pedidos            │
│  🔒 Cambiar contraseña              │
│  ❓ Ayuda y Soporte                 │
│                                     │
├─────────────────────────────────────┤
│  [🚪 Cerrar Sesión]                 │
└─────────────────────────────────────┘
```

**Elementos clave del diseño:**
- ✅ **Avatar personalizado** con iniciales del usuario (ej: "SL" para Sofía López)
- ✅ **Información completa** del usuario (nombre, email, teléfono)
- ✅ **Indicador de antigüedad** ("Cliente desde...")
- ✅ **Botón de edición** prominente pero elegante
- ✅ **Secciones organizadas** con iconos descriptivos
- ✅ **Botón de cerrar sesión** separado visualmente

---

### 2️⃣ **EDITAR PERFIL**

Permite al usuario actualizar su información personal (nombre, apellido, teléfono).

#### Endpoint
```
PUT /api/auth/profile
```

#### Headers Requeridos
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "name": "Sofía María",
  "lastname": "López García",
  "phone": "5555555555"
}
```

#### Campos del Body
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | string | ❌ No | Nuevo nombre (2-100 caracteres) |
| `lastname` | string | ❌ No | Nuevo apellido (2-100 caracteres) |
| `phone` | string | ❌ No | Nuevo teléfono (formato mexicano) |

#### ✅ Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Perfil actualizado exitosamente",
  "data": {
    "user": {
      "id": 5,
      "name": "Sofía María",
      "lastname": "López García",
      "email": "sofia.lopez@email.com",
      "phone": "5555555555",
      "status": "active",
      "emailVerifiedAt": "2025-09-15T10:30:00.000Z",
      "phoneVerifiedAt": "2025-09-15T10:35:00.000Z",
      "createdAt": "2025-09-15T10:30:00.000Z",
      "updatedAt": "2025-10-09T14:30:00.000Z"
    }
  }
}
```

#### ❌ Error: Teléfono ya en uso (409)
```json
{
  "status": "error",
  "message": "Este número de teléfono ya está registrado por otro usuario",
  "code": "PHONE_EXISTS"
}
```

#### 🎨 UI - Formulario de Edición de Perfil

```
┌─────────────────────────────────────┐
│  ← Editar Perfil                    │
├─────────────────────────────────────┤
│                                     │
│  [👤 Avatar con iniciales]         │
│                                     │
│  Nombre:                            │
│  [Sofía María________________]      │
│                                     │
│  Apellido:                          │
│  [López García________________]     │
│                                     │
│  Teléfono:                          │
│  [555-555-5555________________]     │
│                                     │
│  Email: (no editable)               │
│  [sofia.lopez@email.com________]    │
│                                     │
│  [Cancelar]  [Guardar Cambios]      │
│                                     │
└─────────────────────────────────────┘
```

**Características del formulario:**
- ✅ **Campos editables** con validación en tiempo real
- ✅ **Email no editable** (solo lectura)
- ✅ **Validación de teléfono** mexicano
- ✅ **Botones de acción** claros y accesibles
- ✅ **Avatar actualizado** dinámicamente

---

### 3️⃣ **CAMBIAR CONTRASEÑA**

Permite al usuario cambiar su contraseña de forma segura.

#### Endpoint
```
PUT /api/auth/change-password
```

#### Headers Requeridos
```
Authorization: Bearer <token>
Content-Type: application/json
```

#### Body
```json
{
  "currentPassword": "MiContraseñaActual123!",
  "newPassword": "MiNuevaContraseña456!"
}
```

#### Campos del Body
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `currentPassword` | string | ✅ Sí | Contraseña actual del usuario |
| `newPassword` | string | ✅ Sí | Nueva contraseña (mínimo 8 caracteres, con mayúscula, minúscula, número y carácter especial) |

#### ✅ Respuesta Exitosa (200)
```json
{
  "status": "success",
  "message": "Contraseña actualizada exitosamente",
  "data": {
    "userId": 5,
    "updatedAt": "2025-10-09T14:30:00.000Z"
  }
}
```

#### ❌ Error: Contraseña actual incorrecta (400)
```json
{
  "status": "error",
  "message": "La contraseña actual es incorrecta",
  "code": "INVALID_CURRENT_PASSWORD"
}
```

#### ❌ Error: Nueva contraseña no cumple requisitos (400)
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "msg": "La nueva contraseña debe contener al menos: 1 letra minúscula, 1 mayúscula, 1 número y 1 carácter especial",
      "param": "newPassword",
      "location": "body"
    }
  ]
}
```

#### 🎨 UI - Formulario de Cambio de Contraseña

```
┌─────────────────────────────────────┐
│  ← Cambiar Contraseña               │
├─────────────────────────────────────┤
│                                     │
│  🔒 Cambiar tu contraseña           │
│                                     │
│  Contraseña actual:                 │
│  [••••••••••••••••••••••••••••]    │
│                                     │
│  Nueva contraseña:                  │
│  [••••••••••••••••••••••••••••]    │
│                                     │
│  Confirmar nueva contraseña:        │
│  [••••••••••••••••••••••••••••]    │
│                                     │
│  Requisitos:                        │
│  ✓ Mínimo 8 caracteres              │
│  ✓ 1 letra mayúscula                │
│  ✓ 1 letra minúscula                │
│  ✓ 1 número                         │
│  ✓ 1 carácter especial              │
│                                     │
│  [Cancelar]  [Cambiar Contraseña]   │
│                                     │
└─────────────────────────────────────┘
```

**Características del formulario:**
- ✅ **Campos de contraseña** con visibilidad toggle
- ✅ **Validación en tiempo real** de requisitos
- ✅ **Indicadores visuales** de cumplimiento de requisitos
- ✅ **Confirmación de contraseña** para evitar errores
- ✅ **Diseño de seguridad** con iconos apropiados

---

### 4️⃣ **AYUDA Y SOPORTE**

Sección premium con múltiples opciones de ayuda organizadas de manera intuitiva.

#### 🎨 UI - Sección de Ayuda y Soporte

```
┌─────────────────────────────────────┐
│  ← Ayuda y Soporte                  │
├─────────────────────────────────────┤
│                                     │
│  📞 Contacto Directo                │
│                                     │
│  💬 Chat en Vivo                    │
│  📞 Llamar a Soporte                │
│  📧 Enviar Email                    │
│                                     │
├─────────────────────────────────────┤
│  📚 Centro de Ayuda                 │
│                                     │
│  ❓ Preguntas Frecuentes            │
│  🎥 Tutoriales en Video             │
│  📖 Guía de Usuario                 │
│  🔧 Solución de Problemas           │
│                                     │
├─────────────────────────────────────┤
│  📋 Información Legal               │
│                                     │
│  📄 Términos y Condiciones          │
│  🔒 Política de Privacidad          │
│  📊 Política de Cookies             │
│                                     │
├─────────────────────────────────────┤
│  🚀 Acerca de la App                │
│                                     │
│  ℹ️ Información de la App           │
│  ⭐ Calificar en App Store          │
│  📤 Compartir con Amigos            │
│                                     │
└─────────────────────────────────────┘
```

**Funcionalidades de cada sección:**

### **📞 Contacto Directo**
- **💬 Chat en Vivo**: Chat en tiempo real con soporte (futuro)
- **📞 Llamar a Soporte**: Teléfono directo `tel:+52-771-123-4567`
- **📧 Enviar Email**: Abre cliente de email con dirección pre-llenada

### **📚 Centro de Ayuda**
- **❓ Preguntas Frecuentes**: Lista de preguntas comunes con respuestas
- **🎥 Tutoriales en Video**: Videos explicativos de la app
- **📖 Guía de Usuario**: Documentación completa paso a paso
- **🔧 Solución de Problemas**: Guías para problemas comunes

### **📋 Información Legal**
- **📄 Términos y Condiciones**: Documento legal completo
- **🔒 Política de Privacidad**: Cómo protegemos los datos del usuario
- **📊 Política de Cookies**: Uso de cookies y tecnologías similares

### **🚀 Acerca de la App**
- **ℹ️ Información de la App**: Versión, desarrollador, etc.
- **⭐ Calificar en App Store**: Redirige a la tienda de aplicaciones
- **📤 Compartir con Amigos**: Funcionalidad de compartir la app

---

## 🔄 Flujo Completo del Usuario (UX)

### **Flujo: Editar Perfil**

```
1. Usuario pulsa "✏️ Editar perfil" en Mi Perfil
   ↓
2. Se abre formulario con datos actuales pre-llenados
   ↓
3. Usuario modifica los campos deseados
   ↓
4. Validación en tiempo real de cada campo
   ↓
5. Usuario pulsa "Guardar Cambios"
   ↓
6. PUT /api/auth/profile con datos actualizados
   ↓
7. ✅ Perfil actualizado exitosamente
   ↓
8. Se regresa a Mi Perfil con datos actualizados
   ↓
9. Avatar se actualiza con nuevas iniciales
   ↓
10. Toast notification: "Perfil actualizado exitosamente"
```

### **Flujo: Cambiar Contraseña**

```
1. Usuario pulsa "🔒 Cambiar contraseña" en Mi Perfil
   ↓
2. Se abre formulario de cambio de contraseña
   ↓
3. Usuario ingresa contraseña actual
   ↓
4. Usuario ingresa nueva contraseña
   ↓
5. Validación en tiempo real de requisitos
   ↓
6. Usuario confirma nueva contraseña
   ↓
7. Usuario pulsa "Cambiar Contraseña"
   ↓
8. PUT /api/auth/change-password
   ↓
9. ✅ Contraseña actualizada exitosamente
   ↓
10. Se regresa a Mi Perfil
    ↓
11. Toast notification: "Contraseña actualizada exitosamente"
    ↓
12. Opcional: Solicitar login nuevamente por seguridad
```

### **Flujo: Ayuda y Soporte**

```
1. Usuario pulsa "❓ Ayuda y Soporte" en Mi Perfil
   ↓
2. Se abre vista con 4 secciones organizadas
   ↓
3. Usuario selecciona la opción deseada:
   
   📞 Contacto Directo:
   - Pulsar "💬 Chat en Vivo" → Abre chat (futuro)
   - Pulsar "📞 Llamar a Soporte" → Abre app de teléfono
   - Pulsar "📧 Enviar Email" → Abre cliente de email
   
   📚 Centro de Ayuda:
   - Pulsar "❓ Preguntas Frecuentes" → Lista de FAQs
   - Pulsar "🎥 Tutoriales" → Lista de videos
   - Pulsar "📖 Guía" → Documentación web
   - Pulsar "🔧 Problemas" → Guías de solución
   
   📋 Información Legal:
   - Pulsar cualquier opción → Abre documento web
   
   🚀 Acerca de la App:
   - Pulsar "ℹ️ Información" → Detalles de la app
   - Pulsar "⭐ Calificar" → Redirige a App Store
   - Pulsar "📤 Compartir" → Funcionalidad nativa de compartir
```

---

## 🎨 Recomendaciones de UX/UI Premium

### 1. **Avatar Personalizado**
```javascript
// Generar iniciales del usuario
const getInitials = (name, lastname) => {
  const firstInitial = name?.charAt(0).toUpperCase() || '';
  const lastInitial = lastname?.charAt(0).toUpperCase() || '';
  return firstInitial + lastInitial;
};

// Colores de fondo para avatar
const getAvatarColor = (name) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};
```

### 2. **Indicadores de Estado**
- ✅ **Email verificado**: Badge verde con checkmark
- ✅ **Teléfono verificado**: Badge verde con checkmark
- ⚠️ **Email no verificado**: Badge amarillo con warning
- ⚠️ **Teléfono no verificado**: Badge amarillo con warning

### 3. **Animaciones y Transiciones**
- **Smooth transitions** entre vistas
- **Loading states** durante las peticiones
- **Success animations** al guardar cambios
- **Error animations** con feedback visual claro

### 4. **Accesibilidad**
- **VoiceOver/TalkBack** compatible
- **Contraste adecuado** en todos los elementos
- **Tamaños de toque** apropiados (mínimo 44px)
- **Navegación por teclado** en formularios

### 5. **Feedback Visual**
```javascript
// Toast notifications con diferentes tipos
const showToast = (message, type = 'success') => {
  const colors = {
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3'
  };
  
  // Mostrar toast con color y icono apropiados
};
```

---

## 🔐 Seguridad y Validaciones

### **Validaciones del Frontend**

1. **Actualizar Perfil:**
   - Nombre: 2-100 caracteres, solo letras y espacios
   - Apellido: 2-100 caracteres, solo letras y espacios
   - Teléfono: Formato mexicano válido (10 dígitos)

2. **Cambiar Contraseña:**
   - Contraseña actual: No puede estar vacía
   - Nueva contraseña: Mínimo 8 caracteres
   - Nueva contraseña: Debe contener mayúscula, minúscula, número y carácter especial
   - Confirmación: Debe coincidir con nueva contraseña

### **Validaciones del Backend**
- Todas las validaciones del frontend se replican en el backend
- Verificación de teléfono único en la base de datos
- Verificación de contraseña actual antes de cambiar
- Sanitización de inputs para prevenir XSS

---

## 📱 Responsive Design

### **Mobile First (Prioridad)**
- Diseño optimizado para pantallas pequeñas
- Navegación por gestos (swipe, tap)
- Formularios de una columna
- Botones de tamaño adecuado para dedos

### **Tablet**
- Layout de dos columnas cuando sea apropiado
- Más espacio para formularios
- Navegación mejorada

### **Desktop (Futuro)**
- Layout de tres columnas
- Sidebar de navegación
- Formularios más amplios

---

## 🚀 Endpoints Completos del Flujo

| Método | Endpoint | Autenticación | Descripción |
|--------|----------|---------------|-------------|
| GET | `/api/auth/profile` | ✅ Sí | Obtener perfil del usuario |
| PUT | `/api/auth/profile` | ✅ Sí | Actualizar perfil del usuario |
| PUT | `/api/auth/change-password` | ✅ Sí | Cambiar contraseña del usuario |
| GET | `/api/customer/addresses` | ✅ Sí | Obtener direcciones del usuario |
| GET | `/api/customer/orders` | ✅ Sí | Obtener pedidos del usuario |
| GET | `/api/customer/orders?status=delivered` | ✅ Sí | Obtener historial de pedidos |

---

## ✅ Checklist de Implementación Frontend

### **Vista "Mi Perfil"**
- [ ] Diseño premium con avatar personalizado
- [ ] Mostrar información completa del usuario
- [ ] Indicadores de verificación (email, teléfono)
- [ ] Botón de editar perfil prominente
- [ ] Sección de configuración organizada
- [ ] Botón de cerrar sesión separado

### **Editar Perfil**
- [ ] Formulario con datos pre-llenados
- [ ] Validación en tiempo real
- [ ] Campos editables apropiados
- [ ] Email no editable (solo lectura)
- [ ] Botones de acción claros
- [ ] Actualización dinámica del avatar

### **Cambiar Contraseña**
- [ ] Formulario de cambio seguro
- [ ] Campos de contraseña con visibilidad toggle
- [ ] Validación en tiempo real de requisitos
- [ ] Indicadores visuales de cumplimiento
- [ ] Confirmación de contraseña
- [ ] Feedback de seguridad

### **Ayuda y Soporte**
- [ ] 4 secciones organizadas
- [ ] Contacto directo (teléfono, email)
- [ ] Centro de ayuda (FAQs, tutoriales)
- [ ] Información legal (términos, privacidad)
- [ ] Acerca de la app (versión, calificar, compartir)
- [ ] Enlaces apropiados para cada funcionalidad

### **Funcionalidad General**
- [ ] Navegación fluida entre vistas
- [ ] Loading states durante peticiones
- [ ] Toast notifications para feedback
- [ ] Manejo de errores con mensajes claros
- [ ] Animaciones suaves y profesionales
- [ ] Diseño responsive (mobile-first)
- [ ] Accesibilidad completa

---

## 📝 Notas Adicionales

### **Avatar y Personalización**
- Las iniciales se generan automáticamente del nombre y apellido
- Colores de fondo del avatar se asignan consistentemente
- El avatar se actualiza dinámicamente al cambiar el nombre

### **Seguridad**
- Todas las contraseñas se hashean con bcrypt
- Las validaciones se realizan tanto en frontend como backend
- Los tokens JWT se verifican en cada petición

### **Experiencia de Usuario**
- Feedback inmediato en todas las acciones
- Mensajes de error claros y accionables
- Navegación intuitiva y familiar
- Diseño consistente con el resto de la app

---

## 🎨 Paleta de Colores Sugerida

```css
/* Colores principales */
--primary-color: #FF6B35;        /* Naranja Delixmi */
--primary-light: #FF8A65;        /* Naranja claro */
--primary-dark: #E64A19;         /* Naranja oscuro */

/* Colores de estado */
--success-color: #4CAF50;        /* Verde éxito */
--error-color: #F44336;          /* Rojo error */
--warning-color: #FF9800;        /* Naranja warning */
--info-color: #2196F3;           /* Azul información */

/* Colores de texto */
--text-primary: #212121;         /* Texto principal */
--text-secondary: #757575;       /* Texto secundario */
--text-hint: #BDBDBD;            /* Texto hints */

/* Colores de fondo */
--background-primary: #FFFFFF;   /* Fondo principal */
--background-secondary: #F5F5F5; /* Fondo secundario */
--background-elevated: #FFFFFF;  /* Fondo elevado */
```

---

**Documentación actualizada:** Octubre 2025  
**Versión:** 1.0  
**Backend:** Node.js + Express + Prisma + MySQL  
**Nivel:** Premium MVP - Calidad de apps top del mercado
