const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticate, isAdminOrCoach, isPlayer } = require('../middleware/auth');
const { validationResult, body, param, query } = require('express-validator');
const crypto = require('crypto');

// Apply authentication to all QR routes
router.use(authenticate);

// QR Code types
const QR_CODE_TYPES = {
    ATTENDANCE: 'attendance',
    TRAINING: 'training',
    MATCH: 'match',
    EVENT: 'event',
    PLAYER_ID: 'player_id'
};

// QR Code status
const QR_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    USED: 'used',
    INVALID: 'invalid'
};

/**
 * Generate secure signature for QR code
 */
const generateSecureSignature = (playerId, sessionId, timestamp) => {
    const secret = process.env.QR_SECRET_KEY || 'lfa_qr_secret_2024';
    const dataString = `${playerId}-${sessionId}-${timestamp}-${secret}`;
    return crypto.createHash('sha256').update(dataString).digest('hex').substring(0, 16);
};

/**
 * Validate QR code signature
 */
const validateSignature = (playerId, sessionId, timestamp, signature) => {
    const expectedSignature = generateSecureSignature(playerId, sessionId, timestamp);
    return expectedSignature === signature;
};

/**
 * Check if QR code is expired
 */
const isQRExpired = (timestamp, expirationMinutes = 30) => {
    const now = Date.now();
    const qrTime = parseInt(timestamp);
    const expirationTime = qrTime + (expirationMinutes * 60 * 1000);
    return now > expirationTime;
};

/**
 * Log QR code usage for audit trail
 */
const logQRUsage = async (playerId, sessionId, action, metadata = {}) => {
    try {
        await db.execute(`
            INSERT INTO qr_audit_log (
                player_id, session_id, action, metadata, ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        `, [
            playerId,
            sessionId,
            action,
            JSON.stringify(metadata),
            metadata.ip_address || null,
            metadata.user_agent || null
        ]);
    } catch (error) {
        console.error('Error logging QR usage:', error);
    }
};

/**
 * GET /api/qr/generate/:playerId - Generate QR code for player
 */
