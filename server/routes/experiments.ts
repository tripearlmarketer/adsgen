import { FastifyPluginAsync } from 'fastify';
import { query, withTransaction } from '../../lib/db';
import { createExperimentSchema } from '../../lib/validation';

const experimentRoutes: FastifyPluginAsync = async (fastify) => {
  // Get experiments
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
        id,
        account_id,
        name,
        hypothesis,
        metric,
        min_runtime_days,
        variant_json,
        status,
        start_date,
        end_date,
        winner_variant,
        confidence_level,
        created_at,
        updated_at
      FROM experiments
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { experiments: result.rows };
  });

  // Create experiment
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          ...createExperimentSchema.shape
        },
        required: ['account_id', 'name', 'hypothesis', 'metric', 'variant_json']
      }
    }
  }, async (request, reply) => {
    const experimentData = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        INSERT INTO experiments (
          account_id, name, hypothesis, metric, min_runtime_days, variant_json, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        experimentData.account_id,
        experimentData.name,
        experimentData.hypothesis,
        experimentData.metric,
        experimentData.min_runtime_days || 5,
        JSON.stringify(experimentData.variant_json),
        'draft'
      ]);
      
      const experiment = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        experimentData.account_id,
        'experiment',
        experiment.id,
        'create',
        JSON.stringify(experiment)
      ]);
      
      return reply.code(201).send(experiment);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Experiment creation failed',
        message: error.message
      });
    }
  });

  // Get experiment details
  fastify.get('/:experimentId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' }
        },
        required: ['experimentId']
      }
    }
  }, async (request, reply) => {
    const { experimentId } = request.params as any;
    
    const result = await query(`
      SELECT * FROM experiments WHERE id = $1
    `, [experimentId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Experiment not found'
      });
    }
    
    const experiment = result.rows[0];
    
    // Get experiment performance data if running
    if (experiment.status === 'running') {
      const performanceData = await getExperimentPerformance(experimentId);
      experiment.performance = performanceData;
    }
    
    return experiment;
  });

  // Start experiment
  fastify.post('/:experimentId/start', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' }
        },
        required: ['experimentId']
      },
      body: {
        type: 'object',
        properties: {
          campaign_ids: { type: 'array', items: { type: 'string' } }
        },
        required: ['campaign_ids']
      }
    }
  }, async (request, reply) => {
    const { experimentId } = request.params as any;
    const { campaign_ids } = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await withTransaction(async (client) => {
        // Get experiment
        const expResult = await client.query(
          'SELECT * FROM experiments WHERE id = $1 AND status = $2',
          [experimentId, 'draft']
        );
        
        if (expResult.rows.length === 0) {
          throw new Error('Experiment not found or not in draft status');
        }
        
        const experiment = expResult.rows[0];
        
        // Validate minimum traffic requirements
        const trafficValidation = await validateExperimentTraffic(campaign_ids);
        if (!trafficValidation.valid) {
          throw new Error(`Insufficient traffic: ${trafficValidation.message}`);
        }
        
        // Create experiment variants (duplicate campaigns/ad groups)
        const variantResults = await createExperimentVariants(
          client,
          experiment,
          campaign_ids,
          userId
        );
        
        // Update experiment status
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + experiment.min_runtime_days);
        
        const updatedResult = await client.query(`
          UPDATE experiments 
          SET status = $1, start_date = $2, end_date = $3, updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `, ['running', startDate, endDate, experimentId]);
        
        const updatedExperiment = updatedResult.rows[0];
        
        // Log audit trail
        await client.query(`
          INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          experiment.account_id,
          'experiment',
          experimentId,
          'start',
          JSON.stringify({
            ...updatedExperiment,
            variant_campaigns: variantResults
          })
        ]);
        
        return {
          experiment: updatedExperiment,
          variants: variantResults
        };
      });
      
      return result;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Experiment start failed',
        message: error.message
      });
    }
  });

  // Stop experiment
  fastify.post('/:experimentId/stop', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' }
        },
        required: ['experimentId']
      },
      body: {
        type: 'object',
        properties: {
          reason: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { experimentId } = request.params as any;
    const { reason } = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await withTransaction(async (client) => {
        // Get experiment
        const expResult = await client.query(
          'SELECT * FROM experiments WHERE id = $1 AND status = $2',
          [experimentId, 'running']
        );
        
        if (expResult.rows.length === 0) {
          throw new Error('Experiment not found or not running');
        }
        
        const experiment = expResult.rows[0];
        
        // Calculate final results
        const finalResults = await calculateExperimentResults(experimentId);
        
        // Update experiment status
        const updatedResult = await client.query(`
          UPDATE experiments 
          SET status = $1, end_date = NOW(), winner_variant = $2, confidence_level = $3, updated_at = NOW()
          WHERE id = $4
          RETURNING *
        `, [
          'completed',
          finalResults.winner,
          finalResults.confidence,
          experimentId
        ]);
        
        const updatedExperiment = updatedResult.rows[0];
        
        // Log audit trail
        await client.query(`
          INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          experiment.account_id,
          'experiment',
          experimentId,
          'stop',
          JSON.stringify({
            ...updatedExperiment,
            stop_reason: reason,
            final_results: finalResults
          })
        ]);
        
        return {
          experiment: updatedExperiment,
          results: finalResults
        };
      });
      
      return result;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Experiment stop failed',
        message: error.message
      });
    }
  });

  // Promote winner
  fastify.post('/:experimentId/promote', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' }
        },
        required: ['experimentId']
      },
      body: {
        type: 'object',
        properties: {
          variant: { type: 'string' }
        },
        required: ['variant']
      }
    }
  }, async (request, reply) => {
    const { experimentId } = request.params as any;
    const { variant } = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await withTransaction(async (client) => {
        // Get experiment
        const expResult = await client.query(
          'SELECT * FROM experiments WHERE id = $1 AND status = $2',
          [experimentId, 'completed']
        );
        
        if (expResult.rows.length === 0) {
          throw new Error('Experiment not found or not completed');
        }
        
        const experiment = expResult.rows[0];
        
        // Apply winning variant changes to original campaigns
        const promotionResults = await promoteWinningVariant(
          client,
          experiment,
          variant,
          userId
        );
        
        // Archive experiment
        await client.query(
          'UPDATE experiments SET status = $1, updated_at = NOW() WHERE id = $2',
          ['archived', experimentId]
        );
        
        // Log audit trail
        await client.query(`
          INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          userId,
          experiment.account_id,
          'experiment',
          experimentId,
          'promote',
          JSON.stringify({
            promoted_variant: variant,
            changes_applied: promotionResults
          })
        ]);
        
        return {
          message: 'Winner promoted successfully',
          promoted_variant: variant,
          changes_applied: promotionResults
        };
      });
      
      return result;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Winner promotion failed',
        message: error.message
      });
    }
  });

  // Get experiment results
  fastify.get('/:experimentId/results', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' }
        },
        required: ['experimentId']
      }
    }
  }, async (request, reply) => {
    const { experimentId } = request.params as any;
    
    try {
      const experiment = await query(
        'SELECT * FROM experiments WHERE id = $1',
        [experimentId]
      );
      
      if (experiment.rows.length === 0) {
        return reply.code(404).send({
          error: 'Experiment not found'
        });
      }
      
      const results = await getExperimentResults(experimentId);
      
      return {
        experiment: experiment.rows[0],
        results
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Failed to get experiment results',
        message: error.message
      });
    }
  });

  // Delete experiment
  fastify.delete('/:experimentId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          experimentId: { type: 'string' }
        },
        required: ['experimentId']
      }
    }
  }, async (request, reply) => {
    const { experimentId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(
        'DELETE FROM experiments WHERE id = $1 AND status IN ($2, $3) RETURNING *',
        [experimentId, 'draft', 'archived']
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Experiment not found or cannot be deleted'
        });
      }
      
      const deletedExperiment = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedExperiment.account_id,
        'experiment',
        experimentId,
        'delete',
        JSON.stringify(deletedExperiment)
      ]);
      
      return { message: 'Experiment deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Experiment deletion failed',
        message: error.message
      });
    }
  });
};

// Helper functions
async function validateExperimentTraffic(campaignIds: string[]): Promise<{valid: boolean, message: string}> {
  // Placeholder validation - check if campaigns have sufficient traffic
  const result = await query(`
    SELECT COUNT(*) as campaign_count
    FROM campaigns 
    WHERE local_id = ANY($1) AND status = 'enabled'
  `, [campaignIds]);
  
  const enabledCampaigns = parseInt(result.rows[0].campaign_count);
  
  if (enabledCampaigns === 0) {
    return { valid: false, message: 'No enabled campaigns selected' };
  }
  
  if (campaignIds.length < 2) {
    return { valid: false, message: 'At least 2 campaigns required for experiment' };
  }
  
  return { valid: true, message: 'Traffic validation passed' };
}

async function createExperimentVariants(
  client: any,
  experiment: any,
  campaignIds: string[],
  userId: string
): Promise<any[]> {
  const variants = [];
  const variantDef = experiment.variant_json;
  
  // Create control and variant campaigns
  for (const [variantName, variantConfig] of Object.entries(variantDef)) {
    const variantCampaigns = [];
    
    for (const campaignId of campaignIds) {
      // Get original campaign
      const originalResult = await client.query(
        'SELECT * FROM campaigns WHERE local_id = $1',
        [campaignId]
      );
      
      if (originalResult.rows.length === 0) continue;
      
      const original = originalResult.rows[0];
      
      // Create variant campaign
      const variantName_clean = variantName.replace(/[^a-zA-Z0-9]/g, '_');
      const variantCampaignResult = await client.query(`
        INSERT INTO campaigns (
          account_id, name, objective, status, daily_budget_myr,
          start_date, end_date, bidding_strategy, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        original.account_id,
        `${original.name}_${variantName_clean}_exp`,
        original.objective,
        'paused', // Start paused
        original.daily_budget_myr,
        original.start_date,
        original.end_date,
        original.bidding_strategy,
        `Experiment variant: ${variantName}`
      ]);
      
      const variantCampaign = variantCampaignResult.rows[0];
      
      // Apply variant changes
      if (variantConfig.changes) {
        const changes = variantConfig.changes;
        const setParts = [];
        const values = [];
        let paramIndex = 1;
        
        Object.entries(changes).forEach(([key, value]) => {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        });
        
        if (setParts.length > 0) {
          values.push(variantCampaign.local_id);
          await client.query(`
            UPDATE campaigns 
            SET ${setParts.join(', ')}, updated_at = NOW()
            WHERE local_id = $${paramIndex}
          `, values);
        }
      }
      
      variantCampaigns.push(variantCampaign);
    }
    
    variants.push({
      variant_name: variantName,
      campaigns: variantCampaigns
    });
  }
  
  return variants;
}

