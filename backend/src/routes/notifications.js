const express = require('express');
const router = express.Router();
const NotificationPreference = require('../models/NotificationPreference');
const notificationService = require('../services/notificationService');
const emailService = require('../utils/emailService');
const db = require('../database/connection');
const { authenticate, isAdmin, isAdminOrCoach } = require('../middleware/auth');
const { validationResult, body, param } = require('express-validator');

// Apply authentication to all notification routes
router.use(authenticate);

// Notification types
const NOTIFICATION_TYPES = {
    MESSAGE: 'message',
    ANNOUNCEMENT: 'announcement',
    EMERGENCY: 'emergency',
    REMINDER: 'reminder',
    ACHIEVEMENT: 'achievement',
    PAYMENT: 'payment',
    MATCH: 'match',
    TRAINING: 'training',
    INJURY: 'injury',
    SYSTEM: 'system'
};

// Notification priorities
const NOTIFICATION_PRIORITIES = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent'
};

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

// ===============================================================
// REAL-TIME MESSAGING AND NOTIFICATION ENDPOINTS
// ===============================================================

/**
 * GET /api/notifications - Get user's notifications
 */
router.get('/', async (req, res) => {
    try {
        const { user_id } = req.user;
        const { 
            page = 1, 
            limit = 50, 
            type, 
            priority, 
            read, 
            since 
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE n.recipient_id = ?';
        const params = [user_id];

        // Build filter conditions
        if (type) {
            whereClause += ' AND n.type = ?';
            params.push(type);
        }

        if (priority) {
            whereClause += ' AND n.priority = ?';
            params.push(priority);
        }

        if (read !== undefined) {
            whereClause += ' AND n.read = ?';
            params.push(read === 'true');
        }

        if (since) {
            whereClause += ' AND n.created_at >= ?';
            params.push(since);
        }

        const query = `
            SELECT 
                n.*,
                s.first_name as sender_first_name,
                s.last_name as sender_last_name,
                s.profile_picture as sender_profile_picture
            FROM notifications n
            LEFT JOIN users s ON n.sender_id = s.id
            ${whereClause}
            ORDER BY n.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), offset);

        const [notifications] = await db.execute(query, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM notifications n
            ${whereClause}
        `;

        const [countResult] = await db.execute(countQuery, params.slice(0, -2));
        const total = countResult[0].total;

        res.json({
            notifications: notifications.map(notification => ({
                ...notification,
                sender: notification.sender_id ? {
                    id: notification.sender_id,
                    name: `${notification.sender_first_name} ${notification.sender_last_name}`,
                    profile_picture: notification.sender_profile_picture
                } : null
            })),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

/**
 * GET /api/notifications/unread-counts - Get unread notification counts
 */
router.get('/unread-counts', async (req, res) => {
    try {
        const { user_id } = req.user;

        const query = `
            SELECT 
                type,
                COUNT(*) as count
            FROM notifications
            WHERE recipient_id = ? AND read = FALSE
            GROUP BY type
        `;

        const [counts] = await db.execute(query, [user_id]);

        const unreadCounts = {};
        let totalUnread = 0;

        counts.forEach(({ type, count }) => {
            unreadCounts[type] = count;
            totalUnread += count;
        });

        res.json({
            ...unreadCounts,
            total: totalUnread
        });
    } catch (error) {
        console.error('Error fetching unread counts:', error);
        res.status(500).json({ error: 'Failed to fetch unread counts' });
    }
});

/**
 * PUT /api/notifications/:id/read - Mark notification as read
 */
router.put('/:id/read', [
    param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { user_id } = req.user;

        const query = `
            UPDATE notifications 
            SET read = TRUE, read_at = NOW()
            WHERE id = ? AND recipient_id = ?
        `;

        const [result] = await db.execute(query, [id, user_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

/**
 * PUT /api/notifications/mark-all-read - Mark all notifications as read
 */
router.put('/mark-all-read', async (req, res) => {
    try {
        const { user_id } = req.user;

        const query = `
            UPDATE notifications 
            SET read = TRUE, read_at = NOW()
            WHERE recipient_id = ? AND read = FALSE
        `;

        const [result] = await db.execute(query, [user_id]);

        res.json({ 
            success: true, 
            message: 'All notifications marked as read',
            updated: result.affectedRows
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

/**
 * DELETE /api/notifications/:id - Delete notification
 */
router.delete('/:id', [
    param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { id } = req.params;
        const { user_id } = req.user;

        const query = `
            DELETE FROM notifications 
            WHERE id = ? AND recipient_id = ?
        `;

        const [result] = await db.execute(query, [id, user_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

/**
 * POST /api/notifications/send - Send notification to specific user(s)
 */
router.post('/send', [
    body('recipient_ids').isArray().withMessage('Recipient IDs must be an array'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('type').isIn(Object.values(NOTIFICATION_TYPES)).withMessage('Invalid notification type'),
    body('priority').optional().isIn(Object.values(NOTIFICATION_PRIORITIES)).withMessage('Invalid priority')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            recipient_ids, 
            title, 
            message, 
            type, 
            priority = NOTIFICATION_PRIORITIES.NORMAL,
            action_url,
            action_type,
            metadata = {},
            send_email = false
        } = req.body;
        const { user_id } = req.user;

        const notifications = [];
        
        // Create notifications for each recipient
        for (const recipientId of recipient_ids) {
            const insertQuery = `
                INSERT INTO notifications (
                    recipient_id, sender_id, title, message, type, priority,
                    action_url, action_type, metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            const [result] = await db.execute(insertQuery, [
                recipientId,
                user_id,
                title,
                message,
                type,
                priority,
                action_url || null,
                action_type || null,
                JSON.stringify(metadata)
            ]);

            notifications.push({
                id: result.insertId,
                recipient_id: recipientId,
                sender_id: user_id,
                title,
                message,
                type,
                priority,
                action_url,
                action_type,
                metadata,
                read: false,
                created_at: new Date().toISOString()
            });

            // Send email if requested and priority is high enough
            if (send_email && priority !== NOTIFICATION_PRIORITIES.LOW) {
                try {
                    // Get recipient email
                    const [userResult] = await db.execute(
                        'SELECT email, first_name FROM users WHERE id = ?',
                        [recipientId]
                    );

                    if (userResult.length > 0) {
                        await emailService.sendNotificationEmail({
                            to: userResult[0].email,
                            recipientName: userResult[0].first_name,
                            title,
                            message,
                            type,
                            priority,
                            actionUrl: action_url
                        });
                    }
                } catch (emailError) {
                    console.error('Error sending notification email:', emailError);
                    // Continue processing even if email fails
                }
            }
        }

        // Broadcast to real-time clients (if WebSocket is available)
        if (global.notificationBroadcast) {
            notifications.forEach(notification => {
                global.notificationBroadcast(notification.recipient_id, {
                    type: 'notification',
                    notification
                });
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Notifications sent successfully',
            notifications
        });
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
});

/**
 * POST /api/notifications/team-announcement - Send announcement to team
 */
router.post('/team-announcement', isAdminOrCoach, [
    body('team_id').isInt().withMessage('Invalid team ID'),
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('priority').optional().isIn(Object.values(NOTIFICATION_PRIORITIES)).withMessage('Invalid priority')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            team_id, 
            title, 
            message, 
            priority = NOTIFICATION_PRIORITIES.NORMAL,
            send_email = true,
            include_parents = false
        } = req.body;
        const { user_id } = req.user;

        // Get team members
        let recipientQuery = `
            SELECT DISTINCT u.id, u.email, u.first_name
            FROM users u
            JOIN players p ON u.id = p.user_id
            WHERE p.team_id = ?
        `;

        const queryParams = [team_id];

        // Include parents if requested
        if (include_parents) {
            recipientQuery = `
                SELECT DISTINCT u.id, u.email, u.first_name
                FROM users u
                WHERE u.id IN (
                    SELECT DISTINCT p.user_id
                    FROM players p
                    WHERE p.team_id = ?
                    UNION
                    SELECT DISTINCT pcr.parent_id
                    FROM parent_child_relationships pcr
                    JOIN players p ON pcr.child_id = p.id
                    WHERE p.team_id = ?
                )
            `;
            queryParams.push(team_id);
        }

        const [recipients] = await db.execute(recipientQuery, queryParams);

        if (recipients.length === 0) {
            return res.status(404).json({ error: 'No team members found' });
        }

        const notifications = [];

        // Create notifications for each recipient
        for (const recipient of recipients) {
            const insertQuery = `
                INSERT INTO notifications (
                    recipient_id, sender_id, title, message, type, priority,
                    metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            const [result] = await db.execute(insertQuery, [
                recipient.id,
                user_id,
                title,
                message,
                NOTIFICATION_TYPES.ANNOUNCEMENT,
                priority,
                JSON.stringify({ team_id })
            ]);

            notifications.push({
                id: result.insertId,
                recipient_id: recipient.id,
                sender_id: user_id,
                title,
                message,
                type: NOTIFICATION_TYPES.ANNOUNCEMENT,
                priority,
                metadata: { team_id },
                read: false,
                created_at: new Date().toISOString()
            });

            // Send email notification
            if (send_email) {
                try {
                    await emailService.sendTeamAnnouncementEmail({
                        to: recipient.email,
                        recipientName: recipient.first_name,
                        title,
                        message,
                        priority,
                        teamId: team_id
                    });
                } catch (emailError) {
                    console.error('Error sending announcement email:', emailError);
                }
            }
        }

        // Broadcast to real-time clients
        if (global.notificationBroadcast) {
            notifications.forEach(notification => {
                global.notificationBroadcast(notification.recipient_id, {
                    type: 'notification',
                    notification
                });
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Team announcement sent successfully',
            recipients: recipients.length,
            notifications
        });
    } catch (error) {
        console.error('Error sending team announcement:', error);
        res.status(500).json({ error: 'Failed to send team announcement' });
    }
});

/**
 * POST /api/notifications/emergency-alert - Send emergency alert
 */
router.post('/emergency-alert', isAdminOrCoach, [
    body('title').notEmpty().withMessage('Title is required'),
    body('message').notEmpty().withMessage('Message is required'),
    body('scope').isIn(['academy', 'team']).withMessage('Scope must be academy or team'),
    body('team_id').optional().isInt().withMessage('Invalid team ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { 
            title, 
            message, 
            scope, 
            team_id,
            action_url 
        } = req.body;
        const { user_id } = req.user;

        // Get recipients based on scope
        let recipientQuery;
        let queryParams = [];

        if (scope === 'academy') {
            // All users
            recipientQuery = `
                SELECT id, email, first_name, role
                FROM users
                WHERE active = TRUE
            `;
        } else if (scope === 'team' && team_id) {
            // Team members and their parents
            recipientQuery = `
                SELECT DISTINCT u.id, u.email, u.first_name, u.role
                FROM users u
                WHERE u.id IN (
                    SELECT DISTINCT p.user_id
                    FROM players p
                    WHERE p.team_id = ?
                    UNION
                    SELECT DISTINCT pcr.parent_id
                    FROM parent_child_relationships pcr
                    JOIN players p ON pcr.child_id = p.id
                    WHERE p.team_id = ?
                )
            `;
            queryParams = [team_id, team_id];
        } else {
            return res.status(400).json({ error: 'Team ID required for team scope' });
        }

        const [recipients] = await db.execute(recipientQuery, queryParams);

        if (recipients.length === 0) {
            return res.status(404).json({ error: 'No recipients found' });
        }

        const notifications = [];

        // Create emergency notifications
        for (const recipient of recipients) {
            const insertQuery = `
                INSERT INTO notifications (
                    recipient_id, sender_id, title, message, type, priority,
                    action_url, metadata, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
            `;

            const [result] = await db.execute(insertQuery, [
                recipient.id,
                user_id,
                title,
                message,
                NOTIFICATION_TYPES.EMERGENCY,
                NOTIFICATION_PRIORITIES.URGENT,
                action_url || null,
                JSON.stringify({ scope, team_id })
            ]);

            notifications.push({
                id: result.insertId,
                recipient_id: recipient.id,
                sender_id: user_id,
                title,
                message,
                type: NOTIFICATION_TYPES.EMERGENCY,
                priority: NOTIFICATION_PRIORITIES.URGENT,
                action_url,
                metadata: { scope, team_id },
                read: false,
                created_at: new Date().toISOString()
            });

            // Send emergency email
            try {
                await emailService.sendEmergencyAlert({
                    to: recipient.email,
                    recipientName: recipient.first_name,
                    title,
                    message,
                    actionUrl: action_url
                });
            } catch (emailError) {
                console.error('Error sending emergency email:', emailError);
            }
        }

        // Broadcast emergency alert
        if (global.notificationBroadcast) {
            notifications.forEach(notification => {
                global.notificationBroadcast(notification.recipient_id, {
                    type: 'notification',
                    notification
                });
            });
        }

        res.status(201).json({ 
            success: true, 
            message: 'Emergency alert sent successfully',
            recipients: recipients.length,
            notifications
        });
    } catch (error) {
        console.error('Error sending emergency alert:', error);
        res.status(500).json({ error: 'Failed to send emergency alert' });
    }
});

module.exports = router;