const express = require('express');
const router = express.Router();
const DevelopmentPlan = require('../models/DevelopmentPlan');
const { authenticate, isAdmin, isAdminOrCoach, canAccessPlayer } = require('../middleware/auth');

// Apply authentication to all development plan routes
router.use(authenticate);

// GET /api/development-plans - List development plans with role-based filtering
router.get('/', isAdminOrCoach, async (req, res) => {
    try {
        const filters = req.query;
        
        if (req.user.role === 'admin') {
            // Admin sees all development plans
            const plans = await DevelopmentPlan.findAll(filters);
            res.json(plans);
        } else if (req.user.role === 'coach' && req.user.team_id) {
            // Coach sees only their team's plans
            filters.team_id = req.user.team_id;
            const plans = await DevelopmentPlan.findAll(filters);
            res.json(plans);
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Development plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching development plans' });
    }
});

// GET /api/development-plans/active - Active development plans only
router.get('/active', isAdminOrCoach, async (req, res) => {
    try {
        const teamId = req.user.role === 'coach' ? req.user.team_id : null;
        const activePlans = await DevelopmentPlan.getActivePlans(teamId);
        res.json(activePlans);
    } catch (error) {
        console.error('Active development plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching active plans' });
    }
});

// GET /api/development-plans/stats - Development plan statistics
router.get('/stats', isAdminOrCoach, async (req, res) => {
    try {
        const teamId = req.user.role === 'coach' ? req.user.team_id : null;
        const [generalStats, completionTrends] = await Promise.all([
            DevelopmentPlan.getStats(teamId),
            DevelopmentPlan.getCompletionTrends(teamId)
        ]);
        
        res.json({
            general: generalStats,
            completion_trends: completionTrends
        });
    } catch (error) {
        console.error('Development plans stats error:', error);
        res.status(500).json({ error: 'Failed to fetch development plan statistics' });
    }
});

// GET /api/development-plans/:id - Single development plan details
router.get('/:id', async (req, res) => {
    try {
        const plan = await DevelopmentPlan.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        // Access control: admin or coach of the team
        if (req.user.role === 'admin' || 
            (req.user.role === 'coach' && req.user.team_id === plan.team_id)) {
            res.json(plan);
        } else {
            res.status(403).json({ error: 'Access denied to this development plan' });
        }
    } catch (error) {
        console.error('Development plan fetch error:', error);
        res.status(500).json({ error: 'Server error fetching development plan' });
    }
});

// GET /api/development-plans/player/:playerId - Player's development plans
router.get('/player/:playerId', canAccessPlayer, async (req, res) => {
    try {
        const plans = await DevelopmentPlan.findByPlayer(req.params.playerId);
        res.json(plans);
    } catch (error) {
        console.error('Player development plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player development plans' });
    }
});

// GET /api/development-plans/team/:teamId/overview - Team development overview
router.get('/team/:teamId/overview', async (req, res) => {
    try {
        const teamId = req.params.teamId;
        
        // Access control: admin or coach of the team
        if (req.user.role !== 'admin' && req.user.team_id !== parseInt(teamId)) {
            return res.status(403).json({ error: 'Access denied to this team overview' });
        }
        
        const overview = await DevelopmentPlan.getTeamOverview(teamId);
        res.json(overview);
    } catch (error) {
        console.error('Team development overview error:', error);
        res.status(500).json({ error: 'Server error fetching team overview' });
    }
});

// GET /api/development-plans/season/:season - Plans by season
router.get('/season/:season', isAdminOrCoach, async (req, res) => {
    try {
        const season = req.params.season;
        const teamId = req.user.role === 'coach' ? req.user.team_id : null;
        
        const seasonPlans = await DevelopmentPlan.getSeasonPlans(season, teamId);
        res.json(seasonPlans);
    } catch (error) {
        console.error('Season development plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching season plans' });
    }
});

