const Player = require('../models/Player');
const database = require('../database/database');

class ParentController {
    // Get parent's children (players)
    static async getMyChildren(req, res) {
        try {
            // Get all children associated with this parent
            const children = await database.all(`
                SELECT 
                    p.id,
                    p.jersey_number,
                    p.position,
                    p.birth_date,
                    p.height,
                    p.weight,
                    p.dominant_foot,
                    p.is_active,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    t.name as team_name,
                    t.age_group,
                    t.division
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE fr.parent_id = ? AND fr.relationship_type IN ('father', 'mother', 'guardian')
                ORDER BY u.first_name, u.last_name
            `, [req.user.id]);

            // Get basic statistics for each child
            const childrenWithStats = await Promise.all(children.map(async (child) => {
                // Get recent match statistics
                const matchStats = await database.get(`
                    SELECT 
                        COUNT(DISTINCT mp.match_id) as matches_played,
                        SUM(mp.goals) as total_goals,
                        SUM(mp.assists) as total_assists,
                        AVG(mp.performance_rating) as avg_rating
                    FROM match_players mp
                    JOIN matches m ON mp.match_id = m.id
                    WHERE mp.player_id = ? AND m.status = 'completed'
                        AND m.match_date >= date('now', '-30 days')
                `, [child.id]);

                // Get attendance statistics
                const attendanceStats = await database.get(`
                    SELECT 
                        COUNT(*) as total_trainings,
                        SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as attended,
                        ROUND(SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as attendance_percentage
                    FROM training_participants tp
                    JOIN trainings t ON tp.training_id = t.id
                    WHERE tp.player_id = ? AND t.training_date >= date('now', '-30 days')
                `, [child.id]);

                // Get active injuries
                const activeInjuries = await database.all(`
                    SELECT type, severity, injury_date, expected_recovery_date
                    FROM injuries
                    WHERE player_id = ? AND status = 'active'
                    ORDER BY injury_date DESC
                `, [child.id]);

                return {
                    ...child,
                    recent_stats: {
                        matches: matchStats || {},
                        attendance: attendanceStats || {}
                    },
                    active_injuries: activeInjuries
                };
            }));

            res.status(200).json({
                success: true,
                message: 'Children retrieved successfully',
                children: childrenWithStats,
                count: childrenWithStats.length
            });

        } catch (error) {
            console.error('Get children error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve children information'
            });
        }
    }

    // Get detailed information for a specific child
    static async getChildDetails(req, res) {
        try {
            const { childId } = req.params;

            // Verify parent-child relationship
            const relationship = await database.get(`
                SELECT fr.*, p.id as player_id, u.first_name, u.last_name
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE fr.parent_id = ? AND p.id = ? 
                    AND fr.relationship_type IN ('father', 'mother', 'guardian')
            `, [req.user.id, childId]);

            if (!relationship) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You do not have access to this player information'
                });
            }

            // Get comprehensive child information
            const child = await database.get(`
                SELECT 
                    p.*,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    t.name as team_name,
                    t.age_group,
                    t.division
                FROM players p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE p.id = ?
            `, [childId]);

            // Get detailed statistics
            const stats = await database.get(`
                SELECT 
                    COUNT(DISTINCT mp.match_id) as matches_played,
                    SUM(mp.goals) as total_goals,
                    SUM(mp.assists) as total_assists,
                    SUM(mp.yellow_cards) as total_yellow_cards,
                    SUM(mp.red_cards) as total_red_cards,
                    AVG(mp.performance_rating) as avg_match_rating,
                    SUM(mp.minutes_played) as total_minutes
                FROM match_players mp
                JOIN matches m ON mp.match_id = m.id
                WHERE mp.player_id = ? AND m.status = 'completed'
            `, [childId]);

            // Get recent matches
            const recentMatches = await database.all(`
                SELECT 
                    m.match_date,
                    m.opponent_name,
                    m.is_home_game,
                    m.home_score,
                    m.away_score,
                    m.status,
                    mp.minutes_played,
                    mp.goals,
                    mp.assists,
                    mp.performance_rating,
                    mp.starter
                FROM matches m
                LEFT JOIN match_players mp ON m.id = mp.match_id AND mp.player_id = ?
                WHERE m.team_id = ? AND m.status = 'completed'
                ORDER BY m.match_date DESC
                LIMIT 10
            `, [childId, child.team_id]);

            // Get attendance statistics
            const attendanceStats = await database.get(`
                SELECT 
                    COUNT(*) as total_trainings,
                    SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as attended,
                    SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END) as late,
                    AVG(performance_rating) as avg_training_rating,
                    ROUND(SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as attendance_percentage
                FROM training_participants tp
                JOIN trainings t ON tp.training_id = t.id
                WHERE tp.player_id = ? AND t.training_date >= date('now', '-90 days')
            `, [childId]);

            // Get skill assessments
            const skillAssessments = await database.all(`
                SELECT DISTINCT
                    sa1.skill_category,
                    sa1.skill_name,
                    sa1.score,
                    sa1.assessment_date,
                    sa1.notes
                FROM skills_assessments sa1
                WHERE sa1.player_id = ?
                AND sa1.assessment_date = (
                    SELECT MAX(sa2.assessment_date)
                    FROM skills_assessments sa2
                    WHERE sa2.player_id = sa1.player_id
                    AND sa2.skill_name = sa1.skill_name
                )
                ORDER BY sa1.skill_category, sa1.skill_name
            `, [childId]);

            // Get injury history
            const injuries = await database.all(`
                SELECT 
                    type, severity, injury_date, expected_recovery_date,
                    actual_recovery_date, description, status
                FROM injuries
                WHERE player_id = ?
                ORDER BY injury_date DESC
                LIMIT 10
            `, [childId]);

            // Get development plans
            const developmentPlans = await database.all(`
                SELECT 
                    dp.plan_title,
                    dp.objectives,
                    dp.target_date,
                    dp.status,
                    dp.created_at,
                    u.first_name as coach_first_name,
                    u.last_name as coach_last_name
                FROM development_plans dp
                JOIN coaches c ON dp.coach_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE dp.player_id = ?
                ORDER BY dp.created_at DESC
                LIMIT 5
            `, [childId]);

            res.status(200).json({
                success: true,
                message: 'Child details retrieved successfully',
                child: {
                    player_info: child,
                    statistics: {
                        matches: stats || {},
                        attendance: attendanceStats || {}
                    },
                    recent_matches: recentMatches,
                    skill_assessments: skillAssessments,
                    injury_history: injuries,
                    development_plans: developmentPlans.map(plan => ({
                        ...plan,
                        coach_name: `${plan.coach_first_name} ${plan.coach_last_name}`
                    }))
                }
            });

        } catch (error) {
            console.error('Get child details error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve child details'
            });
        }
    }

    // Get upcoming matches for all children
    static async getUpcomingMatches(req, res) {
        try {
            const upcomingMatches = await database.all(`
                SELECT 
                    m.id,
                    m.match_date,
                    m.start_time,
                    m.opponent_name,
                    m.is_home_game,
                    m.location,
                    m.status,
                    p.id as player_id,
                    u.first_name,
                    u.last_name,
                    t.name as team_name
                FROM matches m
                JOIN teams t ON m.team_id = t.id
                JOIN players p ON p.team_id = t.id
                JOIN users u ON p.user_id = u.id
                JOIN family_relationships fr ON fr.player_id = p.id
                WHERE fr.parent_id = ? 
                    AND m.status IN ('scheduled', 'confirmed')
                    AND m.match_date >= date('now')
                    AND fr.relationship_type IN ('father', 'mother', 'guardian')
                ORDER BY m.match_date ASC, m.start_time ASC
            `, [req.user.id]);

            res.status(200).json({
                success: true,
                message: 'Upcoming matches retrieved successfully',
                matches: upcomingMatches,
                count: upcomingMatches.length
            });

        } catch (error) {
            console.error('Get upcoming matches error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve upcoming matches'
            });
        }
    }

    // Get upcoming trainings for all children
    static async getUpcomingTrainings(req, res) {
        try {
            const upcomingTrainings = await database.all(`
                SELECT 
                    t.id,
                    t.training_date,
                    t.start_time,
                    t.end_time,
                    t.training_type,
                    t.location,
                    t.status,
                    p.id as player_id,
                    u.first_name,
                    u.last_name,
                    tm.name as team_name
                FROM trainings t
                JOIN teams tm ON t.team_id = tm.id
                JOIN players p ON p.team_id = tm.id
                JOIN users u ON p.user_id = u.id
                JOIN family_relationships fr ON fr.player_id = p.id
                WHERE fr.parent_id = ? 
                    AND t.status = 'scheduled'
                    AND t.training_date >= date('now')
                    AND fr.relationship_type IN ('father', 'mother', 'guardian')
                ORDER BY t.training_date ASC, t.start_time ASC
            `, [req.user.id]);

            res.status(200).json({
                success: true,
                message: 'Upcoming trainings retrieved successfully',
                trainings: upcomingTrainings,
                count: upcomingTrainings.length
            });

        } catch (error) {
            console.error('Get upcoming trainings error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve upcoming trainings'
            });
        }
    }

    // Get announcements for all children's teams
    static async getAnnouncements(req, res) {
        try {
            const { limit = 20, offset = 0 } = req.query;

            const announcements = await database.all(`
                SELECT DISTINCT
                    a.id,
                    a.title,
                    a.content,
                    a.announcement_type,
                    a.priority,
                    a.published_date,
                    a.expires_at,
                    t.name as team_name,
                    u.first_name as author_first_name,
                    u.last_name as author_last_name
                FROM announcements a
                JOIN teams t ON a.team_id = t.id
                JOIN users u ON a.created_by = u.id
                JOIN players p ON p.team_id = t.id
                JOIN family_relationships fr ON fr.player_id = p.id
                WHERE fr.parent_id = ? 
                    AND fr.relationship_type IN ('father', 'mother', 'guardian')
                    AND a.is_published = 1
                    AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
                ORDER BY a.priority DESC, a.published_date DESC
                LIMIT ? OFFSET ?
            `, [req.user.id, parseInt(limit), parseInt(offset)]);

            // Get total count for pagination
            const totalResult = await database.get(`
                SELECT COUNT(DISTINCT a.id) as total
                FROM announcements a
                JOIN teams t ON a.team_id = t.id
                JOIN players p ON p.team_id = t.id
                JOIN family_relationships fr ON fr.player_id = p.id
                WHERE fr.parent_id = ? 
                    AND fr.relationship_type IN ('father', 'mother', 'guardian')
                    AND a.is_published = 1
                    AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
            `, [req.user.id]);

            res.status(200).json({
                success: true,
                message: 'Announcements retrieved successfully',
                announcements: announcements.map(announcement => ({
                    ...announcement,
                    author_name: `${announcement.author_first_name} ${announcement.author_last_name}`
                })),
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Get announcements error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve announcements'
            });
        }
    }

    // Update emergency contact information for a child
    static async updateChildEmergencyContact(req, res) {
        try {
            const { childId } = req.params;
            const {
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship,
                medical_notes
            } = req.body;

            // Verify parent-child relationship
            const relationship = await database.get(`
                SELECT fr.*, p.id as player_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ? AND p.id = ? 
                    AND fr.relationship_type IN ('father', 'mother', 'guardian')
            `, [req.user.id, childId]);

            if (!relationship) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You do not have permission to update this player information'
                });
            }

            // Update player emergency contact information
            const updates = [];
            const values = [];

            if (emergency_contact_name !== undefined) {
                updates.push('emergency_contact_name = ?');
                values.push(emergency_contact_name);
            }

            if (emergency_contact_phone !== undefined) {
                updates.push('emergency_contact_phone = ?');
                values.push(emergency_contact_phone);
            }

            if (emergency_contact_relationship !== undefined) {
                updates.push('emergency_contact_relationship = ?');
                values.push(emergency_contact_relationship);
            }

            if (medical_notes !== undefined) {
                updates.push('medical_notes = ?');
                values.push(medical_notes);
            }

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                values.push(childId);

                await database.run(`
                    UPDATE players SET ${updates.join(', ')}
                    WHERE id = ?
                `, values);
            }

            res.status(200).json({
                success: true,
                message: 'Emergency contact information updated successfully',
                updated_by: {
                    id: req.user.id,
                    name: req.user.getFullName()
                }
            });

        } catch (error) {
            console.error('Update emergency contact error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to update emergency contact information'
            });
        }
    }
}

module.exports = ParentController;