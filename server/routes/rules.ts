import { FastifyPluginAsync } from 'fastify';
import { query, withTransaction } from '../../lib/db';
import { createRuleSchema } from '../../lib/validation';

const ruleRoutes: FastifyPluginAsync = async (fastify) => {
  // Get automation rules
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          status: { type: 'string' },
          scope: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { account_id, status, scope, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    // Include global template rules and account-specific rules
    if (account_id) {
      whereClause += ` AND (account_id = $${paramIndex} OR account_id IS NULL)`;
      params.push(account_id);
      paramIndex++;
    }
    
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (scope) {
      whereClause += ` AND scope = $${paramIndex}`;
      params.push(scope);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        id,
        account_id,
        name,
        scope,
        json_condition,
        json_actions,
        schedule_cron,
        status,
        last_run_at,
        next_run_at,
        created_at,
        updated_at
      FROM rules
      WHERE ${whereClause}
      ORDER BY account_id IS NULL DESC, name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { rules: result.rows };
  });

  // Create automation rule
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          ...createRuleSchema.shape
        },
        required: ['account_id', 'name', 'scope', 'json_condition', 'json_actions']
      }
    }
  }, async (request, reply) => {
    const ruleData = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Calculate next run time based on cron schedule
      const nextRunAt = ruleData.schedule_cron ? 
        calculateNextRunTime(ruleData.schedule_cron) : null;
      
      const result = await query(`
        INSERT INTO rules (
          account_id, name, scope, json_condition, json_actions,
          schedule_cron, status, next_run_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        ruleData.account_id,
        ruleData.name,
        ruleData.scope,
        JSON.stringify(ruleData.json_condition),
        JSON.stringify(ruleData.json_actions),
        ruleData.schedule_cron || null,
        'active',
        nextRunAt
      ]);
      
      const rule = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        ruleData.account_id,
        'rule',
        rule.id,
        'create',
        JSON.stringify(rule)
      ]);
      
      return reply.code(201).send(rule);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Rule creation failed',
        message: error.message
      });
    }
  });

  // Get rule details
  fastify.get('/:ruleId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' }
        },
        required: ['ruleId']
      }
    }
  }, async (request, reply) => {
    const { ruleId } = request.params as any;
    
    const result = await query(`
      SELECT 
        r.*,
        COUNT(DISTINCT jq.id) as execution_count
      FROM rules r
      LEFT JOIN job_queue jq ON r.id::text = jq.payload->>'rule_id'
      WHERE r.id = $1
      GROUP BY r.id
    `, [ruleId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Rule not found'
      });
    }
    
    return result.rows[0];
  });

  // Update rule
  fastify.put('/:ruleId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' }
        },
        required: ['ruleId']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          json_condition: { type: 'object' },
          json_actions: { type: 'array' },
          schedule_cron: { type: 'string' },
          status: { type: 'string', enum: ['active', 'paused', 'archived'] }
        }
      }
    }
  }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const updates = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get current rule
      const currentResult = await query(
        'SELECT * FROM rules WHERE id = $1',
        [ruleId]
      );
      
      if (currentResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Rule not found'
        });
      }
      
      const currentRule = currentResult.rows[0];
      
      // Build update query
      const setParts = [];
      const values = [];
      let paramIndex = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'json_condition' || key === 'json_actions') {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(JSON.stringify(value));
        } else {
          setParts.push(`${key} = $${paramIndex}`);
          values.push(value);
        }
        paramIndex++;
      });
      
      // Recalculate next run time if schedule changed
      if (updates.schedule_cron) {
        const nextRunAt = calculateNextRunTime(updates.schedule_cron);
        setParts.push(`next_run_at = $${paramIndex}`);
        values.push(nextRunAt);
        paramIndex++;
      }
      
      if (setParts.length === 0) {
        return reply.code(400).send({
          error: 'No valid updates provided'
        });
      }
      
      values.push(ruleId);
      
      const result = await query(`
        UPDATE rules 
        SET ${setParts.join(', ')}, updated_at = NOW()
        WHERE id = $${paramIndex}
        RETURNING *
      `, values);
      
      const updatedRule = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json, after_json)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        userId,
        currentRule.account_id,
        'rule',
        ruleId,
        'update',
        JSON.stringify(currentRule),
        JSON.stringify(updatedRule)
      ]);
      
      return updatedRule;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Rule update failed',
        message: error.message
      });
    }
  });

  // Delete rule
  fastify.delete('/:ruleId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' }
        },
        required: ['ruleId']
      }
    }
  }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(
        'DELETE FROM rules WHERE id = $1 RETURNING *',
        [ruleId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Rule not found'
        });
      }
      
      const deletedRule = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedRule.account_id,
        'rule',
        ruleId,
        'delete',
        JSON.stringify(deletedRule)
      ]);
      
      return { message: 'Rule deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Rule deletion failed',
        message: error.message
      });
    }
  });

  // Test rule (dry run)
  fastify.post('/:ruleId/test', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' }
        },
        required: ['ruleId']
      },
      body: {
        type: 'object',
        properties: {
          entity_ids: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const { entity_ids } = request.body as any;
    
    try {
      // Get rule
      const ruleResult = await query(
        'SELECT * FROM rules WHERE id = $1',
        [ruleId]
      );
      
      if (ruleResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Rule not found'
        });
      }
      
      const rule = ruleResult.rows[0];
      
      // Simulate rule execution
      const testResults = await simulateRuleExecution(rule, entity_ids);
      
      return {
        rule: {
          id: rule.id,
          name: rule.name,
          scope: rule.scope,
          condition: rule.json_condition,
          actions: rule.json_actions
        },
        test_results: testResults,
        summary: {
          entities_tested: testResults.length,
          entities_affected: testResults.filter(r => r.would_trigger).length,
          total_actions: testResults.reduce((sum, r) => sum + (r.would_trigger ? r.actions.length : 0), 0)
        }
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Rule test failed',
        message: error.message
      });
    }
  });

  // Execute rule manually
  fastify.post('/:ruleId/execute', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' }
        },
        required: ['ruleId']
      },
      body: {
        type: 'object',
        properties: {
          dry_run: { type: 'boolean', default: false },
          entity_ids: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const { dry_run, entity_ids } = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get rule
      const ruleResult = await query(
        'SELECT * FROM rules WHERE id = $1',
        [ruleId]
      );
      
      if (ruleResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Rule not found'
        });
      }
      
      const rule = ruleResult.rows[0];
      
      if (dry_run) {
        // Dry run - simulate execution
        const testResults = await simulateRuleExecution(rule, entity_ids);
        
        return {
          dry_run: true,
          rule_id: ruleId,
          results: testResults,
          summary: {
            entities_tested: testResults.length,
            entities_affected: testResults.filter(r => r.would_trigger).length
          }
        };
      } else {
        // Actual execution - queue job
        const jobResult = await query(`
          INSERT INTO job_queue (account_id, job_type, payload, status)
          VALUES ($1, $2, $3, $4)
          RETURNING id
        `, [
          rule.account_id,
          'execute_rule',
          JSON.stringify({
            rule_id: ruleId,
            entity_ids: entity_ids || [],
            triggered_by: 'manual',
            user_id: userId
          }),
          'pending'
        ]);
        
        // Update rule last run time
        await query(
          'UPDATE rules SET last_run_at = NOW() WHERE id = $1',
          [ruleId]
        );
        
        return {
          dry_run: false,
          rule_id: ruleId,
          job_id: jobResult.rows[0].id,
          message: 'Rule execution queued successfully'
        };
      }
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Rule execution failed',
        message: error.message
      });
    }
  });

  // Get rule execution history
  fastify.get('/:ruleId/history', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          ruleId: { type: 'string' }
        },
        required: ['ruleId']
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 20 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { ruleId } = request.params as any;
    const { limit, offset } = request.query as any;
    
    const result = await query(`
      SELECT 
        id,
        job_type,
        payload,
        status,
        error_message,
        scheduled_at,
        started_at,
        completed_at,
        created_at
      FROM job_queue
      WHERE job_type = 'execute_rule' 
        AND payload->>'rule_id' = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [ruleId, limit, offset]);
    
    return { executions: result.rows };
  });

  // Clone rule from template
  fastify.post('/clone/:templateId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          templateId: { type: 'string' }
        },
        required: ['templateId']
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
    const { templateId } = request.params as any;
    const { account_id, name } = request.body as any;
    const userId = request.user.userId;
    
    try {
      // Get template rule
      const templateResult = await query(
        'SELECT * FROM rules WHERE id = $1',
        [templateId]
      );
      
      if (templateResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Template rule not found'
        });
      }
      
      const template = templateResult.rows[0];
      
      // Create new rule from template
      const nextRunAt = template.schedule_cron ? 
        calculateNextRunTime(template.schedule_cron) : null;
      
      const result = await query(`
        INSERT INTO rules (
          account_id, name, scope, json_condition, json_actions,
          schedule_cron, status, next_run_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        account_id,
        name,
        template.scope,
        template.json_condition,
        template.json_actions,
        template.schedule_cron,
        'active',
        nextRunAt
      ]);
      
      const clonedRule = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        account_id,
        'rule',
        clonedRule.id,
        'clone',
        JSON.stringify({ ...clonedRule, cloned_from: templateId })
      ]);
      
      return reply.code(201).send(clonedRule);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Rule cloning failed',
        message: error.message
      });
    }
  });
};

// Helper functions
function calculateNextRunTime(cronExpression: string): Date | null {
  // Placeholder implementation - would use a proper cron parser
  // For now, return next hour
  const nextRun = new Date();
  nextRun.setHours(nextRun.getHours() + 1);
  nextRun.setMinutes(0);
  nextRun.setSeconds(0);
  return nextRun;
}

async function simulateRuleExecution(rule: any, entityIds?: string[]): Promise<any[]> {
  const results = [];
  
  // Get entities to test based on rule scope
  let entities = [];
  
  if (entityIds && entityIds.length > 0) {
    // Test specific entities
    const tableName = getScopeTableName(rule.scope);
    const result = await query(
      `SELECT * FROM ${tableName} WHERE ${getScopeIdColumn(rule.scope)} = ANY($1)`,
      [entityIds]
    );
    entities = result.rows;
  } else {
    // Test sample entities
    const tableName = getScopeTableName(rule.scope);
    const result = await query(
      `SELECT * FROM ${tableName} WHERE account_id = $1 LIMIT 10`,
      [rule.account_id]
    );
    entities = result.rows;
  }
  
  for (const entity of entities) {
    const wouldTrigger = evaluateRuleCondition(rule.json_condition, entity);
    
    results.push({
      entity_id: entity[getScopeIdColumn(rule.scope)],
      entity_name: entity.name,
      entity_type: rule.scope,
      would_trigger: wouldTrigger,
      actions: wouldTrigger ? rule.json_actions : [],
      current_metrics: extractEntityMetrics(entity)
    });
  }
  
  return results;
}

function getScopeTableName(scope: string): string {
  const tableMap = {
    'campaign': 'campaigns',
    'ad_group': 'ad_groups',
    'ad': 'ads',
    'account': 'accounts'
  };
  return tableMap[scope] || 'campaigns';
}

function getScopeIdColumn(scope: string): string {
  const columnMap = {
    'campaign': 'local_id',
    'ad_group': 'local_id',
    'ad': 'local_id',
    'account': 'id'
  };
  return columnMap[scope] || 'local_id';
}

function evaluateRuleCondition(condition: any, entity: any): boolean {
  // Placeholder condition evaluation logic
  // In real implementation, this would evaluate the condition against entity metrics
  
  // Simulate some conditions
  if (condition.spend_gt && Math.random() * 1000 > condition.spend_gt) {
    return true;
  }
  
  if (condition.conversions_lt && Math.random() * 10 < condition.conversions_lt) {
    return true;
  }
  
  return Math.random() > 0.7; // 30% chance to trigger for demo
}

function extractEntityMetrics(entity: any): any {
  // Placeholder metrics extraction
  return {
    spend: Math.random() * 1000,
    conversions: Math.random() * 20,
    cpa: Math.random() * 100,
    roas: Math.random() * 5
  };
}

export default ruleRoutes;
