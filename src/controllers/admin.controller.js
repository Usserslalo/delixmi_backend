const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/**
 * @desc    Obtener lista de todos los restaurantes con filtros y paginación
 * @route   GET /api/admin/restaurants
 * @access  Private (super_admin, platform_manager)
 */
const getRestaurants = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    // Extraer parámetros de consulta con valores por defecto
    const {
      status,
      page = 1,
      pageSize = 10
    } = req.query;

    // Calcular offset para la paginación
    const skip = (page - 1) * pageSize;

    // Construir filtros de consulta
    const where = {};
    if (status) {
      where.status = status;
    }

    // Consulta principal con relaciones necesarias
    const [restaurants, totalCount] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true,
              status: true
            }
          },
          branches: {
            select: {
              id: true,
              name: true,
              status: true,
              address: true,
              phone: true,
              openingTime: true,
              closingTime: true
            }
          },
          _count: {
            select: {
              branches: true,
              products: true,
              subcategories: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: pageSize
      }),
      prisma.restaurant.count({ where })
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Formatear respuesta de restaurantes
    const formattedRestaurants = restaurants.map(restaurant => ({
      id: restaurant.id,
      name: restaurant.name,
      description: restaurant.description,
      logoUrl: restaurant.logoUrl,
      coverPhotoUrl: restaurant.coverPhotoUrl,
      commissionRate: restaurant.commissionRate,
      status: restaurant.status,
      createdAt: restaurant.createdAt,
      updatedAt: restaurant.updatedAt,
      owner: {
        id: restaurant.owner.id,
        name: restaurant.owner.name,
        lastname: restaurant.owner.lastname,
        fullName: `${restaurant.owner.name} ${restaurant.owner.lastname}`,
        email: restaurant.owner.email,
        phone: restaurant.owner.phone,
        status: restaurant.owner.status
      },
      branches: restaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
        address: branch.address,
        phone: branch.phone,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime
      })),
      statistics: {
        totalBranches: restaurant._count.branches,
        totalProducts: restaurant._count.products,
        totalSubcategories: restaurant._count.subcategories
      }
    }));

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Lista de restaurantes obtenida exitosamente',
      data: {
        restaurants: formattedRestaurants,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          previousPage: hasPreviousPage ? page - 1 : null
        },
        filters: {
          status: status || null
        }
      }
    });

  } catch (error) {
    console.error('Error en getRestaurants (admin):', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener restaurantes',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar el estado de un restaurante específico
 * @route   PATCH /api/admin/restaurants/:id/status
 * @access  Private (super_admin, platform_manager)
 */
const updateRestaurantStatus = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Verificar si el restaurante existe
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, status: true }
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // Verificar si el estado actual es el mismo que el nuevo estado
    if (existingRestaurant.status === status) {
      return res.status(400).json({
        status: 'error',
        message: 'El restaurante ya tiene el estado especificado',
        code: 'SAME_STATUS',
        currentStatus: existingRestaurant.status
      });
    }

    // Actualizar el estado del restaurante
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: { 
        status: status,
        updatedAt: new Date()
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true,
            status: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            status: true,
            address: true,
            phone: true,
            openingTime: true,
            closingTime: true
          }
        },
        _count: {
          select: {
            branches: true,
            products: true,
            subcategories: true
          }
        }
      }
    });

    // Formatear respuesta del restaurante
    const formattedRestaurant = {
      id: updatedRestaurant.id,
      name: updatedRestaurant.name,
      description: updatedRestaurant.description,
      logoUrl: updatedRestaurant.logoUrl,
      coverPhotoUrl: updatedRestaurant.coverPhotoUrl,
      commissionRate: updatedRestaurant.commissionRate,
      status: updatedRestaurant.status,
      createdAt: updatedRestaurant.createdAt,
      updatedAt: updatedRestaurant.updatedAt,
      owner: {
        id: updatedRestaurant.owner.id,
        name: updatedRestaurant.owner.name,
        lastname: updatedRestaurant.owner.lastname,
        fullName: `${updatedRestaurant.owner.name} ${updatedRestaurant.owner.lastname}`,
        email: updatedRestaurant.owner.email,
        phone: updatedRestaurant.owner.phone,
        status: updatedRestaurant.owner.status
      },
      branches: updatedRestaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
        address: branch.address,
        phone: branch.phone,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime
      })),
      statistics: {
        totalBranches: updatedRestaurant._count.branches,
        totalProducts: updatedRestaurant._count.products,
        totalSubcategories: updatedRestaurant._count.subcategories
      }
    };

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Estado del restaurante actualizado exitosamente',
      data: {
        restaurant: formattedRestaurant,
        statusChange: {
          previousStatus: existingRestaurant.status,
          newStatus: status,
          updatedBy: {
            userId: req.user.id,
            userName: `${req.user.name} ${req.user.lastname}`,
            userEmail: req.user.email
          },
          updatedAt: updatedRestaurant.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error en updateRestaurantStatus:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al actualizar el estado del restaurante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar los detalles de un restaurante específico
 * @route   PATCH /api/admin/restaurants/:id
 * @access  Private (super_admin, platform_manager)
 */
const updateRestaurant = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Verificar si el restaurante existe
    const existingRestaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) },
      select: { 
        id: true, 
        name: true, 
        description: true,
        logoUrl: true,
        coverPhotoUrl: true,
        commissionRate: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!existingRestaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    // Verificar si hay datos para actualizar
    const hasChanges = Object.keys(updateData).some(key => 
      updateData[key] !== existingRestaurant[key]
    );

    if (!hasChanges) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron cambios para actualizar',
        code: 'NO_CHANGES',
        currentData: existingRestaurant
      });
    }

    // Preparar datos para actualización
    const dataToUpdate = {
      updatedAt: new Date()
    };

    // Solo incluir campos que se proporcionaron en la petición
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.logoUrl !== undefined) dataToUpdate.logoUrl = updateData.logoUrl;
    if (updateData.coverPhotoUrl !== undefined) dataToUpdate.coverPhotoUrl = updateData.coverPhotoUrl;
    if (updateData.commissionRate !== undefined) dataToUpdate.commissionRate = updateData.commissionRate;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;

    // Actualizar el restaurante
    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true,
            status: true
          }
        },
        branches: {
          select: {
            id: true,
            name: true,
            status: true,
            address: true,
            phone: true,
            openingTime: true,
            closingTime: true
          }
        },
        _count: {
          select: {
            branches: true,
            products: true,
            subcategories: true
          }
        }
      }
    });

    // Formatear respuesta del restaurante
    const formattedRestaurant = {
      id: updatedRestaurant.id,
      name: updatedRestaurant.name,
      description: updatedRestaurant.description,
      logoUrl: updatedRestaurant.logoUrl,
      coverPhotoUrl: updatedRestaurant.coverPhotoUrl,
      commissionRate: updatedRestaurant.commissionRate,
      status: updatedRestaurant.status,
      createdAt: updatedRestaurant.createdAt,
      updatedAt: updatedRestaurant.updatedAt,
      owner: {
        id: updatedRestaurant.owner.id,
        name: updatedRestaurant.owner.name,
        lastname: updatedRestaurant.owner.lastname,
        fullName: `${updatedRestaurant.owner.name} ${updatedRestaurant.owner.lastname}`,
        email: updatedRestaurant.owner.email,
        phone: updatedRestaurant.owner.phone,
        status: updatedRestaurant.owner.status
      },
      branches: updatedRestaurant.branches.map(branch => ({
        id: branch.id,
        name: branch.name,
        status: branch.status,
        address: branch.address,
        phone: branch.phone,
        openingTime: branch.openingTime,
        closingTime: branch.closingTime
      })),
      statistics: {
        totalBranches: updatedRestaurant._count.branches,
        totalProducts: updatedRestaurant._count.products,
        totalSubcategories: updatedRestaurant._count.subcategories
      }
    };

    // Identificar campos que fueron actualizados
    const updatedFields = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== existingRestaurant[key]) {
        updatedFields[key] = {
          previous: existingRestaurant[key],
          current: updateData[key]
        };
      }
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Restaurante actualizado exitosamente',
      data: {
        restaurant: formattedRestaurant,
        changes: {
          updatedFields,
          updatedBy: {
            userId: req.user.id,
            userName: `${req.user.name} ${req.user.lastname}`,
            userEmail: req.user.email
          },
          updatedAt: updatedRestaurant.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error en updateRestaurant:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al actualizar el restaurante',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener lista de todos los usuarios con filtros y paginación
 * @route   GET /api/admin/users
 * @access  Private (super_admin, platform_manager)
 */
const getUsers = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    // Extraer parámetros de consulta con valores por defecto
    const {
      role,
      status,
      page = 1,
      pageSize = 10
    } = req.query;

    // Calcular offset para la paginación
    const skip = (page - 1) * pageSize;

    // Construir filtros de consulta
    const where = {};
    if (status) {
      where.status = status;
    }

    // Si se especifica un rol, filtrar por ese rol
    let roleFilter = {};
    if (role) {
      roleFilter = {
        userRoleAssignments: {
          some: {
            role: {
              name: role
            }
          }
        }
      };
    }

    // Combinar filtros
    const finalWhere = {
      ...where,
      ...roleFilter
    };

    // Consulta principal con relaciones necesarias
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: finalWhere,
        include: {
          userRoleAssignments: {
            select: {
              id: true,
              roleId: true,
              restaurantId: true,
              branchId: true,
              createdAt: true,
              role: {
                select: {
                  id: true,
                  name: true,
                  displayName: true,
                  description: true
                }
              },
              restaurant: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              },
              branch: {
                select: {
                  id: true,
                  name: true,
                  status: true
                }
              }
            }
          },
          driverProfile: {
            select: {
              vehicleType: true,
              licensePlate: true,
              status: true,
              kycStatus: true,
              lastSeenAt: true
            }
          },
          _count: {
            select: {
              restaurants: true,
              addresses: true,
              ordersAsCustomer: true,
              ordersAsDriver: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: pageSize
      }),
      prisma.user.count({ where: finalWhere })
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Formatear respuesta de usuarios
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      lastname: user.lastname,
      fullName: `${user.name} ${user.lastname}`,
      email: user.email,
      phone: user.phone,
      imageUrl: user.imageUrl,
      notificationToken: user.notificationToken,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      phoneVerifiedAt: user.phoneVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.userRoleAssignments.map(assignment => ({
        assignmentId: assignment.id,
        roleId: assignment.roleId,
        roleName: assignment.role.name,
        roleDisplayName: assignment.role.displayName,
        roleDescription: assignment.role.description,
        restaurantId: assignment.restaurantId,
        branchId: assignment.branchId,
        restaurant: assignment.restaurant ? {
          id: assignment.restaurant.id,
          name: assignment.restaurant.name,
          status: assignment.restaurant.status
        } : null,
        branch: assignment.branch ? {
          id: assignment.branch.id,
          name: assignment.branch.name,
          status: assignment.branch.status
        } : null,
        assignedAt: assignment.createdAt
      })),
      driverProfile: user.driverProfile ? {
        vehicleType: user.driverProfile.vehicleType,
        licensePlate: user.driverProfile.licensePlate,
        status: user.driverProfile.status,
        kycStatus: user.driverProfile.kycStatus,
        lastSeenAt: user.driverProfile.lastSeenAt
      } : null,
      statistics: {
        totalRestaurants: user._count.restaurants,
        totalAddresses: user._count.addresses,
        totalOrdersAsCustomer: user._count.ordersAsCustomer,
        totalOrdersAsDriver: user._count.ordersAsDriver
      }
    }));

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Lista de usuarios obtenida exitosamente',
      data: {
        users: formattedUsers,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage,
          hasPreviousPage,
          nextPage: hasNextPage ? page + 1 : null,
          previousPage: hasPreviousPage ? page - 1 : null
        },
        filters: {
          role: role || null,
          status: status || null
        }
      }
    });

  } catch (error) {
    console.error('Error en getUsers (admin):', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener usuarios',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Crear un nuevo usuario y asignarle un rol
 * @route   POST /api/admin/users
 * @access  Private (super_admin, platform_manager)
 */
const createUser = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const {
      name,
      lastname,
      email,
      phone,
      password,
      roleName,
      restaurantId,
      branchId
    } = req.body;

    // Verificar si ya existe un usuario con el mismo email o teléfono
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { phone: phone }
        ]
      },
      select: {
        id: true,
        email: true,
        phone: true
      }
    });

    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'phone';
      return res.status(409).json({
        status: 'error',
        message: `Ya existe un usuario con este ${conflictField === 'email' ? 'correo electrónico' : 'teléfono'}`,
        code: 'USER_EXISTS',
        field: conflictField,
        value: existingUser[conflictField]
      });
    }

    // Buscar el rol por nombre
    const role = await prisma.role.findUnique({
      where: { name: roleName },
      select: { id: true, name: true, displayName: true }
    });

    if (!role) {
      return res.status(400).json({
        status: 'error',
        message: 'Rol no encontrado',
        code: 'ROLE_NOT_FOUND',
        roleName: roleName
      });
    }

    // Validar restaurantId si se proporciona
    if (restaurantId) {
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { id: true, name: true }
      });

      if (!restaurant) {
        return res.status(400).json({
          status: 'error',
          message: 'Restaurante no encontrado',
          code: 'RESTAURANT_NOT_FOUND',
          restaurantId: restaurantId
        });
      }
    }

    // Validar branchId si se proporciona
    if (branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { id: true, name: true, restaurantId: true }
      });

      if (!branch) {
        return res.status(400).json({
          status: 'error',
          message: 'Sucursal no encontrada',
          code: 'BRANCH_NOT_FOUND',
          branchId: branchId
        });
      }

      // Verificar que la sucursal pertenezca al restaurante especificado
      if (restaurantId && branch.restaurantId !== restaurantId) {
        return res.status(400).json({
          status: 'error',
          message: 'La sucursal no pertenece al restaurante especificado',
          code: 'BRANCH_RESTAURANT_MISMATCH',
          branchId: branchId,
          restaurantId: restaurantId
        });
      }
    }

    // Hashear la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario y asignación de rol en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear el nuevo usuario
      const newUser = await tx.user.create({
        data: {
          name,
          lastname,
          email,
          phone,
          password: hashedPassword,
          status: 'active', // Los usuarios creados por admin se crean activos
          emailVerifiedAt: new Date(), // Se considera verificado al ser creado por admin
          phoneVerifiedAt: new Date()  // Se considera verificado al ser creado por admin
        }
      });

      // Crear la asignación de rol
      const roleAssignment = await tx.userRoleAssignment.create({
        data: {
          userId: newUser.id,
          roleId: role.id,
          restaurantId: restaurantId || null,
          branchId: branchId || null
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              displayName: true,
              description: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          branch: {
            select: {
              id: true,
              name: true,
              status: true
            }
          }
        }
      });

      return { newUser, roleAssignment };
    });

    // Formatear respuesta del usuario creado
    const formattedUser = {
      id: result.newUser.id,
      name: result.newUser.name,
      lastname: result.newUser.lastname,
      fullName: `${result.newUser.name} ${result.newUser.lastname}`,
      email: result.newUser.email,
      phone: result.newUser.phone,
      imageUrl: result.newUser.imageUrl,
      notificationToken: result.newUser.notificationToken,
      status: result.newUser.status,
      emailVerifiedAt: result.newUser.emailVerifiedAt,
      phoneVerifiedAt: result.newUser.phoneVerifiedAt,
      createdAt: result.newUser.createdAt,
      updatedAt: result.newUser.updatedAt,
      roles: [{
        assignmentId: result.roleAssignment.id,
        roleId: result.roleAssignment.roleId,
        roleName: result.roleAssignment.role.name,
        roleDisplayName: result.roleAssignment.role.displayName,
        roleDescription: result.roleAssignment.role.description,
        restaurantId: result.roleAssignment.restaurantId,
        branchId: result.roleAssignment.branchId,
        restaurant: result.roleAssignment.restaurant ? {
          id: result.roleAssignment.restaurant.id,
          name: result.roleAssignment.restaurant.name,
          status: result.roleAssignment.restaurant.status
        } : null,
        branch: result.roleAssignment.branch ? {
          id: result.roleAssignment.branch.id,
          name: result.roleAssignment.branch.name,
          status: result.roleAssignment.branch.status
        } : null,
        assignedAt: result.roleAssignment.createdAt
      }],
      statistics: {
        totalRestaurants: 0,
        totalAddresses: 0,
        totalOrdersAsCustomer: 0,
        totalOrdersAsDriver: 0
      }
    };

    // Respuesta exitosa
    res.status(201).json({
      status: 'success',
      message: 'Usuario creado exitosamente',
      data: {
        user: formattedUser,
        createdBy: {
          userId: req.user.id,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        },
        createdAt: result.newUser.createdAt
      }
    });

  } catch (error) {
    console.error('Error en createUser:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al crear el usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar la información de un usuario específico
 * @route   PATCH /api/admin/users/:id
 * @access  Private (super_admin, platform_manager)
 */
const updateUser = async (req, res) => {
  try {
    // Verificar errores de validación
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Datos de entrada inválidos',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Buscar el usuario con sus roles para verificar si es super_admin
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        userRoleAssignments: {
          select: {
            role: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar si el usuario tiene el rol de super_admin
    const userRoles = existingUser.userRoleAssignments.map(assignment => assignment.role.name);
    if (userRoles.includes('super_admin')) {
      return res.status(403).json({
        status: 'error',
        message: 'No se puede modificar la información de un super administrador',
        code: 'SUPER_ADMIN_PROTECTED',
        userId: parseInt(id)
      });
    }

    // Verificar si hay datos para actualizar
    const hasChanges = Object.keys(updateData).some(key => 
      updateData[key] !== existingUser[key]
    );

    if (!hasChanges) {
      return res.status(400).json({
        status: 'error',
        message: 'No se proporcionaron cambios para actualizar',
        code: 'NO_CHANGES',
        currentData: {
          id: existingUser.id,
          name: existingUser.name,
          lastname: existingUser.lastname,
          status: existingUser.status
        }
      });
    }

    // Preparar datos para actualización
    const dataToUpdate = {
      updatedAt: new Date()
    };

    // Solo incluir campos que se proporcionaron en la petición
    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.lastname !== undefined) dataToUpdate.lastname = updateData.lastname;
    if (updateData.status !== undefined) dataToUpdate.status = updateData.status;

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        userRoleAssignments: {
          select: {
            id: true,
            roleId: true,
            restaurantId: true,
            branchId: true,
            createdAt: true,
            role: {
              select: {
                id: true,
                name: true,
                displayName: true,
                description: true
              }
            },
            restaurant: {
              select: {
                id: true,
                name: true,
                status: true
              }
            },
            branch: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        },
        driverProfile: {
          select: {
            vehicleType: true,
            licensePlate: true,
            status: true,
            kycStatus: true,
            lastSeenAt: true
          }
        },
        _count: {
          select: {
            restaurants: true,
            addresses: true,
            ordersAsCustomer: true,
            ordersAsDriver: true
          }
        }
      }
    });

    // Formatear respuesta del usuario actualizado
    const formattedUser = {
      id: updatedUser.id,
      name: updatedUser.name,
      lastname: updatedUser.lastname,
      fullName: `${updatedUser.name} ${updatedUser.lastname}`,
      email: updatedUser.email,
      phone: updatedUser.phone,
      imageUrl: updatedUser.imageUrl,
      notificationToken: updatedUser.notificationToken,
      status: updatedUser.status,
      emailVerifiedAt: updatedUser.emailVerifiedAt,
      phoneVerifiedAt: updatedUser.phoneVerifiedAt,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      roles: updatedUser.userRoleAssignments.map(assignment => ({
        assignmentId: assignment.id,
        roleId: assignment.roleId,
        roleName: assignment.role.name,
        roleDisplayName: assignment.role.displayName,
        roleDescription: assignment.role.description,
        restaurantId: assignment.restaurantId,
        branchId: assignment.branchId,
        restaurant: assignment.restaurant ? {
          id: assignment.restaurant.id,
          name: assignment.restaurant.name,
          status: assignment.restaurant.status
        } : null,
        branch: assignment.branch ? {
          id: assignment.branch.id,
          name: assignment.branch.name,
          status: assignment.branch.status
        } : null,
        assignedAt: assignment.createdAt
      })),
      driverProfile: updatedUser.driverProfile ? {
        vehicleType: updatedUser.driverProfile.vehicleType,
        licensePlate: updatedUser.driverProfile.licensePlate,
        status: updatedUser.driverProfile.status,
        kycStatus: updatedUser.driverProfile.kycStatus,
        lastSeenAt: updatedUser.driverProfile.lastSeenAt
      } : null,
      statistics: {
        totalRestaurants: updatedUser._count.restaurants,
        totalAddresses: updatedUser._count.addresses,
        totalOrdersAsCustomer: updatedUser._count.ordersAsCustomer,
        totalOrdersAsDriver: updatedUser._count.ordersAsDriver
      }
    };

    // Identificar campos que fueron actualizados
    const updatedFields = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== existingUser[key]) {
        updatedFields[key] = {
          previous: existingUser[key],
          current: updateData[key]
        };
      }
    });

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Usuario actualizado exitosamente',
      data: {
        user: formattedUser,
        changes: {
          updatedFields,
          updatedBy: {
            userId: req.user.id,
            userName: `${req.user.name} ${req.user.lastname}`,
            userEmail: req.user.email
          },
          updatedAt: updatedUser.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Error en updateUser:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al actualizar el usuario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getRestaurants,
  updateRestaurantStatus,
  updateRestaurant,
  getUsers,
  createUser,
  updateUser
};
