// Configuración global para las pruebas
const { PrismaClient } = require('@prisma/client');

// Configuración de variables de entorno para testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Configuración de timeout global
jest.setTimeout(30000);

// Configuración de Prisma para testing
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'mysql://root:password@localhost:3306/delixmi_test'
    }
  }
});

// Configuración global de Prisma
global.prisma = prisma;

// Configuración de cleanup
afterAll(async () => {
  await prisma.$disconnect();
});

// Configuración de manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
