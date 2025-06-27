const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { authenticate, isAdminOrCoach } = require('../middleware/auth');
const db = require('../database/connection');

const router = express.Router();

// Generate QR code for training check-in
router.get('/trainings/:id/qr-code', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Verify training exists and user has access
    const training = await db.query(
      `SELECT t.*, team.name as team_name 
       FROM trainings t 
       JOIN teams team ON t.team_id = team.id 
       WHERE t.id = ? AND (team.coach_name = ? OR ? = 'admin')`,
      [id, user.full_name, user.role]
    ).then(rows => rows[0]);

    if (!training) {
      return res.status(404).json({ error: 'Training not found or access denied' });
    }

    // Generate unique token for this training session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await db.run(
      `INSERT OR REPLACE INTO training_qr_tokens (training_id, token, expires_at, created_by) 
       VALUES (?, ?, ?, ?)`,
      [id, token, expiresAt.toISOString(), user.id]
    );

    // Create QR code data
    const qrData = {
      training_id: id,
      token: token,
      team: training.team_name,
      date: training.date,
      time: training.time
    };

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      training_id: id,
      token: token,
      qr_code: qrCodeUrl,
      expires_at: expiresAt.toISOString(),
      training: {
        team_name: training.team_name,
        date: training.date,
        time: training.time,
        location: training.location
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Validate QR token and process check-in
router.post('/trainings/check-in', authenticate, isAdminOrCoach, async (req, res) => {
  try {
    const { qr_data, player_id } = req.body;

    if (!qr_data || !player_id) {
      return res.status(400).json({ error: 'QR data and player ID required' });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(qr_data);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid QR code format' });
    }

    const { training_id, token } = parsedData;

    // Verify token
    const tokenRecord = await db.query(
      `SELECT * FROM training_qr_tokens 
       WHERE training_id = ? AND token = ? AND expires_at > datetime('now')`,
      [training_id, token]
    ).then(rows => rows[0]);

    if (!tokenRecord) {
      return res.status(400).json({ error: 'Invalid or expired QR code' });
    }

    // Verify training exists and is within check-in window
    const training = await db.query(
      `SELECT * FROM trainings WHERE id = ?`,
      [training_id]
    ).then(rows => rows[0]);

    if (!training) {
      return res.status(404).json({ error: 'Training not found' });
    }

    // Check if training is within acceptable time window (30 mins before to 15 mins after)
    const trainingDateTime = new Date(`${training.date}T${training.time}`);
    const now = new Date();
    const timeDiff = (now - trainingDateTime) / (1000 * 60); // difference in minutes

    if (timeDiff < -30 || timeDiff > 15) {
      return res.status(400).json({ 
        error: 'Check-in only available 30 minutes before to 15 minutes after training start',
        training_time: trainingDateTime.toISOString(),
        current_time: now.toISOString()
      });
    }

    // Verify player is in this team
    const playerTeam = await db.query(
      `SELECT * FROM players WHERE id = ? AND team_id = ?`,
      [player_id, training.team_id]
    ).then(rows => rows[0]);

    if (!playerTeam) {
      return res.status(403).json({ error: 'Player not authorized for this training' });
    }

    // Additional security: Verify user has access to this team (coaches can only access their team)
    if (req.user.role === 'coach' && req.user.team_id !== training.team_id) {
      return res.status(403).json({ error: 'Access denied: You can only check-in players from your team' });
    }

    // Check for duplicate check-in
    const existingAttendance = await db.query(
      `SELECT * FROM attendance WHERE training_id = ? AND player_id = ?`,
      [training_id, player_id]
    ).then(rows => rows[0]);

    if (existingAttendance) {
      return res.status(400).json({ 
        error: 'Player already checked in for this training',
        check_in_time: existingAttendance.created_at
      });
    }

    // Record attendance
    const checkInTime = new Date().toISOString();
    await db.run(
      `INSERT INTO attendance (training_id, player_id, status, notes, created_at, updated_at) 
       VALUES (?, ?, 'present', 'QR Check-in', ?, ?)`,
      [training_id, player_id, checkInTime, checkInTime]
    );

    // Get player details for response
    const player = await db.query(
      `SELECT name FROM players WHERE id = ?`,
      [player_id]
    ).then(rows => rows[0]);

    res.json({
      success: true,
      message: 'Check-in successful',
      player_name: player.name,
      training_id: training_id,
      check_in_time: checkInTime
    });

  } catch (error) {
    console.error('Error processing check-in:', error);
    res.status(500).json({ error: 'Failed to process check-in' });
  }
});

// Get check-ins for a training
router.get('/trainings/:id/check-ins', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Verify access to training
    const training = await db.query(
      `SELECT t.*, team.name as team_name 
       FROM trainings t 
       JOIN teams team ON t.team_id = team.id 
       WHERE t.id = ? AND (team.coach_name = ? OR ? = 'admin')`,
      [id, user.full_name, user.role]
    ).then(rows => rows[0]);

    if (!training) {
      return res.status(404).json({ error: 'Training not found or access denied' });
    }

    // Get all check-ins for this training
    const checkIns = await db.query(
      `SELECT a.*, p.name as player_name, p.position 
       FROM attendance a 
       JOIN players p ON a.player_id = p.id 
       WHERE a.training_id = ? AND a.status = 'present'
       ORDER BY a.created_at ASC`,
      [id]
    );

    res.json({
      training_id: id,
      training: {
        team_name: training.team_name,
        date: training.date,
        time: training.time,
        location: training.location
      },
      check_ins: checkIns.map(checkIn => ({
        player_id: checkIn.player_id,
        player_name: checkIn.player_name,
        position: checkIn.position,
        check_in_time: checkIn.created_at,
        notes: checkIn.notes
      })),
      total_check_ins: checkIns.length
    });

  } catch (error) {
    console.error('Error getting check-ins:', error);
    res.status(500).json({ error: 'Failed to get check-ins' });
  }
});

module.exports = router;