// POST /api/development-plans - Create new development plan
router.post('/', isAdminOrCoach, async (req, res) => {
    try {
        // Validate required fields
        const { player_id, season, plan_type, current_level, target_level, goals, action_steps } = req.body;
        
        if (!player_id || !season || !plan_type || !current_level || !target_level || !goals || !action_steps) {
            return res.status(400).json({ 
                error: 'Missing required fields: player_id, season, plan_type, current_level, target_level, goals, action_steps' 
            });
        }
        
        // Validate plan type
        if (!['technical', 'physical', 'tactical', 'mental', 'academic'].includes(plan_type)) {
            return res.status(400).json({ 
                error: 'Invalid plan_type. Must be: technical, physical, tactical, mental, or academic' 
            });
        }
        
        // Validate level ranges
        if (current_level < 1 || current_level > 10 || target_level < 1 || target_level > 10) {
            return res.status(400).json({ 
                error: 'Current and target levels must be between 1 and 10' 
            });
        }
        
        const planData = {
            ...req.body,
            created_by: req.user.id
        };
        
        const result = await DevelopmentPlan.create(planData);
        const newPlan = await DevelopmentPlan.findById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Development plan created successfully',
            plan: newPlan
        });
    } catch (error) {
        console.error('Development plan creation error:', error);
        res.status(500).json({ error: 'Failed to create development plan' });
    }
});

// PUT /api/development-plans/:id - Update development plan
router.put('/:id', isAdminOrCoach, async (req, res) => {
    try {
        const existingPlan = await DevelopmentPlan.findById(req.params.id);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }

        // Access control: admin or coach of the team
        if (req.user.role !== 'admin' && req.user.team_id !== existingPlan.team_id) {
            return res.status(403).json({ error: 'Access denied to update this development plan' });
        }

        await DevelopmentPlan.update(req.params.id, req.body);
        const updatedPlan = await DevelopmentPlan.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Development plan updated successfully',
            plan: updatedPlan
        });
    } catch (error) {
        console.error('Development plan update error:', error);
        res.status(500).json({ error: 'Failed to update development plan' });
    }
});

// PUT /api/development-plans/:id/progress - Update plan progress
router.put('/:id/progress', isAdminOrCoach, async (req, res) => {
    try {
        const { completion_percentage, progress_notes } = req.body;
        
        // Validate completion percentage
        if (completion_percentage < 0 || completion_percentage > 100) {
            return res.status(400).json({ 
                error: 'Completion percentage must be between 0 and 100' 
            });
        }
        
        const existingPlan = await DevelopmentPlan.findById(req.params.id);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }

        // Access control
        if (req.user.role !== 'admin' && req.user.team_id !== existingPlan.team_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        await DevelopmentPlan.updateProgress(req.params.id, req.body);
        const updatedPlan = await DevelopmentPlan.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Development plan progress updated successfully',
            plan: updatedPlan
        });
    } catch (error) {
        console.error('Progress update error:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// PUT /api/development-plans/:id/review - Review development plan
router.put('/:id/review', isAdminOrCoach, async (req, res) => {
    try {
        const existingPlan = await DevelopmentPlan.findById(req.params.id);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }

        // Access control
        if (req.user.role !== 'admin' && req.user.team_id !== existingPlan.team_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const reviewData = {
            reviewed_by: req.user.id,
            review_date: new Date().toISOString().split('T')[0],
            coach_notes: req.body.coach_notes
        };
        
        await DevelopmentPlan.review(req.params.id, reviewData);
        const reviewedPlan = await DevelopmentPlan.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Development plan reviewed successfully',
            plan: reviewedPlan
        });
    } catch (error) {
        console.error('Development plan review error:', error);
        res.status(500).json({ error: 'Failed to review development plan' });
    }
});

// DELETE /api/development-plans/:id - Delete development plan (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const existingPlan = await DevelopmentPlan.findById(req.params.id);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }

        await DevelopmentPlan.delete(req.params.id);
        res.json({
            success: true,
            message: 'Development plan deleted successfully'
        });
    } catch (error) {
        console.error('Development plan deletion error:', error);
        res.status(500).json({ error: 'Failed to delete development plan' });
    }
});

module.exports = router;