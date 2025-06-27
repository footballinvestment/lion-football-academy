const express = require('express');
const router = express.Router();
const Injury = require('../models/Injury');
const Player = require('../models/Player');
const { authenticate, isAdmin, isAdminOrCoach, canAccessPlayer } = require('../middleware/auth');

// Apply authentication to all injury routes
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
// INJURY MANAGEMENT ENDPOINTS
// =====================================================================

/**
 * GET /api/injuries - List injuries with role-based filtering
 * Query params: status, severity, type, player_id, team_id, date_from, date_to, limit, page
 */
router.get('/', isAdminOrCoach, async (req, res) => {
    try {
        const { status, severity, type, player_id, team_id, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        let filters = { status, severity, type, player_id, date_from, date_to, limit: pagination.limit };
        
        if (req.user.role === 'admin') {
            // Admin sees all injuries, can filter by team
            if (team_id) {
                filters.team_id = team_id;
            }
            const injuries = await Injury.findAll(filters);
            res.json(formatResponse(injuries, pagination));
        } else if (req.user.role === 'coach' && req.user.team_id) {
            // Coach sees only their team's injuries
            filters.team_id = req.user.team_id;
            const injuries = await Injury.findByTeam(req.user.team_id, filters);
            res.json(formatResponse(injuries, pagination));
        } else {
            res.json(formatResponse([], pagination));
        }
    } catch (error) {
        console.error('Injuries fetch error:', error);
        res.status(500).json({ error: 'Server error fetching injuries' });
    }
});

/**
 * GET /api/injuries/active - Active injuries only
 * Query params: team_id, severity, limit, page
 */
router.get('/active', isAdminOrCoach, async (req, res) => {
    try {
        const { team_id, severity } = req.query;
        const pagination = getPagination(req);
        
        let teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const filters = { severity, limit: pagination.limit };
        const activeInjuries = await Injury.findActive(teamId, filters);
        
        res.json(formatResponse(activeInjuries, pagination));
    } catch (error) {
        console.error('Active injuries fetch error:', error);
        res.status(500).json({ error: 'Server error fetching active injuries' });
    }
});

/**
 * GET /api/injuries/stats - Comprehensive injury statistics
 * Query params: team_id, season, date_from, date_to
 */
router.get('/stats', isAdminOrCoach, async (req, res) => {
    try {
        const { team_id, season, date_from, date_to } = req.query;
        let teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const filters = { season, date_from, date_to };
        
        const [generalStats, typeStats, severityStats, monthlyStats, recoveryStats, playerStats] = await Promise.all([
            Injury.getInjuryStats(teamId, filters),
            Injury.getInjuryTypeStats(teamId, filters),
            Injury.getInjurySeverityStats(teamId, filters),
            Injury.getMonthlyInjuryStats(season, teamId, filters),
            Injury.getRecoveryTimeStats(teamId, filters),
            Injury.getPlayerInjuryStats(teamId, filters)
        ]);
        
        res.json({
            success: true,
            team_id: teamId,
            period: filters,
            statistics: {
                general: generalStats,
                by_type: typeStats,
                by_severity: severityStats,
                monthly_trends: monthlyStats,
                recovery_times: recoveryStats,
                player_breakdown: playerStats
            }
        });
    } catch (error) {
        console.error('Injury stats error:', error);
        res.status(500).json({ error: 'Failed to fetch injury statistics' });
    }
});

// GET /api/injuries/:id - Single injury details
router.get('/:id', async (req, res) => {
    try {
        const injury = await Injury.findById(req.params.id);
        if (!injury) {
            return res.status(404).json({ error: 'Injury not found' });
        }
        
        // Access control: admin or coach of the team
        if (req.user.role === 'admin' || 
            (req.user.role === 'coach' && req.user.team_id === injury.team_id)) {
            res.json(injury);
        } else {
            res.status(403).json({ error: 'Access denied to this injury record' });
        }
    } catch (error) {
        console.error('Injury fetch error:', error);
        res.status(500).json({ error: 'Server error fetching injury' });
    }
});

/**
 * GET /api/injuries/player/:playerId - Player's comprehensive injury history
 * Query params: status, limit, page, date_from, date_to
 */
router.get('/player/:playerId', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { status, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        // Validate player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        const filters = { status, date_from, date_to, limit: pagination.limit };
        const injuries = await Injury.findByPlayer(playerId, filters);
        
        // Get injury statistics for this player
        const playerInjuryStats = await Injury.getPlayerInjuryHistory(playerId);
        
        // Get medical records if available
        const medicalRecords = await Injury.getMedicalRecords(playerId, { limit: 10 });
        
        res.json({
            success: true,
            player: {
                id: player.id,
                name: player.name,
                position: player.position,
                team_name: player.team_name
            },
            injury_history: injuries,
            injury_statistics: playerInjuryStats,
            medical_records: medicalRecords,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: injuries.length
            }
        });
    } catch (error) {
        console.error('Player injuries fetch error:', error);
        res.status(500).json({ error: 'Server error fetching player injuries' });
    }
});

