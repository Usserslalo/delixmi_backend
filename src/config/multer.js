const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Función para crear directorios si no existen
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Configuración de almacenamiento en disco para logos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/logos');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp + número aleatorio + extensión original
    const timestamp = Date.now();
    const randomNumber = Math.round(Math.random() * 10000);
    const extension = path.extname(file.originalname);
    const filename = `logo_${timestamp}_${randomNumber}${extension}`;
    cb(null, filename);
  }
});

// Configuración de almacenamiento en disco para fotos de portada
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../public/uploads/covers');
    ensureDirectoryExists(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp + número aleatorio + extensión original
    const timestamp = Date.now();
    const randomNumber = Math.round(Math.random() * 10000);
    const extension = path.extname(file.originalname);
    const filename = `cover_${timestamp}_${randomNumber}${extension}`;
    cb(null, filename);
  }
});

// Filtro de archivos para aceptar solo imágenes
const fileFilter = (req, file, cb) => {
  // Verificar el tipo MIME
  if (file.mimetype.startsWith('image/')) {
    // Verificar la extensión
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG, JPEG y PNG'), false);
    }
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configuración de multer para logos
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
    files: 1 // Solo un archivo por vez
  }
});

// Configuración de multer para fotos de portada
const uploadCover = multer({
  storage: coverStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Límite de 5MB
    files: 1 // Solo un archivo por vez
  }
});

// Middleware para manejar errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        status: 'error',
        message: 'El archivo es demasiado grande. El tamaño máximo permitido es 5MB',
        code: 'FILE_TOO_LARGE'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        status: 'error',
        message: 'Solo se permite subir un archivo a la vez',
        code: 'TOO_MANY_FILES'
      });
    }
  }
  
  if (error.message === 'Solo se permiten archivos JPG, JPEG y PNG' || 
      error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      status: 'error',
      message: error.message,
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  next(error);
};

module.exports = {
  upload,
  uploadCover,
  handleMulterError
};
