const express = require('express');
const router = express.Router();
const Development = require('../models/Development');
const Player = require('../models/Player');
const { authenticate, isAdmin, isAdminOrCoach, canAccessPlayer } = require('../middleware/auth');

// Apply authentication to all development routes
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
// DEVELOPMENT PLANS ENDPOINTS
// =====================================================================

/**
 * GET /api/development/player/:playerId - Get player development plans
 * Query params: status, limit, page, date_from, date_to, plan_type
 */
router.get('/player/:playerId', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { status, plan_type, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        // Validate player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Get development plans
        const filters = { status, plan_type, date_from, date_to, limit: pagination.limit };
        const plans = await Development.findPlansByPlayer(playerId, filters);
        
        // Get recent assessments
        const recentAssessments = await Development.findAssessmentsByPlayer(playerId, { limit: 5 });
        
        // Get progress summary
        const progressSummary = await Development.getPlayerProgressSummary(playerId);
        
        res.json({
            success: true,
            player: {
                id: player.id,
                name: player.name,
                position: player.position,
                team_name: player.team_name
            },
            development_plans: plans,
            recent_assessments: recentAssessments,
            progress_summary: progressSummary
        });
    } catch (error) {
        console.error('Player development plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player development plans' });
    }
});

/**
 * GET /api/development/plans - Get all development plans (filtered by access)
 * Query params: team_id, status, plan_type, player_id, limit, page
 */
router.get('/plans', async (req, res) => {
    try {
        const { team_id, status, plan_type, player_id } = req.query;
        const pagination = getPagination(req);
        
        let filters = { status, plan_type, player_id, limit: pagination.limit };
        
        // Apply access control
        if (req.user.role === 'coach' && req.user.team_id) {
            filters.team_id = req.user.team_id;
        } else if (req.user.role === 'parent' && req.user.player_id) {
            filters.player_id = req.user.player_id;
        } else if (req.user.role === 'admin' && team_id) {
            filters.team_id = team_id;
        }
        
        const plans = await Development.findAllPlans(filters);
        
        res.json(formatResponse(plans, pagination));
    } catch (error) {
        console.error('Development plans fetch error:', error);
        res.status(500).json({ error: 'Server error fetching development plans' });
    }
});

/**
 * GET /api/development/plans/:planId - Get specific development plan
 */
router.get('/plans/:planId', async (req, res) => {
    try {
        const planId = parseInt(req.params.planId);
        
        const plan = await Development.findPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        // Access control: admin, coach of team, or parent of player
        const player = await Player.findById(plan.player_id);
        if (req.user.role !== 'admin' && 
            req.user.team_id !== player.team_id && 
            req.user.player_id !== plan.player_id) {
            return res.status(403).json({ error: 'Access denied to this development plan' });
        }
        
        // Get plan milestones
        const milestones = await Development.getMilestonesByPlan(planId);
        
        // Get progress tracking
        const progress = await Development.getProgressByPlan(planId);
        
        res.json({
            success: true,
            plan: plan,
            milestones: milestones,
            progress: progress
        });
    } catch (error) {
        console.error('Development plan fetch error:', error);
        res.status(500).json({ error: 'Server error fetching development plan' });
    }
});

/**
 * POST /api/development/plans - Create new development plan
 */
router.post('/plans', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id, plan_type, goal, target_date, milestones } = req.body;
        
        // Validate required fields
        if (!player_id || !plan_type || !goal || !target_date) {
            return res.status(400).json({ 
                error: 'Missing required fields: player_id, plan_type, goal, target_date' 
            });
        }
        
        // Validate player exists and access
        const player = await Player.findById(player_id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to create plan for this player' });
        }
        
        // Validate plan type
        const validPlanTypes = ['skill_development', 'fitness', 'technical', 'tactical', 'mental', 'rehabilitation'];
        if (!validPlanTypes.includes(plan_type)) {
            return res.status(400).json({ 
                error: `Invalid plan_type. Must be: ${validPlanTypes.join(', ')}` 
            });
        }
        
        // Validate target date
        const targetDate = new Date(target_date);
        const today = new Date();
        if (targetDate <= today) {
            return res.status(400).json({ 
                error: 'Target date must be in the future' 
            });
        }
        
        const planData = {
            ...req.body,
            created_by: req.user.id,
            status: 'active'
        };
        
        const result = await Development.createPlan(planData);
        
        // Create milestones if provided
        if (milestones && Array.isArray(milestones)) {
            for (const milestone of milestones) {
                await Development.createMilestone({
                    plan_id: result.id,
                    ...milestone
                });
            }
        }
        
        const newPlan = await Development.findPlanById(result.id);
        
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

/**
 * PUT /api/development/plans/:planId - Update development plan
 */
