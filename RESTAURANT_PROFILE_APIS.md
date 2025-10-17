# 🏪 **APIs PARA CONFIGURAR PERFIL DE RESTAURANTE**

## 📋 **RESUMEN EJECUTIVO**

✅ **TODAS LAS APIs ESTÁN IMPLEMENTADAS Y FUNCIONANDO**

El backend está **100% listo** para la implementación del frontend Flutter. Todas las funcionalidades solicitadas están implementadas con validaciones robustas y manejo de errores completo.

---

## 🔗 **ENDPOINTS DISPONIBLES**

### **1. 📥 Obtener Perfil del Restaurante**
```bash
GET /api/restaurant/profile
Headers: Authorization: Bearer <token>
```

**✅ Respuesta:**
```json
{
  "status": "success",
  "message": "Perfil del restaurante obtenido exitosamente",
  "data": {
    "restaurant": {
      "id": 1,
      "name": "Pizzería de Ana",
      "description": "Las mejores pizzas artesanales de la región, con ingredientes frescos y locales.",
      "logoUrl": "https://api.delixmi.com/uploads/logos/logo_123.jpg",
      "coverPhotoUrl": "https://api.delixmi.com/uploads/covers/cover_123.jpg",
      "phone": "+52 771 123 4567",
      "email": "contacto@pizzeriadeana.com",
      "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
      "status": "active",
      "owner": {
        "id": 16,
        "name": "Ana",
        "lastname": "García",
        "email": "ana.garcia@pizzeria.com",
        "phone": "2222222222"
      },
      "branches": [
        {
          "id": 1,
          "name": "Sucursal Centro",
          "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.",
          "phone": "7711234567",
          "status": "active",
          "createdAt": "2024-01-15T10:00:00Z",
          "updatedAt": "2024-01-15T10:00:00Z"
        }
      ],
      "statistics": {
        "totalBranches": 3,
        "totalSubcategories": 8,
        "totalProducts": 10
      },
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  }
}
```

### **2. 📤 Actualizar Perfil del Restaurante**
```bash
PATCH /api/restaurant/profile
Headers: 
  Authorization: Bearer <token>
  Content-Type: application/json
```

**✅ Body (todos los campos son opcionales):**
```json
{
  "name": "Pizzería de Ana - Actualizada",
  "description": "Las mejores pizzas artesanales de la ciudad con ingredientes frescos",
  "phone": "+52 771 123 4568",
  "email": "contacto@pizzeriadeana.com",
  "address": "Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo., México"
}
```

**✅ Respuesta:**
```json
{
  "status": "success",
  "message": "Perfil del restaurante actualizado exitosamente",
  "data": {
    "restaurant": {
      // ... perfil completo actualizado
    }
  }
}
```

### **3. 🖼️ Subir Logo del Restaurante**
```bash
POST /api/restaurant/upload-logo
# O también funciona con:
POST /api/restaurant/uploads/logo
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**✅ Body:**
- Campo: `image` (archivo) - Para rutas legacy
- Campo: `logo` (archivo) - Para rutas nuevas
- Formatos: JPG, JPEG, PNG
- Tamaño máximo: 5MB
- Dimensiones recomendadas: 400x400px

**✅ Respuesta:**
```json
{
  "status": "success",
  "message": "Logo subido exitosamente",
  "data": {
    "logoUrl": "https://api.delixmi.com/uploads/logos/logo_123_new.jpg",
    "filename": "logo_123_new.jpg",
    "originalName": "mi_logo.jpg",
    "size": 2048576,
    "mimetype": "image/jpeg"
  }
}
```

### **4. 📸 Subir Portada del Restaurante**
```bash
POST /api/restaurant/upload-cover
# O también funciona con:
POST /api/restaurant/uploads/cover
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**✅ Body:**
- Campo: `image` (archivo) - Para rutas legacy
- Campo: `cover` (archivo) - Para rutas nuevas
- Formatos: JPG, JPEG, PNG
- Tamaño máximo: 5MB
- Dimensiones recomendadas: 1200x400px

**✅ Respuesta:**
```json
{
  "status": "success",
  "message": "Foto de portada subida exitosamente",
  "data": {
    "coverPhotoUrl": "https://api.delixmi.com/uploads/covers/cover_123_new.jpg",
    "filename": "cover_123_new.jpg",
    "originalName": "mi_portada.jpg",
    "size": 3145728,
    "mimetype": "image/jpeg"
  }
}
```

---

## ✅ **VALIDACIONES IMPLEMENTADAS**

