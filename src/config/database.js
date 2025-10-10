// Configuración de la base de datos
const { PrismaClient } = require('@prisma/client');

// Configuración de la URL de conexión
const DATABASE_URL = process.env.DATABASE_URL;

// Validar que DATABASE_URL esté configurada
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL no está configurada en las variables de entorno');
}

// Crear instancia de Prisma
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

// Función para verificar la conexión
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    return false;
  }
}

// Función para cerrar la conexión
async function disconnect() {
  try {
    await prisma.$disconnect();
    console.log('🔌 Conexión a la base de datos cerrada');
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error.message);
  }
}

module.exports = {
  prisma,
  testConnection,
  disconnect
};
