import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { getAuthUrl, exchangeCodeForTokens, storeConnection, getAuthenticatedClient, GoogleAdsService } from '../../lib/google-ads';

const accountRoutes: FastifyPluginAsync = async (fastify) => {
  // Get Google OAuth URL
  fastify.get('/connect/google', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            authUrl: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const authUrl = getAuthUrl();
    return { authUrl };
  });

  // Handle Google OAuth callback
  fastify.post('/connect/google/callback', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          code: { type: 'string' }
        },
        required: ['code']
      }
    }
  }, async (request, reply) => {
    const { code } = request.body as any;
    
    try {
      const tokens = await exchangeCodeForTokens(code);
      const oauth2Client = await getAuthenticatedClient('temp');
      oauth2Client.setCredentials(tokens);
      
      const adsService = new GoogleAdsService(oauth2Client);
      const accessibleAccounts = await adsService.getAccessibleAccounts();
      
      // Store accounts and connections
      const accountIds = [];
      for (const account of accessibleAccounts) {
        // Insert account
        const accountResult = await query(
          `INSERT INTO accounts (google_customer_id, display_name, currency, timezone)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (google_customer_id) DO UPDATE SET
             display_name = $2, currency = $3, timezone = $4, updated_at = NOW()
           RETURNING id`,
          [account.customerId, account.descriptiveName, account.currency, account.timezone]
        );
        
        const accountId = accountResult.rows[0].id;
        accountIds.push(accountId);
        
        // Store connection
        await storeConnection(accountId, tokens);
      }
      
      return {
        message: 'Accounts connected successfully',
        accountCount: accessibleAccounts.length,
        accountIds
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Connection failed',
        message: error.message
      });
    }
  });

  // Get connected accounts
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            accounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  google_customer_id: { type: 'string' },
                  display_name: { type: 'string' },
                  currency: { type: 'string' },
                  timezone: { type: 'string' },
                  status: { type: 'string' },
                  connection_status: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const result = await query(`
      SELECT 
        a.id,
        a.google_customer_id,
        a.display_name,
        a.currency,
        a.timezone,
        a.status,
        c.status as connection_status,
        c.updated_at as last_connected
      FROM accounts a
      LEFT JOIN connections c ON a.id = c.account_id
      ORDER BY a.display_name
    `);
    
    return { accounts: result.rows };
  });

  // Get account details
  fastify.get('/:accountId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string' }
        },
        required: ['accountId']
      }
    }
  }, async (request, reply) => {
    const { accountId } = request.params as any;
    
    const result = await query(`
      SELECT 
        a.*,
        c.status as connection_status,
        c.updated_at as last_connected,
        COUNT(DISTINCT camp.local_id) as campaign_count,
        COUNT(DISTINCT ag.local_id) as ad_group_count,
        COUNT(DISTINCT ad.local_id) as ad_count
      FROM accounts a
      LEFT JOIN connections c ON a.id = c.account_id
      LEFT JOIN campaigns camp ON a.id = camp.account_id
      LEFT JOIN ad_groups ag ON camp.local_id = ag.campaign_local_id
      LEFT JOIN ads ad ON ag.local_id = ad.ad_group_local_id
      WHERE a.id = $1
      GROUP BY a.id, c.status, c.updated_at
    `, [accountId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Account not found'
      });
    }
    
    return result.rows[0];
  });

  // Update account settings
  fastify.put('/:accountId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string' }
        },
        required: ['accountId']
      },
      body: {
        type: 'object',
        properties: {
          display_name: { type: 'string' },
          timezone: { type: 'string' },
          status: { type: 'string', enum: ['active', 'suspended', 'inactive'] }
        }
      }
    }
  }, async (request, reply) => {
    const { accountId } = request.params as any;
    const updates = request.body as any;
    
    const setParts = [];
    const values = [];
    let paramIndex = 1;
    
    Object.entries(updates).forEach(([key, value]) => {
      setParts.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });
    
    if (setParts.length === 0) {
      return reply.code(400).send({
        error: 'No valid updates provided'
      });
    }
    
    values.push(accountId);
    
    const result = await query(`
      UPDATE accounts 
      SET ${setParts.join(', ')}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Account not found'
      });
    }
    
    return result.rows[0];
  });

  // Disconnect account
  fastify.delete('/:accountId/connection', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string' }
        },
        required: ['accountId']
      }
    }
  }, async (request, reply) => {
    const { accountId } = request.params as any;
    
    await query(
      'UPDATE connections SET status = $1, updated_at = NOW() WHERE account_id = $2',
      ['revoked', accountId]
    );
    
    return { message: 'Account disconnected successfully' };
  });

  // Sync account data
  fastify.post('/:accountId/sync', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string' }
        },
        required: ['accountId']
      }
    }
  }, async (request, reply) => {
    const { accountId } = request.params as any;
    
    try {
      const oauth2Client = await getAuthenticatedClient(accountId);
      const adsService = new GoogleAdsService(oauth2Client);
      
      // This would implement full sync logic
      // For now, return success message
      
      return {
        message: 'Sync initiated successfully',
        accountId,
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Sync failed',
        message: error.message
      });
    }
  });
};

export default accountRoutes;
