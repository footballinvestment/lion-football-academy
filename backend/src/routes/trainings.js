const express = require('express');
const router = express.Router();
const Training = require('../models/Training');
const Attendance = require('../models/Attendance');
const Player = require('../models/Player');
const { authenticate, isAdminOrCoach, canAccessTeam } = require('../middleware/auth');

const validateTraining = (trainingData) => {
    const errors = [];
    if (!trainingData.date) {
        errors.push('Dátum kötelező');
    }
    if (!trainingData.time) {
        errors.push('Időpont kötelező');
    }
    if (!trainingData.type || trainingData.type.trim() === '') {
        errors.push('Edzés típusa kötelező');
    }
    return errors;
};

// GET /api/trainings - Team-based edzések listája
router.get('/', authenticate, async (req, res) => {
    try {
        if (req.user.role === 'admin') {
            // Admin minden edzést lát
            const { team_id, start_date, end_date, limit } = req.query;
            
            let trainings;
            if (start_date && end_date) {
                trainings = await Training.findByDateRange(start_date, end_date, team_id);
            } else if (team_id) {
                trainings = await Training.findByTeam(team_id);
            } else {
                trainings = await Training.findAll();
            }
            
            if (limit) {
                trainings = trainings.slice(0, parseInt(limit));
            }
            
            return res.json(trainings);
        }
        
        if (req.user.team_id) {
            // Coach/Parent csak saját csapat edzéseit
            const { start_date, end_date, limit } = req.query;
            
            let trainings;
            if (start_date && end_date) {
                trainings = await Training.findByDateRange(start_date, end_date, req.user.team_id);
            } else {
                trainings = await Training.findByTeam(req.user.team_id);
            }
            
            if (limit) {
                trainings = trainings.slice(0, parseInt(limit));
            }
            
            return res.json(trainings);
        }
        
        res.json([]);
    } catch (error) {
        console.error('Trainings fetch error:', error);
        res.status(500).json({ error: 'Server error fetching trainings' });
    }
});

// GET /api/trainings/upcoming - Közelgő edzések team-based filtering
router.get('/upcoming', authenticate, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        let teamId = req.query.team_id;
        
        if (req.user.role === 'admin') {
            // Admin minden edzést lát, team_id query param alapján szűr
            const upcomingTrainings = await Training.getUpcoming(teamId, parseInt(limit));
            return res.json(upcomingTrainings);
        }
        
        if (req.user.team_id) {
            // Coach/Parent csak saját csapat edzéseit
            const upcomingTrainings = await Training.getUpcoming(req.user.team_id, parseInt(limit));
            return res.json(upcomingTrainings);
        }
        
        res.json([]);
    } catch (error) {
        console.error('Upcoming trainings fetch error:', error);
        res.status(500).json({ error: 'Server error fetching upcoming trainings' });
    }
});

// GET /api/trainings/:id - Edzés részletei
router.get('/:id', authenticate, async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ error: 'Edzés nem található' });
        }
        
        // Access control: csak admin vagy saját csapat edzéseit láthatja
        if (req.user.role !== 'admin' && req.user.team_id !== training.team_id) {
            return res.status(403).json({ error: 'Access denied to this training' });
        }
        
        // Jelenlét adatok lekérése
        const attendance = await Attendance.findByTraining(req.params.id);
        const trainingStats = await Attendance.getTrainingStats(req.params.id);
        
        res.json({
            ...training,
            attendance,
            stats: trainingStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/trainings - Új edzés létrehozása
router.post('/', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const errors = validateTraining(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const result = await Training.create(req.body);
        const newTraining = await Training.findById(result.id);
        
        // Ha van team_id, automatikusan létrehozzuk a jelenlét rekordokat
        if (req.body.team_id) {
            const players = await Player.findByTeam(req.body.team_id);
            const playerIds = players.map(player => player.id);
            
            if (playerIds.length > 0) {
                await Attendance.bulkCreateForTraining(result.id, playerIds);
            }
        }
        
        res.status(201).json(newTraining);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/trainings/:id - Edzés módosítása
router.put('/:id', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const errors = validateTraining(req.body);
        if (errors.length > 0) {
            return res.status(400).json({ errors });
        }

        const existingTraining = await Training.findById(req.params.id);
        if (!existingTraining) {
            return res.status(404).json({ error: 'Edzés nem található' });
        }

        await Training.update(req.params.id, req.body);
        const updatedTraining = await Training.findById(req.params.id);
        res.json(updatedTraining);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/trainings/:id - Edzés törlése
router.delete('/:id', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const existingTraining = await Training.findById(req.params.id);
        if (!existingTraining) {
            return res.status(404).json({ error: 'Edzés nem található' });
        }

        await Training.delete(req.params.id);
        res.json({ message: 'Edzés sikeresen törölve' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/trainings/team/:teamId - Csapat edzései
router.get('/team/:teamId', authenticate, canAccessTeam, async (req, res) => {
    try {
        const trainings = await Training.findByTeam(req.params.teamId);
        res.json(trainings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/trainings/:id/attendance - Jelenlét rögzítése
router.post('/:id/attendance', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ error: 'Edzés nem található' });
        }

        const { attendanceData } = req.body; // [{ playerId, present, notes, performance_rating, late_minutes }]
        
        if (!Array.isArray(attendanceData)) {
            return res.status(400).json({ error: 'Jelenlét adatok tömb formátumban szükségesek' });
        }

        const results = [];
        for (const attendance of attendanceData) {
            const { playerId, present, notes, performance_rating, late_minutes, absence_reason } = attendance;
            
            // Ellenőrizzük, hogy létezik-e már jelenlét rekord
            const existingAttendance = await Attendance.findByTraining(req.params.id);
            const existingRecord = existingAttendance.find(a => a.player_id == playerId);
            
            if (existingRecord) {
                // Frissítjük a meglévő rekordot
                await Attendance.update(existingRecord.id, {
                    present: present ? 1 : 0,
                    late_minutes: late_minutes || 0,
                    absence_reason: absence_reason || null,
                    performance_rating: performance_rating || null,
                    notes: notes || null
                });
                results.push({ playerId, action: 'updated' });
            } else {
                // Új rekord létrehozása
                await Attendance.create({
                    player_id: playerId,
                    training_id: req.params.id,
                    present: present ? 1 : 0,
                    late_minutes: late_minutes || 0,
                    absence_reason: absence_reason || null,
                    performance_rating: performance_rating || null,
                    notes: notes || null
                });
                results.push({ playerId, action: 'created' });
            }
        }
        
        res.json({ 
            message: 'Jelenlét sikeresen rögzítve',
            results 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/trainings/:id/attendance - Edzés jelenléti adatok
router.get('/:id/attendance', authenticate, async (req, res) => {
    try {
        const training = await Training.findById(req.params.id);
        if (!training) {
            return res.status(404).json({ error: 'Edzés nem található' });
        }

        // Access control: csak admin vagy saját csapat edzéseit láthatja
        if (req.user.role !== 'admin' && req.user.team_id !== training.team_id) {
            return res.status(403).json({ error: 'Access denied to this training attendance' });
        }

        const attendance = await Attendance.findByTraining(req.params.id);
        const stats = await Attendance.getTrainingStats(req.params.id);
        
        res.json({
            training_id: req.params.id,
            attendance,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;