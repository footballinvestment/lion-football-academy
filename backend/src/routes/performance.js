const express = require('express');
const router = express.Router();
const PlayerPerformance = require('../models/PlayerPerformance');
const MatchEvent = require('../models/MatchEvent');
const Player = require('../models/Player');
const Match = require('../models/Match');
const { authenticate, isAdmin, isAdminOrCoach, canAccessPlayer } = require('../middleware/auth');

// Apply authentication to all performance routes
router.use(authenticate);

/**
 * Pagination utility
 * @param {Object} req - Request object
 * @returns {Object} Pagination parameters
 */
const getPagination = (req) => {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

/**
 * Response formatting utility
 * @param {Array} data - Data array
 * @param {Object} pagination - Pagination info
 * @param {number} total - Total count
 * @returns {Object} Formatted response
 */
const formatResponse = (data, pagination, total = null) => {
    const response = {
        success: true,
        data,
        pagination: {
            page: pagination.page,
            limit: pagination.limit,
            total: total || data.length,
            total_pages: total ? Math.ceil(total / pagination.limit) : 1
        }
    };
    return response;
};

// =====================================================================
// PLAYER PERFORMANCE ENDPOINTS
// =====================================================================

/**
 * GET /api/performance/player/:playerId - Get player statistics
 * Query params: season, limit, match_type, date_from, date_to
 */
router.get('/player/:playerId', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { season, match_type, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        // Validate player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Get player statistics
        const stats = await PlayerPerformance.getPlayerStats(playerId, season);
        
        // Get recent performances
        const filters = { season, match_type, date_from, date_to, limit: pagination.limit };
        const recentPerformances = await PlayerPerformance.findByPlayer(playerId, filters);
        
        // Get player form
        const playerForm = await PlayerPerformance.getPlayerForm(playerId, 5);
        
        res.json({
            success: true,
            player: {
                id: player.id,
                name: player.name,
                position: player.position,
                team_name: player.team_name
            },
            statistics: stats,
            recent_performances: recentPerformances,
            form_analysis: playerForm,
            season: season || 'all'
        });
    } catch (error) {
        console.error('Player performance fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player performance' });
    }
});

/**
 * GET /api/performance/player/:playerId/matches - Get player match performances
 * Query params: season, limit, page, match_type, date_from, date_to
 */
router.get('/player/:playerId/matches', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { season, match_type, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        const filters = { season, match_type, date_from, date_to, limit: pagination.limit };
        const performances = await PlayerPerformance.findByPlayer(playerId, filters);
        
        res.json(formatResponse(performances, pagination));
    } catch (error) {
        console.error('Player match performances fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player match performances' });
    }
});

/**
 * GET /api/performance/player/:playerId/form - Get player form analysis
 * Query params: last_matches (default: 5)
 */
router.get('/player/:playerId/form', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const lastMatches = parseInt(req.query.last_matches) || 5;
        
        if (lastMatches < 1 || lastMatches > 20) {
            return res.status(400).json({ 
                error: 'last_matches must be between 1 and 20' 
            });
        }
        
        const playerForm = await PlayerPerformance.getPlayerForm(playerId, lastMatches);
        res.json(playerForm);
    } catch (error) {
        console.error('Player form fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player form' });
    }
});

/**
 * GET /api/performance/team/:teamId/season/:season - Get team season statistics
 */
router.get('/team/:teamId/season/:season', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const season = req.params.season;
        
        // Access control: admin or team member
        if (req.user.role !== 'admin' && req.user.team_id !== teamId) {
            return res.status(403).json({ error: 'Access denied to this team\'s performance data' });
        }
        
        // Get team player statistics
        const teamStats = await Match.getPlayerSeasonPerformance(season, teamId);
        
        // Get team season summary
        const seasonSummary = await Match.getSeasonStatistics(null, season);
        const teamSeasonSummary = seasonSummary.filter(s => s.team_id === teamId);
        
        res.json({
            success: true,
            team_id: teamId,
            season,
            player_statistics: teamStats,
            season_summary: teamSeasonSummary
        });
    } catch (error) {
        console.error('Team season statistics fetch error:', error);
        res.status(500).json({ error: 'Server error fetching team season statistics' });
    }
});

/**
 * GET /api/performance/top-scorers - Get top scorers leaderboard
 * Query params: season, team_id, limit, position
 */
router.get('/top-scorers', async (req, res) => {
    try {
        const { season, team_id, position, limit = 20 } = req.query;
        const teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const filters = { season, team_id: teamId, limit: parseInt(limit) };
        const topScorers = await PlayerPerformance.getTopPerformers('goals', filters);
        
        res.json({
            success: true,
            criteria: 'goals',
            filters: filters,
            top_scorers: topScorers
        });
    } catch (error) {
        console.error('Top scorers fetch error:', error);
        res.status(500).json({ error: 'Server error fetching top scorers' });
    }
});

