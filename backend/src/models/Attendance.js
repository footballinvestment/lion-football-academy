const db = require('../database/connection');

class Attendance {
    static async create(attendanceData) {
        const { player_id, training_id, present, late_minutes, absence_reason, performance_rating, notes } = attendanceData;
        const sql = `
            INSERT INTO attendance (player_id, training_id, present, late_minutes, absence_reason, performance_rating, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await db.run(sql, [player_id, training_id, present, late_minutes, absence_reason, performance_rating, notes]);
    }

    static async findByTraining(trainingId) {
        const sql = `
            SELECT a.*, p.name as player_name 
            FROM attendance a 
            JOIN players p ON a.player_id = p.id 
            WHERE a.training_id = ?
            ORDER BY p.name
        `;
        return await db.query(sql, [trainingId]);
    }

    static async findByPlayer(playerId) {
        const sql = `
            SELECT a.*, t.date, t.time, t.type, tm.name as team_name
            FROM attendance a 
            JOIN trainings t ON a.training_id = t.id 
            LEFT JOIN teams tm ON t.team_id = tm.id
            WHERE a.player_id = ?
            ORDER BY t.date DESC, t.time DESC
        `;
        return await db.query(sql, [playerId]);
    }

    static async findById(id) {
        const sql = `
            SELECT a.*, p.name as player_name, t.date, t.time, t.type
            FROM attendance a 
            JOIN players p ON a.player_id = p.id 
            JOIN trainings t ON a.training_id = t.id
            WHERE a.id = ?
        `;
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async update(id, attendanceData) {
        const { present, late_minutes, absence_reason, performance_rating, notes } = attendanceData;
        const sql = `
            UPDATE attendance 
            SET present = ?, late_minutes = ?, absence_reason = ?, performance_rating = ?, notes = ?
            WHERE id = ?
        `;
        return await db.run(sql, [present, late_minutes, absence_reason, performance_rating, notes, id]);
    }

    static async delete(id) {
        const sql = 'DELETE FROM attendance WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async getPlayerStats(playerId) {
        const sql = `
            SELECT 
                COUNT(*) as total_trainings,
                SUM(CASE WHEN present = 1 THEN 1 ELSE 0 END) as attended,
                SUM(CASE WHEN present = 0 THEN 1 ELSE 0 END) as missed,
                AVG(CASE WHEN performance_rating IS NOT NULL THEN performance_rating END) as avg_performance,
                SUM(late_minutes) as total_late_minutes
            FROM attendance 
            WHERE player_id = ?
        `;
        const results = await db.query(sql, [playerId]);
        return results[0] || null;
    }

    static async getTrainingStats(trainingId) {
        const sql = `
            SELECT 
                COUNT(*) as total_players,
                SUM(CASE WHEN present = 1 THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN present = 0 THEN 1 ELSE 0 END) as absent_count,
                AVG(CASE WHEN performance_rating IS NOT NULL THEN performance_rating END) as avg_performance
            FROM attendance 
            WHERE training_id = ?
        `;
        const results = await db.query(sql, [trainingId]);
        return results[0] || null;
    }

    static async bulkCreateForTraining(trainingId, playerIds) {
        const sql = `
            INSERT INTO attendance (player_id, training_id, present)
            VALUES (?, ?, 0)
        `;
        
        const promises = playerIds.map(playerId => 
            db.run(sql, [playerId, trainingId])
        );
        
        return await Promise.all(promises);
    }
}

module.exports = Attendance;