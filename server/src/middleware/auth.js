import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import { getPermissionsForRole } from '../controllers/authController.js';

const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie (primary) OR header (fallback for mobile/API)
    let token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }


    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Account has been suspended'
      });
    }

    const tenant = await Tenant.findById(user.tenantId);
    
    if (!tenant) {
      return res.status(403).json({
        success: false,
        error: 'Workspace not found'
      });
    }

    // Check tenant status
    if (tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Workspace is not active'
      });
    }

    // Attach user and tenant to request
    req.user = user;
    req.tenant = tenant;
    req.token = token;
    
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Session expired'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

const authorize = (...rolesOrPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

   
    const validRoles = new Set(['owner', 'manager', 'staff']);
    
   
    const hasRoles = rolesOrPermissions.some(item => validRoles.has(item));
    
    if (hasRoles) {
        
      if (!rolesOrPermissions.includes(req.user.role)) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions' 
        });
      }
    } else {
  
      const rolePermissions = getPermissionsForRole(req.user.role);
      
      const hasPermission = rolesOrPermissions.some(permission => 
        rolePermissions.includes(permission)
      );
      
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false,
          error: 'Insufficient permissions' 
        });
      }
    }
    
    next();
  };
};

export { authenticate, authorize };