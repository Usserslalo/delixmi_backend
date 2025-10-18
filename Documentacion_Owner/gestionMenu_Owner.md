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

---

## 4. Eliminar Producto

### Endpoint
```http
DELETE /api/restaurant/products/:productId
```

### Descripción
Elimina un producto específico del restaurante. **Importante:** Solo permite eliminar productos que no estén asociados a pedidos activos para mantener la integridad de los datos.

### Configuración en Postman

**Método:** `DELETE`

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/products/18`

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Parámetros de URL:**
- `productId` (number, requerido): ID del producto a eliminar

### Middlewares Aplicados

1. **`authenticateToken`**: Verifica que el usuario esté autenticado y el token sea válido
2. **`requireRole(['owner', 'branch_manager'])`**: Verifica que el usuario tenga rol de propietario o gerente de sucursal
3. **`validateParams(productParamsSchema)`**: Valida que el `productId` en la URL sea un número válido mayor que 0

### Esquema Zod de Validación

```javascript
const productParamsSchema = z.object({
  productId: z
    .string({ required_error: 'El ID del producto es requerido' })
    .regex(/^\d+$/, 'El ID del producto debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del producto debe ser mayor que 0')
});
```

### Lógica del Controlador

El controlador `deleteProduct` en `src/controllers/restaurant-admin.controller.js` se refactorizó para usar el patrón Repository:

```javascript
const deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Conversión explícita a número para evitar errores de tipo
    const productIdNum = parseInt(productId, 10);
    const deletedProductInfo = await ProductRepository.delete(productIdNum, userId, req.id);

    return ResponseService.success(
      res,
      'Producto eliminado exitosamente',
      { deletedProduct: deletedProductInfo },
      200
    );

  } catch (error) {
    console.error('Error eliminando producto:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 409) {
        // Error crítico: producto en uso
        return res.status(409).json({
          status: 'error',
          message: error.message,
          code: error.code,
          details: error.details,
          suggestion: error.suggestion,
          data: null
        });
      }
    }
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

### Lógica del Repositorio

El método `ProductRepository.delete()` implementa la lógica crítica para validar que el producto se pueda eliminar de forma segura:

#### Mejora Crítica: Validación de Pedidos Activos

```javascript
// 4. MEJORA CRÍTICA: Verificar si el producto tiene pedidos activos asociados
const activeOrderItems = await prisma.orderItem.findMany({
  where: {
    productId: productId,
    order: {
      status: {
        in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery']
      }
    }
  },
  include: {
    order: {
      select: {
        id: true,
        status: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    }
  },
  take: 5 // Límite para evitar respuestas muy grandes
});

if (activeOrderItems.length > 0) {
  throw {
    status: 409,
    message: 'No se puede eliminar el producto porque está asociado a pedidos activos',
    code: 'PRODUCT_IN_USE',
    details: {
      ordersCount: activeOrderItems.length,
      productId: productId,
      productName: existingProduct.name,
      orders: activeOrderItems.map(item => ({
        orderId: item.order.id,
        status: item.order.status,
        customerName: item.order.customer?.name || 'Cliente no disponible',
        date: item.order.createdAt
      }))
    },
    suggestion: `Considera marcar el producto como no disponible en lugar de eliminarlo. Usa: PATCH /api/restaurant/products/${productId} con { "isAvailable": false }`
  };
}
```

#### Proceso de Eliminación Segura

```javascript
// 5. Eliminar el producto y sus asociaciones en una transacción
return await prisma.$transaction(async (tx) => {
  // Eliminar asociaciones con modificadores primero
  await tx.productModifier.deleteMany({
    where: { productId: productId }
  });
  
  // Eliminar el producto
  await tx.product.delete({
    where: { id: productId }
  });
  
  // Retornar información del producto eliminado
  return {
    id: existingProduct.id,
    name: existingProduct.name,
    restaurantId: existingProduct.restaurantId,
    restaurantName: existingRestaurant.name,
    subcategoryName: existingSubcategory.name,
    deletedAt: new Date().toISOString()
  };
});
```

### Respuesta Exitosa

**Status Code:** `200 OK`

```json
{
  "status": "success",
  "message": "Producto eliminado exitosamente",
  "timestamp": "2025-10-18T19:09:03.928Z",
  "data": {
    "deletedProduct": {
      "id": 18,
      "name": "Sushi Premium (Actualizado con Zod)",
      "restaurantId": 1,
      "restaurantName": "Pizzería de Ana (Actualizado)",
      "subcategoryName": "Pizzas Tradicionales",
      "deletedAt": "2025-10-18T19:09:03.877Z"
    }
  }
}
```

### Manejo de Errores

#### 1. Error de Validación de Parámetros (400 Bad Request)
```json
{
  "status": "error",
  "message": "El ID del producto debe ser un número",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "productId",
      "message": "El ID del producto debe ser un número"
    }
  ]
}
```

#### 2. Producto No Encontrado (404 Not Found)
```json
{
  "status": "error",
  "message": "Producto no encontrado",
  "code": "PRODUCT_NOT_FOUND",
  "details": {
    "productId": 999,
    "searchedBy": "ID"
  }
}
```

#### 3. Sin Autorización (403 Forbidden)
```json
{
  "status": "error",
  "message": "No tienes permisos para eliminar productos de este restaurante",
  "code": "INSUFFICIENT_PERMISSIONS",
  "details": {
    "userId": 18,
    "requiredRole": "owner o branch_manager",
    "targetRestaurantId": 3
  }
}
```

#### 4. **Error Crítico: Producto en Uso (409 Conflict)**
```json
{
  "status": "error",
  "message": "No se puede eliminar el producto porque está asociado a pedidos activos",
  "code": "PRODUCT_IN_USE",
  "details": {
    "ordersCount": 3,
    "productId": 18,
    "productName": "Pizza Margherita",
    "orders": [
      {
        "orderId": "4567891234567890123",
        "status": "preparing",
        "customerName": "Juan Pérez",
        "date": "2025-10-18T19:00:00.000Z"
      },
      {
        "orderId": "4567891234567890124",
        "status": "confirmed",
        "customerName": "María García",
        "date": "2025-10-18T18:45:00.000Z"
      }
    ]
  },
  "suggestion": "Considera marcar el producto como no disponible en lugar de eliminarlo. Usa: PATCH /api/restaurant/products/18 con { \"isAvailable\": false }"
}
```

### Notas Técnicas Importantes

1. **Validación de Pedidos Activos:** El sistema verifica que no haya pedidos en estados activos (`pending`, `confirmed`, `preparing`, `ready_for_pickup`, `out_for_delivery`) antes de permitir la eliminación. Esta es una **mejora crítica** que protege la integridad de los datos.

2. **Transacción Atómica:** La eliminación se realiza en una transacción de Prisma para garantizar que todas las operaciones (eliminación de asociaciones y del producto) se completen exitosamente o se reviertan en caso de error.

3. **Autorización Granular:** Se valida que el usuario tenga permisos específicos sobre el restaurante del producto, no solo el rol general.

4. **Orden de Eliminación:** Se eliminan primero las asociaciones con grupos de modificadores (`productModifier`) y luego el producto en sí, respetando las restricciones de clave foránea.

5. **Respuesta Informativa:** La respuesta incluye información completa del producto eliminado, incluyendo nombres del restaurante y subcategoría para referencia del cliente.

6. **Sugerencia Inteligente:** En caso de conflicto, el sistema ofrece una alternativa práctica (marcar como no disponible) en lugar de simplemente rechazar la operación.

---

## 📁 **Gestión de Subcategorías**

### **POST /api/restaurant/subcategories** - Crear Subcategoría

**Descripción:** Crea una nueva subcategoría para organizar productos dentro de una categoría específica del menú del restaurante.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/subcategories`

**Método:** `POST`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validate(createSubcategorySchema)`: Valida y transforma los datos de entrada usando Zod

#### **Esquema de Validación Zod:**

```javascript
const createSubcategorySchema = z.object({
  categoryId: z
    .number({ required_error: 'El ID de la categoría es requerido' })
    .int({ message: 'El ID de la categoría debe ser un número entero' })
    .min(1, 'El ID de la categoría debe ser mayor a 0'),
  name: z
    .string({ required_error: 'El nombre de la subcategoría es requerido' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim()),
  displayOrder: z
    .number({ message: 'El orden de visualización debe ser un número' })
    .int({ message: 'El orden de visualización debe ser un número entero' })
    .min(0, 'El orden de visualización debe ser mayor o igual a 0')
    .optional()
    .default(0)
}).strict();
```

