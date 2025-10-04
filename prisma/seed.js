const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando proceso de seeding...');

  try {
    // ===== ELIMINACIÓN EN ORDEN INVERSO =====
    console.log('🧹 Limpiando datos existentes...');
    
    await prisma.orderItem.deleteMany({});
    console.log('✅ OrderItems eliminados');
    
    await prisma.payment.deleteMany({});
    console.log('✅ Payments eliminados');
    
    await prisma.order.deleteMany({});
    console.log('✅ Orders eliminados');
    
    await prisma.address.deleteMany({});
    console.log('✅ Addresses eliminados');
    
    await prisma.driverProfile.deleteMany({});
    console.log('✅ DriverProfiles eliminados');
    
    await prisma.userRoleAssignment.deleteMany({});
    console.log('✅ UserRoleAssignments eliminados');
    
    await prisma.product.deleteMany({});
    console.log('✅ Products eliminados');
    
    await prisma.subcategory.deleteMany({});
    console.log('✅ Subcategories eliminadas');
    
    await prisma.category.deleteMany({});
    console.log('✅ Categories eliminadas');
    
    await prisma.branchSchedule.deleteMany({});
    console.log('✅ BranchSchedules eliminados');
    
    await prisma.branch.deleteMany({});
    console.log('✅ Branches eliminadas');
    
    await prisma.restaurant.deleteMany({});
    console.log('✅ Restaurants eliminados');
    
    await prisma.user.deleteMany({});
    console.log('✅ Users eliminados');
    
    await prisma.roleHasPermission.deleteMany({});
    console.log('✅ RoleHasPermissions eliminados');
    
    await prisma.permission.deleteMany({});
    console.log('✅ Permissions eliminados');
    
    await prisma.role.deleteMany({});
    console.log('✅ Roles eliminados');

    // ===== CREACIÓN SECUENCIAL =====

    // 1. CREAR ROLES (10 roles)
    console.log('📋 Creando roles...');
    const superAdminRole = await prisma.role.create({
      data: {
        name: 'super_admin',
        displayName: 'Super Administrador',
        description: 'Control total sobre la plataforma.'
      }
    });
    console.log('✅ Super Admin role creado');

    const platformManagerRole = await prisma.role.create({
      data: {
        name: 'platform_manager',
        displayName: 'Gestor de Plataforma',
        description: 'Gestiona las operaciones diarias de la plataforma.'
      }
    });
    console.log('✅ Platform Manager role creado');

    const supportAgentRole = await prisma.role.create({
      data: {
        name: 'support_agent',
        displayName: 'Agente de Soporte',
        description: 'Primera línea de atención para resolver dudas e incidentes.'
      }
    });
    console.log('✅ Support Agent role creado');

    const ownerRole = await prisma.role.create({
      data: {
        name: 'owner',
        displayName: 'Dueño de Restaurante',
        description: 'Control total sobre uno o más negocios en la app.'
      }
    });
    console.log('✅ Owner role creado');

    const branchManagerRole = await prisma.role.create({
      data: {
        name: 'branch_manager',
        displayName: 'Gerente de Sucursal',
        description: 'Gestiona las operaciones diarias de una sucursal específica.'
      }
    });
    console.log('✅ Branch Manager role creado');

    const orderManagerRole = await prisma.role.create({
      data: {
        name: 'order_manager',
        displayName: 'Gestor de Pedidos',
        description: 'Acepta y gestiona los pedidos entrantes en una sucursal.'
      }
    });
    console.log('✅ Order Manager role creado');

    const kitchenStaffRole = await prisma.role.create({
      data: {
        name: 'kitchen_staff',
        displayName: 'Personal de Cocina',
        description: 'Prepara los platillos para la entrega.'
      }
    });
    console.log('✅ Kitchen Staff role creado');

    const driverPlatformRole = await prisma.role.create({
      data: {
        name: 'driver_platform',
        displayName: 'Repartidor de Plataforma',
        description: 'Repartidor independiente que trabaja para la plataforma.'
      }
    });
    console.log('✅ Driver Platform role creado');

    const driverRestaurantRole = await prisma.role.create({
      data: {
        name: 'driver_restaurant',
        displayName: 'Repartidor de Restaurante',
        description: 'Empleado de un restaurante que solo entrega pedidos de ese negocio.'
      }
    });
    console.log('✅ Driver Restaurant role creado');

    const customerRole = await prisma.role.create({
      data: {
        name: 'customer',
        displayName: 'Cliente',
        description: 'Usuario final que realiza pedidos.'
      }
    });
    console.log('✅ Customer role creado');

    // 2. CREAR PERMISOS (19 permisos)
    console.log('🔐 Creando permisos...');
    const hashedPassword = await bcrypt.hash('supersecret', 10);

    // Permisos para Productos
    const productsCreatePerm = await prisma.permission.create({
      data: { name: 'products.create', displayName: 'Crear Productos', module: 'products' }
    });
    const productsEditAllPerm = await prisma.permission.create({
      data: { name: 'products.edit.all', displayName: 'Editar Cualquier Producto', module: 'products' }
    });
    const productsEditOwnPerm = await prisma.permission.create({
      data: { name: 'products.edit.own', displayName: 'Editar Productos Propios', module: 'products' }
    });
    const productsDeleteOwnPerm = await prisma.permission.create({
      data: { name: 'products.delete.own', displayName: 'Eliminar Productos Propios', module: 'products' }
    });
    const productsUpdateStockPerm = await prisma.permission.create({
      data: { name: 'products.update.stock', displayName: 'Actualizar Stock de Producto', module: 'products' }
    });

    // Permisos para Pedidos
    const ordersViewAllPerm = await prisma.permission.create({
      data: { name: 'orders.view.all', displayName: 'Ver Todos los Pedidos', module: 'orders' }
    });
    const ordersViewOwnBranchPerm = await prisma.permission.create({
      data: { name: 'orders.view.own_branch', displayName: 'Ver Pedidos de mi Sucursal', module: 'orders' }
    });
    const ordersAcceptPerm = await prisma.permission.create({
      data: { name: 'orders.accept', displayName: 'Aceptar Pedidos', module: 'orders' }
    });
    const ordersRejectPerm = await prisma.permission.create({
      data: { name: 'orders.reject', displayName: 'Rechazar Pedidos', module: 'orders' }
    });
    const ordersUpdateStatusPerm = await prisma.permission.create({
      data: { name: 'orders.update.status', displayName: 'Actualizar Estado de Pedido', module: 'orders' }
    });

    // Permisos para Restaurantes
    const restaurantsCreatePerm = await prisma.permission.create({
      data: { name: 'restaurants.create', displayName: 'Crear Restaurantes', module: 'restaurants' }
    });
    const restaurantsEditAllPerm = await prisma.permission.create({
      data: { name: 'restaurants.edit.all', displayName: 'Editar Cualquier Restaurante', module: 'restaurants' }
    });
    const restaurantsEditOwnPerm = await prisma.permission.create({
      data: { name: 'restaurants.edit.own', displayName: 'Editar mi Restaurante', module: 'restaurants' }
    });
    const restaurantsAssignUsersPerm = await prisma.permission.create({
      data: { name: 'restaurants.assign.users', displayName: 'Asignar Usuarios a mi Restaurante', module: 'restaurants' }
    });

    // Permisos para Usuarios
    const usersCreatePerm = await prisma.permission.create({
      data: { name: 'users.create', displayName: 'Crear Usuarios', module: 'users' }
    });
    const usersEditAllPerm = await prisma.permission.create({
      data: { name: 'users.edit.all', displayName: 'Editar Cualquier Usuario', module: 'users' }
    });
    const usersViewAllPerm = await prisma.permission.create({
      data: { name: 'users.view.all', displayName: 'Ver Todos los Usuarios', module: 'users' }
    });

    // Permisos para Reembolsos
    const refundsIssueLowValuePerm = await prisma.permission.create({
      data: { name: 'refunds.issue.low_value', displayName: 'Emitir Reembolsos de Bajo Valor', module: 'refunds' }
    });
    const refundsIssueHighValuePerm = await prisma.permission.create({
      data: { name: 'refunds.issue.high_value', displayName: 'Emitir Reembolsos de Alto Valor', module: 'refunds' }
    });
    console.log('✅ 19 permisos creados');

    // 3. CREAR ASIGNACIONES DE PERMISOS A ROLES
    console.log('🔗 Asignando permisos a roles...');
    
    // Super Admin - Todos los permisos
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: superAdminRole.id, permissionId: productsCreatePerm.id },
        { roleId: superAdminRole.id, permissionId: productsEditAllPerm.id },
        { roleId: superAdminRole.id, permissionId: productsEditOwnPerm.id },
        { roleId: superAdminRole.id, permissionId: productsDeleteOwnPerm.id },
        { roleId: superAdminRole.id, permissionId: productsUpdateStockPerm.id },
        { roleId: superAdminRole.id, permissionId: ordersViewAllPerm.id },
        { roleId: superAdminRole.id, permissionId: ordersViewOwnBranchPerm.id },
        { roleId: superAdminRole.id, permissionId: ordersAcceptPerm.id },
        { roleId: superAdminRole.id, permissionId: ordersRejectPerm.id },
        { roleId: superAdminRole.id, permissionId: ordersUpdateStatusPerm.id },
        { roleId: superAdminRole.id, permissionId: restaurantsCreatePerm.id },
        { roleId: superAdminRole.id, permissionId: restaurantsEditAllPerm.id },
        { roleId: superAdminRole.id, permissionId: restaurantsEditOwnPerm.id },
        { roleId: superAdminRole.id, permissionId: restaurantsAssignUsersPerm.id },
        { roleId: superAdminRole.id, permissionId: usersCreatePerm.id },
        { roleId: superAdminRole.id, permissionId: usersEditAllPerm.id },
        { roleId: superAdminRole.id, permissionId: usersViewAllPerm.id },
        { roleId: superAdminRole.id, permissionId: refundsIssueLowValuePerm.id },
        { roleId: superAdminRole.id, permissionId: refundsIssueHighValuePerm.id }
      ]
    });

    // Owner - Permisos de su restaurante
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: ownerRole.id, permissionId: productsCreatePerm.id },
        { roleId: ownerRole.id, permissionId: productsEditOwnPerm.id },
        { roleId: ownerRole.id, permissionId: productsDeleteOwnPerm.id },
        { roleId: ownerRole.id, permissionId: productsUpdateStockPerm.id },
        { roleId: ownerRole.id, permissionId: ordersViewOwnBranchPerm.id },
        { roleId: ownerRole.id, permissionId: ordersAcceptPerm.id },
        { roleId: ownerRole.id, permissionId: ordersRejectPerm.id },
        { roleId: ownerRole.id, permissionId: ordersUpdateStatusPerm.id },
        { roleId: ownerRole.id, permissionId: restaurantsEditOwnPerm.id },
        { roleId: ownerRole.id, permissionId: restaurantsAssignUsersPerm.id }
      ]
    });

    // Branch Manager - Permisos de su sucursal
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: branchManagerRole.id, permissionId: ordersViewOwnBranchPerm.id },
        { roleId: branchManagerRole.id, permissionId: ordersAcceptPerm.id },
        { roleId: branchManagerRole.id, permissionId: ordersRejectPerm.id },
        { roleId: branchManagerRole.id, permissionId: ordersUpdateStatusPerm.id },
        { roleId: branchManagerRole.id, permissionId: productsEditOwnPerm.id },
        { roleId: branchManagerRole.id, permissionId: productsUpdateStockPerm.id }
      ]
    });

    // Order Manager - Gestión de pedidos
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: orderManagerRole.id, permissionId: ordersViewOwnBranchPerm.id },
        { roleId: orderManagerRole.id, permissionId: ordersAcceptPerm.id },
        { roleId: orderManagerRole.id, permissionId: ordersRejectPerm.id }
      ]
    });

    // Kitchen Staff - Actualización de estados
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: kitchenStaffRole.id, permissionId: ordersUpdateStatusPerm.id },
        { roleId: kitchenStaffRole.id, permissionId: productsUpdateStockPerm.id }
      ]
    });

    // Platform Manager - Gestión de plataforma
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: platformManagerRole.id, permissionId: ordersViewAllPerm.id },
        { roleId: platformManagerRole.id, permissionId: restaurantsCreatePerm.id },
        { roleId: platformManagerRole.id, permissionId: restaurantsEditAllPerm.id },
        { roleId: platformManagerRole.id, permissionId: usersViewAllPerm.id },
        { roleId: platformManagerRole.id, permissionId: refundsIssueLowValuePerm.id }
      ]
    });

    // Support Agent - Soporte básico
    await prisma.roleHasPermission.createMany({
      data: [
        { roleId: supportAgentRole.id, permissionId: ordersViewAllPerm.id },
        { roleId: supportAgentRole.id, permissionId: usersViewAllPerm.id },
        { roleId: supportAgentRole.id, permissionId: refundsIssueLowValuePerm.id }
      ]
    });
    console.log('✅ Asignaciones de permisos creadas');

    // 4. CREAR USUARIOS (5 usuarios)
    console.log('👥 Creando usuarios...');
    
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin',
        lastname: 'Delixmi',
        email: 'admin@delixmi.com',
        phone: '1111111111',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });
    console.log('✅ Admin usuario creado');

    const anaUser = await prisma.user.create({
      data: {
        name: 'Ana',
        lastname: 'García',
        email: 'ana.garcia@pizzeria.com',
        phone: '2222222222',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });
    console.log('✅ Ana usuario creado');

    const carlosUser = await prisma.user.create({
      data: {
        name: 'Carlos',
        lastname: 'Rodriguez',
        email: 'carlos.rodriguez@pizzeria.com',
        phone: '3333333333',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });
    console.log('✅ Carlos usuario creado');

    const miguelUser = await prisma.user.create({
      data: {
        name: 'Miguel',
        lastname: 'Hernández',
        email: 'miguel.hernandez@repartidor.com',
        phone: '5555555555',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });
    console.log('✅ Miguel usuario creado');

    const sofiaUser = await prisma.user.create({
      data: {
        name: 'Sofía',
        lastname: 'López',
        email: 'sofia.lopez@email.com',
        phone: '4444444444',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });
    console.log('✅ Sofía usuario creado');

    // 5. CREAR RESTAURANTE
    console.log('🏪 Creando restaurante...');
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: anaUser.id, // Ana García
        name: 'Pizzería de Ana',
        description: 'Las mejores pizzas artesanales de la región, con ingredientes frescos y locales.',
        logoUrl: 'https://example.com/logos/pizzeria-ana.jpg',
        coverPhotoUrl: 'https://example.com/covers/pizzeria-ana-cover.jpg',
        commissionRate: 12.50,
        status: 'active'
      }
    });
    console.log('✅ Restaurante creado');

    // 6. CREAR SUCURSALES (3 sucursales)
    console.log('🏢 Creando sucursales...');
    
    const centroBranch = await prisma.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Sucursal Centro',
        address: 'Av. Insurgentes 10, Centro, Ixmiquilpan, Hgo.',
        latitude: 20.484123,
        longitude: -99.216345,
        phone: '7711234567',
        usesPlatformDrivers: true,
        status: 'active'
      }
    });
    console.log('✅ Sucursal Centro creada');

    const rioBranch = await prisma.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Sucursal Río',
        address: 'Paseo del Roble 205, Barrio del Río, Ixmiquilpan, Hgo.',
        latitude: 20.475890,
        longitude: -99.225678,
        phone: '7717654321',
        usesPlatformDrivers: true,
        status: 'active'
      }
    });
    console.log('✅ Sucursal Río creada');

    const fitzhiBranch = await prisma.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: 'Sucursal El Fitzhi',
        address: 'Calle Morelos 45, El Fitzhi, Ixmiquilpan, Hgo.',
        latitude: 20.492345,
        longitude: -99.208765,
        phone: '7719876543',
        usesPlatformDrivers: false,
        status: 'active'
      }
    });
    console.log('✅ Sucursal El Fitzhi creada');

    // 6.1. CREAR HORARIOS DE SUCURSALES
    console.log('⏰ Creando horarios de sucursales...');
    
    // Horarios para Sucursal Centro (branchId: centroBranch.id)
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: centroBranch.id, dayOfWeek: 1, openingTime: new Date('1970-01-01T09:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }, // Lunes
        { branchId: centroBranch.id, dayOfWeek: 2, openingTime: new Date('1970-01-01T09:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }, // Martes
        { branchId: centroBranch.id, dayOfWeek: 3, openingTime: new Date('1970-01-01T09:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }, // Miércoles
        { branchId: centroBranch.id, dayOfWeek: 4, openingTime: new Date('1970-01-01T09:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }, // Jueves
        { branchId: centroBranch.id, dayOfWeek: 5, openingTime: new Date('1970-01-01T09:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }, // Viernes
        { branchId: centroBranch.id, dayOfWeek: 6, openingTime: new Date('1970-01-01T10:00:00Z'), closingTime: new Date('1970-01-01T23:00:00Z') }, // Sábado
        { branchId: centroBranch.id, dayOfWeek: 0, isClosed: true, openingTime: new Date('1970-01-01T00:00:00Z'), closingTime: new Date('1970-01-01T00:00:00Z') }  // Domingo cerrado
      ]
    });
    console.log('✅ Horarios Sucursal Centro creados');

    // Horarios para Sucursal Río (branchId: rioBranch.id)
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: rioBranch.id, dayOfWeek: 1, openingTime: new Date('1970-01-01T10:00:00Z'), closingTime: new Date('1970-01-01T23:00:00Z') }, // Lunes
        { branchId: rioBranch.id, dayOfWeek: 2, openingTime: new Date('1970-01-01T10:00:00Z'), closingTime: new Date('1970-01-01T23:00:00Z') }, // Martes
        { branchId: rioBranch.id, dayOfWeek: 3, openingTime: new Date('1970-01-01T10:00:00Z'), closingTime: new Date('1970-01-01T23:00:00Z') }, // Miércoles
        { branchId: rioBranch.id, dayOfWeek: 4, openingTime: new Date('1970-01-01T10:00:00Z'), closingTime: new Date('1970-01-01T23:00:00Z') }, // Jueves
        { branchId: rioBranch.id, dayOfWeek: 5, openingTime: new Date('1970-01-01T10:00:00Z'), closingTime: new Date('1970-01-01T23:00:00Z') }, // Viernes
        { branchId: rioBranch.id, dayOfWeek: 6, openingTime: new Date('1970-01-01T11:00:00Z'), closingTime: new Date('1970-01-01T00:00:00Z') }, // Sábado (hasta medianoche)
        { branchId: rioBranch.id, dayOfWeek: 0, openingTime: new Date('1970-01-01T11:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }  // Domingo
      ]
    });
    console.log('✅ Horarios Sucursal Río creados');

    // Horarios para Sucursal El Fitzhi (branchId: fitzhiBranch.id)
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: fitzhiBranch.id, dayOfWeek: 1, openingTime: new Date('1970-01-01T08:00:00Z'), closingTime: new Date('1970-01-01T21:00:00Z') }, // Lunes
        { branchId: fitzhiBranch.id, dayOfWeek: 2, openingTime: new Date('1970-01-01T08:00:00Z'), closingTime: new Date('1970-01-01T21:00:00Z') }, // Martes
        { branchId: fitzhiBranch.id, dayOfWeek: 3, openingTime: new Date('1970-01-01T08:00:00Z'), closingTime: new Date('1970-01-01T21:00:00Z') }, // Miércoles
        { branchId: fitzhiBranch.id, dayOfWeek: 4, openingTime: new Date('1970-01-01T08:00:00Z'), closingTime: new Date('1970-01-01T21:00:00Z') }, // Jueves
        { branchId: fitzhiBranch.id, dayOfWeek: 5, openingTime: new Date('1970-01-01T08:00:00Z'), closingTime: new Date('1970-01-01T21:00:00Z') }, // Viernes
        { branchId: fitzhiBranch.id, dayOfWeek: 6, openingTime: new Date('1970-01-01T09:00:00Z'), closingTime: new Date('1970-01-01T22:00:00Z') }, // Sábado
        { branchId: fitzhiBranch.id, dayOfWeek: 0, isClosed: true, openingTime: new Date('1970-01-01T00:00:00Z'), closingTime: new Date('1970-01-01T00:00:00Z') }  // Domingo cerrado
      ]
    });
    console.log('✅ Horarios Sucursal El Fitzhi creados');

    // 7. CREAR CATEGORÍAS
    console.log('📂 Creando categorías...');
    
    const pizzasCategory = await prisma.category.create({
      data: { name: 'Pizzas' }
    });
    const bebidasCategory = await prisma.category.create({
      data: { name: 'Bebidas' }
    });
    const entradasCategory = await prisma.category.create({
      data: { name: 'Entradas' }
    });
    const postresCategory = await prisma.category.create({
      data: { name: 'Postres' }
    });
    console.log('✅ 4 categorías creadas');

    // 8. CREAR SUBCATEGORÍAS
    console.log('📁 Creando subcategorías...');
    
    const tradicionalesSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: pizzasCategory.id, name: 'Pizzas Tradicionales', displayOrder: 1 }
    });
    const gourmetSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: pizzasCategory.id, name: 'Pizzas Gourmet', displayOrder: 2 }
    });
    const vegetarianasSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: pizzasCategory.id, name: 'Pizzas Vegetarianas', displayOrder: 3 }
    });
    const refrescosSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: bebidasCategory.id, name: 'Refrescos', displayOrder: 4 }
    });
    const aguasFrescasSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: bebidasCategory.id, name: 'Aguas Frescas', displayOrder: 5 }
    });
    const bebidasCalientesSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: bebidasCategory.id, name: 'Bebidas Calientes', displayOrder: 6 }
    });
    const aperitivosSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: entradasCategory.id, name: 'Aperitivos', displayOrder: 7 }
    });
    const heladosSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: postresCategory.id, name: 'Helados', displayOrder: 8 }
    });
    const pastelesSub = await prisma.subcategory.create({
      data: { restaurantId: restaurant.id, categoryId: postresCategory.id, name: 'Pasteles', displayOrder: 9 }
    });
    console.log('✅ 9 subcategorías creadas');

    // 9. CREAR PRODUCTOS
    console.log('🍕 Creando productos...');
    
    // Pizzas Tradicionales
    const pizzaHawaiana = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: tradicionalesSub.id,
        name: 'Pizza Hawaiana',
        description: 'La clásica pizza con jamón y piña fresca.',
        price: 150.00,
        imageUrl: 'https://example.com/products/hawaiana.jpg',
        isAvailable: true
      }
    });
    const pizzaPepperoni = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: tradicionalesSub.id,
        name: 'Pizza de Pepperoni',
        description: 'Generosa porción de pepperoni sobre nuestra salsa especial de la casa.',
        price: 145.50,
        imageUrl: 'https://example.com/products/pepperoni.jpg',
        isAvailable: true
      }
    });
    const pizzaMargherita = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: tradicionalesSub.id,
        name: 'Pizza Margherita',
        description: 'Pizza clásica con mozzarella fresca, tomate y albahaca.',
        price: 135.00,
        imageUrl: 'https://example.com/products/margherita.jpg',
        isAvailable: true
      }
    });

    // Pizzas Gourmet
    const pizzaQuattro = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: gourmetSub.id,
        name: 'Pizza Quattro Stagioni',
        description: 'Pizza gourmet con alcachofas, jamón, champiñones y aceitunas.',
        price: 180.00,
        imageUrl: 'https://example.com/products/quattro-stagioni.jpg',
        isAvailable: true
      }
    });

    // Pizzas Vegetarianas
    const pizzaVegetariana = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: vegetarianasSub.id,
        name: 'Pizza Vegetariana',
        description: 'Pizza con champiñones, pimientos, cebolla, aceitunas y queso de cabra.',
        price: 160.00,
        imageUrl: 'https://example.com/products/vegetariana.jpg',
        isAvailable: true
      }
    });

    // Refrescos
    const cocaCola = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: refrescosSub.id,
        name: 'Coca-Cola 600ml',
        description: 'Refresco de cola bien frío.',
        price: 25.00,
        imageUrl: 'https://example.com/products/coca-cola.jpg',
        isAvailable: true
      }
    });
    const sprite = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: refrescosSub.id,
        name: 'Sprite 600ml',
        description: 'Refresco de lima-limón bien frío.',
        price: 25.00,
        imageUrl: 'https://example.com/products/sprite.jpg',
        isAvailable: true
      }
    });

    // Aguas Frescas
    const horchata = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: aguasFrescasSub.id,
        name: 'Agua de Horchata',
        description: 'Agua fresca de horchata natural.',
        price: 20.00,
        imageUrl: 'https://example.com/products/horchata.jpg',
        isAvailable: true
      }
    });

    // Aperitivos
    const arosCebolla = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: aperitivosSub.id,
        name: 'Aros de Cebolla',
        description: 'Crujientes aros de cebolla empanizados.',
        price: 45.00,
        imageUrl: 'https://example.com/products/aros-cebolla.jpg',
        isAvailable: true
      }
    });

    // Postres
    const tiramisu = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: pastelesSub.id,
        name: 'Tiramisú',
        description: 'Postre italiano con café, mascarpone y cacao.',
        price: 55.00,
        imageUrl: 'https://example.com/products/tiramisu.jpg',
        isAvailable: true
      }
    });
    console.log('✅ 10 productos creados');

    // 10. CREAR DIRECCIONES
    console.log('📍 Creando direcciones...');
    
    const casaAddress = await prisma.address.create({
      data: {
        userId: sofiaUser.id,
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
    });
    console.log('✅ Dirección Casa creada');

    const oficinaAddress = await prisma.address.create({
      data: {
        userId: sofiaUser.id,
        alias: 'Oficina',
        street: 'Calle Hidalgo',
        exteriorNumber: '125',
        interiorNumber: 'A',
        neighborhood: 'Centro',
        city: 'Ixmiquilpan',
        state: 'Hidalgo',
        zipCode: '42300',
        references: 'Edificio de oficinas, segundo piso.',
        latitude: 20.485123,
        longitude: -99.220456
      }
    });
    console.log('✅ Dirección Oficina creada');

    // 11. CREAR ASIGNACIONES DE ROLES DE USUARIO
    console.log('👤 Creando asignaciones de roles...');
    
    await prisma.userRoleAssignment.create({
      data: { userId: adminUser.id, roleId: superAdminRole.id }
    });
    await prisma.userRoleAssignment.create({
      data: { userId: anaUser.id, roleId: ownerRole.id, restaurantId: restaurant.id }
    });
    await prisma.userRoleAssignment.create({
      data: { userId: carlosUser.id, roleId: branchManagerRole.id, restaurantId: restaurant.id, branchId: centroBranch.id }
    });
    await prisma.userRoleAssignment.create({
      data: { userId: miguelUser.id, roleId: driverPlatformRole.id }
    });
    await prisma.userRoleAssignment.create({
      data: { userId: sofiaUser.id, roleId: customerRole.id }
    });
    console.log('✅ 5 asignaciones de roles creadas');

    // 12. CREAR PERFILES DE REPARTIDOR
    console.log('🚗 Creando perfiles de repartidor...');
    
    await prisma.driverProfile.create({
      data: {
        userId: miguelUser.id,
        vehicleType: 'motorcycle',
        licensePlate: 'HGO-ABC-123',
        status: 'online',
        currentLatitude: 20.484123,
        currentLongitude: -99.216345,
        lastSeenAt: new Date(),
        kycStatus: 'approved'
      }
    });
    console.log('✅ Perfil de repartidor creado');

    // 13. CREAR PEDIDOS (2 pedidos con diferentes estados)
    console.log('📦 Creando pedidos...');
    
    const order1 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: centroBranch.id,
        addressId: casaAddress.id,
        status: 'confirmed',
        subtotal: 175.50,
        deliveryFee: 20.00,
        total: 195.50,
        commissionRateSnapshot: 12.50,
        platformFee: 8.78,
        restaurantPayout: 153.22,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        specialInstructions: 'Entregar en la puerta principal. No tocar el timbre, solo llamar por teléfono.',
        orderPlacedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 horas atrás
      }
    });
    console.log('✅ Pedido 1 (confirmed) creado');

    const order2 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: rioBranch.id,
        addressId: oficinaAddress.id,
        status: 'delivered',
        subtotal: 225.00,
        deliveryFee: 25.00,
        total: 250.00,
        commissionRateSnapshot: 12.50,
        platformFee: 11.25,
        restaurantPayout: 196.25,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        specialInstructions: 'Por favor tocar el timbre fuerte, el timbre principal no funciona. Llamar al teléfono si no hay respuesta.',
        deliveryDriverId: miguelUser.id,
        orderPlacedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 día atrás
        orderDeliveredAt: new Date(Date.now() - 23 * 60 * 60 * 1000) // 23 horas atrás
      }
    });
    console.log('✅ Pedido 2 (delivered) creado');

    // 14. CREAR ITEMS DE PEDIDO
    console.log('🛒 Creando items de pedido...');
    
    // Pedido 1 (confirmed)
    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productId: pizzaHawaiana.id,
        quantity: 1,
        pricePerUnit: 150.00
      }
    });
    await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productId: cocaCola.id,
        quantity: 1,
        pricePerUnit: 25.50
      }
    });

    // Pedido 2 (delivered)
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: pizzaQuattro.id,
        quantity: 1,
        pricePerUnit: 180.00
      }
    });
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: sprite.id,
        quantity: 1,
        pricePerUnit: 25.00
      }
    });
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: tiramisu.id,
        quantity: 1,
        pricePerUnit: 55.00
      }
    });
    console.log('✅ 5 items de pedido creados');

    // 15. CREAR PAGOS
    console.log('💳 Creando pagos...');
    
    await prisma.payment.create({
      data: {
        orderId: order1.id,
        amount: 195.50,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: 'mp_test_123456789',
        status: 'completed'
      }
    });
    await prisma.payment.create({
      data: {
        orderId: order2.id,
        amount: 250.00,
        currency: 'MXN',
        provider: 'cash',
        providerPaymentId: 'cash_987654321',
        status: 'completed'
      }
    });
    console.log('✅ 2 pagos creados');

    console.log('🎉 ¡Seeding completado exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log('- 10 roles');
    console.log('- 19 permisos');
    console.log('- 5 usuarios');
    console.log('- 1 restaurante');
    console.log('- 3 sucursales');
    console.log('- 21 horarios de sucursales (7 días × 3 sucursales)');
    console.log('- 4 categorías');
    console.log('- 9 subcategorías');
    console.log('- 10 productos');
    console.log('- 2 direcciones');
    console.log('- 5 asignaciones de roles');
    console.log('- 1 perfil de repartidor');
    console.log('- 2 pedidos');
    console.log('- 5 items de pedido');
    console.log('- 2 pagos');

    console.log('\n👥 Usuarios de prueba creados:');
    console.log('- Admin (admin@delixmi.com) - Super Administrador');
    console.log('- Ana (ana.garcia@pizzeria.com) - Owner del restaurante');
    console.log('- Carlos (carlos.rodriguez@pizzeria.com) - Gerente de sucursal');
    console.log('- Miguel (miguel.hernandez@repartidor.com) - Repartidor de plataforma');
    console.log('- Sofía (sofia.lopez@email.com) - Cliente');
    console.log('\n🔑 Contraseña para todos los usuarios: supersecret');

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