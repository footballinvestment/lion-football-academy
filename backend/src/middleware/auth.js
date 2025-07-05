const jwtUtils = require('../utils/jwt');
const User = require('../models/User');

// Blacklist for revoked tokens (in production, use Redis or database)
const tokenBlacklist = new Set();

// Authentication middleware - verifies JWT token
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'No token provided or invalid format'
            });
        }

        const token = jwtUtils.extractTokenFromHeader(authHeader);
        
        if (!token || !jwtUtils.validateTokenStructure(token)) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'Invalid token format'
            });
        }

        // Check if token is blacklisted
        if (tokenBlacklist.has(token)) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'Token has been revoked'
            });
        }

        const verification = jwtUtils.verifyAccessToken(token);
        
        if (!verification.valid) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: verification.error
            });
        }

        // Get user from database to ensure they still exist and are active
        const user = await User.findById(verification.payload.userId);
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'User not found'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'User account is deactivated'
            });
        }

        // Add user info and token to request object
        req.user = user;
        req.token = token;
        req.tokenPayload = verification.payload;
        
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Authentication failed'
        });
    }
};

// Authorization middleware - checks user roles
const authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'User not authenticated'
            });
        }

        const userRole = req.user.role;
        
        // Handle both array and single role
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: `Access denied. Required roles: ${roles.join(', ')}`
            });
        }

        next();
    };
};

// Role-based authorization with hierarchy
const authorizeHierarchy = (minimumRole) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'User not authenticated'
            });
        }

        if (!jwtUtils.hasRolePermission(req.user.role, minimumRole)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden',
                message: `Insufficient permissions. Minimum role required: ${minimumRole}`
            });
        }

        next();
    };
};

// Check if user is admin
const isAdmin = authorize(['admin']);

// Check if user is admin or coach
const isAdminOrCoach = authorize(['admin', 'coach']);

// Check if user is any staff member (admin or coach)
const isStaff = authorize(['admin', 'coach']);

// Check if user owns the resource or has admin privileges
const isOwnerOrAdmin = (resourceUserIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Access denied',
                message: 'User not authenticated'
            });
        }

        // Admin can access everything
        if (req.user.role === 'admin') {
            return next();
        }

        // Check if user owns the resource
        const resourceUserId = req.body[resourceUserIdField] || 
                              req.params[resourceUserIdField] || 
                              req.query[resourceUserIdField];
        
        if (req.user.id === resourceUserId) {
            return next();
        }

        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'You can only access your own resources'
        });
    };
};

// Check if user can access player data
const canAccessPlayer = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const playerId = req.params.id || req.params.playerId;

        // Admin can access all players
        if (req.user.role === 'admin') {
            return next();
        }

        // Player can access their own data
        if (req.user.role === 'player') {
            const Player = require('../models/Player');
            const player = await Player.findByUserId(req.user.id);
            if (player && player.id === playerId) {
                return next();
            }
        }

        // Coach can access players from their teams
        if (req.user.role === 'coach') {
            const Coach = require('../models/Coach');
            const Player = require('../models/Player');
            
            const coach = await Coach.findByUserId(req.user.id);
            const player = await Player.findById(playerId);
            
            if (coach && player && coach.team_id === player.team_id) {
                return next();
            }
        }

        // Parent can access their children's data
        if (req.user.role === 'parent') {
            const database = require('../database/database');
            const relationship = await database.get(`
                SELECT fr.* FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ? AND p.id = ?
            `, [req.user.id, playerId]);
            
            if (relationship) {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            error: 'Access denied to this player data'
        });
    } catch (error) {
        console.error('Player access error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Check if user can access team data
const canAccessTeam = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Not authenticated'
            });
        }

        const teamId = req.params.id || req.params.teamId;

        // Admin can access all teams
        if (req.user.role === 'admin') {
            return next();
        }

        // Coach can access their team
        if (req.user.role === 'coach') {
            const Coach = require('../models/Coach');
            const coach = await Coach.findByUserId(req.user.id);
            if (coach && coach.team_id === teamId) {
                return next();
            }
        }

        // Player can access their team
        if (req.user.role === 'player') {
            const Player = require('../models/Player');
            const player = await Player.findByUserId(req.user.id);
            if (player && player.team_id === teamId) {
                return next();
            }
        }

        // Parent can access their children's teams
        if (req.user.role === 'parent') {
            const database = require('../database/database');
            const relationship = await database.get(`
                SELECT p.team_id FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ? AND p.team_id = ?
            `, [req.user.id, teamId]);
            
            if (relationship) {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            error: 'Access denied to this team data'
        });
    } catch (error) {
        console.error('Team access error:', error);
        return res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Optional authentication - doesn't require token but adds user info if available
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = jwtUtils.extractTokenFromHeader(authHeader);
            
            if (token && jwtUtils.validateTokenStructure(token) && !tokenBlacklist.has(token)) {
                const verification = jwtUtils.verifyAccessToken(token);
                
                if (verification.valid) {
                    const user = await User.findById(verification.payload.userId);
                    if (user && user.is_active) {
                        req.user = user;
                        req.token = token;
                        req.tokenPayload = verification.payload;
                    }
                }
            }
        }
        
        next();
    } catch (error) {
        // Don't fail if optional auth fails, just continue without user
        next();
    }
};

