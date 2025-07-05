const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { 
    authenticate, 
    isAdmin, 
    rateLimit, 
    loginRateLimit, 
    securityHeaders 
} = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply general rate limiting to all auth routes
router.use(rateLimit({
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication requests, please try again later'
}));

// ===================================
// PUBLIC ROUTES (No authentication required)
// ===================================

// Login endpoint with enhanced rate limiting
router.post('/login', loginRateLimit, AuthController.login);

// Refresh token endpoint
router.post('/refresh-token', rateLimit({
    maxRequests: 10,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Too many token refresh attempts'
}), AuthController.refreshToken);

// Check email availability (for registration forms)
router.get('/check-email', rateLimit({
    maxRequests: 20,
    windowMs: 5 * 60 * 1000 // 5 minutes
}), AuthController.checkEmailAvailability);

// ===================================
// PROTECTED ROUTES (Authentication required)
// ===================================

// Logout endpoint
router.post('/logout', authenticate, AuthController.logout);

// Verify token endpoint
router.get('/verify-token', authenticate, AuthController.verifyToken);

// Get user profile
router.get('/profile', authenticate, AuthController.getProfile);

// Change password
router.put('/change-password', authenticate, rateLimit({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many password change attempts'
}), AuthController.changePassword);

// Get user permissions
router.get('/permissions', authenticate, AuthController.getPermissions);

// ===================================
// ADMIN ONLY ROUTES
// ===================================

// Register new user (admin only)
router.post('/register', authenticate, isAdmin, rateLimit({
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many registration attempts'
}), async (req, res) => {
    try {
        const { 
            email, 
            password, 
            first_name, 
            last_name, 
            phone, 
            role 
        } = req.body;

        // Input validation
        if (!email || !password || !first_name || !last_name || !role) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Email, password, first_name, last_name, and role are required'
            });
        }

        // Validate role
        const validRoles = ['admin', 'coach', 'player', 'parent'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Invalid role. Must be one of: ' + validRoles.join(', ')
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Invalid email format'
            });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Check if email already exists
        const User = require('../models/User');
        const existingUser = await User.findByEmail(email.toLowerCase().trim());
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'Email already exists',
                message: 'A user with this email already exists'
            });
        }

        // Create new user
        const userData = {
            email: email.toLowerCase().trim(),
            password,
            first_name: first_name.trim(),
            last_name: last_name.trim(),
            phone: phone ? phone.trim() : null,
            role,
            is_active: true,
            email_verified: true // Admin-created users are automatically verified
        };

        const newUser = await User.create(userData);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role,
                is_active: newUser.is_active,
                email_verified: newUser.email_verified
            },
            created_by: {
                id: req.user.id,
                name: req.user.getFullName()
            }
        });

    } catch (error) {
        console.error('User registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to create user'
        });
    }
});

// Get all users (admin only)
router.get('/users', authenticate, isAdmin, async (req, res) => {
    try {
        const { role, is_active, limit, offset } = req.query;
        
        const filters = {};
        if (role) filters.role = role;
        if (is_active !== undefined) filters.is_active = is_active === 'true';
        if (limit) filters.limit = parseInt(limit);
        if (offset) filters.offset = parseInt(offset);

        const User = require('../models/User');
        const users = await User.findAll(filters);

        res.status(200).json({
            success: true,
            message: 'Users retrieved successfully',
            users: users.map(user => user.toJSON()),
            count: users.length
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve users'
        });
    }
});

// Update user status (admin only)
router.put('/users/:userId/status', authenticate, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { is_active } = req.body;

        if (is_active === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'is_active field is required'
            });
        }

        const User = require('../models/User');
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
                message: 'User with specified ID does not exist'
            });
        }

        // Prevent admin from deactivating themselves
        if (userId === req.user.id && !is_active) {
            return res.status(400).json({
                success: false,
                error: 'Invalid operation',
                message: 'You cannot deactivate your own account'
            });
        }

        user.is_active = is_active;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${is_active ? 'activated' : 'deactivated'} successfully`,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to update user status'
        });
    }
});

// Get user statistics (admin only)
router.get('/stats', authenticate, isAdmin, async (req, res) => {
    try {
        const User = require('../models/User');
        const stats = await User.getStats();

        res.status(200).json({
            success: true,
            message: 'User statistics retrieved successfully',
            stats
        });

    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve user statistics'
        });
    }
});

// Health check endpoint
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Authentication service is healthy',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;