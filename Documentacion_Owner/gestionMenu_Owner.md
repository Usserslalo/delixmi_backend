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

---

## 🍕 Creación de Productos

### Endpoint de Creación de Producto
**POST** `/api/restaurant/products`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/products`
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
   - Solo usuarios con estos roles pueden crear productos

3. **Validación con Zod** (`validate(createProductSchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Schema: `src/validations/product.validation.js` - `createProductSchema`
   - Propósito: Validar estructura y tipos de datos del request body

#### Validaciones de Entrada (Zod Schema)

```javascript
const createProductSchema = z.object({
  subcategoryId: z
    .number({ 
      required_error: 'El ID de la subcategoría es requerido',
      invalid_type_error: 'El ID de la subcategoría debe ser un número'
    })
    .int({ message: 'El ID de la subcategoría debe ser un número entero' })
    .min(1, 'El ID de la subcategoría debe ser mayor que 0'),

  name: z
    .string({ required_error: 'El nombre del producto es requerido' })
    .min(1, 'El nombre del producto es requerido')
    .max(150, 'El nombre debe tener máximo 150 caracteres')
    .trim(),

  description: z
    .string({ invalid_type_error: 'La descripción debe ser un texto' })
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),

  imageUrl: z
    .string({ invalid_type_error: 'La URL de la imagen debe ser un texto' })
    .url({ message: 'La URL de la imagen no es válida' })
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .trim()
    .optional(),

  price: z
    .number({ 
      required_error: 'El precio del producto es requerido',
      invalid_type_error: 'El precio debe ser un número'
    })
    .positive('El precio debe ser mayor que cero')
    .min(0.01, 'El precio debe ser mayor que cero'),

  isAvailable: z
    .boolean({ invalid_type_error: 'isAvailable debe ser un valor booleano' })
    .optional()
    .default(true),

  modifierGroupIds: z
    .array(
      z.number({ invalid_type_error: 'Los IDs de grupos de modificadores deben ser números' })
        .int({ message: 'Los IDs de grupos de modificadores deben ser números enteros' })
        .min(1, 'Los IDs de grupos de modificadores deben ser mayores que 0')
    )
    .optional()
    .default([])
}).strict();
```

#### Controlador Refactorizado

**Función:** `createProduct` en `src/controllers/restaurant-admin.controller.js`

**Lógica del Controlador (Refactorizado con Repository Pattern):**
```javascript
const createProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { modifierGroupIds = [], ...productData } = req.body;

    // Crear el producto usando el repositorio con toda la lógica de negocio
    const newProduct = await ProductRepository.create(
      productData, 
      modifierGroupIds, 
      userId, 
      req.id
    );

    // Obtener grupos de modificadores asociados para formatear la respuesta
    const associatedModifierGroups = await ProductRepository.getAssociatedModifierGroups(newProduct.id);

    // Formatear respuesta completa
    const formattedProduct = {
      id: newProduct.id,
      name: newProduct.name,
      description: newProduct.description,
      imageUrl: newProduct.imageUrl,
      price: Number(newProduct.price),
      isAvailable: newProduct.isAvailable,
      subcategory: {
        id: newProduct.subcategory.id,
        name: newProduct.subcategory.name,
        category: {
          id: newProduct.subcategory.category.id,
          name: newProduct.subcategory.category.name
        }
      },
      restaurant: {
        id: newProduct.restaurant.id,
        name: newProduct.restaurant.name
      },
      modifierGroups: associatedModifierGroups.map(group => ({
        id: group.id,
        name: group.name,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        options: group.options.map(option => ({
          id: option.id,
          name: option.name,
          price: Number(option.price)
        }))
      })),
      createdAt: newProduct.createdAt,
      updatedAt: newProduct.updatedAt
    };

    // Respuesta exitosa
    return ResponseService.success(
      res,
      'Producto creado exitosamente',
      { product: formattedProduct },
      201
    );
  } catch (error) {
    // Manejo de errores específicos del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.details, error.code);
      }
    }
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### Lógica del Repository (ProductRepository.create)

**Archivo:** `src/repositories/product.repository.js`

**Proceso de Validación y Creación:**
```javascript
static async create(data, modifierGroupIds = [], userId, requestId) {
  // 1. Validar subcategoría y obtener restaurantId
  const subcategory = await prisma.subcategory.findUnique({
    where: { id: subcategoryIdNum },
    select: { id: true, name: true, restaurantId: true, restaurant: { /* ... */ } }
  });

  // 2. Obtener información de roles del usuario
  const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

  // 3. Verificar autorización (owner/branch_manager del restaurante)
  const ownerRole = userWithRoles.userRoleAssignments.find(
    assignment => assignment.role.name === 'owner' && 
    assignment.restaurantId === subcategory.restaurantId
  );

  // 4. Validar modifierGroupIds si se proporcionan
  if (modifierGroupIds && modifierGroupIds.length > 0) {
    const validGroups = await prisma.modifierGroup.findMany({
      where: { id: { in: modifierGroupIds }, restaurantId: subcategory.restaurantId }
    });
    // Validar que todos los grupos pertenezcan al restaurante
  }

  // 5. Crear el producto con transacción para incluir asociaciones
  return await prisma.$transaction(async (tx) => {
    // Crear el producto
    const newProduct = await tx.product.create({
      data: {
        restaurantId: subcategory.restaurantId,
        subcategoryId: subcategoryIdNum,
        name: name.trim(),
        description: description ? description.trim() : null,
        imageUrl: imageUrl ? imageUrl.trim() : null,
        price: parseFloat(price),
        isAvailable: isAvailable
      },
      include: { subcategory: { /* ... */ }, restaurant: { /* ... */ } }
    });

    // Crear asociaciones con grupos de modificadores
    if (modifierGroupIds && modifierGroupIds.length > 0) {
      await tx.productModifier.createMany({
        data: modifierGroupIds.map(groupId => ({
          productId: newProduct.id,
          modifierGroupId: groupId
        }))
      });
    }

    return newProduct;
  });
}
```

#### Request Configuration (Postman)

**Método:** `POST`
**URL:** `https://delixmi-backend.onrender.com/api/restaurant/products`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Sushi de Prueba (Refactorizado)",
  "description": "Este es un producto de prueba creado con la nueva arquitectura refactorizada usando Repository Pattern y Zod validation.",
  "price": 120.50,
  "subcategoryId": 1,
  "imageUrl": "https://delixmi-backend.onrender.com/uploads/products/product_1760811098392_1792.jpg",
  "modifierGroupIds": [1],
  "isAvailable": true
}
```

#### Respuesta Exitosa

**Status:** `201 Created`

```json
{
  "status": "success",
  "message": "Producto creado exitosamente",
  "timestamp": "2025-10-18T18:22:09.577Z",
  "data": {
    "product": {
      "id": 18,
      "name": "Sushi de Prueba (Refactorizado)",
      "description": "Este es un producto de prueba creado con la nueva arquitectura refactorizada usando Repository Pattern y Zod validation.",
      "imageUrl": "https://delixmi-backend.onrender.com/uploads/products/product_1760811098392_1792.jpg",
      "price": 120.5,
      "isAvailable": true,
      "subcategory": {
        "id": 1,
        "name": "Pizzas Tradicionales",
        "category": {
          "id": 1,
          "name": "Pizzas"
        }
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana"
      },
      "modifierGroups": [
        {
          "id": 1,
          "name": "Tamaño",
          "minSelection": 1,
          "maxSelection": 1,
          "options": [
            {
              "id": 1,
              "name": "Personal (6 pulgadas)",
              "price": 0
            },
            {
              "id": 2,
              "name": "Mediana (10 pulgadas)",
              "price": 25
            },
            {
              "id": 3,
              "name": "Grande (12 pulgadas)",
              "price": 45
            },
            {
              "id": 4,
              "name": "Familiar (16 pulgadas)",
              "price": 70
            }
          ]
        }
      ],
      "createdAt": "2025-10-18T18:22:08.771Z",
      "updatedAt": "2025-10-18T18:22:08.771Z"
    }
  }
}
```

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

**3. Error de Validación Zod (400)**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "field": "price",
      "message": "El precio debe ser mayor que cero",
      "code": "too_small"
    }
  ]
}
```