/**
 * POST /api/injuries - Create new injury record
 */
router.post('/', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id, injury_type, injury_severity, injury_date, injury_location, body_part } = req.body;
        
        // Validate required fields
        if (!player_id || !injury_type || !injury_severity || !injury_date || !injury_location) {
            return res.status(400).json({ 
                error: 'Missing required fields: player_id, injury_type, injury_severity, injury_date, injury_location' 
            });
        }
        
        // Validate player exists and access
        const player = await Player.findById(player_id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to record injury for this player' });
        }

        // Validate severity
        const validSeverities = ['minor', 'moderate', 'severe', 'critical'];
        if (!validSeverities.includes(injury_severity)) {
            return res.status(400).json({ 
                error: `Invalid injury_severity. Must be: ${validSeverities.join(', ')}` 
            });
        }
        
        // Validate injury type
        const validTypes = ['muscle_strain', 'ligament_sprain', 'bone_fracture', 'joint_injury', 'head_injury', 'cut_laceration', 'bruise_contusion', 'overuse_injury', 'other'];
        if (!validTypes.includes(injury_type)) {
            return res.status(400).json({ 
                error: `Invalid injury_type. Must be: ${validTypes.join(', ')}` 
            });
        }
        
        // Validate date
        const injuryDate = new Date(injury_date);
        const today = new Date();
        if (injuryDate > today) {
            return res.status(400).json({ 
                error: 'Injury date cannot be in the future' 
            });
        }

        const injuryData = {
            ...req.body,
            team_id: player.team_id,
            status: 'active',
            created_by: req.user.id
        };
        
        const result = await Injury.create(injuryData);
        const newInjury = await Injury.findById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Injury recorded successfully',
            injury: newInjury
        });
    } catch (error) {
        console.error('Injury creation error:', error);
        res.status(500).json({ error: 'Failed to record injury' });
    }
});

// PUT /api/injuries/:id - Update injury record
router.put('/:id', isAdminOrCoach, async (req, res) => {
    try {
        const existingInjury = await Injury.findById(req.params.id);
        if (!existingInjury) {
            return res.status(404).json({ error: 'Injury not found' });
        }

        // Access control: admin or coach of the team
        if (req.user.role !== 'admin' && req.user.team_id !== existingInjury.team_id) {
            return res.status(403).json({ error: 'Access denied to update this injury' });
        }

        await Injury.update(req.params.id, req.body);
        const updatedInjury = await Injury.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Injury updated successfully',
            injury: updatedInjury
        });
    } catch (error) {
        console.error('Injury update error:', error);
        res.status(500).json({ error: 'Failed to update injury' });
    }
});

/**
 * PUT /api/injuries/:id/recover - Mark injury as recovered
 */
