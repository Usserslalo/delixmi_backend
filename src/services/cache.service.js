/**
 * Servicio de caché en memoria simple para optimizar consultas frecuentes
 * Implementa un TTL (Time To Live) para expiración automática de datos
 */
class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map(); // Para manejar la expiración automática
  }

  /**
   * Almacena un valor en el caché con un tiempo de vida específico
   * @param {string} key - Clave única para identificar el valor
   * @param {any} value - Valor a almacenar (puede ser cualquier tipo de dato)
   * @param {number} ttlInSeconds - Tiempo de vida en segundos (por defecto: 1 hora)
   * @returns {boolean} True si se almacenó correctamente
   */
  set(key, value, ttlInSeconds = 3600) {
    try {
      // Eliminar timer existente si la clave ya existe
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
      }

      // Almacenar el valor con timestamp
      const cacheEntry = {
        value: value,
        timestamp: Date.now(),
        ttl: ttlInSeconds * 1000 // Convertir a milisegundos
      };

      this.cache.set(key, cacheEntry);

      // Configurar expiración automática
      const timer = setTimeout(() => {
        this.clear(key);
      }, ttlInSeconds * 1000);

      this.timers.set(key, timer);

      return true;
    } catch (error) {
      console.error('Error almacenando en caché:', error);
      return false;
    }
  }

  /**
   * Obtiene un valor del caché
   * @param {string} key - Clave del valor a obtener
   * @returns {any|null} El valor almacenado o null si no existe o ha expirado
   */
  get(key) {
    try {
      const entry = this.cache.get(key);
      
      if (!entry) {
        return null; // No existe en el caché
      }

      // Verificar si ha expirado
      const now = Date.now();
      const isExpired = (now - entry.timestamp) > entry.ttl;

      if (isExpired) {
        // Limpiar entrada expirada
        this.clear(key);
        return null;
      }

      return entry.value;
    } catch (error) {
      console.error('Error obteniendo del caché:', error);
      return null;
    }
  }

  /**
   * Verifica si una clave existe en el caché y no ha expirado
   * @param {string} key - Clave a verificar
   * @returns {boolean} True si existe y no ha expirado
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Elimina una clave específica del caché
   * @param {string} key - Clave a eliminar
   * @returns {boolean} True si se eliminó correctamente
   */
  clear(key) {
    try {
      // Limpiar timer si existe
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }

      // Eliminar del caché
      return this.cache.delete(key);
    } catch (error) {
      console.error('Error eliminando del caché:', error);
      return false;
    }
  }

  /**
   * Limpia todo el caché
   * @returns {boolean} True si se limpió correctamente
   */
  clearAll() {
    try {
      // Limpiar todos los timers
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();

      // Limpiar el caché
      this.cache.clear();

      return true;
    } catch (error) {
      console.error('Error limpiando caché:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object} Estadísticas del caché
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    this.cache.forEach((entry, key) => {
      const isExpired = (now - entry.timestamp) > entry.ttl;
      if (isExpired) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    });

    return {
      totalKeys: this.cache.size,
      validEntries: validEntries,
      expiredEntries: expiredEntries,
      memoryUsage: process.memoryUsage().heapUsed,
      uptime: process.uptime()
    };
  }

  /**
   * Limpia entradas expiradas del caché
   * @returns {number} Número de entradas eliminadas
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    const keysToDelete = [];

    this.cache.forEach((entry, key) => {
      const isExpired = (now - entry.timestamp) > entry.ttl;
      if (isExpired) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      if (this.clear(key)) {
        cleanedCount++;
      }
    });

    return cleanedCount;
  }

  /**
   * Obtiene todas las claves del caché (para debugging)
   * @returns {string[]} Array de claves
   */
  getKeys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Obtiene información detallada de una entrada específica
   * @param {string} key - Clave a inspeccionar
   * @returns {Object|null} Información de la entrada o null si no existe
   */
  getEntryInfo(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;
    const isExpired = age > entry.ttl;
    const remainingTtl = Math.max(0, entry.ttl - age);

    return {
      key: key,
      hasValue: true,
      timestamp: entry.timestamp,
      age: age,
      ttl: entry.ttl,
      remainingTtl: remainingTtl,
      isExpired: isExpired,
      valueType: typeof entry.value,
      valueSize: JSON.stringify(entry.value).length
    };
  }
}

// Crear una instancia singleton del servicio de caché
const cacheService = new CacheService();

// Configurar limpieza automática cada 5 minutos
setInterval(() => {
  const cleaned = cacheService.cleanup();
  if (cleaned > 0) {
    console.log(`🧹 Caché limpiado: ${cleaned} entradas expiradas eliminadas`);
  }
}, 5 * 60 * 1000); // 5 minutos

// Limpiar caché al cerrar la aplicación
process.on('SIGINT', () => {
  console.log('🛑 Cerrando aplicación, limpiando caché...');
  cacheService.clearAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Cerrando aplicación, limpiando caché...');
  cacheService.clearAll();
  process.exit(0);
});

module.exports = cacheService;
