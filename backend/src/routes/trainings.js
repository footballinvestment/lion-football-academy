const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to training routes
router.use(rateLimit({
    maxRequests: 200,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many training requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// GET /api/trainings - List trainings with role-based filtering
router.get('/', async (req, res) => {
    try {
        const { status, from_date, to_date, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                t.*,
                tm.name as team_name
            FROM trainings t
            JOIN teams tm ON t.team_id = tm.id
            WHERE 1=1
        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'coach') {
            // Get coach's team
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND t.team_id = ?';
                params.push(coach.team_id);
            } else {
                return res.json({ success: true, trainings: [], count: 0 });
            }
        } else if (req.user.role === 'player') {
            // Get player's team
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            
            if (player && player.team_id) {
                query += ' AND t.team_id = ?';
                params.push(player.team_id);
            } else {
                return res.json({ success: true, trainings: [], count: 0 });
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
                query += ` AND t.team_id IN (${placeholders})`;
                params.push(...teamIds);
            } else {
                return res.json({ success: true, trainings: [], count: 0 });
            }
        }
        // Admin sees all trainings (no additional filtering)

        // Apply additional filters
        if (status) {
            query += ' AND t.status = ?';
            params.push(status);
        }

        if (from_date) {
            query += ' AND t.training_date >= ?';
            params.push(from_date);
        }

        if (to_date) {
            query += ' AND t.training_date <= ?';
            params.push(to_date);
        }

        query += ' ORDER BY t.training_date DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        const trainings = await database.all(query, params);

        res.status(200).json({
            success: true,
            message: 'Trainings retrieved successfully',
            trainings,
            count: trainings.length
        });

    } catch (error) {
        console.error('Trainings fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve trainings'
        });
    }
});

// POST /api/trainings - Create new training (coach/admin only)
router.post('/', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const {
            training_date,
            start_time,
            end_time,
            training_type,
            focus_areas,
            location,
            notes
        } = req.body;

        // Validate required fields
        if (!training_date || !start_time || !training_type) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'training_date, start_time, and training_type are required'
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

        const trainingId = require('crypto').randomBytes(16).toString('hex');

        await database.run(`
            INSERT INTO trainings (
                id, team_id, training_date, start_time, end_time,
                training_type, focus_areas, location, notes, status,
                created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)
        `, [
            trainingId,
            team_id,
            training_date,
            start_time,
            end_time,
            training_type,
            focus_areas,
            location,
            notes,
            req.user.id
        ]);

        // Get the created training
        const newTraining = await database.get(`
            SELECT 
                t.*,
                tm.name as team_name
            FROM trainings t
            JOIN teams tm ON t.team_id = tm.id
            WHERE t.id = ?
        `, [trainingId]);

        res.status(201).json({
            success: true,
            message: 'Training created successfully',
            training: newTraining
        });

    } catch (error) {
        console.error('Training creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to create training'
        });
    }
});

// PUT /api/trainings/:id/attendance - Mark attendance
router.put('/:id/attendance', authorize(['admin', 'coach']), async (req, res) => {
    try {
        const { attendanceData } = req.body;
        
        if (!Array.isArray(attendanceData)) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'attendanceData must be an array'
            });
        }
        
        // Get training and verify access
        const training = await database.get(`
            SELECT * FROM trainings WHERE id = ?
        `, [req.params.id]);
        
        if (!training) {
            return res.status(404).json({
                success: false,
                error: 'Training not found',
                message: 'Training with specified ID does not exist'
            });
        }

        // Access control for coaches
        if (req.user.role === 'coach') {
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (!coach || coach.team_id !== training.team_id) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only mark attendance for your own team trainings'
                });
            }
        }

        const results = [];
        for (const attendance of attendanceData) {
            const {
                player_id,
                attendance_status,
                performance_rating,
                notes
            } = attendance;
            
            if (!player_id || !attendance_status) {
                continue; // Skip invalid entries
            }

            // Verify player belongs to the team
            const player = await database.get(`
                SELECT team_id FROM players WHERE id = ?
            `, [player_id]);
            
            if (!player || player.team_id !== training.team_id) {
                results.push({ player_id, status: 'error', message: 'Player not in team' });
                continue;
            }

            // Insert or update attendance
            await database.run(`
                INSERT OR REPLACE INTO training_participants (
                    training_id, player_id, attendance_status,
                    performance_rating, notes
                ) VALUES (?, ?, ?, ?, ?)
            `, [
                req.params.id,
                player_id,
                attendance_status,
                performance_rating,
                notes
            ]);
            
            results.push({ player_id, status: 'success' });
        }
        
        res.status(200).json({
            success: true,
            message: 'Attendance marked successfully',
            results
        });
        
    } catch (error) {
        console.error('Attendance marking error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to mark attendance'
        });
    }
});

// GET /api/trainings/:id/participants - Get attendance list
router.get('/:id/participants', async (req, res) => {
    try {
        // Get training and verify access
        const training = await database.get(`
            SELECT * FROM trainings WHERE id = ?
        `, [req.params.id]);
        
        if (!training) {
            return res.status(404).json({
                success: false,
                error: 'Training not found',
                message: 'Training with specified ID does not exist'
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
            hasAccess = coach && coach.team_id === training.team_id;
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = player && player.team_id === training.team_id;
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            hasAccess = childrenTeams.some(ct => ct.team_id === training.team_id);
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to view this training participants'
            });
        }

        // Get participants with attendance data
        const participants = await database.all(`
            SELECT 
                p.id as player_id,
                p.jersey_number,
                p.position,
                u.first_name,
                u.last_name,
                tp.attendance_status,
                tp.performance_rating,
                tp.notes
            FROM players p
            JOIN users u ON p.user_id = u.id
            LEFT JOIN training_participants tp ON p.id = tp.player_id AND tp.training_id = ?
            WHERE p.team_id = ? AND p.is_active = 1
            ORDER BY p.jersey_number ASC
        `, [req.params.id, training.team_id]);

        // Get attendance statistics
        const stats = await database.get(`
            SELECT 
                COUNT(*) as total_players,
                COUNT(CASE WHEN tp.attendance_status = 'present' THEN 1 END) as present,
                COUNT(CASE WHEN tp.attendance_status = 'absent' THEN 1 END) as absent,
                COUNT(CASE WHEN tp.attendance_status = 'late' THEN 1 END) as late,
                AVG(tp.performance_rating) as avg_performance_rating
            FROM players p
            LEFT JOIN training_participants tp ON p.id = tp.player_id AND tp.training_id = ?
            WHERE p.team_id = ? AND p.is_active = 1
        `, [req.params.id, training.team_id]);

        res.status(200).json({
            success: true,
            message: 'Training participants retrieved successfully',
            training: {
                id: training.id,
                training_date: training.training_date,
                training_type: training.training_type,
                status: training.status
            },
            participants,
            statistics: stats
        });

    } catch (error) {
        console.error('Training participants fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve training participants'
        });
    }
});






module.exports = router;