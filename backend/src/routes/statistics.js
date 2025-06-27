const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticate, isAdmin, isAdminOrCoach, canAccessTeam } = require('../middleware/auth');

// GET /api/statistics/player-attendance - Játékos jelenlét statisztikák
router.get('/player-attendance', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.id,
                p.name,
                p.team_id,
                t.name as team_name,
                COUNT(a.id) as total_trainings,
                SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as attended_trainings,
                ROUND(
                    (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 
                    1
                ) as attendance_percentage,
                AVG(CASE WHEN a.performance_rating IS NOT NULL THEN a.performance_rating END) as avg_performance,
                SUM(a.late_minutes) as total_late_minutes
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN attendance a ON p.id = a.player_id
            WHERE a.id IS NOT NULL
            GROUP BY p.id, p.name, p.team_id, t.name
            ORDER BY attendance_percentage DESC, attended_trainings DESC
        `;
        
        const results = await db.query(sql);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/statistics/team-performance - Csapat teljesítmény statisztikák
router.get('/team-performance', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const sql = `
            SELECT 
                t.id,
                t.name,
                t.age_group,
                COUNT(DISTINCT p.id) as active_players,
                COUNT(DISTINCT tr.id) as total_trainings,
                COUNT(a.id) as total_attendance_records,
                SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as total_present,
                ROUND(
                    (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 
                    1
                ) as avg_attendance,
                AVG(CASE WHEN a.performance_rating IS NOT NULL THEN a.performance_rating END) as avg_performance_rating
            FROM teams t
            LEFT JOIN players p ON t.id = p.team_id
            LEFT JOIN trainings tr ON t.id = tr.team_id
            LEFT JOIN attendance a ON tr.id = a.training_id
            WHERE p.id IS NOT NULL
            GROUP BY t.id, t.name, t.age_group
            HAVING COUNT(a.id) > 0
            ORDER BY avg_attendance DESC
        `;
        
        const results = await db.query(sql);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/statistics/training-attendance/:trainingId - Egy edzés jelenlét statisztikái
router.get('/training-attendance/:trainingId', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const sql = `
            SELECT 
                COUNT(*) as total_players,
                SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN a.present = 0 THEN 1 ELSE 0 END) as absent_count,
                ROUND(
                    (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 
                    1
                ) as attendance_percentage,
                AVG(CASE WHEN a.performance_rating IS NOT NULL THEN a.performance_rating END) as avg_performance,
                SUM(CASE WHEN a.late_minutes > 0 THEN 1 ELSE 0 END) as late_count,
                AVG(CASE WHEN a.late_minutes > 0 THEN a.late_minutes END) as avg_late_minutes
            FROM attendance a
            WHERE a.training_id = ?
        `;
        
        const results = await db.query(sql, [req.params.trainingId]);
        res.json(results[0] || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/statistics/monthly-attendance - Havi jelenlét statisztikák
router.get('/monthly-attendance', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const { year = new Date().getFullYear() } = req.query;
        
        const sql = `
            SELECT 
                strftime('%m', tr.date) as month,
                strftime('%Y', tr.date) as year,
                COUNT(a.id) as total_records,
                SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as total_present,
                ROUND(
                    (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 
                    1
                ) as attendance_percentage,
                COUNT(DISTINCT tr.id) as total_trainings,
                COUNT(DISTINCT p.id) as unique_players
            FROM trainings tr
            JOIN attendance a ON tr.id = a.training_id
            JOIN players p ON a.player_id = p.id
            WHERE strftime('%Y', tr.date) = ?
            GROUP BY strftime('%Y-%m', tr.date)
            ORDER BY year, month
        `;
        
        const results = await db.query(sql, [year.toString()]);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/statistics/top-performers - Legjobb teljesítménnyel rendelkező játékosok
router.get('/top-performers', authenticate, isAdminOrCoach, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        const sql = `
            SELECT 
                p.id,
                p.name,
                t.name as team_name,
                COUNT(a.id) as total_attendances,
                AVG(a.performance_rating) as avg_performance,
                SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_count,
                ROUND(
                    (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 
                    1
                ) as attendance_percentage
            FROM players p
            LEFT JOIN teams t ON p.team_id = t.id
            JOIN attendance a ON p.id = a.player_id
            WHERE a.performance_rating IS NOT NULL
            GROUP BY p.id, p.name, t.name
            HAVING COUNT(a.id) >= 5
            ORDER BY avg_performance DESC, attendance_percentage DESC
            LIMIT ?
        `;
        
        const results = await db.query(sql, [parseInt(limit)]);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/statistics/dashboard - Dashboard összesítő statisztikák
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const [
            totalPlayersRes,
            totalTeamsRes,
            totalTrainingsRes,
            recentAttendanceRes
        ] = await Promise.all([
            db.query('SELECT COUNT(*) as count FROM players'),
            db.query('SELECT COUNT(*) as count FROM teams'),
            db.query('SELECT COUNT(*) as count FROM trainings'),
            db.query(`
                SELECT 
                    COUNT(a.id) as total_records,
                    SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) as present_count,
                    ROUND(
                        (SUM(CASE WHEN a.present = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(a.id)), 
                        1
                    ) as overall_attendance_percentage
                FROM attendance a
                JOIN trainings tr ON a.training_id = tr.id
                WHERE tr.date >= date('now', '-30 days')
            `)
        ]);

        res.json({
            total_players: totalPlayersRes[0].count,
            total_teams: totalTeamsRes[0].count,
            total_trainings: totalTrainingsRes[0].count,
            recent_attendance_percentage: recentAttendanceRes[0].overall_attendance_percentage || 0,
            recent_total_records: recentAttendanceRes[0].total_records || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;