const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { Decimal } = require('@prisma/client/runtime/library');

const prisma = new PrismaClient();
const now = new Date();
const hashedPassword = bcrypt.hashSync('supersecret', 10);

// Función de ayuda para calcular los montos fiscales
const calcPayouts = (subtotal, commissionRate, driverFeeGross = 40.00) => {
    const subtotalDecimal = new Decimal(subtotal);
    const commissionRateDecimal = new Decimal(commissionRate);
    const driverFeeGrossDecimal = new Decimal(driverFeeGross);

    // --- Montos para Restaurante (Cálculos de retención simplificados) ---
    const platformFee = subtotalDecimal.mul(commissionRateDecimal).div(100).toDecimalPlaces(2);
    const retainedIVA = platformFee.mul(0.10667).toDecimalPlaces(2); 
    const retainedISR = platformFee.mul(0.01).toDecimalPlaces(2); 
    const restaurantPayout = subtotalDecimal.sub(platformFee).add(retainedIVA).add(retainedISR).toDecimalPlaces(2);

    // --- Montos para Driver (Cálculos de retención simplificados) ---
    const driverRetainedIVA = driverFeeGrossDecimal.mul(0.02).toDecimalPlaces(2);
    const driverRetainedISR = driverFeeGrossDecimal.mul(0.02).toDecimalPlaces(2);
    const driverFeeNet = driverFeeGrossDecimal.sub(driverRetainedIVA).sub(driverRetainedISR).toDecimalPlaces(2);
    
    return { platformFee, retainedIVA, retainedISR, restaurantPayout, driverFeeGross: driverFeeGrossDecimal, driverRetainedIVA, driverRetainedISR, driverFeeNet };
};

// Función de ayuda para crear usuarios de manera segura (Patrón CreateMany + FindMany)
async function createUsersAndMap() {
    const baseUsersData = [
        { name: 'Admin', lastname: 'Delixmi', email: 'admin@delixmi.com', phone: '1234567890' },
        { name: 'Ana', lastname: 'García', email: 'ana.garcia@pizzeria.com', phone: '6666666666' },
        { name: 'Carlos', lastname: 'Rodriguez', email: 'carlos.rodriguez@pizzeria.com', phone: '7777777777' }, 
        { name: 'Miguel', lastname: 'Hernández', email: 'miguel.hernandez@repartidor.com', phone: '8888888888' }, 
        { name: 'Sofía', lastname: 'López', email: 'sofia.lopez@email.com', phone: '9999999999' }, 
        { name: 'Kenji', lastname: 'Tanaka', email: 'kenji.tanaka@sushi.com', phone: '0000000000' },
        { name: 'Owner_A', lastname: 'Carnitas', email: 'owner_a@ixmiquilpan.com', phone: '1111111111' }, 
        { name: 'Owner_B', lastname: 'Mexicano', email: 'owner_b@ixmiquilpan.com', phone: '2222222222' },
        { name: 'Owner_C', lastname: 'Candelabros', email: 'owner_c@ixmiquilpan.com', phone: '3333333333' },
        { name: 'Owner_D', lastname: 'Pueblito', email: 'owner_d@ixmiquilpan.com', phone: '4444444444' },
        { name: 'Owner_E', lastname: 'Cazadores', email: 'owner_e@ixmiquilpan.com', phone: '5555555555' },
        { name: 'Owner_F', lastname: 'Jerusalen', email: 'owner_f@ixmiquilpan.com', phone: '6666666661' },
        { name: 'Owner_G', lastname: 'Oink3', email: 'owner_g@ixmiquilpan.com', phone: '6666666662' },
        { name: 'Owner_H', lastname: 'DonaLala', email: 'owner_h@ixmiquilpan.com', phone: '6666666663' },
        { name: 'Owner_I', lastname: 'Panchos', email: 'owner_i@ixmiquilpan.com', phone: '6666666664' },
        { name: 'Owner_J', lastname: 'Yahir', email: 'owner_j@ixmiquilpan.com', phone: '6666666665' },
        { name: 'Carlos', lastname: 'Pérez', email: 'carlos.perez@driver.com', phone: '9876543210' },
    ];
    
    // 1. Crear todos los usuarios (createMany)
    await prisma.user.createMany({ 
        data: baseUsersData.map(u => ({ ...u, password: hashedPassword, emailVerifiedAt: now, phoneVerifiedAt: now, status: 'active' })) 
    });

    // 2. Buscar todos los usuarios creados (findMany)
    const createdUsers = await prisma.user.findMany({ 
        where: { email: { in: baseUsersData.map(u => u.email) } },
        orderBy: { id: 'asc' } // Opcional, pero ayuda a la consistencia
    });

    // 3. Mapear las variables para fácil acceso
    const userMap = createdUsers.reduce((acc, u) => {
        // Usa el email completo para garantizar unicidad al mapear
        acc[u.email] = u;
        return acc;
    }, {});
    
    // Devolver el mapa de variables nombradas
    return {
        adminUser: userMap['admin@delixmi.com'], 
        anaUser: userMap['ana.garcia@pizzeria.com'], 
        carlosUser: userMap['carlos.rodriguez@pizzeria.com'], 
        miguelUser: userMap['miguel.hernandez@repartidor.com'], 
        sofiaUser: userMap['sofia.lopez@email.com'], 
        kenjiUser: userMap['kenji.tanaka@sushi.com'],
        ownerAUser: userMap['owner_a@ixmiquilpan.com'], ownerBUser: userMap['owner_b@ixmiquilpan.com'], 
        ownerCUser: userMap['owner_c@ixmiquilpan.com'], ownerDUser: userMap['owner_d@ixmiquilpan.com'], 
        ownerEUser: userMap['owner_e@ixmiquilpan.com'], ownerFUser: userMap['owner_f@ixmiquilpan.com'],
        ownerGUser: userMap['owner_g@ixmiquilpan.com'], ownerHUser: userMap['owner_h@ixmiquilpan.com'], 
        ownerIUser: userMap['owner_i@ixmiquilpan.com'], ownerJUser: userMap['owner_j@ixmiquilpan.com'], 
        carlosDriverUser: userMap['carlos.perez@driver.com'],
    };
}

