const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando proceso de seeding...');

  try {
    // ===== ELIMINACIÓN EN ORDEN INVERSO =====
    console.log('🧹 Limpiando datos existentes...');
    
    await prisma.cartItemModifier.deleteMany({});
    console.log('✅ CartItemModifiers eliminados');
    
    await prisma.cartItem.deleteMany({});
    console.log('✅ CartItems eliminados');
    
    await prisma.cart.deleteMany({});
    console.log('✅ Carts eliminados');
    
    await prisma.productModifier.deleteMany({});
    console.log('✅ ProductModifiers eliminados');
    
    await prisma.modifierOption.deleteMany({});
    console.log('✅ ModifierOptions eliminados');
    
    await prisma.modifierGroup.deleteMany({});
    console.log('✅ ModifierGroups eliminados');
    
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

    const kenjiUser = await prisma.user.create({
      data: {
        name: 'Kenji',
        lastname: 'Tanaka',
        email: 'kenji.tanaka@sushi.com',
        phone: '6666666666',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });
    console.log('✅ Kenji usuario creado');

    // 5. CREAR RESTAURANTES
    console.log('🏪 Creando restaurantes...');
    const restaurant = await prisma.restaurant.create({
      data: {
        ownerId: anaUser.id, // Ana García
        name: 'Pizzería de Ana',
        category: 'Pizzas',
        description: 'Las mejores pizzas artesanales de la región, con ingredientes frescos y locales.',
        logoUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=400&fit=crop',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=1200&h=400&fit=crop',
        commissionRate: 12.50,
        status: 'active'
      }
    });
    console.log('✅ Restaurante Pizzería creado');

    const sushiRestaurant = await prisma.restaurant.create({
      data: {
        ownerId: kenjiUser.id, // Kenji Tanaka
        name: 'Sushi Master Kenji',
        category: 'Sushi',
        description: 'Auténtico sushi japonés preparado por maestros sushiman con ingredientes frescos importados de Japón.',
        logoUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400&h=400&fit=crop',
        coverPhotoUrl: 'https://images.unsplash.com/photo-1579027989536-b7b1f875659b?w=1200&h=400&fit=crop',
        commissionRate: 15.00,
        status: 'active'
      }
    });
    console.log('✅ Restaurante Sushi creado');

    // 6. CREAR SUCURSALES (4 sucursales: 3 pizza + 1 sushi)
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
        deliveryFee: 20.00,
        estimatedDeliveryMin: 25,
        estimatedDeliveryMax: 35,
        deliveryRadius: 5.0,
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
        deliveryFee: 0.00, // Envío gratis - sucursal 24 horas
        estimatedDeliveryMin: 20,
        estimatedDeliveryMax: 30,
        deliveryRadius: 7.0,
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
        deliveryFee: 30.00, // Repartidores propios
        estimatedDeliveryMin: 30,
        estimatedDeliveryMax: 45,
        deliveryRadius: 3.0,
        status: 'active'
      }
    });
    console.log('✅ Sucursal El Fitzhi creada');

    const sushiBranch = await prisma.branch.create({
      data: {
        restaurantId: sushiRestaurant.id,
        name: 'Sucursal Principal Sushi',
        address: 'Av. Juárez 85, Centro, Ixmiquilpan, Hgo.',
        latitude: 20.486789,
        longitude: -99.212345,
        phone: '7714567890',
        usesPlatformDrivers: true,
        deliveryFee: 25.00,
        estimatedDeliveryMin: 30,
        estimatedDeliveryMax: 40,
        deliveryRadius: 6.0,
        status: 'active'
      }
    });
    console.log('✅ Sucursal Sushi creada');

    // 6.1. CREAR HORARIOS DE SUCURSALES
    console.log('⏰ Creando horarios de sucursales...');
    
    // Horarios para Sucursal Centro (branchId: centroBranch.id) - 24 horas
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: centroBranch.id, dayOfWeek: 0, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Domingo
        { branchId: centroBranch.id, dayOfWeek: 1, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Lunes
        { branchId: centroBranch.id, dayOfWeek: 2, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Martes
        { branchId: centroBranch.id, dayOfWeek: 3, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Miércoles
        { branchId: centroBranch.id, dayOfWeek: 4, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Jueves
        { branchId: centroBranch.id, dayOfWeek: 5, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Viernes
        { branchId: centroBranch.id, dayOfWeek: 6, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }  // Sábado
      ]
    });
    console.log('✅ Horarios Sucursal Centro creados (24 horas)');

    // Horarios para Sucursal Río (branchId: rioBranch.id) - 24 horas
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: rioBranch.id, dayOfWeek: 1, openingTime: '00:00:00', closingTime: '23:59:59' }, // Lunes
        { branchId: rioBranch.id, dayOfWeek: 2, openingTime: '00:00:00', closingTime: '23:59:59' }, // Martes
        { branchId: rioBranch.id, dayOfWeek: 3, openingTime: '00:00:00', closingTime: '23:59:59' }, // Miércoles
        { branchId: rioBranch.id, dayOfWeek: 4, openingTime: '00:00:00', closingTime: '23:59:59' }, // Jueves
        { branchId: rioBranch.id, dayOfWeek: 5, openingTime: '00:00:00', closingTime: '23:59:59' }, // Viernes
        { branchId: rioBranch.id, dayOfWeek: 6, openingTime: '00:00:00', closingTime: '23:59:59' }, // Sábado
        { branchId: rioBranch.id, dayOfWeek: 0, openingTime: '00:00:00', closingTime: '23:59:59' }  // Domingo
      ]
    });
    console.log('✅ Horarios Sucursal Río creados (24 horas)');

    // Horarios para Sucursal El Fitzhi (branchId: fitzhiBranch.id) - 24 horas
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: fitzhiBranch.id, dayOfWeek: 1, openingTime: '00:00:00', closingTime: '23:59:59' }, // Lunes
        { branchId: fitzhiBranch.id, dayOfWeek: 2, openingTime: '00:00:00', closingTime: '23:59:59' }, // Martes
        { branchId: fitzhiBranch.id, dayOfWeek: 3, openingTime: '00:00:00', closingTime: '23:59:59' }, // Miércoles
        { branchId: fitzhiBranch.id, dayOfWeek: 4, openingTime: '00:00:00', closingTime: '23:59:59' }, // Jueves
        { branchId: fitzhiBranch.id, dayOfWeek: 5, openingTime: '00:00:00', closingTime: '23:59:59' }, // Viernes
        { branchId: fitzhiBranch.id, dayOfWeek: 6, openingTime: '00:00:00', closingTime: '23:59:59' }, // Sábado
        { branchId: fitzhiBranch.id, dayOfWeek: 0, openingTime: '00:00:00', closingTime: '23:59:59' }  // Domingo
      ]
    });
    console.log('✅ Horarios Sucursal El Fitzhi creados (24 horas)');

    // Horarios para Sucursal Sushi (branchId: sushiBranch.id) - 24 horas
    await prisma.branchSchedule.createMany({
      data: [
        { branchId: sushiBranch.id, dayOfWeek: 0, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Domingo
        { branchId: sushiBranch.id, dayOfWeek: 1, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Lunes
        { branchId: sushiBranch.id, dayOfWeek: 2, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Martes
        { branchId: sushiBranch.id, dayOfWeek: 3, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Miércoles
        { branchId: sushiBranch.id, dayOfWeek: 4, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Jueves
        { branchId: sushiBranch.id, dayOfWeek: 5, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }, // Viernes
        { branchId: sushiBranch.id, dayOfWeek: 6, openingTime: '00:00:00', closingTime: '23:59:59', isClosed: false }  // Sábado
      ]
    });
    console.log('✅ Horarios Sucursal Sushi creados (24 horas)');

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
    const sushiCategory = await prisma.category.create({
      data: { name: 'Sushi' }
    });
    const bebidasJaponesasCategory = await prisma.category.create({
      data: { name: 'Bebidas Japonesas' }
    });
    console.log('✅ 6 categorías creadas');

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

    // Subcategorías para Sushi
    const nigiriSub = await prisma.subcategory.create({
      data: { restaurantId: sushiRestaurant.id, categoryId: sushiCategory.id, name: 'Nigiri', displayOrder: 10 }
    });
    const rollsSub = await prisma.subcategory.create({
      data: { restaurantId: sushiRestaurant.id, categoryId: sushiCategory.id, name: 'Rolls', displayOrder: 11 }
    });
    const sashimiSub = await prisma.subcategory.create({
      data: { restaurantId: sushiRestaurant.id, categoryId: sushiCategory.id, name: 'Sashimi', displayOrder: 12 }
    });
    const tempuraSub = await prisma.subcategory.create({
      data: { restaurantId: sushiRestaurant.id, categoryId: entradasCategory.id, name: 'Tempura', displayOrder: 13 }
    });
    const sakeSub = await prisma.subcategory.create({
      data: { restaurantId: sushiRestaurant.id, categoryId: bebidasJaponesasCategory.id, name: 'Sake', displayOrder: 14 }
    });
    console.log('✅ 14 subcategorías creadas');

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
        imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'pizza, jamon, pina'
      }
    });
    const pizzaPepperoni = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: tradicionalesSub.id,
        name: 'Pizza de Pepperoni',
        description: 'Generosa porción de pepperoni sobre nuestra salsa especial de la casa.',
        price: 145.50,
        imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'pizza, pepperoni'
      }
    });
    const pizzaMargherita = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: tradicionalesSub.id,
        name: 'Pizza Margherita',
        description: 'Pizza clásica con mozzarella fresca, tomate y albahaca.',
        price: 135.00,
        imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'pizza, vegetariana, mozzarella'
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
        imageUrl: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'pizza, gourmet, jamon, champinones, aceitunas'
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
        imageUrl: 'https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'pizza, vegetariana, champinones, pimientos, cebolla, aceitunas'
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
        imageUrl: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'bebida, refresco, cola'
      }
    });
    const sprite = await prisma.product.create({
      data: {
        restaurantId: restaurant.id,
        subcategoryId: refrescosSub.id,
        name: 'Sprite 600ml',
        description: 'Refresco de lima-limón bien frío.',
        price: 25.00,
        imageUrl: 'https://images.unsplash.com/photo-1625772452859-1c03d5bf1137?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'bebida, refresco, lima, limon'
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
        imageUrl: 'https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'bebida, agua, horchata, natural'
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
        imageUrl: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'aperitivo, cebolla, empanizado, frito'
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
        imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'postre, italiano, cafe, mascarpone, cacao'
      }
    });

    // Productos de Sushi
    const salmonNigiri = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: nigiriSub.id,
        name: 'Nigiri de Salmón',
        description: 'Fresco salmón sobre arroz sazonado con vinagre de arroz.',
        price: 85.00,
        imageUrl: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'sushi, salmon, nigiri, fresco'
      }
    });

    const tunaNigiri = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: nigiriSub.id,
        name: 'Nigiri de Atún',
        description: 'Atún fresco de primera calidad sobre arroz sazonado.',
        price: 95.00,
        imageUrl: 'https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'sushi, atun, nigiri, premium'
      }
    });

    const californiaRoll = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: rollsSub.id,
        name: 'California Roll',
        description: 'Roll clásico con cangrejo, aguacate y pepino, cubierto con hueva de pez volador.',
        price: 120.00,
        imageUrl: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'sushi, roll, cangrejo, aguacate, pepino'
      }
    });

    const dragonRoll = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: rollsSub.id,
        name: 'Dragon Roll',
        description: 'Roll con langostinos tempura y aguacate, cubierto con anguila y salsa teriyaki.',
        price: 150.00,
        imageUrl: 'https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'sushi, roll, langostino, tempura, aguacate, anguila'
      }
    });

    const salmonSashimi = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: sashimiSub.id,
        name: 'Sashimi de Salmón',
        description: '5 piezas de salmón fresco cortado en láminas finas.',
        price: 110.00,
        imageUrl: 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'sushi, sashimi, salmon, fresco, 5 piezas'
      }
    });

    const tempuraShrimp = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: tempuraSub.id,
        name: 'Tempura de Camarones',
        description: '6 camarones grandes empanizados con masa tempura crujiente.',
        price: 80.00,
        imageUrl: 'https://images.unsplash.com/photo-1599921829015-4e4094c0d5e2?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'tempura, camarones, frito, crujiente, 6 piezas'
      }
    });

    const sakePremium = await prisma.product.create({
      data: {
        restaurantId: sushiRestaurant.id,
        subcategoryId: sakeSub.id,
        name: 'Sake Premium 180ml',
        description: 'Sake japonés premium de alta calidad, perfecto para acompañar el sushi.',
        price: 180.00,
        imageUrl: 'https://images.unsplash.com/photo-1551095353-aab14e736426?w=500&h=500&fit=crop',
        isAvailable: true,
        tags: 'sake, alcohol, japones, premium, 180ml'
      }
    });

    console.log('✅ 17 productos creados (10 pizza + 7 sushi)');

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
    await prisma.userRoleAssignment.create({
      data: { userId: kenjiUser.id, roleId: ownerRole.id, restaurantId: sushiRestaurant.id }
    });
    console.log('✅ 6 asignaciones de roles creadas');

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

    // 16. CREAR GRUPOS DE MODIFICADORES
    console.log('🔧 Creando grupos de modificadores...');
    
    // Grupos para Pizzería de Ana
    const tamanoGroup = await prisma.modifierGroup.create({
      data: {
        name: 'Tamaño',
        restaurantId: restaurant.id,
        minSelection: 1,
        maxSelection: 1
      }
    });
    console.log('✅ Grupo Tamaño creado');

    const extrasGroup = await prisma.modifierGroup.create({
      data: {
        name: 'Extras',
        restaurantId: restaurant.id,
        minSelection: 0,
        maxSelection: 5
      }
    });
    console.log('✅ Grupo Extras creado');

    const sinIngredientesGroup = await prisma.modifierGroup.create({
      data: {
        name: 'Sin Ingredientes',
        restaurantId: restaurant.id,
        minSelection: 0,
        maxSelection: 3
      }
    });
    console.log('✅ Grupo Sin Ingredientes creado');

    // Grupos para Sushi Master Kenji
    const nivelPicanteGroup = await prisma.modifierGroup.create({
      data: {
        name: 'Nivel de Picante',
        restaurantId: sushiRestaurant.id,
        minSelection: 1,
        maxSelection: 1
      }
    });
    console.log('✅ Grupo Nivel de Picante creado');

    const extrasSushiGroup = await prisma.modifierGroup.create({
      data: {
        name: 'Extras Sushi',
        restaurantId: sushiRestaurant.id,
        minSelection: 0,
        maxSelection: 3
      }
    });
    console.log('✅ Grupo Extras Sushi creado');

    // 17. CREAR OPCIONES DE MODIFICADORES
    console.log('⚙️ Creando opciones de modificadores...');
    
    // Opciones para Tamaño (Pizzería)
    await prisma.modifierOption.createMany({
      data: [
        { name: 'Personal (6 pulgadas)', price: 0.00, modifierGroupId: tamanoGroup.id },
        { name: 'Mediana (10 pulgadas)', price: 25.00, modifierGroupId: tamanoGroup.id },
        { name: 'Grande (12 pulgadas)', price: 45.00, modifierGroupId: tamanoGroup.id },
        { name: 'Familiar (16 pulgadas)', price: 70.00, modifierGroupId: tamanoGroup.id }
      ]
    });
    console.log('✅ Opciones de Tamaño creadas');

    // Opciones para Extras (Pizzería)
    await prisma.modifierOption.createMany({
      data: [
        { name: 'Extra Queso', price: 15.00, modifierGroupId: extrasGroup.id },
        { name: 'Extra Pepperoni', price: 20.00, modifierGroupId: extrasGroup.id },
        { name: 'Extra Champiñones', price: 12.00, modifierGroupId: extrasGroup.id },
        { name: 'Extra Aceitunas', price: 10.00, modifierGroupId: extrasGroup.id },
        { name: 'Extra Jalapeños', price: 8.00, modifierGroupId: extrasGroup.id },
        { name: 'Extra Cebolla', price: 8.00, modifierGroupId: extrasGroup.id }
      ]
    });
    console.log('✅ Opciones de Extras creadas');

    // Opciones para Sin Ingredientes (Pizzería)
    await prisma.modifierOption.createMany({
      data: [
        { name: 'Sin Cebolla', price: 0.00, modifierGroupId: sinIngredientesGroup.id },
        { name: 'Sin Aceitunas', price: 0.00, modifierGroupId: sinIngredientesGroup.id },
        { name: 'Sin Jalapeños', price: 0.00, modifierGroupId: sinIngredientesGroup.id },
        { name: 'Sin Champiñones', price: 0.00, modifierGroupId: sinIngredientesGroup.id },
        { name: 'Sin Queso', price: 0.00, modifierGroupId: sinIngredientesGroup.id }
      ]
    });
    console.log('✅ Opciones Sin Ingredientes creadas');

    // Opciones para Nivel de Picante (Sushi)
    await prisma.modifierOption.createMany({
      data: [
        { name: 'Sin Picante', price: 0.00, modifierGroupId: nivelPicanteGroup.id },
        { name: 'Poco Picante', price: 0.00, modifierGroupId: nivelPicanteGroup.id },
        { name: 'Picante Medio', price: 0.00, modifierGroupId: nivelPicanteGroup.id },
        { name: 'Muy Picante', price: 0.00, modifierGroupId: nivelPicanteGroup.id },
        { name: 'Extra Picante', price: 5.00, modifierGroupId: nivelPicanteGroup.id }
      ]
    });
    console.log('✅ Opciones Nivel de Picante creadas');

    // Opciones para Extras Sushi
    await prisma.modifierOption.createMany({
      data: [
        { name: 'Extra Wasabi', price: 8.00, modifierGroupId: extrasSushiGroup.id },
        { name: 'Extra Jengibre', price: 5.00, modifierGroupId: extrasSushiGroup.id },
        { name: 'Salsa Teriyaki Extra', price: 10.00, modifierGroupId: extrasSushiGroup.id },
        { name: 'Salsa de Soja Premium', price: 12.00, modifierGroupId: extrasSushiGroup.id },
        { name: 'Aguacate Extra', price: 15.00, modifierGroupId: extrasSushiGroup.id }
      ]
    });
    console.log('✅ Opciones Extras Sushi creadas');

    // 18. CREAR ASOCIACIONES PRODUCTO-MODIFICADOR
    console.log('🔗 Creando asociaciones producto-modificador...');
    
    // Pizzas con grupos de modificadores
    await prisma.productModifier.createMany({
      data: [
        // Pizza Hawaiana
        { productId: pizzaHawaiana.id, modifierGroupId: tamanoGroup.id },
        { productId: pizzaHawaiana.id, modifierGroupId: extrasGroup.id },
        { productId: pizzaHawaiana.id, modifierGroupId: sinIngredientesGroup.id },
        
        // Pizza Pepperoni
        { productId: pizzaPepperoni.id, modifierGroupId: tamanoGroup.id },
        { productId: pizzaPepperoni.id, modifierGroupId: extrasGroup.id },
        { productId: pizzaPepperoni.id, modifierGroupId: sinIngredientesGroup.id },
        
        // Pizza Margherita
        { productId: pizzaMargherita.id, modifierGroupId: tamanoGroup.id },
        { productId: pizzaMargherita.id, modifierGroupId: extrasGroup.id },
        { productId: pizzaMargherita.id, modifierGroupId: sinIngredientesGroup.id },
        
        // Pizza Quattro Stagioni
        { productId: pizzaQuattro.id, modifierGroupId: tamanoGroup.id },
        { productId: pizzaQuattro.id, modifierGroupId: extrasGroup.id },
        { productId: pizzaQuattro.id, modifierGroupId: sinIngredientesGroup.id },
        
        // Pizza Vegetariana
        { productId: pizzaVegetariana.id, modifierGroupId: tamanoGroup.id },
        { productId: pizzaVegetariana.id, modifierGroupId: extrasGroup.id },
        { productId: pizzaVegetariana.id, modifierGroupId: sinIngredientesGroup.id }
      ]
    });
    console.log('✅ Asociaciones Pizzas-Modificadores creadas');

    // Sushi con grupos de modificadores
    await prisma.productModifier.createMany({
      data: [
        // Nigiri de Salmón
        { productId: salmonNigiri.id, modifierGroupId: nivelPicanteGroup.id },
        { productId: salmonNigiri.id, modifierGroupId: extrasSushiGroup.id },
        
        // Nigiri de Atún
        { productId: tunaNigiri.id, modifierGroupId: nivelPicanteGroup.id },
        { productId: tunaNigiri.id, modifierGroupId: extrasSushiGroup.id },
        
        // California Roll
        { productId: californiaRoll.id, modifierGroupId: nivelPicanteGroup.id },
        { productId: californiaRoll.id, modifierGroupId: extrasSushiGroup.id },
        
        // Dragon Roll
        { productId: dragonRoll.id, modifierGroupId: nivelPicanteGroup.id },
        { productId: dragonRoll.id, modifierGroupId: extrasSushiGroup.id },
        
        // Sashimi de Salmón
        { productId: salmonSashimi.id, modifierGroupId: nivelPicanteGroup.id },
        { productId: salmonSashimi.id, modifierGroupId: extrasSushiGroup.id }
      ]
    });
    console.log('✅ Asociaciones Sushi-Modificadores creadas');

    // 19. CREAR CARRITOS DE EJEMPLO CON MODIFICADORES
    console.log('🛒 Creando carritos de ejemplo...');
    
    // Crear carrito para Sofía (cliente) en Pizzería de Ana
    const cart1 = await prisma.cart.create({
      data: {
        userId: sofiaUser.id,
        restaurantId: restaurant.id
      }
    });
    console.log('✅ Carrito 1 creado');

    // Crear carrito para Sofía en Sushi Master Kenji
    const cart2 = await prisma.cart.create({
      data: {
        userId: sofiaUser.id,
        restaurantId: sushiRestaurant.id
      }
    });
    console.log('✅ Carrito 2 creado');

    // Obtener algunos modificadores para usar en los ejemplos
    const extraQuesoOption = await prisma.modifierOption.findFirst({
      where: { name: 'Extra Queso' }
    });
    const orillaRellenaOption = await prisma.modifierOption.findFirst({
      where: { name: 'Extra Queso' } // Usaremos este como ejemplo de orilla rellena
    });
    const grandeOption = await prisma.modifierOption.findFirst({
      where: { name: 'Grande (12 pulgadas)' }
    });
    const sinCebollaOption = await prisma.modifierOption.findFirst({
      where: { name: 'Sin Cebolla' }
    });
    const pocoPicanteOption = await prisma.modifierOption.findFirst({
      where: { name: 'Poco Picante' }
    });
    const extraWasabiOption = await prisma.modifierOption.findFirst({
      where: { name: 'Extra Wasabi' }
    });

    // Crear items del carrito con modificadores
    // Pizza Hawaiana con modificadores
    const cartItem1 = await prisma.cartItem.create({
      data: {
        cartId: cart1.id,
        productId: pizzaHawaiana.id,
        quantity: 1,
        priceAtAdd: 150.00 + 15.00 + 45.00 + 0.00 // precio base + extra queso + grande + sin cebolla
      }
    });

    // Agregar modificadores al item
    await prisma.cartItemModifier.createMany({
      data: [
        { cartItemId: cartItem1.id, modifierOptionId: extraQuesoOption.id },
        { cartItemId: cartItem1.id, modifierOptionId: grandeOption.id },
        { cartItemId: cartItem1.id, modifierOptionId: sinCebollaOption.id }
      ]
    });

    // Pizza Margherita sin modificadores
    await prisma.cartItem.create({
      data: {
        cartId: cart1.id,
        productId: pizzaMargherita.id,
        quantity: 2,
        priceAtAdd: 135.00
      }
    });

    // Nigiri de Salmón con modificadores
    const cartItem3 = await prisma.cartItem.create({
      data: {
        cartId: cart2.id,
        productId: salmonNigiri.id,
        quantity: 1,
        priceAtAdd: 85.00 + 0.00 + 8.00 // precio base + poco picante + extra wasabi
      }
    });

    // Agregar modificadores al item de sushi
    await prisma.cartItemModifier.createMany({
      data: [
        { cartItemId: cartItem3.id, modifierOptionId: pocoPicanteOption.id },
        { cartItemId: cartItem3.id, modifierOptionId: extraWasabiOption.id }
      ]
    });

    console.log('✅ Items del carrito con modificadores creados');

    console.log('🎉 ¡Seeding completado exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log('- 10 roles');
    console.log('- 19 permisos');
    console.log('- 6 usuarios');
    console.log('- 2 restaurantes (Pizzería + Sushi)');
    console.log('- 4 sucursales');
    console.log('- 28 horarios de sucursales (7 días × 4 sucursales - 24 horas)');
    console.log('- 6 categorías');
    console.log('- 14 subcategorías');
    console.log('- 17 productos (10 pizza + 7 sushi)');
    console.log('- 2 direcciones');
    console.log('- 6 asignaciones de roles');
    console.log('- 1 perfil de repartidor');
    console.log('- 2 pedidos');
    console.log('- 5 items de pedido');
    console.log('- 2 pagos');
    console.log('- 5 grupos de modificadores');
    console.log('- 25 opciones de modificadores');
    console.log('- 20 asociaciones producto-modificador');
    console.log('- 2 carritos de ejemplo');
    console.log('- 3 items de carrito (2 con modificadores, 1 sin)');
    console.log('- 5 modificadores aplicados a items del carrito');

    console.log('\n👥 Usuarios de prueba creados:');
    console.log('- Admin (admin@delixmi.com) - Super Administrador');
    console.log('- Ana (ana.garcia@pizzeria.com) - Owner Pizzería de Ana');
    console.log('- Carlos (carlos.rodriguez@pizzeria.com) - Gerente de sucursal');
    console.log('- Kenji (kenji.tanaka@sushi.com) - Owner Sushi Master Kenji');
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