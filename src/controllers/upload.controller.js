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
 * POST /api/restaurant/uploads/logo
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

    // Construir la URL pública del archivo de manera robusta
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

    // Log para debugging
    console.log(`✅ Logo subido exitosamente:`, {
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
        mimetype: req.file.mimetype
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
 * POST /api/restaurant/uploads/cover
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

    // Construir la URL pública del archivo de manera robusta
    const baseUrl = getBaseUrl(req);
    const fileUrl = `${baseUrl}/uploads/covers/${req.file.filename}`;

    // Log para debugging
    console.log(`✅ Cover subido exitosamente:`, {
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
        mimetype: req.file.mimetype
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
