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

    // Construir la URL pública del archivo
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/uploads/logos/${req.file.filename}`;

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

    // Construir la URL pública del archivo
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const fileUrl = `${baseUrl}/uploads/covers/${req.file.filename}`;

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
