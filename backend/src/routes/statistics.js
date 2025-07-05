const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to statistics routes
router.use(rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many statistics requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// GET /api/statistics/player-attendance - Player attendance statistics
router.get('/player-attendance', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const { team_id, from_date, to_date } = req.query;
        
        let query = `
            SELECT 
                p.id,
                u.first_name,
                u.last_name,
                p.jersey_number,
                p.position,
                p.team_id,
                t.name as team_name,
                COUNT(tp.training_id) as total_trainings,
                SUM(CASE WHEN tp.attendance_status = 'present' THEN 1 ELSE 0 END) as attended_trainings,
                SUM(CASE WHEN tp.attendance_status = 'absent' THEN 1 ELSE 0 END) as absent_trainings,
                SUM(CASE WHEN tp.attendance_status = 'late' THEN 1 ELSE 0 END) as late_trainings,
                ROUND(
                    (SUM(CASE WHEN tp.attendance_status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(tp.training_id)), 
                    1
                ) as attendance_percentage,
                AVG(tp.performance_rating) as avg_performance_rating
            FROM players p
            JOIN users u ON p.user_id = u.id
            JOIN teams t ON p.team_id = t.id
            LEFT JOIN training_participants tp ON p.id = tp.player_id
            LEFT JOIN trainings tr ON tp.training_id = tr.id
            WHERE p.is_active = 1
        `;
        const params = [];

        // Role-based filtering for coaches
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND p.team_id = ?';
                params.push(coach.team_id);
            } else {
                return res.json({ success: true, statistics: [], count: 0 });
            }
        } else if (team_id) {
            query += ' AND p.team_id = ?';
            params.push(team_id);
        }

        // Date filtering
        if (from_date) {
            query += ' AND tr.training_date >= ?';
            params.push(from_date);
        }

        if (to_date) {
            query += ' AND tr.training_date <= ?';
            params.push(to_date);
        }

        query += `
            GROUP BY p.id, u.first_name, u.last_name, p.jersey_number, p.position, p.team_id, t.name
            HAVING COUNT(tp.training_id) > 0
            ORDER BY attendance_percentage DESC, attended_trainings DESC
        `;
        
        const statistics = await database.all(query, params);
        
        res.status(200).json({
            success: true,
            message: 'Player attendance statistics retrieved successfully',
            statistics,
            count: statistics.length
        });
        
    } catch (error) {
        console.error('Player attendance statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve player attendance statistics'
        });
    }
});

// GET /api/statistics/team-performance - Team performance statistics
router.get('/team-performance', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const { season } = req.query;
        
        let query = `
            SELECT 
                t.id,
                t.name,
                t.age_group,
                t.division,
                COUNT(DISTINCT p.id) as active_players,
                COUNT(DISTINCT m.id) as total_matches,
                COUNT(DISTINCT tr.id) as total_trainings,
                SUM(CASE WHEN m.status = 'completed' AND ((m.is_home_game = 1 AND m.home_score > m.away_score) OR (m.is_home_game = 0 AND m.away_score > m.home_score)) THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN m.status = 'completed' AND m.home_score = m.away_score THEN 1 ELSE 0 END) as draws,
                SUM(CASE WHEN m.status = 'completed' AND ((m.is_home_game = 1 AND m.home_score < m.away_score) OR (m.is_home_game = 0 AND m.away_score < m.home_score)) THEN 1 ELSE 0 END) as losses,
                SUM(CASE WHEN m.is_home_game = 1 THEN m.home_score ELSE m.away_score END) as goals_for,
                SUM(CASE WHEN m.is_home_game = 1 THEN m.away_score ELSE m.home_score END) as goals_against,
                COUNT(tp.training_id) as training_attendances,
                SUM(CASE WHEN tp.attendance_status = 'present' THEN 1 ELSE 0 END) as training_present,
                ROUND(
                    (SUM(CASE WHEN tp.attendance_status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(tp.training_id), 0)), 
                    1
                ) as avg_attendance_percentage,
                AVG(tp.performance_rating) as avg_training_performance
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id AND p.is_active = 1
            LEFT JOIN matches m ON t.id = m.team_id
            LEFT JOIN trainings tr ON t.id = tr.team_id
            LEFT JOIN training_participants tp ON tr.id = tp.training_id AND p.id = tp.player_id
            WHERE t.is_active = 1
        `;
        const params = [];

        // Role-based filtering for coaches
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND t.id = ?';
                params.push(coach.team_id);
            } else {
                return res.json({ success: true, statistics: [], count: 0 });
            }
        }

        // Season filtering
        if (season) {
            query += ' AND (m.season = ? OR tr.season = ?)';
            params.push(season, season);
        }

        query += `
            GROUP BY t.id, t.name, t.age_group, t.division
            ORDER BY wins DESC, avg_attendance_percentage DESC
        `;
        
        const statistics = await database.all(query, params);
        
        res.status(200).json({
            success: true,
            message: 'Team performance statistics retrieved successfully',
            statistics,
            count: statistics.length
        });
        
    } catch (error) {
        console.error('Team performance statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve team performance statistics'
        });
    }
});

