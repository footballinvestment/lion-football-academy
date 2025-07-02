const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Player = require('../models/Player');
const FamilyService = require('../services/familyService');
const { authenticate, isAdminOrCoach } = require('../middleware/auth');

// Apply authentication to all parent routes
router.use(authenticate);

// GET /api/parents - Get all parents
router.get('/', isAdminOrCoach, async (req, res) => {
    try {
        const parents = await User.findByRole('parent');
        
        res.json({
            success: true,
            parents,
            count: parents.length
        });
    } catch (error) {
        console.error('Parents fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching parents'
        });
    }
});

// GET /api/parents/dashboard - Parent dashboard with family data
router.get('/dashboard', async (req, res) => {
    try {
        const parentId = req.user.id;
        
        // Log parent activity
        await FamilyService.logParentActivity(
            parentId, 
            null, 
            'dashboard_access', 
            'Parent accessed family dashboard',
            {
                ipAddress: req.ip,
                userAgent: req.get('user-agent'),
                sessionId: req.sessionID
            }
        );

        // Get comprehensive dashboard data
        const dashboardData = await FamilyService.getFamilyDashboard(parentId);

        res.json({
            success: true,
            data: dashboardData
        });
    } catch (error) {
        console.error('Parent dashboard error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching family dashboard'
        });
    }
});

// GET /api/parents/:id/children - Szülő gyermekei
router.get('/:id/children', async (req, res) => {
    try {
        const parentId = req.params.id;
        
        // Check if user is requesting their own children or is admin/coach
        if (req.user.role !== 'admin' && req.user.role !== 'coach' && req.user.id !== parseInt(parentId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own children'
            });
        }

        // Get children using new family service
        const children = await FamilyService.getChildrenForParent(parentId);

        res.json({
            success: true,
            children: children,
            childCount: children.length
        });
    } catch (error) {
        console.error('Parent children fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching parent children'
        });
    }
});

// GET /api/parents/children/:childId/performance - Child performance data for parent
router.get('/children/:childId/performance', async (req, res) => {
    try {
        const parentId = req.user.id;
        const childId = req.params.childId;

        // Log parent activity
        await FamilyService.logParentActivity(
            parentId, 
            childId, 
            'performance_view', 
            'Parent viewed child performance data'
        );

        const performance = await FamilyService.getChildPerformanceForParent(parentId, childId);

        res.json({
            success: true,
            childId: childId,
            performance: performance
        });
    } catch (error) {
        console.error('Child performance fetch error:', error);
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: error.message
            });
        }
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching child performance'
        });
    }
});

// GET /api/parents/children/:childId/injuries - Child injury data for parent
router.get('/children/:childId/injuries', async (req, res) => {
    try {
        const parentId = req.user.id;
        const childId = req.params.childId;

        // Log parent activity
        await FamilyService.logParentActivity(
            parentId, 
            childId, 
            'medical_view', 
            'Parent viewed child injury records'
        );

        const injuries = await FamilyService.getChildInjuriesForParent(parentId, childId);

        res.json({
            success: true,
            childId: childId,
            injuries: injuries
        });
    } catch (error) {
        console.error('Child injuries fetch error:', error);
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: error.message
            });
        }
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching child injuries'
        });
    }
});

// GET /api/parents/children/:childId/development - Child development plans for parent
router.get('/children/:childId/development', async (req, res) => {
    try {
        const parentId = req.user.id;
        const childId = req.params.childId;

        // Log parent activity
        await FamilyService.logParentActivity(
            parentId, 
            childId, 
            'development_view', 
            'Parent viewed child development plans'
        );

        const development = await FamilyService.getChildDevelopmentForParent(parentId, childId);

        res.json({
            success: true,
            childId: childId,
            development: development
        });
    } catch (error) {
        console.error('Child development fetch error:', error);
        if (error.message.includes('Access denied')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: error.message
            });
        }
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching child development'
        });
    }
});

// GET /api/parents/notifications - Get unread notifications for parent
router.get('/notifications', async (req, res) => {
    try {
        const parentId = req.user.id;

        const notifications = await FamilyService.getUnreadNotifications(parentId);

        res.json({
            success: true,
            notifications: notifications,
            count: notifications.length
        });
    } catch (error) {
        console.error('Parent notifications fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching notifications'
        });
    }
});

// POST /api/parents/notifications/:notificationId/read - Mark notification as read
router.post('/notifications/:notificationId/read', async (req, res) => {
    try {
        const parentId = req.user.id;
        const notificationId = req.params.notificationId;

        await FamilyService.markNotificationAsRead(parentId, notificationId);

        res.json({
            success: true,
            message: 'Notification marked as read'
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error marking notification as read'
        });
    }
});

// GET /api/parents/:id/statistics - Szülő statisztikái (gyermekek alapján)
router.get('/:id/statistics', async (req, res) => {
    try {
        const parentId = req.params.id;
        
        // Check if user is requesting their own stats or is admin/coach
        if (req.user.role !== 'admin' && req.user.role !== 'coach' && req.user.id !== parseInt(parentId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own statistics'
            });
        }

        // Check if parent exists
        const parent = await User.findById(parentId);
        if (!parent) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Parent not found'
            });
        }

        if (parent.role !== 'parent') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User is not a parent'
            });
        }

        // Get parent statistics
        const children = await Player.findByParent(parentId);
        const statistics = {
            childCount: children ? children.length : 0,
            teamsInvolved: 0,
            totalAttendance: 0,
            upcomingTrainings: 0
        };

        if (children && children.length > 0) {
            // Get unique teams
            const teams = [...new Set(children.map(child => child.team_id).filter(Boolean))];
            statistics.teamsInvolved = teams.length;

            // Get attendance and training data for all children
            const Attendance = require('../models/Attendance');
            const Training = require('../models/Training');

            for (const child of children) {
                if (child.id) {
                    try {
                        const attendance = await Attendance.findByPlayer(child.id);
                        if (attendance) {
                            statistics.totalAttendance += attendance.length;
                        }

                        if (child.team_id) {
                            const upcomingTrainings = await Training.findByTeamUpcoming(child.team_id);
                            if (upcomingTrainings) {
                                statistics.upcomingTrainings += upcomingTrainings.length;
                            }
                        }
                    } catch (childError) {
                        console.error(`Error fetching data for child ${child.id}:`, childError);
                    }
                }
            }
        }

        res.json({
            success: true,
            parent: {
                id: parent.id,
                username: parent.username,
                full_name: parent.full_name
            },
            statistics
        });
    } catch (error) {
        console.error('Parent statistics fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching parent statistics'
        });
    }
});

module.exports = router;