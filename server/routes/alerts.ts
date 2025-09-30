import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { createAlertSchema } from '../../lib/validation';

const alertRoutes: FastifyPluginAsync = async (fastify) => {
  // Get alerts
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          status: { type: 'string' },
          severity: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { account_id, status, severity, limit, offset } = request.query as any;
    
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
    
    if (severity) {
      whereClause += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        id,
        account_id,
        alert_type,
        entity_type,
        entity_id,
        entity_name,
        message,
        severity,
        status,
        triggered_at,
        resolved_at,
        created_at
      FROM alerts
      WHERE ${whereClause}
      ORDER BY triggered_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { alerts: result.rows };
  });

  // Create alert rule
  fastify.post('/rules', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          name: { type: 'string' },
          alert_type: { type: 'string' },
          entity_type: { type: 'string' },
          condition_json: { type: 'object' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          notification_channels: { type: 'array', items: { type: 'string' } }
        },
        required: ['account_id', 'name', 'alert_type', 'entity_type', 'condition_json', 'severity']
      }
    }
  }, async (request, reply) => {
    const alertRuleData = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        INSERT INTO alert_rules (
          account_id, name, alert_type, entity_type, condition_json, 
          severity, notification_channels, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        alertRuleData.account_id,
        alertRuleData.name,
        alertRuleData.alert_type,
        alertRuleData.entity_type,
        JSON.stringify(alertRuleData.condition_json),
        alertRuleData.severity,
        JSON.stringify(alertRuleData.notification_channels || []),
        'active'
      ]);
      
      const alertRule = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        alertRuleData.account_id,
        'alert_rule',
        alertRule.id,
        'create',
        JSON.stringify(alertRule)
      ]);
      
      return reply.code(201).send(alertRule);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Alert rule creation failed',
        message: error.message
      });
    }
  });

  // Get alert rules
  fastify.get('/rules', {
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
        ar.*,
        COUNT(DISTINCT a.id) as alert_count
      FROM alert_rules ar
      LEFT JOIN alerts a ON ar.id = a.rule_id
      WHERE ${whereClause}
      GROUP BY ar.id
      ORDER BY ar.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { alert_rules: result.rows };
  });

  // Update alert rule
  fastify.put('/rules/:ruleId', {
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
          condition_json: { type: 'object' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          notification_channels: { type: 'array', items: { type: 'string' } },
          status: { type: 'string', enum: ['active', 'paused'] }
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
        'SELECT * FROM alert_rules WHERE id = $1',
        [ruleId]
      );
      
      if (currentResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Alert rule not found'
        });
      }
      
      const currentRule = currentResult.rows[0];
      
      // Build update query
      const setParts = [];
      const values = [];
      let paramIndex = 1;
      
      Object.entries(updates).forEach(([key, value]) => {
        if (key === 'condition_json' || key === 'notification_channels') {
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
      
      values.push(ruleId);
      
      const result = await query(`
        UPDATE alert_rules 
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
        'alert_rule',
        ruleId,
        'update',
        JSON.stringify(currentRule),
        JSON.stringify(updatedRule)
      ]);
      
      return updatedRule;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Alert rule update failed',
        message: error.message
      });
    }
  });

  // Delete alert rule
  fastify.delete('/rules/:ruleId', {
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
        'DELETE FROM alert_rules WHERE id = $1 RETURNING *',
        [ruleId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Alert rule not found'
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
        'alert_rule',
        ruleId,
        'delete',
        JSON.stringify(deletedRule)
      ]);
      
      return { message: 'Alert rule deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Alert rule deletion failed',
        message: error.message
      });
    }
  });

  // Mark alert as resolved
  fastify.post('/:alertId/resolve', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          alertId: { type: 'string' }
        },
        required: ['alertId']
      },
      body: {
        type: 'object',
        properties: {
          resolution_note: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { alertId } = request.params as any;
    const { resolution_note } = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        UPDATE alerts 
        SET status = 'resolved', resolved_at = NOW(), resolution_note = $1, updated_at = NOW()
        WHERE id = $2 AND status = 'active'
        RETURNING *
      `, [resolution_note || null, alertId]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Alert not found or already resolved'
        });
      }
      
      const resolvedAlert = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        resolvedAlert.account_id,
        'alert',
        alertId,
        'resolve',
        JSON.stringify({ resolution_note, resolved_by: userId })
      ]);
      
      return resolvedAlert;
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Alert resolution failed',
        message: error.message
      });
    }
  });

  // Bulk resolve alerts
  fastify.post('/bulk-resolve', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          alert_ids: { type: 'array', items: { type: 'string' } },
          resolution_note: { type: 'string' }
        },
        required: ['alert_ids']
      }
    }
  }, async (request, reply) => {
    const { alert_ids, resolution_note } = request.body as any;
    const userId = request.user.userId;
    
    const results = [];
    
    for (const alertId of alert_ids) {
      try {
        const result = await query(`
          UPDATE alerts 
          SET status = 'resolved', resolved_at = NOW(), resolution_note = $1, updated_at = NOW()
          WHERE id = $2 AND status = 'active'
          RETURNING *
        `, [resolution_note || null, alertId]);
        
        if (result.rows.length > 0) {
          results.push({
            alert_id: alertId,
            status: 'success'
          });
        } else {
          results.push({
            alert_id: alertId,
            status: 'error',
            message: 'Alert not found or already resolved'
          });
        }
        
      } catch (error: any) {
        results.push({
          alert_id: alertId,
          status: 'error',
          message: error.message
        });
      }
    }
    
    return {
      results,
      summary: {
        total: alert_ids.length,
        success: results.filter(r => r.status === 'success').length,
        errors: results.filter(r => r.status === 'error').length
      }
    };
  });

  // Get alert details
  fastify.get('/:alertId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          alertId: { type: 'string' }
        },
        required: ['alertId']
      }
    }
  }, async (request, reply) => {
    const { alertId } = request.params as any;
    
    const result = await query(`
      SELECT 
        a.*,
        ar.name as rule_name,
        ar.condition_json as rule_condition
      FROM alerts a
      LEFT JOIN alert_rules ar ON a.rule_id = ar.id
      WHERE a.id = $1
    `, [alertId]);
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Alert not found'
      });
    }
    
    return result.rows[0];
  });

  // Test alert rule
  fastify.post('/rules/:ruleId/test', {
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
    
    try {
      // Get alert rule
      const ruleResult = await query(
        'SELECT * FROM alert_rules WHERE id = $1',
        [ruleId]
      );
      
      if (ruleResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Alert rule not found'
        });
      }
      
      const rule = ruleResult.rows[0];
      
      // Simulate alert rule evaluation
      const testResults = await simulateAlertRule(rule);
      
      return {
        rule: {
          id: rule.id,
          name: rule.name,
          alert_type: rule.alert_type,
          entity_type: rule.entity_type,
          condition: rule.condition_json
        },
        test_results: testResults,
        summary: {
          entities_tested: testResults.length,
          alerts_triggered: testResults.filter(r => r.would_trigger).length
        }
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Alert rule test failed',
        message: error.message
      });
    }
  });

  // Get alert statistics
  fastify.get('/stats/:accountId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          accountId: { type: 'string' }
        },
        required: ['accountId']
      },
      querystring: {
        type: 'object',
        properties: {
          days: { type: 'number', default: 30 }
        }
      }
    }
  }, async (request, reply) => {
    const { accountId } = request.params as any;
    const { days } = request.query as any;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get alert statistics
    const statsResult = await query(`
      SELECT 
        alert_type,
        severity,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_count
      FROM alerts
      WHERE account_id = $1 AND triggered_at >= $2
      GROUP BY alert_type, severity
      ORDER BY count DESC
    `, [accountId, startDate]);
    
    // Get trend data
    const trendResult = await query(`
      SELECT 
        DATE(triggered_at) as date,
        COUNT(*) as alert_count
      FROM alerts
      WHERE account_id = $1 AND triggered_at >= $2
      GROUP BY DATE(triggered_at)
      ORDER BY date
    `, [accountId, startDate]);
    
    return {
      account_id: accountId,
      period_days: days,
      statistics: statsResult.rows,
      trend: trendResult.rows,
      summary: {
        total_alerts: statsResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        resolved_alerts: statsResult.rows.reduce((sum, row) => sum + parseInt(row.resolved_count), 0)
      }
    };
  });
};