/**
 * GET /api/performance/top-assists - Get top assists leaderboard
 * Query params: season, team_id, limit
 */
router.get('/top-assists', async (req, res) => {
    try {
        const { season, team_id, limit = 20 } = req.query;
        const teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const filters = { season, team_id: teamId, limit: parseInt(limit) };
        const topAssists = await PlayerPerformance.getTopPerformers('assists', filters);
        
        res.json({
            success: true,
            criteria: 'assists',
            filters: filters,
            top_assists: topAssists
        });
    } catch (error) {
        console.error('Top assists fetch error:', error);
        res.status(500).json({ error: 'Server error fetching top assists' });
    }
});

/**
 * GET /api/performance/top-rated - Get top rated players leaderboard
 * Query params: season, team_id, limit
 */
router.get('/top-rated', async (req, res) => {
    try {
        const { season, team_id, limit = 20 } = req.query;
        const teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const filters = { season, team_id: teamId, limit: parseInt(limit) };
        const topRated = await PlayerPerformance.getTopPerformers('performance_rating', filters);
        
        res.json({
            success: true,
            criteria: 'performance_rating',
            filters: filters,
            top_rated: topRated
        });
    } catch (error) {
        console.error('Top rated players fetch error:', error);
        res.status(500).json({ error: 'Server error fetching top rated players' });
    }
});

/**
 * GET /api/performance/compare - Compare player performances
 * Query params: player_ids (comma-separated), season
 */
router.get('/compare', async (req, res) => {
    try {
        const { player_ids, season } = req.query;
        
        if (!player_ids) {
            return res.status(400).json({ 
                error: 'Missing required parameter: player_ids (comma-separated)' 
            });
        }
        
        const playerIds = player_ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
        
        if (playerIds.length < 2 || playerIds.length > 10) {
            return res.status(400).json({ 
                error: 'Must compare between 2 and 10 players' 
            });
        }
        
        // Access control: check if user can access all players
        if (req.user.role !== 'admin') {
            for (const playerId of playerIds) {
                const player = await Player.findById(playerId);
                if (!player || (req.user.role === 'coach' && player.team_id !== req.user.team_id)) {
                    return res.status(403).json({ 
                        error: `Access denied to player data for player ID: ${playerId}` 
                    });
                }
            }
        }
        
        const comparison = await PlayerPerformance.comparePlayerPerformance(playerIds, season);
        
        res.json({
            success: true,
            comparison_type: 'player_performance',
            season: season || 'all',
            player_comparison: comparison
        });
    } catch (error) {
        console.error('Player comparison fetch error:', error);
        res.status(500).json({ error: 'Server error comparing player performances' });
    }
});

// =====================================================================
// MATCH PERFORMANCE RECORDING ENDPOINTS
// =====================================================================

/**
 * POST /api/performance/match/:matchId - Record match performance for multiple players
 * Body: { performances: [{ player_id, team_id, position, minutes_played, goals, assists, ... }] }
 */
router.post('/match/:matchId', isAdminOrCoach, async (req, res) => {
    try {
        const matchId = parseInt(req.params.matchId);
        const { performances } = req.body;
        
        if (!Array.isArray(performances) || performances.length === 0) {
            return res.status(400).json({ 
                error: 'Missing or invalid performances array' 
            });
        }
        
        // Validate match exists
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        // Access control: admin or coach of one of the teams
        if (req.user.role !== 'admin' && 
            req.user.team_id !== match.home_team_id && 
            req.user.team_id !== match.away_team_id) {
            return res.status(403).json({ error: 'Access denied to record performance for this match' });
        }
        
        // Validate and prepare performance data
        const validatedPerformances = [];
        const errors = [];
        
        for (let i = 0; i < performances.length; i++) {
            const perf = performances[i];
            
            // Validate required fields
            if (!perf.player_id || !perf.team_id) {
                errors.push(`Performance ${i + 1}: Missing required fields (player_id, team_id)`);
                continue;
            }
            
            // Validate team is involved in match
            if (perf.team_id !== match.home_team_id && perf.team_id !== match.away_team_id) {
                errors.push(`Performance ${i + 1}: Team ${perf.team_id} is not involved in this match`);
                continue;
            }
            
            // Validate performance rating
            if (perf.performance_rating && (perf.performance_rating < 1.0 || perf.performance_rating > 10.0)) {
                errors.push(`Performance ${i + 1}: Performance rating must be between 1.0 and 10.0`);
                continue;
            }
            
            // Validate minutes played
            if (perf.minutes_played && (perf.minutes_played < 0 || perf.minutes_played > 120)) {
                errors.push(`Performance ${i + 1}: Minutes played must be between 0 and 120`);
                continue;
            }
            
            validatedPerformances.push({
                match_id: matchId,
                ...perf
            });
        }
        
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }
        
        // Record performances
        const results = await PlayerPerformance.createBulk(validatedPerformances);
        
        res.status(201).json({
            success: true,
            message: `${results.length} player performances recorded successfully`,
            recorded_count: results.length,
            match_id: matchId
        });
    } catch (error) {
        console.error('Match performance recording error:', error);
        res.status(500).json({ error: 'Failed to record match performances' });
    }
});

