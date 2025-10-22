const fs = require('fs');
const path = require('path');

/**
 * Función helper para verificar si un archivo existe físicamente en el servidor
 * @param {string} url - URL del archivo a verificar
 * @param {string} uploadsPath - Ruta base del directorio de uploads
 * @returns {string|null} URL si el archivo existe, null si no existe
 */
const verifyFileExists = (url, uploadsPath) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  
  try {
    // Extraer el nombre del archivo y tipo de la URL
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const type = urlParts[urlParts.length - 2]; // 'logos', 'covers', o 'products'
    
    // Validar que sea una URL de nuestro dominio y tenga formato válido
    if (!url.includes('/uploads/') || !url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      console.warn(`⚠️ URL inválida o no es una imagen: ${url}`);
      return null;
    }
    
    // Construir múltiples rutas posibles del archivo en el servidor
    const possiblePaths = [
      path.join(uploadsPath, type, filename),
      path.join(__dirname, '../public/uploads', type, filename),
      path.join(process.cwd(), 'public/uploads', type, filename)
    ];
    
    // Verificar si el archivo existe físicamente en alguna ruta
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        console.log(`✅ Archivo existe físicamente: ${filename} en ${filePath}`);
        return url;
      }
    }
    
    // Si no se encuentra en ninguna ruta
    console.warn(`🧹 LIMPIANDO URL obsoleta - archivo no existe: ${filename}`);
    console.warn(`📂 Rutas verificadas:`, possiblePaths);
    return null;
  } catch (error) {
    console.error(`❌ Error verificando archivo ${url}:`, error);
    return null;
  }
};

module.exports = {
  verifyFileExists
};