async function main() {
    console.log('🌱 Iniciando proceso de seeding con Schema V7.2 (FINAL)...');

    try {
        // ===========================================
        // ===== ELIMINACIÓN EN ORDEN INVERSO (Secuencia Segura) =====
        // ===========================================
        console.log('🧹 Limpiando datos existentes...');

        // 1. Logs, Transaccionales y Tablas con FK a Orders/Products/Users
        await prisma.auditLog.deleteMany({});
        await prisma.notification.deleteMany({});
        await prisma.complaint.deleteMany({});
        await prisma.rating.deleteMany({});
        await prisma.adminMessage.deleteMany({});
        await prisma.refreshToken.deleteMany({});
        await prisma.productInventoryLog.deleteMany({});
        await prisma.driverSession.deleteMany({});
        await prisma.routeLog.deleteMany({});
        await prisma.driverAssignmentLog.deleteMany({});

        await prisma.cartItemModifier.deleteMany({});
        await prisma.cartItem.deleteMany({});
        await prisma.cart.deleteMany({});
        
        await prisma.orderItemModifier.deleteMany({});
        await prisma.orderItem.deleteMany({});
        await prisma.payment.deleteMany({});
        await prisma.driverWalletTransaction.deleteMany({});
        await prisma.restaurantWalletTransaction.deleteMany({});
        await prisma.order.deleteMany({});

        // 2. Relaciones y Entidades Principales (Modificadores, Productos, Categorías)
        await prisma.restaurantPromotion.deleteMany({});
        await prisma.restaurantServiceArea.deleteMany({});
        await prisma.productModifier.deleteMany({});
        await prisma.modifierOption.deleteMany({});
        await prisma.modifierGroup.deleteMany({});
        await prisma.product.deleteMany({});
        await prisma.subcategory.deleteMany({});
        await prisma.category.deleteMany({});

        // 3. Wallets, Configs, Perfiles y Raíz
        await prisma.restaurantSchedule.deleteMany({});
        await prisma.restaurantConfig.deleteMany({});
        await prisma.restaurantMetrics.deleteMany({});
        await prisma.restaurantWallet.deleteMany({});
        await prisma.driverWallet.deleteMany({});
        await prisma.driverProfile.deleteMany({});
        await prisma.serviceArea.deleteMany({});
        await prisma.userRoleAssignment.deleteMany({});
        await prisma.address.deleteMany({});
        await prisma.restaurant.deleteMany({});
        await prisma.user.deleteMany({});
        await prisma.roleHasPermission.deleteMany({});
        await prisma.permission.deleteMany({});
        await prisma.role.deleteMany({});
        await prisma.globalConfig.deleteMany({});
        
        console.log('✅ Limpieza de todas las tablas completada.');

        // 1. CONFIGURACIÓN GLOBAL Y GEOGRAFÍA
        console.log('⚙️ Creando GlobalConfig y ServiceArea...');
        await prisma.globalConfig.create({
            data: {
                id: 1, defaultDeliveryRadius: new Decimal('10.00'), globalCommissionRate: new Decimal('15.00'),
                baseDeliveryFee: new Decimal('35.00'), systemTerms: 'Términos y condiciones de la plataforma...',
                systemPrivacyPolicy: 'Política de privacidad de la plataforma...',
                minAppVersionCustomer: '1.0.0', minAppVersionDriver: '1.0.0', minAppVersionRestaurant: '1.0.0',
            }
        });

        const centroServiceArea = await prisma.serviceArea.create({
            data: { name: 'Ixmiquilpan Centro', type: 'CITY', centerLatitude: new Decimal('20.480000'), centerLongitude: new Decimal('-99.215000'), radiusKm: new Decimal('5.00'), isActive: true }
        });
        console.log('✅ GlobalConfig y ServiceArea creados.');

        // 2. ROLES, PERMISOS
        console.log('📋 Creando roles y permisos...');
        
        const rolesData = [
            { name: 'super_admin', displayName: 'Super Administrador' }, { name: 'platform_manager', displayName: 'Gestor de Plataforma' },
            { name: 'support_agent', displayName: 'Agente de Soporte' }, { name: 'owner', displayName: 'Dueño de Restaurante' },
            { name: 'order_manager', displayName: 'Gestor de Pedidos' }, { name: 'kitchen_staff', displayName: 'Personal de Cocina' },
            { name: 'driver_platform', displayName: 'Repartidor de Plataforma' }, { name: 'customer', displayName: 'Cliente' },
        ];
        await prisma.role.createMany({ data: rolesData });
        const createdRoles = await prisma.role.findMany();
        const roleMap = createdRoles.reduce((acc, r) => ({ ...acc, [r.name]: r }), {});

        const permissionsData = [
            { name: 'products.create', displayName: 'Crear Productos', module: 'products' }, { name: 'products.edit.all', displayName: 'Editar Cualquier Producto', module: 'products' },
            { name: 'orders.view.all', displayName: 'Ver Todos los Pedidos', module: 'orders' }, { name: 'orders.update.status', displayName: 'Actualizar Estado de Pedido', module: 'orders' },
            { name: 'restaurants.edit.all', displayName: 'Editar Cualquier Restaurante', module: 'restaurants' }, { name: 'users.view.all', displayName: 'Ver Todos los Usuarios', module: 'users' }, 
            { name: 'platform.config.edit', displayName: 'Editar Configuración Global', module: 'platform' },
        ];
        await prisma.permission.createMany({ data: permissionsData });
        const createdPermissions = await prisma.permission.findMany();
        const permMap = createdPermissions.reduce((acc, p) => ({ ...acc, [p.name]: p }), {});

        const allPermissionsForAdmin = createdPermissions.map(p => ({ roleId: roleMap['super_admin'].id, permissionId: p.id }));
        await prisma.roleHasPermission.createMany({ data: allPermissionsForAdmin });
        console.log('✅ Roles, Permisos y Asignaciones Admin creadas.');

        // 3. USUARIOS (Utilizando la función robusta)
        console.log('👥 Creando usuarios...');
        const userVariables = await createUsersAndMap();
        const { adminUser, anaUser, carlosUser, miguelUser, sofiaUser, kenjiUser, ownerAUser, ownerBUser, ownerCUser, ownerDUser, ownerEUser, ownerFUser, ownerGUser, ownerHUser, ownerIUser, ownerJUser, carlosDriverUser } = userVariables;
        console.log(`✅ ${Object.keys(userVariables).length - 1} usuarios creados.`); // -1 por la key 'allOwners' que fue removida

        // 4. RESTAURANTES, WALLETS, CONFIGS, METRICS, SCHEDULES
        console.log('🏪 Creando restaurantes y sus componentes...');
        const restData = [
            { owner: anaUser, name: 'Pizzería de Ana', category: 'Pizzas', lat: '20.489000', lon: '-99.230000', commission: '12.50', autoAccept: true, phone: anaUser.phone },
            { owner: kenjiUser, name: 'Sushi Master Kenji', category: 'Sushi', lat: '20.486789', lon: '-99.212345', commission: '15.00', autoAccept: false, phone: kenjiUser.phone },
            { owner: ownerAUser, name: 'Carnitas Oink', category: 'Carnitas', lat: '20.479658', lon: '-99.239377', commission: '12.00', autoAccept: false, phone: ownerAUser.phone },
            { owner: ownerBUser, name: 'El Mexicano', category: 'Comida Mexicana', lat: '20.480765', lon: '-99.249142', commission: '13.00', autoAccept: false, phone: ownerBUser.phone },
            { owner: ownerCUser, name: 'Candelabros', category: 'Restaurante', lat: '20.483756', lon: '-99.215401', commission: '14.00', autoAccept: false, phone: ownerCUser.phone },
            { owner: ownerDUser, name: 'Pueblito Pizza', category: 'Pizzas', lat: '20.483765', lon: '-99.217980', commission: '12.50', autoAccept: true, phone: ownerDUser.phone },
            { owner: ownerEUser, name: 'Restaurant Cazadores', category: 'Carnes', lat: '20.473625', lon: '-99.208590', commission: '13.50', autoAccept: false, phone: ownerEUser.phone },
            { owner: ownerFUser, name: 'Taquería Jerusalén', category: 'Tacos', lat: '20.455943', lon: '-99.183751', commission: '11.00', autoAccept: true, phone: ownerFUser.phone },
            { owner: ownerGUser, name: 'Carnitas OINK 3 en el Tephé', category: 'Carnitas', lat: '20.447809', lon: '-99.177468', commission: '12.00', autoAccept: false, phone: ownerGUser.phone },
            { owner: ownerHUser, name: 'Cocina "Doña Lala"', category: 'Comida Casera', lat: '20.440500', lon: '-99.166491', commission: '10.00', autoAccept: true, phone: ownerHUser.phone },
            { owner: ownerIUser, name: 'Pollos Los Panchos', category: 'Pollo', lat: '20.423813', lon: '-99.168832', commission: '11.50', autoAccept: false, phone: ownerIUser.phone },
            { owner: ownerJUser, name: 'PIZZAS YAHIR', category: 'Pizzas', lat: '20.384222', lon: '-99.194793', commission: '12.00', autoAccept: true, phone: ownerJUser.phone },
        ];

        const createdRestaurants = await Promise.all(restData.map(data => 
            prisma.restaurant.create({
                data: {
                    ownerId: data.owner.id, name: data.name, category: data.category,
                    description: `Las mejores ${data.category} de la zona.`, email: `contacto@${data.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, phone: data.phone,
                    address: `Dirección de prueba para ${data.name}`,
                    latitude: new Decimal(data.lat), longitude: new Decimal(data.lon), commissionRate: new Decimal(data.commission),
                    delivery_fee: new Decimal('25.00'), delivery_radius: new Decimal('8.00'), status: 'active',
                    logoUrl: 'https://placehold.co/400x400/png', coverPhotoUrl: 'https://placehold.co/1200x400/png',
                    wallet: { create: { balance: new Decimal(0) } },
                    config: { create: { autoAcceptOrders: data.autoAccept, maxDeliveryRadius: new Decimal('10.00'), minOrderAmount: new Decimal('50.00'), deliveryTimeEstimate: 30 } },
                    metrics: { create: { totalOrders: 0, totalRevenue: new Decimal(0), averageOrderValue: new Decimal(0) } },
                    schedules: { createMany: {
                        data: Array.from({ length: 7 }, (_, day) => ({ dayOfWeek: day, openTime: '08:00:00', closeTime: '22:00:00', isActive: true }))
                    }},
                    serviceAreas: { create: { serviceAreaId: centroServiceArea.id } },
                }
            })
        ));

        const [restaurant, sushiRestaurant] = createdRestaurants;
        console.log(`✅ ${createdRestaurants.length} Restaurantes creados con componentes y Owners únicos.`);
        
        // 5. ASIGNACIONES DE ROLES DE USUARIO
        console.log('👤 Creando asignaciones de roles...');
        const userRoleAssignmentsData = [
            { userId: adminUser.id, roleId: roleMap.super_admin.id },
            { userId: carlosUser.id, roleId: roleMap.order_manager.id, restaurantId: restaurant.id },
            { userId: miguelUser.id, roleId: roleMap.driver_platform.id },
            { userId: sofiaUser.id, roleId: roleMap.customer.id },
            { userId: carlosDriverUser.id, roleId: roleMap.driver_platform.id },
        ];
        
        // Asignar rol 'owner' a cada dueño con su restaurantId
        restData.forEach((data, index) => {
            const restaurant = createdRestaurants[index];
            userRoleAssignmentsData.push({ 
                userId: data.owner.id, 
                roleId: roleMap.owner.id, 
                restaurantId: restaurant.id 
            });
        });
        
        await prisma.userRoleAssignment.createMany({
            data: userRoleAssignmentsData
        });
        
        console.log(`✅ ${userRoleAssignmentsData.length} asignaciones de roles creadas.`);

        // 6. PERFILES DE REPARTIDOR (DriverProfile y DriverWallet)
        await Promise.all([
            prisma.driverProfile.create({ data: { userId: miguelUser.id, vehicleType: 'motorcycle', licensePlate: 'HGO-ABC-123', status: 'online', currentLatitude: new Decimal('20.489500'), currentLongitude: new Decimal('-99.232000'), lastSeenAt: now, kycStatus: 'approved', rfc: 'MIGH880101XYZ', opcionPagoDefinitivo: true } }),
            prisma.driverProfile.create({ data: { userId: carlosDriverUser.id, vehicleType: 'car', licensePlate: 'HGO-XYZ-789', status: 'offline', currentLatitude: new Decimal('20.490000'), currentLongitude: new Decimal('-99.235000'), lastSeenAt: now, kycStatus: 'under_review', rfc: 'CARP990202ABC', opcionPagoDefinitivo: false } }),
        ]);
        await prisma.driverWallet.createMany({ data: [{ driverId: miguelUser.id }, { driverId: carlosDriverUser.id }] });
        console.log('✅ Perfiles y Wallets de repartidor creadas.');

        // 7. CATEGORÍAS Y SUBCATEGORÍAS
        const [pizzasCategory, bebidasCategory, entradasCategory, postresCategory, sushiCategory, bebidasJaponesasCategory] = await Promise.all([
            prisma.category.create({ data: { name: 'Pizzas' } }), prisma.category.create({ data: { name: 'Bebidas' } }),
            prisma.category.create({ data: { name: 'Entradas' } }), prisma.category.create({ data: { name: 'Postres' } }),
            prisma.category.create({ data: { name: 'Sushi' } }), prisma.category.create({ data: { name: 'Bebidas Japonesas' } }),
        ]);
        
        const [tradicionalesSub, gourmetSub, refrescosSub, nigiriSub] = await Promise.all([
            prisma.subcategory.create({ data: { restaurantId: restaurant.id, categoryId: pizzasCategory.id, name: 'Pizzas Tradicionales', displayOrder: 1 } }),
            prisma.subcategory.create({ data: { restaurantId: restaurant.id, categoryId: pizzasCategory.id, name: 'Pizzas Gourmet', displayOrder: 2 } }),
            prisma.subcategory.create({ data: { restaurantId: restaurant.id, categoryId: bebidasCategory.id, name: 'Refrescos', displayOrder: 4 } }),
            prisma.subcategory.create({ data: { restaurantId: sushiRestaurant.id, categoryId: sushiCategory.id, name: 'Nigiri', displayOrder: 10 } }),
        ]);

        // 8. PRODUCTOS (Con stockQuantity y Tags)
        const [pizzaHawaiana, pizzaPepperoni, cocaCola, salmonNigiri] = await Promise.all([
            prisma.product.create({ data: { restaurantId: restaurant.id, subcategoryId: tradicionalesSub.id, name: 'Pizza Hawaiana', description: 'La clásica pizza con jamón y piña fresca.', price: new Decimal('150.00'), stockQuantity: 50, tags: 'pizza, jamon, pina' } }),
            prisma.product.create({ data: { restaurantId: restaurant.id, subcategoryId: tradicionalesSub.id, name: 'Pizza de Pepperoni', description: 'Generosa porción de pepperoni.', price: new Decimal('145.50'), stockQuantity: 50, tags: 'pizza, pepperoni' } }),
            prisma.product.create({ data: { restaurantId: restaurant.id, subcategoryId: refrescosSub.id, name: 'Coca-Cola 600ml', description: 'Refresco de cola bien frío.', price: new Decimal('25.00'), stockQuantity: 100, tags: 'bebida, refresco' } }),
            prisma.product.create({ data: { restaurantId: sushiRestaurant.id, subcategoryId: nigiriSub.id, name: 'Nigiri de Salmón', description: 'Fresco salmón sobre arroz.', price: new Decimal('85.00'), stockQuantity: 60, tags: 'sushi, salmon, nigiri' } }),
        ]);

        // 9. DIRECCIONES
        const [casaAddress, oficinaAddress] = await Promise.all([
            prisma.address.create({ data: { userId: sofiaUser.id, alias: 'Casa', street: 'Av. Felipe Ángeles', exteriorNumber: '21', neighborhood: 'San Nicolás', city: 'Ixmiquilpan', state: 'Hidalgo', zipCode: '42300', latitude: new Decimal('20.488765'), longitude: new Decimal('-99.234567') } }),
            prisma.address.create({ data: { userId: sofiaUser.id, alias: 'Oficina', street: 'Calle Hidalgo', exteriorNumber: '125', neighborhood: 'Centro', city: 'Ixmiquilpan', state: 'Hidalgo', zipCode: '42300', latitude: new Decimal('20.485123'), longitude: new Decimal('-99.220456') } }),
        ]);

        // 10. GRUPOS Y OPCIONES DE MODIFICADORES
        const [tamanoGroup, extrasGroup, nivelPicanteGroup] = await Promise.all([
            prisma.modifierGroup.create({ data: { name: 'Tamaño', restaurantId: restaurant.id, minSelection: 1, maxSelection: 1 } }),
            prisma.modifierGroup.create({ data: { name: 'Extras', restaurantId: restaurant.id, minSelection: 0, maxSelection: 5 } }),
            prisma.modifierGroup.create({ data: { name: 'Nivel de Picante', restaurantId: sushiRestaurant.id, minSelection: 1, maxSelection: 1 } }),
        ]);

        const [grandeOption, extraQuesoOption, sinCebollaOption, pocoPicanteOption] = await Promise.all([
            prisma.modifierOption.create({ data: { name: 'Grande (12 pulgadas)', price: new Decimal('45.00'), modifierGroupId: tamanoGroup.id } }),
            prisma.modifierOption.create({ data: { name: 'Extra Queso', price: new Decimal('15.00'), modifierGroupId: extrasGroup.id } }),
            prisma.modifierOption.create({ data: { name: 'Sin Cebolla', price: new Decimal('0.00'), modifierGroupId: extrasGroup.id } }),
            prisma.modifierOption.create({ data: { name: 'Poco Picante', price: new Decimal('0.00'), modifierGroupId: nivelPicanteGroup.id } }),
        ]);

        await prisma.productModifier.createMany({
            data: [
                { productId: pizzaHawaiana.id, modifierGroupId: tamanoGroup.id },
                { productId: pizzaHawaiana.id, modifierGroupId: extrasGroup.id },
                { productId: salmonNigiri.id, modifierGroupId: nivelPicanteGroup.id },
            ]
        });
        console.log('✅ Modificadores y asociaciones creadas.');

        // 11. FLUJO COMPLETO DE PEDIDOS Y LOGS (Transaccionales y Forenses)
        console.log('📦 Creando flujo de pedidos y logs forenses...');
        
        // --- Pedido 1: DELIVERED (El más completo) ---
        const order1Subtotal = pizzaHawaiana.price.add(grandeOption.price).add(extraQuesoOption.price);
        const order1Fees = calcPayouts(order1Subtotal.toNumber(), restaurant.commissionRate.toNumber());
        
        const order1 = await prisma.order.create({
            data: {
                customerId: sofiaUser.id, restaurantId: restaurant.id, addressId: casaAddress.id, deliveryDriverId: miguelUser.id, status: 'delivered',
                subtotal: order1Subtotal, deliveryFee: restaurant.delivery_fee, total: order1Subtotal.add(restaurant.delivery_fee),
                commissionRateSnapshot: restaurant.commissionRate, paymentMethod: 'CARD_ONLINE', paymentStatus: 'completed',
                platformFee: order1Fees.platformFee, retainedIVA: order1Fees.retainedIVA, retainedISR: order1Fees.retainedISR, restaurantPayout: order1Fees.restaurantPayout,
                driverFeeGross: order1Fees.driverFeeGross, driverRetainedIVA: order1Fees.driverRetainedIVA, driverRetainedISR: order1Fees.driverRetainedISR, driverFeeNet: order1Fees.driverFeeNet,
                orderPlacedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), orderDeliveredAt: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
            }
        });

        const orderItem1 = await prisma.orderItem.create({ data: { orderId: order1.id, productId: pizzaHawaiana.id, quantity: 1, pricePerUnit: order1Subtotal, } });
        await prisma.orderItemModifier.createMany({
            data: [{ orderItemId: orderItem1.id, modifierOptionId: grandeOption.id }, { orderItemId: orderItem1.id, modifierOptionId: extraQuesoOption.id }, { orderItemId: orderItem1.id, modifierOptionId: sinCebollaOption.id }]
        });
        await prisma.payment.create({ data: { orderId: order1.id, amount: order1.total, provider: 'mercadopago', providerPaymentId: 'MP-001', status: 'completed' } });
        
        // Transacciones y Logs Forenses del Pedido 1
        const restaurantWallet = await prisma.restaurantWallet.findUnique({ where: { restaurantId: restaurant.id } });
        const driverWallet = await prisma.driverWallet.findUnique({ where: { driverId: miguelUser.id } });

        await prisma.restaurantWalletTransaction.create({ data: { walletId: restaurantWallet.id, orderId: order1.id, type: 'RESTAURANT_ORDER_CREDIT', amount: order1.restaurantPayout, balanceAfter: order1.restaurantPayout, description: 'Ingreso por Pedido #1' } });
        await prisma.driverWalletTransaction.create({ data: { walletId: driverWallet.id, orderId: order1.id, type: 'DRIVER_DELIVERY_FEE_CREDIT', amount: order1.driverFeeNet, balanceAfter: order1.driverFeeNet, description: 'Pago por entrega Pedido #1' } });
        await prisma.rating.create({ data: { orderId: order1.id, restaurantId: restaurant.id, customerId: sofiaUser.id, driverId: miguelUser.id, restaurantScore: 5, driverScore: 5, comment: 'Entrega perfecta y a tiempo.' } });
        await prisma.routeLog.createMany({ data: [ { orderId: order1.id, driverId: miguelUser.id, latitude: new Decimal('20.489000'), longitude: new Decimal('-99.230000'), eventType: 'Pickup_Arrival' }, ] });
        await prisma.auditLog.create({ data: { userId: carlosUser.id, action: 'CONFIRMED', entity: 'ORDER', entityId: order1.id, details: JSON.stringify({ status_old: 'pending', status_new: 'confirmed' }) } });
        await prisma.notification.create({ data: { userId: sofiaUser.id, title: 'Pedido Entregado!', message: 'Tu pedido #1 ha sido completado.', type: 'ORDER_UPDATE' } });
        await prisma.productInventoryLog.create({ data: { productId: pizzaHawaiana.id, userId: carlosUser.id, change: -1, newQuantity: 49, reason: 'ORDER_SALE' } });
        await prisma.restaurantPromotion.create({ data: { restaurantId: restaurant.id, startDate: new Date(), endDate: new Date(Date.now() + 86400000 * 7), pricePaid: new Decimal(500), displayPriority: 1, approvedBy: adminUser.id, approvedAt: now } });
        await prisma.driverSession.create({ data: { driverId: miguelUser.id, start_time: new Date(Date.now() - 4 * 60 * 60 * 1000), sessionType: 'ACTIVE', ordersCompleted: 2 } });
        
        // --- Pedido 2: READY_FOR_PICKUP (Para pruebas de asignación) ---
        const order2Subtotal = salmonNigiri.price.add(pocoPicanteOption.price);
        const order2Fees = calcPayouts(order2Subtotal.toNumber(), sushiRestaurant.commissionRate.toNumber());
        
        const order2 = await prisma.order.create({
            data: {
                customerId: sofiaUser.id, restaurantId: sushiRestaurant.id, addressId: oficinaAddress.id, status: 'ready_for_pickup',
                subtotal: order2Subtotal, deliveryFee: sushiRestaurant.delivery_fee, total: order2Subtotal.add(sushiRestaurant.delivery_fee),
                commissionRateSnapshot: sushiRestaurant.commissionRate, paymentMethod: 'CASH', paymentStatus: 'pending',
                platformFee: order2Fees.platformFee, retainedIVA: order2Fees.retainedIVA, retainedISR: order2Fees.retainedISR, restaurantPayout: order2Fees.restaurantPayout,
                orderPlacedAt: new Date(Date.now() - 30 * 60 * 1000),
            }
        });
        await prisma.orderItem.create({ data: { orderId: order2.id, productId: salmonNigiri.id, quantity: 1, pricePerUnit: order2Subtotal } });
        await prisma.payment.create({ data: { orderId: order2.id, amount: order2.total, provider: 'cash', status: 'pending' } });
        
        // Logs de Asignación (Rechazado y Ofrecido)
        await prisma.driverAssignmentLog.create({ data: { orderId: order2.id, driverId: carlosDriverUser.id, status: 'REJECTED', rejectionReason: 'TOO_FAR', assignedAt: new Date(Date.now() - 5 * 60 * 1000), respondedAt: new Date(Date.now() - 4 * 60 * 1000) } });
        await prisma.driverAssignmentLog.create({ data: { orderId: order2.id, driverId: miguelUser.id, status: 'OFFERED', assignedAt: new Date(Date.now() - 2 * 60 * 1000) } });
        
        // --- Pedido 3: CANCELLED (Con Reembolso y Queja) ---
        const order3Subtotal = pizzaPepperoni.price.mul(2);
        const order3Fees = calcPayouts(order3Subtotal.toNumber(), restaurant.commissionRate.toNumber());
        const order3 = await prisma.order.create({
            data: {
                customerId: sofiaUser.id, restaurantId: restaurant.id, addressId: casaAddress.id, status: 'cancelled',
                subtotal: order3Subtotal, deliveryFee: restaurant.delivery_fee, total: order3Subtotal.add(restaurant.delivery_fee),
                commissionRateSnapshot: restaurant.commissionRate, paymentMethod: 'CARD_ONLINE', paymentStatus: 'refunded',
                platformFee: order3Fees.platformFee, retainedIVA: order3Fees.retainedIVA, retainedISR: order3Fees.retainedISR, restaurantPayout: order3Fees.restaurantPayout,
                orderPlacedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
            }
        });
        await prisma.orderItem.create({ data: { orderId: order3.id, productId: pizzaPepperoni.id, quantity: 2, pricePerUnit: pizzaPepperoni.price } });
        await prisma.payment.create({ data: { orderId: order3.id, amount: order3.total, provider: 'stripe', providerPaymentId: 'STR-REFUNDED', status: 'refunded' } });
        await prisma.complaint.create({ data: { userId: sofiaUser.id, restaurantId: restaurant.id, orderId: order3.id, subject: 'Pedido Cancelado', description: 'La comida nunca llegó y el restaurante no respondía.', status: 'resolved' } });
        await prisma.auditLog.create({ data: { userId: adminUser.id, action: 'REFUNDED', entity: 'ORDER', entityId: order3.id, details: JSON.stringify({ reason: 'Customer Cancelation' }) } });


        console.log('✅ Flujo completo de pedidos y logs forenses creado.');
        
        console.log('\n🎉 ¡Seeding completado exitosamente!');
        console.log('\n🌟 Resumen: Schema V7.2 Completamente Sincronizado.');
        console.log('📦 Data Forense: Pedido #1 (DELIVERED) contiene TODA la data de Logs, Transacciones y Rating.');
        console.log('🧪 Pruebas: Pedido #2 (READY_FOR_PICKUP) para probar asignación de Drivers (Miguel y Carlos).');
        console.log('🔑 Contraseña para todos los usuarios: **supersecret**');
        console.log('👥 Usuarios Principales:');
        console.log(`- Admin: ${adminUser.email}`);
        console.log(`- Owner Pizzería: ${anaUser.email}`);
        console.log(`- Gestor Pedidos: ${carlosUser.email}`);
        console.log(`- Driver Activo: ${miguelUser.email}`);

    } catch (error) {
        console.error('❌ Error durante el seeding:', error);
        // Mostrar detalles del error para depuración
        console.error('Detalles del error:', JSON.stringify(error, null, 2));
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