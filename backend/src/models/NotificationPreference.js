const db = require('../database/connection');

class NotificationPreference {
    static async createTable() {
        const sql = `
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                email_enabled BOOLEAN DEFAULT 1,
                training_reminders BOOLEAN DEFAULT 1,
                weekly_reports BOOLEAN DEFAULT 1,
                attendance_alerts BOOLEAN DEFAULT 1,
                system_notifications BOOLEAN DEFAULT 1,
                announcement_emails BOOLEAN DEFAULT 1,
                frequency_training_reminders VARCHAR(20) DEFAULT '24h',
                frequency_weekly_reports VARCHAR(20) DEFAULT 'weekly',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )
        `;
        
        await db.run(sql);
    }

    static async create(userId, preferences = {}) {
        const {
            email_enabled = true,
            training_reminders = true,
            weekly_reports = true,
            attendance_alerts = true,
            system_notifications = true,
            announcement_emails = true,
            frequency_training_reminders = '24h',
            frequency_weekly_reports = 'weekly'
        } = preferences;

        const sql = `
            INSERT INTO notification_preferences (
                user_id, email_enabled, training_reminders, weekly_reports,
                attendance_alerts, system_notifications, announcement_emails,
                frequency_training_reminders, frequency_weekly_reports
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        return await db.run(sql, [
            userId, email_enabled, training_reminders, weekly_reports,
            attendance_alerts, system_notifications, announcement_emails,
            frequency_training_reminders, frequency_weekly_reports
        ]);
    }

    static async findByUserId(userId) {
        const sql = `
            SELECT * FROM notification_preferences 
            WHERE user_id = ?
        `;
        const results = await db.query(sql, [userId]);
        return results[0] || null;
    }

    static async update(userId, preferences) {
        const existingPrefs = await this.findByUserId(userId);
        
        if (!existingPrefs) {
            // Create default preferences if they don't exist
            return await this.create(userId, preferences);
        }

        const {
            email_enabled,
            training_reminders,
            weekly_reports,
            attendance_alerts,
            system_notifications,
            announcement_emails,
            frequency_training_reminders,
            frequency_weekly_reports
        } = preferences;

        const sql = `
            UPDATE notification_preferences SET
                email_enabled = COALESCE(?, email_enabled),
                training_reminders = COALESCE(?, training_reminders),
                weekly_reports = COALESCE(?, weekly_reports),
                attendance_alerts = COALESCE(?, attendance_alerts),
                system_notifications = COALESCE(?, system_notifications),
                announcement_emails = COALESCE(?, announcement_emails),
                frequency_training_reminders = COALESCE(?, frequency_training_reminders),
                frequency_weekly_reports = COALESCE(?, frequency_weekly_reports),
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = ?
        `;

        return await db.run(sql, [
            email_enabled, training_reminders, weekly_reports,
            attendance_alerts, system_notifications, announcement_emails,
            frequency_training_reminders, frequency_weekly_reports, userId
        ]);
    }

    static async getOrCreateDefault(userId) {
        let preferences = await this.findByUserId(userId);
        
        if (!preferences) {
            await this.create(userId);
            preferences = await this.findByUserId(userId);
        }
        
        return preferences;
    }

    static async getUsersWithEnabledNotification(notificationType) {
        const sql = `
            SELECT u.*, np.*
            FROM users u
            JOIN notification_preferences np ON u.id = np.user_id
            WHERE u.active = 1 
            AND u.email IS NOT NULL 
            AND u.email != ''
            AND np.email_enabled = 1
            AND np.${notificationType} = 1
        `;
        
        return await db.query(sql);
    }

    static async bulkOptOut(userIds, notificationType) {
        if (!userIds || userIds.length === 0) return;
        
        const placeholders = userIds.map(() => '?').join(',');
        const sql = `
            UPDATE notification_preferences 
            SET ${notificationType} = 0, updated_at = CURRENT_TIMESTAMP
            WHERE user_id IN (${placeholders})
        `;
        
        return await db.run(sql, userIds);
    }

    static async getNotificationStats() {
        const sql = `
            SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN email_enabled = 1 THEN 1 ELSE 0 END) as email_enabled_count,
                SUM(CASE WHEN training_reminders = 1 THEN 1 ELSE 0 END) as training_reminders_count,
                SUM(CASE WHEN weekly_reports = 1 THEN 1 ELSE 0 END) as weekly_reports_count,
                SUM(CASE WHEN attendance_alerts = 1 THEN 1 ELSE 0 END) as attendance_alerts_count,
                SUM(CASE WHEN system_notifications = 1 THEN 1 ELSE 0 END) as system_notifications_count,
                SUM(CASE WHEN announcement_emails = 1 THEN 1 ELSE 0 END) as announcement_emails_count
            FROM notification_preferences np
            JOIN users u ON np.user_id = u.id
            WHERE u.active = 1
        `;
        
        const results = await db.query(sql);
        return results[0] || {};
    }
}

module.exports = NotificationPreference;