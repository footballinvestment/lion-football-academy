const db = require('../database/connection');

class Injury {
    static async findAll() {
        const query = `
            SELECT i.*, p.name as player_name, p.team_id, t.name as team_name
            FROM injuries i
            JOIN players p ON i.player_id = p.id
            LEFT JOIN teams t ON p.team_id = t.id
            ORDER BY i.injury_date DESC
        `;
        return await db.query(query);
    }

    static async findById(id) {
        const query = `
            SELECT i.*, p.name as player_name, p.team_id, t.name as team_name,
                   u.full_name as created_by_name
            FROM injuries i
            JOIN players p ON i.player_id = p.id
            LEFT JOIN teams t ON p.team_id = t.id
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.id = ?
        `;
        const results = await db.query(query, [id]);
        return results[0] || null;
    }

    static async findByPlayer(playerId) {
        const query = `
            SELECT i.*, u.full_name as created_by_name
            FROM injuries i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.player_id = ? 
            ORDER BY i.injury_date DESC
        `;
        return await db.query(query, [playerId]);
    }

    static async findByTeam(teamId) {
        const query = `
            SELECT i.*, p.name as player_name, p.position
            FROM injuries i
            JOIN players p ON i.player_id = p.id
            WHERE p.team_id = ?
            ORDER BY i.injury_date DESC
        `;
        return await db.query(query, [teamId]);
    }

    static async findActive(teamId = null) {
        let query = `
            SELECT i.*, p.name as player_name, p.team_id, t.name as team_name
            FROM injuries i
            JOIN players p ON i.player_id = p.id
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE i.actual_recovery_date IS NULL
        `;
        
        const params = [];
        if (teamId) {
            query += ' AND p.team_id = ?';
            params.push(teamId);
        }
        
        query += ' ORDER BY i.injury_date DESC';
        return await db.query(query, params);
    }

    static async create(injuryData) {
        const query = `
            INSERT INTO injuries (
                player_id, injury_type, injury_severity, injury_date,
                injury_location, description, treatment_plan, expected_recovery_date,
                medical_notes, doctor_name, physiotherapist_name, rehabilitation_exercises,
                follow_up_required, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            injuryData.player_id,
            injuryData.injury_type,
            injuryData.injury_severity,
            injuryData.injury_date,
            injuryData.injury_location,
            injuryData.description || null,
            injuryData.treatment_plan || null,
            injuryData.expected_recovery_date || null,
            injuryData.medical_notes || null,
            injuryData.doctor_name || null,
            injuryData.physiotherapist_name || null,
            injuryData.rehabilitation_exercises || null,
            injuryData.follow_up_required !== undefined ? injuryData.follow_up_required : 1,
            injuryData.created_by
        ]);
        
        return { id: result.lastID };
    }

    static async update(id, injuryData) {
        const query = `
            UPDATE injuries SET
                injury_type = ?, injury_severity = ?, injury_location = ?,
                description = ?, treatment_plan = ?, expected_recovery_date = ?,
                actual_recovery_date = ?, medical_notes = ?, doctor_name = ?,
                physiotherapist_name = ?, rehabilitation_exercises = ?,
                return_to_play_date = ?, follow_up_required = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(query, [
            injuryData.injury_type,
            injuryData.injury_severity,
            injuryData.injury_location,
            injuryData.description || null,
            injuryData.treatment_plan || null,
            injuryData.expected_recovery_date || null,
            injuryData.actual_recovery_date || null,
            injuryData.medical_notes || null,
            injuryData.doctor_name || null,
            injuryData.physiotherapist_name || null,
            injuryData.rehabilitation_exercises || null,
            injuryData.return_to_play_date || null,
            injuryData.follow_up_required !== undefined ? injuryData.follow_up_required : 1,
            id
        ]);
    }

    static async delete(id) {
        return await db.run('DELETE FROM injuries WHERE id = ?', [id]);
    }

    static async markRecovered(id, recoveryDate = null, returnToPlayDate = null) {
        const actualRecoveryDate = recoveryDate || new Date().toISOString().split('T')[0];
        const query = `
            UPDATE injuries SET
                actual_recovery_date = ?,
                return_to_play_date = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return await db.run(query, [actualRecoveryDate, returnToPlayDate, id]);
    }

    // Statistics methods
    static async getInjuryStats(teamId = null) {
        let query = `
            SELECT 
                COUNT(*) as total_injuries,
                COUNT(CASE WHEN injury_severity = 'minor' THEN 1 END) as minor_injuries,
                COUNT(CASE WHEN injury_severity = 'moderate' THEN 1 END) as moderate_injuries,
                COUNT(CASE WHEN injury_severity = 'severe' THEN 1 END) as severe_injuries,
                COUNT(CASE WHEN actual_recovery_date IS NULL THEN 1 END) as active_injuries,
                COUNT(CASE WHEN actual_recovery_date IS NOT NULL THEN 1 END) as recovered_injuries
            FROM injuries i
            JOIN players p ON i.player_id = p.id
        `;
        
        const params = [];
        if (teamId) {
            query += ' WHERE p.team_id = ?';
            params.push(teamId);
        }
        
        const results = await db.query(query, params);
        return results[0] || {};
    }

    static async getInjuryTypeStats(teamId = null) {
        let query = `
            SELECT 
                injury_type,
                injury_severity,
                COUNT(*) as count,
                AVG(CASE 
                    WHEN actual_recovery_date IS NOT NULL 
                    THEN julianday(actual_recovery_date) - julianday(injury_date)
                    ELSE NULL 
                END) as avg_recovery_days
            FROM injuries i
            JOIN players p ON i.player_id = p.id
        `;
        
        const params = [];
        if (teamId) {
            query += ' WHERE p.team_id = ?';
            params.push(teamId);
        }
        
        query += ' GROUP BY injury_type, injury_severity ORDER BY count DESC';
        return await db.query(query, params);
    }

    static async getMonthlyInjuryStats(year = null, teamId = null) {
        const currentYear = year || new Date().getFullYear();
        let query = `
            SELECT 
                strftime('%m', injury_date) as month,
                COUNT(*) as injury_count,
                COUNT(CASE WHEN injury_severity = 'severe' THEN 1 END) as severe_count
            FROM injuries i
            JOIN players p ON i.player_id = p.id
            WHERE strftime('%Y', injury_date) = ?
        `;
        
        const params = [currentYear.toString()];
        if (teamId) {
            query += ' AND p.team_id = ?';
            params.push(teamId);
        }
        
        query += ' GROUP BY strftime("%m", injury_date) ORDER BY month';
        return await db.query(query, params);
    }
}

module.exports = Injury;