#### **Controlador Refactorizado:**

```javascript
const createSubcategory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Los datos ya están validados por Zod
    const newSubcategory = await SubcategoryRepository.create(req.body, userId, req.id);

    return ResponseService.success(
      res,
      'Subcategoría creada exitosamente',
      { subcategory: newSubcategory },
      201
    );

  } catch (error) {
    console.error('Error creando subcategoría:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### **Lógica del SubcategoryRepository.create():**

El repositorio maneja toda la lógica de negocio:

1. **Validación de Usuario y Roles:**
   - Obtiene información del usuario con sus roles asignados
   - Verifica que tenga roles de restaurante (`owner` o `branch_manager`)
   - Extrae el `restaurantId` del usuario autenticado

2. **Validación de Categoría:**
   - Verifica que la categoría especificada (`categoryId`) exista en la base de datos
   - Retorna error 404 si la categoría no se encuentra

3. **Creación de Subcategoría:**
   - Crea la subcategoría con validación de restricción única
   - Maneja el error `P2002` (duplicado) si ya existe una subcategoría con el mismo nombre en esa categoría y restaurante
   - Incluye información de la categoría y restaurante en la respuesta

4. **Formateo de Respuesta:**
   - Retorna datos estructurados con información completa de la subcategoría creada

#### **Request Body:**

```json
{
  "name": "Subcategoría de Prueba (Zod)",
  "categoryId": 1,
  "displayOrder": 10
}
```

**Campos:**
- `name` (string, requerido): Nombre de la subcategoría (1-100 caracteres)
- `categoryId` (number, requerido): ID de la categoría padre (debe existir)
- `displayOrder` (number, opcional): Orden de visualización (default: 0)

#### **Response Exitosa (201 Created):**

```json
{
  "status": "success",
  "message": "Subcategoría creada exitosamente",
  "timestamp": "2025-10-18T19:24:01.455Z",
  "data": {
    "subcategory": {
      "id": 15,
      "name": "Subcategoría de Prueba (Zod)",
      "displayOrder": 10,
      "category": {
        "id": 1,
        "name": "Pizzas"
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana (Actualizado)"
      },
      "createdAt": "2025-10-18T19:24:00.975Z",
      "updatedAt": "2025-10-18T19:24:00.975Z"
    }
  }
}
```

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod:**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["categoryId"],
      "message": "El ID de la categoría debe ser un número"
    }
  ]
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de restaurante",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**404 Not Found - Categoría No Encontrada:**
```json
{
  "status": "error",
  "message": "Categoría no encontrada",
  "code": "CATEGORY_NOT_FOUND",
  "details": {
    "categoryId": 999
  }
}
```

**409 Conflict - Subcategoría Duplicada:**
```json
{
  "status": "error",
  "message": "Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante",
  "code": "DUPLICATE_SUBCATEGORY",
  "details": {
    "categoryId": 1,
    "categoryName": "Pizzas",
    "subcategoryName": "Pizzas Tradicionales"
  }
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository:** Toda la lógica de negocio se centralizó en `SubcategoryRepository.create()`
2. **Validación Zod:** Reemplazó `express-validator` con validación más robusta y tipada
3. **Manejo de Errores:** Centralizado en el repositorio con códigos específicos
4. **Separación de Responsabilidades:** El controlador solo orquesta la respuesta
5. **Validación de Restricción Única:** Maneja automáticamente nombres duplicados por restaurante y categoría

---

### **PATCH /api/restaurant/subcategories/:subcategoryId** - Actualizar Subcategoría

**Descripción:** Actualiza los datos de una subcategoría existente del menú del restaurante. Todos los campos son opcionales para permitir actualizaciones parciales.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/subcategories/:subcategoryId`

**Método:** `PATCH`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(subcategoryParamsSchema)`: Valida y transforma el parámetro `subcategoryId` de la URL
- `validate(updateSubcategorySchema)`: Valida y transforma los datos del body usando Zod

#### **Esquemas de Validación Zod:**

**subcategoryParamsSchema:**
```javascript
const subcategoryParamsSchema = z.object({
  subcategoryId: z
    .string({ required_error: 'El ID de la subcategoría es requerido' })
    .regex(/^\d+$/, 'El ID de la subcategoría debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID de la subcategoría debe ser mayor que 0')
});
```

**updateSubcategorySchema:**
```javascript
const updateSubcategorySchema = z.object({
  categoryId: z
    .number({ message: 'El ID de la categoría debe ser un número' })
    .int({ message: 'El ID de la categoría debe ser un número entero' })
    .min(1, 'El ID de la categoría debe ser mayor a 0')
    .optional(),
  name: z
    .string({ message: 'El nombre debe ser una cadena de texto' })
    .min(1, 'El nombre no puede estar vacío')
    .max(100, 'El nombre debe tener máximo 100 caracteres')
    .transform(val => val.trim())
    .optional(),
  displayOrder: z
    .number({ message: 'El orden de visualización debe ser un número' })
    .int({ message: 'El orden de visualización debe ser un número entero' })
    .min(0, 'El orden de visualización debe ser mayor o igual a 0')
    .optional()
}).strict();
```

#### **Controlador Refactorizado:**

```javascript
const updateSubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const userId = req.user.id;

    const updatedSubcategory = await SubcategoryRepository.update(subcategoryId, req.body, userId, req.id);

    return ResponseService.success(res, 'Subcategoría actualizada exitosamente', {
      subcategory: updatedSubcategory
    });

  } catch (error) {
    console.error('Error actualizando subcategoría:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      } else if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### **Lógica del SubcategoryRepository.update():**

El repositorio maneja toda la lógica de negocio:

1. **Validación de Usuario y Roles:**
   - Obtiene información del usuario con sus roles asignados
   - Verifica que tenga roles de restaurante (`owner` o `branch_manager`)
   - Extrae el `restaurantId` del usuario autenticado

2. **Validación de Subcategoría:**
   - Busca la subcategoría existente por ID
   - Verifica que pertenezca al restaurante del usuario (autorización)
   - Retorna error 404 si no se encuentra o 403 si no tiene permisos

3. **Validación de Categoría (opcional):**
   - Si se especifica `categoryId`, verifica que la nueva categoría exista
   - Retorna error 404 si la categoría no se encuentra

4. **Preparación de Datos:**
   - Solo incluye en la actualización los campos enviados (actualización parcial)
   - Valida que al menos un campo sea enviado (error 400 si no hay cambios)

5. **Actualización:**
   - Ejecuta la transacción Prisma para actualizar la subcategoría
   - Maneja el error de restricción única (`P2002`) para nombres duplicados
   - Incluye información completa en la respuesta

#### **Request Body:**

```json
{
  "name": "Subcategoría (Actualizada con Zod)",
  "displayOrder": 20
}
```

**Campos (todos opcionales):**
- `name` (string, opcional): Nuevo nombre de la subcategoría (1-100 caracteres)
- `categoryId` (number, opcional): ID de nueva categoría padre (debe existir)
- `displayOrder` (number, opcional): Nuevo orden de visualización (≥ 0)

#### **Response Exitosa (200 OK):**

```json
{
  "status": "success",
  "message": "Subcategoría actualizada exitosamente",
  "timestamp": "2025-10-18T19:32:46.291Z",
  "data": {
    "subcategory": {
      "id": 15,
      "name": "Subcategoría (Actualizada con Zod)",
      "displayOrder": 20,
      "category": {
        "id": 1,
        "name": "Pizzas"
      },
      "restaurant": {
        "id": 1,
        "name": "Pizzería de Ana (Actualizado)"
      },
      "createdAt": "2025-10-18T19:24:00.975Z",
      "updatedAt": "2025-10-18T19:32:45.815Z",
      "updatedFields": [
        "name",
        "displayOrder"
      ]
    }
  }
}
```

#### **Manejo de Errores:**

**400 Bad Request - Validación de Parámetros:**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["subcategoryId"],
      "message": "El ID de la subcategoría debe ser un número"
    }
  ]
}
```

**400 Bad Request - Sin Campos para Actualizar:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de restaurante",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - Subcategoría de Otro Restaurante:**
```json
{
  "status": "error",
  "message": "No tienes permiso para editar esta subcategoría",
  "code": "FORBIDDEN",
  "details": {
    "subcategoryId": 15,
    "restaurantId": 2,
    "restaurantName": "Otro Restaurante"
  }
}
```

**404 Not Found - Subcategoría No Encontrada:**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND",
  "details": {
    "subcategoryId": 999
  }
}
```

**404 Not Found - Categoría No Encontrada:**
```json
{
  "status": "error",
  "message": "Categoría no encontrada",
  "code": "CATEGORY_NOT_FOUND",
  "details": {
    "categoryId": 999
  }
}
```

**409 Conflict - Subcategoría Duplicada:**
```json
{
  "status": "error",
  "message": "Ya existe una subcategoría con ese nombre en esta categoría para tu restaurante",
  "code": "DUPLICATE_SUBCATEGORY",
  "details": {
    "subcategoryId": 15,
    "attemptedName": "Pizzas Tradicionales",
    "categoryId": 1
  }
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository:** Toda la lógica de negocio se centralizó en `SubcategoryRepository.update()`
2. **Validación Zod:** Reemplazó `express-validator` con `validateParams()` y `validate()` más robustos
3. **Actualización Parcial:** Permite actualizar solo los campos enviados
4. **Manejo de Errores:** Centralizado con códigos específicos (400, 403, 404, 409)
5. **Validación de Autorización:** Verifica que la subcategoría pertenezca al restaurante del usuario
6. **Respuesta Informativa:** Incluye `updatedFields` para mostrar qué campos fueron modificados

---

### **DELETE /api/restaurant/subcategories/:subcategoryId** - Eliminar Subcategoría

**Descripción:** Elimina una subcategoría del menú del restaurante. Incluye una **validación crítica** que previene la eliminación si la subcategoría contiene productos asociados.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/subcategories/:subcategoryId`

**Método:** `DELETE`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(subcategoryParamsSchema)`: Valida y transforma el parámetro `subcategoryId` de la URL usando Zod

#### **Esquema de Validación Zod:**

**subcategoryParamsSchema:**
```javascript
const subcategoryParamsSchema = z.object({
  subcategoryId: z
    .string({ required_error: 'El ID de la subcategoría es requerido' })
    .regex(/^\d+$/, 'El ID de la subcategoría debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID de la subcategoría debe ser mayor que 0')
});
```

#### **Controlador Refactorizado:**

```javascript
const deleteSubcategory = async (req, res) => {
  try {
    const { subcategoryId } = req.params;
    const userId = req.user.id;

    const deletedSubcategory = await SubcategoryRepository.delete(subcategoryId, userId, req.id);

    return ResponseService.success(res, 'Subcategoría eliminada exitosamente', {
      deletedSubcategory
    });

  } catch (error) {
    console.error('Error eliminando subcategoría:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.details, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

#### **Lógica del SubcategoryRepository.delete():**

El repositorio maneja toda la lógica de negocio con **foco en la validación crítica**:

1. **Validación de Usuario y Roles:**
   - Obtiene información del usuario con sus roles asignados
   - Verifica que tenga roles de restaurante (`owner` o `branch_manager`)
   - Extrae el `restaurantId` del usuario autenticado

2. **Validación de Subcategoría:**
   - Busca la subcategoría existente por ID
   - Verifica que pertenezca al restaurante del usuario (autorización)
   - Retorna error 404 si no se encuentra o 403 si no tiene permisos

3. **🔒 VALIDACIÓN CRÍTICA - Productos Asociados:**
   ```javascript
   // 6. VERIFICACIÓN CRÍTICA: Verificar si la subcategoría tiene productos asociados
   const productsCount = await prisma.product.count({
     where: {
       subcategoryId: subcategoryIdNum
     }
   });

   if (productsCount > 0) {
     throw {
       status: 409,
       message: 'No se puede eliminar la subcategoría porque todavía contiene productos',
       code: 'SUBCATEGORY_HAS_PRODUCTS',
       details: {
         subcategoryId: subcategoryIdNum,
         subcategoryName: existingSubcategory.name,
         productsCount: productsCount,
         suggestion: 'Mueva o elimine los productos primero antes de eliminar la subcategoría'
       }
     };
   }
   ```

4. **Eliminación Segura:**
   - Solo procede a eliminar si no hay productos asociados
   - Ejecuta `prisma.subcategory.delete()` de forma atómica
   - Retorna información de la subcategoría eliminada para confirmación

#### **Response Exitosa (200 OK):**

```json
{
  "status": "success",
  "message": "Subcategoría eliminada exitosamente",
  "timestamp": "2025-10-18T19:48:43.604Z",
  "data": {
    "deletedSubcategory": {
      "id": 15,
      "name": "Subcategoría (Actualizada con Zod)",
      "categoryName": "Pizzas",
      "restaurantName": "Pizzería de Ana (Actualizado)"
    }
  }
}
```

#### **Manejo de Errores:**

**400 Bad Request - Validación de Parámetros:**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["subcategoryId"],
      "message": "El ID de la subcategoría debe ser un número"
    }
  ]
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "Acceso denegado. Se requieren permisos de restaurante",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - Subcategoría de Otro Restaurante:**
```json
{
  "status": "error",
  "message": "No tienes permiso para eliminar esta subcategoría",
  "code": "FORBIDDEN",
  "details": {
    "subcategoryId": 15,
    "restaurantId": 2,
    "restaurantName": "Otro Restaurante"
  }
}
```

**404 Not Found - Subcategoría No Encontrada:**
```json
{
  "status": "error",
  "message": "Subcategoría no encontrada",
  "code": "SUBCATEGORY_NOT_FOUND",
  "details": {
    "subcategoryId": 999
  }
}
```

**🚨 409 Conflict - Subcategoría en Uso (Validación Crítica):**
```json
{
  "status": "error",
  "message": "No se puede eliminar la subcategoría porque todavía contiene productos",
  "code": "SUBCATEGORY_HAS_PRODUCTS",
  "details": {
    "subcategoryId": 15,
    "subcategoryName": "Pizzas Tradicionales",
    "productsCount": 5,
    "suggestion": "Mueva o elimine los productos primero antes de eliminar la subcategoría"
  }
}
```

> **💡 Nota Importante:** El error 409 Conflict incluye una **sugerencia específica** que guía al usuario sobre cómo proceder: "Mueva o elimine los productos primero antes de eliminar la subcategoría". Esta validación previene la pérdida accidental de datos y mantiene la integridad referencial.

#### **Características de la Refactorización:**

1. **Patrón Repository:** Toda la lógica de negocio se centralizó en `SubcategoryRepository.delete()`
2. **Validación Zod:** Reemplazó `express-validator` con `validateParams()` más robusto
3. **🔒 Validación Crítica:** Implementa verificación de productos asociados que previene eliminaciones accidentales
4. **Manejo de Errores:** Centralizado con códigos específicos (400, 403, 404, 409)
5. **Validación de Autorización:** Verifica que la subcategoría pertenezca al restaurante del usuario
6. **Respuesta Informativa:** Retorna datos de la subcategoría eliminada para confirmación
7. **Integridad de Datos:** Protege contra la pérdida accidental de información relacionada

---

## **🔧 Gestión de Modificadores - Grupos y Opciones**

### **POST /api/restaurant/modifier-groups** - Crear Grupo de Modificadores

**Descripción:** Crea un nuevo grupo de modificadores para el restaurante. Un grupo de modificadores permite definir opciones que los clientes pueden seleccionar para personalizar sus productos (ej. tamaño, extras, etc.).

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/modifier-groups`

**Método:** `POST`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validate(createGroupSchema)`: Valida y transforma los datos del body usando Zod

#### **Esquema de Validación Zod:**

**createGroupSchema:**
```javascript
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
```

**🎯 Validación Crítica:** El esquema incluye un `.refine()` que valida que `minSelection <= maxSelection`, asegurando coherencia en las reglas de selección.

#### **Controlador Refactorizado:**

```javascript
const createModifierGroup = async (req, res) => {
  try {
    const userId = req.user.id;

    const newModifierGroup = await ModifierRepository.createGroup(req.body, userId, req.id);

    return ResponseService.success(res, 'Grupo de modificadores creado exitosamente', {
      modifierGroup: newModifierGroup
    }, 201);

  } catch (error) {
    console.error('Error creando grupo de modificadores:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Simplificado:** Solo 21 líneas vs 109 líneas anteriores
- **Delegación:** Toda la lógica de negocio se delega al repositorio
- **Manejo de Errores:** Centralizado con códigos específicos del repositorio

#### **Lógica del ModifierRepository.createGroup():**

El repositorio maneja toda la lógica de negocio:

1. **Validación de Usuario y Roles:**
   ```javascript
   // Usa UserService estandarizado para consistencia
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   
   // Verifica roles de restaurante
   const restaurantRoles = ['owner', 'branch_manager'];
   const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
   const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));
   ```

2. **Extracción del Restaurant ID:**
   ```javascript
   const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
     assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
   );
   const restaurantId = userRestaurantAssignment.restaurantId;
   ```

3. **Validación de Negocio:**
   ```javascript
   // Validación adicional de coherencia de datos
   if (minSelection > maxSelection) {
     throw {
       status: 400,
       message: 'La selección mínima no puede ser mayor que la selección máxima',
       code: 'INVALID_SELECTION_RANGE'
     };
   }
   ```

4. **Creación del Grupo:**
   ```javascript
   const newModifierGroup = await prisma.modifierGroup.create({
     data: {
       name: name.trim(),
       restaurantId: restaurantId,
       minSelection: parseInt(minSelection),
       maxSelection: parseInt(maxSelection)
     },
     include: { options: { /* campos de opciones */ } }
   });
   ```

#### **Request Body:**

```json
{
  "name": "Tamaño de Bebida (Zod)",
  "minSelection": 1,
  "maxSelection": 1
}
```

**Campos:**
- `name` (string, requerido): Nombre del grupo de modificadores (1-100 caracteres)
- `minSelection` (number, opcional): Número mínimo de opciones que debe seleccionar el cliente (0-10, default: 1)
- `maxSelection` (number, opcional): Número máximo de opciones que puede seleccionar el cliente (1-10, default: 1)

#### **Response Exitosa (201 Created):**

```json
{
  "status": "success",
  "message": "Grupo de modificadores creado exitosamente",
  "timestamp": "2025-10-18T19:59:39.380Z",
  "data": {
    "modifierGroup": {
      "id": 6,
      "name": "Tamaño de Bebida (Zod)",
      "minSelection": 1,
      "maxSelection": 1,
      "restaurantId": 1,
      "options": [],
      "createdAt": "2025-10-18T19:59:39.002Z",
      "updatedAt": "2025-10-18T19:59:39.002Z"
    }
  }
}
```

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod (Campos Básicos):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["name"],
      "message": "El nombre del grupo es requerido"
    }
  ]
}
```

**400 Bad Request - Validación Zod (Refine Custom):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "custom",
      "message": "La selección mínima no puede ser mayor que la selección máxima",
      "path": ["minSelection"]
    }
  ]
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "No tienes permiso para crear grupos de modificadores",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - No Restaurante Asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este usuario",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Usuario No Encontrado:**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor"
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository:** Toda la lógica de negocio se centralizó en `ModifierRepository.createGroup()`
2. **Validación Zod:** Reemplazó `express-validator` con validación más robusta y tipada
3. **Uso de UserService:** Implementa `UserService.getUserWithRoles()` para consistencia arquitectónica
4. **Validación de Negocio:** Incluye validación customizada con `.refine()` para coherencia de datos
5. **Manejo de Errores:** Centralizado con códigos específicos (400, 403, 404)
6. **Autorización:** Verifica roles de restaurante y extracción correcta del `restaurantId`
7. **Respuesta Formateada:** Entrega datos completos del grupo creado incluyendo campos de auditoría

---

### **PATCH /api/restaurant/modifier-groups/:groupId** - Actualizar Grupo de Modificadores

**Descripción:** Actualiza un grupo de modificadores existente del restaurante. Permite modificar el nombre y las reglas de selección (minSelection/maxSelection) manteniendo la integridad de los datos y las asociaciones existentes.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/modifier-groups/:groupId`

**Método:** `PATCH`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(groupParamsSchema)`: Valida y transforma el parámetro `groupId` de la URL
- `validate(updateGroupSchema)`: Valida y transforma los datos del body usando Zod

#### **Esquemas de Validación Zod:**

**groupParamsSchema** (Validación de Parámetros URL):
```javascript
const groupParamsSchema = z.object({
  groupId: z
    .string({ required_error: 'El ID del grupo es requerido' })
    .regex(/^\d+$/, 'El ID del grupo debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del grupo debe ser mayor que 0')
});
```

**updateGroupSchema** (Validación del Body):
```javascript
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
```

**🔧 Validación Dinámica:** A diferencia del create, el update requiere validación de negocio adicional en el repositorio para verificar `minSelection <= maxSelection` considerando tanto los valores nuevos como los existentes.

#### **Controlador Refactorizado:**

```javascript
const updateModifierGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.updateGroup(groupId, req.body, userId, req.id);

    return ResponseService.success(res, 'Grupo de modificadores actualizado exitosamente', result);

  } catch (error) {
    console.error('Error actualizando grupo de modificadores:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Ultra Simplificado:** Solo 20 líneas vs 165 líneas anteriores
- **Delegación Total:** Toda la lógica delegada al repositorio
- **Manejo Robusto:** Captura y procesa todos los errores específicos del repositorio

#### **Lógica del ModifierRepository.updateGroup():**

El repositorio maneja toda la lógica de negocio compleja:

1. **Validación de Usuario y Autorización:**
   ```javascript
   // Usa UserService estandarizado para consistencia
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   
   // Verifica roles de restaurante
   const restaurantRoles = ['owner', 'branch_manager'];
   const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
   const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));
   ```

2. **Validación de Pertenencia del Grupo:**
   ```javascript
   // Verifica que el grupo existe y pertenece al restaurante del usuario
   const existingGroup = await prisma.modifierGroup.findFirst({
     where: { id: groupIdNum, restaurantId: restaurantId }
   });
   ```

3. **Preparación Inteligente de Datos:**
   ```javascript
   // Solo actualiza campos enviados (no campos undefined)
   const updateData = {};
   if (name !== undefined) updateData.name = name.trim();
   if (minSelection !== undefined) updateData.minSelection = parseInt(minSelection);
   if (maxSelection !== undefined) updateData.maxSelection = parseInt(maxSelection);
   ```

4. **Validación de Negocio Dinámica:**
   ```javascript
   // Considera valores nuevos Y existentes para validación
   const finalMinSelection = updateData.minSelection !== undefined ? 
     updateData.minSelection : existingGroup.minSelection;
   const finalMaxSelection = updateData.maxSelection !== undefined ? 
     updateData.maxSelection : existingGroup.maxSelection;
   
   if (finalMinSelection > finalMaxSelection) {
     throw { status: 400, message: 'La selección mínima no puede ser mayor que la selección máxima' };
   }
   ```

5. **Actualización y Formateo:**
   ```javascript
   // Actualiza con include de opciones y formatea respuesta
   const updatedGroup = await prisma.modifierGroup.update({
     where: { id: groupIdNum },
     data: updateData,
     include: { options: { /* campos completos */ } }
   });
   ```

#### **Request Body:**

```json
{
  "name": "Tamaño de Bebida (Actualizado con Zod)",
  "maxSelection": 2
}
```

**Campos (Todos Opcionales):**
- `name` (string, opcional): Nuevo nombre del grupo (1-100 caracteres)
- `minSelection` (number, opcional): Nuevo número mínimo de selecciones (0-10)
- `maxSelection` (number, opcional): Nuevo número máximo de selecciones (1-10)

**🎯 Comportamiento Inteligente:** Solo los campos enviados se actualizan. Los campos no enviados mantienen sus valores actuales.

#### **Response Exitosa (200 OK):**

```json
{
  "status": "success",
  "message": "Grupo de modificadores actualizado exitosamente",
  "timestamp": "2025-10-18T20:34:13.314Z",
  "data": {
    "modifierGroup": {
      "id": 6,
      "name": "Tamaño de Bebida (Actualizado con Zod)",
      "minSelection": 1,
      "maxSelection": 2,
      "restaurantId": 1,
      "options": [],
      "createdAt": "2025-10-18T19:59:39.002Z",
      "updatedAt": "2025-10-18T20:34:12.835Z"
    },
    "updatedFields": [
      "name",
      "maxSelection"
    ]
  }
}
```

**Características de la Respuesta:**
- **Grupo Completo:** Incluye todos los campos actualizados y asociaciones
- **Campo `updatedFields`:** Lista exacta de los campos que fueron modificados
- **Timestamp Automático:** `updatedAt` actualizado automáticamente por Prisma

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod (Parámetros URL):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["groupId"],
      "message": "El ID del grupo debe ser un número"
    }
  ]
}
```

**400 Bad Request - Validación Zod (Body):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["name"],
      "message": "El nombre debe tener máximo 100 caracteres"
    }
  ]
}
```

