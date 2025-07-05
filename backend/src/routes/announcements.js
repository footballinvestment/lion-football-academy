const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to announcements routes
router.use(rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many announcement requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// GET /api/announcements - List announcements with role-based filtering
router.get('/', async (req, res) => {
    try {
        const { announcement_type, priority, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                a.*,
                t.name as team_name,
                u.first_name as author_first_name,
                u.last_name as author_last_name
            FROM announcements a
            JOIN teams t ON a.team_id = t.id
            JOIN users u ON a.created_by = u.id
            WHERE a.is_published = 1 
            AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'coach') {
            // Get coach's team
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND a.team_id = ?';
                params.push(coach.team_id);
            } else {
                return res.json({ success: true, announcements: [], count: 0 });
            }
        } else if (req.user.role === 'player') {
            // Get player's team
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            
            if (player && player.team_id) {
                query += ' AND a.team_id = ?';
                params.push(player.team_id);
            } else {
                return res.json({ success: true, announcements: [], count: 0 });
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
                query += ` AND a.team_id IN (${placeholders})`;
                params.push(...teamIds);
            } else {
                return res.json({ success: true, announcements: [], count: 0 });
            }
        }
        // Admin sees all announcements (no additional filtering)

        // Apply additional filters
        if (announcement_type) {
            query += ' AND a.announcement_type = ?';
            params.push(announcement_type);
        }

        if (priority) {
            query += ' AND a.priority = ?';
            params.push(priority);
        }

        query += ' ORDER BY a.priority DESC, a.published_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const announcements = await database.all(query, params);

        res.status(200).json({
            success: true,
            message: 'Announcements retrieved successfully',
            announcements: announcements.map(announcement => ({
                ...announcement,
                author_name: `${announcement.author_first_name} ${announcement.author_last_name}`
            })),
            count: announcements.length
        });

    } catch (error) {
        console.error('Announcements fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve announcements'
        });
    }
});

// POST /api/announcements - Create new announcement (coach/admin only)
router.post('/', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const {
            title,
            content,
            announcement_type,
            priority,
            expires_at
        } = req.body;

        // Validate required fields
        if (!title || !content || !announcement_type) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'title, content, and announcement_type are required'
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

        const announcementId = require('crypto').randomBytes(16).toString('hex');

        await database.run(`
            INSERT INTO announcements (
                id, team_id, title, content, announcement_type,
                priority, is_published, published_date, expires_at,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), ?, ?)
        `, [
            announcementId,
            team_id,
            title,
            content,
            announcement_type,
            priority || 'normal',
            expires_at,
            req.user.id
        ]);

        // Get the created announcement
        const newAnnouncement = await database.get(`
            SELECT 
                a.*,
                t.name as team_name,
                u.first_name as author_first_name,
                u.last_name as author_last_name
            FROM announcements a
            JOIN teams t ON a.team_id = t.id
            JOIN users u ON a.created_by = u.id
            WHERE a.id = ?
        `, [announcementId]);

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            announcement: {
                ...newAnnouncement,
                author_name: `${newAnnouncement.author_first_name} ${newAnnouncement.author_last_name}`
            }
        });

    } catch (error) {
        console.error('Announcement creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to create announcement'
        });
    }
});


// GET /api/announcements/:id - Get single announcement
router.get('/:id', async (req, res) => {
    try {
        const announcement = await database.get(`
            SELECT 
                a.*,
                t.name as team_name,
                u.first_name as author_first_name,
                u.last_name as author_last_name
            FROM announcements a
            JOIN teams t ON a.team_id = t.id
            JOIN users u ON a.created_by = u.id
            WHERE a.id = ? AND a.is_published = 1
        `, [req.params.id]);
        
        if (!announcement) {
            return res.status(404).json({
                success: false,
                error: 'Announcement not found',
                message: 'Announcement with specified ID does not exist or is not published'
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
            hasAccess = coach && coach.team_id === announcement.team_id;
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = player && player.team_id === announcement.team_id;
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            hasAccess = childrenTeams.some(ct => ct.team_id === announcement.team_id);
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to view this announcement'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Announcement retrieved successfully',
            announcement: {
                ...announcement,
                author_name: `${announcement.author_first_name} ${announcement.author_last_name}`
            }
        });
    } catch (error) {
        console.error('Announcement fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve announcement'
        });
    }
});





module.exports = router;