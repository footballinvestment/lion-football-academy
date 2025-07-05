const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to all user management routes
router.use(rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many user management requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// ===================================
// ADMIN ONLY ROUTES - User Management
// ===================================

// Get all users with filtering and pagination
router.get('/', authorize('admin'), AdminController.getUsers);

// Create new user
router.post('/', authorize('admin'), AdminController.createUser);

// Get user by ID with detailed information
router.get('/:id', authorize('admin'), AdminController.getUserById);

// Update user
router.put('/:id', authorize('admin'), AdminController.updateUser);

// Delete user (soft delete - deactivate)
router.delete('/:id', authorize('admin'), AdminController.deleteUser);

// Get system statistics
router.get('/admin/statistics', authorize('admin'), AdminController.getStatistics);

// Bulk operations
router.put('/bulk-update', authorize('admin'), AdminController.bulkUpdateUsers);

module.exports = router;