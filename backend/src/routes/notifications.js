const express = require('express');
const router = express.Router();
const NotificationPreference = require('../models/NotificationPreference');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');
const { authenticate, isAdmin } = require('../middleware/auth');

// Apply authentication to all notification routes
router.use(authenticate);

// GET /api/notifications/preferences - Get user's notification preferences
router.get('/preferences', async (req, res) => {
    try {
        const preferences = await NotificationPreference.getOrCreateDefault(req.user.id);
        
        res.json({
            success: true,
            preferences
        });
    } catch (error) {
        console.error('Notification preferences fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching notification preferences'
        });
    }
});

// PUT /api/notifications/preferences - Update user's notification preferences
router.put('/preferences', async (req, res) => {
    try {
        const {
            email_enabled,
            training_reminders,
            weekly_reports,
            attendance_alerts,
            system_notifications,
            announcement_emails,
            frequency_training_reminders,
            frequency_weekly_reports
        } = req.body;

        await NotificationPreference.update(req.user.id, {
            email_enabled,
            training_reminders,
            weekly_reports,
            attendance_alerts,
            system_notifications,
            announcement_emails,
            frequency_training_reminders,
            frequency_weekly_reports
        });

        const updatedPreferences = await NotificationPreference.findByUserId(req.user.id);

        res.json({
            success: true,
            message: 'Notification preferences updated successfully',
            preferences: updatedPreferences
        });
    } catch (error) {
        console.error('Notification preferences update error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error updating notification preferences'
        });
    }
});

// POST /api/notifications/test-email - Test email functionality (admin only)
router.post('/test-email', isAdmin, async (req, res) => {
    try {
        const { email, template = 'welcome' } = req.body;

        if (!email) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'Email address is required'
            });
        }

        let result;
        const testUser = {
            full_name: 'Test User',
            username: 'testuser',
            email: email,
            role: 'parent'
        };

        switch (template) {
            case 'welcome':
                result = await emailService.sendWelcomeEmail(testUser, 'test123');
                break;
            case 'training-reminder':
                const testTraining = {
                    type: 'Test Training',
                    date: new Date().toISOString(),
                    time: '18:00',
                    location: 'Test Location',
                    team_name: 'Test Team'
                };
                const testPlayers = [{ name: 'Test Player', parent_email: email }];
                result = await emailService.sendTrainingReminder(testTraining, testPlayers);
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid template',
                    message: 'Supported templates: welcome, training-reminder'
                });
        }

        res.json({
            success: true,
            message: 'Test email sent successfully',
            result
        });
    } catch (error) {
        console.error('Test email error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error sending test email'
        });
    }
});

// POST /api/notifications/trigger/:type - Manually trigger notifications (admin only)
router.post('/trigger/:type', isAdmin, async (req, res) => {
    try {
        const { type } = req.params;

        let result;
        switch (type) {
            case 'training-reminders':
                result = await notificationService.triggerTrainingReminders();
                break;
            case 'weekly-reports':
                result = await notificationService.triggerWeeklyReports();
                break;
            case 'low-attendance-alerts':
                result = await notificationService.triggerLowAttendanceAlerts();
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid notification type',
                    message: 'Supported types: training-reminders, weekly-reports, low-attendance-alerts'
                });
        }

        res.json({
            success: true,
            message: `${type} triggered successfully`,
            result
        });
    } catch (error) {
        console.error(`Trigger notification error (${req.params.type}):`, error);
        res.status(500).json({
            error: 'Server error',
            message: `Error triggering ${req.params.type}`
        });
    }
});

// GET /api/notifications/stats - Get notification statistics (admin only)
router.get('/stats', isAdmin, async (req, res) => {
    try {
        const stats = await NotificationPreference.getNotificationStats();
        
        res.json({
            success: true,
            stats: {
                total_users: stats.total_users || 0,
                email_enabled: {
                    count: stats.email_enabled_count || 0,
                    percentage: stats.total_users > 0 ? 
                        Math.round((stats.email_enabled_count / stats.total_users) * 100) : 0
                },
                training_reminders: {
                    count: stats.training_reminders_count || 0,
                    percentage: stats.total_users > 0 ? 
                        Math.round((stats.training_reminders_count / stats.total_users) * 100) : 0
                },
                weekly_reports: {
                    count: stats.weekly_reports_count || 0,
                    percentage: stats.total_users > 0 ? 
                        Math.round((stats.weekly_reports_count / stats.total_users) * 100) : 0
                },
                attendance_alerts: {
                    count: stats.attendance_alerts_count || 0,
                    percentage: stats.total_users > 0 ? 
                        Math.round((stats.attendance_alerts_count / stats.total_users) * 100) : 0
                },
                system_notifications: {
                    count: stats.system_notifications_count || 0,
                    percentage: stats.total_users > 0 ? 
                        Math.round((stats.system_notifications_count / stats.total_users) * 100) : 0
                },
                announcement_emails: {
                    count: stats.announcement_emails_count || 0,
                    percentage: stats.total_users > 0 ? 
                        Math.round((stats.announcement_emails_count / stats.total_users) * 100) : 0
                }
            }
        });
    } catch (error) {
        console.error('Notification stats error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching notification statistics'
        });
    }
});

// POST /api/notifications/bulk-opt-out - Bulk opt-out users from specific notification type (admin only)
router.post('/bulk-opt-out', isAdmin, async (req, res) => {
    try {
        const { user_ids, notification_type } = req.body;

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'user_ids array is required'
            });
        }

        if (!notification_type) {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'notification_type is required'
            });
        }

        const validTypes = [
            'training_reminders', 'weekly_reports', 'attendance_alerts',
            'system_notifications', 'announcement_emails'
        ];

        if (!validTypes.includes(notification_type)) {
            return res.status(400).json({
                error: 'Invalid notification type',
                message: `Valid types: ${validTypes.join(', ')}`
            });
        }

        await NotificationPreference.bulkOptOut(user_ids, notification_type);

        res.json({
            success: true,
            message: `${user_ids.length} users opted out from ${notification_type}`,
            affected_users: user_ids.length
        });
    } catch (error) {
        console.error('Bulk opt-out error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error performing bulk opt-out'
        });
    }
});

module.exports = router;