**4. Subcategoría no encontrada (404)**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND"
}
```

**5. Sin permisos para la subcategoría (403)**
```json
{
  "status": "error",
  "message": "No tienes permiso para añadir productos a esta subcategoría",
  "code": "FORBIDDEN",
  "details": {
    "subcategoryId": 99,
    "restaurantId": 3,
    "restaurantName": "Pizzería de Ana"
  }
}
```

**6. Grupos de modificadores inválidos (400)**
```json
{
  "status": "error",
  "message": "Algunos grupos de modificadores no pertenecen a este restaurante",
  "code": "INVALID_MODIFIER_GROUPS",
  "details": {
    "invalidGroupIds": [999],
    "restaurantId": 1
  }
}
```

#### Notas Técnicas Importantes

1. **Arquitectura Refactorizada:** Este endpoint utiliza el nuevo patrón Repository para separar la lógica de datos del controlador, mejorando la mantenibilidad y testabilidad.

2. **Validación Zod:** Las validaciones se realizan usando esquemas Zod que proporcionan mensajes de error más descriptivos y validación de tipos más robusta.

3. **Transacciones:** El proceso de creación utiliza transacciones de Prisma para garantizar la integridad de los datos, especialmente al crear las asociaciones con grupos de modificadores.

4. **Autorización Granular:** Se valida no solo el rol del usuario, sino también que tenga permisos específicos sobre el restaurante de la subcategoría seleccionada.

5. **Gestión de Imágenes:** El campo `imageUrl` es opcional y puede ser una URL generada por el endpoint de subida de imágenes de productos (`POST /api/restaurant/products/upload-image`).

---

## 🍕 Actualización de Productos

### Endpoint de Actualización de Producto
**PATCH** `/api/restaurant/products/:productId`

#### Configuración del Endpoint
- **Ruta completa:** `https://delixmi-backend.onrender.com/api/restaurant/products/:productId`
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
   - Solo usuarios con estos roles pueden actualizar productos