/**
 * PUT /api/performance/:id - Update specific performance record
 */
router.put('/:id', isAdminOrCoach, async (req, res) => {
    try {
        const performanceId = parseInt(req.params.id);
        
        // Validate performance record exists
        const existingPerformance = await PlayerPerformance.findById(performanceId);
        if (!existingPerformance) {
            return res.status(404).json({ error: 'Performance record not found' });
        }
        
        // Access control: admin or coach of the team
        if (req.user.role !== 'admin' && req.user.team_id !== existingPerformance.team_id) {
            return res.status(403).json({ error: 'Access denied to update this performance record' });
        }
        
        // Validate performance rating if provided
        if (req.body.performance_rating && 
            (req.body.performance_rating < 1.0 || req.body.performance_rating > 10.0)) {
            return res.status(400).json({ 
                error: 'Performance rating must be between 1.0 and 10.0' 
            });
        }
        
        // Validate minutes played if provided
        if (req.body.minutes_played && 
            (req.body.minutes_played < 0 || req.body.minutes_played > 120)) {
            return res.status(400).json({ 
                error: 'Minutes played must be between 0 and 120' 
            });
        }
        
        await PlayerPerformance.update(performanceId, req.body);
        const updatedPerformance = await PlayerPerformance.findById(performanceId);
        
        res.json({
            success: true,
            message: 'Performance record updated successfully',
            performance: updatedPerformance
        });
    } catch (error) {
        console.error('Performance update error:', error);
        res.status(500).json({ error: 'Failed to update performance record' });
    }
});

/**
 * GET /api/performance/match/:matchId - Get all performance records for a match
 */
router.get('/match/:matchId', async (req, res) => {
    try {
        const matchId = parseInt(req.params.matchId);
        const { player_id } = req.query;
        
        // Validate match exists
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        // Access control: admin or team member
        if (req.user.role !== 'admin' && 
            req.user.team_id !== match.home_team_id && 
            req.user.team_id !== match.away_team_id) {
            return res.status(403).json({ error: 'Access denied to this match performance data' });
        }
        
        const playerId = player_id ? parseInt(player_id) : null;
        const performances = await PlayerPerformance.findByMatch(matchId, playerId);
        
        res.json({
            success: true,
            match_id: matchId,
            match_date: match.match_date,
            home_team: match.home_team_name,
            away_team: match.away_team_name,
            performances: performances
        });
    } catch (error) {
        console.error('Match performance fetch error:', error);
        res.status(500).json({ error: 'Server error fetching match performance data' });
    }
});

/**
 * GET /api/performance/match/:matchId/summary - Get match performance summary
 */
router.get('/match/:matchId/summary', async (req, res) => {
    try {
        const matchId = parseInt(req.params.matchId);
        
        // Validate match exists
        const match = await Match.findById(matchId);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        // Access control
        if (req.user.role !== 'admin' && 
            req.user.team_id !== match.home_team_id && 
            req.user.team_id !== match.away_team_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Get team performance summaries
        const homeTeamPerf = await PlayerPerformance.getTeamMatchPerformance(matchId, match.home_team_id);
        const awayTeamPerf = await PlayerPerformance.getTeamMatchPerformance(matchId, match.away_team_id);
        
        res.json({
            success: true,
            match_id: matchId,
            match_info: {
                date: match.match_date,
                home_team: match.home_team_name,
                away_team: match.away_team_name,
                score: `${match.home_score} - ${match.away_score}`
            },
            performance_summary: {
                home_team: homeTeamPerf,
                away_team: awayTeamPerf
            }
        });
    } catch (error) {
        console.error('Match performance summary fetch error:', error);
        res.status(500).json({ error: 'Server error fetching match performance summary' });
    }
});

/**
 * DELETE /api/performance/:id - Delete performance record (admin only)
 */
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const performanceId = parseInt(req.params.id);
        
        const existingPerformance = await PlayerPerformance.findById(performanceId);
        if (!existingPerformance) {
            return res.status(404).json({ error: 'Performance record not found' });
        }
        
        await PlayerPerformance.delete(performanceId);
        
        res.json({
            success: true,
            message: 'Performance record deleted successfully'
        });
    } catch (error) {
        console.error('Performance deletion error:', error);
        res.status(500).json({ error: 'Failed to delete performance record' });
    }
});

module.exports = router;