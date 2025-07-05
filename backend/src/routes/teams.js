const express = require('express');
const router = express.Router();
const database = require('../database/database');
const { authenticate, authorize, rateLimit, securityHeaders } = require('../middleware/auth');

// Apply security headers to all routes
router.use(securityHeaders);

// Apply rate limiting to team routes
router.use(rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many team requests, please try again later'
}));

// All routes require authentication
router.use(authenticate);

// GET /api/teams - List teams with role-based filtering
router.get('/', async (req, res) => {
    try {
        let query = `
            SELECT 
                t.*,
                COUNT(DISTINCT p.id) as player_count,
                COUNT(DISTINCT c.id) as coach_count,
                c.id as coach_id,
                u.first_name as coach_first_name,
                u.last_name as coach_last_name
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id AND p.is_active = 1
            LEFT JOIN coaches c ON t.id = c.team_id AND c.is_active = 1
            LEFT JOIN users u ON c.user_id = u.id
            WHERE t.is_active = 1
        `;
        const params = [];

        // Role-based filtering
        if (req.user.role === 'coach') {
            // Get coach's team only
            const coach = await database.get(`
                SELECT team_id FROM coaches WHERE user_id = ?
            `, [req.user.id]);
            
            if (coach && coach.team_id) {
                query += ' AND t.id = ?';
                params.push(coach.team_id);
            } else {
                return res.json({ success: true, teams: [], count: 0 });
            }
        } else if (req.user.role === 'player') {
            // Get player's team only
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            
            if (player && player.team_id) {
                query += ' AND t.id = ?';
                params.push(player.team_id);
            } else {
                return res.json({ success: true, teams: [], count: 0 });
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
                query += ` AND t.id IN (${placeholders})`;
                params.push(...teamIds);
            } else {
                return res.json({ success: true, teams: [], count: 0 });
            }
        }
        // Admin sees all teams (no additional filtering)

        query += `
            GROUP BY t.id, t.name, t.age_group, t.division, t.description, t.home_venue, t.founded_year, t.is_active, t.created_at, t.updated_at, c.id, u.first_name, u.last_name
            ORDER BY t.name ASC
        `;

        const teams = await database.all(query, params);

        res.status(200).json({
            success: true,
            message: 'Teams retrieved successfully',
            teams: teams.map(team => ({
                ...team,
                coach_name: team.coach_first_name && team.coach_last_name 
                    ? `${team.coach_first_name} ${team.coach_last_name}` 
                    : null
            })),
            count: teams.length
        });

    } catch (error) {
        console.error('Teams fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve teams'
        });
    }
});

// POST /api/teams - Create new team (admin only)
router.post('/', authorize(['admin']), async (req, res) => {
    try {
        const {
            name,
            age_group,
            division,
            description,
            home_venue,
            founded_year
        } = req.body;

        // Validate required fields
        if (!name || !age_group) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                message: 'name and age_group are required'
            });
        }

        // Check if team name already exists
        const existingTeam = await database.get(`
            SELECT id FROM teams WHERE name = ? AND is_active = 1
        `, [name]);

        if (existingTeam) {
            return res.status(400).json({
                success: false,
                error: 'Team already exists',
                message: 'A team with this name already exists'
            });
        }

        const teamId = require('crypto').randomBytes(16).toString('hex');

        await database.run(`
            INSERT INTO teams (
                id, name, age_group, division, description,
                home_venue, founded_year, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        `, [
            teamId,
            name,
            age_group,
            division,
            description,
            home_venue,
            founded_year
        ]);

        // Get the created team
        const newTeam = await database.get(`
            SELECT 
                t.*,
                COUNT(DISTINCT p.id) as player_count,
                COUNT(DISTINCT c.id) as coach_count
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id AND p.is_active = 1
            LEFT JOIN coaches c ON t.id = c.team_id AND c.is_active = 1
            WHERE t.id = ?
            GROUP BY t.id
        `, [teamId]);

        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            team: newTeam
        });

    } catch (error) {
        console.error('Team creation error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to create team'
        });
    }
});

// GET /api/teams/:id - Get single team details
router.get('/:id', async (req, res) => {
    try {
        const team = await database.get(`
            SELECT 
                t.*,
                COUNT(DISTINCT p.id) as player_count,
                COUNT(DISTINCT c.id) as coach_count,
                c.id as coach_id,
                u.first_name as coach_first_name,
                u.last_name as coach_last_name
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id AND p.is_active = 1
            LEFT JOIN coaches c ON t.id = c.team_id AND c.is_active = 1
            LEFT JOIN users u ON c.user_id = u.id
            WHERE t.id = ? AND t.is_active = 1
            GROUP BY t.id
        `, [req.params.id]);
        
        if (!team) {
            return res.status(404).json({
                success: false,
                error: 'Team not found',
                message: 'Team with specified ID does not exist'
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
            hasAccess = coach && coach.team_id === team.id;
        } else if (req.user.role === 'player') {
            const player = await database.get(`
                SELECT team_id FROM players WHERE user_id = ?
            `, [req.user.id]);
            hasAccess = player && player.team_id === team.id;
        } else if (req.user.role === 'parent') {
            const childrenTeams = await database.all(`
                SELECT DISTINCT p.team_id
                FROM family_relationships fr
                JOIN players p ON fr.player_id = p.id
                WHERE fr.parent_id = ?
            `, [req.user.id]);
            hasAccess = childrenTeams.some(ct => ct.team_id === team.id);
        }

        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You do not have permission to view this team'
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'Team retrieved successfully',
            team: {
                ...team,
                coach_name: team.coach_first_name && team.coach_last_name 
                    ? `${team.coach_first_name} ${team.coach_last_name}` 
                    : null
            }
        });
    } catch (error) {
        console.error('Team fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            message: 'Failed to retrieve team'
        });
    }
});











module.exports = router;