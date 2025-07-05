const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to match routes
router.use(rateLimit({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many match requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// GET /api/matches - List matches with role-based filtering
router.get('/', async (req, res) => {
    try {
        const { season, status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                m.*,
                ht.name as home_team_name,
                at.name as away_team_name
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE 1=1
        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'coach') {
            // Get coach's team
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND (m.home_team_id = ? OR m.away_team_id = ?)';
                params.push(coach.team_id, coach.team_id);
            } else {
                return res.json([]);
            }
        } else if (req.user.role === 'player') {
            // Get player's team
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            
            if (player && player.team_id) {
                query += ' AND (m.home_team_id = ? OR m.away_team_id = ?)';
                params.push(player.team_id, player.team_id);
            } else {
                return res.json([]);
            }
        } else if (req.user.role === 'parent') {
            // Get parent's children teams
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ? AND p.team_id IS NOT NULL
            `, [req.user.id]);
            
            if (childrenTeams.length > 0) {
                const teamIds = childrenTeams.map(ct => ct.team_id);
                const placeholders = teamIds.map(() => '?').join(',');
                query += ` AND (m.home_team_id IN (${placeholders}) OR m.away_team_id IN (${placeholders}))`;
                params.push(...teamIds, ...teamIds);
            } else {
                return res.json([]);
            }
        }
        // Admin sees all matches (no additional filtering)

        // Apply additional filters
        if (season) {
            query += ' AND m.season = ?';
            params.push(season);
        }

        if (status) {
            query += ' AND m.status = ?';
            params.push(status);
        }

        query += ' ORDER BY m.match_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const matches = await database.all(query, params);

        res.status(200).json({
            success: true,
            message: 'Matches retrieved successfully',
            matches,
            count: matches.length
        });

    } catch (error) {
        console.error('Matches fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve matches'
        });
    }
});

// POST /api/matches - Create new match (coach/admin only)
router.post('/', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const {
            opponent_name,
            match_date,
            start_time,
            location,
            is_home_game,
            match_type,
            season
        } = req.body;

        // Validate required fields
        if (!opponent_name || !match_date || !match_type || !season) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'opponent_name, match_date, match_type, and season are required'
            });
        }

        // Get team_id based on role
        let team_id;
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (!coach || !coach.team_id) {
                return res.status(400).json({
                    success: false,
                    error: 'No team assigned',
                    message: 'Coach is not assigned to any team'
                });
            }
            team_id = coach.team_id;
        } else {
            // Admin can specify team_id
            team_id = req.body.team_id;
            if (!team_id) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: 'team_id is required for admin users'
                });
            }
        }

        const matchId = require('crypto').randomBytes(16).toString('hex');

        await database.run(`
            INSERT INTO matches (
                id, team_id, opponent_name, match_date, start_time,
                location, is_home_game, match_type, season, status,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `, [
            matchId,
            team_id,
            opponent_name,
            match_date,
            start_time,
            location,
            is_home_game || true,
            match_type,
            season,
            req.user.id
        ]);

        // Get the created match
        const newMatch = await database.get(`
            SELECT 
                m.*,
                t.name as team_name
            FROM matches m
            JOIN teams t ON m.team_id = t.id
            WHERE m.id = ?
        `, [matchId]);

        res.status(201).json({
            success: true,
            message: 'Match created successfully',
            match: newMatch
        });

    } catch (error) {
        console.error('Match creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to create match'
        });
    }
});

// PUT /api/matches/:id/score - Update match score
router.put('/:id/score', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const { home_score, away_score } = req.body;
        
        // Validate scores
        if (typeof home_score !== 'number' || typeof away_score !== 'number' || 
            home_score < 0 || away_score < 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'Both scores must be non-negative numbers'
            });
        }
        
        // Get match and verify access
        const match = await database.get(`
            SELECT m.*, t.name as team_name
            FROM matches m
            JOIN teams t ON m.team_id = t.id
            WHERE m.id = ?
        `, [req.params.id]);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found',
                message: 'Match with specified ID does not exist'
            });
        }

        // Access control for coaches
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (!coach || coach.team_id !== match.team_id) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only update scores for your own team matches'
                });
            }
        }

        await database.run(`
            UPDATE matches SET 
                home_score = ?, 
                away_score = ?, 
                status = 'completed',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [home_score, away_score, req.params.id]);
        
        // Get updated match
        const updatedMatch = await database.get(`
            SELECT 
                m.*,
                t.name as team_name
            FROM matches m
            JOIN teams t ON m.team_id = t.id
            WHERE m.id = ?
        `, [req.params.id]);
        
        res.status(200).json({
            success: true,
            message: 'Match score updated successfully',
            match: updatedMatch
        });
        
    } catch (error) {
        console.error('Score update error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to update match score'
        });
    }
});

// GET /api/matches/:id/performance - Get player performances for match
router.get('/:id/performance', async (req, res) => {
    try {
        // Get match and verify access
        const match = await database.get(`
            SELECT * FROM matches WHERE id = ?
        `, [req.params.id]);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found',
                message: 'Match with specified ID does not exist'
            });
        }

        // Role-based access control
        let hasAccess = false;
        if (req.user.role === 'admin') {
            hasAccess = true;
        } else if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = coach && coach.team_id === match.team_id;
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = player && player.team_id === match.team_id;
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            hasAccess = childrenTeams.some(ct => ct.team_id === match.team_id);
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to view this match performance'
            });
        }

        // Get player performances
        const performances = await database.all(`
            SELECT 
                mp.*,
                p.jersey_number,
                p.position,
                u.first_name,
                u.last_name
            FROM match_players mp
            JOIN players p ON mp.player_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE mp.match_id = ?
            ORDER BY p.jersey_number ASC
        `, [req.params.id]);

        res.status(200).json({
            success: true,
            message: 'Match performance retrieved successfully',
            match: {
                id: match.id,
                opponent_name: match.opponent_name,
                match_date: match.match_date,
                status: match.status
            },
            performances
        });

    } catch (error) {
        console.error('Match performance fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve match performance'
        });
    }
});