router.put('/:id/recover', isAdminOrCoach, async (req, res) => {
    try {
        const { recovery_date, return_to_play_date, recovery_notes } = req.body;
        
        const existingInjury = await Injury.findById(req.params.id);
        if (!existingInjury) {
            return res.status(404).json({ error: 'Injury not found' });
        }

        // Access control
        if (req.user.role !== 'admin' && req.user.team_id !== existingInjury.team_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        // Validate recovery date
        if (recovery_date) {
            const recoveryDate = new Date(recovery_date);
            const injuryDate = new Date(existingInjury.injury_date);
            const today = new Date();
            
            if (recoveryDate < injuryDate) {
                return res.status(400).json({ 
                    error: 'Recovery date cannot be before injury date' 
                });
            }
            
            if (recoveryDate > today) {
                return res.status(400).json({ 
                    error: 'Recovery date cannot be in the future' 
                });
            }
        }
        
        // Validate return to play date
        if (return_to_play_date && recovery_date) {
            const returnDate = new Date(return_to_play_date);
            const recoveryDate = new Date(recovery_date);
            
            if (returnDate < recoveryDate) {
                return res.status(400).json({ 
                    error: 'Return to play date cannot be before recovery date' 
                });
            }
        }

        await Injury.markRecovered(req.params.id, recovery_date, return_to_play_date, recovery_notes);
        const updatedInjury = await Injury.findById(req.params.id);
        
        res.json({
            success: true,
            message: 'Injury marked as recovered',
            injury: updatedInjury
        });
    } catch (error) {
        console.error('Injury recovery error:', error);
        res.status(500).json({ error: 'Failed to mark injury as recovered' });
    }
});

// DELETE /api/injuries/:id - Delete injury record (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
    try {
        const existingInjury = await Injury.findById(req.params.id);
        if (!existingInjury) {
            return res.status(404).json({ error: 'Injury not found' });
        }

        await Injury.delete(req.params.id);
        res.json({
            success: true,
            message: 'Injury record deleted successfully'
        });
    } catch (error) {
        console.error('Injury deletion error:', error);
        res.status(500).json({ error: 'Failed to delete injury record' });
    }
});

// =====================================================================
// MEDICAL RECORDS ENDPOINTS
// =====================================================================

/**
 * GET /api/injuries/medical/:playerId - Get player medical records
 * Query params: record_type, limit, page, date_from, date_to
 */
router.get('/medical/:playerId', canAccessPlayer, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId);
        const { record_type, date_from, date_to } = req.query;
        const pagination = getPagination(req);
        
        // Validate player exists
        const player = await Player.findById(playerId);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        const filters = { record_type, date_from, date_to, limit: pagination.limit };
        const medicalRecords = await Injury.getMedicalRecords(playerId, filters);
        
        res.json({
            success: true,
            player: {
                id: player.id,
                name: player.name,
                team_name: player.team_name
            },
            medical_records: medicalRecords,
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: medicalRecords.length
            }
        });
    } catch (error) {
        console.error('Medical records fetch error:', error);
        res.status(500).json({ error: 'Server error fetching medical records' });
    }
});

/**
 * POST /api/injuries/medical - Create medical record
 */
router.post('/medical', isAdminOrCoach, async (req, res) => {
    try {
        const { player_id, record_type, record_date, medical_professional } = req.body;
        
        if (!player_id || !record_type || !record_date) {
            return res.status(400).json({ 
                error: 'Missing required fields: player_id, record_type, record_date' 
            });
        }
        
        // Validate player exists and access
        const player = await Player.findById(player_id);
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        if (req.user.role !== 'admin' && req.user.team_id !== player.team_id) {
            return res.status(403).json({ error: 'Access denied to create medical record for this player' });
        }
        
        // Validate record type
        const validTypes = ['health_check', 'medical_clearance', 'vaccination', 'allergy', 'medication', 'medical_history', 'fitness_test'];
        if (!validTypes.includes(record_type)) {
            return res.status(400).json({ 
                error: `Invalid record_type. Must be: ${validTypes.join(', ')}` 
            });
        }
        
        const recordData = {
            ...req.body,
            created_by: req.user.id
        };
        
        const result = await Injury.createMedicalRecord(recordData);
        const newRecord = await Injury.findMedicalRecordById(result.id);
        
        res.status(201).json({
            success: true,
            message: 'Medical record created successfully',
            medical_record: newRecord
        });
    } catch (error) {
        console.error('Medical record creation error:', error);
        res.status(500).json({ error: 'Failed to create medical record' });
    }
});

