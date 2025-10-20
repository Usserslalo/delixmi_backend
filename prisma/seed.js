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
    
    await prisma.orderItemModifier.deleteMany({});
    console.log('✅ OrderItemModifiers eliminados');
    
    await prisma.orderItem.deleteMany({});
    console.log('✅ OrderItems eliminados');
    
    await prisma.payment.deleteMany({});
    console.log('✅ Payments eliminados');
    
    await prisma.order.deleteMany({});
    console.log('✅ Orders eliminados');
    
    // Eliminar transacciones de wallet antes de las wallets
    await prisma.driverWalletTransaction.deleteMany({});
    console.log('✅ DriverWalletTransactions eliminados');
    
    await prisma.restaurantWalletTransaction.deleteMany({});
    console.log('✅ RestaurantWalletTransactions eliminados');
    
    await prisma.driverWallet.deleteMany({});
    console.log('✅ DriverWallets eliminados');
    
    await prisma.restaurantWallet.deleteMany({});
    console.log('✅ RestaurantWallets eliminados');
    
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
        phone: '+52 771 123 4567',
        email: 'contacto@pizzeriadeana.com',
        address: 'Av. Felipe Ángeles 15, San Nicolás, Ixmiquilpan, Hgo.',
        latitude: 20.489000,
        longitude: -99.230000,
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
        phone: '+52 771 456 7890',
        email: 'contacto@sushimasterkenji.com',
        address: 'Av. Juárez 85, Centro, Ixmiquilpan, Hgo.',
        latitude: 20.486789,
        longitude: -99.212345,
        commissionRate: 15.00,
        status: 'active'
      }
    });
    console.log('✅ Restaurante Sushi creado');

    // Crear billeteras para restaurantes
    await prisma.restaurantWallet.create({
      data: { restaurantId: restaurant.id }
    });
    console.log('✅ Billetera de Pizzería creada');

    await prisma.restaurantWallet.create({
      data: { restaurantId: sushiRestaurant.id }
    });
    console.log('✅ Billetera de Sushi creada');

    // 5.1. CREAR/OBTENER SUCURSALES PRINCIPALES
    console.log('🏢 Creando sucursales principales para restaurantes...');
    
    // Sucursal principal para Pizzería de Ana
    const anaPrimaryBranch = await prisma.branch.create({
      data: {
        restaurantId: restaurant.id,
        name: restaurant.name || 'Principal',
        address: restaurant.address || 'Av. Felipe Ángeles 15, San Nicolás, Ixmiquilpan, Hgo.',
        latitude: 20.489000,
        longitude: -99.230000,
        status: 'active',
        deliveryFee: 25.00,
        estimatedDeliveryMin: 30,
        estimatedDeliveryMax: 45,
        deliveryRadius: 5.0,
        usesPlatformDrivers: true
      }
    });
    console.log(`✅ Sucursal Principal creada para Pizzería con ID: ${anaPrimaryBranch.id}`);

    // Sucursal principal para Sushi Master Kenji
    const kenjiPrimaryBranch = await prisma.branch.create({
      data: {
        restaurantId: sushiRestaurant.id,
        name: sushiRestaurant.name || 'Principal Sushi',
        address: sushiRestaurant.address || 'Av. Juárez 85, Centro, Ixmiquilpan, Hgo.',
        latitude: 20.486789,
        longitude: -99.212345,
        status: 'active',
        deliveryFee: 30.00,
        estimatedDeliveryMin: 25,
        estimatedDeliveryMax: 40,
        deliveryRadius: 4.5,
        usesPlatformDrivers: true
      }
    });
    console.log(`✅ Sucursal Principal creada para Sushi con ID: ${kenjiPrimaryBranch.id}`);

    // 6. CREAR CATEGORÍAS
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

    // 7. CREAR SUBCATEGORÍAS
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

    // 8. CREAR PRODUCTOS
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

    // 9. CREAR DIRECCIONES
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

    // 10. CREAR ASIGNACIONES DE ROLES DE USUARIO
    console.log('👤 Creando asignaciones de roles...');
    
    await prisma.userRoleAssignment.create({
      data: { userId: adminUser.id, roleId: superAdminRole.id }
    });
    await prisma.userRoleAssignment.create({
      data: { userId: anaUser.id, roleId: ownerRole.id, restaurantId: restaurant.id }
    });
    await prisma.userRoleAssignment.create({
      data: { userId: carlosUser.id, roleId: branchManagerRole.id, restaurantId: restaurant.id }
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

    // 11. CREAR PERFILES DE REPARTIDOR
    console.log('🚗 Creando perfiles de repartidor...');
    
    await prisma.driverProfile.create({
      data: {
        userId: miguelUser.id,
        vehicleType: 'motorcycle',
        licensePlate: 'HGO-ABC-123',
        status: 'online',
        currentLatitude: 20.489500,
        currentLongitude: -99.232000,
        lastSeenAt: new Date(),
        kycStatus: 'approved'
      }
    });
    console.log('✅ Perfil de repartidor creado');

    // Crear billetera del repartidor
    await prisma.driverWallet.create({
      data: { driverId: miguelUser.id }
    });
    console.log('✅ Billetera del repartidor creada');


    // 12. CREAR GRUPOS DE MODIFICADORES
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

    // 13. CREAR OPCIONES DE MODIFICADORES
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

    // 14. CREAR ASOCIACIONES PRODUCTO-MODIFICADOR
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

    // 15. CREAR CARRITOS DE EJEMPLO CON MODIFICADORES
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

    // 16. CREAR PEDIDOS DE EJEMPLO
    console.log('📦 Creando pedidos de ejemplo...');
    
    // Pedido 1: Sofía hace un pedido en Pizzería de Ana
    const order1 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: anaPrimaryBranch.id,
        addressId: casaAddress.id,
        status: 'confirmed',
        subtotal: 480.00, // Pizza Hawaiana (150 + 15 + 45) + 2x Margherita (135 x 2) = 210 + 270 = 480
        deliveryFee: anaPrimaryBranch.deliveryFee, // 25.00
        total: 505.00, // 480 + 25
        commissionRateSnapshot: restaurant.commissionRate, // 12.50
        platformFee: 60.00, // (480 * 12.50 / 100)
        restaurantPayout: 420.00, // 480 - 60
        paymentMethod: 'card',
        paymentStatus: 'completed',
        specialInstructions: 'Entregar en la puerta principal, tocar timbre',
        orderPlacedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 horas atrás
      }
    });
    console.log(`✅ Pedido 1 creado con ID: ${order1.id}`);

    // Pedido 2: Sofía hace un pedido en Sushi Master Kenji
    const order2 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: kenjiPrimaryBranch.id,
        addressId: oficinaAddress.id,
        status: 'preparing',
        subtotal: 93.00, // Nigiri de Salmón (85 + 0 + 8) = 93
        deliveryFee: kenjiPrimaryBranch.deliveryFee, // 30.00
        total: 123.00,
        commissionRateSnapshot: sushiRestaurant.commissionRate, // 15.00
        platformFee: 13.95, // (93 * 15 / 100)
        restaurantPayout: 79.05, // 93 - 13.95
        paymentMethod: 'cash',
        paymentStatus: 'pending',
        specialInstructions: 'Llamar al llegar a la oficina',
        orderPlacedAt: new Date(Date.now() - 30 * 60 * 1000) // 30 minutos atrás
      }
    });
    console.log(`✅ Pedido 2 creado con ID: ${order2.id}`);

    // 17. CREAR ITEMS DE LOS PEDIDOS
    console.log('🛍️ Creando items de los pedidos...');
    
    // Items para Order 1 (Pizzería)
    const orderItem1PizzaHaw = await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productId: pizzaHawaiana.id,
        quantity: 1,
        pricePerUnit: 210.00 // 150 + 15 + 45 (base + extra queso + grande)
      }
    });
    console.log(`✅ OrderItem Pizza Hawaiana creado con ID: ${orderItem1PizzaHaw.id}`);

    const orderItem1PizzaMarg = await prisma.orderItem.create({
      data: {
        orderId: order1.id,
        productId: pizzaMargherita.id,
        quantity: 2,
        pricePerUnit: 135.00
      }
    });
    console.log(`✅ OrderItem Pizza Margherita creado con ID: ${orderItem1PizzaMarg.id}`);

    // Items para Order 2 (Sushi)
    const orderItem2Nigiri = await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        productId: salmonNigiri.id,
        quantity: 1,
        pricePerUnit: 93.00 // 85 + 0 + 8 (base + poco picante + extra wasabi)
      }
    });
    console.log(`✅ OrderItem Nigiri de Salmón creado con ID: ${orderItem2Nigiri.id}`);

    // 18. CREAR MODIFICADORES DE ITEMS DE PEDIDO
    console.log('⚙️ Creando modificadores de items de pedido...');
    
    // Modificadores para Pizza Hawaiana en Order 1
    await prisma.orderItemModifier.createMany({
      data: [
        { orderItemId: orderItem1PizzaHaw.id, modifierOptionId: grandeOption.id },
        { orderItemId: orderItem1PizzaHaw.id, modifierOptionId: extraQuesoOption.id },
        { orderItemId: orderItem1PizzaHaw.id, modifierOptionId: sinCebollaOption.id }
      ]
    });
    console.log('✅ Modificadores para Pizza Hawaiana creados');

    // Modificadores para Nigiri de Salmón en Order 2
    await prisma.orderItemModifier.createMany({
      data: [
        { orderItemId: orderItem2Nigiri.id, modifierOptionId: pocoPicanteOption.id },
        { orderItemId: orderItem2Nigiri.id, modifierOptionId: extraWasabiOption.id }
      ]
    });
    console.log('✅ Modificadores para Nigiri de Salmón creados');

    // 19. CREAR PAGOS PARA LOS PEDIDOS
    console.log('💳 Creando pagos para los pedidos...');
    
    // Pago para Order 1 (Pizzería) - Completado
    await prisma.payment.create({
      data: {
        orderId: order1.id,
        amount: 505.00, // Total del order1
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: 'MP-123456789-PIZZA',
        status: 'completed'
      }
    });
    console.log('✅ Pago para Order 1 creado (completado)');

    // Pago para Order 2 (Sushi) - Pendiente (efectivo)
    await prisma.payment.create({
      data: {
        orderId: order2.id,
        amount: order2.total,
        currency: 'MXN',
        provider: 'cash',
        providerPaymentId: null,
        status: 'pending'
      }
    });
    console.log('✅ Pago para Order 2 creado (pendiente - efectivo)');

    // 20. CREAR REPARTIDORES ADICIONALES PARA PRUEBAS
    console.log('🚗 Creando repartidores adicionales...');
    
    // Crear más usuarios repartidores
    const carlosDriverUser = await prisma.user.create({
      data: {
        name: 'Carlos',
        lastname: 'Pérez',
        email: 'carlos.perez@driver.com',
        phone: '7777777777',
        password: hashedPassword,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        status: 'active'
      }
    });

    await prisma.userRoleAssignment.create({
      data: { userId: carlosDriverUser.id, roleId: driverPlatformRole.id }
    });

    await prisma.driverProfile.create({
      data: {
        userId: carlosDriverUser.id,
        vehicleType: 'car',
        licensePlate: 'HGO-XYZ-789',
        status: 'online',
        currentLatitude: 20.490000,
        currentLongitude: -99.235000,
        lastSeenAt: new Date(),
        kycStatus: 'approved'
      }
    });

    console.log('✅ Repartidor adicional Carlos Pérez creado');

    // 21. CREAR PEDIDOS EN DIFERENTES ESTADOS PARA PRUEBAS COMPLETAS
    console.log('📦 Creando pedidos adicionales en diferentes estados...');
    
    // Pedido 3: PENDING - Pedido recién creado
    const order3 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: anaPrimaryBranch.id,
        addressId: casaAddress.id,
        status: 'pending',
        subtotal: 145.50,
        deliveryFee: 25.00,
        total: 170.50,
        commissionRateSnapshot: restaurant.commissionRate,
        platformFee: 18.19,
        restaurantPayout: 127.31,
        paymentMethod: 'card',
        paymentStatus: 'processing',
        specialInstructions: 'Pedido urgente para prueba',
        orderPlacedAt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutos atrás
      }
    });

    // Items para Order 3
    await prisma.orderItem.create({
      data: {
        orderId: order3.id,
        productId: pizzaPepperoni.id,
        quantity: 1,
        pricePerUnit: 145.50
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order3.id,
        amount: 170.50,
        currency: 'MXN',
        provider: 'stripe',
        providerPaymentId: 'STR-987654321',
        status: 'processing'
      }
    });

    console.log(`✅ Pedido 3 (PENDING) creado con ID: ${order3.id}`);

    // Pedido 4: PLACED - Pedido confirmado pero no iniciado
    const order4 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: anaPrimaryBranch.id,
        addressId: oficinaAddress.id,
        status: 'placed',
        subtotal: 270.00,
        deliveryFee: 25.00,
        total: 295.00,
        commissionRateSnapshot: restaurant.commissionRate,
        platformFee: 33.75,
        restaurantPayout: 236.25,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        specialInstructions: 'Para prueba de estado placed',
        orderPlacedAt: new Date(Date.now() - 20 * 60 * 1000) // 20 minutos atrás
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order4.id,
        productId: pizzaMargherita.id,
        quantity: 2,
        pricePerUnit: 135.00
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order4.id,
        amount: 295.00,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: 'MP-111222333-PLACED',
        status: 'completed'
      }
    });

    console.log(`✅ Pedido 4 (PLACED) creado con ID: ${order4.id}`);

    // Pedido 5: READY_FOR_PICKUP - Listo para que lo acepte un repartidor
    const order5 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: anaPrimaryBranch.id,
        addressId: casaAddress.id,
        status: 'ready_for_pickup',
        subtotal: 180.00,
        deliveryFee: 25.00,
        total: 205.00,
        commissionRateSnapshot: restaurant.commissionRate,
        platformFee: 22.50,
        restaurantPayout: 157.50,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        specialInstructions: '¡Perfecto para probar acceptOrder!',
        orderPlacedAt: new Date(Date.now() - 45 * 60 * 1000) // 45 minutos atrás
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order5.id,
        productId: pizzaQuattro.id,
        quantity: 1,
        pricePerUnit: 180.00
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order5.id,
        amount: 205.00,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: 'MP-444555666-READY',
        status: 'completed'
      }
    });

    console.log(`✅ Pedido 5 (READY_FOR_PICKUP) creado con ID: ${order5.id}`);

    // Pedido 6: OUT_FOR_DELIVERY - Aceptado por repartidor
    const order6 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: anaPrimaryBranch.id,
        addressId: casaAddress.id,
        deliveryDriverId: miguelUser.id, // Ya está asignado
        status: 'out_for_delivery',
        subtotal: 160.00,
        deliveryFee: 25.00,
        total: 185.00,
        commissionRateSnapshot: restaurant.commissionRate,
        platformFee: 20.00,
        restaurantPayout: 140.00,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        specialInstructions: 'Pedido en entrega para pruebas',
        orderPlacedAt: new Date(Date.now() - 60 * 60 * 1000) // 1 hora atrás
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order6.id,
        productId: pizzaVegetariana.id,
        quantity: 1,
        pricePerUnit: 160.00
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order6.id,
        amount: 185.00,
        currency: 'MXN',
        provider: 'cash',
        providerPaymentId: null,
        status: 'completed'
      }
    });

    console.log(`✅ Pedido 6 (OUT_FOR_DELIVERY) creado con ID: ${order6.id}`);

    // Pedido 7: DELIVERED - Pedido completado
    const order7 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: anaPrimaryBranch.id,
        addressId: casaAddress.id,
        deliveryDriverId: miguelUser.id,
        status: 'delivered',
        subtotal: 350.00,
        deliveryFee: 25.00,
        total: 375.00,
        commissionRateSnapshot: restaurant.commissionRate,
        platformFee: 43.75,
        restaurantPayout: 306.25,
        paymentMethod: 'card',
        paymentStatus: 'completed',
        specialInstructions: 'Pedido entregado exitosamente',
        orderPlacedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 horas atrás
        orderDeliveredAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000) // 2.5 horas atrás
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order7.id,
        productId: pizzaHawaiana.id,
        quantity: 1,
        pricePerUnit: 210.00
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order7.id,
        productId: pizzaPepperoni.id,
        quantity: 1,
        pricePerUnit: 145.50
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order7.id,
        amount: 375.00,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: 'MP-777888999-DELIVERED',
        status: 'completed'
      }
    });

    console.log(`✅ Pedido 7 (DELIVERED) creado con ID: ${order7.id}`);

    // Pedido 8: CANCELLED - Pedido cancelado
    const order8 = await prisma.order.create({
      data: {
        customerId: sofiaUser.id,
        branchId: kenjiPrimaryBranch.id,
        addressId: oficinaAddress.id,
        status: 'cancelled',
        subtotal: 95.00,
        deliveryFee: 30.00,
        total: 125.00,
        commissionRateSnapshot: sushiRestaurant.commissionRate,
        platformFee: 14.25,
        restaurantPayout: 80.75,
        paymentMethod: 'card',
        paymentStatus: 'refunded',
        specialInstructions: 'Pedido cancelado por el cliente',
        orderPlacedAt: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 horas atrás
      }
    });

    await prisma.orderItem.create({
      data: {
        orderId: order8.id,
        productId: tunaNigiri.id,
        quantity: 1,
        pricePerUnit: 95.00
      }
    });

    await prisma.payment.create({
      data: {
        orderId: order8.id,
        amount: 125.00,
        currency: 'MXN',
        provider: 'mercadopago',
        providerPaymentId: 'MP-000111222-CANCELLED',
        status: 'refunded'
      }
    });

    console.log(`✅ Pedido 8 (CANCELLED) creado con ID: ${order8.id}`);

    console.log('🎉 ¡Seeding completado exitosamente!');
    console.log('\n📊 Resumen de datos creados:');
    console.log('- 10 roles');
    console.log('- 19 permisos');
    console.log('- 7 usuarios (incluye repartidor adicional)');
    console.log('- 2 restaurantes (Pizzería + Sushi)');
    console.log('- 2 sucursales principales (una por restaurante)');
    console.log('- 6 categorías');
    console.log('- 14 subcategorías');
    console.log('- 17 productos (10 pizza + 7 sushi)');
    console.log('- 2 direcciones (cliente Sofía)');
    console.log('- 7 asignaciones de roles');
    console.log('- 2 perfiles de repartidor (Miguel + Carlos)');
    console.log('- 5 grupos de modificadores');
    console.log('- 25 opciones de modificadores');
    console.log('- 20 asociaciones producto-modificador');
    console.log('- 2 carritos de ejemplo');
    console.log('- 3 items de carrito (2 con modificadores, 1 sin)');
    console.log('- 5 modificadores aplicados a items del carrito');
    console.log('- 8 pedidos de ejemplo (en todos los estados posibles)');
    console.log('- 10 items de pedido (con modificadores incluidos)');
    console.log('- 5 modificadores aplicados a items de pedido');
    console.log('- 8 pagos (diferentes estados y proveedores)');

    console.log('\n👥 Usuarios de prueba creados:');
    console.log('- Admin (admin@delixmi.com) - Super Administrador');
    console.log('- Ana (ana.garcia@pizzeria.com) - Owner Pizzería de Ana');
    console.log('- Carlos (carlos.rodriguez@pizzeria.com) - Gerente de sucursal');
    console.log('- Kenji (kenji.tanaka@sushi.com) - Owner Sushi Master Kenji');
    console.log('- Miguel (miguel.hernandez@repartidor.com) - Repartidor de plataforma');
    console.log('- Carlos Pérez (carlos.perez@driver.com) - Repartidor adicional');
    console.log('- Sofía (sofia.lopez@email.com) - Cliente');
    
    console.log('\n📍 Ubicaciones actualizadas:');
    console.log('- Restaurante Pizzería de Ana: Cerca del cliente Sofía');
    console.log('- Repartidor Miguel: Posicionado cerca del restaurante');
    console.log('- Repartidor Carlos: Posicionado cerca del restaurante');
    
    console.log('\n📦 Estados de pedidos creados:');
    console.log('- PENDING: Pedido recién creado (#3)');
    console.log('- PLACED: Pedido confirmado (#4)');
    console.log('- CONFIRMED: Pedido original (#1)');
    console.log('- PREPARING: Pedido en preparación (#2)');
    console.log('- READY_FOR_PICKUP: Listo para aceptar (#5) ¡PERFECTO PARA PRUEBAS!');
    console.log('- OUT_FOR_DELIVERY: En camino (#6)');
    console.log('- DELIVERED: Entregado (#7)');
    console.log('- CANCELLED: Cancelado (#8)');
    
    console.log('\n🔑 Contraseña para todos los usuarios: supersecret');
    
    console.log('\n🧪 Para pruebas específicas:');
    console.log('- Owner: Usa ana.garcia@pizzeria.com para gestionar pedidos');
    console.log('- Driver: Usa miguel.hernandez@repartidor.com para aceptar pedidos');
    console.log('- Customer: Usa sofia.lopez@email.com para ver pedidos');
    console.log('- READY_FOR_PICKUP (Pedido #5): Perfecto para probar acceptOrder');

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