3. **Validación de Parámetros** (`validateParams(productParamsSchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Schema: `src/validations/product.validation.js` - `productParamsSchema`
   - Propósito: Validar el parámetro `productId` en la URL

4. **Validación de Body** (`validate(updateProductSchema)`)
   - Archivo: `src/middleware/validate.middleware.js`
   - Schema: `src/validations/product.validation.js` - `updateProductSchema`
   - Propósito: Validar estructura y tipos de datos del request body

#### Esquemas Zod de Validación

**Esquema de Parámetros (`productParamsSchema`):**
```javascript
const productParamsSchema = z.object({
  productId: z
    .string({ required_error: 'El ID del producto es requerido' })
    .regex(/^\d+$/, 'El ID del producto debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del producto debe ser mayor que 0')
});
```

**Esquema de Body (`updateProductSchema`):**
```javascript
const updateProductSchema = z.object({
  subcategoryId: z
    .number({ invalid_type_error: 'El ID de la subcategoría debe ser un número' })
    .int({ message: 'El ID de la subcategoría debe ser un número entero' })
    .min(1, 'El ID de la subcategoría debe ser mayor que 0')
    .optional(),

  name: z
    .string({ invalid_type_error: 'El nombre debe ser un texto' })
    .min(1, 'El nombre no puede estar vacío')
    .max(150, 'El nombre debe tener máximo 150 caracteres')
    .trim()
    .optional(),

  description: z
    .string({ invalid_type_error: 'La descripción debe ser un texto' })
    .max(1000, 'La descripción no puede exceder 1000 caracteres')
    .trim()
    .optional(),

  imageUrl: z
    .string({ invalid_type_error: 'La URL de la imagen debe ser un texto' })
    .url({ message: 'La URL de la imagen no es válida' })
    .max(255, 'La URL de la imagen no puede exceder 255 caracteres')
    .trim()
    .optional(),

  price: z
    .number({ invalid_type_error: 'El precio debe ser un número' })
    .positive('El precio debe ser mayor que cero')
    .min(0.01, 'El precio debe ser mayor que cero')
    .optional(),

  isAvailable: z
    .boolean({ invalid_type_error: 'isAvailable debe ser un valor booleano' })
    .optional(),

  modifierGroupIds: z
    .array(
      z.number({ invalid_type_error: 'Los IDs de grupos de modificadores deben ser números' })
        .int({ message: 'Los IDs de grupos de modificadores deben ser números enteros' })
        .min(1, 'Los IDs de grupos de modificadores deben ser mayores que 0')
    )
    .optional()
}).strict();
```

#### Controlador Refactorizado

**Función:** `updateProduct` en `src/controllers/restaurant-admin.controller.js`

**Lógica del Controlador (Refactorizado con Repository Pattern):**
```javascript
const updateProduct = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    const { modifierGroupIds = undefined, ...productData } = req.body;

    // Actualizar el producto usando el repositorio con toda la lógica de negocio
    const updatedProduct = await ProductRepository.update(
      productId, 
      productData, 
      modifierGroupIds, 
      userId, 
      req.id
    );

    // Obtener grupos de modificadores asociados para formatear la respuesta
    const associatedModifierGroups = await ProductRepository.getAssociatedModifierGroups(updatedProduct.id);

    // Formatear respuesta completa
    const formattedProduct = {
      id: updatedProduct.id,
      name: updatedProduct.name,
      description: updatedProduct.description,
      imageUrl: updatedProduct.imageUrl,
      price: Number(updatedProduct.price),
      isAvailable: updatedProduct.isAvailable,
      subcategory: {
        id: updatedProduct.subcategory.id,
        name: updatedProduct.subcategory.name,
        category: {
          id: updatedProduct.subcategory.category.id,
          name: updatedProduct.subcategory.category.name
        }
      },
      restaurant: {
        id: updatedProduct.restaurant.id,
        name: updatedProduct.restaurant.name
      },
      modifierGroups: associatedModifierGroups.map(group => ({
        id: group.id,
        name: group.name,
        minSelection: group.minSelection,
        maxSelection: group.maxSelection,
        options: group.options.map(option => ({
          id: option.id,
          name: option.name,
          price: Number(option.price)
        }))
      })),
      createdAt: updatedProduct.createdAt,
      updatedAt: updatedProduct.updatedAt
    };

    // Preparar lista de campos actualizados
    const updatedFields = Object.keys(productData);
    if (modifierGroupIds !== undefined) {
      updatedFields.push('modifierGroupIds');
    }

    // Respuesta exitosa
    return ResponseService.success(res, 'Producto actualizado exitosamente', {
      product: formattedProduct,
      updatedFields: updatedFields
    });

  } catch (error) {
    // Manejo de errores específicos del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.details, error.code);
      }
    }
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### Lógica del Repository (ProductRepository.update)

