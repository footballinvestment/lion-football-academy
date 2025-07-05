const Coach = require('../models/Coach');
const Team = require('../models/Team');
const Player = require('../models/Player');
const database = require('../database/database');

class CoachController {
    // Get coach's team information
    static async getTeam(req, res) {
        try {
            // Get coach profile
            const coach = await Coach.findByUserId(req.user.id);
            if (!coach) {
                return res.status(404).json({
                    success: false,
                    error: 'Coach profile not found',
                    message: 'No coach profile associated with this user'
                });
            }

            if (!coach.team_id) {
                return res.status(404).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }

            // Get team details
            const team = await Team.findById(coach.team_id);
            if (!team) {
                return res.status(404).json({
                    success: false,
                    error: 'Team not found',
                    message: 'Assigned team does not exist'
                });
            }

            // Get team statistics
            const teamStats = await team.getStats();

            // Get recent matches
            const recentMatches = await team.getMatches({ limit: 5 });

            // Get upcoming trainings
            const upcomingTrainings = await team.getTrainings({ 
                status: 'scheduled', 
                limit: 5 
            });

            res.status(200).json({
                success: true,
                message: 'Team information retrieved successfully',
                team: {
                    ...team,
                    statistics: teamStats,
                    recent_matches: recentMatches,
                    upcoming_trainings: upcomingTrainings
                },
                coach_role: {
                    is_head_coach: coach.is_head_coach,
                    specialization: coach.specialization,
                    experience_years: coach.experience_years
                }
            });

        } catch (error) {
            console.error('Get team error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve team information'
            });
        }
    }

    // Get team players
    static async getPlayers(req, res) {
        try {
            const coach = await Coach.findByUserId(req.user.id);
            if (!coach || !coach.team_id) {
                return res.status(404).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }

            // Get players with user information
            const players = await database.all(`
                SELECT 
                    p.*,
                    u.first_name,
                    u.last_name,
                    u.email,
                    u.phone,
                    u.is_active as user_active
                FROM players p
                JOIN users u ON p.user_id = u.id
                WHERE p.team_id = ? AND p.is_active = 1
                ORDER BY p.jersey_number ASC, u.last_name ASC
            `, [coach.team_id]);

            // Get recent performance data for each player
            const playersWithStats = await Promise.all(players.map(async (player) => {
                // Get recent match performance
                const recentPerformance = await database.all(`
                    SELECT 
                        mp.*,
                        m.match_date,
                        m.opponent_name
                    FROM match_players mp
                    JOIN matches m ON mp.match_id = m.id
                    WHERE mp.player_id = ? AND m.status = 'completed'
                    ORDER BY m.match_date DESC
                    LIMIT 5
                `, [player.id]);

                // Get training attendance
                const attendanceStats = await database.get(`
                    SELECT 
                        COUNT(*) as total_trainings,
                        SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as attended,
                        SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent,
                        AVG(performance_rating) as avg_performance_rating
                    FROM training_participants tp
                    JOIN trainings t ON tp.training_id = t.id
                    WHERE tp.player_id = ? AND t.team_id = ?
                        AND t.training_date >= date('now', '-30 days')
                `, [player.id, coach.team_id]);

                return {
                    ...player,
                    recent_performance: recentPerformance,
                    attendance_stats: attendanceStats
                };
            }));

            res.status(200).json({
                success: true,
                message: 'Team players retrieved successfully',
                players: playersWithStats,
                count: playersWithStats.length
            });

        } catch (error) {
            console.error('Get players error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve team players'
            });
        }
    }

    // Record player performance
    static async recordPlayerPerformance(req, res) {
        try {
            const { id: playerId } = req.params;
            const {
                training_id,
                match_id,
                performance_rating,
                notes,
                skills_assessment,
                attendance_status
            } = req.body;

            const coach = await Coach.findByUserId(req.user.id);
            if (!coach || !coach.team_id) {
                return res.status(404).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }

            // Verify player belongs to coach's team
            const player = await database.get(`
                SELECT * FROM players WHERE id = ? AND team_id = ?
            `, [playerId, coach.team_id]);

            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found',
                    message: 'Player not found in your team'
                });
            }

            if (training_id) {
                // Record training performance
                await database.run(`
                    INSERT OR REPLACE INTO training_participants 
                    (training_id, player_id, attendance_status, performance_rating, notes)
                    VALUES (?, ?, ?, ?, ?)
                `, [training_id, playerId, attendance_status || 'present', performance_rating, notes]);
            }

            if (match_id) {
                // Record match performance (this would typically be done elsewhere, but adding for completeness)
                await database.run(`
                    INSERT OR REPLACE INTO match_players 
                    (match_id, player_id, performance_rating, performance_notes)
                    VALUES (?, ?, ?, ?)
                `, [match_id, playerId, performance_rating, notes]);
            }

            // Record skills assessment if provided
            if (skills_assessment && Array.isArray(skills_assessment)) {
                for (const skill of skills_assessment) {
                    await database.run(`
                        INSERT INTO skills_assessments 
                        (player_id, assessment_date, assessed_by, skill_category, skill_name, score, notes)
                        VALUES (?, date('now'), ?, ?, ?, ?, ?)
                    `, [
                        playerId,
                        req.user.id,
                        skill.category,
                        skill.name,
                        skill.score,
                        skill.notes
                    ]);
                }
            }

            res.status(201).json({
                success: true,
                message: 'Player performance recorded successfully',
                recorded_by: {
                    id: req.user.id,
                    name: req.user.getFullName()
                }
            });

        } catch (error) {
            console.error('Record performance error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to record player performance'
            });
        }
    }

    // Get team statistics
    static async getStatistics(req, res) {
        try {
            const coach = await Coach.findByUserId(req.user.id);
            if (!coach || !coach.team_id) {
                return res.status(404).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }

            const { season, from_date, to_date } = req.query;

            // Team performance statistics
            const teamStats = await database.get(`
                SELECT 
                    COUNT(DISTINCT m.id) as total_matches,
                    SUM(CASE 
                        WHEN (m.is_home_game = 1 AND m.home_score > m.away_score) OR 
                             (m.is_home_game = 0 AND m.away_score > m.home_score) 
                        THEN 1 ELSE 0 
                    END) as wins,
                    SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as draws,
                    SUM(CASE 
                        WHEN (m.is_home_game = 1 AND m.home_score < m.away_score) OR 
                             (m.is_home_game = 0 AND m.away_score < m.home_score) 
                        THEN 1 ELSE 0 
                    END) as losses,
                    AVG(CASE WHEN m.is_home_game = 1 THEN m.home_score ELSE m.away_score END) as avg_goals_for,
                    AVG(CASE WHEN m.is_home_game = 1 THEN m.away_score ELSE m.home_score END) as avg_goals_against
                FROM matches m
                WHERE m.team_id = ? AND m.status = 'completed'
                ${season ? 'AND m.season = ?' : ''}
                ${from_date ? 'AND m.match_date >= ?' : ''}
                ${to_date ? 'AND m.match_date <= ?' : ''}
            `, [
                coach.team_id,
                ...(season ? [season] : []),
                ...(from_date ? [from_date] : []),
                ...(to_date ? [to_date] : [])
            ].filter(Boolean));

            // Player statistics
            const playerStats = await database.all(`
                SELECT 
                    p.id,
                    u.first_name,
                    u.last_name,
                    p.position,
                    COUNT(DISTINCT mp.match_id) as matches_played,
                    SUM(mp.goals) as total_goals,
                    SUM(mp.assists) as total_assists,
                    AVG(mp.performance_rating) as avg_match_rating,
                    AVG(tp.performance_rating) as avg_training_rating
                FROM players p
                JOIN users u ON p.user_id = u.id
                LEFT JOIN match_players mp ON p.id = mp.player_id
                LEFT JOIN training_participants tp ON p.id = tp.player_id
                WHERE p.team_id = ? AND p.is_active = 1
                GROUP BY p.id, u.first_name, u.last_name, p.position
                ORDER BY total_goals DESC, total_assists DESC
            `, [coach.team_id]);

            // Training attendance statistics
            const attendanceStats = await database.get(`
                SELECT 
                    COUNT(*) as total_training_sessions,
                    COUNT(DISTINCT tp.player_id) as unique_players,
                    AVG(CASE WHEN tp.attendance_status = 'present' THEN 1.0 ELSE 0.0 END) * 100 as avg_attendance_rate,
                    AVG(tp.performance_rating) as avg_training_performance
                FROM trainings t
                LEFT JOIN training_participants tp ON t.id = tp.training_id
                WHERE t.team_id = ? AND t.status = 'completed'
                ${season ? 'AND t.season = ?' : ''}
                ${from_date ? 'AND t.training_date >= ?' : ''}
                ${to_date ? 'AND t.training_date <= ?' : ''}
            `, [
                coach.team_id,
                ...(season ? [season] : []),
                ...(from_date ? [from_date] : []),
                ...(to_date ? [to_date] : [])
            ].filter(Boolean));

            // Injury statistics
            const injuryStats = await database.get(`
                SELECT 
                    COUNT(*) as total_injuries,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_injuries,
                    COUNT(CASE WHEN severity = 'severe' OR severity = 'critical' THEN 1 END) as serious_injuries,
                    AVG(julianday(COALESCE(actual_recovery_date, date('now'))) - julianday(injury_date)) as avg_recovery_days
                FROM injuries i
                JOIN players p ON i.player_id = p.id
                WHERE p.team_id = ?
                ${from_date ? 'AND i.injury_date >= ?' : ''}
                ${to_date ? 'AND i.injury_date <= ?' : ''}
            `, [
                coach.team_id,
                ...(from_date ? [from_date] : []),
                ...(to_date ? [to_date] : [])
            ].filter(Boolean));

            res.status(200).json({
                success: true,
                message: 'Team statistics retrieved successfully',
                statistics: {
                    team_performance: teamStats,
                    player_statistics: playerStats,
                    attendance: attendanceStats,
                    injuries: injuryStats,
                    generated_at: new Date().toISOString(),
                    filters: { season, from_date, to_date }
                }
            });

        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to retrieve team statistics'
            });
        }
    }

    // Get player development plans for team
    static async getPlayerDevelopmentPlans(req, res) {
        try {
            const coach = await Coach.findByUserId(req.user.id);
            if (!coach || !coach.team_id) {
                return res.status(404).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }

            const { status, player_id } = req.query;

            let query = `
                SELECT 
                    dp.*,
                    p.id as player_id,
                    u.first_name,
                    u.last_name,
                    p.position
                FROM development_plans dp
                JOIN players p ON dp.player_id = p.id
                JOIN users u ON p.user_id = u.id
                WHERE p.team_id = ?
            `;
            const params = [coach.team_id];

            if (status) {
                query += ' AND dp.status = ?';
                params.push(status);
            }

            if (player_id) {
                query += ' AND p.id = ?';
                params.push(player_id);
            }

            query += ' ORDER BY dp.created_at DESC';

            const developmentPlans = await database.all(query, params);

            res.status(200).json({
                success: true,
                message: 'Development plans retrieved successfully',
                development_plans: developmentPlans,
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

    // Create development plan for player
    static async createDevelopmentPlan(req, res) {
        try {
            const {
                player_id,
                plan_title,
                objectives,
                skills_to_improve,
                strengths,
                weaknesses,
                action_items,
                target_date
            } = req.body;

            const coach = await Coach.findByUserId(req.user.id);
            if (!coach || !coach.team_id) {
                return res.status(404).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }

            // Verify player belongs to coach's team
            const player = await database.get(`
                SELECT * FROM players WHERE id = ? AND team_id = ?
            `, [player_id, coach.team_id]);

            if (!player) {
                return res.status(404).json({
                    success: false,
                    error: 'Player not found',
                    message: 'Player not found in your team'
                });
            }

            const planId = require('crypto').randomBytes(16).toString('hex');

            await database.run(`
                INSERT INTO development_plans (
                    id, player_id, coach_id, plan_title, objectives,
                    skills_to_improve, strengths, weaknesses, action_items,
                    target_date, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
            `, [
                planId,
                player_id,
                coach.id,
                plan_title,
                objectives,
                skills_to_improve,
                strengths,
                weaknesses,
                action_items,
                target_date
            ]);

            res.status(201).json({
                success: true,
                message: 'Development plan created successfully',
                plan_id: planId,
                created_by: {
                    id: req.user.id,
                    name: req.user.getFullName()
                }
            });

        } catch (error) {
            console.error('Create development plan error:', error);
            res.status(500).json({
                success: false,
                error: 'Server error',
                message: 'Failed to create development plan'
            });
        }
    }
}

module.exports = CoachController;