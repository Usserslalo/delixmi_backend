const { PrismaClient } = require('@prisma/client');
const UserService = require('../services/user.service');
const RestaurantRepository = require('../repositories/restaurant.repository');
const ResponseService = require('../services/response.service');

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

    // 4. Actualizar el logoUrl en la base de datos
    await RestaurantRepository.updateProfile(restaurantId, { logoUrl: fileUrl });

    // Log para debugging
    console.log(`✅ Logo subido y actualizado en BD exitosamente:`, {
      userId,
      restaurantId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      baseUrl: baseUrl
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Logo subido exitosamente',
      data: {
        logoUrl: fileUrl,
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

    // 4. Actualizar el coverPhotoUrl en la base de datos
    await RestaurantRepository.updateProfile(restaurantId, { coverPhotoUrl: fileUrl });

    // Log para debugging
    console.log(`✅ Cover subido y actualizado en BD exitosamente:`, {
      userId,
      restaurantId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      url: fileUrl,
      baseUrl: baseUrl
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Foto de portada subida exitosamente',
      data: {
        coverPhotoUrl: fileUrl,
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

module.exports = {
  uploadRestaurantLogo,
  uploadRestaurantCover
};
