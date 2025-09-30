import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { audiencePackSchema } from '../../lib/validation';

const audienceRoutes: FastifyPluginAsync = async (fastify) => {
  // Get audience packs
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          is_prebuilt: { type: 'boolean' },
          language: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { account_id, is_prebuilt, language, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    // Include global prebuilt packs and account-specific packs
    if (account_id) {
      whereClause += ` AND (account_id = $${paramIndex} OR (account_id IS NULL AND is_prebuilt = true))`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (is_prebuilt !== undefined) {
      whereClause += ` AND is_prebuilt = $${paramIndex}`;
      params.push(is_prebuilt);
      paramIndex++;
    }
    
    if (language) {
      whereClause += ` AND language = $${paramIndex}`;
      params.push(language);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        id,
        account_id,
        name,
        description,
        json_definition,
        is_prebuilt,
        language,
        estimated_size,
        created_at,
        updated_at
      FROM audience_packs
      WHERE ${whereClause}
      ORDER BY is_prebuilt DESC, name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { audience_packs: result.rows };
  });

  // Create custom audience pack
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          ...audiencePackSchema.shape
        },
        required: ['account_id', 'name', 'json_definition']
      }
    }
  }, async (request, reply) => {
    const audienceData = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Estimate audience size (placeholder logic)
      const estimatedSize = estimateAudienceSize(audienceData.json_definition);
      
      const result = await query(`
        INSERT INTO audience_packs (
          account_id, name, description, json_definition, 
          is_prebuilt, language, estimated_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        audienceData.account_id,
        audienceData.name,
        audienceData.description || null,
        JSON.stringify(audienceData.json_definition),
        false,
        audienceData.language || 'en',
        estimatedSize
      ]);
      
      const audiencePack = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        audienceData.account_id,
        'audience_pack',
        audiencePack.id,
        'create',
        JSON.stringify(audiencePack)
      ]);
      
      return reply.code(201).send(audiencePack);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Audience pack creation failed',
        message: error.message
      });
    }
  });

  // Get audience pack details
  fastify.get('/:packId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          packId: { type: 'string' }
        },
        required: ['packId']
      }
    }
  }, async (request, reply) => {
    const { packId } = request.params as any;
    
    const result = await query(`
      SELECT 
        ap.*,
        COUNT(DISTINCT ag.local_id) as usage_count
      FROM audience_packs ap
      LEFT JOIN ad_groups ag ON ap.id = ag.audience_pack_id
      WHERE ap.id = $1
      GROUP BY ap.id
    `, [packId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Audience pack not found'
      });
    }
    
    return result.rows[0];
  });

  // Update audience pack
  fastify.put('/:packId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          packId: { type: 'string' }
        },
        required: ['packId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          json_definition: { type: 'object' },
          language: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { packId } = request.params as any;
    const updates = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get current audience pack
      const currentResult = await query(
        'SELECT * FROM audience_packs WHERE id = $1 AND is_prebuilt = false',
        [packId]
      );
      
      if (currentResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Audience pack not found or cannot be modified'
        });
      }
      
      const currentPack = currentResult.rows[0];
      
      // Build update query
      const setParts = [];
      const values = [];
      let paramIndex = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'json_definition') {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
          
          // Recalculate estimated size
          const estimatedSize = estimateAudienceSize(value);
          setParts.push(`estimated_size = $${paramIndex + 1}`);
          values.push(estimatedSize);
          paramIndex++;
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
      
      values.push(packId);
      
      const result = await query(`
        UPDATE audience_packs 
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);
      
      const updatedPack = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json, after_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        currentPack.account_id,
        'audience_pack',
        packId,
        'update',
        JSON.stringify(currentPack),
        JSON.stringify(updatedPack)
      ]);
      
      return updatedPack;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Audience pack update failed',
        message: error.message
      });
    }
  });

  // Delete audience pack
  fastify.delete('/:packId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          packId: { type: 'string' }
        },
        required: ['packId']
      }
    }
  }, async (request, reply) => {
    const { packId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      // Check if audience pack is in use
      const usageResult = await query(
        'SELECT COUNT(*) as usage_count FROM ad_groups WHERE audience_pack_id = $1',
        [packId]
      );
      
      if (parseInt(usageResult.rows[0].usage_count) > 0) {
        return reply.code(400).send({
          error: 'Cannot delete audience pack',
          message: 'Audience pack is currently in use by ad groups'
        });
      }
      
      const result = await query(
        'DELETE FROM audience_packs WHERE id = $1 AND is_prebuilt = false RETURNING *',
        [packId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Audience pack not found or cannot be deleted'
        });
      }
      
      const deletedPack = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedPack.account_id,
        'audience_pack',
        packId,
        'delete',
        JSON.stringify(deletedPack)
      ]);
      
      return { message: 'Audience pack deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Audience pack deletion failed',
        message: error.message
      });
    }
  });

  // Duplicate audience pack
  fastify.post('/:packId/duplicate', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          packId: { type: 'string' }
        },
        required: ['packId']
      },
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          name: { type: 'string' }
        },
        required: ['account_id', 'name']
      }
    }
  }, async (request, reply) => {
    const { packId } = request.params as any;
    const { account_id, name } = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get original audience pack
      const originalResult = await query(
        'SELECT * FROM audience_packs WHERE id = $1',
        [packId]
      );
      
      if (originalResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Audience pack not found'
        });
      }
      
      const original = originalResult.rows[0];
      
      // Create duplicate
      const result = await query(`
        INSERT INTO audience_packs (
          account_id, name, description, json_definition, 
          is_prebuilt, language, estimated_size
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        account_id,
        name,
        original.description,
        original.json_definition,
        false, // Duplicates are never prebuilt
        original.language,
        original.estimated_size
      ]);
      
      const duplicatedPack = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        account_id,
        'audience_pack',
        duplicatedPack.id,
        'duplicate',
        JSON.stringify({ ...duplicatedPack, duplicated_from: packId })
      ]);
      
      return reply.code(201).send(duplicatedPack);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Audience pack duplication failed',
        message: error.message
      });
    }
  });

  // Test audience pack (estimate reach)
  fastify.post('/:packId/test', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          packId: { type: 'string' }
        },
        required: ['packId']
      }
    }
  }, async (request, reply) => {
    const { packId } = request.params as any;
    
    try {
      const result = await query(
        'SELECT json_definition FROM audience_packs WHERE id = $1',
        [packId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Audience pack not found'
        });
      }
      
      const definition = result.rows[0].json_definition;
      
      // Simulate audience testing (in real implementation, this would call Google Ads API)
      const testResults = {
        estimated_reach: estimateAudienceSize(definition),
        overlap_analysis: analyzeAudienceOverlap(definition),
        recommendations: generateAudienceRecommendations(definition)
      };
      
      return testResults;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Audience pack testing failed',
        message: error.message
      });
    }
  });
};

// Helper functions
function estimateAudienceSize(definition: any): number {
  // Placeholder logic for audience size estimation
  let baseSize = 1000000; // 1M base for Malaysia
  
  if (definition.demographics?.locations) {
    // Adjust based on location targeting
    const locations = definition.demographics.locations;
    if (locations.includes('Kuala Lumpur')) baseSize *= 0.3;
    if (locations.includes('Selangor')) baseSize *= 0.25;
    if (locations.includes('Johor')) baseSize *= 0.15;
    if (locations.includes('Penang')) baseSize *= 0.08;
  }
  
  if (definition.demographics?.age_ranges) {
    // Adjust based on age targeting
    baseSize *= definition.demographics.age_ranges.length * 0.2;
  }
  
  if (definition.custom_segments?.keywords) {
    // Reduce size based on keyword specificity
    baseSize *= Math.max(0.1, 1 - (definition.custom_segments.keywords.length * 0.05));
  }
  
  return Math.floor(baseSize);
}

function analyzeAudienceOverlap(definition: any): any {
  // Placeholder overlap analysis
  return {
    interests_overlap: 0.15,
    demographics_overlap: 0.25,
    keywords_overlap: 0.10,
    overall_uniqueness: 0.75
  };
}

function generateAudienceRecommendations(definition: any): string[] {
  const recommendations = [];
  
  if (definition.custom_segments?.keywords?.length > 20) {
    recommendations.push('Consider reducing keyword count for broader reach');
  }
  
  if (!definition.demographics?.age_ranges) {
    recommendations.push('Add age targeting to improve relevance');
  }
  
  if (!definition.demographics?.locations) {
    recommendations.push('Add location targeting for Malaysia market');
  }
  
  if (definition.interests?.length < 3) {
    recommendations.push('Add more interest categories to expand reach');
  }
  
  return recommendations;
}

export default audienceRoutes;
