const express = require('express');
const router = express.Router();
const Match = require('../models/Match');
const db = require('../database/connection');
const { authenticate, isAdmin, isAdminOrCoach, canAccessPlayer } = require('../middleware/auth');

// Apply authentication to all match routes
router.use(authenticate);

// GET /api/matches - List matches with role-based filtering
router.get('/', async (req, res) => {
    try {
        const filters = req.query;
        
        if (req.user.role === 'admin') {
            // Admin sees all matches
            const matches = await Match.findAll(filters);
            res.json(matches);
        } else if (req.user.role === 'coach' && req.user.team_id) {
            // Coach sees only their team's matches
            filters.team_id = req.user.team_id;
            const matches = await Match.findAll(filters);
            res.json(matches);
        } else if (req.user.role === 'parent' && req.user.team_id) {
            // Parent sees their team's matches
            filters.team_id = req.user.team_id;
            const matches = await Match.findAll(filters);
            res.json(matches);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Matches fetch error:', error);
        res.status(500).json({ error: 'Server error fetching matches' });
    }
});

// GET /api/matches/statistics/top-scorers - Top scorers list
router.get('/statistics/top-scorers', async (req, res) => {
    try {
        const { season, team_id } = req.query;
        const teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const topScorers = await Match.getTopScorers(season, teamId);
        res.json(topScorers);
    } catch (error) {
        console.error('Top scorers fetch error:', error);
        res.status(500).json({ error: 'Server error fetching top scorers' });
    }
});

// GET /api/matches/statistics/team-performance - Team performance
router.get('/statistics/team-performance', isAdminOrCoach, async (req, res) => {
    try {
        const teamPerformance = await Match.getTeamPerformance(req.query.season);
        res.json(teamPerformance);
    } catch (error) {
        console.error('Team performance fetch error:', error);
        res.status(500).json({ error: 'Server error fetching team performance' });
    }
});

// GET /api/matches/statistics/match-results - Match results
router.get('/statistics/match-results', async (req, res) => {
    try {
        const filters = req.query;
        
        // Filter by team if not admin
        if (req.user.role !== 'admin' && req.user.team_id) {
            // Get team name for filtering
            const teamQuery = await db.query('SELECT name FROM teams WHERE id = ?', [req.user.team_id]);
            if (teamQuery.length > 0) {
                filters.team_name = teamQuery[0].name;
            }
        }
        
        const matchResults = await Match.getMatchResults(filters);
        res.json(matchResults);
    } catch (error) {
        console.error('Match results fetch error:', error);
        res.status(500).json({ error: 'Server error fetching match results' });
    }
});

// GET /api/matches/statistics/season-performance - Player season performance
router.get('/statistics/season-performance', async (req, res) => {
    try {
        const { season } = req.query;
        const teamId = req.user.role === 'coach' ? req.user.team_id : req.query.team_id;
        
        const seasonPerformance = await Match.getPlayerSeasonPerformance(season, teamId);
        res.json(seasonPerformance);
    } catch (error) {
        console.error('Season performance fetch error:', error);
        res.status(500).json({ error: 'Server error fetching season performance' });
    }
});

// GET /api/matches/:id - Single match details
router.get('/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }
        
        // Access control: admin or team member
        if (req.user.role === 'admin' || 
            req.user.team_id === match.home_team_id || 
            req.user.team_id === match.away_team_id) {
            res.json(match);
        } else {
            res.status(403).json({ error: 'Access denied to this match' });
        }
    } catch (error) {
        console.error('Match fetch error:', error);
        res.status(500).json({ error: 'Server error fetching match' });
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

// GET /api/matches/:id/events - Match events
router.get('/:id/events', async (req, res) => {
    try {
        const events = await Match.getMatchEvents(req.params.id);
        res.json(events);
    } catch (error) {
        console.error('Events fetch error:', error);
        res.status(500).json({ error: 'Server error fetching match events' });
    }
});

// GET /api/matches/:id/statistics - Team statistics for match
router.get('/:id/statistics', async (req, res) => {
    try {
        const statistics = await Match.getMatchStatistics(req.params.id);
        res.json(statistics);
    } catch (error) {
        console.error('Statistics fetch error:', error);
        res.status(500).json({ error: 'Server error fetching match statistics' });
    }
});

// GET /api/matches/team/:teamId - Team's matches
router.get('/team/:teamId', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        
        // Access control: admin or team member
        if (req.user.role !== 'admin' && req.user.team_id !== teamId) {
            return res.status(403).json({ error: 'Access denied to this team\'s matches' });
        }
        
        const matches = await Match.findByTeam(teamId, req.query);
        res.json(matches);
    } catch (error) {
        console.error('Team matches fetch error:', error);
        res.status(500).json({ error: 'Server error fetching team matches' });
    }
});

