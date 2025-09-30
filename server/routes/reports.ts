import { FastifyPluginAsync } from 'fastify';
import { query } from '../../lib/db';
import { createReportSchema } from '../../lib/validation';
import crypto from 'crypto';

const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // Get saved reports
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      }
    }
  }, async (request, reply) => {
    const { account_id, limit, offset } = request.query as any;
    
    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;
    
    if (account_id) {
      whereClause += ` AND account_id = $${paramIndex}`;
      params.push(account_id);
      paramIndex++;
    }
    
    params.push(limit, offset);
    
    const result = await query(`
      SELECT 
        id,
        account_id,
        name,
        params_json,
        last_run_at,
        share_token,
        created_at,
        updated_at
      FROM reports
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return { reports: result.rows };
  });

  // Create saved report
  fastify.post('/', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          ...createReportSchema.shape
        },
        required: ['account_id', 'name', 'params_json']
      }
    }
  }, async (request, reply) => {
    const reportData = request.body as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(`
        INSERT INTO reports (account_id, name, params_json)
        VALUES ($1, $2, $3)
        RETURNING *
      `, [
        reportData.account_id,
        reportData.name,
        JSON.stringify(reportData.params_json)
      ]);
      
      const report = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        reportData.account_id,
        'report',
        report.id,
        'create',
        JSON.stringify(report)
      ]);
      
      return reply.code(201).send(report);
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Report creation failed',
        message: error.message
      });
    }
  });

  // Run report
  fastify.post('/run', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          params: {
            type: 'object',
            properties: {
              date_range: { type: 'string' },
              start_date: { type: 'string' },
              end_date: { type: 'string' },
              breakdown: { type: 'string' },
              metrics: { type: 'array', items: { type: 'string' } },
              filters: { type: 'object' }
            },
            required: ['date_range', 'metrics']
          }
        },
        required: ['account_id', 'params']
      }
    }
  }, async (request, reply) => {
    const { account_id, params } = request.body as any;
    
    try {
      // Generate report data
      const reportData = await generateReportData(account_id, params);
      
      return {
        account_id,
        params,
        data: reportData,
        generated_at: new Date().toISOString()
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Report generation failed',
        message: error.message
      });
    }
  });

  // Get saved report details
  fastify.get('/:reportId', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string' }
        },
        required: ['reportId']
      }
    }
  }, async (request, reply) => {
    const { reportId } = request.params as any;
    
    const result = await query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );
    
    if (result.rows.length === 0) {
      return reply.code(404).send({
        error: 'Report not found'
      });
    }
    
    return result.rows[0];
  });

  // Run saved report
  fastify.post('/:reportId/run', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string' }
        },
        required: ['reportId']
      }
    }
  }, async (request, reply) => {
    const { reportId } = request.params as any;
    
    try {
      // Get saved report
      const reportResult = await query(
        'SELECT * FROM reports WHERE id = $1',
        [reportId]
      );
      
      if (reportResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Report not found'
        });
      }
      
      const report = reportResult.rows[0];
      
      // Generate report data
      const reportData = await generateReportData(report.account_id, report.params_json);
      
      // Update last run time
      await query(
        'UPDATE reports SET last_run_at = NOW() WHERE id = $1',
        [reportId]
      );
      
      return {
        report: {
          id: report.id,
          name: report.name,
          params: report.params_json
        },
        data: reportData,
        generated_at: new Date().toISOString()
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Report execution failed',
        message: error.message
      });
    }
  });

  // Export report
  fastify.get('/:reportId/export', {
    preHandler: [fastify.authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string' }
        },
        required: ['reportId']
      },
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['csv', 'xlsx'], default: 'csv' }
        }
      }
    }
  }, async (request, reply) => {
    const { reportId } = request.params as any;
    const { format } = request.query as any;
    
    try {
      // Get saved report
      const reportResult = await query(
        'SELECT * FROM reports WHERE id = $1',
        [reportId]
      );
      
      if (reportResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Report not found'
        });
      }
      
      const report = reportResult.rows[0];
      
      // Generate report data
      const reportData = await generateReportData(report.account_id, report.params_json);
      
      // Convert to requested format
      if (format === 'csv') {
        const csvData = convertToCSV(reportData);
        
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${report.name}.csv"`);
        
        return csvData;
      } else if (format === 'xlsx') {
        // For XLSX, you'd typically use a library like xlsx
        // This is a placeholder implementation
        return reply.code(501).send({
          error: 'XLSX export not implemented',
          message: 'Use CSV format for now'
        });
      }
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Report export failed',
        message: error.message
      });
    }
  });

  // Share report (generate public link)
  fastify.post('/:reportId/share', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string' }
        },
        required: ['reportId']
      }
    }
  }, async (request, reply) => {
    const { reportId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      // Generate share token
      const shareToken = crypto.randomBytes(32).toString('hex');
      
      const result = await query(`
        UPDATE reports 
        SET share_token = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [shareToken, reportId]);
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Report not found'
        });
      }
      
      const report = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, after_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        report.account_id,
        'report',
        reportId,
        'share',
        JSON.stringify({ share_token: shareToken })
      ]);
      
      const shareUrl = `${process.env.FRONTEND_URL}/reports/shared/${shareToken}`;
      
      return {
        share_token: shareToken,
        share_url: shareUrl,
        expires_at: null // No expiration for now
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Report sharing failed',
        message: error.message
      });
    }
  });

  // Access shared report (public endpoint)
  fastify.get('/shared/:shareToken', {
    schema: {
      params: {
        type: 'object',
        properties: {
          shareToken: { type: 'string' }
        },
        required: ['shareToken']
      }
    }
  }, async (request, reply) => {
    const { shareToken } = request.params as any;
    
    try {
      // Get report by share token
      const reportResult = await query(
        'SELECT * FROM reports WHERE share_token = $1',
        [shareToken]
      );
      
      if (reportResult.rows.length === 0) {
        return reply.code(404).send({
          error: 'Shared report not found or expired'
        });
      }
      
      const report = reportResult.rows[0];
      
      // Generate report data
      const reportData = await generateReportData(report.account_id, report.params_json);
      
      return {
        report: {
          name: report.name,
          params: report.params_json,
          last_run_at: report.last_run_at
        },
        data: reportData,
        generated_at: new Date().toISOString(),
        is_shared: true
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Shared report access failed',
        message: error.message
      });
    }
  });

  // Delete report
  fastify.delete('/:reportId', {
    preHandler: [fastify.authenticate, fastify.requireRole('manager')],
    schema: {
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string' }
        },
        required: ['reportId']
      }
    }
  }, async (request, reply) => {
    const { reportId } = request.params as any;
    const userId = request.user.userId;
    
    try {
      const result = await query(
        'DELETE FROM reports WHERE id = $1 RETURNING *',
        [reportId]
      );
      
      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Report not found'
        });
      }
      
      const deletedReport = result.rows[0];
      
      // Log audit trail
      await query(`
        INSERT INTO audit_logs (user_id, account_id, entity_type, entity_id, action, before_json)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        deletedReport.account_id,
        'report',
        reportId,
        'delete',
        JSON.stringify(deletedReport)
      ]);
      
      return { message: 'Report deleted successfully' };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Report deletion failed',
        message: error.message
      });
    }
  });

  // Get dashboard overview
  fastify.get('/dashboard/:accountId', {
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
          date_range: { type: 'string', default: 'last_7_days' }
        }
      }
    }
  }, async (request, reply) => {
    const { accountId } = request.params as any;
    const { date_range } = request.query as any;
    
    try {
      const dashboardData = await generateDashboardData(accountId, date_range);
      
      return {
        account_id: accountId,
        date_range,
        data: dashboardData,
        generated_at: new Date().toISOString()
      };
      
    } catch (error: any) {
      return reply.code(400).send({
        error: 'Dashboard data generation failed',
        message: error.message
      });
    }
  });
};