async function calculateExperimentResults(experimentId: string): Promise<any> {
  // Placeholder results calculation
  // In real implementation, this would analyze performance data
  
  const controlMetrics = {
    impressions: Math.floor(Math.random() * 100000),
    clicks: Math.floor(Math.random() * 5000),
    conversions: Math.floor(Math.random() * 100),
    cost: Math.random() * 10000
  };
  
  const variantMetrics = {
    impressions: Math.floor(Math.random() * 100000),
    clicks: Math.floor(Math.random() * 5000),
    conversions: Math.floor(Math.random() * 100),
    cost: Math.random() * 10000
  };
  
  // Calculate rates
  controlMetrics.ctr = (controlMetrics.clicks / controlMetrics.impressions) * 100;
  controlMetrics.cvr = (controlMetrics.conversions / controlMetrics.clicks) * 100;
  controlMetrics.cpa = controlMetrics.cost / controlMetrics.conversions;
  
  variantMetrics.ctr = (variantMetrics.clicks / variantMetrics.impressions) * 100;
  variantMetrics.cvr = (variantMetrics.conversions / variantMetrics.clicks) * 100;
  variantMetrics.cpa = variantMetrics.cost / variantMetrics.conversions;
  
  // Determine winner (simplified)
  const winner = variantMetrics.cpa < controlMetrics.cpa ? 'variant_a' : 'control';
  const confidence = Math.random() * 40 + 60; // 60-100% confidence
  
  return {
    winner,
    confidence: Math.round(confidence * 100) / 100,
    control: controlMetrics,
    variant_a: variantMetrics,
    statistical_significance: confidence > 95
  };
}

