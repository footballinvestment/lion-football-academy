const express = require('express');
const router = express.Router();
const User = require('../models/User');
const AuthService = require('../services/authService');
const { authenticate } = require('../middleware/auth');

// Apply authentication to all profile routes
router.use(authenticate);

// GET /api/profile - Get current user's profile
router.get('/', async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User profile not found'
            });
        }

        // Remove sensitive data
        const { password_hash, ...userProfile } = user;

        res.json({
            success: true,
            profile: userProfile
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching user profile'
        });
    }
});

// PUT /api/profile - Update current user's profile
router.put('/', async (req, res) => {
    try {
        const { username, email, full_name } = req.body;
        const userId = req.user.id;

        // Get current user data
        const currentUser = await User.findById(userId);
        if (!currentUser) {
            return res.status(404).json({
                error: 'Not found',
                message: 'User not found'
            });
        }

        // Validate required fields
        if (!username || !email || !full_name) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Username, email, and full name are required'
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

        // Check for unique username (if changing)
        if (username !== currentUser.username) {
            const usernameExists = await User.findByUsername(username);
            if (usernameExists && usernameExists.id !== userId) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Username already exists'
                });
            }
        }

        // Check for unique email (if changing)
        if (email !== currentUser.email) {
            const emailExists = await User.findByEmail(email);
            if (emailExists && emailExists.id !== userId) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Email already exists'
                });
            }
        }

        // Update user profile (preserve role, team_id, player_id, active status)
        await User.update(userId, {
            username,
            email,
            full_name,
            role: currentUser.role,
            team_id: currentUser.team_id,
            player_id: currentUser.player_id,
            active: currentUser.active
        });

        // Get updated user data
        const updatedUser = await User.findById(userId);
        const { password_hash, ...userProfile } = updatedUser;

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: userProfile
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error updating user profile'
        });
    }
});

// PUT /api/profile/password - Change current user's password
router.put('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Current password, new password, and confirmation are required'
            });
        }

        // Check if new passwords match
        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'New passwords do not match'
            });
        }

        // Validate new password strength
        if (newPassword.length < 6) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'New password must be at least 6 characters long'
            });
        }

        // Change password using AuthService
        const result = await AuthService.changePassword(userId, currentPassword, newPassword);

        if (!result.success) {
            return res.status(400).json({
                error: 'Password change failed',
                message: result.error
            });
        }

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error changing password'
        });
    }
});

// GET /api/profile/dashboard - Get role-specific dashboard data
router.get('/dashboard', async (req, res) => {
    try {
        const user = req.user;
        const dashboardData = {
            user: {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                team_name: user.team_name,
                player_name: user.player_name
            },
            content: {}
        };

        if (user.role === 'admin') {
            // Admin dashboard - user statistics
            const stats = await User.getStats();
            dashboardData.content = {
                type: 'admin',
                stats,
                recentActivity: 'Recent admin activities would go here'
            };
        } else if (user.role === 'coach') {
            // Coach dashboard - team and training info
            if (user.team_id) {
                const Team = require('../models/Team');
                const Player = require('../models/Player');
                const Training = require('../models/Training');

                const [team, players, upcomingTrainings] = await Promise.all([
                    Team.findById(user.team_id),
                    Player.findByTeam(user.team_id),
                    Training.findByTeamUpcoming(user.team_id)
                ]);

                dashboardData.content = {
                    type: 'coach',
                    team,
                    players,
                    upcomingTrainings: upcomingTrainings || [],
                    playerCount: players ? players.length : 0
                };
            } else {
                dashboardData.content = {
                    type: 'coach',
                    message: 'No team assigned yet'
                };
            }
        } else if (user.role === 'parent') {
            // Parent dashboard - child's info and team activities
            if (user.player_id) {
                const Player = require('../models/Player');
                const Training = require('../models/Training');
                const Attendance = require('../models/Attendance');

                const [player, recentAttendance] = await Promise.all([
                    Player.findById(user.player_id),
                    Attendance.findByPlayer(user.player_id, 5) // Last 5 attendance records
                ]);

                let upcomingTrainings = [];
                if (player && player.team_id) {
                    const Training = require('../models/Training');
                    upcomingTrainings = await Training.findByTeamUpcoming(player.team_id) || [];
                }

                dashboardData.content = {
                    type: 'parent',
                    player,
                    recentAttendance: recentAttendance || [],
                    upcomingTrainings,
                    childTeam: player ? player.team_name : null
                };
            } else {
                dashboardData.content = {
                    type: 'parent',
                    message: 'No child player assigned yet'
                };
            }
        }

        res.json({
            success: true,
            dashboard: dashboardData
        });
    } catch (error) {
        console.error('Dashboard fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching dashboard data'
        });
    }
});

// GET /api/profile/notifications - Get user-specific notifications
router.get('/notifications', async (req, res) => {
    try {
        const user = req.user;
        const notifications = [];

        if (user.role === 'admin') {
            // Admin notifications - system alerts, new registrations, etc.
            const stats = await User.getStats();
            if (stats.recent_logins < stats.active_users * 0.5) {
                notifications.push({
                    type: 'warning',
                    message: 'Low user activity detected',
                    timestamp: new Date()
                });
            }
        } else if (user.role === 'coach' && user.team_id) {
            // Coach notifications - upcoming trainings, team updates
            const Training = require('../models/Training');
            const upcomingTrainings = await Training.findByTeamUpcoming(user.team_id) || [];
            
            upcomingTrainings.forEach(training => {
                const trainingDate = new Date(training.date);
                const today = new Date();
                const daysDiff = Math.ceil((trainingDate - today) / (1000 * 60 * 60 * 24));
                
                if (daysDiff <= 1 && daysDiff >= 0) {
                    notifications.push({
                        type: 'info',
                        message: `Upcoming training: ${training.type} ${daysDiff === 0 ? 'today' : 'tomorrow'}`,
                        timestamp: trainingDate
                    });
                }
            });
        } else if (user.role === 'parent' && user.player_id) {
            // Parent notifications - child's team activities, attendance reminders
            const Player = require('../models/Player');
            const player = await Player.findById(user.player_id);
            
            if (player && player.team_id) {
                const Training = require('../models/Training');
                const upcomingTrainings = await Training.findByTeamUpcoming(player.team_id) || [];
                
                upcomingTrainings.forEach(training => {
                    const trainingDate = new Date(training.date);
                    const today = new Date();
                    const daysDiff = Math.ceil((trainingDate - today) / (1000 * 60 * 60 * 24));
                    
                    if (daysDiff <= 2 && daysDiff >= 0) {
                        notifications.push({
                            type: 'info',
                            message: `${player.name} has training: ${training.type} in ${daysDiff} day(s)`,
                            timestamp: trainingDate
                        });
                    }
                });
            }
        }

        res.json({
            success: true,
            notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Notifications fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching notifications'
        });
    }
});

module.exports = router;