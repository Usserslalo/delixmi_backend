# Documentación API - Gestión de Menú Owner (Propietario de Restaurante)

## 📸 Subida de Imágenes de Productos

### Endpoint de Subida de Imagen de Producto
**POST** `/api/restaurant/products/upload-image`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/products/upload-image`
- **Archivo de ruta:** `src/routes/restaurant-admin.routes.js`
- **Prefijo montado:** `/api/restaurant` (configurado en `src/server.js`)

#### Middlewares Aplicados

1. **Autenticación** (`authenticateToken`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Propósito: Verificar que el usuario esté autenticado y tenga un token JWT válido
   - Establece `req.user` con la información del usuario autenticado

2. **Autorización por Rol** (`requireRole(['owner', 'branch_manager'])`)
   - Archivo: `src/middleware/auth.middleware.js`
   - Propósito: Verificar que el usuario tenga el rol de 'owner' o 'branch_manager'
   - Solo usuarios con estos roles pueden subir imágenes de productos

3. **Subida de Archivo** (`uploadProduct.single('image')`)
   - Archivo: `src/config/multer.js`
   - Configuración: `uploadProduct` - multer configurado específicamente para imágenes de productos
   - **Directorio destino:** `public/uploads/products/`
   - **Nombre de campo:** `image` (debe coincidir exactamente en el form-data)
   - **Límites:** 5MB máximo, 1 archivo por vez
   - **Tipos permitidos:** JPG, JPEG, PNG únicamente
   - Establece `req.file` con la información del archivo subido

4. **Manejo de Errores de Multer** (`handleMulterError`)
   - Archivo: `src/config/multer.js`
   - Propósito: Capturar y formatear errores específicos de multer
   - Maneja: tamaño de archivo excedido, tipos no permitidos, múltiples archivos

#### Configuración de Multer para Productos

```javascript
// Configuración específica en src/config/multer.js
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/products');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const randomNumber = Math.round(Math.random() * 10000);
    const extension = path.extname(file.originalname);
    const filename = `product_${timestamp}_${randomNumber}${extension}`;
    cb(null, filename);
  }
});

const uploadProduct = multer({
  storage: productStorage,
  fileFilter: fileFilter, // Solo imágenes JPG, JPEG, PNG
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Solo un archivo por vez
  }
});
```

#### Controlador

**Función:** `uploadProductImage` en `src/controllers/upload.controller.js`

**Lógica del Controlador:**
```javascript
const uploadProductImage = async (req, res) => {
  try {
    // 1. Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionó ningún archivo',
        code: 'NO_FILE_PROVIDED'
      });
    }

    // 2. Construir la URL pública del archivo
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

    // 3. Respuesta exitosa con información del archivo
    res.status(200).json({
      status: 'success',
      message: 'Imagen de producto subida exitosamente',
      data: {
        imageUrl: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });
  } catch (error) {
    // Manejo de errores internos
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};
```

#### Request Configuration (Postman)

**Método:** `POST`
**URL:** `https://delixmi-backend.onrender.com/api/restaurant/products/upload-image`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data (automático)
```

**Body (form-data):**
```
Key: image (tipo File)
Value: [Seleccionar archivo de imagen]
```

**Archivo requerido:**
- **Tipos permitidos:** JPG, JPEG, PNG
- **Tamaño máximo:** 5MB
- **Cantidad:** 1 archivo por request

#### Respuesta Exitosa

**Status:** `200 OK`

```json
{
  "status": "success",
  "message": "Imagen de producto subida exitosamente",
  "data": {
    "imageUrl": "https://delixmi-backend.onrender.com/uploads/products/product_1760811098392_1792.jpg",
    "filename": "product_1760811098392_1792.jpg",
    "originalName": "sushi.jpg",
    "size": 318764,
    "mimetype": "image/jpeg"
  }
}
```

**Ejemplo real de respuesta exitosa obtenida en pruebas:**
- **Archivo subido:** `sushi.jpg` (318,764 bytes)
- **URL generada:** `https://delixmi-backend.onrender.com/uploads/products/product_1760811098392_1792.jpg`
- **Nomenclatura:** `product_{timestamp}_{randomNumber}.jpg`

**Campos de respuesta:**
- `imageUrl`: URL pública completa para acceder a la imagen
- `filename`: Nombre único generado por el servidor
- `originalName`: Nombre original del archivo subido
- `size`: Tamaño del archivo en bytes
- `mimetype`: Tipo MIME del archivo

#### Manejo de Errores

**1. Error de Autenticación (401)**
```json
{
  "status": "error",
  "message": "Token no válido o expirado",
  "code": "UNAUTHORIZED"
}
```

**2. Error de Autorización (403)**
```json
{
  "status": "error",
  "message": "No tienes permisos para realizar esta acción",
  "code": "FORBIDDEN"
}
```

**3. Archivo no proporcionado (400)**
```json
{
  "status": "error",
  "message": "No se proporcionó ningún archivo",
  "code": "NO_FILE_PROVIDED"
}
```

**4. Archivo demasiado grande (400)**
```json
{
  "status": "error",
  "message": "El archivo es demasiado grande. El tamaño máximo permitido es 5MB",
  "code": "FILE_TOO_LARGE"
}
```

**5. Tipo de archivo no válido (400)**
```json
{
  "status": "error",
  "message": "Solo se permiten archivos JPG, JPEG y PNG",
  "code": "INVALID_FILE_TYPE"
}
```

**6. Múltiples archivos (400)**
```json
{
  "status": "error",
  "message": "Solo se permite subir un archivo a la vez",
  "code": "TOO_MANY_FILES"
}
```

**7. Error interno del servidor (500)**
```json
{
  "status": "error",
  "message": "Error interno del servidor",
  "code": "INTERNAL_ERROR"
}
```

#### Notas Importantes

1. **Separación de responsabilidades:** Este endpoint solo sube la imagen y devuelve la URL. No actualiza ningún producto en la base de datos.

2. **Uso del imageUrl:** La URL devuelta debe ser utilizada en el campo `imageUrl` al crear o actualizar productos mediante los endpoints correspondientes.

3. **Nomenclatura de archivos:** Los archivos se guardan con formato `product_{timestamp}_{randomNumber}.{extension}` para evitar conflictos.

4. **Acceso a archivos:** Las imágenes son públicamente accesibles via la URL devuelta en `data.imageUrl`.
