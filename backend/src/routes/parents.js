const express = require('express');
const router = express.Router();
const ParentController = require('../controllers/parentController');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to parent routes
router.use(rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many parent requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// ===================================
// PARENT ONLY ROUTES - Children Management
// ===================================

// All routes require parent role
router.use(authorize('parent'));

// Get parent's children (players)
router.get('/children', ParentController.getMyChildren);

// Get detailed information for a specific child
router.get('/children/:childId', ParentController.getChildDetails);

// Get upcoming matches for all children
router.get('/upcoming-matches', ParentController.getUpcomingMatches);

// Get upcoming trainings for all children
router.get('/upcoming-trainings', ParentController.getUpcomingTrainings);

// Get announcements for all children's teams
router.get('/announcements', ParentController.getAnnouncements);

// Update emergency contact information for a child
router.put('/children/:childId/emergency-contact', ParentController.updateChildEmergencyContact);

module.exports = router;