**Archivo:** `src/repositories/product.repository.js`

**Proceso de Validación y Actualización:**
```javascript
static async update(productId, data, modifierGroupIds = undefined, userId, requestId) {
  const { subcategoryId, name, description, imageUrl, price, isAvailable } = data;

  // 1. Buscar el producto existente
  const existingProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { /* campos necesarios para validaciones */ }
  });

  if (!existingProduct) {
    throw { status: 404, message: 'Producto no encontrado', code: 'PRODUCT_NOT_FOUND' };
  }

  // 2. Obtener información de roles del usuario
  const userWithRoles = await UserService.getUserWithRoles(userId, requestId);

  // 3. Verificar autorización (owner/branch_manager del restaurante)
  const ownerRole = userWithRoles.userRoleAssignments.find(
    assignment => assignment.role.name === 'owner' && 
    assignment.restaurantId === existingProduct.restaurantId
  );

  // 4. Si se está cambiando la subcategoría, validar que pertenezca al mismo restaurante
  if (subcategoryId !== undefined) {
    const newSubcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryIdNum }
    });
    if (newSubcategory.restaurantId !== existingProduct.restaurantId) {
      throw { status: 400, message: 'La subcategoría debe pertenecer al mismo restaurante del producto' };
    }
  }

  // 5. Validar modifierGroupIds si se proporcionan
  if (modifierGroupIds !== undefined && modifierGroupIds.length > 0) {
    const validGroups = await prisma.modifierGroup.findMany({
      where: { id: { in: modifierGroupIds }, restaurantId: existingProduct.restaurantId }
    });
    // Validar que todos pertenezcan al restaurante
  }

  // 6. Preparar datos de actualización (solo campos enviados)
  const updateData = {};
  if (subcategoryId !== undefined) updateData.subcategoryId = parseInt(subcategoryId);
  if (name !== undefined) updateData.name = name.trim();
  // ... otros campos

  // 7. Transacción para actualizar producto y asociaciones
  return await prisma.$transaction(async (tx) => {
    const updatedProduct = await tx.product.update({
      where: { id: productId },
      data: updateData,
      include: { subcategory: { /* ... */ }, restaurant: { /* ... */ } }
    });

    // Actualizar asociaciones con grupos de modificadores si se proporcionan
    if (modifierGroupIds !== undefined) {
      await tx.productModifier.deleteMany({ where: { productId: productId } });
      if (modifierGroupIds && modifierGroupIds.length > 0) {
        await tx.productModifier.createMany({
          data: modifierGroupIds.map(groupId => ({
            productId: productId,
            modifierGroupId: groupId
          }))
        });
      }
    }

    return updatedProduct;
  });
}
```

#### Request Configuration (Postman)