async function promoteWinningVariant(
  client: any,
  experiment: any,
  variant: string,
  userId: string
): Promise<any[]> {
  const changes = [];
  
  // Get variant definition
  const variantDef = experiment.variant_json[variant];
  if (!variantDef || !variantDef.changes) {
    return changes;
  }
  
  // Apply changes to original campaigns
  // This is a simplified implementation
  const variantChanges = variantDef.changes;
  
  changes.push({
    entity_type: 'campaign',
    changes_applied: variantChanges,
    message: `Applied ${variant} changes to original campaigns`
  });
  
  return changes;
}

async function getExperimentPerformance(experimentId: string): Promise<any> {
  // Placeholder performance data
  return {
    control: {
      impressions: Math.floor(Math.random() * 50000),
      clicks: Math.floor(Math.random() * 2500),
      conversions: Math.floor(Math.random() * 50),
      cost: Math.random() * 5000
    },
    variant_a: {
      impressions: Math.floor(Math.random() * 50000),
      clicks: Math.floor(Math.random() * 2500),
      conversions: Math.floor(Math.random() * 50),
      cost: Math.random() * 5000
    }
  };
}

async function getExperimentResults(experimentId: string): Promise<any> {
  // Get experiment
  const expResult = await query(
    'SELECT * FROM experiments WHERE id = $1',
    [experimentId]
  );
  
  if (expResult.rows.length === 0) {
    throw new Error('Experiment not found');
  }
  
  const experiment = expResult.rows[0];
  
  if (experiment.status === 'running') {
    return await getExperimentPerformance(experimentId);
  } else if (experiment.status === 'completed') {
    return await calculateExperimentResults(experimentId);
  } else {
    return { message: 'No results available for draft experiments' };
  }
}

export default experimentRoutes;