### **📝 Validaciones de Campos de Texto:**
- **Nombre**: Requerido, máx 150 caracteres
- **Descripción**: Opcional, máx 1000 caracteres
- **Teléfono**: Formato válido, 10-20 caracteres
- **Email**: Formato válido de email, máx 150 caracteres
- **Dirección**: Máx 500 caracteres

### **🖼️ Validaciones de Imágenes:**
- **Formatos**: Solo JPG, JPEG, PNG
- **Tamaño**: Máximo 5MB
- **Compresión**: Automática en el servidor
- **Nombres únicos**: Timestamp + número aleatorio
- **CDN**: URLs públicas servidas desde `/uploads/`

### **🔒 Validaciones de Seguridad:**
- **Autenticación**: Solo el owner puede editar
- **Rate Limiting**: Configurado para subidas
- **File Scanning**: Validación de tipos MIME
- **Sanitización**: Trim automático de campos de texto

---

## 🚀 **FLUJO DE IMPLEMENTACIÓN RECOMENDADO**

### **Para Imágenes:**
```
1. Frontend sube imagen → POST /api/restaurant/upload-logo
2. Backend procesa y guarda → Devuelve URL
3. Frontend actualiza perfil → PATCH /api/restaurant/profile (con logoUrl)
4. Backend actualiza registro → Devuelve perfil completo
```

### **Para Datos de Texto:**
```
1. Frontend envía datos → PATCH /api/restaurant/profile
2. Backend valida campos → Actualiza en BD
3. Backend devuelve → Perfil actualizado completo
```

---

## 🧪 **DATOS DE PRUEBA DISPONIBLES**

### **👥 Usuarios de Prueba:**
- **Ana García** (ana.garcia@pizzeria.com) - Owner de Pizzería
- **Kenji Tanaka** (kenji.tanaka@sushi.com) - Owner de Sushi
- **Contraseña**: `supersecret`

### **🏪 Restaurantes de Prueba:**
- **Pizzería de Ana** - Con datos completos de contacto
- **Sushi Master Kenji** - Con datos completos de contacto

---

## 📊 **CÓDIGOS DE RESPUESTA HTTP**

- **200**: Operación exitosa
- **400**: Datos inválidos o archivo demasiado grande
- **401**: No autenticado
- **403**: Sin permisos (no es owner)
- **404**: Restaurante no encontrado
- **500**: Error interno del servidor

---

## 🎯 **CHECKLIST COMPLETADO**

### **✅ APIs Necesarias:**
- [x] `GET /api/restaurant/profile` - Obtener perfil completo
- [x] `PATCH /api/restaurant/profile` - Actualizar datos de texto
- [x] `POST /api/restaurant/upload-logo` - Subir logo
- [x] `POST /api/restaurant/upload-cover` - Subir portada

### **✅ Validaciones:**
- [x] **Nombre**: Requerido, máx 150 caracteres
- [x] **Descripción**: Opcional, máx 1000 caracteres
- [x] **Teléfono**: Formato válido
- [x] **Email**: Formato válido
- [x] **Dirección**: Máx 500 caracteres
- [x] **Logo**: JPG/PNG, máx 5MB, 400x400px recomendado
- [x] **Portada**: JPG/PNG, máx 5MB, 1200x400px recomendado

### **✅ Funcionalidades:**
- [x] **Autenticación**: Solo owner puede editar
- [x] **Compresión**: Imágenes se optimizan
- [x] **CDN**: Imágenes servidas desde URLs públicas
- [x] **Rate Limiting**: Límites en subida configurados
- [x] **Error Handling**: Mensajes de error claros en español

### **✅ Respuestas:**
- [x] **Estructura JSON**: Consistente con frontend
- [x] **Códigos HTTP**: 200, 400, 401, 403, 500 apropiados
- [x] **Mensajes**: Claros y en español
- [x] **Timestamps**: Formato ISO 8601

---

## 🎉 **CONCLUSIÓN**

**¡EL BACKEND ESTÁ 100% LISTO!** 🚀

Todas las APIs solicitadas están implementadas, probadas y funcionando correctamente. El frontend puede proceder inmediatamente con la implementación usando estos endpoints.

**Características destacadas:**
- ✅ Validaciones robustas
- ✅ Manejo de errores completo
- ✅ Seguridad implementada
- ✅ Documentación completa
- ✅ Datos de prueba disponibles
- ✅ URLs de imágenes públicas
- ✅ Respuestas consistentes

**¡Proceder con la implementación del frontend moderno!** 🎨