router.get('/generate/:playerId', [
    param('playerId').isInt().withMessage('Invalid player ID'),
    query('sessionId').optional().isInt().withMessage('Invalid session ID'),
    query('sessionType').optional().isIn(Object.values(QR_CODE_TYPES)).withMessage('Invalid session type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { playerId } = req.params;
        const { sessionId, sessionType = QR_CODE_TYPES.ATTENDANCE } = req.query;
        const { user_id, role } = req.user;

        // Check if user can generate QR for this player
        if (role === 'player' && parseInt(playerId) !== user_id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get player information
        const [playerResult] = await db.execute(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email,
                p.team_id, t.name as team_name
            FROM users u
            LEFT JOIN players p ON u.id = p.user_id
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE u.id = ? AND u.role = 'player'
        `, [playerId]);

        if (playerResult.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const player = playerResult[0];
        const timestamp = Date.now();
        const signature = generateSecureSignature(playerId, sessionId || 'player-id', timestamp);

        // Create QR code record
        const [qrResult] = await db.execute(`
            INSERT INTO qr_codes (
                player_id, session_id, session_type, signature, timestamp, 
                status, expires_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), NOW())
        `, [
            playerId,
            sessionId || null,
            sessionType,
            signature,
            timestamp,
            QR_STATUS.ACTIVE
        ]);

        // Log QR generation
        await logQRUsage(playerId, sessionId, 'generate', {
            session_type: sessionType,
            qr_id: qrResult.insertId,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        // Get session information if provided
        let sessionInfo = null;
        if (sessionId) {
            const [sessionResult] = await db.execute(`
                SELECT id, name, date, type, location
                FROM training_sessions 
                WHERE id = ?
                UNION
                SELECT id, name, date, 'match' as type, venue as location
                FROM matches 
                WHERE id = ?
            `, [sessionId, sessionId]);

            sessionInfo = sessionResult[0] || null;
        }

        res.json({
            success: true,
            qrCode: {
                id: qrResult.insertId,
                playerId,
                sessionId,
                sessionType,
                signature,
                timestamp,
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                data: JSON.stringify({
                    playerId,
                    sessionId: sessionId || 'player-id',
                    sessionType,
                    timestamp,
                    signature,
                    version: '1.0'
                })
            },
            player: {
                id: player.id,
                name: `${player.first_name} ${player.last_name}`,
                team: player.team_name || 'No Team Assigned',
                email: player.email
            },
            session: sessionInfo
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

/**
 * POST /api/qr/scan - Scan QR code for attendance
 */
router.post('/scan', isAdminOrCoach, [
    body('qrData').notEmpty().withMessage('QR data is required'),
    body('sessionId').optional().isInt().withMessage('Invalid session ID'),
    body('location').optional().notEmpty().withMessage('Location cannot be empty')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { qrData, sessionId, location } = req.body;
        const { user_id: scannerId } = req.user;

        // Parse QR data
        let parsedData;
        try {
            parsedData = JSON.parse(qrData);
        } catch (error) {
            return res.status(400).json({ error: 'Invalid QR code format' });
        }

        const { playerId, sessionId: qrSessionId, timestamp, signature } = parsedData;

        // Validate required fields
        if (!playerId || !timestamp || !signature) {
            return res.status(400).json({ error: 'Invalid QR code - missing required fields' });
        }

        // Check if QR code is expired
        if (isQRExpired(timestamp)) {
            await logQRUsage(playerId, qrSessionId, 'scan_expired', {
                scanner_id: scannerId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            return res.status(400).json({ error: 'QR code has expired' });
        }

        // Validate signature
        if (!validateSignature(playerId, qrSessionId, timestamp, signature)) {
            await logQRUsage(playerId, qrSessionId, 'scan_invalid_signature', {
                scanner_id: scannerId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            return res.status(400).json({ error: 'Invalid QR code signature' });
        }

        // Check if session ID matches (if provided)
        if (sessionId && qrSessionId !== sessionId.toString() && qrSessionId !== 'player-id') {
            return res.status(400).json({ error: 'QR code is not valid for this session' });
        }

        // Get QR code record
        const [qrRecord] = await db.execute(`
            SELECT * FROM qr_codes 
            WHERE player_id = ? AND signature = ? AND timestamp = ?
        `, [playerId, signature, timestamp]);

        if (qrRecord.length === 0) {
            await logQRUsage(playerId, qrSessionId, 'scan_not_found', {
                scanner_id: scannerId,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            return res.status(404).json({ error: 'QR code not found in system' });
        }

        const qrCodeRecord = qrRecord[0];

        // Check if QR code is already used
        if (qrCodeRecord.status === QR_STATUS.USED) {
            await logQRUsage(playerId, qrSessionId, 'scan_already_used', {
                scanner_id: scannerId,
                qr_id: qrCodeRecord.id,
                ip_address: req.ip,
                user_agent: req.get('User-Agent')
            });
            return res.status(400).json({ error: 'QR code has already been used' });
        }

        // Get player information
        const [playerResult] = await db.execute(`
            SELECT 
                u.id, u.first_name, u.last_name, u.email,
                p.team_id, t.name as team_name
            FROM users u
            LEFT JOIN players p ON u.id = p.user_id
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE u.id = ?
        `, [playerId]);

        if (playerResult.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const player = playerResult[0];

        // Check if attendance already exists for this session
        let attendanceId = null;
        if (sessionId) {
            const [existingAttendance] = await db.execute(`
                SELECT id FROM attendance 
                WHERE player_id = ? AND session_id = ? AND session_type = ?
            `, [playerId, sessionId, qrCodeRecord.session_type]);

            if (existingAttendance.length > 0) {
                attendanceId = existingAttendance[0].id;
                
                // Update existing attendance
                await db.execute(`
                    UPDATE attendance 
                    SET status = 'present', check_in_time = NOW(), 
                        qr_code_id = ?, scanner_id = ?, location = ?,
                        updated_at = NOW()
                    WHERE id = ?
                `, [qrCodeRecord.id, scannerId, location || null, attendanceId]);
            } else {
                // Create new attendance record
                const [attendanceResult] = await db.execute(`
                    INSERT INTO attendance (
                        player_id, session_id, session_type, status, check_in_time,
                        qr_code_id, scanner_id, location, created_at
                    ) VALUES (?, ?, ?, 'present', NOW(), ?, ?, ?, NOW())
                `, [
                    playerId, 
                    sessionId, 
                    qrCodeRecord.session_type, 
                    qrCodeRecord.id, 
                    scannerId, 
                    location || null
                ]);
                attendanceId = attendanceResult.insertId;
            }
        }

        // Mark QR code as used
        await db.execute(`
            UPDATE qr_codes 
            SET status = ?, used_at = NOW(), scanner_id = ?
            WHERE id = ?
        `, [QR_STATUS.USED, scannerId, qrCodeRecord.id]);

        // Log successful scan
        await logQRUsage(playerId, qrSessionId, 'scan_success', {
            scanner_id: scannerId,
            qr_id: qrCodeRecord.id,
            attendance_id: attendanceId,
            location,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Attendance recorded successfully',
            attendance: {
                id: attendanceId,
                playerId,
                sessionId,
                status: 'present',
                checkInTime: new Date().toISOString(),
                location
            },
            player: {
                id: player.id,
                name: `${player.first_name} ${player.last_name}`,
                team: player.team_name,
                email: player.email
            }
        });
    } catch (error) {
        console.error('Error scanning QR code:', error);
        res.status(500).json({ error: 'Failed to process QR code scan' });
    }
});

/**
 * GET /api/qr/sessions - Get sessions available for QR attendance
 */
router.get('/sessions', isAdminOrCoach, async (req, res) => {
    try {
        const { date, type, team_id } = req.query;
        const { user_id, role } = req.user;

        let whereClause = 'WHERE 1=1';
        const params = [];

        // Filter by date if provided
        if (date) {
            whereClause += ' AND DATE(ts.date) = ?';
            params.push(date);
        } else {
            // Default to today and future sessions
            whereClause += ' AND DATE(ts.date) >= CURDATE()';
        }

        // Filter by type if provided
        if (type && ['training', 'match', 'event'].includes(type)) {
            whereClause += ' AND ts.type = ?';
            params.push(type);
        }

        // Filter by team if provided (and user has access)
        if (team_id) {
            if (role === 'coach') {
                // Coaches can only see their own team sessions
                whereClause += ' AND ts.team_id = ? AND ts.team_id IN (SELECT team_id FROM coaches WHERE user_id = ?)';
                params.push(team_id, user_id);
            } else {
                // Admins can see any team
                whereClause += ' AND ts.team_id = ?';
                params.push(team_id);
            }
        } else if (role === 'coach') {
            // Coaches can only see their own team sessions
            whereClause += ' AND ts.team_id IN (SELECT team_id FROM coaches WHERE user_id = ?)';
            params.push(user_id);
        }

        const query = `
            SELECT 
                ts.id,
                ts.name,
                ts.date,
                ts.type,
                ts.location,
                ts.team_id,
                t.name as team_name,
                COUNT(DISTINCT a.player_id) as attendance_count,
                COUNT(DISTINCT tp.user_id) as total_players
            FROM (
                SELECT id, name, date, 'training' as type, location, team_id
                FROM training_sessions
                UNION ALL
                SELECT id, CONCAT('vs ', opponent) as name, date, 'match' as type, venue as location, team_id
                FROM matches
                UNION ALL
                SELECT id, name, date, 'event' as type, location, team_id
                FROM events
            ) ts
            LEFT JOIN teams t ON ts.team_id = t.id
            LEFT JOIN attendance a ON ts.id = a.session_id AND a.session_type = ts.type
            LEFT JOIN players tp ON ts.team_id = tp.team_id
            ${whereClause}
            GROUP BY ts.id, ts.name, ts.date, ts.type, ts.location, ts.team_id, t.name
            ORDER BY ts.date ASC, ts.name ASC
        `;

        const [sessions] = await db.execute(query, params);

        res.json({
            success: true,
            sessions: sessions.map(session => ({
                ...session,
                attendance_percentage: session.total_players > 0 
                    ? Math.round((session.attendance_count / session.total_players) * 100)
                    : 0
            }))
        });
    } catch (error) {
        console.error('Error fetching QR sessions:', error);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

/**
 * GET /api/qr/attendance/:sessionId - Get attendance for session
 */
router.get('/attendance/:sessionId', isAdminOrCoach, [
    param('sessionId').isInt().withMessage('Invalid session ID'),
    query('sessionType').optional().isIn(['training', 'match', 'event']).withMessage('Invalid session type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { sessionId } = req.params;
        const { sessionType = 'training' } = req.query;

        // Get attendance records
        const [attendance] = await db.execute(`
            SELECT 
                a.*,
                u.first_name,
                u.last_name,
                u.email,
                t.name as team_name,
                sc.first_name as scanner_first_name,
                sc.last_name as scanner_last_name,
                qr.timestamp as qr_timestamp,
                qr.expires_at as qr_expires_at
            FROM attendance a
            JOIN users u ON a.player_id = u.id
            LEFT JOIN players p ON u.id = p.user_id
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN users sc ON a.scanner_id = sc.id
            LEFT JOIN qr_codes qr ON a.qr_code_id = qr.id
            WHERE a.session_id = ? AND a.session_type = ?
            ORDER BY a.check_in_time DESC
        `, [sessionId, sessionType]);

        // Get team players who haven't checked in
        const [allPlayers] = await db.execute(`
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.email,
                t.name as team_name
            FROM users u
            JOIN players p ON u.id = p.user_id
            JOIN teams t ON p.team_id = t.id
            WHERE u.id NOT IN (
                SELECT player_id FROM attendance 
                WHERE session_id = ? AND session_type = ?
            )
        `, [sessionId, sessionType]);

        res.json({
            success: true,
            sessionId: parseInt(sessionId),
            sessionType,
            attendance: attendance.map(record => ({
                id: record.id,
                player: {
                    id: record.player_id,
                    name: `${record.first_name} ${record.last_name}`,
                    email: record.email,
                    team: record.team_name
                },
                status: record.status,
                checkInTime: record.check_in_time,
                location: record.location,
                scanner: record.scanner_id ? {
                    name: `${record.scanner_first_name} ${record.scanner_last_name}`
                } : null,
                qrInfo: record.qr_timestamp ? {
                    timestamp: record.qr_timestamp,
                    expiresAt: record.qr_expires_at
                } : null
            })),
            absent: allPlayers.map(player => ({
                id: player.id,
                name: `${player.first_name} ${player.last_name}`,
                email: player.email,
                team: player.team_name
            })),
            summary: {
                total: attendance.length + allPlayers.length,
                present: attendance.length,
                absent: allPlayers.length,
                percentage: attendance.length + allPlayers.length > 0 
                    ? Math.round((attendance.length / (attendance.length + allPlayers.length)) * 100)
                    : 0
            }
        });
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({ error: 'Failed to fetch attendance' });
    }
});

/**
 * POST /api/qr/attendance/manual - Manually mark attendance
 */
router.post('/attendance/manual', isAdminOrCoach, [
    body('playerId').isInt().withMessage('Invalid player ID'),
    body('sessionId').isInt().withMessage('Invalid session ID'),
    body('sessionType').isIn(['training', 'match', 'event']).withMessage('Invalid session type'),
    body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { playerId, sessionId, sessionType, status, notes } = req.body;
        const { user_id: scannerId } = req.user;

        // Check if attendance already exists
        const [existingAttendance] = await db.execute(`
            SELECT id FROM attendance 
            WHERE player_id = ? AND session_id = ? AND session_type = ?
        `, [playerId, sessionId, sessionType]);

        let attendanceId;

        if (existingAttendance.length > 0) {
            // Update existing attendance
            attendanceId = existingAttendance[0].id;
            await db.execute(`
                UPDATE attendance 
                SET status = ?, scanner_id = ?, notes = ?, updated_at = NOW()
                WHERE id = ?
            `, [status, scannerId, notes || null, attendanceId]);
        } else {
            // Create new attendance record
            const [attendanceResult] = await db.execute(`
                INSERT INTO attendance (
                    player_id, session_id, session_type, status, 
                    scanner_id, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())
            `, [playerId, sessionId, sessionType, status, scannerId, notes || null]);
            attendanceId = attendanceResult.insertId;
        }

        // Log manual attendance
        await logQRUsage(playerId, sessionId, 'manual_attendance', {
            scanner_id: scannerId,
            status,
            notes,
            ip_address: req.ip,
            user_agent: req.get('User-Agent')
        });

        res.json({
            success: true,
            message: 'Attendance updated successfully',
            attendanceId
        });
    } catch (error) {
        console.error('Error updating manual attendance:', error);
        res.status(500).json({ error: 'Failed to update attendance' });
    }
});

/**
 * GET /api/qr/audit/:playerId - Get QR usage audit log for player
 */
router.get('/audit/:playerId', isAdminOrCoach, [
    param('playerId').isInt().withMessage('Invalid player ID'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { playerId } = req.params;
        const { limit = 50 } = req.query;

        const [auditLog] = await db.execute(`
            SELECT 
                qal.*,
                u.first_name as player_first_name,
                u.last_name as player_last_name
            FROM qr_audit_log qal
            JOIN users u ON qal.player_id = u.id
            WHERE qal.player_id = ?
            ORDER BY qal.created_at DESC
            LIMIT ?
        `, [playerId, parseInt(limit)]);

        res.json({
            success: true,
            playerId: parseInt(playerId),
            auditLog: auditLog.map(log => ({
                id: log.id,
                action: log.action,
                sessionId: log.session_id,
                metadata: log.metadata ? JSON.parse(log.metadata) : {},
                timestamp: log.created_at,
                ipAddress: log.ip_address,
                userAgent: log.user_agent
            }))
        });
    } catch (error) {
        console.error('Error fetching QR audit log:', error);
        res.status(500).json({ error: 'Failed to fetch audit log' });
    }
});

/**
 * DELETE /api/qr/expire/:qrId - Manually expire QR code
 */
router.delete('/expire/:qrId', isAdminOrCoach, [
    param('qrId').isInt().withMessage('Invalid QR code ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { qrId } = req.params;

        const [result] = await db.execute(`
            UPDATE qr_codes 
            SET status = ?, expires_at = NOW()
            WHERE id = ? AND status = ?
        `, [QR_STATUS.EXPIRED, qrId, QR_STATUS.ACTIVE]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'QR code not found or already expired' });
        }

        res.json({
            success: true,
            message: 'QR code expired successfully'
        });
    } catch (error) {
        console.error('Error expiring QR code:', error);
        res.status(500).json({ error: 'Failed to expire QR code' });
    }
});

module.exports = router;