// Helper functions
async function simulateAlertRule(rule: any): Promise<any[]> {
  const results = [];
  
  // Get sample entities based on rule entity type
  const tableName = getEntityTableName(rule.entity_type);
  const entityResult = await query(
    `SELECT * FROM ${tableName} WHERE account_id = $1 LIMIT 10`,
    [rule.account_id]
  );
  
  const entities = entityResult.rows;
  
  for (const entity of entities) {
    const wouldTrigger = evaluateAlertCondition(rule.condition_json, entity, rule.alert_type);
    
    results.push({
      entity_id: entity.local_id || entity.id,
      entity_name: entity.name,
      entity_type: rule.entity_type,
      would_trigger: wouldTrigger,
      current_metrics: extractEntityMetrics(entity),
      alert_type: rule.alert_type
    });
  }
  
  return results;
}

function getEntityTableName(entityType: string): string {
  const tableMap = {
    'campaign': 'campaigns',
    'ad_group': 'ad_groups',
    'ad': 'ads',
    'account': 'accounts'
  };
  return tableMap[entityType] || 'campaigns';
}

function evaluateAlertCondition(condition: any, entity: any, alertType: string): boolean {
  // Placeholder alert condition evaluation
  // In real implementation, this would evaluate based on actual performance metrics
  
  switch (alertType) {
    case 'spend_spike':
      return Math.random() > 0.9; // 10% chance
    case 'zero_conversions':
      return Math.random() > 0.8; // 20% chance
    case 'cpa_drift':
      return Math.random() > 0.85; // 15% chance
    case 'learning_stuck':
      return Math.random() > 0.95; // 5% chance
    case 'budget_exhausted':
      return Math.random() > 0.9; // 10% chance
    default:
      return Math.random() > 0.9; // 10% chance for unknown types
  }
}

function extractEntityMetrics(entity: any): any {
  // Placeholder metrics extraction
  return {
    spend: Math.random() * 1000,
    conversions: Math.random() * 20,
    cpa: Math.random() * 100,
    roas: Math.random() * 5,
    impressions: Math.random() * 10000,
    clicks: Math.random() * 500
  };
}

export default alertRoutes;
