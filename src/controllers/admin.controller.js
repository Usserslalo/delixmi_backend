const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const AdminService = require('../services/admin.service');

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

/**
 * @desc    Obtener reporte de pagos a restaurantes en un periodo determinado
 * @route   GET /api/admin/payouts/restaurants
 * @access  Private (super_admin, platform_manager)
 */
const getRestaurantPayouts = async (req, res) => {
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

    const { startDate, endDate } = req.query;

    // Convertir las fechas a objetos Date y ajustar para incluir todo el día
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0); // Inicio del día
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // Fin del día

    // Consulta de agregación usando groupBy para obtener la suma de restaurantPayout por restaurantId
    const payoutAggregation = await prisma.order.groupBy({
      by: ['branchId'],
      where: {
        status: 'delivered',
        orderDeliveredAt: {
          gte: startDateTime,
          lte: endDateTime
        }
      },
      _sum: {
        restaurantPayout: true
      },
      _count: {
        id: true
      }
    });

    // Si no hay datos, devolver array vacío
    if (payoutAggregation.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No se encontraron pedidos entregados en el periodo especificado',
        data: {
          payouts: [],
          period: {
            startDate: startDate,
            endDate: endDate,
            totalDays: Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1
          },
          summary: {
            totalRestaurants: 0,
            totalPayoutAmount: 0,
            totalOrders: 0
          }
        }
      });
    }

    // Obtener los IDs de las sucursales para consultar información de restaurantes
    const branchIds = payoutAggregation.map(item => item.branchId);

    // Consulta para obtener información de restaurantes y sucursales
    const branchesWithRestaurants = await prisma.branch.findMany({
      where: {
        id: {
          in: branchIds
        }
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    // Crear un mapa para acceso rápido a la información de restaurantes
    const branchToRestaurantMap = new Map();
    branchesWithRestaurants.forEach(branch => {
      branchToRestaurantMap.set(branch.id, {
        restaurantId: branch.restaurant.id,
        restaurantName: branch.restaurant.name,
        restaurantStatus: branch.restaurant.status,
        branchName: branch.name
      });
    });

    // Combinar datos de agregación con información de restaurantes
    const enrichedPayouts = payoutAggregation.map(item => {
      const restaurantInfo = branchToRestaurantMap.get(item.branchId);
      
      if (!restaurantInfo) {
        // Si no se encuentra información del restaurante, omitir este item
        return null;
      }

      return {
        restaurantId: restaurantInfo.restaurantId,
        restaurantName: restaurantInfo.restaurantName,
        restaurantStatus: restaurantInfo.restaurantStatus,
        branchId: item.branchId,
        branchName: restaurantInfo.branchName,
        totalPayout: parseFloat(item._sum.restaurantPayout || 0),
        totalOrders: item._count.id
      };
    }).filter(item => item !== null); // Filtrar items nulos

    // Agrupar por restaurantId para sumar payouts de múltiples sucursales
    const restaurantPayoutsMap = new Map();
    
    enrichedPayouts.forEach(payout => {
      const restaurantId = payout.restaurantId;
      
      if (restaurantPayoutsMap.has(restaurantId)) {
        const existing = restaurantPayoutsMap.get(restaurantId);
        existing.totalPayout += payout.totalPayout;
        existing.totalOrders += payout.totalOrders;
        existing.branches.push({
          branchId: payout.branchId,
          branchName: payout.branchName
        });
      } else {
        restaurantPayoutsMap.set(restaurantId, {
          restaurantId: payout.restaurantId,
          restaurantName: payout.restaurantName,
          restaurantStatus: payout.restaurantStatus,
          totalPayout: payout.totalPayout,
          totalOrders: payout.totalOrders,
          branches: [{
            branchId: payout.branchId,
            branchName: payout.branchName
          }]
        });
      }
    });

    // Convertir el mapa a array y ordenar por totalPayout descendente
    const finalPayouts = Array.from(restaurantPayoutsMap.values())
      .sort((a, b) => b.totalPayout - a.totalPayout);

    // Calcular totales
    const totalPayoutAmount = finalPayouts.reduce((sum, payout) => sum + payout.totalPayout, 0);
    const totalOrders = finalPayouts.reduce((sum, payout) => sum + payout.totalOrders, 0);

    // Respuesta exitosa
    res.status(200).json({
      status: 'success',
      message: 'Reporte de pagos a restaurantes obtenido exitosamente',
      data: {
        payouts: finalPayouts,
        period: {
          startDate: startDate,
          endDate: endDate,
          totalDays: Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1
        },
        summary: {
          totalRestaurants: finalPayouts.length,
          totalPayoutAmount: parseFloat(totalPayoutAmount.toFixed(2)),
          totalOrders: totalOrders
        },
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: req.user.id,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });

  } catch (error) {
    console.error('Error en getRestaurantPayouts:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener el reporte de pagos',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener reporte de saldos de repartidores en un periodo determinado
 * @route   GET /api/admin/payouts/drivers
 * @access  Private (super_admin, platform_manager)
 */
const getDriverPayouts = async (req, res) => {
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

    const { startDate, endDate } = req.query;

    // Convertir las fechas a objetos Date y ajustar para incluir todo el día
    const startDateTime = new Date(startDate);
    startDateTime.setHours(0, 0, 0, 0); // Inicio del día
    
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999); // Fin del día

    // Obtener todas las órdenes entregadas en el periodo con información del repartidor
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'delivered',
        orderDeliveredAt: {
          gte: startDateTime,
          lte: endDateTime
        },
        deliveryDriverId: {
          not: null // Solo órdenes que tienen repartidor asignado
        }
      },
      select: {
        id: true,
        deliveryDriverId: true,
        paymentMethod: true,
        total: true,
        deliveryFee: true,
        orderDeliveredAt: true,
        deliveryDriver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: {
        orderDeliveredAt: 'asc'
      }
    });

    // Si no hay órdenes entregadas, devolver array vacío
    if (deliveredOrders.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No se encontraron pedidos entregados por repartidores en el periodo especificado',
        data: {
          payouts: [],
          period: {
            startDate: startDate,
            endDate: endDate,
            totalDays: Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1
          },
          summary: {
            totalDrivers: 0,
            totalDeliveries: 0,
            totalPayoutBalance: 0,
            driversWithPositiveBalance: 0,
            driversWithNegativeBalance: 0
          }
        }
      });
    }

    // Agrupar órdenes por repartidor
    const driverOrdersMap = new Map();
    
    deliveredOrders.forEach(order => {
      const driverId = Number(order.deliveryDriverId); // Convertir BigInt a Number
      
      if (!driverOrdersMap.has(driverId)) {
        driverOrdersMap.set(driverId, {
          driver: {
            id: Number(order.deliveryDriver.id), // Convertir BigInt a Number
            name: order.deliveryDriver.name,
            lastname: order.deliveryDriver.lastname,
            email: order.deliveryDriver.email,
            phone: order.deliveryDriver.phone
          },
          orders: []
        });
      }
      
      driverOrdersMap.get(driverId).orders.push({
        orderId: Number(order.id), // Convertir BigInt a Number
        paymentMethod: order.paymentMethod,
        total: parseFloat(order.total),
        deliveryFee: parseFloat(order.deliveryFee),
        orderDeliveredAt: order.orderDeliveredAt
      });
    });

    // Calcular saldo para cada repartidor aplicando la lógica de billetera virtual
    const driverPayouts = [];
    
    driverOrdersMap.forEach((driverData, driverId) => {
      let payoutBalance = 0;
      let cashOrdersTotal = 0;
      let cardOrdersDeliveryFee = 0;
      
      // Iterar sobre cada pedido del repartidor
      driverData.orders.forEach(order => {
        if (order.paymentMethod === 'cash') {
          // Pago en efectivo: el repartidor cobró el total en efectivo
          // Debe entregar a la plataforma: total - deliveryFee
          const amountOwedToPlatform = order.total - order.deliveryFee;
          payoutBalance -= amountOwedToPlatform;
          cashOrdersTotal += order.total;
        } else {
          // Pago con tarjeta: el repartidor gana solo la deliveryFee
          payoutBalance += order.deliveryFee;
          cardOrdersDeliveryFee += order.deliveryFee;
        }
      });

      // Calcular estadísticas adicionales
      const totalDeliveries = driverData.orders.length;
      const cashOrdersCount = driverData.orders.filter(o => o.paymentMethod === 'cash').length;
      const cardOrdersCount = driverData.orders.filter(o => o.paymentMethod !== 'cash').length;

      driverPayouts.push({
        driverId: Number(driverId), // Asegurar que sea Number
        driverName: `${driverData.driver.name} ${driverData.driver.lastname}`,
        driverEmail: driverData.driver.email,
        driverPhone: driverData.driver.phone,
        totalDeliveries: Number(totalDeliveries), // Asegurar que sea Number
        payoutBalance: parseFloat(payoutBalance.toFixed(2)),
        balanceStatus: payoutBalance >= 0 ? 'positive' : 'negative',
        // Estadísticas detalladas
        cashOrders: {
          count: Number(cashOrdersCount), // Asegurar que sea Number
          totalAmount: parseFloat(cashOrdersTotal.toFixed(2))
        },
        cardOrders: {
          count: Number(cardOrdersCount), // Asegurar que sea Number
          totalDeliveryFees: parseFloat(cardOrdersDeliveryFee.toFixed(2))
        },
        // Resumen de órdenes para auditoría
        orders: driverData.orders.map(order => ({
          orderId: Number(order.orderId), // Asegurar que sea Number
          paymentMethod: order.paymentMethod,
          total: order.total,
          deliveryFee: order.deliveryFee,
          orderDeliveredAt: order.orderDeliveredAt
        }))
      });
    });

    // Ordenar por saldo descendente (mayores saldos primero)
    driverPayouts.sort((a, b) => b.payoutBalance - a.payoutBalance);

    // Calcular totales y estadísticas
    const totalDeliveries = deliveredOrders.length;
    const totalPayoutBalance = driverPayouts.reduce((sum, driver) => sum + driver.payoutBalance, 0);
    const driversWithPositiveBalance = driverPayouts.filter(driver => driver.payoutBalance > 0).length;
    const driversWithNegativeBalance = driverPayouts.filter(driver => driver.payoutBalance < 0).length;

    // Respuesta exitosa - asegurar que todos los valores numéricos sean convertidos
    res.status(200).json({
      status: 'success',
      message: 'Reporte de saldos de repartidores obtenido exitosamente',
      data: {
        payouts: driverPayouts,
        period: {
          startDate: startDate,
          endDate: endDate,
          totalDays: Number(Math.ceil((endDateTime - startDateTime) / (1000 * 60 * 60 * 24)) + 1) // Convertir a Number
        },
        summary: {
          totalDrivers: Number(driverPayouts.length), // Convertir a Number
          totalDeliveries: Number(totalDeliveries), // Convertir a Number
          totalPayoutBalance: parseFloat(totalPayoutBalance.toFixed(2)),
          driversWithPositiveBalance: Number(driversWithPositiveBalance), // Convertir a Number
          driversWithNegativeBalance: Number(driversWithNegativeBalance), // Convertir a Number
          averageBalancePerDriver: driverPayouts.length > 0 ? 
            parseFloat((totalPayoutBalance / driverPayouts.length).toFixed(2)) : 0
        },
        generatedAt: new Date().toISOString(),
        generatedBy: {
          userId: Number(req.user.id), // Convertir BigInt a Number
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });

  } catch (error) {
    console.error('Error en getDriverPayouts:', error);
    
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener el reporte de saldos de repartidores',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FASE 1: SEGURIDAD, ROLES Y USUARIOS
// ========================================

/**
 * @desc    Actualizar estado de usuario
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private (super_admin)
 */
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminUserId = req.user.id;

    const updatedUser = await AdminService.updateUserStatus(parseInt(id), status, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Estado de usuario actualizado exitosamente',
      data: {
        user: updatedUser,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateUserStatus:', error);
    
    // Manejar errores específicos
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        status: 'error',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Marcar usuario como sospechoso
 * @route   PATCH /api/admin/users/:id/suspicious
 * @access  Private (super_admin)
 */
const updateUserSuspicious = async (req, res) => {
  try {
    const { id } = req.params;
    const { isSuspicious } = req.body;
    const adminUserId = req.user.id;

    const updatedUser = await AdminService.updateUserSuspicious(parseInt(id), isSuspicious, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Estado de sospecha del usuario actualizado exitosamente',
      data: {
        user: updatedUser,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateUserSuspicious:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Resetear contraseña de usuario
 * @route   POST /api/admin/users/:id/reset-password
 * @access  Private (super_admin)
 */
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const adminUserId = req.user.id;

    const result = await AdminService.resetUserPassword(parseInt(id), newPassword, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Contraseña reseteada exitosamente',
      data: {
        user: result.user,
        resetToken: result.resetToken,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en resetUserPassword:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar permisos de rol
 * @route   PATCH /api/admin/roles/:id/permissions
 * @access  Private (super_admin)
 */
const updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    const adminUserId = req.user.id;

    const results = await AdminService.updateRolePermissions(parseInt(id), permissions, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Permisos de rol actualizados exitosamente',
      data: {
        changes: results,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateRolePermissions:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Asignar rol a usuario
 * @route   POST /api/admin/users/:userId/role
 * @access  Private (super_admin)
 */
const assignUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId, restaurantId } = req.body;
    const adminUserId = req.user.id;

    const assignment = await AdminService.assignUserRole(parseInt(userId), roleId, restaurantId, adminUserId);

    res.status(201).json({
      status: 'success',
      message: 'Rol asignado exitosamente',
      data: {
        assignment,
        assignedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en assignUserRole:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Eliminar sesiones de usuario
 * @route   DELETE /api/admin/users/:id/sessions
 * @access  Private (super_admin)
 */
const deleteUserSessions = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;

    const result = await AdminService.deleteUserSessions(parseInt(id), adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Sesiones eliminadas exitosamente',
      data: {
        deletedCount: result.deletedCount,
        deletedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en deleteUserSessions:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener lista de roles con permisos
 * @route   GET /api/admin/roles
 * @access  Private (super_admin)
 */
const getRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        roleHasPermissions: {
          include: {
            permission: {
              select: {
                id: true,
                name: true,
                displayName: true,
                module: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formattedRoles = roles.map(role => ({
      id: role.id,
      name: role.name,
      displayName: role.displayName,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.roleHasPermissions.map(rhp => ({
        id: rhp.permission.id,
        name: rhp.permission.name,
        displayName: rhp.permission.displayName,
        module: rhp.permission.module
      }))
    }));

    res.status(200).json({
      status: 'success',
      message: 'Lista de roles obtenida exitosamente',
      data: {
        roles: formattedRoles
      }
    });
  } catch (error) {
    console.error('Error en getRoles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener roles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Crear nuevo rol
 * @route   POST /api/admin/roles
 * @access  Private (super_admin)
 */
const createRole = async (req, res) => {
  try {
    const { name, displayName, description } = req.body;
    const adminUserId = req.user.id;

    // Verificar si el rol ya existe
    const existingRole = await prisma.role.findFirst({
      where: {
        name: name
      }
    });

    if (existingRole) {
      return res.status(409).json({
        status: 'error',
        message: 'Ya existe un rol con ese nombre',
        data: {
          existingRole: {
            id: existingRole.id,
            name: existingRole.name,
            displayName: existingRole.displayName
          }
        }
      });
    }

    const newRole = await prisma.role.create({
      data: {
        name,
        displayName,
        description
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_ROLE',
        entity: 'USER',
        entityId: BigInt(newRole.id),
        details: {
          role: {
            id: newRole.id,
            name: newRole.name,
            displayName: newRole.displayName
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Rol creado exitosamente',
      data: {
        role: newRole,
        createdBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en createRole:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FASE 2: CONFIGURACIÓN GLOBAL Y GEOGRAFÍA
// ========================================

/**
 * @desc    Actualizar configuración global
 * @route   PATCH /api/admin/settings/global
 * @access  Private (super_admin)
 */
const updateGlobalConfig = async (req, res) => {
  try {
    const configData = req.body;
    const adminUserId = req.user.id;

    const updatedConfig = await AdminService.updateGlobalConfig(configData, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Configuración global actualizada exitosamente',
      data: {
        config: updatedConfig,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateGlobalConfig:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener configuración global
 * @route   GET /api/admin/settings/global
 * @access  Private (super_admin)
 */
const getGlobalConfig = async (req, res) => {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { id: 1 }
    });

    if (!config) {
      return res.status(404).json({
        status: 'error',
        message: 'Configuración global no encontrada',
        code: 'CONFIG_NOT_FOUND'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Configuración global obtenida exitosamente',
      data: {
        config
      }
    });
  } catch (error) {
    console.error('Error en getGlobalConfig:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener configuración',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Crear área de servicio
 * @route   POST /api/admin/service-areas
 * @access  Private (super_admin)
 */
const createServiceArea = async (req, res) => {
  try {
    const areaData = req.body;
    const adminUserId = req.user.id;

    const serviceArea = await AdminService.createServiceArea(areaData, adminUserId);

    res.status(201).json({
      status: 'success',
      message: 'Área de servicio creada exitosamente',
      data: {
        serviceArea,
        createdBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en createServiceArea:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar área de servicio
 * @route   PATCH /api/admin/service-areas/:id
 * @access  Private (super_admin)
 */
const updateServiceArea = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminUserId = req.user.id;

    const currentArea = await prisma.serviceArea.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, type: true }
    });

    if (!currentArea) {
      return res.status(404).json({
        status: 'error',
        message: 'Área de servicio no encontrada',
        code: 'SERVICE_AREA_NOT_FOUND'
      });
    }

    const updatedArea = await prisma.serviceArea.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_SERVICE_AREA',
        entity: 'SERVICE_AREA',
        entityId: BigInt(id),
        details: {
          serviceArea: {
            id: currentArea.id,
            name: currentArea.name,
            type: currentArea.type
          },
          changes: updateData
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Área de servicio actualizada exitosamente',
      data: {
        serviceArea: updatedArea,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateServiceArea:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FASE 3: RESTAURANTES Y CATÁLOGO
// ========================================

/**
 * @desc    Verificar restaurante manualmente
 * @route   PATCH /api/admin/restaurants/:id/verify
 * @access  Private (super_admin)
 */
const verifyRestaurant = async (req, res) => {
  try {
    const { id } = req.params;
    const { isManuallyVerified } = req.body;
    const adminUserId = req.user.id;

    const updatedRestaurant = await AdminService.verifyRestaurant(parseInt(id), isManuallyVerified, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Estado de verificación del restaurante actualizado exitosamente',
      data: {
        restaurant: updatedRestaurant,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en verifyRestaurant:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar comisión de restaurante
 * @route   PATCH /api/admin/restaurants/:id/commission
 * @access  Private (super_admin)
 */
const updateRestaurantCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;
    const adminUserId = req.user.id;

    const currentRestaurant = await prisma.restaurant.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, commissionRate: true }
    });

    if (!currentRestaurant) {
      return res.status(404).json({
        status: 'error',
        message: 'Restaurante no encontrado',
        code: 'RESTAURANT_NOT_FOUND'
      });
    }

    const updatedRestaurant = await prisma.restaurant.update({
      where: { id: parseInt(id) },
      data: { commissionRate },
      select: {
        id: true,
        name: true,
        commissionRate: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_RESTAURANT_COMMISSION',
        entity: 'RESTAURANT',
        entityId: BigInt(id),
        details: {
          restaurant: {
            id: currentRestaurant.id,
            name: currentRestaurant.name
          },
          previousCommission: currentRestaurant.commissionRate,
          newCommission: commissionRate
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Comisión del restaurante actualizada exitosamente',
      data: {
        restaurant: updatedRestaurant,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateRestaurantCommission:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Crear categoría
 * @route   POST /api/admin/categories
 * @access  Private (super_admin)
 */
const createCategory = async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    const adminUserId = req.user.id;

    const newCategory = await prisma.category.create({
      data: {
        name,
        imageUrl
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'CREATE_CATEGORY',
        entity: 'CONFIG',
        entityId: BigInt(newCategory.id),
        details: {
          category: {
            id: newCategory.id,
            name: newCategory.name
          }
        }
      }
    });

    res.status(201).json({
      status: 'success',
      message: 'Categoría creada exitosamente',
      data: {
        category: newCategory,
        createdBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en createCategory:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Actualizar categoría
 * @route   PATCH /api/admin/categories/:id
 * @access  Private (super_admin)
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const adminUserId = req.user.id;

    const currentCategory = await prisma.category.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, name: true, imageUrl: true }
    });

    if (!currentCategory) {
      return res.status(404).json({
        status: 'error',
        message: 'Categoría no encontrada',
        code: 'CATEGORY_NOT_FOUND'
      });
    }

    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_CATEGORY',
        entity: 'CONFIG',
        entityId: BigInt(id),
        details: {
          category: {
            id: currentCategory.id,
            name: currentCategory.name
          },
          changes: updateData
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Categoría actualizada exitosamente',
      data: {
        category: updatedCategory,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateCategory:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Aprobar promoción
 * @route   POST /api/admin/promotions/:id/approve
 * @access  Private (super_admin)
 */
const approvePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user.id;

    const currentPromotion = await prisma.restaurantPromotion.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, restaurantId: true, isActive: true }
    });

    if (!currentPromotion) {
      return res.status(404).json({
        status: 'error',
        message: 'Promoción no encontrada',
        code: 'PROMOTION_NOT_FOUND'
      });
    }

    const updatedPromotion = await prisma.restaurantPromotion.update({
      where: { id: parseInt(id) },
      data: {
        approvedBy: adminUserId,
        approvedAt: new Date(),
        isActive: true
      },
      include: {
        restaurant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'APPROVE_PROMOTION',
        entity: 'PROMOTION',
        entityId: BigInt(id),
        details: {
          promotion: {
            id: currentPromotion.id,
            restaurantId: currentPromotion.restaurantId
          },
          restaurant: {
            id: updatedPromotion.restaurant.id,
            name: updatedPromotion.restaurant.name
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Promoción aprobada exitosamente',
      data: {
        promotion: updatedPromotion,
        approvedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en approvePromotion:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Ajustar stock de producto
 * @route   POST /api/admin/products/:id/stock/adjust
 * @access  Private (super_admin)
 */
const adjustProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { change, reason } = req.body;
    const adminUserId = req.user.id;

    const updatedProduct = await AdminService.adjustProductStock(parseInt(id), change, reason, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Stock del producto ajustado exitosamente',
      data: {
        product: updatedProduct,
        adjustedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en adjustProductStock:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener productos marcados
 * @route   GET /api/admin/products/flagged
 * @access  Private (super_admin)
 */
const getFlaggedProducts = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: { isFlagged: true },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              status: true
            }
          },
          subcategory: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.product.count({ where: { isFlagged: true } })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Productos marcados obtenidos exitosamente',
      data: {
        products,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error en getFlaggedProducts:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener productos marcados',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener logs de inventario
 * @route   GET /api/admin/inventory-logs
 * @access  Private (super_admin)
 */
const getInventoryLogs = async (req, res) => {
  try {
    const { productId, reason, page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (productId) where.productId = parseInt(productId);
    if (reason) where.reason = reason;

    const [logs, totalCount] = await Promise.all([
      prisma.productInventoryLog.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.productInventoryLog.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Logs de inventario obtenidos exitosamente',
      data: {
        logs,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          productId: productId || null,
          reason: reason || null
        }
      }
    });
  } catch (error) {
    console.error('Error en getInventoryLogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener logs de inventario',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FASE 4: FINANZAS Y BILLETERAS
// ========================================

/**
 * @desc    Actualizar estado de pago de orden
 * @route   PATCH /api/admin/orders/:id/payment/status
 * @access  Private (super_admin)
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    const adminUserId = req.user.id;

    const currentOrder = await prisma.order.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, paymentStatus: true, total: true }
    });

    if (!currentOrder) {
      return res.status(404).json({
        status: 'error',
        message: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: BigInt(id) },
      data: { paymentStatus },
      select: {
        id: true,
        paymentStatus: true,
        total: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_PAYMENT_STATUS',
        entity: 'ORDER',
        entityId: BigInt(id),
        details: {
          orderId: id,
          previousStatus: currentOrder.paymentStatus,
          newStatus: paymentStatus,
          total: parseFloat(currentOrder.total)
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Estado de pago actualizado exitosamente',
      data: {
        order: updatedOrder,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updatePaymentStatus:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Procesar pagos a restaurantes
 * @route   POST /api/admin/wallets/restaurants/payouts/process
 * @access  Private (super_admin)
 */
const processRestaurantPayouts = async (req, res) => {
  try {
    const adminUserId = req.user.id;

    const result = await AdminService.processRestaurantPayouts(adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Pagos a restaurantes procesados exitosamente',
      data: {
        processedCount: result.processedCount,
        transactions: result.transactions,
        processedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en processRestaurantPayouts:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Ajustar billetera de restaurante
 * @route   POST /api/admin/wallets/restaurants/:id/adjust
 * @access  Private (super_admin)
 */
const adjustRestaurantWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const adminUserId = req.user.id;

    const result = await AdminService.adjustRestaurantWallet(parseInt(id), amount, description, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Billetera de restaurante ajustada exitosamente',
      data: {
        wallet: result.wallet,
        transaction: result.transaction,
        adjustedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en adjustRestaurantWallet:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Procesar pagos a repartidores
 * @route   POST /api/admin/wallets/drivers/payouts/process
 * @access  Private (super_admin)
 */
const processDriverPayouts = async (req, res) => {
  try {
    const adminUserId = req.user.id;

    const result = await AdminService.processDriverPayouts(adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Pagos a repartidores procesados exitosamente',
      data: {
        processedCount: result.processedCount,
        transactions: result.transactions,
        processedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en processDriverPayouts:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Ajustar billetera de repartidor
 * @route   POST /api/admin/wallets/drivers/:id/adjust
 * @access  Private (super_admin)
 */
const adjustDriverWallet = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, description } = req.body;
    const adminUserId = req.user.id;

    const result = await AdminService.adjustDriverWallet(parseInt(id), amount, description, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Billetera de repartidor ajustada exitosamente',
      data: {
        wallet: result.wallet,
        transaction: result.transaction,
        adjustedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en adjustDriverWallet:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener transacciones de billetera de restaurantes
 * @route   GET /api/admin/wallets/restaurants/transactions
 * @access  Private (super_admin)
 */
const getRestaurantWalletTransactions = async (req, res) => {
  try {
    const { restaurantId, isPaidOut, type, page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (restaurantId) {
      where.wallet = { restaurantId: parseInt(restaurantId) };
    }
    if (isPaidOut !== undefined) {
      where.isPaidOut = isPaidOut === 'true';
    }
    if (type) {
      where.type = type;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.restaurantWalletTransaction.findMany({
        where,
        include: {
          wallet: {
            include: {
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              total: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.restaurantWalletTransaction.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Transacciones de billetera de restaurantes obtenidas exitosamente',
      data: {
        transactions,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          restaurantId: restaurantId || null,
          isPaidOut: isPaidOut || null,
          type: type || null
        }
      }
    });
  } catch (error) {
    console.error('Error en getRestaurantWalletTransactions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener transacciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener transacciones de billetera de repartidores
 * @route   GET /api/admin/wallets/drivers/transactions
 * @access  Private (super_admin)
 */
const getDriverWalletTransactions = async (req, res) => {
  try {
    const { driverId, isPaidOut, type, page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (driverId) {
      where.wallet = { driverId: parseInt(driverId) };
    }
    if (isPaidOut !== undefined) {
      where.isPaidOut = isPaidOut === 'true';
    }
    if (type) {
      where.type = type;
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.driverWalletTransaction.findMany({
        where,
        include: {
          wallet: {
            include: {
              driver: {
                select: {
                  id: true,
                  name: true,
                  lastname: true
                }
              }
            }
          },
          order: {
            select: {
              id: true,
              total: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.driverWalletTransaction.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Transacciones de billetera de repartidores obtenidas exitosamente',
      data: {
        transactions,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          driverId: driverId || null,
          isPaidOut: isPaidOut || null,
          type: type || null
        }
      }
    });
  } catch (error) {
    console.error('Error en getDriverWalletTransactions:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener transacciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FASE 5: LOGÍSTICA Y REPARTIDORES
// ========================================

/**
 * @desc    Actualizar KYC de repartidor
 * @route   PATCH /api/admin/drivers/:id/kyc
 * @access  Private (super_admin)
 */
const updateDriverKyc = async (req, res) => {
  try {
    const { id } = req.params;
    const kycData = req.body;
    const adminUserId = req.user.id;

    const updatedProfile = await AdminService.updateDriverKyc(parseInt(id), kycData, adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'KYC del repartidor actualizado exitosamente',
      data: {
        profile: updatedProfile,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateDriverKyc:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Bloquear/desbloquear repartidor
 * @route   PATCH /api/admin/drivers/:id/block
 * @access  Private (super_admin)
 */
const blockDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;
    const adminUserId = req.user.id;

    const updatedProfile = await AdminService.blockDriver(parseInt(id), isBlocked, adminUserId);

    res.status(200).json({
      status: 'success',
      message: `Repartidor ${isBlocked ? 'bloqueado' : 'desbloqueado'} exitosamente`,
      data: {
        profile: updatedProfile,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en blockDriver:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Forzar asignación de repartidor
 * @route   POST /api/admin/orders/:orderId/driver/:driverId
 * @access  Private (super_admin)
 */
const forceDriverAssignment = async (req, res) => {
  try {
    const { orderId, driverId } = req.params;
    const adminUserId = req.user.id;

    const updatedOrder = await AdminService.forceDriverAssignment(BigInt(orderId), parseInt(driverId), adminUserId);

    res.status(200).json({
      status: 'success',
      message: 'Repartidor asignado forzosamente a la orden',
      data: {
        order: updatedOrder,
        assignedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en forceDriverAssignment:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener repartidores con KYC pendiente
 * @route   GET /api/admin/drivers/kyc/pending
 * @access  Private (super_admin)
 */
const getDriversKycPending = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const [drivers, totalCount] = await Promise.all([
      prisma.driverProfile.findMany({
        where: { kycStatus: 'pending' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: pageSize
      }),
      prisma.driverProfile.count({ where: { kycStatus: 'pending' } })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Repartidores con KYC pendiente obtenidos exitosamente',
      data: {
        drivers,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error en getDriversKycPending:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener repartidores',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener logs de ruta de orden
 * @route   GET /api/admin/orders/:orderId/route-logs
 * @access  Private (super_admin)
 */
const getOrderRouteLogs = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      select: { id: true, status: true }
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const routeLogs = await prisma.routeLog.findMany({
      where: { orderId: BigInt(orderId) },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true
          }
        }
      },
      orderBy: { timestamp: 'asc' }
    });

    res.status(200).json({
      status: 'success',
      message: 'Logs de ruta obtenidos exitosamente',
      data: {
        order: {
          id: order.id,
          status: order.status
        },
        routeLogs
      }
    });
  } catch (error) {
    console.error('Error en getOrderRouteLogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener logs de ruta',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener asignaciones de repartidor para orden
 * @route   GET /api/admin/orders/:orderId/assignments
 * @access  Private (super_admin)
 */
const getOrderAssignments = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      select: { id: true, status: true, deliveryDriverId: true }
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Orden no encontrada',
        code: 'ORDER_NOT_FOUND'
      });
    }

    const assignments = await prisma.driverAssignmentLog.findMany({
      where: { orderId: BigInt(orderId) },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            lastname: true,
            phone: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.status(200).json({
      status: 'success',
      message: 'Asignaciones de repartidor obtenidas exitosamente',
      data: {
        order: {
          id: order.id,
          status: order.status,
          currentDriverId: order.deliveryDriverId
        },
        assignments
      }
    });
  } catch (error) {
    console.error('Error en getOrderAssignments:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener asignaciones',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========================================
// FASE 6: SOPORTE, AUDITORÍA Y COMMS
// ========================================

/**
 * @desc    Actualizar estado de queja
 * @route   PATCH /api/admin/complaints/:id/status
 * @access  Private (super_admin)
 */
const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminUserId = req.user.id;

    const currentComplaint = await prisma.complaint.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, status: true, subject: true }
    });

    if (!currentComplaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Queja no encontrada',
        code: 'COMPLAINT_NOT_FOUND'
      });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true
          }
        },
        restaurant: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'UPDATE_COMPLAINT_STATUS',
        entity: 'COMPLAINT',
        entityId: BigInt(id),
        details: {
          complaint: {
            id: currentComplaint.id,
            subject: currentComplaint.subject
          },
          previousStatus: currentComplaint.status,
          newStatus: status
        }
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Estado de queja actualizado exitosamente',
      data: {
        complaint: updatedComplaint,
        updatedBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en updateComplaintStatus:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Enviar mensaje
 * @route   POST /api/admin/messages/send
 * @access  Private (super_admin)
 */
const sendMessage = async (req, res) => {
  try {
    const messageData = req.body;
    const adminUserId = req.user.id;

    const message = await AdminService.sendMessage(messageData, adminUserId);

    res.status(201).json({
      status: 'success',
      message: 'Mensaje enviado exitosamente',
      data: {
        message,
        sentBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en sendMessage:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Crear notificación masiva
 * @route   POST /api/admin/notifications/broadcast
 * @access  Private (super_admin)
 */
const broadcastNotification = async (req, res) => {
  try {
    const notificationData = req.body;
    const adminUserId = req.user.id;

    const result = await AdminService.broadcastNotification(notificationData, adminUserId);

    res.status(201).json({
      status: 'success',
      message: 'Notificación masiva enviada exitosamente',
      data: {
        sentCount: result.sentCount,
        notifications: result.notifications,
        sentBy: {
          userId: adminUserId,
          userName: `${req.user.name} ${req.user.lastname}`,
          userEmail: req.user.email
        }
      }
    });
  } catch (error) {
    console.error('Error en broadcastNotification:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener logs de auditoría
 * @route   GET /api/admin/audit-logs
 * @access  Private (super_admin)
 */
const getAuditLogs = async (req, res) => {
  try {
    const { entity, userId, page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (entity) where.entity = entity;
    if (userId) where.userId = parseInt(userId);

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.auditLog.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Logs de auditoría obtenidos exitosamente',
      data: {
        logs,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          entity: entity || null,
          userId: userId || null
        }
      }
    });
  } catch (error) {
    console.error('Error en getAuditLogs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener logs de auditoría',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener quejas
 * @route   GET /api/admin/complaints
 * @access  Private (super_admin)
 */
const getComplaints = async (req, res) => {
  try {
    const { status, page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const where = {};
    if (status) where.status = status;

    const [complaints, totalCount] = await Promise.all([
      prisma.complaint.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          },
          driverProfile: {
            select: {
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  lastname: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.complaint.count({ where })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Quejas obtenidas exitosamente',
      data: {
        complaints,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          status: status || null
        }
      }
    });
  } catch (error) {
    console.error('Error en getComplaints:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener quejas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Obtener calificaciones reportadas
 * @route   GET /api/admin/ratings/reported
 * @access  Private (super_admin)
 */
const getReportedRatings = async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const skip = (page - 1) * pageSize;

    const [ratings, totalCount] = await Promise.all([
      prisma.rating.findMany({
        where: { isReported: true },
        include: {
          order: {
            select: {
              id: true,
              total: true,
              status: true
            }
          },
          restaurant: {
            select: {
              id: true,
              name: true
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true
            }
          },
          driver: {
            select: {
              id: true,
              name: true,
              lastname: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize
      }),
      prisma.rating.count({ where: { isReported: true } })
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      status: 'success',
      message: 'Calificaciones reportadas obtenidas exitosamente',
      data: {
        ratings,
        pagination: {
          currentPage: page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error en getReportedRatings:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al obtener calificaciones reportadas',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  // Controladores existentes
  getRestaurants,
  updateRestaurantStatus,
  updateRestaurant,
  getUsers,
  createUser,
  updateUser,
  getRestaurantPayouts,
  getDriverPayouts,
  
  // Fase 1: Seguridad, Roles y Usuarios
  updateUserStatus,
  updateUserSuspicious,
  resetUserPassword,
  updateRolePermissions,
  assignUserRole,
  deleteUserSessions,
  getRoles,
  createRole,
  
  // Fase 2: Configuración Global y Geografía
  updateGlobalConfig,
  getGlobalConfig,
  createServiceArea,
  updateServiceArea,
  
  // Fase 3: Restaurantes y Catálogo
  verifyRestaurant,
  updateRestaurantCommission,
  createCategory,
  updateCategory,
  approvePromotion,
  adjustProductStock,
  getFlaggedProducts,
  getInventoryLogs,
  
  // Fase 4: Finanzas y Billeteras
  updatePaymentStatus,
  processRestaurantPayouts,
  adjustRestaurantWallet,
  processDriverPayouts,
  adjustDriverWallet,
  getRestaurantWalletTransactions,
  getDriverWalletTransactions,
  
  // Fase 5: Logística y Repartidores
  updateDriverKyc,
  blockDriver,
  forceDriverAssignment,
  getDriversKycPending,
  getOrderRouteLogs,
  getOrderAssignments,
  
  // Fase 6: Soporte, Auditoría y Comms
  updateComplaintStatus,
  sendMessage,
  broadcastNotification,
  getAuditLogs,
  getComplaints,
  getReportedRatings
};