router.put('/plans/:planId', isAdminOrCoach, async (req, res) => {
    try {
        const planId = parseInt(req.params.planId);
        
        const existingPlan = await Development.findPlanById(planId);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        // Access control
        const player = await Player.findById(existingPlan.player_id);
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to update this plan' });
        }
        
        // Validate plan type if provided
        if (req.body.plan_type) {
            const validPlanTypes = ['skill_development', 'fitness', 'technical', 'tactical', 'mental', 'rehabilitation'];
            if (!validPlanTypes.includes(req.body.plan_type)) {
                return res.status(400).json({ 
                    error: `Invalid plan_type. Must be: ${validPlanTypes.join(', ')}` 
                });
            }
        }
        
        // Validate status if provided
        if (req.body.status) {
            const validStatuses = ['active', 'completed', 'paused', 'cancelled'];
            if (!validStatuses.includes(req.body.status)) {
                return res.status(400).json({ 
                    error: `Invalid status. Must be: ${validStatuses.join(', ')}` 
                });
            }
        }
        
        await Development.updatePlan(planId, req.body);
        const updatedPlan = await Development.findPlanById(planId);
        
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

/**
 * PUT /api/development/progress/:planId - Update plan progress
 */
router.put('/progress/:planId', isAdminOrCoach, async (req, res) => {
    try {
        const planId = parseInt(req.params.planId);
        const { progress_percentage, notes, milestone_updates } = req.body;
        
        const existingPlan = await Development.findPlanById(planId);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        // Access control
        const player = await Player.findById(existingPlan.player_id);
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to update this plan progress' });
        }
        
        // Validate progress percentage
        if (progress_percentage !== undefined && 
            (progress_percentage < 0 || progress_percentage > 100)) {
            return res.status(400).json({ 
                error: 'Progress percentage must be between 0 and 100' 
            });
        }
        
        // Record progress update
        const progressData = {
            plan_id: planId,
            progress_percentage: progress_percentage || existingPlan.progress_percentage,
            notes: notes,
            updated_by: req.user.id
        };
        
        await Development.recordProgress(progressData);
        
        // Update milestone statuses if provided
        if (milestone_updates && Array.isArray(milestone_updates)) {
            for (const update of milestone_updates) {
                if (update.milestone_id && update.status) {
                    await Development.updateMilestoneStatus(update.milestone_id, update.status, req.user.id);
                }
            }
        }
        
        // Update plan progress percentage
        if (progress_percentage !== undefined) {
            await Development.updatePlan(planId, { progress_percentage });
            
            // Auto-complete plan if 100% progress
            if (progress_percentage >= 100) {
                await Development.updatePlan(planId, { 
                    status: 'completed',
                    completion_date: new Date().toISOString().split('T')[0]
                });
            }
        }
        
        const updatedPlan = await Development.findPlanById(planId);
        const progressHistory = await Development.getProgressByPlan(planId);
        
        res.json({
            success: true,
            message: 'Plan progress updated successfully',
            plan: updatedPlan,
            progress_history: progressHistory
        });
    } catch (error) {
        console.error('Plan progress update error:', error);
        res.status(500).json({ error: 'Failed to update plan progress' });
    }
});

// =====================================================================
// SKILLS ASSESSMENTS ENDPOINTS
// =====================================================================

/**
 * GET /api/development/assessments/:playerId - Get player skill assessments
 * Query params: skill_category, date_from, date_to, limit, page
 */
router.get('/assessments/:playerId', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { skill_category, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        // Validate player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        const filters = { skill_category, date_from, date_to, limit: pagination.limit };
        const assessments = await Development.findAssessmentsByPlayer(playerId, filters);
        
        // Group by skill category for easier analysis
        const groupedAssessments = assessments.reduce((acc, assessment) => {
            const category = assessment.skill_category;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(assessment);
            return acc;
        }, {});
        
        // Get skill progression summary
        const skillProgression = await Development.getSkillProgression(playerId, skill_category);
        
        res.json({
            success: true,
            player: {
                id: player.id,
                name: player.name,
                position: player.position,
                team_name: player.team_name
            },
            assessments: assessments,
            grouped_assessments: groupedAssessments,
            skill_progression: skillProgression
        });
    } catch (error) {
        console.error('Player assessments fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player assessments' });
    }
});

/**
 * POST /api/development/assessments - Create new skill assessment
 */
router.post('/assessments', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id, skill_category, skill_name, current_level, target_level } = req.body;
        
        // Validate required fields
        if (!player_id || !skill_category || !skill_name || current_level === undefined) {
            return res.status(400).json({ 
                error: 'Missing required fields: player_id, skill_category, skill_name, current_level' 
            });
        }
        
        // Validate player exists and access
        const player = await Player.findById(player_id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to assess this player' });
        }
        
        // Validate skill levels
        if (current_level < 1 || current_level > 10) {
            return res.status(400).json({ 
                error: 'Current level must be between 1 and 10' 
            });
        }
        
        if (target_level !== undefined && (target_level < 1 || target_level > 10)) {
            return res.status(400).json({ 
                error: 'Target level must be between 1 and 10' 
            });
        }
        
        // Validate skill category
        const validCategories = ['technical', 'tactical', 'physical', 'mental', 'goalkeeping'];
        if (!validCategories.includes(skill_category)) {
            return res.status(400).json({ 
                error: `Invalid skill_category. Must be: ${validCategories.join(', ')}` 
            });
        }
        
        const assessmentData = {
            ...req.body,
            assessed_by: req.user.id,
            assessment_date: new Date().toISOString().split('T')[0]
        };
        
        const result = await Development.createSkillAssessment(assessmentData);
        const newAssessment = await Development.findAssessmentById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Skill assessment created successfully',
            assessment: newAssessment
        });
    } catch (error) {
        console.error('Skill assessment creation error:', error);
        res.status(500).json({ error: 'Failed to create skill assessment' });
    }
});