**400 Bad Request - Sin Campos para Actualizar:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**400 Bad Request - Validación de Negocio (Rango Inválido):**
```json
{
  "status": "error",
  "message": "La selección mínima no puede ser mayor que la selección máxima",
  "code": "INVALID_SELECTION_RANGE"
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "No tienes permiso para actualizar grupos de modificadores",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - No Restaurante Asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este usuario",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Usuario No Encontrado:**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**404 Not Found - Grupo No Encontrado:**
```json
{
  "status": "error",
  "message": "Grupo de modificadores no encontrado",
  "code": "MODIFIER_GROUP_NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor"
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository Avanzado:** Lógica completa centralizada en `ModifierRepository.updateGroup()`
2. **Validación Dual:** Zod para entrada + validación de negocio en repositorio
3. **Consistencia Arquitectónica:** Uso de `UserService.getUserWithRoles()` estandarizado
4. **Validación Inteligente:** Lógica que considera tanto valores nuevos como existentes para coherencia
5. **Actualización Selectiva:** Solo modifica campos enviados, preserva valores existentes
6. **Verificación de Autorización:** Garantiza que el grupo pertenezca al restaurante del usuario
7. **Respuesta Detallada:** Proporciona tanto el objeto actualizado como la lista de campos modificados

---

### **DELETE /api/restaurant/modifier-groups/:groupId** - Eliminar Grupo de Modificadores

**Descripción:** Elimina un grupo de modificadores del restaurante. Incluye validaciones críticas para prevenir eliminaciones que podrían romper la integridad de los datos, verificando que no existan opciones asociadas ni productos vinculados al grupo.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/modifier-groups/:groupId`

**Método:** `DELETE`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(groupParamsSchema)`: Valida y transforma el parámetro `groupId` de la URL

#### **Esquema de Validación Zod:**

**groupParamsSchema** (Validación de Parámetros URL):
```javascript
const groupParamsSchema = z.object({
  groupId: z
    .string({ required_error: 'El ID del grupo es requerido' })
    .regex(/^\d+$/, 'El ID del grupo debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del grupo debe ser mayor que 0')
});
```

#### **Controlador Refactorizado:**

```javascript
const deleteModifierGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.deleteGroup(groupId, userId, req.id);

    return ResponseService.success(res, 'Grupo de modificadores eliminado exitosamente', result);

  } catch (error) {
    console.error('Error eliminando grupo de modificadores:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Ultra Simplificado:** Solo 20 líneas vs 148 líneas anteriores
- **Delegación Total:** Toda la lógica de negocio delegada al repositorio
- **Manejo Específico:** Captura errores 409 Conflict para las validaciones críticas

#### **Lógica del ModifierRepository.deleteGroup():**

El repositorio maneja toda la lógica de negocio y **validaciones críticas**:

1. **Validación de Usuario y Autorización:**
   ```javascript
   // Usa UserService estandarizado para consistencia
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   
   // Verifica roles de restaurante
   const restaurantRoles = ['owner', 'branch_manager'];
   const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
   const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));
   ```

2. **Verificación de Pertenencia del Grupo:**
   ```javascript
   // Verifica que el grupo existe y pertenece al restaurante del usuario
   // Incluye relaciones críticas para validaciones posteriores
   const existingGroup = await prisma.modifierGroup.findFirst({
     where: { id: groupIdNum, restaurantId: restaurantId },
     include: {
       options: { select: { id: true, name: true } },
       products: { 
         select: { 
           product: { select: { id: true, name: true } } 
         } 
       }
     }
   });
   ```

3. **🔒 VALIDACIÓN CRÍTICA 1A - Opciones Asociadas:**
   ```javascript
   // Verifica si el grupo tiene opciones asociadas
   if (existingGroup.options.length > 0) {
     throw {
       status: 409,
       message: 'No se puede eliminar el grupo porque tiene opciones asociadas. Elimina primero las opciones.',
       code: 'GROUP_HAS_OPTIONS',
       details: {
         optionsCount: existingGroup.options.length,
         options: existingGroup.options.map(option => ({
           id: option.id,
           name: option.name
         }))
       }
     };
   }
   ```

4. **🔒 VALIDACIÓN CRÍTICA 1B - Productos Asociados:**
   ```javascript
   // Verifica si el grupo está asociado a productos (tabla ProductModifier)
   if (existingGroup.products.length > 0) {
     throw {
       status: 409,
       message: 'No se puede eliminar el grupo porque está asociado a productos. Desasocia primero los productos.',
       code: 'GROUP_ASSOCIATED_TO_PRODUCTS',
       details: {
         productsCount: existingGroup.products.length,
         products: existingGroup.products.map(pm => ({
           id: pm.product.id,
           name: pm.product.name
         }))
       }
     };
   }
   ```

5. **Eliminación Segura:**
   ```javascript
   // Solo procede si todas las validaciones críticas pasan
   await prisma.modifierGroup.delete({
     where: { id: groupIdNum }
   });

   // Retorna información del grupo eliminado
   return {
     deletedGroup: {
       id: existingGroup.id,
       name: existingGroup.name,
       deletedAt: new Date().toISOString()
     }
   };
   ```

#### **Response Exitosa (200 OK):**

```json
{
  "status": "success",
  "message": "Grupo de modificadores eliminado exitosamente",
  "timestamp": "2025-10-18T20:42:37.416Z",
  "data": {
    "deletedGroup": {
      "id": 6,
      "name": "Tamaño de Bebida (Actualizado con Zod)",
      "deletedAt": "2025-10-18T20:42:37.416Z"
    }
  }
}
```

**Características de la Respuesta:**
- **Confirmación de Eliminación:** Incluye ID, nombre y timestamp del grupo eliminado
- **Timestamp Preciso:** `deletedAt` generado en el momento exacto de la eliminación
- **Información de Auditoría:** Mantiene registro del grupo eliminado para referencias

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod (Parámetros URL):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["groupId"],
      "message": "El ID del grupo debe ser un número"
    }
  ]
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "No tienes permiso para eliminar grupos de modificadores",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - No Restaurante Asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este usuario",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Usuario No Encontrado:**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**404 Not Found - Grupo No Encontrado:**
```json
{
  "status": "error",
  "message": "Grupo de modificadores no encontrado",
  "code": "MODIFIER_GROUP_NOT_FOUND"
}
```

**🔒 409 Conflict - Validación Crítica 1A (Opciones Asociadas):**
```json
{
  "status": "error",
  "message": "No se puede eliminar el grupo porque tiene opciones asociadas. Elimina primero las opciones.",
  "code": "GROUP_HAS_OPTIONS",
  "details": {
    "optionsCount": 3,
    "options": [
      {
        "id": 15,
        "name": "Pequeño"
      },
      {
        "id": 16,
        "name": "Mediano"
      },
      {
        "id": 17,
        "name": "Grande"
      }
    ]
  }
}
```

**🔒 409 Conflict - Validación Crítica 1B (Productos Asociados):**
```json
{
  "status": "error",
  "message": "No se puede eliminar el grupo porque está asociado a productos. Desasocia primero los productos.",
  "code": "GROUP_ASSOCIATED_TO_PRODUCTS",
  "details": {
    "productsCount": 2,
    "products": [
      {
        "id": 25,
        "name": "Pizza Margherita"
      },
      {
        "id": 26,
        "name": "Pizza Pepperoni"
      }
    ]
  }
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor"
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository Completo:** Toda la lógica de negocio centralizada en `ModifierRepository.deleteGroup()`
2. **Validación Zod Robusta:** `validateParams(groupParamsSchema)` para validación de parámetros URL
3. **Consistencia Arquitectónica:** Uso de `UserService.getUserWithRoles()` estandarizado
4. **🔒 Validaciones Críticas Preservadas:** Mantiene las dos validaciones críticas para integridad de datos
5. **Verificación de Autorización:** Garantiza que el grupo pertenezca al restaurante del usuario
6. **Manejo Específico 409:** Captura y formatea correctamente los errores de conflicto con detalles informativos
7. **Respuesta de Auditoría:** Proporciona información completa del grupo eliminado para rastreabilidad

---

### **POST /api/restaurant/modifier-groups/:groupId/options** - Crear Opción de Modificador

**Descripción:** Crea una nueva opción de modificador dentro de un grupo específico del restaurante. El endpoint verifica que el usuario tenga permisos en el restaurante y que el grupo de modificadores pertenezca al mismo restaurante antes de proceder con la creación.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/modifier-groups/:groupId/options`

**Método:** `POST`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(groupParamsSchema)`: Valida y transforma el parámetro `groupId` de la URL
- `validate(createOptionSchema)`: Valida y transforma los datos del body de la petición

#### **Esquemas de Validación Zod:**

**groupParamsSchema** (Validación de Parámetros URL):
```javascript
const groupParamsSchema = z.object({
  groupId: z
    .string({ required_error: 'El ID del grupo es requerido' })
    .regex(/^\d+$/, 'El ID del grupo debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID del grupo debe ser mayor que 0')
});
```

**createOptionSchema** (Validación del Body):
```javascript
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
```

#### **Controlador Refactorizado:**

```javascript
const createModifierOption = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    const newOption = await ModifierRepository.createOption(groupId, req.body, userId, req.id);

    return ResponseService.success(res, 'Opción de modificador creada exitosamente', {
      modifierOption: newOption
    }, 201);

  } catch (error) {
    console.error('Error creando opción de modificador:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Ultra Simplificado:** Solo 25 líneas vs 110 líneas anteriores
- **Delegación Total:** Toda la lógica de negocio delegada al repositorio
- **ResponseService Estándar:** Uso de `ResponseService.success()` con código 201
- **Manejo Específico:** Captura errores 403/404 del repositorio con códigos específicos

#### **Lógica del ModifierRepository.createOption():**

El repositorio maneja toda la lógica de negocio y validaciones críticas:

1. **Validación de Usuario y Autorización:**
   ```javascript
   // Usa UserService estandarizado para consistencia arquitectónica
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   
   // Verifica roles de restaurante
   const restaurantRoles = ['owner', 'branch_manager'];
   const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
   const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));
   ```

2. **Extracción del RestaurantId:**
   ```javascript
   // Obtiene el restaurantId del usuario de forma segura
   const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
     assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
   );
   
   if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
     throw {
       status: 403,
       message: 'No se encontró un restaurante asignado para este usuario',
       code: 'NO_RESTAURANT_ASSIGNED'
     };
   }
   ```

3. **🔒 Validación Crítica de Pertenencia del Grupo:**
   ```javascript
   // Verifica que el grupo existe y pertenece al restaurante del usuario
   const existingGroup = await prisma.modifierGroup.findFirst({
     where: {
       id: groupIdNum,
       restaurantId: restaurantId
     },
     select: {
       id: true,
       name: true,
       restaurantId: true
     }
   });

   if (!existingGroup) {
     throw {
       status: 404,
       message: 'Grupo de modificadores no encontrado',
       code: 'MODIFIER_GROUP_NOT_FOUND'
     };
   }
   ```

4. **Creación de la Opción:**
   ```javascript
   // Crea la opción con datos validados y transformados por Zod
   const newModifierOption = await prisma.modifierOption.create({
     data: {
       name: name.trim(),
       price: parseFloat(price),
       modifierGroupId: groupIdNum
     }
   });
   ```

5. **Formateo de Respuesta:**
   ```javascript
   // Retorna la opción creada con formato estándar
   return {
     id: newModifierOption.id,
     name: newModifierOption.name,
     price: Number(newModifierOption.price),
     modifierGroupId: newModifierOption.modifierGroupId,
     createdAt: newModifierOption.createdAt,
     updatedAt: newModifierOption.updatedAt
   };
   ```

#### **Payload de Ejemplo:**

```json
{
  "name": "Gigante (18 pulgadas) (Zod)",
  "price": 95.50
}
```

**Características del Payload:**
- **name**: String requerido (1-100 caracteres), se trimea automáticamente
- **price**: Número requerido (≥ 0), se convierte a float automáticamente
- **Validación Estricta**: `.strict()` en Zod previene campos adicionales no definidos

#### **Response Exitosa (201 Created):**

```json
{
    "status": "success",
    "message": "Opción de modificador creada exitosamente",
    "timestamp": "2025-10-18T20:54:18.109Z",
    "data": {
        "modifierOption": {
            "id": 26,
            "name": "Gigante (18 pulgadas) (Zod)",
            "price": 95.5,
            "modifierGroupId": 1,
            "createdAt": "2025-10-18T20:54:17.823Z",
            "updatedAt": "2025-10-18T20:54:17.823Z"
        }
    }
}
```

**Características de la Respuesta:**
- **Código 201:** Confirmación de creación exitosa
- **Información Completa:** Incluye ID, nombre, precio, grupo asociado y timestamps
- **Conversión de Tipos:** Precio convertido a número JavaScript estándar
- **Timestamp Preciso:** Generado automáticamente por la base de datos

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod (Parámetros URL):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["groupId"],
      "message": "El ID del grupo debe ser un número"
    }
  ]
}
```

