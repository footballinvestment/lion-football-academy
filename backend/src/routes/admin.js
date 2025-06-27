const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, isAdmin } = require('../middleware/auth');

// Apply admin authentication to all routes
router.use(authenticate);
router.use(isAdmin);

// GET /api/admin/users - Get all users with detailed info
router.get('/users', async (req, res) => {
    try {
        const { role, active, team_id } = req.query;
        
        let users;
        if (role) {
            users = await User.findByRole(role);
        } else {
            users = await User.findAll();
        }

        // Filter by active status if specified
        if (active !== undefined) {
            const isActive = active === 'true';
            users = users.filter(user => user.active === isActive);
        }

        // Filter by team if specified
        if (team_id) {
            users = users.filter(user => user.team_id === parseInt(team_id));
        }

        res.json({
            success: true,
            users,
            count: users.length
        });
    } catch (error) {
        console.error('Admin users list error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching users'
        });
    }
});

// GET /api/admin/users/:id - Get specific user details
router.get('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Admin user details error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching user details'
        });
    }
});

// POST /api/admin/users - Create new user (admin privilege)
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, full_name, role, team_id, player_id } = req.body;

        // Validate required fields
        if (!username || !email || !password || !full_name || !role) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username, email, password, full_name, and role are required'
            });
        }

        // Validate role
        const validRoles = ['admin', 'coach', 'parent'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Invalid role. Must be admin, coach, or parent'
            });
        }

        // Check if username already exists
        const existingUser = await User.findByUsername(username);
        if (existingUser) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username already exists'
            });
        }

        // Check if email already exists
        const existingEmail = await User.findByEmail(email);
        if (existingEmail) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Email already exists'
            });
        }

        // Create user
        const result = await User.create({
            username,
            email,
            password,
            full_name,
            role,
            team_id: team_id || null,
            player_id: player_id || null
        });

        // Get created user with relationships
        const newUser = await User.findById(result.id);

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: newUser
        });
    } catch (error) {
        console.error('Admin create user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error creating user'
        });
    }
});

// PUT /api/admin/users/:id - Update user details
router.put('/users/:id', async (req, res) => {
    try {
        const { username, email, full_name, role, team_id, player_id, active } = req.body;
        const userId = req.params.id;

        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Prevent admin from deactivating themselves
        if (req.user.id === parseInt(userId) && active === false) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot deactivate your own account'
            });
        }

        // Validate role if provided
        if (role) {
            const validRoles = ['admin', 'coach', 'parent'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid role. Must be admin, coach, or parent'
                });
            }
        }

        // Check for unique username (if changing)
        if (username && username !== existingUser.username) {
            const usernameExists = await User.findByUsername(username);
            if (usernameExists) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Username already exists'
                });
            }
        }

        // Check for unique email (if changing)
        if (email && email !== existingUser.email) {
            const emailExists = await User.findByEmail(email);
            if (emailExists) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Email already exists'
                });
            }
        }

        // Update user
        await User.update(userId, {
            username: username || existingUser.username,
            email: email || existingUser.email,
            full_name: full_name || existingUser.full_name,
            role: role || existingUser.role,
            team_id: team_id !== undefined ? team_id : existingUser.team_id,
            player_id: player_id !== undefined ? player_id : existingUser.player_id,
            active: active !== undefined ? active : existingUser.active
        });

        // Get updated user
        const updatedUser = await User.findById(userId);

        res.json({
            success: true,
            message: 'User updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error updating user'
        });
    }
});

// PUT /api/admin/users/:id/role - Change user role
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role, team_id, player_id } = req.body;
        const userId = req.params.id;

        // Validate role
        const validRoles = ['admin', 'coach', 'parent'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Valid role is required (admin, coach, or parent)'
            });
        }

        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Prevent admin from changing their own role if they are the only admin
        if (req.user.id === parseInt(userId) && req.user.role === 'admin' && role !== 'admin') {
            const adminCount = await User.findByRole('admin');
            if (adminCount.length <= 1) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Cannot change role - you are the only admin'
                });
            }
        }

        // Update user role and associated data
        await User.update(userId, {
            username: existingUser.username,
            email: existingUser.email,
            full_name: existingUser.full_name,
            role: role,
            team_id: team_id || null,
            player_id: player_id || null,
            active: existingUser.active
        });

        // Get updated user
        const updatedUser = await User.findById(userId);

        res.json({
            success: true,
            message: 'User role updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Admin role change error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error changing user role'
        });
    }
});

// DELETE /api/admin/users/:id - Deactivate user (soft delete)
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Prevent admin from deleting themselves
        if (req.user.id === parseInt(userId)) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Cannot deactivate your own account'
            });
        }

        // Prevent deleting the last admin
        if (existingUser.role === 'admin') {
            const adminCount = await User.findByRole('admin');
            if (adminCount.length <= 1) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Cannot deactivate the last admin user'
                });
            }
        }

        // Soft delete (deactivate)
        await User.delete(userId);

        res.json({
            success: true,
            message: 'User deactivated successfully'
        });
    } catch (error) {
        console.error('Admin delete user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error deactivating user'
        });
    }
});

// PUT /api/admin/users/:id/activate - Reactivate user
router.put('/users/:id/activate', async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Update user to active
        await User.update(userId, {
            username: existingUser.username,
            email: existingUser.email,
            full_name: existingUser.full_name,
            role: existingUser.role,
            team_id: existingUser.team_id,
            player_id: existingUser.player_id,
            active: true
        });

        // Get updated user
        const updatedUser = await User.findById(userId);

        res.json({
            success: true,
            message: 'User reactivated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Admin activate user error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error reactivating user'
        });
    }
});

// GET /api/admin/stats - Admin dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await User.getStats();
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching admin statistics'
        });
    }
});

module.exports = router;