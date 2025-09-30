import Fastify from 'fastify';
import cors from '@fastify/cors';
import { initializeDatabase } from '../lib/db';

const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

const start = async () => {
  try {
    // Register CORS
    await fastify.register(cors, {
      origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true
    });

    // Health check endpoint
    fastify.get('/api/health', async (request, reply) => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    });

    // API info endpoint
    fastify.get('/api/info', async (request, reply) => {
      return {
        name: 'DemandGen Pro API',
        version: '1.0.0',
        description: 'Google Ads Demand Gen Campaign Management API',
        status: 'running',
        database: 'SQLite',
        features: [
          'Campaign Management',
          'Malaysia Market Focus',
          'Asset Management',
          'Automation Rules',
          'Performance Reports'
        ]
      };
    });

    // Initialize database
    await initializeDatabase();
    fastify.log.info('Database initialized successfully');

    // Start server
    const port = parseInt(process.env.PORT || '8000');
    const host = '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    fastify.log.info(`🚀 DemandGen Pro API server running on http://${host}:${port}`);
    fastify.log.info(`📚 API documentation available at http://${host}:${port}/api/info`);
    fastify.log.info(`🏥 Health check available at http://${host}:${port}/api/health`);
    
  } catch (error) {
    fastify.log.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  start();
}

export default fastify;