**400 Bad Request - Validación Zod (Body):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["name"],
      "message": "El nombre de la opción es requerido"
    },
    {
      "code": "too_small",
      "path": ["price"],
      "message": "El precio debe ser mayor o igual a 0"
    }
  ]
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "No tienes permiso para crear opciones de modificadores",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - No Restaurante Asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este usuario",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Usuario No Encontrado:**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**404 Not Found - Grupo No Encontrado:**
```json
{
  "status": "error",
  "message": "Grupo de modificadores no encontrado",
  "code": "MODIFIER_GROUP_NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor"
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository Completo:** Toda la lógica de negocio centralizada en `ModifierRepository.createOption()`
2. **Validación Zod Robusta:** Doble validación con `validateParams()` y `validate()` para parámetros URL y body
3. **Consistencia Arquitectónica:** Uso de `UserService.getUserWithRoles()` estandarizado
4. **🔒 Validación Crítica Preservada:** Verificación de pertenencia del grupo al restaurante del usuario
5. **Transformación Automática:** Zod maneja trimming, parsing y conversión de tipos automáticamente
6. **Manejo Específico de Errores:** Captura y formatea correctamente errores 403/404 con códigos específicos
7. **ResponseService Estándar:** Respuesta consistente con timestamp y formato uniforme

---

### **PATCH /api/restaurant/modifier-options/:optionId** - Actualizar Opción de Modificador

**Descripción:** Actualiza una opción de modificador existente. Permite actualizar selectivamente solo los campos enviados (nombre y/o precio). El endpoint verifica que el usuario tenga permisos en el restaurante y que la opción pertenezca a un grupo del mismo restaurante antes de proceder con la actualización.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/modifier-options/:optionId`

