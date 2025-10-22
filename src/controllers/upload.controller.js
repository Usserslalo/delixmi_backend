const { PrismaClient } = require('@prisma/client');
const UserService = require('../services/user.service');
const RestaurantRepository = require('../repositories/restaurant.repository');
const ResponseService = require('../services/response.service');
const { verifyFileExists } = require('../utils/fileVerifier');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

/**
 * Función helper para construir la URL base de manera robusta
 */
const getBaseUrl = (req) => {
  let baseUrl;
  
  // Primero intentar usar BASE_URL del entorno si está definido
  if (process.env.BASE_URL) {
    baseUrl = process.env.BASE_URL;
  } else {
    // Si no, construir la URL desde la request (funciona con proxies como Render)
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    baseUrl = `${protocol}://${host}`;
  }
  
  // Asegurar que no tenga trailing slash problemático
  return baseUrl.replace(/\/$/, '');
};

/**
 * Controlador para subir logo del restaurante
 * POST /api/restaurant/upload-logo
 */
const uploadRestaurantLogo = async (req, res) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionó ningún archivo',
        code: 'NO_FILE_PROVIDED'
      });
    }

    const userId = req.user.id;

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // Construir la URL pública del archivo de manera robusta
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

    // --- INICIO DE LA IMPLEMENTACIÓN DE SEGURIDAD ---
    
    // 1. Definir la ruta base de 'uploads'
    const uploadsPath = path.join(process.cwd(), 'public/uploads');
    
    // 2. Verificar el archivo ANTES de guardar en BD
    const verifiedUrl = verifyFileExists(fileUrl, uploadsPath);
    
    // 3. Manejar el error si el archivo no existe
    if (!verifiedUrl) {
      // Loguear el error crítico
      console.error(`Error crítico de integridad de archivo: El archivo ${req.file.filename} (URL: ${fileUrl}) no se encontró en el disco después de una subida exitosa. Revise los permisos de la carpeta 'public/uploads' y el proceso de 'multer'.`);
      
      // Intentar borrar el archivo huérfano si existe
      if (req.file && req.file.path) {
        try { 
          fs.unlinkSync(req.file.path); 
          console.log(`🧹 Archivo huérfano eliminado: ${req.file.path}`);
        } catch(e) { 
          console.error(`Fallo al limpiar archivo huérfano: ${req.file.path}`, e); 
        }
      }

      // Devolver un error 500 al cliente
      return res.status(500).json({
        status: 'error',
        message: 'Error al procesar el archivo. El archivo no pudo ser guardado correctamente en el servidor.',
        code: 'FILE_INTEGRITY_ERROR'
      });
    }
    // --- FIN DE LA IMPLEMENTACIÓN DE SEGURIDAD ---

    // 4. Actualizar el logoUrl en la base de datos (AHORA ES SEGURO)
    await RestaurantRepository.updateProfile(restaurantId, { logoUrl: verifiedUrl });

    // Log para debugging
    console.log(`✅ Logo subido y actualizado en BD exitosamente:`, {
      userId,
      restaurantId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: verifiedUrl,
      baseUrl: baseUrl
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Logo subido exitosamente',
      data: {
        logoUrl: verifiedUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        restaurantId: restaurantId
      }
    });

  } catch (error) {
    console.error('Error subiendo logo del restaurante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para subir foto de portada del restaurante
 * POST /api/restaurant/upload-cover
 */
const uploadRestaurantCover = async (req, res) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionó ningún archivo',
        code: 'NO_FILE_PROVIDED'
      });
    }

    const userId = req.user.id;

    // 1. Obtener información del usuario y verificar que es owner
    const userWithRoles = await UserService.getUserWithRoles(userId, req.id);

    if (!userWithRoles) {
      return ResponseService.notFound(res, 'Usuario no encontrado');
    }

    // 2. Verificar que el usuario tiene rol de owner
    const ownerAssignments = userWithRoles.userRoleAssignments.filter(
      assignment => assignment.role.name === 'owner'
    );

    if (ownerAssignments.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: 'Acceso denegado. Se requiere rol de owner',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 3. Obtener el restaurantId del owner
    const ownerAssignment = ownerAssignments.find(
      assignment => assignment.restaurantId !== null
    );

    if (!ownerAssignment || !ownerAssignment.restaurantId) {
      return res.status(403).json({
        status: 'error',
        message: 'No se encontró un restaurante asignado para este owner',
        code: 'NO_RESTAURANT_ASSIGNED'
      });
    }

    const restaurantId = ownerAssignment.restaurantId;

    // Construir la URL pública del archivo de manera robusta
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/covers/${req.file.filename}`;

    // --- INICIO DE LA IMPLEMENTACIÓN DE SEGURIDAD ---
    
    // 1. Definir la ruta base de 'uploads'
    const uploadsPath = path.join(process.cwd(), 'public/uploads');
    
    // 2. Verificar el archivo ANTES de guardar en BD
    const verifiedUrl = verifyFileExists(fileUrl, uploadsPath);
    
    // 3. Manejar el error si el archivo no existe
    if (!verifiedUrl) {
      // Loguear el error crítico
      console.error(`Error crítico de integridad de archivo: El archivo ${req.file.filename} (URL: ${fileUrl}) no se encontró en el disco después de una subida exitosa. Revise los permisos de la carpeta 'public/uploads' y el proceso de 'multer'.`);
      
      // Intentar borrar el archivo huérfano si existe
      if (req.file && req.file.path) {
        try { 
          fs.unlinkSync(req.file.path); 
          console.log(`🧹 Archivo huérfano eliminado: ${req.file.path}`);
        } catch(e) { 
          console.error(`Fallo al limpiar archivo huérfano: ${req.file.path}`, e); 
        }
      }

      // Devolver un error 500 al cliente
      return res.status(500).json({
        status: 'error',
        message: 'Error al procesar el archivo. El archivo no pudo ser guardado correctamente en el servidor.',
        code: 'FILE_INTEGRITY_ERROR'
      });
    }
    // --- FIN DE LA IMPLEMENTACIÓN DE SEGURIDAD ---

    // 4. Actualizar el coverPhotoUrl en la base de datos (AHORA ES SEGURO)
    await RestaurantRepository.updateProfile(restaurantId, { coverPhotoUrl: verifiedUrl });

    // Log para debugging
    console.log(`✅ Cover subido y actualizado en BD exitosamente:`, {
      userId,
      restaurantId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: verifiedUrl,
      baseUrl: baseUrl
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Foto de portada subida exitosamente',
      data: {
        coverPhotoUrl: verifiedUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        restaurantId: restaurantId
      }
    });

  } catch (error) {
    console.error('Error subiendo foto de portada del restaurante:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Controlador para subir imagen de producto
 * POST /api/restaurant/products/upload-image
 */
const uploadProductImage = async (req, res) => {
  try {
    // Verificar que se subió un archivo
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionó ningún archivo',
        code: 'NO_FILE_PROVIDED'
      });
    }

    // Construir la URL pública del archivo de manera robusta
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/products/${req.file.filename}`;

    // --- INICIO DE LA IMPLEMENTACIÓN DE SEGURIDAD ---
    
    // 1. Definir la ruta base de 'uploads'
    const uploadsPath = path.join(process.cwd(), 'public/uploads');
    
    // 2. Verificar el archivo ANTES de devolver la respuesta
    const verifiedUrl = verifyFileExists(fileUrl, uploadsPath);
    
    // 3. Manejar el error si el archivo no existe
    if (!verifiedUrl) {
      // Loguear el error crítico
      console.error(`Error crítico de integridad de archivo: El archivo ${req.file.filename} (URL: ${fileUrl}) no se encontró en el disco después de una subida exitosa. Revise los permisos de la carpeta 'public/uploads' y el proceso de 'multer'.`);
      
      // Intentar borrar el archivo huérfano si existe
      if (req.file && req.file.path) {
        try { 
          fs.unlinkSync(req.file.path); 
          console.log(`🧹 Archivo huérfano eliminado: ${req.file.path}`);
        } catch(e) { 
          console.error(`Fallo al limpiar archivo huérfano: ${req.file.path}`, e); 
        }
      }

      // Devolver un error 500 al cliente
      return res.status(500).json({
        status: 'error',
        message: 'Error al procesar el archivo. El archivo no pudo ser guardado correctamente en el servidor.',
        code: 'FILE_INTEGRITY_ERROR'
      });
    }
    // --- FIN DE LA IMPLEMENTACIÓN DE SEGURIDAD ---

    // Log para debugging
    console.log(`✅ Imagen de producto subida exitosamente:`, {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: verifiedUrl,
      baseUrl: baseUrl
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Imagen de producto subida exitosamente',
      data: {
        imageUrl: verifiedUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    });

  } catch (error) {
    console.error('Error subiendo imagen de producto:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      code: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  uploadRestaurantLogo,
  uploadRestaurantCover,
  uploadProductImage
};
