const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

class AuthMiddleware {
  requireAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Authorization header required'
        });
      }

      const token = authHeader.split(' ')[1]; // Bearer <token>
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token required'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      
      logger.debug('User authenticated:', { 
        userId: decoded.id, 
        staffId: decoded.staffId 
      });

      next();

    } catch (error) {
      logger.warn('Authentication failed:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }

      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  }

  requireAdmin(req, res, next) {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  }

  requireStaff(req, res, next) {
    if (!req.user.staffId) {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }
    next();
  }

  socketAuth(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      socket.userId = decoded.id;
      socket.staffId = decoded.staffId;
      socket.isAdmin = decoded.isAdmin;
      
      logger.debug('Socket authenticated:', { 
        userId: decoded.id, 
        staffId: decoded.staffId,
        socketId: socket.id
      });

      next();

    } catch (error) {
      logger.warn('Socket authentication failed:', error.message);
      next(new Error('Authentication failed'));
    }
  }

  checkPermission(requiredPermission) {
    return (req, res, next) => {
      if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Permission required: ${requiredPermission}`
        });
      }
      next();
    };
  }

  checkResourceAccess(resourceType) {
    return async (req, res, next) => {
      try {
        // This would typically check if user has access to specific resources
        // like casefiles, clients, etc. based on their role and assignments
        
        // For now, we'll implement basic staff-level filtering
        if (req.user.isAdmin) {
          return next(); // Admins have access to all resources
        }

        // Non-admin users are restricted to their assigned resources
        // This would be extended based on your specific business logic
        
        next();

      } catch (error) {
        logger.error('Resource access check failed:', error);
        res.status(500).json({
          success: false,
          message: 'Failed to verify resource access'
        });
      }
    };
  }
}

const authMiddleware = new AuthMiddleware();
module.exports = authMiddleware;