const express = require('express');
const router = express.Router();
const AuthService = require('../services/authService');
const { authenticate, isAdmin, rateLimit } = require('../middleware/auth');

// Apply rate limiting to all auth routes (development-friendly)
router.use(rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Login endpoint
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username and password are required'
            });
        }

        const result = await AuthService.login(username, password);

        if (!result.success) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: result.error
            });
        }

        res.json({
            success: true,
            message: 'Login successful',
            user: result.user,
            tokens: result.tokens
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during login'
        });
    }
});

// Register endpoint - Only admin can register new users
router.post('/register', authenticate, isAdmin, async (req, res) => {
    try {
        const { username, email, password, full_name, role, team_id, player_id } = req.body;

        // Validate required fields
        if (!username || !email || !password || !full_name || !role) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username, email, password, full_name, and role are required'
            });
        }

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Password must be at least 6 characters long'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid email format'
            });
        }

        // Prepare user data (admin-only registration)
        const userData = {
            username,
            email,
            password,
            full_name,
            role,
            team_id: team_id || null,
            player_id: player_id || null
        };

        const result = await AuthService.register(userData);

        if (!result.success) {
            return res.status(400).json({
                error: 'Registration failed',
                message: result.error
            });
        }

        res.status(201).json({
            success: true,
            message: 'User registration successful (admin approval)',
            user: result.user,
            tokens: result.tokens,
            admin_created_by: req.user.full_name
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during registration'
        });
    }
});

// Token validation endpoint
router.get('/validate', authenticate, async (req, res) => {
    try {
        // If we reach this point, the token is valid (authenticated by middleware)
        res.json({
            success: true,
            message: 'Token is valid',
            user: {
                id: req.user.id,
                username: req.user.username,
                email: req.user.email,
                role: req.user.role,
                full_name: req.user.full_name
            }
        });
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during token validation'
        });
    }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Refresh token is required'
            });
        }

        const result = await AuthService.refreshAccessToken(refreshToken);

        if (!result.success) {
            return res.status(401).json({
                error: 'Token refresh failed',
                message: result.error
            });
        }

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            accessToken: result.accessToken,
            expiresIn: result.expiresIn
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during token refresh'
        });
    }
});

// Logout endpoint
router.post('/logout', authenticate, async (req, res) => {
    try {
        const result = AuthService.logout();
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during logout'
        });
    }
});

// Get current user profile
router.get('/profile', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred while fetching profile'
        });
    }
});

// Change password endpoint
router.put('/change-password', authenticate, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Old password and new password are required'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'New password must be at least 6 characters long'
            });
        }

        const result = await AuthService.changePassword(userId, oldPassword, newPassword);

        if (!result.success) {
            return res.status(400).json({
                error: 'Password change failed',
                message: result.error
            });
        }

        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred while changing password'
        });
    }
});

// Verify token endpoint (for frontend to check if token is still valid)
router.get('/verify', authenticate, async (req, res) => {
    try {
        res.json({
            success: true,
            message: 'Token is valid',
            user: req.user
        });
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'An error occurred during token verification'
        });
    }
});

module.exports = router;