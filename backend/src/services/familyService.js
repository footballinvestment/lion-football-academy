/**
 * Family Service
 * Manages parent-child relationships and family access control
 */

const db = require('../database/connection');

class FamilyService {
    
    /**
     * Create a parent-child relationship
     */
    static async createParentChildRelationship(parentId, childId, options = {}) {
        try {
            const relationship = {
                parent_id: parentId,
                child_id: childId,
                relationship_type: options.relationshipType || 'parent',
                custody_type: options.custodyType || 'full',
                primary_contact: options.primaryContact || false,
                emergency_contact: options.emergencyContact !== false, // default true
                can_pickup: options.canPickup !== false, // default true
                can_view_medical: options.canViewMedical !== false, // default true
                can_view_performance: options.canViewPerformance !== false, // default true
                can_receive_notifications: options.canReceiveNotifications !== false, // default true
                notes: options.notes || null,
                created_by: options.createdBy || null
            };

            // Check if relationship already exists
            const existing = await db.query(`
                SELECT id FROM parent_child_relationships 
                WHERE parent_id = ? AND child_id = ? AND active = 1
            `, [parentId, childId]);

            if (existing.length > 0) {
                throw new Error('Parent-child relationship already exists');
            }

            const result = await db.run(`
                INSERT INTO parent_child_relationships (
                    parent_id, child_id, relationship_type, custody_type,
                    primary_contact, emergency_contact, can_pickup, can_view_medical,
                    can_view_performance, can_receive_notifications, notes, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                relationship.parent_id, relationship.child_id, relationship.relationship_type,
                relationship.custody_type, relationship.primary_contact, relationship.emergency_contact,
                relationship.can_pickup, relationship.can_view_medical, relationship.can_view_performance,
                relationship.can_receive_notifications, relationship.notes, relationship.created_by
            ]);

            // Create default privacy settings
            await this.createDefaultPrivacySettings(parentId, childId);

            return result.lastID;

        } catch (error) {
            console.error('Error creating parent-child relationship:', error);
            throw error;
        }
    }

    /**
     * Get children for a parent
     */
    static async getChildrenForParent(parentId) {
        try {
            const children = await db.query(`
                SELECT 
                    p.id, p.name, p.birth_date, p.position, p.jersey_number,
                    p.height_cm, p.weight_kg, p.emergency_contact_name,
                    p.emergency_contact_phone, p.medical_notes,
                    t.name as team_name, t.age_group,
                    pcr.relationship_type, pcr.custody_type, pcr.primary_contact,
                    pcr.can_view_medical, pcr.can_view_performance,
                    pcr.created_at as relationship_created
                FROM parent_child_relationships pcr
                JOIN players p ON pcr.child_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE pcr.parent_id = ? AND pcr.active = 1
                ORDER BY p.name
            `, [parentId]);

            return children;
        } catch (error) {
            console.error('Error getting children for parent:', error);
            throw error;
        }
    }

    /**
     * Get parents for a child
     */
    static async getParentsForChild(childId) {
        try {
            const parents = await db.query(`
                SELECT 
                    u.id, u.username, u.email, u.full_name, u.last_login,
                    pcr.relationship_type, pcr.custody_type, pcr.primary_contact,
                    pcr.emergency_contact, pcr.can_pickup, pcr.can_view_medical,
                    pcr.can_view_performance, pcr.can_receive_notifications,
                    pcr.notes, pcr.created_at as relationship_created
                FROM parent_child_relationships pcr
                JOIN users u ON pcr.parent_id = u.id
                WHERE pcr.child_id = ? AND pcr.active = 1 AND u.active = 1
                ORDER BY pcr.primary_contact DESC, u.full_name
            `, [childId]);

            return parents;
        } catch (error) {
            console.error('Error getting parents for child:', error);
            throw error;
        }
    }

    /**
     * Check if parent has access to child
     */
    static async hasParentAccess(parentId, childId, accessType = 'view') {
        try {
            const relationship = await db.query(`
                SELECT 
                    can_view_medical, can_view_performance, can_pickup,
                    can_receive_notifications, active
                FROM parent_child_relationships
                WHERE parent_id = ? AND child_id = ? AND active = 1
            `, [parentId, childId]);

            if (relationship.length === 0) {
                return false;
            }

            const access = relationship[0];
            
            switch (accessType) {
                case 'medical':
                    return access.can_view_medical === 1;
                case 'performance':
                    return access.can_view_performance === 1;
                case 'pickup':
                    return access.can_pickup === 1;
                case 'notifications':
                    return access.can_receive_notifications === 1;
                default:
                    return access.active === 1;
            }
        } catch (error) {
            console.error('Error checking parent access:', error);
            return false;
        }
    }

    /**
     * Get child's performance data for parent
     */
    static async getChildPerformanceForParent(parentId, childId) {
        try {
            // Check access first
            if (!await this.hasParentAccess(parentId, childId, 'performance')) {
                throw new Error('Access denied: Parent cannot view performance data for this child');
            }

            const performance = await db.query(`
                SELECT 
                    pmp.id, pmp.match_id, pmp.position, pmp.minutes_played,
                    pmp.goals, pmp.assists, pmp.yellow_cards, pmp.red_cards,
                    pmp.performance_rating,
                    m.match_date, m.match_time, m.venue, m.match_type,
                    m.home_team_name, m.away_team_name, m.home_score, m.away_score
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                WHERE pmp.player_id = ?
                ORDER BY m.match_date DESC
                LIMIT 20
            `, [childId]);

            return performance;
        } catch (error) {
            console.error('Error getting child performance for parent:', error);
            throw error;
        }
    }

    /**
     * Get child's injuries for parent
     */
    static async getChildInjuriesForParent(parentId, childId) {
        try {
            // Check access first
            if (!await this.hasParentAccess(parentId, childId, 'medical')) {
                throw new Error('Access denied: Parent cannot view medical data for this child');
            }

            const injuries = await db.query(`
                SELECT 
                    i.id, i.injury_type, i.injury_severity, i.injury_location,
                    i.injury_date, i.expected_recovery_date, i.actual_recovery_date,
                    i.injury_mechanism, i.description, i.status, i.recovery_notes
                FROM injuries i
                WHERE i.player_id = ?
                ORDER BY i.injury_date DESC
            `, [childId]);

            return injuries;
        } catch (error) {
            console.error('Error getting child injuries for parent:', error);
            throw error;
        }
    }

    /**
     * Get child's development plans for parent
     */
    static async getChildDevelopmentForParent(parentId, childId) {
        try {
            // Check access first
            if (!await this.hasParentAccess(parentId, childId, 'performance')) {
                throw new Error('Access denied: Parent cannot view development data for this child');
            }

            const development = await db.query(`
                SELECT 
                    dp.id, dp.plan_type, dp.target_skills, dp.goals,
                    dp.timeline, dp.priority, dp.season, dp.specific_objectives,
                    dp.success_metrics, dp.coach_notes, dp.progress_percentage,
                    dp.status, dp.created_at, dp.last_updated
                FROM development_plans dp
                WHERE dp.player_id = ?
                ORDER BY dp.last_updated DESC
            `, [childId]);

            return development;
        } catch (error) {
            console.error('Error getting child development for parent:', error);
            throw error;
        }
    }

    /**
     * Create default privacy settings
     */
    static async createDefaultPrivacySettings(parentId, childId) {
        try {
            await db.run(`
                INSERT INTO family_privacy_settings (
                    parent_id, child_id, share_performance_stats,
                    share_medical_info, share_development_plans,
                    share_training_attendance, share_match_participation,
                    share_injury_reports, allow_coach_contact
                ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, 1)
            `, [parentId, childId]);
        } catch (error) {
            // If already exists, ignore
            if (!error.message.includes('UNIQUE constraint failed')) {
                throw error;
            }
        }
    }

    /**
     * Update privacy settings
     */
    static async updatePrivacySettings(parentId, childId, settings) {
        try {
            const setClause = Object.keys(settings).map(key => `${key} = ?`).join(', ');
            const values = Object.values(settings);
            values.push(parentId, childId);

            await db.run(`
                UPDATE family_privacy_settings 
                SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
                WHERE parent_id = ? AND child_id = ?
            `, values);

        } catch (error) {
            console.error('Error updating privacy settings:', error);
            throw error;
        }
    }

    /**
     * Log parent activity
     */
    static async logParentActivity(parentId, childId, activityType, description, metadata = {}) {
        try {
            await db.run(`
                INSERT INTO parent_activity_log (
                    parent_id, child_id, activity_type, activity_description,
                    ip_address, user_agent, session_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                parentId, childId, activityType, description,
                metadata.ipAddress || null,
                metadata.userAgent || null,
                metadata.sessionId || null
            ]);
        } catch (error) {
            console.error('Error logging parent activity:', error);
            // Don't throw error for logging failures
        }
    }

