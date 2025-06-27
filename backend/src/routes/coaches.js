const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Team = require('../models/Team');
const { authenticate, isAdminOrCoach } = require('../middleware/auth');

// Apply authentication to all coach routes
router.use(authenticate);

// GET /api/coaches - Get all coaches
router.get('/', isAdminOrCoach, async (req, res) => {
    try {
        const coaches = await User.findByRole('coach');
        
        res.json({
            success: true,
            coaches,
            count: coaches.length
        });
    } catch (error) {
        console.error('Coaches fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching coaches'
        });
    }
});

// GET /api/coaches/:id/teams - Edző csapatai
router.get('/:id/teams', async (req, res) => {
    try {
        const coachId = req.params.id;
        
        // Check if user is requesting their own teams or is admin
        if (req.user.role !== 'admin' && req.user.id !== parseInt(coachId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own teams'
            });
        }

        // Check if coach exists
        const coach = await User.findById(coachId);
        if (!coach) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Coach not found'
            });
        }

        if (coach.role !== 'coach') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User is not a coach'
            });
        }

        // Get coach's teams
        let teams = [];
        if (coach.team_id) {
            // Currently coaches can only have one team, but this allows for future expansion
            const team = await Team.findById(coach.team_id);
            if (team) {
                teams = [team];
            }
        }

        res.json({
            success: true,
            coach: {
                id: coach.id,
                username: coach.username,
                full_name: coach.full_name,
                email: coach.email
            },
            teams,
            teamCount: teams.length
        });
    } catch (error) {
        console.error('Coach teams fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching coach teams'
        });
    }
});

// GET /api/coaches/:id/players - Edző játékosai (összes csapat játékosai)
router.get('/:id/players', async (req, res) => {
    try {
        const coachId = req.params.id;
        
        // Check if user is requesting their own players or is admin
        if (req.user.role !== 'admin' && req.user.id !== parseInt(coachId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own players'
            });
        }

        // Check if coach exists
        const coach = await User.findById(coachId);
        if (!coach) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Coach not found'
            });
        }

        if (coach.role !== 'coach') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User is not a coach'
            });
        }

        // Get players from coach's team
        let players = [];
        if (coach.team_id) {
            const Player = require('../models/Player');
            players = await Player.findByTeam(coach.team_id);
        }

        res.json({
            success: true,
            coach: {
                id: coach.id,
                username: coach.username,
                full_name: coach.full_name,
                team_name: coach.team_name
            },
            players,
            playerCount: players.length
        });
    } catch (error) {
        console.error('Coach players fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching coach players'
        });
    }
});

// GET /api/coaches/:id/statistics - Edző statisztikái
router.get('/:id/statistics', async (req, res) => {
    try {
        const coachId = req.params.id;
        
        // Check if user is requesting their own stats or is admin
        if (req.user.role !== 'admin' && req.user.id !== parseInt(coachId)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You can only access your own statistics'
            });
        }

        // Check if coach exists
        const coach = await User.findById(coachId);
        if (!coach) {
            return res.status(404).json({
                error: 'Not found',
                message: 'Coach not found'
            });
        }

        if (coach.role !== 'coach') {
            return res.status(400).json({
                error: 'Bad Request',
                message: 'User is not a coach'
            });
        }

        // Get coach statistics
        const statistics = {
            teamCount: coach.team_id ? 1 : 0,
            teamName: coach.team_name || null,
            playerCount: 0,
            upcomingTrainings: 0,
            totalTrainings: 0
        };

        if (coach.team_id) {
            // Get player count
            const Player = require('../models/Player');
            const players = await Player.findByTeam(coach.team_id);
            statistics.playerCount = players.length;

            // Get training counts
            const Training = require('../models/Training');
            const allTrainings = await Training.findByTeam(coach.team_id);
            const upcomingTrainings = await Training.findByTeamUpcoming(coach.team_id);
            
            statistics.totalTrainings = allTrainings ? allTrainings.length : 0;
            statistics.upcomingTrainings = upcomingTrainings ? upcomingTrainings.length : 0;
        }

        res.json({
            success: true,
            coach: {
                id: coach.id,
                username: coach.username,
                full_name: coach.full_name
            },
            statistics
        });
    } catch (error) {
        console.error('Coach statistics fetch error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Error fetching coach statistics'
        });
    }
});

module.exports = router;