// GET /api/matches/player/:playerId/form - Player form/recent performance
router.get('/player/:playerId/form', canAccessPlayer, async (req, res) => {
    try {
        const lastMatches = parseInt(req.query.last_matches) || 5;
        const playerForm = await Match.getPlayerForm(req.params.playerId, lastMatches);
        res.json(playerForm);
    } catch (error) {
        console.error('Player form fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player form' });
    }
});

// GET /api/matches/team/:teamId/form - Team form/recent results
router.get('/team/:teamId/form', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        
        // Access control
        if (req.user.role !== 'admin' && req.user.team_id !== teamId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const lastMatches = parseInt(req.query.last_matches) || 5;
        const teamForm = await Match.getTeamForm(teamId, lastMatches);
        res.json(teamForm);
    } catch (error) {
        console.error('Team form fetch error:', error);
        res.status(500).json({ error: 'Server error fetching team form' });
    }
});

// POST /api/matches - Create new match
router.post('/', isAdminOrCoach, async (req, res) => {
    try {
        // Validate required fields
        const { home_team_id, away_team_id, match_date, match_type, season } = req.body;
        
        if (!home_team_id || !away_team_id || !match_date || !match_type || !season) {
            return res.status(400).json({ 
                error: 'Missing required fields: home_team_id, away_team_id, match_date, match_type, season' 
            });
        }
        
        // Validate teams are different
        if (home_team_id === away_team_id) {
            return res.status(400).json({ 
                error: 'Home team and away team cannot be the same' 
            });
        }
        
        // Validate match type
        const validMatchTypes = ['friendly', 'league', 'cup', 'tournament'];
        if (!validMatchTypes.includes(match_type)) {
            return res.status(400).json({ 
                error: 'Invalid match_type. Must be: friendly, league, cup, or tournament' 
            });
        }
        
        const matchData = {
            ...req.body,
            created_by: req.user.id
        };
        
        const result = await Match.create(matchData);
        const newMatch = await Match.findById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Match created successfully',
            match: newMatch
        });
    } catch (error) {
        console.error('Match creation error:', error);
        res.status(500).json({ error: 'Failed to create match' });
    }
});

// PUT /api/matches/:id - Update match
router.put('/:id', isAdminOrCoach, async (req, res) => {
    try {
        const existingMatch = await Match.findById(req.params.id);
        if (!existingMatch) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Access control: admin or coach of one of the teams
        if (req.user.role !== 'admin' && 
            req.user.team_id !== existingMatch.home_team_id && 
            req.user.team_id !== existingMatch.away_team_id) {
            return res.status(403).json({ error: 'Access denied to update this match' });
        }

        await Match.update(req.params.id, req.body);
        const updatedMatch = await Match.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Match updated successfully',
            match: updatedMatch
        });
    } catch (error) {
        console.error('Match update error:', error);
        res.status(500).json({ error: 'Failed to update match' });
    }
});