// Helper functions
async function generateReportData(accountId: string, params: any): Promise<any> {
  const { date_range, breakdown, metrics, filters } = params;
  
  // This is a placeholder implementation
  // In a real app, this would query actual performance data from Google Ads API
  
  const baseData = {
    summary: {
      impressions: Math.floor(Math.random() * 1000000),
      clicks: Math.floor(Math.random() * 50000),
      conversions: Math.floor(Math.random() * 1000),
      cost: Math.random() * 50000,
      ctr: 0,
      cvr: 0,
      cpa: 0,
      roas: 0
    },
    breakdown_data: []
  };
  
  // Calculate derived metrics
  baseData.summary.ctr = (baseData.summary.clicks / baseData.summary.impressions) * 100;
  baseData.summary.cvr = (baseData.summary.conversions / baseData.summary.clicks) * 100;
  baseData.summary.cpa = baseData.summary.cost / baseData.summary.conversions;
  baseData.summary.roas = (baseData.summary.conversions * 100) / baseData.summary.cost; // Assuming $100 per conversion
  
  // Generate breakdown data
  if (breakdown) {
    const breakdownCount = breakdown === 'campaign' ? 5 : breakdown === 'ad_group' ? 10 : 15;
    
    for (let i = 0; i < breakdownCount; i++) {
      const item = {
        name: `${breakdown}_${i + 1}`,
        impressions: Math.floor(Math.random() * 100000),
        clicks: Math.floor(Math.random() * 5000),
        conversions: Math.floor(Math.random() * 100),
        cost: Math.random() * 5000
      };
      
      item.ctr = (item.clicks / item.impressions) * 100;
      item.cvr = (item.conversions / item.clicks) * 100;
      item.cpa = item.cost / item.conversions;
      item.roas = (item.conversions * 100) / item.cost;
      
      baseData.breakdown_data.push(item);
    }
  }
  
  return baseData;
}

