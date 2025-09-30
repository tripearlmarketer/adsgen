const jwt = require('jsonwebtoken');

// Role-based access control middleware
const rbac = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ error: 'Access token required' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;

      // Check if user role is allowed
      if (allowedRoles.length > 0 && !allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: decoded.role
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

// Specific role middlewares
const adminOnly = rbac(['admin', 'super_admin']);
const userOrAdmin = rbac(['user', 'admin', 'super_admin']);
const superAdminOnly = rbac(['super_admin']);

module.exports = {
  rbac,
  adminOnly,
  userOrAdmin,
  superAdminOnly
};