// PUT /api/matches/:id/score - Update match score
router.put('/:id/score', isAdminOrCoach, async (req, res) => {
    try {
        const { home_score, away_score } = req.body;
        
        // Validate scores
        if (typeof home_score !== 'number' || typeof away_score !== 'number' || 
            home_score < 0 || away_score < 0) {
            return res.status(400).json({ 
                error: 'Invalid scores. Both scores must be non-negative numbers' 
            });
        }
        
        const existingMatch = await Match.findById(req.params.id);
        if (!existingMatch) {
            return res.status(404).json({ error: 'Match not found' });
        }

        // Access control
        if (req.user.role !== 'admin' && 
            req.user.team_id !== existingMatch.home_team_id && 
            req.user.team_id !== existingMatch.away_team_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await Match.updateScore(req.params.id, home_score, away_score);
        const updatedMatch = await Match.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Match score updated successfully',
            match: updatedMatch
        });
    } catch (error) {
        console.error('Score update error:', error);
        res.status(500).json({ error: 'Failed to update match score' });
    }
});

// POST /api/matches/:id/performance - Record player performance
router.post('/:id/performance', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id, team_id } = req.body;
        
        if (!player_id || !team_id) {
            return res.status(400).json({ 
                error: 'Missing required fields: player_id, team_id' 
            });
        }
        
        // Validate performance rating if provided
        if (req.body.performance_rating && 
            (req.body.performance_rating < 1.0 || req.body.performance_rating > 10.0)) {
            return res.status(400).json({ 
                error: 'Performance rating must be between 1.0 and 10.0' 
            });
        }
        
        const performanceData = {
            match_id: req.params.id,
            ...req.body
        };
        
        await Match.recordPlayerPerformance(performanceData);
        
        res.json({
            success: true,
            message: 'Player performance recorded successfully'
        });
    } catch (error) {
        console.error('Performance recording error:', error);
        res.status(500).json({ error: 'Failed to record player performance' });
    }
});

// POST /api/matches/:id/events - Add match event
router.post('/:id/events', isAdminOrCoach, async (req, res) => {
    try {
        const { team_id, event_type, event_minute } = req.body;
        
        if (!team_id || !event_type || typeof event_minute !== 'number') {
            return res.status(400).json({ 
                error: 'Missing required fields: team_id, event_type, event_minute' 
            });
        }
        
        // Validate event type
        const validEventTypes = ['goal', 'assist', 'yellow_card', 'red_card', 'substitution_in', 'substitution_out', 'injury', 'penalty', 'own_goal'];
        if (!validEventTypes.includes(event_type)) {
            return res.status(400).json({ 
                error: 'Invalid event_type' 
            });
        }
        
        // Validate event minute
        if (event_minute < 0 || event_minute > 120) {
            return res.status(400).json({ 
                error: 'Event minute must be between 0 and 120' 
            });
        }
        
        const eventData = {
            match_id: req.params.id,
            ...req.body
        };
        
        await Match.addMatchEvent(eventData);
        
        res.json({
            success: true,
            message: 'Match event added successfully'
        });
    } catch (error) {
        console.error('Event creation error:', error);
        res.status(500).json({ error: 'Failed to add match event' });
    }
});

// POST /api/matches/:id/team-statistics - Record team statistics
router.post('/:id/team-statistics', isAdminOrCoach, async (req, res) => {
    try {
        const { team_id } = req.body;
        
        if (!team_id) {
            return res.status(400).json({ 
                error: 'Missing required field: team_id' 
            });
        }
        
        // Validate possession percentage if provided
        if (req.body.possession_percentage !== undefined && 
            (req.body.possession_percentage < 0 || req.body.possession_percentage > 100)) {
            return res.status(400).json({ 
                error: 'Possession percentage must be between 0 and 100' 
            });
        }
        
        const statsData = {
            match_id: req.params.id,
            ...req.body
        };
        
        await Match.recordTeamStatistics(statsData);
        
        res.json({
            success: true,
            message: 'Team statistics recorded successfully'
        });
    } catch (error) {
        console.error('Team statistics error:', error);
        res.status(500).json({ error: 'Failed to record team statistics' });
    }
});

// DELETE /api/matches/:id - Delete match (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const existingMatch = await Match.findById(req.params.id);
        if (!existingMatch) {
            return res.status(404).json({ error: 'Match not found' });
        }

        await Match.delete(req.params.id);
        res.json({
            success: true,
            message: 'Match deleted successfully'
        });
    } catch (error) {
        console.error('Match deletion error:', error);
        res.status(500).json({ error: 'Failed to delete match' });
    }
});

module.exports = router;