async function generateDashboardData(accountId: string, dateRange: string): Promise<any> {
  // Placeholder dashboard data
  return {
    overview: {
      total_campaigns: Math.floor(Math.random() * 20) + 5,
      active_campaigns: Math.floor(Math.random() * 15) + 3,
      total_spend: Math.random() * 100000,
      total_conversions: Math.floor(Math.random() * 500),
      avg_cpa: Math.random() * 100,
      avg_roas: Math.random() * 5
    },
    performance_trend: generateTrendData(dateRange),
    top_campaigns: generateTopCampaigns(),
    alerts: generateActiveAlerts(),
    recent_changes: generateRecentChanges()
  };
}

function generateTrendData(dateRange: string): any[] {
  const days = dateRange === 'last_7_days' ? 7 : dateRange === 'last_30_days' ? 30 : 7;
  const trend = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    trend.push({
      date: date.toISOString().split('T')[0],
      impressions: Math.floor(Math.random() * 10000),
      clicks: Math.floor(Math.random() * 500),
      conversions: Math.floor(Math.random() * 25),
      cost: Math.random() * 2000
    });
  }
  
  return trend;
}

function generateTopCampaigns(): any[] {
  const campaigns = [];
  
  for (let i = 0; i < 5; i++) {
    campaigns.push({
      name: `Top Campaign ${i + 1}`,
      impressions: Math.floor(Math.random() * 50000),
      clicks: Math.floor(Math.random() * 2500),
      conversions: Math.floor(Math.random() * 50),
      cost: Math.random() * 5000,
      cpa: Math.random() * 100,
      roas: Math.random() * 5
    });
  }
  
  return campaigns.sort((a, b) => b.conversions - a.conversions);
}

function generateActiveAlerts(): any[] {
  const alertTypes = ['spend_spike', 'zero_conversions', 'cpa_drift', 'learning_stuck'];
  const alerts = [];
  
  for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
    alerts.push({
      type: alertTypes[Math.floor(Math.random() * alertTypes.length)],
      message: `Alert ${i + 1}: Performance issue detected`,
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      triggered_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
    });
  }
  
  return alerts;
}

function generateRecentChanges(): any[] {
  const changes = [];
  
  for (let i = 0; i < 5; i++) {
    changes.push({
      entity_type: ['campaign', 'ad_group', 'ad'][Math.floor(Math.random() * 3)],
      entity_name: `Entity ${i + 1}`,
      action: ['update', 'pause', 'enable'][Math.floor(Math.random() * 3)],
      changed_at: new Date(Date.now() - Math.random() * 86400000).toISOString()
    });
  }
  
  return changes;
}

function convertToCSV(data: any): string {
  if (!data.breakdown_data || data.breakdown_data.length === 0) {
    return 'No data available';
  }
  
  const headers = Object.keys(data.breakdown_data[0]);
  const csvRows = [headers.join(',')];
  
  for (const row of data.breakdown_data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export default reportRoutes;