// POST /api/matches/:id/performance - Record player performance
router.post('/:id/performance', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const {
            player_id,
            minutes_played,
            goals,
            assists,
            yellow_cards,
            red_cards,
            performance_rating,
            performance_notes,
            starter
        } = req.body;
        
        if (!player_id) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'player_id is required'
            });
        }
        
        // Get match and verify access
        const match = await database.get(`
            SELECT * FROM matches WHERE id = ?
        `, [req.params.id]);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found',
                message: 'Match with specified ID does not exist'
            });
        }

        // Verify player belongs to the team
        const player = await database.get(`
            SELECT team_id FROM players WHERE id = ?
        `, [player_id]);
        
        if (!player || player.team_id !== match.team_id) {
            return res.status(400).json({
                success: false,
                error: 'Invalid player',
                message: 'Player does not belong to this team'
            });
        }

        // Access control for coaches
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (!coach || coach.team_id !== match.team_id) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only record performance for your own team'
                });
            }
        }

        // Insert or update performance
        await database.run(`
            INSERT OR REPLACE INTO match_players (
                match_id, player_id, minutes_played, goals, assists,
                yellow_cards, red_cards, performance_rating,
                performance_notes, starter
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            req.params.id,
            player_id,
            minutes_played || 0,
            goals || 0,
            assists || 0,
            yellow_cards || 0,
            red_cards || 0,
            performance_rating,
            performance_notes,
            starter || false
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Player performance recorded successfully'
        });
        
    } catch (error) {
        console.error('Performance recording error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to record player performance'
        });
    }
});

// GET /api/matches/:id - Single match details
router.get('/:id', async (req, res) => {
    try {
        const match = await database.get(`
            SELECT 
                m.*,
                t.name as team_name
            FROM matches m
            JOIN teams t ON m.team_id = t.id
            WHERE m.id = ?
        `, [req.params.id]);
        
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Match not found',
                message: 'Match with specified ID does not exist'
            });
        }
        
        // Role-based access control
        let hasAccess = false;
        if (req.user.role === 'admin') {
            hasAccess = true;
        } else if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = coach && coach.team_id === match.team_id;
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = player && player.team_id === match.team_id;
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            hasAccess = childrenTeams.some(ct => ct.team_id === match.team_id);
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to view this match'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Match retrieved successfully',
            match
        });
    } catch (error) {
        console.error('Match fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve match'
        });
    }
});

// GET /api/matches/:id/performance - Player performance for match
router.get('/:id/performance', async (req, res) => {
    try {
        const performance = await Match.getPlayerPerformance(req.params.id);
        res.json(performance);
    } catch (error) {
        console.error('Performance fetch error:', error);
        res.status(500).json({ error: 'Server error fetching performance data' });
    }
});

module.exports = router;