/**
 * PUT /api/development/assessments/:assessmentId - Update skill assessment
 */
router.put('/assessments/:assessmentId', isAdminOrCoach, async (req, res) => {
    try {
        const assessmentId = parseInt(req.params.assessmentId);
        
        const existingAssessment = await Development.findAssessmentById(assessmentId);
        if (!existingAssessment) {
            return res.status(404).json({ error: 'Skill assessment not found' });
        }
        
        // Access control
        const player = await Player.findById(existingAssessment.player_id);
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to update this assessment' });
        }
        
        // Validate skill levels if provided
        if (req.body.current_level !== undefined && 
            (req.body.current_level < 1 || req.body.current_level > 10)) {
            return res.status(400).json({ 
                error: 'Current level must be between 1 and 10' 
            });
        }
        
        if (req.body.target_level !== undefined && 
            (req.body.target_level < 1 || req.body.target_level > 10)) {
            return res.status(400).json({ 
                error: 'Target level must be between 1 and 10' 
            });
        }
        
        await Development.updateSkillAssessment(assessmentId, req.body);
        const updatedAssessment = await Development.findAssessmentById(assessmentId);
        
        res.json({
            success: true,
            message: 'Skill assessment updated successfully',
            assessment: updatedAssessment
        });
    } catch (error) {
        console.error('Skill assessment update error:', error);
        res.status(500).json({ error: 'Failed to update skill assessment' });
    }
});

/**
 * GET /api/development/assessments/team/:teamId - Get team skill assessments overview
 */
router.get('/assessments/team/:teamId', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        const { skill_category, date_from, date_to } = req.query;
        
        // Access control: admin or team member
        if (req.user.role !== 'admin' && req.user.team_id !== teamId) {
            return res.status(403).json({ error: 'Access denied to this team\'s assessment data' });
        }
        
        const filters = { skill_category, date_from, date_to };
        const teamAssessments = await Development.getTeamSkillOverview(teamId, filters);
        
        res.json({
            success: true,
            team_id: teamId,
            assessment_overview: teamAssessments,
            filters: filters
        });
    } catch (error) {
        console.error('Team assessments fetch error:', error);
        res.status(500).json({ error: 'Server error fetching team assessments' });
    }
});

/**
 * GET /api/development/milestones/:planId - Get milestones for a plan
 */
router.get('/milestones/:planId', async (req, res) => {
    try {
        const planId = parseInt(req.params.planId);
        
        const plan = await Development.findPlanById(planId);
        if (!plan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        // Access control
        const player = await Player.findById(plan.player_id);
        if (req.user.role !== 'admin' && 
            req.user.team_id !== player.team_id && 
            req.user.player_id !== plan.player_id) {
            return res.status(403).json({ error: 'Access denied to this plan\'s milestones' });
        }
        
        const milestones = await Development.getMilestonesByPlan(planId);
        
        res.json({
            success: true,
            plan_id: planId,
            plan_title: plan.goal,
            milestones: milestones
        });
    } catch (error) {
        console.error('Milestones fetch error:', error);
        res.status(500).json({ error: 'Server error fetching plan milestones' });
    }
});

/**
 * POST /api/development/milestones - Create new milestone
 */
router.post('/milestones', isAdminOrCoach, async (req, res) => {
    try {
        const { plan_id, title, description, target_date } = req.body;
        
        if (!plan_id || !title || !target_date) {
            return res.status(400).json({ 
                error: 'Missing required fields: plan_id, title, target_date' 
            });
        }
        
        const plan = await Development.findPlanById(plan_id);
        if (!plan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        // Access control
        const player = await Player.findById(plan.player_id);
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to create milestone for this plan' });
        }
        
        const milestoneData = {
            ...req.body,
            status: 'pending'
        };
        
        const result = await Development.createMilestone(milestoneData);
        const newMilestone = await Development.findMilestoneById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Milestone created successfully',
            milestone: newMilestone
        });
    } catch (error) {
        console.error('Milestone creation error:', error);
        res.status(500).json({ error: 'Failed to create milestone' });
    }
});

/**
 * DELETE /api/development/plans/:planId - Delete development plan (admin only)
 */
router.delete('/plans/:planId', isAdmin, async (req, res) => {
    try {
        const planId = parseInt(req.params.planId);
        
        const existingPlan = await Development.findPlanById(planId);
        if (!existingPlan) {
            return res.status(404).json({ error: 'Development plan not found' });
        }
        
        await Development.deletePlan(planId);
        
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