// GET /api/statistics/top-scorers - Top scorers leaderboard
router.get('/top-scorers', async (req, res) => {
    try {
        const { season, team_id, limit = 20 } = req.query;
        
        let query = `
            SELECT 
                p.id,
                u.first_name,
                u.last_name,
                p.jersey_number,
                p.position,
                t.name as team_name,
                SUM(mp.goals) as total_goals,
                SUM(mp.assists) as total_assists,
                COUNT(DISTINCT mp.match_id) as matches_played,
                ROUND(SUM(mp.goals) * 1.0 / NULLIF(COUNT(DISTINCT mp.match_id), 0), 2) as goals_per_match,
                AVG(mp.performance_rating) as avg_match_rating
            FROM players p
            JOIN users u ON p.user_id = u.id
            JOIN teams t ON p.team_id = t.id
            JOIN match_players mp ON p.id = mp.player_id
            JOIN matches m ON mp.match_id = m.id
            WHERE p.is_active = 1 AND m.status = 'completed'
        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND p.team_id = ?';
                params.push(coach.team_id);
            }
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            
            if (player && player.team_id) {
                query += ' AND p.team_id = ?';
                params.push(player.team_id);
            }
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            
            if (childrenTeams.length > 0) {
                const teamIds = childrenTeams.map(ct => ct.team_id);
                const placeholders = teamIds.map(() => '?').join(',');
                query += ` AND p.team_id IN (${placeholders})`;
                params.push(...teamIds);
            }
        } else if (team_id) {
            query += ' AND p.team_id = ?';
            params.push(team_id);
        }

        // Season filtering
        if (season) {
            query += ' AND m.season = ?';
            params.push(season);
        }

        query += `
            GROUP BY p.id, u.first_name, u.last_name, p.jersey_number, p.position, t.name
            HAVING SUM(mp.goals) > 0
            ORDER BY total_goals DESC, goals_per_match DESC
            LIMIT ?
        `;
        params.push(parseInt(limit));
        
        const topScorers = await database.all(query, params);
        
        res.status(200).json({
            success: true,
            message: 'Top scorers retrieved successfully',
            top_scorers: topScorers,
            count: topScorers.length
        });
        
    } catch (error) {
        console.error('Top scorers statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve top scorers'
        });
    }
});

// GET /api/statistics/season-summary - Season overview statistics
router.get('/season-summary', async (req, res) => {
    try {
        const { season, team_id } = req.query;
        
        if (!season) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'season parameter is required'
            });
        }

        let teamFilter = '';
        const params = [season, season, season];

        // Role-based filtering
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                teamFilter = ' AND t.id = ?';
                params.push(coach.team_id);
            }
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            
            if (player && player.team_id) {
                teamFilter = ' AND t.id = ?';
                params.push(player.team_id);
            }
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            
            if (childrenTeams.length > 0) {
                const teamIds = childrenTeams.map(ct => ct.team_id);
                const placeholders = teamIds.map(() => '?').join(',');
                teamFilter = ` AND t.id IN (${placeholders})`;
                params.push(...teamIds);
            }
        } else if (team_id) {
            teamFilter = ' AND t.id = ?';
            params.push(team_id);
        }

        // Get season summary statistics
        const summary = await database.get(`
            SELECT 
                COUNT(DISTINCT t.id) as teams_count,
                COUNT(DISTINCT p.id) as players_count,
                COUNT(DISTINCT m.id) as matches_played,
                COUNT(DISTINCT tr.id) as trainings_held,
                SUM(CASE WHEN m.status = 'completed' THEN mp.goals ELSE 0 END) as total_goals,
                SUM(CASE WHEN m.status = 'completed' THEN mp.assists ELSE 0 END) as total_assists,
                COUNT(tp.training_id) as training_sessions,
                SUM(CASE WHEN tp.attendance_status = 'present' THEN 1 ELSE 0 END) as training_attendances,
                ROUND(
                    (SUM(CASE WHEN tp.attendance_status = 'present' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(tp.training_id), 0)), 
                    1
                ) as overall_attendance_rate,
                AVG(mp.performance_rating) as avg_match_performance,
                AVG(tp.performance_rating) as avg_training_performance
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id AND p.is_active = 1
            LEFT JOIN matches m ON t.id = m.team_id AND m.season = ?
            LEFT JOIN match_players mp ON p.id = mp.player_id AND mp.match_id = m.id
            LEFT JOIN trainings tr ON t.id = tr.team_id AND tr.season = ?
            LEFT JOIN training_participants tp ON p.id = tp.player_id AND tp.training_id = tr.id
            WHERE t.is_active = 1 ${teamFilter}
        `, params);

        // Get top performers for the season
        const topScorers = await database.all(`
            SELECT 
                u.first_name,
                u.last_name,
                t.name as team_name,
                SUM(mp.goals) as goals
            FROM players p
            JOIN users u ON p.user_id = u.id
            JOIN teams t ON p.team_id = t.id
            JOIN match_players mp ON p.id = mp.player_id
            JOIN matches m ON mp.match_id = m.id
            WHERE m.season = ? AND m.status = 'completed' ${teamFilter.replace('t.id', 'p.team_id')}
            GROUP BY p.id, u.first_name, u.last_name, t.name
            HAVING SUM(mp.goals) > 0
            ORDER BY goals DESC
            LIMIT 5
        `, [season, ...(teamFilter ? params.slice(3) : [])]);

        res.status(200).json({
            success: true,
            message: 'Season summary retrieved successfully',
            season,
            summary,
            top_scorers: topScorers
        });
        
    } catch (error) {
        console.error('Season summary statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve season summary'
        });
    }
});



module.exports = router;