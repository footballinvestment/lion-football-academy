const Player = require('../models/Player');
const database = require('../database/database');

class PlayerController {
    // Get player's own profile and statistics
    static async getMyProfile(req, res) {
        try {
            // Get player profile
            const player = await Player.findByUserId(req.user.id);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player profile not found',
                    message: 'No player profile associated with this user'
                });
            }

            // Get comprehensive player statistics
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
            `, [player.id]);

            // Get training attendance statistics
            const attendanceStats = await database.get(`
                SELECT 
                    COUNT(*) as total_trainings,
                    SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as attended,
                    SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent,
                    AVG(performance_rating) as avg_training_rating,
                    ROUND(SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as attendance_percentage
                FROM training_participants tp
                JOIN trainings t ON tp.training_id = t.id
                WHERE tp.player_id = ? AND t.training_date >= date('now', '-30 days')
            `, [player.id]);

            // Get team information
            const team = await database.get(`
                SELECT id, name, age_group, division
                FROM teams 
                WHERE id = ?
            `, [player.team_id]);

            // Get latest skill assessments
            const latestSkills = await database.all(`
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
            `, [player.id]);

            // Get active injuries
            const activeInjuries = await database.all(`
                SELECT 
                    type, severity, injury_date, expected_recovery_date,
                    description, treatment_plan, status
                FROM injuries
                WHERE player_id = ? AND status = 'active'
                ORDER BY injury_date DESC
            `, [player.id]);

            res.status(200).json({
                success: true,
                message: 'Player profile retrieved successfully',
                profile: {
                    player_info: {
                        ...player,
                        user: {
                            first_name: req.user.first_name,
                            last_name: req.user.last_name,
                            email: req.user.email,
                            phone: req.user.phone
                        }
                    },
                    team: team,
                    statistics: {
                        matches: stats || {},
                        attendance: attendanceStats || {}
                    },
                    skills: latestSkills,
                    active_injuries: activeInjuries
                }
            });

        } catch (error) {
            console.error('Get player profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve player profile'
            });
        }
    }

    // Get player's match history
    static async getMyMatches(req, res) {
        try {
            const player = await Player.findByUserId(req.user.id);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player profile not found',
                    message: 'No player profile associated with this user'
                });
            }

            const { season, limit = 20, offset = 0 } = req.query;

            let query = `
                SELECT 
                    m.id,
                    m.match_date,
                    m.opponent_name,
                    m.is_home_game,
                    m.home_score,
                    m.away_score,
                    m.status,
                    m.season,
                    mp.minutes_played,
                    mp.goals,
                    mp.assists,
                    mp.yellow_cards,
                    mp.red_cards,
                    mp.performance_rating,
                    mp.performance_notes,
                    mp.starter
                FROM matches m
                LEFT JOIN match_players mp ON m.id = mp.match_id AND mp.player_id = ?
                WHERE m.team_id = ?
            `;

            const params = [player.id, player.team_id];

            if (season) {
                query += ' AND m.season = ?';
                params.push(season);
            }

            query += ` 
                ORDER BY m.match_date DESC 
                LIMIT ? OFFSET ?
            `;
            params.push(parseInt(limit), parseInt(offset));

            const matches = await database.all(query, params);

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM matches m 
                WHERE m.team_id = ?
            `;
            const countParams = [player.team_id];

            if (season) {
                countQuery += ' AND m.season = ?';
                countParams.push(season);
            }

            const totalResult = await database.get(countQuery, countParams);

            res.status(200).json({
                success: true,
                message: 'Match history retrieved successfully',
                matches: matches.map(match => ({
                    ...match,
                    participated: match.minutes_played !== null,
                    result: match.status === 'completed' ? 
                        (match.is_home_game ? 
                            (match.home_score > match.away_score ? 'win' : 
                             match.home_score < match.away_score ? 'loss' : 'draw') :
                            (match.away_score > match.home_score ? 'win' : 
                             match.away_score < match.home_score ? 'loss' : 'draw')) : 
                        null
                })),
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Get player matches error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve match history'
            });
        }
    }

    // Get player's training history
    static async getMyTrainings(req, res) {
        try {
            const player = await Player.findByUserId(req.user.id);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player profile not found',
                    message: 'No player profile associated with this user'
                });
            }

            const { from_date, to_date, limit = 30, offset = 0 } = req.query;

            let query = `
                SELECT 
                    t.id,
                    t.training_date,
                    t.start_time,
                    t.end_time,
                    t.training_type,
                    t.focus_areas,
                    t.location,
                    t.status,
                    tp.attendance_status,
                    tp.performance_rating,
                    tp.notes as attendance_notes
                FROM trainings t
                LEFT JOIN training_participants tp ON t.id = tp.training_id AND tp.player_id = ?
                WHERE t.team_id = ?
            `;

            const params = [player.id, player.team_id];

            if (from_date) {
                query += ' AND t.training_date >= ?';
                params.push(from_date);
            }

            if (to_date) {
                query += ' AND t.training_date <= ?';
                params.push(to_date);
            }

            query += ` 
                ORDER BY t.training_date DESC 
                LIMIT ? OFFSET ?
            `;
            params.push(parseInt(limit), parseInt(offset));

            const trainings = await database.all(query, params);

            // Get total count for pagination
            let countQuery = `
                SELECT COUNT(*) as total 
                FROM trainings t 
                WHERE t.team_id = ?
            `;
            const countParams = [player.team_id];

            if (from_date) {
                countQuery += ' AND t.training_date >= ?';
                countParams.push(from_date);
            }

            if (to_date) {
                countQuery += ' AND t.training_date <= ?';
                countParams.push(to_date);
            }

            const totalResult = await database.get(countQuery, countParams);

            res.status(200).json({
                success: true,
                message: 'Training history retrieved successfully',
                trainings: trainings.map(training => ({
                    ...training,
                    participated: training.attendance_status !== null
                })),
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: totalResult.total,
                    pages: Math.ceil(totalResult.total / parseInt(limit))
                }
            });

        } catch (error) {
            console.error('Get player trainings error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve training history'
            });
        }
    }

    // Update player's own profile
    static async updateMyProfile(req, res) {
        try {
            const player = await Player.findByUserId(req.user.id);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player profile not found',
                    message: 'No player profile associated with this user'
                });
            }

            const {
                phone,
                medical_notes,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship,
                profile_image
            } = req.body;

            // Update user information (phone)
            if (phone !== undefined) {
                await database.run(`
                    UPDATE users SET phone = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                `, [phone, req.user.id]);
            }

            // Update player-specific information
            const allowedPlayerFields = {
                medical_notes,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relationship,
                profile_image
            };

            const updates = [];
            const values = [];

            Object.entries(allowedPlayerFields).forEach(([field, value]) => {
                if (value !== undefined) {
                    updates.push(`${field} = ?`);
                    values.push(value);
                }
            });

            if (updates.length > 0) {
                updates.push('updated_at = CURRENT_TIMESTAMP');
                values.push(player.id);

                await database.run(`
                    UPDATE players SET ${updates.join(', ')}
                    WHERE id = ?
                `, values);
            }

            // Get updated profile
            const updatedPlayer = await Player.findByUserId(req.user.id);

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                player: {
                    ...updatedPlayer,
                    user: {
                        first_name: req.user.first_name,
                        last_name: req.user.last_name,
                        email: req.user.email,
                        phone: phone !== undefined ? phone : req.user.phone
                    }
                }
            });

        } catch (error) {
            console.error('Update player profile error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to update profile'
            });
        }
    }

    // Get player's development plans
    static async getMyDevelopmentPlans(req, res) {
        try {
            const player = await Player.findByUserId(req.user.id);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player profile not found',
                    message: 'No player profile associated with this user'
                });
            }

            const { status } = req.query;

            let query = `
                SELECT 
                    dp.*,
                    u.first_name as coach_first_name,
                    u.last_name as coach_last_name
                FROM development_plans dp
                JOIN coaches c ON dp.coach_id = c.id
                JOIN users u ON c.user_id = u.id
                WHERE dp.player_id = ?
            `;
            const params = [player.id];

            if (status) {
                query += ' AND dp.status = ?';
                params.push(status);
            }

            query += ' ORDER BY dp.created_at DESC';

            const developmentPlans = await database.all(query, params);

            res.status(200).json({
                success: true,
                message: 'Development plans retrieved successfully',
                development_plans: developmentPlans.map(plan => ({
                    ...plan,
                    coach_name: `${plan.coach_first_name} ${plan.coach_last_name}`
                })),
                count: developmentPlans.length
            });

        } catch (error) {
            console.error('Get development plans error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve development plans'
            });
        }
    }

    // Get player's injury history
    static async getMyInjuries(req, res) {
        try {
            const player = await Player.findByUserId(req.user.id);
            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player profile not found',
                    message: 'No player profile associated with this user'
                });
            }

            const { active_only } = req.query;

            let query = `
                SELECT 
                    type, severity, injury_date, expected_recovery_date,
                    actual_recovery_date, description, treatment_plan, status,
                    created_at
                FROM injuries
                WHERE player_id = ?
            `;
            const params = [player.id];

            if (active_only === 'true') {
                query += ' AND status = "active"';
            }

            query += ' ORDER BY injury_date DESC';

            const injuries = await database.all(query, params);

            res.status(200).json({
                success: true,
                message: 'Injury history retrieved successfully',
                injuries,
                count: injuries.length
            });

        } catch (error) {
            console.error('Get injury history error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve injury history'
            });
        }
    }
}

module.exports = PlayerController;