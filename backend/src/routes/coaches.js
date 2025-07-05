const express = require('express');
const router = express.Router();
const CoachController = require('../controllers/coachController');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to coach routes
router.use(rateLimit({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many coach requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// ===================================
// COACH ONLY ROUTES - Team Management
// ===================================

// All routes require coach role
router.use(authorize('coach'));

// Get coach's team information
router.get('/team', CoachController.getTeam);

// Get team players
router.get('/players', CoachController.getPlayers);

// Record player performance
router.post('/players/:id/performance', CoachController.recordPlayerPerformance);

// Get team statistics
router.get('/statistics', CoachController.getStatistics);

// Get player development plans for team
router.get('/development-plans', CoachController.getPlayerDevelopmentPlans);

// Create development plan for player
router.post('/development-plans', CoachController.createDevelopmentPlan);

module.exports = router;