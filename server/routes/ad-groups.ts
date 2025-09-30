import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { createAdGroupSchema } from '../../lib/validation';

const adGroupRoutes: FastifyPluginAsync = async (fastify) => {
  // Get ad groups
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          campaign_id: { type: 'string' },
          account_id: { type: 'string' },
          status: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { campaign_id, account_id, status, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (campaign_id) {
      whereClause += ` AND campaign_id = $${paramIndex}`;
      params.push(campaign_id);
      paramIndex++;
    }
    
    if (account_id) {
      whereClause += ` AND account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        ag.*,
        c.name as campaign_name,
        COUNT(DISTINCT a.local_id) as ad_count
      FROM ad_groups ag
      LEFT JOIN campaigns c ON ag.campaign_id = c.local_id
      LEFT JOIN ads a ON ag.local_id = a.ad_group_id
      WHERE ${whereClause}
      GROUP BY ag.local_id, c.name
      ORDER BY ag.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { ad_groups: result.rows };
  });

  // Create ad group
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: createAdGroupSchema
    }
  }, async (request, reply) => {
    const adGroupData = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        INSERT INTO ad_groups (
          account_id, campaign_id, name, status, 
          targeting_json, bidding_json, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        adGroupData.account_id,
        adGroupData.campaign_id,
        adGroupData.name,
        adGroupData.status || 'paused',
        JSON.stringify(adGroupData.targeting_json || {}),
        JSON.stringify(adGroupData.bidding_json || {}),
        adGroupData.notes || null
      ]);
      
      const adGroup = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        adGroupData.account_id,
        'ad_group',
        adGroup.local_id,
        'create',
        JSON.stringify(adGroup)
      ]);
      
      return reply.code(201).send(adGroup);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Ad group creation failed',
        message: error.message
      });
    }
  });

  // Get ad group details
  fastify.get('/:adGroupId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          adGroupId: { type: 'string' }
        },
        required: ['adGroupId']
      }
    }
  }, async (request, reply) => {
    const { adGroupId } = request.params as any;
    
    const result = await query(`
      SELECT 
        ag.*,
        c.name as campaign_name,
        c.objective as campaign_objective,
        COUNT(DISTINCT a.local_id) as ad_count
      FROM ad_groups ag
      LEFT JOIN campaigns c ON ag.campaign_id = c.local_id
      LEFT JOIN ads a ON ag.local_id = a.ad_group_id
      WHERE ag.local_id = $1
      GROUP BY ag.local_id, c.name, c.objective
    `, [adGroupId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Ad group not found'
      });
    }
    
    return result.rows[0];
  });

  // Update ad group
  fastify.put('/:adGroupId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          adGroupId: { type: 'string' }
        },
        required: ['adGroupId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          status: { type: 'string' },
          targeting_json: { type: 'object' },
          bidding_json: { type: 'object' },
          notes: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { adGroupId } = request.params as any;
    const updates = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get current ad group
      const currentResult = await query(
        'SELECT * FROM ad_groups WHERE local_id = $1',
        [adGroupId]
      );
      
      if (currentResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Ad group not found'
        });
      }
      
      const currentAdGroup = currentResult.rows[0];
      
      // Build update query
      const setParts = [];
      const values = [];
      let paramIndex = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'targeting_json' || key === 'bidding_json') {
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
      
      values.push(adGroupId);
      
      const result = await query(`
        UPDATE ad_groups 
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE local_id = $${paramIndex}
        RETURNING *
      `, values);
      
      const updatedAdGroup = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json, after_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        currentAdGroup.account_id,
        'ad_group',
        adGroupId,
        'update',
        JSON.stringify(currentAdGroup),
        JSON.stringify(updatedAdGroup)
      ]);
      
      return updatedAdGroup;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Ad group update failed',
        message: error.message
      });
    }
  });

  // Delete ad group
  fastify.delete('/:adGroupId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          adGroupId: { type: 'string' }
        },
        required: ['adGroupId']
      }
    }
  }, async (request, reply) => {
    const { adGroupId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      // Check if ad group has ads
      const adsResult = await query(
        'SELECT COUNT(*) as ad_count FROM ads WHERE ad_group_id = $1',
        [adGroupId]
      );
      
      if (parseInt(adsResult.rows[0].ad_count) > 0) {
        return reply.code(400).send({
          error: 'Cannot delete ad group',
          message: 'Ad group contains ads. Delete ads first.'
        });
      }
      
      const result = await query(
        'DELETE FROM ad_groups WHERE local_id = $1 RETURNING *',
        [adGroupId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Ad group not found'
        });
      }
      
      const deletedAdGroup = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedAdGroup.account_id,
        'ad_group',
        adGroupId,
        'delete',
        JSON.stringify(deletedAdGroup)
      ]);
      
      return { message: 'Ad group deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Ad group deletion failed',
        message: error.message
      });
    }
  });
};

export default adGroupRoutes;
