import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { createAdSchema } from '../../lib/validation';

const adRoutes: FastifyPluginAsync = async (fastify) => {
  // Get ads
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          ad_group_id: { type: 'string' },
          campaign_id: { type: 'string' },
          account_id: { type: 'string' },
          status: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { ad_group_id, campaign_id, account_id, status, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (ad_group_id) {
      whereClause += ` AND a.ad_group_id = $${paramIndex}`;
      params.push(ad_group_id);
      paramIndex++;
    }
    
    if (campaign_id) {
      whereClause += ` AND ag.campaign_id = $${paramIndex}`;
      params.push(campaign_id);
      paramIndex++;
    }
    
    if (account_id) {
      whereClause += ` AND a.account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND a.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        a.*,
        ag.name as ad_group_name,
        c.name as campaign_name,
        ast.storage_url as thumbnail_url
      FROM ads a
      LEFT JOIN ad_groups ag ON a.ad_group_id = ag.local_id
      LEFT JOIN campaigns c ON ag.campaign_id = c.local_id
      LEFT JOIN assets ast ON a.thumbnail_id = ast.id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { ads: result.rows };
  });

  // Create ad
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: createAdSchema
    }
  }, async (request, reply) => {
    const adData = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        INSERT INTO ads (
          account_id, ad_group_id, name, type, status,
          headlines_json, descriptions_json, thumbnail_id, final_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        adData.account_id,
        adData.ad_group_id,
        adData.name,
        adData.type || 'responsive_display_ad',
        adData.status || 'paused',
        JSON.stringify(adData.headlines_json || []),
        JSON.stringify(adData.descriptions_json || []),
        adData.thumbnail_id || null,
        adData.final_url
      ]);
      
      const ad = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        adData.account_id,
        'ad',
        ad.local_id,
        'create',
        JSON.stringify(ad)
      ]);
      
      return reply.code(201).send(ad);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Ad creation failed',
        message: error.message
      });
    }
  });

  // Get ad details
  fastify.get('/:adId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          adId: { type: 'string' }
        },
        required: ['adId']
      }
    }
  }, async (request, reply) => {
    const { adId } = request.params as any;
    
    const result = await query(`
      SELECT 
        a.*,
        ag.name as ad_group_name,
        c.name as campaign_name,
        ast.storage_url as thumbnail_url,
        ast.width as thumbnail_width,
        ast.height as thumbnail_height
      FROM ads a
      LEFT JOIN ad_groups ag ON a.ad_group_id = ag.local_id
      LEFT JOIN campaigns c ON ag.campaign_id = c.local_id
      LEFT JOIN assets ast ON a.thumbnail_id = ast.id
      WHERE a.local_id = $1
    `, [adId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Ad not found'
      });
    }
    
    return result.rows[0];
  });

  // Update ad
  fastify.put('/:adId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          adId: { type: 'string' }
        },
        required: ['adId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: { type: 'string' },
          headlines_json: { type: 'array' },
          descriptions_json: { type: 'array' },
          thumbnail_id: { type: 'string' },
          final_url: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { adId } = request.params as any;
    const updates = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get current ad
      const currentResult = await query(
        'SELECT * FROM ads WHERE local_id = $1',
        [adId]
      );
      
      if (currentResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Ad not found'
        });
      }
      
      const currentAd = currentResult.rows[0];
      
      // Build update query
      const setParts = [];
      const values = [];
      let paramIndex = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'headlines_json' || key === 'descriptions_json') {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      });
      
      if (setParts.length === 0) {
        return reply.code(400).send({
          error: 'No valid updates provided'
        });
      }
      
      values.push(adId);
      
      const result = await query(`
        UPDATE ads 
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE local_id = $${paramIndex}
        RETURNING *
      `, values);
      
      const updatedAd = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json, after_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        currentAd.account_id,
        'ad',
        adId,
        'update',
        JSON.stringify(currentAd),
        JSON.stringify(updatedAd)
      ]);
      
      return updatedAd;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Ad update failed',
        message: error.message
      });
    }
  });

  // Delete ad
  fastify.delete('/:adId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          adId: { type: 'string' }
        },
        required: ['adId']
      }
    }
  }, async (request, reply) => {
    const { adId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(
        'DELETE FROM ads WHERE local_id = $1 RETURNING *',
        [adId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Ad not found'
        });
      }
      
      const deletedAd = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedAd.account_id,
        'ad',
        adId,
        'delete',
        JSON.stringify(deletedAd)
      ]);
      
      return { message: 'Ad deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Ad deletion failed',
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
          action: { type: 'string', enum: ['pause', 'enable', 'delete'] },
          ad_ids: { type: 'array', items: { type: 'string' } }
        },
        required: ['action', 'ad_ids']
      }
    }
  }, async (request, reply) => {
    const { action, ad_ids } = request.body as any;
    const userId = request.user.userId;
    
    const results = [];
    
    for (const adId of ad_ids) {
      try {
        let result;
        
        if (action === 'delete') {
          result = await query(
            'DELETE FROM ads WHERE local_id = $1 RETURNING *',
            [adId]
          );
        } else {
          const status = action === 'pause' ? 'paused' : 'enabled';
          result = await query(
            'UPDATE ads SET status = $1, updated_at = NOW() WHERE local_id = $2 RETURNING *',
            [status, adId]
          );
        }
        
        if (result.rows.length > 0) {
          results.push({
            ad_id: adId,
            status: 'success'
          });
        } else {
          results.push({
            ad_id: adId,
            status: 'error',
            message: 'Ad not found'
          });
        }
        
      } catch (error: any) {
        results.push({
          ad_id: adId,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      action,
      results,
      summary: {
        total: ad_ids.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      }
    };
  });
};

export default adRoutes;
