const { adminOnly, superAdminOnly } = require('../middleware/rbac');

async function adminRoutes(fastify, options) {
  // Admin Dashboard Stats
  fastify.get('/stats', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const db = fastify.sqlite;
      
      // Get platform statistics
      const totalUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "user"');
      const totalCampaigns = await db.get('SELECT COUNT(*) as count FROM campaigns');
      const activeUsers = await db.get('SELECT COUNT(DISTINCT user_id) as count FROM campaigns WHERE status = "active"');
      const monthlyRevenue = await db.get(`
        SELECT SUM(amount) as revenue 
        FROM billing_transactions 
        WHERE status = 'completed' 
        AND created_at >= date('now', '-30 days')
      `);
      
      // Get subscription distribution
      const subscriptions = await db.all(`
        SELECT plan_type, COUNT(*) as count 
        FROM user_subscriptions 
        WHERE status = 'active' 
        GROUP BY plan_type
      `);
      
      // Get recent users
      const recentUsers = await db.all(`
        SELECT u.id, u.name, u.email, u.created_at, us.plan_type
        FROM users u
        LEFT JOIN user_subscriptions us ON u.id = us.user_id
        WHERE u.role = 'user'
        ORDER BY u.created_at DESC
        LIMIT 10
      `);
      
      return {
        totalUsers: totalUsers.count,
        totalCampaigns: totalCampaigns.count,
        activeUsers: activeUsers.count,
        monthlyRevenue: monthlyRevenue.revenue || 0,
        subscriptions,
        recentUsers
      };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch admin stats' });
    }
  });

  // User Management
  fastify.get('/users', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const db = fastify.sqlite;
      const { page = 1, limit = 20, search = '' } = request.query;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT u.id, u.name, u.email, u.role, u.status, u.created_at,
               us.plan_type, us.status as subscription_status
        FROM users u
        LEFT JOIN user_subscriptions us ON u.id = us.user_id
        WHERE u.role != 'super_admin'
      `;
      
      if (search) {
        query += ` AND (u.name LIKE '%${search}%' OR u.email LIKE '%${search}%')`;
      }
      
      query += ` ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      
      const users = await db.all(query);
      const totalCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role != "super_admin"');
      
      return {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount.count,
          pages: Math.ceil(totalCount.count / limit)
        }
      };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Update User Status
  fastify.patch('/users/:userId/status', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const { userId } = request.params;
      const { status } = request.body;
      
      if (!['active', 'suspended', 'inactive'].includes(status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }
      
      const db = fastify.sqlite;
      await db.run('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
      
      // Log admin action
      await db.run(`
        INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
        VALUES (?, 'user_status_update', 'user', ?, ?)
      `, [request.user.id, userId, JSON.stringify({ new_status: status })]);
      
      return { success: true, message: 'User status updated' };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to update user status' });
    }
  });

  // Platform Analytics
  fastify.get('/analytics', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const db = fastify.sqlite;
      
      // User growth over time
      const userGrowth = await db.all(`
        SELECT DATE(created_at) as date, COUNT(*) as new_users
        FROM users 
        WHERE role = 'user' AND created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `);
      
      // Campaign creation trends
      const campaignTrends = await db.all(`
        SELECT DATE(created_at) as date, COUNT(*) as campaigns_created
        FROM campaigns 
        WHERE created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `);
      
      // Feature usage statistics
      const featureUsage = await db.all(`
        SELECT feature_name, COUNT(*) as usage_count
        FROM feature_usage_logs
        WHERE created_at >= date('now', '-30 days')
        GROUP BY feature_name
        ORDER BY usage_count DESC
      `);
      
      // Revenue trends
      const revenueTrends = await db.all(`
        SELECT DATE(created_at) as date, SUM(amount) as revenue
        FROM billing_transactions
        WHERE status = 'completed' AND created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date
      `);
      
      return {
        userGrowth,
        campaignTrends,
        featureUsage,
        revenueTrends
      };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });

  // System Health
  fastify.get('/system/health', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const db = fastify.sqlite;
      
      // Database health
      const dbHealth = await db.get('SELECT 1 as healthy');
      
      // Storage usage
      const storageStats = await db.get(`
        SELECT 
          COUNT(*) as total_files,
          SUM(file_size) as total_size
        FROM uploaded_files
      `);
      
      // Recent errors
      const recentErrors = await db.all(`
        SELECT error_type, COUNT(*) as count
        FROM error_logs
        WHERE created_at >= date('now', '-24 hours')
        GROUP BY error_type
        ORDER BY count DESC
        LIMIT 5
      `);
      
      // Active sessions
      const activeSessions = await db.get(`
        SELECT COUNT(*) as count
        FROM user_sessions
        WHERE expires_at > datetime('now')
      `);
      
      return {
        database: dbHealth ? 'healthy' : 'error',
        storage: {
          totalFiles: storageStats.total_files || 0,
          totalSize: storageStats.total_size || 0,
          usage: Math.round((storageStats.total_size || 0) / (5 * 1024 * 1024 * 1024) * 100) // 5GB limit
        },
        recentErrors,
        activeSessions: activeSessions.count
      };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch system health' });
    }
  });

  // Support Tickets
  fastify.get('/support/tickets', { preHandler: adminOnly }, async (request, reply) => {
    try {
      const db = fastify.sqlite;
      const { status = 'all', priority = 'all' } = request.query;
      
      let query = `
        SELECT st.*, u.name, u.email
        FROM support_tickets st
        JOIN users u ON st.user_id = u.id
      `;
      
      const conditions = [];
      if (status !== 'all') conditions.push(`st.status = '${status}'`);
      if (priority !== 'all') conditions.push(`st.priority = '${priority}'`);
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ' ORDER BY st.created_at DESC';
      
      const tickets = await db.all(query);
      
      return { tickets };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch support tickets' });
    }
  });
}

module.exports = adminRoutes;