// Rate limiting storage (in production, use Redis)
const rateLimitMap = new Map();

// Enhanced rate limiting with different limits for different endpoints
const rateLimit = (options = {}) => {
    const {
        maxRequests = 100,
        windowMs = 15 * 60 * 1000, // 15 minutes
        message = 'Too many requests, please try again later',
        skipSuccessful = false,
        keyGenerator = (req) => req.ip || req.connection.remoteAddress
    } = options;

    return (req, res, next) => {
        const identifier = keyGenerator(req);
        const now = Date.now();
        
        // Clean up expired entries
        for (const [key, data] of rateLimitMap.entries()) {
            if (now > data.resetTime) {
                rateLimitMap.delete(key);
            }
        }
        
        if (!rateLimitMap.has(identifier)) {
            rateLimitMap.set(identifier, { 
                count: 1, 
                resetTime: now + windowMs,
                firstRequest: now
            });
            return next();
        }
        
        const limit = rateLimitMap.get(identifier);
        
        if (now > limit.resetTime) {
            limit.count = 1;
            limit.resetTime = now + windowMs;
            limit.firstRequest = now;
            return next();
        }
        
        if (limit.count >= maxRequests) {
            const remainingTime = Math.ceil((limit.resetTime - now) / 1000);
            
            return res.status(429).json({
                success: false,
                error: 'Rate limit exceeded',
                message: message,
                retryAfter: remainingTime
            });
        }
        
        // Increment counter only if not skipping successful requests
        if (!skipSuccessful || res.statusCode >= 400) {
            limit.count++;
        }
        
        next();
    };
};

// Specific rate limit for login attempts
const loginRateLimit = rateLimit({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many login attempts, please try again later',
    keyGenerator: (req) => {
        // Rate limit by IP and email if provided
        const ip = req.ip || req.connection.remoteAddress;
        const email = req.body.email || '';
        return `${ip}:${email}`;
    }
});

// Add token to blacklist (for logout)
const blacklistToken = (token) => {
    tokenBlacklist.add(token);
    
    // Auto-cleanup expired tokens (simple implementation)
    setTimeout(() => {
        tokenBlacklist.delete(token);
    }, 24 * 60 * 60 * 1000); // 24 hours
};

// Middleware to check if user's email is verified
const requireEmailVerification = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Not authenticated'
        });
    }

    if (!req.user.email_verified) {
        return res.status(403).json({
            success: false,
            error: 'Email verification required',
            message: 'Please verify your email address to access this resource'
        });
    }

    next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    next();
};

module.exports = {
    authenticate,
    authorize,
    authorizeHierarchy,
    isAdmin,
    isAdminOrCoach,
    isStaff,
    isOwnerOrAdmin,
    canAccessPlayer,
    canAccessTeam,
    optionalAuth,
    rateLimit,
    loginRateLimit,
    requireEmailVerification,
    securityHeaders,
    blacklistToken
};