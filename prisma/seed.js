const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando proceso de seeding...');

  try {
    // 1. Crear Roles
    console.log('📋 Creando roles...');
    const roles = await prisma.role.createMany({
      data: [
        { name: 'super_admin', displayName: 'Super Administrador', description: 'Control total sobre la plataforma.' },
        { name: 'platform_manager', displayName: 'Gestor de Plataforma', description: 'Gestiona las operaciones diarias de la plataforma.' },
        { name: 'support_agent', displayName: 'Agente de Soporte', description: 'Primera línea de atención para resolver dudas e incidentes.' },
        { name: 'owner', displayName: 'Dueño de Restaurante', description: 'Control total sobre uno o más negocios en la app.' },
        { name: 'branch_manager', displayName: 'Gerente de Sucursal', description: 'Gestiona las operaciones diarias de una sucursal específica.' },
        { name: 'order_manager', displayName: 'Gestor de Pedidos', description: 'Acepta y gestiona los pedidos entrantes en una sucursal.' },
        { name: 'kitchen_staff', displayName: 'Personal de Cocina', description: 'Prepara los platillos para la entrega.' },
        { name: 'driver_platform', displayName: 'Repartidor de Plataforma', description: 'Repartidor independiente que trabaja para la plataforma.' },
        { name: 'driver_restaurant', displayName: 'Repartidor de Restaurante', description: 'Empleado de un restaurante que solo entrega pedidos de ese negocio.' },
        { name: 'customer', displayName: 'Cliente', description: 'Usuario final que realiza pedidos.' }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${roles.count} roles creados`);

    // 2. Crear Permisos
    console.log('🔐 Creando permisos...');
    const permissions = await prisma.permission.createMany({
      data: [
        // Permisos para Productos
        { name: 'products.create', displayName: 'Crear Productos', module: 'products' },
        { name: 'products.edit.all', displayName: 'Editar Cualquier Producto', module: 'products' },
        { name: 'products.edit.own', displayName: 'Editar Productos Propios', module: 'products' },
        { name: 'products.delete.own', displayName: 'Eliminar Productos Propios', module: 'products' },
        { name: 'products.update.stock', displayName: 'Actualizar Stock de Producto', module: 'products' },
        
        // Permisos para Pedidos
        { name: 'orders.view.all', displayName: 'Ver Todos los Pedidos', module: 'orders' },
        { name: 'orders.view.own_branch', displayName: 'Ver Pedidos de mi Sucursal', module: 'orders' },
        { name: 'orders.accept', displayName: 'Aceptar Pedidos', module: 'orders' },
        { name: 'orders.reject', displayName: 'Rechazar Pedidos', module: 'orders' },
        { name: 'orders.update.status', displayName: 'Actualizar Estado de Pedido', module: 'orders' },
        
        // Permisos para Restaurantes
        { name: 'restaurants.create', displayName: 'Crear Restaurantes', module: 'restaurants' },
        { name: 'restaurants.edit.all', displayName: 'Editar Cualquier Restaurante', module: 'restaurants' },
        { name: 'restaurants.edit.own', displayName: 'Editar mi Restaurante', module: 'restaurants' },
        { name: 'restaurants.assign.users', displayName: 'Asignar Usuarios a mi Restaurante', module: 'restaurants' },
        
        // Permisos para Usuarios
        { name: 'users.create', displayName: 'Crear Usuarios', module: 'users' },
        { name: 'users.edit.all', displayName: 'Editar Cualquier Usuario', module: 'users' },
        { name: 'users.view.all', displayName: 'Ver Todos los Usuarios', module: 'users' },
        
        // Permisos para Reembolsos
        { name: 'refunds.issue.low_value', displayName: 'Emitir Reembolsos de Bajo Valor', module: 'refunds' },
        { name: 'refunds.issue.high_value', displayName: 'Emitir Reembolsos de Alto Valor', module: 'refunds' }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${permissions.count} permisos creados`);

    // 3. Crear asignaciones de permisos a roles
    console.log('🔗 Asignando permisos a roles...');
    
    // Obtener IDs de roles y permisos
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
    const orderManagerRole = await prisma.role.findUnique({ where: { name: 'order_manager' } });
    const kitchenStaffRole = await prisma.role.findUnique({ where: { name: 'kitchen_staff' } });
    
    const createRestaurantsPermission = await prisma.permission.findUnique({ where: { name: 'restaurants.create' } });
    const viewOwnBranchPermission = await prisma.permission.findUnique({ where: { name: 'orders.view.own_branch' } });
    const acceptOrdersPermission = await prisma.permission.findUnique({ where: { name: 'orders.accept' } });
    const updateOrderStatusPermission = await prisma.permission.findUnique({ where: { name: 'orders.update.status' } });

    const rolePermissions = await prisma.roleHasPermission.createMany({
      data: [
        // Super Admin puede crear restaurantes
        { roleId: superAdminRole.id, permissionId: createRestaurantsPermission.id },
        // Order Manager puede ver pedidos de su sucursal y aceptarlos
        { roleId: orderManagerRole.id, permissionId: viewOwnBranchPermission.id },
        { roleId: orderManagerRole.id, permissionId: acceptOrdersPermission.id },
        // Kitchen Staff puede actualizar estado de pedidos
        { roleId: kitchenStaffRole.id, permissionId: updateOrderStatusPermission.id }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${rolePermissions.count} asignaciones de permisos creadas`);

    // 4. Crear Usuarios (con contraseñas hasheadas)
    console.log('👥 Creando usuarios...');
    const hashedPassword = await bcrypt.hash('supersecret', 10);
    
    const users = await prisma.user.createMany({
      data: [
        {
          name: 'Admin',
          lastname: 'Delixmi',
          email: 'admin@delixmi.com',
          phone: '1111111111',
          password: hashedPassword,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          status: 'active'
        },
        {
          name: 'Ana',
          lastname: 'García',
          email: 'ana.garcia@pizzeria.com',
          phone: '2222222222',
          password: hashedPassword,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          status: 'active'
        },
        {
          name: 'Carlos',
          lastname: 'Rodriguez',
          email: 'carlos.rodriguez@pizzeria.com',
          phone: '3333333333',
          password: hashedPassword,
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
          status: 'active'
        },
        {
          name: 'Sofía',
          lastname: 'López',
          email: 'sofia.lopez@email.com',
          phone: '4444444444',
          password: hashedPassword,
          status: 'pending'
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${users.count} usuarios creados`);

    // 5. Crear Restaurantes
    console.log('🏪 Creando restaurantes...');
    const restaurants = await prisma.restaurant.createMany({
      data: [
        {
          ownerId: 2, // Ana García
          name: 'Pizzería de Ana',
          description: 'Las mejores pizzas artesanales de la región, con ingredientes frescos y locales.',
          commissionRate: 12.50,
          status: 'active'
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${restaurants.count} restaurantes creados`);

    // 6. Crear Sucursales
    console.log('🏢 Creando sucursales...');
    const branches = await prisma.branch.createMany({
      data: [
        {
          restaurantId: 1,
          name: 'Sucursal Centro',
          address: 'Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.',
          latitude: 20.484123,
          longitude: -99.216345,
          phone: '7711234567',
          openingTime: new Date('1970-01-01T09:00:00.000Z'),
          closingTime: new Date('1970-01-01T22:00:00.000Z'),
          status: 'active'
        },
        {
          restaurantId: 1,
          name: 'Sucursal Río',
          address: 'Paseo del Roble 205, Barrio del Río, Ixmiquilpan, Hgo.',
          latitude: 20.475890,
          longitude: -99.225678,
          phone: '7717654321',
          openingTime: new Date('1970-01-01T10:00:00.000Z'),
          closingTime: new Date('1970-01-01T23:00:00.000Z'),
          status: 'active'
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${branches.count} sucursales creadas`);

    // 7. Crear Categorías
    console.log('📂 Creando categorías...');
    const categories = await prisma.category.createMany({
      data: [
        { name: 'Pizzas' },
        { name: 'Bebidas' },
        { name: 'Entradas' },
        { name: 'Postres' }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${categories.count} categorías creadas`);

    // 8. Crear Subcategorías
    console.log('📁 Creando subcategorías...');
    const subcategories = await prisma.subcategory.createMany({
      data: [
        { restaurantId: 1, categoryId: 1, name: 'Pizzas Tradicionales', displayOrder: 1 },
        { restaurantId: 1, categoryId: 1, name: 'Pizzas Gourmet', displayOrder: 2 },
        { restaurantId: 1, categoryId: 2, name: 'Refrescos', displayOrder: 3 },
        { restaurantId: 1, categoryId: 2, name: 'Aguas Frescas', displayOrder: 4 }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${subcategories.count} subcategorías creadas`);

    // 9. Crear Productos
    console.log('🍕 Creando productos...');
    const products = await prisma.product.createMany({
      data: [
        {
          restaurantId: 1,
          subcategoryId: 1, // Pizzas Tradicionales
          name: 'Pizza Hawaiana',
          description: 'La clásica pizza con jamón y piña fresca.',
          price: 150.00,
          isAvailable: true
        },
        {
          restaurantId: 1,
          subcategoryId: 1, // Pizzas Tradicionales
          name: 'Pizza de Pepperoni',
          description: 'Generosa porción de pepperoni sobre nuestra salsa especial de la casa.',
          price: 145.50,
          isAvailable: true
        },
        {
          restaurantId: 1,
          subcategoryId: 3, // Refrescos
          name: 'Coca-Cola 600ml',
          description: 'Refresco de cola bien frío.',
          price: 25.00,
          isAvailable: true
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${products.count} productos creados`);

    // 10. Crear Direcciones
    console.log('📍 Creando direcciones...');
    const addresses = await prisma.address.createMany({
      data: [
        {
          userId: 4, // Sofía López
          alias: 'Casa',
          street: 'Av. Felipe Ángeles',
          exteriorNumber: '21',
          neighborhood: 'San Nicolás',
          city: 'Ixmiquilpan',
          state: 'Hidalgo',
          zipCode: '42300',
          references: 'Casa de dos pisos con portón de madera.',
          latitude: 20.488765,
          longitude: -99.234567
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${addresses.count} direcciones creadas`);

    // 11. Crear Pedidos
    console.log('📦 Creando pedidos...');
    const orders = await prisma.order.createMany({
      data: [
        {
          customerId: 4, // Sofía López
          branchId: 1, // Sucursal Centro
          addressId: 1,
          status: 'confirmed',
          subtotal: 175.50,
          deliveryFee: 20.00,
          total: 195.50,
          commissionRateSnapshot: 12.50,
          platformFee: 8.78, // 5% del subtotal
          restaurantPayout: 153.22, // subtotal - comisión
          paymentMethod: 'card',
          paymentStatus: 'completed'
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${orders.count} pedidos creados`);

    // 12. Crear Items de Pedido
    console.log('🛒 Creando items de pedido...');
    const orderItems = await prisma.orderItem.createMany({
      data: [
        {
          orderId: 1,
          productId: 1, // Pizza Hawaiana
          quantity: 1,
          pricePerUnit: 150.00
        },
        {
          orderId: 1,
          productId: 3, // Coca-Cola
          quantity: 1,
          pricePerUnit: 25.50 // Precio actualizado al momento del pedido
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${orderItems.count} items de pedido creados`);

    // 13. Crear Pagos
    console.log('💳 Creando pagos...');
    const payments = await prisma.payment.createMany({
      data: [
        {
          orderId: 1,
          amount: 195.50,
          currency: 'MXN',
          provider: 'mercadopago',
          providerPaymentId: 'mp_test_123456789',
          status: 'completed'
        }
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${payments.count} pagos creados`);

    // 14. Crear Asignaciones de Roles de Usuario
    console.log('👤 Creando asignaciones de roles...');
    const userRoleAssignments = await prisma.userRoleAssignment.createMany({
      data: [
        // Admin como super_admin
        { userId: 1, roleId: 1 }, // super_admin
        // Ana como owner del restaurante
        { userId: 2, roleId: 4, restaurantId: 1 }, // owner
        // Carlos como order_manager de la sucursal centro
        { userId: 3, roleId: 6, restaurantId: 1, branchId: 1 }, // order_manager
        // Sofía como customer
        { userId: 4, roleId: 10 } // customer
      ],
      skipDuplicates: true
    });
    console.log(`✅ ${userRoleAssignments.count} asignaciones de roles creadas`);

    console.log('🎉 ¡Seeding completado exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log(`- ${roles.count} roles`);
    console.log(`- ${permissions.count} permisos`);
    console.log(`- ${rolePermissions.count} asignaciones de permisos`);
    console.log(`- ${users.count} usuarios`);
    console.log(`- ${restaurants.count} restaurantes`);
    console.log(`- ${branches.count} sucursales`);
    console.log(`- ${categories.count} categorías`);
    console.log(`- ${subcategories.count} subcategorías`);
    console.log(`- ${products.count} productos`);
    console.log(`- ${addresses.count} direcciones`);
    console.log(`- ${orders.count} pedidos`);
    console.log(`- ${orderItems.count} items de pedido`);
    console.log(`- ${payments.count} pagos`);
    console.log(`- ${userRoleAssignments.count} asignaciones de roles`);

  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Error fatal en el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Conexión a la base de datos cerrada');
  });