**Método:** `PATCH`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(optionParamsSchema)`: Valida y transforma el parámetro `optionId` de la URL
- `validate(updateOptionSchema)`: Valida y transforma los datos del body de la petición

#### **Esquemas de Validación Zod:**

**optionParamsSchema** (Validación de Parámetros URL):
```javascript
const optionParamsSchema = z.object({
  optionId: z
    .string({ required_error: 'El ID de la opción es requerido' })
    .regex(/^\d+$/, 'El ID de la opción debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID de la opción debe ser mayor que 0')
});
```

**updateOptionSchema** (Validación del Body):
```javascript
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
```

#### **Controlador Refactorizado:**

```javascript
const updateModifierOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.updateOption(optionId, req.body, userId, req.id);

    return ResponseService.success(res, 'Opción de modificador actualizada exitosamente', result);

  } catch (error) {
    console.error('Error actualizando opción de modificador:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 400) {
        return ResponseService.badRequest(res, error.message, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Ultra Simplificado:** Solo 25 líneas vs 150+ líneas anteriores
- **Delegación Total:** Toda la lógica de negocio delegada al repositorio
- **ResponseService Estándar:** Uso de `ResponseService.success()` para respuestas consistentes
- **Manejo Específico:** Captura errores 400/403/404 del repositorio con códigos específicos

#### **Lógica del ModifierRepository.updateOption():**

El repositorio maneja toda la lógica de negocio y validaciones críticas:

1. **Validación de Usuario y Autorización:**
   ```javascript
   // Usa UserService estandarizado para consistencia arquitectónica
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   
   // Verifica roles de restaurante
   const restaurantRoles = ['owner', 'branch_manager'];
   const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
   const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));
   ```

2. **Extracción del RestaurantId:**
   ```javascript
   // Obtiene el restaurantId del usuario de forma segura
   const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
     assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
   );
   
   if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
     throw {
       status: 403,
       message: 'No se encontró un restaurante asignado para este usuario',
       code: 'NO_RESTAURANT_ASSIGNED'
     };
   }
   ```

3. **🔒 Validación Crítica de Pertenencia de la Opción:**
   ```javascript
   // Verifica que la opción existe y pertenece a un grupo del restaurante del usuario
   const existingOption = await prisma.modifierOption.findFirst({
     where: {
       id: optionIdNum,
       modifierGroup: {
         restaurantId: restaurantId
       }
     },
     include: {
       modifierGroup: {
         select: {
           id: true,
           name: true,
           restaurantId: true
         }
       }
     }
   });

   if (!existingOption) {
     throw {
       status: 404,
       message: 'Opción de modificador no encontrada',
       code: 'MODIFIER_OPTION_NOT_FOUND'
     };
   }
   ```

4. **🔄 Actualización Selectiva (Campos Opcionales):**
   ```javascript
   // Solo actualiza los campos enviados en la petición
   const updateData = {};
   
   if (name !== undefined) {
     updateData.name = name.trim();
   }
   
   if (price !== undefined) {
     updateData.price = parseFloat(price);
   }

   // Validación: debe enviar al menos un campo
   if (Object.keys(updateData).length === 0) {
     throw {
       status: 400,
       message: 'No se proporcionaron campos para actualizar',
       code: 'NO_FIELDS_TO_UPDATE'
     };
   }
   ```

5. **Actualización con Información de Grupo:**
   ```javascript
   // Actualiza la opción incluyendo información del grupo padre
   const updatedOption = await prisma.modifierOption.update({
     where: { id: optionIdNum },
     data: updateData,
     include: {
       modifierGroup: {
         select: {
           id: true,
           name: true,
           restaurantId: true
         }
       }
     }
   });
   ```

6. **Formateo de Respuesta Completa:**
   ```javascript
   // Retorna tanto la opción actualizada como los campos modificados
   return {
     modifierOption: {
       id: updatedOption.id,
       name: updatedOption.name,
       price: Number(updatedOption.price),
       modifierGroupId: updatedOption.modifierGroupId,
       modifierGroup: {
         id: updatedOption.modifierGroup.id,
         name: updatedOption.modifierGroup.name,
         restaurantId: updatedOption.modifierGroup.restaurantId
       },
       createdAt: updatedOption.createdAt,
       updatedAt: updatedOption.updatedAt
     },
     updatedFields: Object.keys(updateData)
   };
   ```

#### **Payload de Ejemplo:**

```json
{
  "name": "Gigante XL (20 pulgadas) (Zod Actualizado)",
  "price": 110.00
}
```

**Características del Payload:**
- **Campos Opcionales**: Puede enviar solo `name`, solo `price`, o ambos
- **name**: String opcional (1-100 caracteres), se trimea automáticamente
- **price**: Número opcional (≥ 0), se convierte a float automáticamente
- **Validación Estricta**: `.strict()` en Zod previene campos no definidos
- **Actualización Selectiva**: Solo se actualizan los campos enviados

#### **Response Exitosa (200 OK):**

```json
{
    "status": "success",
    "message": "Opción de modificador actualizada exitosamente",
    "timestamp": "2025-10-18T21:01:49.417Z",
    "data": {
        "modifierOption": {
            "id": 26,
            "name": "Gigante XL (20 pulgadas) (Zod Actualizado)",
            "price": 110,
            "modifierGroupId": 1,
            "modifierGroup": {
                "id": 1,
                "name": "Tamaño",
                "restaurantId": 1
            },
            "createdAt": "2025-10-18T20:54:17.823Z",
            "updatedAt": "2025-10-18T21:01:48.992Z"
        },
        "updatedFields": [
            "name",
            "price"
        ]
    }
}
```

**Características de la Respuesta:**
- **Código 200:** Confirmación de actualización exitosa
- **Información Completa:** Incluye opción actualizada con información del grupo padre
- **Campos Modificados:** Lista `updatedFields` muestra exactamente qué se cambió
- **Conversión de Tipos:** Precio convertido a número JavaScript estándar
- **Timestamps:** Muestra `createdAt` original y `updatedAt` con la nueva fecha

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod (Parámetros URL):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["optionId"],
      "message": "El ID de la opción debe ser un número"
    }
  ]
}
```

**400 Bad Request - Validación Zod (Body):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "too_small",
      "path": ["name"],
      "message": "El nombre no puede estar vacío"
    },
    {
      "code": "too_small",
      "path": ["price"],
      "message": "El precio debe ser mayor o igual a 0"
    }
  ]
}
```