**Método:** `PATCH`
**URL:** `https://delixmi-backend.onrender.com/api/restaurant/products/18`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "Sushi Premium (Actualizado con Zod)",
  "price": 145.00,
  "isAvailable": false
}
```

#### Respuesta Exitosa

**Status:** `200 OK`

```json
{
    "status": "success",
    "message": "Producto actualizado exitosamente",
    "timestamp": "2025-10-18T18:33:35.565Z",
    "data": {
        "product": {
            "id": 18,
            "name": "Sushi Premium (Actualizado con Zod)",
            "description": "Este es un producto de prueba creado con la nueva arquitectura refactorizada usando Repository Pattern y Zod validation.",
            "imageUrl": "https://delixmi-backend.onrender.com/uploads/products/product_1760811098392_1792.jpg",
            "price": 145,
            "isAvailable": false,
            "subcategory": {
                "id": 1,
                "name": "Pizzas Tradicionales",
                "category": {
                    "id": 1,
                    "name": "Pizzas"
                }
            },
            "restaurant": {
                "id": 1,
                "name": "Pizzería de Ana (Actualizado)"
            },
            "modifierGroups": [
                {
                    "id": 1,
                    "name": "Tamaño",
                    "minSelection": 1,
                    "maxSelection": 1,
                    "options": [
                        {
                            "id": 1,
                            "name": "Personal (6 pulgadas)",
                            "price": 0
                        },
                        {
                            "id": 2,
                            "name": "Mediana (10 pulgadas)",
                            "price": 25
                        },
                        {
                            "id": 3,
                            "name": "Grande (12 pulgadas)",
                            "price": 45
                        },
                        {
                            "id": 4,
                            "name": "Familiar (16 pulgadas)",
                            "price": 70
                        }
                    ]
                }
            ],
            "createdAt": "2025-10-18T18:22:08.771Z",
            "updatedAt": "2025-10-18T18:33:34.758Z"
        },
        "updatedFields": [
            "name",
            "price",
            "isAvailable"
        ]
    }
}
```

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

**3. Error de Validación Zod - Parámetros (400)**
```json
{
  "status": "error",
  "message": "El ID del producto debe ser un número",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "productId",
      "message": "El ID del producto debe ser un número",
      "code": "invalid_string"
    }
  ]
}
```

**4. Error de Validación Zod - Body (400)**
```json
{
  "status": "error",
  "message": "El precio debe ser mayor que cero",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "price",
      "message": "El precio debe ser mayor que cero",
      "code": "too_small"
    }
  ]
}
```

**5. Producto no encontrado (404)**
```json
{
  "status": "error",
  "message": "Producto no encontrado",
  "code": "PRODUCT_NOT_FOUND"
}
```

**6. Sin permisos para editar producto (403)**
```json
{
  "status": "error",
  "message": "No tienes permiso para editar este producto",
  "code": "FORBIDDEN",
  "details": {
    "productId": 999,
    "restaurantId": 3,
    "restaurantName": "Pizzería de Ana"
  }
}
```

**7. Subcategoría no encontrada (404)**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND"
}
```

**8. Subcategoría de restaurante diferente (400)**
```json
{
  "status": "error",
  "message": "La subcategoría debe pertenecer al mismo restaurante del producto",
  "code": "INVALID_SUBCATEGORY",
  "details": {
    "productRestaurantId": 1,
    "subcategoryRestaurantId": 3
  }
}
```

**9. Grupos de modificadores inválidos (400)**
```json
{
  "status": "error",
  "message": "Algunos grupos de modificadores no pertenecen a este restaurante",
  "code": "INVALID_MODIFIER_GROUPS",
  "details": {
    "invalidGroupIds": [999],
    "restaurantId": 1
  }
}
```

**10. Sin campos para actualizar (400)**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

#### Notas Técnicas Importantes

1. **Arquitectura Refactorizada:** Este endpoint utiliza el nuevo patrón Repository para separar la lógica de datos del controlador, mejorando la mantenibilidad y testabilidad.

2. **Validación Zod Dual:** Se validan tanto los parámetros de la URL (`productId`) como el body de la petición usando esquemas Zod específicos.

3. **Actualización Parcial:** Solo se actualizan los campos enviados en el request body, manteniendo los valores existentes para campos no incluidos.

4. **Transacciones Atómicas:** El proceso de actualización utiliza transacciones de Prisma para garantizar la integridad de los datos, especialmente al actualizar las asociaciones con grupos de modificadores.

5. **Autorización Granular:** Se valida no solo el rol del usuario, sino también que tenga permisos específicos sobre el restaurante del producto a actualizar.

6. **Validación de Consistencia:** Al cambiar la subcategoría, se verifica que pertenezca al mismo restaurante. Al actualizar grupos de modificadores, se valida que todos pertenezcan al restaurante del producto.

7. **Respuesta Informativa:** La respuesta incluye tanto el producto actualizado completo como una lista de los campos que fueron modificados (`updatedFields`).
