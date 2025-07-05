const User = require('../models/User');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Coach = require('../models/Coach');
const database = require('../database/database');

class AdminController {
    // Get all users with filtering and pagination
    static async getUsers(req, res) {
        try {
            const { role, is_active, search, page = 1, limit = 50 } = req.query;
            
            const filters = {};
            if (role) filters.role = role;
            if (is_active !== undefined) filters.is_active = is_active === 'true';
            if (limit) filters.limit = Math.min(parseInt(limit), 100); // Max 100 per page
            if (page > 1) filters.offset = (parseInt(page) - 1) * filters.limit;

            let users = await User.findAll(filters);

            // Apply search filter if provided
            if (search) {
                const searchTerm = search.toLowerCase();
                users = users.filter(user => 
                    user.first_name.toLowerCase().includes(searchTerm) ||
                    user.last_name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm)
                );
            }

            // Get total count for pagination
            const totalQuery = `
                SELECT COUNT(*) as total FROM users 
                WHERE 1=1 
                ${role ? 'AND role = ?' : ''}
                ${is_active !== undefined ? 'AND is_active = ?' : ''}
            `;
            const countParams = [];
            if (role) countParams.push(role);
            if (is_active !== undefined) countParams.push(is_active === 'true');
            
            const totalResult = await database.get(totalQuery, countParams);
            const total = totalResult.total;

            res.status(200).json({
                success: true,
                message: 'Users retrieved successfully',
                users: users.map(user => user.toJSON()),
                pagination: {
                    page: parseInt(page),
                    limit: filters.limit || 50,
                    total,
                    pages: Math.ceil(total / (filters.limit || 50))
                }
            });

        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve users'
            });
        }
    }

    // Create new user
    static async createUser(req, res) {
        try {
            const { 
                email, 
                password, 
                first_name, 
                last_name, 
                phone, 
                role,
                team_id,
                player_data,
                coach_data
            } = req.body;

            // Validate required fields
            const validation = User.validate(req.body);
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: validation.errors.join(', ')
                });
            }

            // Check if email already exists
            const existingUser = await User.findByEmail(email.toLowerCase().trim());
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already exists',
                    message: 'A user with this email already exists'
                });
            }

            // Create user
            const userData = {
                email: email.toLowerCase().trim(),
                password,
                first_name: first_name.trim(),
                last_name: last_name.trim(),
                phone: phone ? phone.trim() : null,
                role,
                is_active: true,
                email_verified: true // Admin-created users are pre-verified
            };

            const newUser = await User.create(userData);

            // Create role-specific profile if needed
            let profileData = null;

            if (role === 'player' && player_data) {
                const Player = require('../models/Player');
                profileData = await Player.create({
                    ...player_data,
                    user_id: newUser.id,
                    team_id: team_id || player_data.team_id
                });
            } else if (role === 'coach' && coach_data) {
                profileData = await Coach.create({
                    ...coach_data,
                    user_id: newUser.id,
                    team_id: team_id || coach_data.team_id
                });
            }

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: newUser.toJSON(),
                profile: profileData,
                created_by: {
                    id: req.user.id,
                    name: req.user.getFullName()
                }
            });

        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to create user'
            });
        }
    }

    // Update user
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: 'User with specified ID does not exist'
                });
            }

            // Prevent admin from changing their own role or deactivating themselves
            if (id === req.user.id) {
                if (updates.role && updates.role !== user.role) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid operation',
                        message: 'You cannot change your own role'
                    });
                }
                if (updates.is_active === false) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid operation',
                        message: 'You cannot deactivate your own account'
                    });
                }
            }

            // Update allowed fields
            const allowedFields = ['first_name', 'last_name', 'phone', 'role', 'is_active', 'email_verified'];
            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    user[field] = updates[field];
                }
            });

            await user.save();

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                user: user.toJSON(),
                updated_by: {
                    id: req.user.id,
                    name: req.user.getFullName()
                }
            });

        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to update user'
            });
        }
    }

    // Delete user (soft delete - deactivate)
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            const { permanent = false } = req.query;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: 'User with specified ID does not exist'
                });
            }

            // Prevent admin from deleting themselves
            if (id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid operation',
                    message: 'You cannot delete your own account'
                });
            }

            if (permanent === 'true') {
                // Permanent deletion (be very careful)
                await user.delete();
                res.status(200).json({
                    success: true,
                    message: 'User permanently deleted',
                    deleted_by: {
                        id: req.user.id,
                        name: req.user.getFullName()
                    }
                });
            } else {
                // Soft delete - deactivate user
                await user.deactivate();
                res.status(200).json({
                    success: true,
                    message: 'User deactivated successfully',
                    user: user.toJSON(),
                    deactivated_by: {
                        id: req.user.id,
                        name: req.user.getFullName()
                    }
                });
            }

        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to delete user'
            });
        }
    }

    // Get system statistics
    static async getStatistics(req, res) {
        try {
            // Get user statistics
            const userStats = await User.getStats();

            // Get team statistics
            const teamStats = await database.get(`
                SELECT 
                    COUNT(*) as total_teams,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_teams
                FROM teams
            `);

            // Get player statistics
            const playerStats = await database.get(`
                SELECT 
                    COUNT(*) as total_players,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_players
                FROM players
            `);

            // Get coach statistics
            const coachStats = await database.get(`
                SELECT 
                    COUNT(*) as total_coaches,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_coaches,
                    SUM(CASE WHEN is_head_coach = 1 THEN 1 ELSE 0 END) as head_coaches
                FROM coaches
            `);

            // Get recent activity
            const recentUsers = await database.all(`
                SELECT id, first_name, last_name, role, created_at
                FROM users 
                ORDER BY created_at DESC 
                LIMIT 10
            `);

            // Get match statistics
            const matchStats = await database.get(`
                SELECT 
                    COUNT(*) as total_matches,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_matches,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as upcoming_matches
                FROM matches
            `);

            // Get training statistics
            const trainingStats = await database.get(`
                SELECT 
                    COUNT(*) as total_trainings,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_trainings,
                    SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) as upcoming_trainings
                FROM trainings
            `);

            res.status(200).json({
                success: true,
                message: 'Statistics retrieved successfully',
                statistics: {
                    users: userStats,
                    teams: teamStats,
                    players: playerStats,
                    coaches: coachStats,
                    matches: matchStats,
                    trainings: trainingStats,
                    recent_activity: {
                        new_users: recentUsers
                    },
                    generated_at: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve statistics'
            });
        }
    }

    // Get user by ID with detailed information
    static async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findById(id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                    message: 'User with specified ID does not exist'
                });
            }

            // Get role-specific data
            let roleData = null;

            if (user.role === 'player') {
                const player = await database.get(`
                    SELECT p.*, t.name as team_name 
                    FROM players p 
                    LEFT JOIN teams t ON p.team_id = t.id 
                    WHERE p.user_id = ?
                `, [user.id]);
                roleData = { player };
            } else if (user.role === 'coach') {
                const coach = await database.get(`
                    SELECT c.*, t.name as team_name 
                    FROM coaches c 
                    LEFT JOIN teams t ON c.team_id = t.id 
                    WHERE c.user_id = ?
                `, [user.id]);
                roleData = { coach };
            } else if (user.role === 'parent') {
                const children = await database.all(`
                    SELECT p.id, p.user_id, u.first_name, u.last_name, t.name as team_name
                    FROM family_relationships fr
                    JOIN players p ON fr.player_id = p.id
                    JOIN users u ON p.user_id = u.id
                    LEFT JOIN teams t ON p.team_id = t.id
                    WHERE fr.parent_id = ?
                `, [user.id]);
                roleData = { children };
            }

            res.status(200).json({
                success: true,
                message: 'User retrieved successfully',
                user: user.toJSON(),
                role_data: roleData
            });

        } catch (error) {
            console.error('Get user by ID error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve user'
            });
        }
    }

    // Bulk operations
    static async bulkUpdateUsers(req, res) {
        try {
            const { user_ids, updates } = req.body;

            if (!Array.isArray(user_ids) || user_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'user_ids must be a non-empty array'
                });
            }

            if (!updates || Object.keys(updates).length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'updates object is required'
                });
            }

            // Prevent admin from updating themselves in bulk operations
            if (user_ids.includes(req.user.id)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid operation',
                    message: 'Cannot include your own user ID in bulk operations'
                });
            }

            const results = [];
            const allowedFields = ['is_active', 'email_verified'];

            for (const userId of user_ids) {
                try {
                    const user = await User.findById(userId);
                    if (user) {
                        allowedFields.forEach(field => {
                            if (updates[field] !== undefined) {
                                user[field] = updates[field];
                            }
                        });
                        await user.save();
                        results.push({ user_id: userId, status: 'updated' });
                    } else {
                        results.push({ user_id: userId, status: 'not_found' });
                    }
                } catch (error) {
                    results.push({ user_id: userId, status: 'error', error: error.message });
                }
            }

            res.status(200).json({
                success: true,
                message: 'Bulk update completed',
                results,
                updated_by: {
                    id: req.user.id,
                    name: req.user.getFullName()
                }
            });

        } catch (error) {
            console.error('Bulk update users error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to perform bulk update'
            });
        }
    }
}

module.exports = AdminController;