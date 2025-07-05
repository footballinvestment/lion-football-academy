const express = require('express');
const router = express.Router();
const PlayerController = require('../controllers/playerController');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to player routes
router.use(rateLimit({
    maxRequests: 150,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many player requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// ===================================
// PLAYER ONLY ROUTES - Self Management
// ===================================

// All routes require player role
router.use(authorize('player'));

// Get player's own profile and statistics
router.get('/me', PlayerController.getMyProfile);

// Get player's match history
router.get('/me/matches', PlayerController.getMyMatches);

// Get player's training history
router.get('/me/trainings', PlayerController.getMyTrainings);

// Update player's own profile
router.put('/me/profile', PlayerController.updateMyProfile);

// Get player's development plans
router.get('/me/development-plans', PlayerController.getMyDevelopmentPlans);

// Get player's injury history
router.get('/me/injuries', PlayerController.getMyInjuries);

module.exports = router;