**400 Bad Request - Sin Campos para Actualizar:**
```json
{
  "status": "error",
  "message": "No se proporcionaron campos para actualizar",
  "code": "NO_FIELDS_TO_UPDATE"
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "No tienes permiso para actualizar opciones de modificadores",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - No Restaurante Asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este usuario",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Usuario No Encontrado:**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**404 Not Found - Opción No Encontrada:**
```json
{
  "status": "error",
  "message": "Opción de modificador no encontrada",
  "code": "MODIFIER_OPTION_NOT_FOUND"
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor"
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository Completo:** Toda la lógica de negocio centralizada en `ModifierRepository.updateOption()`
2. **Validación Zod Robusta:** Doble validación con `validateParams()` y `validate()` para parámetros URL y body
3. **Consistencia Arquitectónica:** Uso de `UserService.getUserWithRoles()` estandarizado
4. **🔒 Validación Crítica Preservada:** Verificación de pertenencia de la opción al restaurante del usuario
5. **🔄 Actualización Selectiva:** Solo modifica campos enviados, preserva valores existentes
6. **Transformación Automática:** Zod maneja trimming y parsing automáticamente
7. **Información Detallada:** Respuesta incluye tanto el objeto actualizado como la lista de campos modificados
8. **Manejo Específico de Errores:** Captura y formatea correctamente errores 400/403/404 con códigos específicos
9. **ResponseService Estándar:** Respuesta consistente con timestamp y formato uniforme

---

### **DELETE /api/restaurant/modifier-options/:optionId** - Eliminar Opción de Modificador

**Descripción:** Elimina una opción de modificador existente. Incluye una **corrección crítica** que previene la eliminación de opciones que están siendo utilizadas en carritos de compra activos, garantizando la integridad de los datos del sistema.

**URL:** `https://delixmi-backend.onrender.com/api/restaurant/modifier-options/:optionId`

**Método:** `DELETE`

#### **Middlewares Aplicados:**
- `authenticateToken`: Valida el JWT token del usuario autenticado
- `requireRole(['owner', 'branch_manager'])`: Verifica que el usuario tenga permisos de restaurante
- `validateParams(optionParamsSchema)`: Valida y transforma el parámetro `optionId` de la URL

#### **Esquema de Validación Zod:**

**optionParamsSchema** (Validación de Parámetros URL):
```javascript
const optionParamsSchema = z.object({
  optionId: z
    .string({ required_error: 'El ID de la opción es requerido' })
    .regex(/^\d+$/, 'El ID de la opción debe ser un número')
    .transform((val) => parseInt(val, 10))
    .refine((val) => val > 0, 'El ID de la opción debe ser mayor que 0')
});
```

#### **Controlador Refactorizado:**

```javascript
const deleteModifierOption = async (req, res) => {
  try {
    const { optionId } = req.params;
    const userId = req.user.id;

    const result = await ModifierRepository.deleteOption(optionId, userId, req.id);

    return ResponseService.success(res, 'Opción de modificador eliminada exitosamente', result);

  } catch (error) {
    console.error('Error eliminando opción de modificador:', error);
    
    // Manejo específico de errores del repositorio
    if (error.status && error.code) {
      if (error.status === 404) {
        return ResponseService.notFound(res, error.message, error.code);
      } else if (error.status === 403) {
        return ResponseService.forbidden(res, error.message, error.code);
      } else if (error.status === 409) {
        return ResponseService.conflict(res, error.message, error.details, error.code);
      }
    }
    
    return ResponseService.internalError(res, 'Error interno del servidor');
  }
};
```

**Características del Controlador:**
- **Ultra Simplificado:** Solo 25 líneas vs 110+ líneas anteriores
- **Delegación Total:** Toda la lógica de negocio delegada al repositorio
- **ResponseService Estándar:** Uso de `ResponseService.success()` para respuestas consistentes
- **Manejo Específico 409:** Captura el error crítico de conflicto con detalles informativos

#### **Lógica del ModifierRepository.deleteOption():**

El repositorio maneja toda la lógica de negocio, validaciones críticas y **corrección del bug crítico**:

1. **Validación de Usuario y Autorización:**
   ```javascript
   // Usa UserService estandarizado para consistencia arquitectónica
   const userWithRoles = await UserService.getUserWithRoles(userId, requestId);
   
   // Verifica roles de restaurante
   const restaurantRoles = ['owner', 'branch_manager'];
   const userRoles = userWithRoles.userRoleAssignments.map(assignment => assignment.role.name);
   const hasRestaurantRole = userRoles.some(role => restaurantRoles.includes(role));
   ```

2. **Extracción del RestaurantId:**
   ```javascript
   // Obtiene el restaurantId del usuario de forma segura
   const userRestaurantAssignment = userWithRoles.userRoleAssignments.find(
     assignment => restaurantRoles.includes(assignment.role.name) && assignment.restaurantId !== null
   );
   
   if (!userRestaurantAssignment || !userRestaurantAssignment.restaurantId) {
     throw {
       status: 403,
       message: 'No se encontró un restaurante asignado para este usuario',
       code: 'NO_RESTAURANT_ASSIGNED'
     };
   }
   ```

3. **🔒 Validación de Pertenencia de la Opción:**
   ```javascript
   // Verifica que la opción existe y pertenece a un grupo del restaurante del usuario
   const existingOption = await prisma.modifierOption.findFirst({
     where: {
       id: optionIdNum,
       modifierGroup: {
         restaurantId: restaurantId
       }
     },
     include: {
       modifierGroup: {
         select: {
           id: true,
           name: true,
           restaurantId: true
         }
       }
     }
   });

   if (!existingOption) {
     throw {
       status: 404,
       message: 'Opción de modificador no encontrada',
       code: 'MODIFIER_OPTION_NOT_FOUND'
     };
   }
   ```

4. **🚨 CORRECCIÓN CRÍTICA DEL BUG - Validación de Uso en Carritos:**
   ```javascript
   // NUEVA VALIDACIÓN: Verificar si la opción está siendo usada en carritos activos
   const cartItemsCount = await prisma.cartItemModifier.count({
     where: { modifierOptionId: optionIdNum }
   });

   if (cartItemsCount > 0) {
     throw {
       status: 409,
       message: 'No se puede eliminar la opción porque está siendo usada en carritos de compra activos',
       code: 'OPTION_IN_USE_IN_CARTS',
       details: {
         cartItemsCount: cartItemsCount,
         optionId: optionIdNum,
         optionName: existingOption.name
       }
     };
   }
   ```

5. **Eliminación Segura:**
   ```javascript
   // Solo procede si todas las validaciones críticas pasan
   await prisma.modifierOption.delete({
     where: { id: optionIdNum }
   });

   // Retorna información de la opción eliminada
   return {
     deletedOption: {
       id: existingOption.id,
       name: existingOption.name,
       price: Number(existingOption.price),
       modifierGroupId: existingOption.modifierGroupId,
       deletedAt: new Date().toISOString()
     }
   };
   ```

#### **🚨 Corrección Crítica del Bug:**

**Problema Identificado:** El endpoint original eliminaba opciones de modificadores sin verificar si estaban siendo utilizadas en la tabla `CartItemModifier`, lo que podría causar problemas de integridad referencial y cascadas no deseadas.

**Solución Implementada:**
- **Nueva Consulta:** `prisma.cartItemModifier.count({ where: { modifierOptionId: optionIdNum } })`
- **Validación Preventiva:** Si `cartItemsCount > 0`, lanza error 409 Conflict
- **Código de Error:** `OPTION_IN_USE_IN_CARTS` con detalles informativos
- **Protección:** Evita eliminaciones que podrían romper la integridad de datos

#### **Response Exitosa (200 OK):**

```json
{
    "status": "success",
    "message": "Opción de modificador eliminada exitosamente",
    "timestamp": "2025-10-18T21:09:25.562Z",
    "data": {
        "deletedOption": {
            "id": 26,
            "name": "Gigante XL (20 pulgadas) (Zod Actualizado)",
            "price": 110,
            "modifierGroupId": 1,
            "deletedAt": "2025-10-18T21:09:25.561Z"
        }
    }
}
```

**Características de la Respuesta:**
- **Código 200:** Confirmación de eliminación exitosa
- **Información de Auditoría:** Incluye ID, nombre, precio y timestamp de eliminación
- **Conversión de Tipos:** Precio convertido a número JavaScript estándar
- **Timestamp Preciso:** `deletedAt` generado en el momento exacto de la eliminación

#### **Manejo de Errores:**

**400 Bad Request - Validación Zod (Parámetros URL):**
```json
{
  "status": "error",
  "message": "Datos de entrada inválidos",
  "errors": [
    {
      "code": "invalid_string",
      "path": ["optionId"],
      "message": "El ID de la opción debe ser un número"
    }
  ]
}
```

**403 Forbidden - Permisos Insuficientes:**
```json
{
  "status": "error",
  "message": "No tienes permiso para eliminar opciones de modificadores",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```

**403 Forbidden - No Restaurante Asignado:**
```json
{
  "status": "error",
  "message": "No se encontró un restaurante asignado para este usuario",
  "code": "NO_RESTAURANT_ASSIGNED"
}
```

**404 Not Found - Usuario No Encontrado:**
```json
{
  "status": "error",
  "message": "Usuario no encontrado",
  "code": "USER_NOT_FOUND"
}
```

**404 Not Found - Opción No Encontrada:**
```json
{
  "status": "error",
  "message": "Opción de modificador no encontrada",
  "code": "MODIFIER_OPTION_NOT_FOUND"
}
```

**🚨 409 Conflict - Corrección Crítica del Bug (Opción en Uso en Carritos):**
```json
{
  "status": "error",
  "message": "No se puede eliminar la opción porque está siendo usada en carritos de compra activos",
  "code": "OPTION_IN_USE_IN_CARTS",
  "details": {
    "cartItemsCount": 3,
    "optionId": 26,
    "optionName": "Gigante XL (20 pulgadas) (Zod Actualizado)"
  }
}
```

**500 Internal Server Error:**
```json
{
  "status": "error",
  "message": "Error interno del servidor"
}
```

#### **Características de la Refactorización:**

1. **Patrón Repository Completo:** Toda la lógica de negocio centralizada en `ModifierRepository.deleteOption()`
2. **Validación Zod Robusta:** `validateParams(optionParamsSchema)` para validación de parámetros URL
3. **Consistencia Arquitectónica:** Uso de `UserService.getUserWithRoles()` estandarizado
4. **🔒 Validación de Autorización:** Verificación de pertenencia de la opción al restaurante del usuario
5. **🚨 CORRECCIÓN CRÍTICA DEL BUG:** Nueva validación que previene eliminación de opciones en uso en carritos
6. **Integridad de Datos:** Protección contra cascadas que podrían afectar la integridad referencial
7. **Manejo Específico 409:** Captura y formatea correctamente el error de conflicto con detalles informativos
8. **Respuesta de Auditoría:** Proporciona información completa de la opción eliminada para rastreabilidad
9. **ResponseService Estándar:** Respuesta consistente con timestamp y formato uniforme
