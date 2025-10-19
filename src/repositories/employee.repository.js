const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const UserService = require('../services/user.service');
const { logger } = require('../config/logger');

const prisma = new PrismaClient();

/**
 * Repositorio para manejar operaciones de empleados
 * Implementa el patrón Repository para separar la lógica de acceso a datos
 */
class EmployeeRepository {

  /**
   * Crea un nuevo empleado para el restaurante del owner
   * @param {Object} employeeData - Datos del empleado (email, password, name, lastname, phone, roleId)
   * @param {number} ownerUserId - ID del usuario owner autenticado
   * @param {string} requestId - ID de la request para logging
   * @returns {Promise<Object>} Empleado creado con su asignación de rol
   */
  static async createEmployeeForRestaurant(employeeData, ownerUserId, requestId) {
    try {
      logger.debug('Iniciando creación de empleado', {
        requestId,
        meta: { ownerUserId, employeeEmail: employeeData.email }
      });

      const { email, password, name, lastname, phone, roleId } = employeeData;

      // 1. Obtener información del owner y verificar que tiene un restaurante
      const ownerWithRoles = await UserService.getUserWithRoles(ownerUserId, requestId);

      if (!ownerWithRoles) {
        throw {
          status: 404,
          message: 'Usuario no encontrado',
          code: 'USER_NOT_FOUND'
        };
      }

      // 2. Verificar que el usuario tiene rol de owner
      const ownerAssignment = ownerWithRoles.userRoleAssignments.find(
        assignment => assignment.role.name === 'owner' && assignment.restaurantId
      );

      if (!ownerAssignment) {
        logger.warn('Usuario no tiene rol de owner o restaurante asignado', {
          requestId,
          meta: { ownerUserId }
        });
        
        throw {
          status: 403,
          message: 'No tienes permisos para crear empleados. Se requiere rol de owner',
          code: 'INSUFFICIENT_PERMISSIONS',
          details: {
            userId: ownerUserId,
            suggestion: 'Solo los owners pueden crear empleados para sus restaurantes'
          }
        };
      }

      const ownerRestaurantId = ownerAssignment.restaurantId;

      // 3. Verificar que el email no esté en uso
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUserByEmail) {
        throw {
          status: 409,
          message: 'El email ya está registrado',
          code: 'EMAIL_ALREADY_EXISTS',
          details: {
            email,
            suggestion: 'Usa un email diferente o contacta al administrador'
          }
        };
      }

      // 4. Verificar que el teléfono no esté en uso
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone }
      });

      if (existingUserByPhone) {
        throw {
          status: 409,
          message: 'El teléfono ya está registrado',
          code: 'PHONE_ALREADY_EXISTS',
          details: {
            phone,
            suggestion: 'Usa un teléfono diferente o contacta al administrador'
          }
        };
      }

      // 5. Validar el rol y verificar que es válido para empleados
      const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: {
          id: true,
          name: true,
          displayName: true,
          description: true
        }
      });

      if (!role) {
        throw {
          status: 400,
          message: 'Rol no encontrado',
          code: 'INVALID_ROLE_ID',
          details: {
            roleId,
            suggestion: 'Verifica que el ID del rol sea correcto'
          }
        };
      }

      // 6. Verificar que el rol es válido para empleados
      const validEmployeeRoles = ['branch_manager', 'order_manager', 'kitchen_staff', 'driver_restaurant'];
      
      if (!validEmployeeRoles.includes(role.name)) {
        throw {
          status: 400,
          message: 'Rol no válido para empleados',
          code: 'INVALID_EMPLOYEE_ROLE',
          details: {
            roleId,
            roleName: role.name,
            validRoles: validEmployeeRoles,
            suggestion: 'Solo se pueden asignar roles de empleado: branch_manager, order_manager, kitchen_staff, driver_restaurant'
          }
        };
      }

      // 7. Iniciar transacción para crear empleado y asignación
      const result = await prisma.$transaction(async (tx) => {
        // Hashear la contraseña
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Crear el usuario (empleado)
        const newUser = await tx.user.create({
          data: {
            name,
            lastname,
            email,
            phone,
            password: hashedPassword,
            status: 'active',
            emailVerifiedAt: new Date(),
            phoneVerifiedAt: new Date()
          },
          select: {
            id: true,
            name: true,
            lastname: true,
            email: true,
            phone: true,
            status: true,
            emailVerifiedAt: true,
            phoneVerifiedAt: true,
            createdAt: true,
            updatedAt: true
          }
        });

        // Crear la asignación de rol
        const newAssignment = await tx.userRoleAssignment.create({
          data: {
            userId: newUser.id,
            roleId: role.id,
            restaurantId: ownerRestaurantId,
            branchId: null // Como está refactorizado, no se asigna branch específico
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
                name: true
              }
            }
          }
        });

        return {
          user: newUser,
          assignment: newAssignment
        };
      });

      logger.debug('Empleado creado exitosamente', {
        requestId,
        meta: { 
          employeeId: result.user.id, 
          employeeEmail: result.user.email,
          restaurantId: ownerRestaurantId,
          roleName: role.name
        }
      });

      // 8. Formatear respuesta
      return {
        employee: {
          id: result.user.id,
          name: result.user.name,
          lastname: result.user.lastname,
          email: result.user.email,
          phone: result.user.phone,
          status: result.user.status,
          emailVerifiedAt: result.user.emailVerifiedAt,
          phoneVerifiedAt: result.user.phoneVerifiedAt,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
          role: {
            id: result.assignment.role.id,
            name: result.assignment.role.name,
            displayName: result.assignment.role.displayName,
            description: result.assignment.role.description
          },
          restaurant: {
            id: result.assignment.restaurant.id,
            name: result.assignment.restaurant.name
          }
        }
      };

    } catch (error) {
      logger.error('Error creando empleado', {
        requestId,
        meta: { 
          ownerUserId, 
          employeeEmail: employeeData?.email,
          error: error.message 
        }
      });

      // Si es un error controlado (con status), lo relanzamos
      if (error.status) {
        throw error;
      }

      // Para errores de Prisma, los mapeamos
      if (error.code === 'P2002') {
        const target = error.meta?.target;
        if (target?.includes('email')) {
          throw {
            status: 409,
            message: 'El email ya está registrado',
            code: 'EMAIL_ALREADY_EXISTS',
            details: {
              email: employeeData.email,
              suggestion: 'Usa un email diferente o contacta al administrador'
            }
          };
        }
        if (target?.includes('phone')) {
          throw {
            status: 409,
            message: 'El teléfono ya está registrado',
            code: 'PHONE_ALREADY_EXISTS',
            details: {
              phone: employeeData.phone,
              suggestion: 'Usa un teléfono diferente o contacta al administrador'
            }
          };
        }
      }

      if (error.code === 'P2025') {
        throw {
          status: 404,
          message: 'Rol no encontrado',
          code: 'INVALID_ROLE_ID',
          details: {
            roleId: employeeData.roleId,
            suggestion: 'Verifica que el ID del rol sea correcto'
          }
        };
      }

      // Error interno no controlado
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        originalError: error.message
      };
    }
  }

  /**
   * Obtiene la lista de empleados de un restaurante con filtros y paginación
   * @param {number} restaurantId - ID del restaurante
   * @param {Object} filters - Filtros de búsqueda (page, pageSize, roleId, status, search)
   * @returns {Promise<Object>} Lista de empleados con metadatos de paginación
   */
  static async getEmployeesByRestaurant(restaurantId, filters) {
    try {
      logger.debug('Consultando empleados del restaurante', {
        meta: { restaurantId, filters }
      });

      const {
        page = 1,
        pageSize = 15,
        roleId,
        status,
        search
      } = filters;

      // 1. Construir cláusula where base
      const whereClause = {
        restaurantId: restaurantId
      };

      // 2. Añadir filtros opcionales
      if (roleId) {
        whereClause.roleId = roleId;
      }

      if (status) {
        whereClause.user = {
          ...whereClause.user,
          status: status
        };
      }

      // 3. Añadir filtro de búsqueda por nombre, apellido o email
      // Nota: MySQL no soporta mode: 'insensitive', por lo que usamos contains sin mode
      // Esto hará búsqueda case-sensitive. Para case-insensitive se necesitaría usar SQL raw queries
      if (search && search.trim()) {
        const searchClause = {
          OR: [
            {
              user: {
                name: {
                  contains: search
                }
              }
            },
            {
              user: {
                lastname: {
                  contains: search
                }
              }
            },
            {
              user: {
                email: {
                  contains: search
                }
              }
            }
          ]
        };

        if (whereClause.user) {
          // Si ya tenemos filtro de status, combinamos con OR
          whereClause.AND = [
            { user: { status: status } },
            searchClause
          ];
          delete whereClause.user;
        } else {
          Object.assign(whereClause, searchClause);
        }
      }

      // 4. Calcular paginación
      const skip = (page - 1) * pageSize;
      const take = Math.min(pageSize, 100); // Máximo 100 por página

      // 5. Ejecutar consultas en paralelo
      const [assignments, totalCount] = await Promise.all([
        prisma.userRoleAssignment.findMany({
          where: whereClause,
          skip: skip,
          take: take,
          orderBy: [
            { user: { name: 'asc' } },
            { user: { lastname: 'asc' } }
          ],
          include: {
            user: {
              select: {
                id: true,
                name: true,
                lastname: true,
                email: true,
                phone: true,
                status: true,
                emailVerifiedAt: true,
                phoneVerifiedAt: true,
                createdAt: true,
                updatedAt: true
              }
            },
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
                name: true
              }
            }
          }
        }),
        prisma.userRoleAssignment.count({
          where: whereClause
        })
      ]);

      // 6. Formatear respuesta de empleados
      const employees = assignments.map(assignment => ({
        id: assignment.user.id,
        name: assignment.user.name,
        lastname: assignment.user.lastname,
        email: assignment.user.email,
        phone: assignment.user.phone,
        status: assignment.user.status,
        emailVerifiedAt: assignment.user.emailVerifiedAt,
        phoneVerifiedAt: assignment.user.phoneVerifiedAt,
        createdAt: assignment.user.createdAt,
        updatedAt: assignment.user.updatedAt,
        role: {
          id: assignment.role.id,
          name: assignment.role.name,
          displayName: assignment.role.displayName,
          description: assignment.role.description
        },
        restaurant: {
          id: assignment.restaurant.id,
          name: assignment.restaurant.name
        }
      }));

      // 7. Calcular metadatos de paginación
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      const pagination = {
        currentPage: page,
        pageSize: pageSize,
        totalItems: totalCount,
        totalPages: totalPages,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null
      };

      logger.debug('Empleados obtenidos exitosamente', {
        meta: { 
          restaurantId, 
          totalCount, 
          returnedCount: employees.length,
          page,
          pageSize
        }
      });

      return {
        employees,
        pagination
      };

    } catch (error) {
      logger.error('Error obteniendo empleados del restaurante', {
        meta: { 
          restaurantId, 
          filters, 
          error: error.message 
        }
      });

      // Error interno no controlado
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        originalError: error.message
      };
    }
  }

  /**
   * Actualiza el rol y/o estado de un empleado mediante su UserRoleAssignment
   * @param {number} assignmentId - ID de la UserRoleAssignment a actualizar
   * @param {Object} updateData - Datos a actualizar (roleId?, status?)
   * @param {number} ownerUserId - ID del usuario owner que está actualizando
   * @param {string} requestId - ID de la petición para logging
   * @returns {Promise<Object>} Datos actualizados del empleado y asignación
   */
  static async updateEmployeeAssignment(assignmentId, updateData, ownerUserId, requestId) {
    const { roleId, status } = updateData;

    try {
      logger.debug('Iniciando actualización de asignación de empleado', {
        requestId,
        meta: { assignmentId, roleId, status, ownerUserId }
      });

      // 1. Obtener información del owner y su restaurantId
      const ownerUserWithRoles = await UserService.getUserWithRoles(ownerUserId, requestId);

      if (!ownerUserWithRoles) {
        throw { status: 404, message: 'Usuario owner no encontrado', code: 'OWNER_NOT_FOUND' };
      }

      const ownerAssignment = ownerUserWithRoles.userRoleAssignments.find(
        assignment => assignment.role.name === 'owner' && assignment.restaurantId !== null
      );

      if (!ownerAssignment || !ownerAssignment.restaurantId) {
        throw {
          status: 403,
          message: 'No tienes un restaurante asignado para actualizar empleados',
          code: 'NO_RESTAURANT_ASSIGNED',
          details: { userId: ownerUserId }
        };
      }
      const ownerRestaurantId = ownerAssignment.restaurantId;

      // 2. Buscar la UserRoleAssignment por ID (incluye el usuario)
      const assignment = await prisma.userRoleAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true,
              status: true,
              emailVerifiedAt: true,
              phoneVerifiedAt: true,
              createdAt: true,
              updatedAt: true
            }
          },
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
              name: true
            }
          }
        }
      });

      if (!assignment) {
        throw {
          status: 404,
          message: 'Asignación de empleado no encontrada',
          code: 'ASSIGNMENT_NOT_FOUND',
          details: { assignmentId }
        };
      }

      // 3. Validar que la asignación pertenece al restaurante del owner
      if (assignment.restaurantId !== ownerRestaurantId) {
        throw {
          status: 403,
          message: 'No tienes permisos para actualizar este empleado',
          code: 'FORBIDDEN_ACCESS',
          details: { 
            assignmentId, 
            assignmentRestaurantId: assignment.restaurantId,
            ownerRestaurantId 
          }
        };
      }

      // 4. Inicializar array de campos actualizados
      const updatedFields = [];

      // 5. Actualizar rol si se proporciona
      if (roleId !== undefined) {
        // Validar que el nuevo rol existe y es válido para empleados
        const newRole = await prisma.role.findUnique({ where: { id: roleId } });
        
        if (!newRole) {
          throw {
            status: 400,
            message: 'Rol no encontrado',
            code: 'INVALID_ROLE_ID',
            details: { roleId }
          };
        }

        const allowedEmployeeRoles = ['branch_manager', 'order_manager', 'kitchen_staff', 'driver_restaurant'];
        if (!allowedEmployeeRoles.includes(newRole.name)) {
          throw {
            status: 400,
            message: 'Rol no válido para empleados',
            code: 'INVALID_EMPLOYEE_ROLE',
            details: { roleId, roleName: newRole.name, validRoles: allowedEmployeeRoles }
          };
        }

        // Actualizar la asignación con el nuevo rol
        await prisma.userRoleAssignment.update({
          where: { id: assignmentId },
          data: { roleId: roleId }
        });

        updatedFields.push('roleId');
        logger.debug('Rol actualizado exitosamente', {
          requestId,
          meta: { assignmentId, oldRoleId: assignment.roleId, newRoleId: roleId }
        });
      }

      // 6. Actualizar estado si se proporciona
      if (status !== undefined) {
        await prisma.user.update({
          where: { id: assignment.user.id },
          data: { status: status }
        });

        updatedFields.push('status');
        logger.debug('Estado actualizado exitosamente', {
          requestId,
          meta: { assignmentId, userId: assignment.user.id, newStatus: status }
        });
      }

      // 7. Obtener datos finales actualizados
      const updatedAssignment = await prisma.userRoleAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              lastname: true,
              email: true,
              phone: true,
              status: true,
              emailVerifiedAt: true,
              phoneVerifiedAt: true,
              createdAt: true,
              updatedAt: true
            }
          },
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
              name: true
            }
          }
        }
      });

      logger.info('Asignación de empleado actualizada exitosamente', {
        requestId,
        meta: { 
          assignmentId, 
          updatedFields,
          userId: assignment.user.id,
          restaurantId: ownerRestaurantId
        }
      });

      // 8. Formatear respuesta
      return {
        assignment: {
          id: updatedAssignment.id,
          roleId: updatedAssignment.roleId,
          restaurantId: updatedAssignment.restaurantId,
          branchId: updatedAssignment.branchId
        },
        employee: {
          id: updatedAssignment.user.id,
          name: updatedAssignment.user.name,
          lastname: updatedAssignment.user.lastname,
          email: updatedAssignment.user.email,
          phone: updatedAssignment.user.phone,
          status: updatedAssignment.user.status,
          emailVerifiedAt: updatedAssignment.user.emailVerifiedAt,
          phoneVerifiedAt: updatedAssignment.user.phoneVerifiedAt,
          createdAt: updatedAssignment.user.createdAt,
          updatedAt: updatedAssignment.user.updatedAt,
          role: {
            id: updatedAssignment.role.id,
            name: updatedAssignment.role.name,
            displayName: updatedAssignment.role.displayName,
            description: updatedAssignment.role.description
          },
          restaurant: {
            id: updatedAssignment.restaurant.id,
            name: updatedAssignment.restaurant.name
          }
        },
        updatedFields
      };

    } catch (error) {
      logger.error('Error actualizando asignación de empleado', {
        requestId,
        meta: { 
          assignmentId, 
          updateData,
          ownerUserId,
          error: error.message 
        }
      });

      // Si es un error controlado (con status), lo relanzamos
      if (error.status) {
        throw error;
      }

      // Error interno no controlado
      throw {
        status: 500,
        message: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        originalError: error.message
      };
    }
  }
}

module.exports = EmployeeRepository;