/**
 * GET /api/injuries/team/:teamId/health-overview - Team health overview
 */
router.get('/team/:teamId/health-overview', async (req, res) => {
    try {
        const teamId = parseInt(req.params.teamId);
        
        // Access control: admin or team member
        if (req.user.role !== 'admin' && req.user.team_id !== teamId) {
            return res.status(403).json({ error: 'Access denied to this team\'s health data' });
        }
        
        const [activeInjuries, recentRecoveries, healthStats, upcomingMedicals] = await Promise.all([
            Injury.findActive(teamId),
            Injury.getRecentRecoveries(teamId, 30), // Last 30 days
            Injury.getTeamHealthStats(teamId),
            Injury.getUpcomingMedicalAppointments(teamId)
        ]);
        
        res.json({
            success: true,
            team_id: teamId,
            health_overview: {
                active_injuries: activeInjuries,
                recent_recoveries: recentRecoveries,
                health_statistics: healthStats,
                upcoming_appointments: upcomingMedicals
            }
        });
    } catch (error) {
        console.error('Team health overview fetch error:', error);
        res.status(500).json({ error: 'Server error fetching team health overview' });
    }
});

/**
 * GET /api/injuries/trends - Injury trends analysis
 * Query params: team_id, period (month, quarter, year), comparison_period
 */
router.get('/trends', isAdminOrCoach, async (req, res) => {
    try {
        const { team_id, period = 'month', comparison_period } = req.query;
        let teamId = req.user.role === 'coach' ? req.user.team_id : team_id;
        
        const trendData = await Injury.getInjuryTrends(teamId, period, comparison_period);
        
        res.json({
            success: true,
            team_id: teamId,
            period: period,
            trends: trendData
        });
    } catch (error) {
        console.error('Injury trends fetch error:', error);
        res.status(500).json({ error: 'Server error fetching injury trends' });
    }
});

/**
 * POST /api/injuries/:id/treatment - Add treatment record to injury
 */
router.post('/:id/treatment', isAdminOrCoach, async (req, res) => {
    try {
        const injuryId = parseInt(req.params.id);
        const { treatment_type, treatment_date, provider, notes } = req.body;
        
        if (!treatment_type || !treatment_date) {
            return res.status(400).json({ 
                error: 'Missing required fields: treatment_type, treatment_date' 
            });
        }
        
        const injury = await Injury.findById(injuryId);
        if (!injury) {
            return res.status(404).json({ error: 'Injury not found' });
        }
        
        // Access control
        if (req.user.role !== 'admin' && req.user.team_id !== injury.team_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const treatmentData = {
            injury_id: injuryId,
            treatment_type,
            treatment_date,
            provider,
            notes,
            recorded_by: req.user.id
        };
        
        const result = await Injury.addTreatmentRecord(treatmentData);
        
        res.status(201).json({
            success: true,
            message: 'Treatment record added successfully',
            treatment_id: result.id
        });
    } catch (error) {
        console.error('Treatment record creation error:', error);
        res.status(500).json({ error: 'Failed to add treatment record' });
    }
});

/**
 * GET /api/injuries/:id/treatment - Get treatment history for injury
 */
router.get('/:id/treatment', async (req, res) => {
    try {
        const injuryId = parseInt(req.params.id);
        
        const injury = await Injury.findById(injuryId);
        if (!injury) {
            return res.status(404).json({ error: 'Injury not found' });
        }
        
        // Access control
        if (req.user.role !== 'admin' && 
            req.user.team_id !== injury.team_id &&
            req.user.player_id !== injury.player_id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const treatments = await Injury.getTreatmentHistory(injuryId);
        
        res.json({
            success: true,
            injury_id: injuryId,
            treatment_history: treatments
        });
    } catch (error) {
        console.error('Treatment history fetch error:', error);
        res.status(500).json({ error: 'Server error fetching treatment history' });
    }
});

module.exports = router;