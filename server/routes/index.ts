import { FastifyPluginAsync } from 'fastify';
import authRoutes from './auth';
import accountRoutes from './accounts';
import campaignRoutes from './campaigns';
import adGroupRoutes from './ad-groups';
import adRoutes from './ads';
import audienceRoutes from './audiences';
import assetRoutes from './assets';
import ruleRoutes from './rules';
import experimentRoutes from './experiments';
import reportRoutes from './reports';
import alertRoutes from './alerts';

const routes: FastifyPluginAsync = async (fastify) => {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    };
  });

  // API info
  fastify.get('/info', async (request, reply) => {
    return {
      name: 'DemandGen Pro API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Google Ads Demand Gen Campaign Management API',
      endpoints: {
        auth: '/api/auth',
        accounts: '/api/accounts',
        campaigns: '/api/campaigns',
        ad_groups: '/api/ad-groups',
        ads: '/api/ads',
        audiences: '/api/audiences',
        assets: '/api/assets',
        rules: '/api/rules',
        experiments: '/api/experiments',
        reports: '/api/reports',
        alerts: '/api/alerts'
      },
      features: [
        'Google Ads API Integration',
        'Campaign Management',
        'Audience Builder',
        'Asset Management',
        'Automation Rules',
        'A/B Testing',
        'Performance Reports',
        'Alert System',
        'Malaysia Market Focus'
      ]
    };
  });

  // Register all route modules
  await fastify.register(authRoutes, { prefix: '/auth' });
  await fastify.register(accountRoutes, { prefix: '/accounts' });
  await fastify.register(campaignRoutes, { prefix: '/campaigns' });
  await fastify.register(adGroupRoutes, { prefix: '/ad-groups' });
  await fastify.register(adRoutes, { prefix: '/ads' });
  await fastify.register(audienceRoutes, { prefix: '/audiences' });
  await fastify.register(assetRoutes, { prefix: '/assets' });
  await fastify.register(ruleRoutes, { prefix: '/rules' });
  await fastify.register(experimentRoutes, { prefix: '/experiments' });
  await fastify.register(reportRoutes, { prefix: '/reports' });
  await fastify.register(alertRoutes, { prefix: '/alerts' });
};

export default routes;
