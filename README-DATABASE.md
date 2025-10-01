# 🗄️ Configuración de Base de Datos - Delixmi Backend

## 📋 Requisitos Previos

1. **MySQL 8.0+** instalado y ejecutándose
2. **Node.js 18+** instalado
3. **npm** o **yarn** para gestión de dependencias

## 🚀 Configuración Inicial

### 1. Instalar Dependencias
```bash
npm install
```

### 2. Configurar Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto con:
```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/delixmi"

# Server
PORT=3000
NODE_ENV=development
```

**⚠️ Importante:** Cambia `root` y `password` por tus credenciales de MySQL.

### 3. Crear la Base de Datos
```sql
CREATE DATABASE delixmi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Generar el Cliente de Prisma
```bash
npm run db:generate
```

### 5. Aplicar el Schema a la Base de Datos
```bash
npm run db:push
```

## 🧪 Probar la Conexión

### Opción 1: Script de Prueba
```bash
npm run test:db
```

### Opción 2: Servidor de Desarrollo
```bash
npm run dev
```

Luego visita: `http://localhost:3000/health`

## 📊 Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm run test:db` | Probar conexión a la base de datos |
| `npm run db:generate` | Generar cliente de Prisma |
| `npm run db:push` | Aplicar schema sin migraciones |
| `npm run db:migrate` | Crear y aplicar migraciones |
| `npm run db:studio` | Abrir Prisma Studio (GUI) |
| `npm run dev` | Iniciar servidor en modo desarrollo |
| `npm start` | Iniciar servidor en producción |

## 🔧 Estructura de la Base de Datos

El schema incluye las siguientes tablas principales:

- **users** - Usuarios del sistema (clientes, repartidores, admins)
- **roles** - Roles del sistema (admin, cliente, repartidor, etc.)
- **permissions** - Permisos específicos por módulo
- **restaurants** - Restaurantes afiliados
- **branches** - Sucursales de restaurantes
- **categories** - Categorías globales de productos
- **subcategories** - Subcategorías por restaurante
- **products** - Productos de cada restaurante
- **orders** - Pedidos realizados
- **order_items** - Detalle de productos en cada pedido
- **address** - Direcciones de entrega
- **payments** - Transacciones de pago
- **driver_profiles** - Perfiles de repartidores

## 🚨 Solución de Problemas

### Error de Conexión
1. Verifica que MySQL esté ejecutándose
2. Confirma que la base de datos `delixmi` exista
3. Revisa las credenciales en el archivo `.env`
4. Asegúrate de que el puerto 3306 esté disponible

### Error de Permisos
```sql
GRANT ALL PRIVILEGES ON delixmi.* TO 'tu_usuario'@'localhost';
FLUSH PRIVILEGES;
```

### Reiniciar desde Cero
```bash
# Eliminar base de datos
DROP DATABASE delixmi;

# Recrear base de datos
CREATE DATABASE delixmi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Aplicar schema
npm run db:push
```

## 📝 Próximos Pasos

1. ✅ Configurar conexión básica
2. 🔄 Crear migraciones iniciales
3. 🌱 Implementar seeders con datos de prueba
4. 🔐 Configurar autenticación JWT
5. 🚀 Desarrollar APIs RESTful
