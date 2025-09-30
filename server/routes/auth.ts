import { FastifyPluginAsync } from 'fastify';
import { authenticateUser, createUser, generateToken } from '../../lib/auth';
import { loginSchema, createUserSchema } from '../../lib/validation';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login endpoint
  fastify.post('/login', {
    schema: {
      body: loginSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                timezone: { type: 'string' },
                language: { type: 'string' }
              }
            },
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as any;
    
    const user = await authenticateUser(email, password);
    if (!user) {
      return reply.code(401).send({
        error: 'Authentication failed',
        message: 'Invalid email or password'
      });
    }
    
    const token = generateToken(user);
    
    return {
      user,
      token
    };
  });

  // Register endpoint
  fastify.post('/register', {
    schema: {
      body: createUserSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                timezone: { type: 'string' },
                language: { type: 'string' }
              }
            },
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userData = request.body as any;
    
    try {
      const user = await createUser(userData);
      const token = generateToken(user);
      
      return reply.code(201).send({
        user,
        token
      });
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        return reply.code(409).send({
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
      }
      throw error;
    }
  });

  // Get current user
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
            timezone: { type: 'string' },
            language: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return request.user;
  });

  // Refresh token
  fastify.post('/refresh', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const token = generateToken(request.user);
    return { token };
  });

  // Logout (client-side token removal)
  fastify.post('/logout', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return { message: 'Logged out successfully' };
  });
};

export default authRoutes;
