import { FastifyPluginAsync } from 'fastify';
import { query, withTransaction } from '../../lib/db';
import { getAuthenticatedClient, GoogleAdsService } from '../../lib/google-ads';
import { createCampaignSchema } from '../../lib/validation';

const campaignRoutes: FastifyPluginAsync = async (fastify) => {
  // Get campaigns
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          status: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { account_id, status, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (account_id) {
      whereClause += ` AND c.account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND c.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        c.*,
        a.display_name as account_name,
        COUNT(DISTINCT ag.local_id) as ad_group_count,
        COUNT(DISTINCT ad.local_id) as ad_count
      FROM campaigns c
      JOIN accounts a ON c.account_id = a.id
      LEFT JOIN ad_groups ag ON c.local_id = ag.campaign_local_id
      LEFT JOIN ads ad ON ag.local_id = ad.ad_group_local_id
      WHERE ${whereClause}
      GROUP BY c.local_id, a.display_name
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { campaigns: result.rows };
  });

  // Create campaign
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          ...createCampaignSchema.shape
        },
        required: ['account_id', 'name', 'objective', 'daily_budget_myr', 'bidding_strategy']
      }
    }
  }, async (request, reply) => {
    const campaignData = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await withTransaction(async (client) => {
        // Create campaign in database
        const campaignResult = await client.query(`
          INSERT INTO campaigns (
            account_id, name, objective, status, daily_budget_myr,
            start_date, end_date, bidding_strategy, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          campaignData.account_id,
          campaignData.name,
          campaignData.objective,
          'paused',
          campaignData.daily_budget_myr,
          campaignData.start_date || null,
          campaignData.end_date || null,
          JSON.stringify(campaignData.bidding_strategy),
          campaignData.notes || null
        ]);
        
        const campaign = campaignResult.rows[0];
        
        // Create campaign in Google Ads
        try {
          const oauth2Client = await getAuthenticatedClient(campaignData.account_id);
          const adsService = new GoogleAdsService(oauth2Client);
          
          const googleCampaign = await adsService.createDemandGenCampaign({
            name: campaignData.name,
            objective: campaignData.objective,
            dailyBudget: campaignData.daily_budget_myr,
            biddingStrategy: campaignData.bidding_strategy,
            startDate: campaignData.start_date,
            endDate: campaignData.end_date
          });
          
          // Update with Google campaign ID
          await client.query(
            'UPDATE campaigns SET google_campaign_id = $1, last_sync_at = NOW() WHERE local_id = $2',
            [googleCampaign.campaignId, campaign.local_id]
          );
          
          campaign.google_campaign_id = googleCampaign.campaignId;
          
        } catch (googleError: any) {
          // Log Google Ads API error but don't fail the transaction
          console.error('Google Ads API error:', googleError);
          campaign.sync_error = googleError.message;
        }
        
        // Log audit trail
        await client.query(`
          INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          campaignData.account_id,
          'campaign',
          campaign.local_id,
          'create',
          JSON.stringify(campaign)
        ]);
        
        return campaign;
      });
      
      return reply.code(201).send(result);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Campaign creation failed',
        message: error.message
      });
    }
  });

  // Get campaign details
  fastify.get('/:campaignId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' }
        },
        required: ['campaignId']
      }
    }
  }, async (request, reply) => {
    const { campaignId } = request.params as any;
    
    const result = await query(`
      SELECT 
        c.*,
        a.display_name as account_name,
        a.currency,
        COUNT(DISTINCT ag.local_id) as ad_group_count,
        COUNT(DISTINCT ad.local_id) as ad_count,
        COUNT(DISTINCT ast.id) as asset_count
      FROM campaigns c
      JOIN accounts a ON c.account_id = a.id
      LEFT JOIN ad_groups ag ON c.local_id = ag.campaign_local_id
      LEFT JOIN ads ad ON ag.local_id = ad.ad_group_local_id
      LEFT JOIN assets ast ON a.id = ast.account_id
      WHERE c.local_id = $1
      GROUP BY c.local_id, a.display_name, a.currency
    `, [campaignId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Campaign not found'
      });
    }
    
    return result.rows[0];
  });

  // Update campaign
  fastify.put('/:campaignId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' }
        },
        required: ['campaignId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: { type: 'string', enum: ['enabled', 'paused', 'removed'] },
          daily_budget_myr: { type: 'number' },
          bidding_strategy: { type: 'object' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { campaignId } = request.params as any;
    const updates = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await withTransaction(async (client) => {
        // Get current campaign
        const currentResult = await client.query(
          'SELECT * FROM campaigns WHERE local_id = $1',
          [campaignId]
        );
        
        if (currentResult.rows.length === 0) {
          throw new Error('Campaign not found');
        }
        
        const currentCampaign = currentResult.rows[0];
        
        // Build update query
        const setParts = [];
        const values = [];
        let paramIndex = 1;
        
        Object.entries(updates).forEach(([key, value]) => {
          if (key === 'bidding_strategy') {
            setParts.push(`${key} = $${paramIndex}`);
            values.push(JSON.stringify(value));
          } else {
            setParts.push(`${key} = $${paramIndex}`);
            values.push(value);
          }
          paramIndex++;
        });
        
        if (setParts.length === 0) {
          throw new Error('No valid updates provided');
        }
        
        values.push(campaignId);
        
        const updatedResult = await client.query(`
          UPDATE campaigns 
          SET ${setParts.join(', ')}, updated_at = NOW()
          WHERE local_id = $${paramIndex}
          RETURNING *
        `, values);
        
        const updatedCampaign = updatedResult.rows[0];
        
        // Update in Google Ads if connected
        if (currentCampaign.google_campaign_id) {
          try {
            const oauth2Client = await getAuthenticatedClient(currentCampaign.account_id);
            const adsService = new GoogleAdsService(oauth2Client);
            
            // Update budget if changed
            if (updates.daily_budget_myr) {
              await adsService.updateCampaignBudget(
                currentCampaign.google_campaign_id,
                updates.daily_budget_myr
              );
            }
            
            // Update status if changed
            if (updates.status) {
              await adsService.updateEntityStatus(
                'campaign',
                currentCampaign.google_campaign_id,
                updates.status.toUpperCase()
              );
            }
            
            await client.query(
              'UPDATE campaigns SET last_sync_at = NOW() WHERE local_id = $1',
              [campaignId]
            );
            
          } catch (googleError: any) {
            console.error('Google Ads API error:', googleError);
          }
        }
        
        // Log audit trail
        await client.query(`
          INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json, after_json)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          userId,
          currentCampaign.account_id,
          'campaign',
          campaignId,
          'update',
          JSON.stringify(currentCampaign),
          JSON.stringify(updatedCampaign)
        ]);
        
        return updatedCampaign;
      });
      
      return result;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Campaign update failed',
        message: error.message
      });
    }
  });

  // Delete campaign
  fastify.delete('/:campaignId', {
    preHandler: [fastify.authenticate, fastify.requireRole('owner')],
    schema: {
      params: {
        type: 'object',
        properties: {
          campaignId: { type: 'string' }
        },
        required: ['campaignId']
      }
    }
  }, async (request, reply) => {
    const { campaignId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      await withTransaction(async (client) => {
        const result = await client.query(
          'SELECT * FROM campaigns WHERE local_id = $1',
          [campaignId]
        );
        
        if (result.rows.length === 0) {
          throw new Error('Campaign not found');
        }
        
        const campaign = result.rows[0];
        
        // Remove from Google Ads if connected
        if (campaign.google_campaign_id) {
          try {
            const oauth2Client = await getAuthenticatedClient(campaign.account_id);
            const adsService = new GoogleAdsService(oauth2Client);
            
            await adsService.updateEntityStatus(
              'campaign',
              campaign.google_campaign_id,
              'REMOVED'
            );
          } catch (googleError: any) {
            console.error('Google Ads API error:', googleError);
          }
        }
        
        // Soft delete (update status to removed)
        await client.query(
          'UPDATE campaigns SET status = $1, updated_at = NOW() WHERE local_id = $2',
          ['removed', campaignId]
        );
        
        // Log audit trail
        await client.query(`
          INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          campaign.account_id,
          'campaign',
          campaignId,
          'delete',
          JSON.stringify(campaign)
        ]);
      });
      
      return { message: 'Campaign deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Campaign deletion failed',
        message: error.message
      });
    }
  });

  // Bulk operations
  fastify.post('/bulk', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['pause', 'enable', 'update_budget'] },
          campaign_ids: { type: 'array', items: { type: 'string' } },
          params: { type: 'object' }
        },
        required: ['action', 'campaign_ids']
      }
    }
  }, async (request, reply) => {
    const { action, campaign_ids, params } = request.body as any;
    const userId = request.user.userId;
    
    const results = [];
    
    for (const campaignId of campaign_ids) {
      try {
        let updateData: any = {};
        
        switch (action) {
          case 'pause':
            updateData.status = 'paused';
            break;
          case 'enable':
            updateData.status = 'enabled';
            break;
          case 'update_budget':
            if (params?.budget) {
              updateData.daily_budget_myr = params.budget;
            }
            break;
        }
        
        // Apply update (reuse update logic)
        const result = await query(`
          UPDATE campaigns 
          SET ${Object.keys(updateData).map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW()
          WHERE local_id = $${Object.keys(updateData).length + 1}
          RETURNING *
        `, [...Object.values(updateData), campaignId]);
        
        if (result.rows.length > 0) {
          results.push({
            campaign_id: campaignId,
            status: 'success',
            data: result.rows[0]
          });
        } else {
          results.push({
            campaign_id: campaignId,
            status: 'error',
            message: 'Campaign not found'
          });
        }
        
      } catch (error: any) {
        results.push({
          campaign_id: campaignId,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      action,
      results,
      summary: {
        total: campaign_ids.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      }
    };
  });
};

export default campaignRoutes;