    /**
     * Create family notification
     */
    static async createFamilyNotification(parentId, childId, type, title, message, options = {}) {
        try {
            await db.run(`
                INSERT INTO family_notifications (
                    parent_id, child_id, notification_type, title, message,
                    priority, action_required, related_table, related_id,
                    scheduled_for, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                parentId, childId, type, title, message,
                options.priority || 'normal',
                options.actionRequired || false,
                options.relatedTable || null,
                options.relatedId || null,
                options.scheduledFor || null,
                options.expiresAt || null
            ]);
        } catch (error) {
            console.error('Error creating family notification:', error);
            throw error;
        }
    }

    /**
     * Get unread notifications for parent
     */
    static async getUnreadNotifications(parentId) {
        try {
            const notifications = await db.query(`
                SELECT 
                    fn.id, fn.notification_type, fn.title, fn.message,
                    fn.priority, fn.action_required, fn.created_at,
                    p.name as child_name
                FROM family_notifications fn
                JOIN players p ON fn.child_id = p.id
                WHERE fn.parent_id = ? AND fn.read_status = 0
                AND (fn.expires_at IS NULL OR fn.expires_at > CURRENT_TIMESTAMP)
                ORDER BY fn.created_at DESC
            `, [parentId]);

            return notifications;
        } catch (error) {
            console.error('Error getting unread notifications:', error);
            throw error;
        }
    }

    /**
     * Mark notification as read
     */
    static async markNotificationAsRead(parentId, notificationId) {
        try {
            await db.run(`
                UPDATE family_notifications 
                SET read_status = 1, read_at = CURRENT_TIMESTAMP 
                WHERE id = ? AND parent_id = ?
            `, [notificationId, parentId]);
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    /**
     * Get family dashboard data for parent
     */
    static async getFamilyDashboard(parentId) {
        try {
            const children = await this.getChildrenForParent(parentId);
            const notifications = await this.getUnreadNotifications(parentId);
            
            // Get recent activities for all children
            const childIds = children.map(child => child.id);
            let recentActivities = [];
            
            if (childIds.length > 0) {
                const placeholders = childIds.map(() => '?').join(',');
                recentActivities = await db.query(`
                    SELECT 
                        'match' as activity_type,
                        m.match_date as activity_date,
                        'Match vs ' || m.away_team_name as description,
                        p.name as child_name,
                        m.home_score || '-' || m.away_score as result
                    FROM matches m
                    JOIN players p ON (m.home_team_id = p.team_id OR m.away_team_id = p.team_id)
                    WHERE p.id IN (${placeholders})
                    AND m.match_status = 'finished'
                    AND m.match_date >= date('now', '-30 days')
                    ORDER BY m.match_date DESC
                    LIMIT 10
                `, childIds);
            }

            return {
                children: children,
                notifications: notifications,
                recentActivities: recentActivities,
                summary: {
                    totalChildren: children.length,
                    unreadNotifications: notifications.length,
                    recentActivities: recentActivities.length
                }
            };
        } catch (error) {
            console.error('Error getting family dashboard:', error);
            throw error;
        }
    }
}

module.exports = FamilyService;