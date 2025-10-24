module.exports = {
  // Directorio de pruebas
  testMatch: ['**/tests/**/*.test.js'],
  
  // Directorio de cobertura
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/config/**',
    '!src/websocket/**'
  ],
  
  // Configuración de entorno
  testEnvironment: 'node',
  
  // Timeout para pruebas
  testTimeout: 30000,
  
  // Configuración de cobertura
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Configuración de setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Configuración de transformación
  transform: {},
  
  // Configuración de módulos
  moduleFileExtensions: ['js', 'json'],
  
  // Configuración de verbose
  verbose: true,
  
  // Configuración de colores
  colors: true,
  
  // Configuración de detección de archivos abiertos
  detectOpenHandles: true,
  
  // Configuración de fuerza de salida
  forceExit: true
};
