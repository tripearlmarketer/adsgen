import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import { authenticateUser, requireRole } from '../lib/auth';
import routes from './routes';
import { initializeDatabase } from '../lib/db';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    } : undefined
  }
});

// Security middleware
fastify.register(helmet, {
  contentSecurityPolicy: false // Disable CSP for API
});

// CORS configuration
fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
});

// Rate limiting
fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// JWT authentication
fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'your-secret-key'
});

// File upload support
fastify.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Authentication decorators
fastify.decorate('authenticate', authenticateUser);
fastify.decorate('requireRole', requireRole);

// Global error handler
fastify.setErrorHandler(async (error, request, reply) => {
  fastify.log.error(error);
  
  // JWT errors
  if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    return reply.code(401).send({
      error: 'Authentication required',
      message: 'No authorization header provided'
    });
  }
  
  if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    return reply.code(401).send({
      error: 'Invalid token',
      message: 'The provided token is invalid or expired'
    });
  }
  
  // Rate limit errors
  if (error.statusCode === 429) {
    return reply.code(429).send({
      error: 'Rate limit exceeded',
      message: 'Too many requests, please try again later'
    });
  }
  
  // Validation errors
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation failed',
      message: 'Request validation failed',
      details: error.validation
    });
  }
  
  // Database errors
  if (error.code && error.code.startsWith('23')) {
    return reply.code(400).send({
      error: 'Database constraint violation',
      message: 'The operation violates database constraints'
    });
  }
  
  // Default error response
  const statusCode = error.statusCode || 500;
  return reply.code(statusCode).send({
    error: statusCode >= 500 ? 'Internal server error' : error.message,
    message: statusCode >= 500 ? 'An unexpected error occurred' : error.message
  });
});

// Register API routes
fastify.register(routes, { prefix: '/api' });

// 404 handler
fastify.setNotFoundHandler(async (request, reply) => {
  return reply.code(404).send({
    error: 'Not found',
    message: `Route ${request.method} ${request.url} not found`
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`Received ${signal}, shutting down gracefully`);
  
  try {
    await fastify.close();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (error) {
    fastify.log.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
const start = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    fastify.log.info('Database initialized successfully');
    
    // Start server
    const port = parseInt(process.env.PORT || '8000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`🚀 DemandGen Pro API server running on http://${host}:${port}`);
    fastify.log.info(`📚 API documentation available at http://${host}:${port}/api/info`);
    fastify.log.info(`🏥 Health check available at http://${host}:${port}/api/health`);
    
  } catch (error) {
    fastify.log.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  fastify.log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  fastify.log.error('Uncaught Exception:', error);
  process.exit(1);
});

if (require.main === module) {
  start();
}

export default fastify;
