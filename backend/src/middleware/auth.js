const AuthService = require('../services/authService');

// Authentication middleware - verifies JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'No token provided or invalid format'
            });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        const result = await AuthService.getUserFromToken(token);
        
        if (!result.success) {
            return res.status(401).json({
                error: 'Access denied',
                message: result.error
            });
        }

        // Add user info to request object
        req.user = result.user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            error: 'Access denied',
            message: 'Invalid token'
        });
    }
};

// Authorization middleware - checks user roles
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'User not authenticated'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Check if user is admin
const isAdmin = authorize(['admin']);

// Check if user is admin or coach
const isAdminOrCoach = authorize(['admin', 'coach']);

// Check if user owns the resource or is admin
const isOwnerOrAdmin = (resourceUserIdField = 'user_id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Access denied',
                message: 'User not authenticated'
            });
        }

        // Admin can access everything
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user owns the resource
        const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
        
        if (req.user.id === parseInt(resourceUserId)) {
            return next();
        }

        return res.status(403).json({
            error: 'Forbidden',
            message: 'You can only access your own resources'
        });
    };
};

// Check if user can access player data
const canAccessPlayer = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const playerId = req.params.id || req.params.playerId;

        if (req.user.role === 'admin') {
            return next();
        }

        if (req.user.role === 'coach' && req.user.team_id) {
            const Player = require('../models/Player');
            const player = await Player.findById(playerId);
            if (player && player.team_id === req.user.team_id) {
                return next();
            }
        }

        if (req.user.role === 'parent' && req.user.player_id) {
            if (parseInt(playerId) === parseInt(req.user.player_id)) {
                return next();
            }
        }

        return res.status(403).json({ error: 'Access denied to this player' });
    } catch (error) {
        console.error('Player access error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// Check if user can access team data
const canAccessTeam = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const teamId = req.params.id || req.params.teamId;

        if (req.user.role === 'admin') {
            return next();
        }

        if (req.user.team_id && parseInt(teamId) === parseInt(req.user.team_id)) {
            return next();
        }

        return res.status(403).json({ error: 'Access denied to this team' });
    } catch (error) {
        console.error('Team access error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// Optional authentication - doesn't require token but adds user info if available
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const result = await AuthService.getUserFromToken(token);
            
            if (result.success) {
                req.user = result.user;
            }
        }
        
        next();
    } catch (error) {
        // Don't fail if optional auth fails
        next();
    }
};

// Rate limiting helper (simple implementation)
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 1000, windowMs = 15 * 60 * 1000) => {
    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!rateLimitMap.has(identifier)) {
            rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
            return next();
        }
        
        const limit = rateLimitMap.get(identifier);
        
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + windowMs;
            return next();
        }
        
        if (limit.count >= maxRequests) {
            return res.status(429).json({
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.'
            });
        }
        
        limit.count++;
        next();
    };
};

module.exports = {
    authenticate,
    authorize,
    isAdmin,
    isAdminOrCoach,
    isOwnerOrAdmin,
    canAccessPlayer,
    canAccessTeam,
    optionalAuth,
    rateLimit
};