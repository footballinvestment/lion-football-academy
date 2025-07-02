const db = require('../database/connection');

class Training {
    static async create(trainingData) {
        const { date, time, duration, location, type, team_id, training_plan } = trainingData;
        const sql = `
            INSERT INTO trainings (date, time, duration, location, type, team_id, training_plan)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        return await db.run(sql, [date, time, duration, location, type, team_id, training_plan]);
    }

    static async findAll() {
        const sql = `
            SELECT t.*, tm.name as team_name 
            FROM trainings t 
            LEFT JOIN teams tm ON t.team_id = tm.id 
            ORDER BY t.date DESC, t.time DESC
        `;
        return await db.query(sql);
    }

    static async findById(id) {
        const sql = `
            SELECT t.*, tm.name as team_name 
            FROM trainings t 
            LEFT JOIN teams tm ON t.team_id = tm.id 
            WHERE t.id = ?
        `;
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async findByTeam(teamId) {
        const sql = `
            SELECT * FROM trainings 
            WHERE team_id = ? 
            ORDER BY date DESC, time DESC
        `;
        return await db.query(sql, [teamId]);
    }

    static async findByDateRange(startDate, endDate, teamId = null) {
        let sql = `
            SELECT t.*, tm.name as team_name 
            FROM trainings t 
            LEFT JOIN teams tm ON t.team_id = tm.id 
            WHERE t.date BETWEEN ? AND ?
        `;
        let params = [startDate, endDate];
        
        if (teamId) {
            sql += ' AND t.team_id = ?';
            params.push(teamId);
        }
        
        sql += ' ORDER BY t.date, t.time';
        return await db.query(sql, params);
    }

    static async update(id, trainingData) {
        const { date, time, duration, location, type, team_id, training_plan } = trainingData;
        const sql = `
            UPDATE trainings 
            SET date = ?, time = ?, duration = ?, location = ?, type = ?, team_id = ?, training_plan = ?
            WHERE id = ?
        `;
        return await db.run(sql, [date, time, duration, location, type, team_id, training_plan, id]);
    }

    static async delete(id) {
        const sql = 'DELETE FROM trainings WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async getUpcoming(teamId = null, limit = 10) {
        let sql = `
            SELECT t.*, tm.name as team_name 
            FROM trainings t 
            LEFT JOIN teams tm ON t.team_id = tm.id 
            WHERE t.date >= date('now')
        `;
        let params = [];
        
        if (teamId) {
            sql += ' AND t.team_id = ?';
            params.push(teamId);
        }
        
        sql += ' ORDER BY t.date, t.time LIMIT ?';
        params.push(limit);
        
        return await db.query(sql, params);
    }

    // =====================================================================
    // MATCH PREPARATION CONNECTIONS
    // =====================================================================

    /**
     * Get trainings related to match preparation
     * @param {number} matchId - Match ID
     * @param {number} daysBefore - Days before match to look for trainings
     * @returns {Promise<Array>} Training sessions for match preparation
     */
    static async getMatchPreparationTrainings(matchId, daysBefore = 7) {
        try {
            const query = `
                SELECT t.*, tm.name as team_name, m.match_date, m.venue,
                       ht.name as home_team, at.name as away_team
                FROM trainings t
                JOIN teams tm ON t.team_id = tm.id
                JOIN matches m ON (m.home_team_id = tm.id OR m.away_team_id = tm.id)
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE m.id = ?
                AND t.date BETWEEN DATE(m.match_date, '-${daysBefore} days') AND DATE(m.match_date, '-1 day')
                ORDER BY t.date DESC, t.time DESC
            `;
            
            return await db.query(query, [matchId]);
        } catch (error) {
            throw new Error(`Failed to get match preparation trainings: ${error.message}`);
        }
    }

    /**
     * Get training attendance statistics
     * @param {number} trainingId - Training ID
     * @returns {Promise<Object>} Attendance statistics
     */
    static async getAttendanceStats(trainingId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total_players,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                    COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 1) as attendance_percentage,
                    AVG(a.performance_rating) as avg_performance_rating
                FROM attendance a
                WHERE a.training_id = ?
            `;
            
            const results = await db.query(query, [trainingId]);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get attendance statistics: ${error.message}`);
        }
    }

    /**
     * Get training effectiveness metrics
     * @param {number} teamId - Team ID
     * @param {Object} filters - Optional filters (date_from, date_to, training_type)
     * @returns {Promise<Object>} Training effectiveness metrics
     */
    static async getTrainingEffectiveness(teamId, filters = {}) {
        try {
            let query = `
                SELECT 
                    t.type as training_type,
                    COUNT(t.id) as total_sessions,
                    AVG(CASE WHEN a.status = 'present' THEN 1.0 ELSE 0.0 END) as avg_attendance_rate,
                    AVG(a.performance_rating) as avg_performance_rating,
                    COUNT(DISTINCT a.player_id) as unique_players
                FROM trainings t
                LEFT JOIN attendance a ON t.id = a.training_id
                WHERE t.team_id = ?
            `;
            
            const params = [teamId];
            
            if (filters.date_from) {
                query += ' AND t.date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND t.date <= ?';
                params.push(filters.date_to);
            }
            
            if (filters.training_type) {
                query += ' AND t.type = ?';
                params.push(filters.training_type);
            }
            
            query += ' GROUP BY t.type ORDER BY avg_performance_rating DESC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get training effectiveness: ${error.message}`);
        }
    }

    /**
     * Get next match preparation status
     * @param {number} teamId - Team ID
     * @returns {Promise<Object>} Next match preparation status
     */
    static async getNextMatchPreparation(teamId) {
        try {
            // Get next upcoming match
            const nextMatchQuery = `
                SELECT m.*, ht.name as home_team, at.name as away_team,
                       CASE WHEN m.home_team_id = ? THEN 'home' ELSE 'away' END as venue_type
                FROM matches m
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE (m.home_team_id = ? OR m.away_team_id = ?)
                AND m.match_status = 'scheduled'
                AND m.match_date >= DATE('now')
                ORDER BY m.match_date ASC, m.match_time ASC
                LIMIT 1
            `;
            
            const nextMatch = await db.query(nextMatchQuery, [teamId, teamId, teamId]);
            
            if (nextMatch.length === 0) {
                return { next_match: null, preparation_trainings: [], preparation_status: 'no_upcoming_matches' };
            }
            
            const match = nextMatch[0];
            
            // Get preparation trainings
            const preparationTrainings = await this.getMatchPreparationTrainings(match.id, 7);
            
            // Calculate preparation status
            const daysUntilMatch = Math.ceil((new Date(match.match_date) - new Date()) / (1000 * 60 * 60 * 24));
            const preparationSessions = preparationTrainings.length;
            
            let preparationStatus = 'well_prepared';
            if (daysUntilMatch <= 2 && preparationSessions < 2) {
                preparationStatus = 'under_prepared';
            } else if (daysUntilMatch <= 5 && preparationSessions < 3) {
                preparationStatus = 'needs_more_preparation';
            }
            
            return {
                next_match: match,
                preparation_trainings: preparationTrainings,
                preparation_status: preparationStatus,
                days_until_match: daysUntilMatch,
                preparation_sessions: preparationSessions
            };
        } catch (error) {
            throw new Error(`Failed to get next match preparation: ${error.message}`);
        }
    }

    /**
     * Get training intensity analysis
     * @param {number} teamId - Team ID
     * @param {number} weeks - Number of weeks to analyze (default 4)
     * @returns {Promise<Object>} Training intensity analysis
     */
    static async getTrainingIntensity(teamId, weeks = 4) {
        try {
            const query = `
                SELECT 
                    DATE(t.date, 'weekday 0', '-6 days') as week_start,
                    COUNT(t.id) as sessions_per_week,
                    SUM(t.duration) as total_duration_minutes,
                    AVG(t.duration) as avg_session_duration,
                    AVG(a.performance_rating) as avg_weekly_performance
                FROM trainings t
                LEFT JOIN attendance a ON t.id = a.training_id AND a.status = 'present'
                WHERE t.team_id = ?
                AND t.date >= DATE('now', '-${weeks} weeks')
                GROUP BY week_start
                ORDER BY week_start DESC
            `;
            
            const weeklyData = await db.query(query, [teamId]);
            
            // Calculate trends
            const analysis = {
                weekly_breakdown: weeklyData,
                trends: {
                    avg_sessions_per_week: weeklyData.length > 0 ? weeklyData.reduce((sum, w) => sum + w.sessions_per_week, 0) / weeklyData.length : 0,
                    avg_duration_per_week: weeklyData.length > 0 ? weeklyData.reduce((sum, w) => sum + w.total_duration_minutes, 0) / weeklyData.length : 0,
                    avg_performance_trend: weeklyData.length > 1 ? weeklyData[0].avg_weekly_performance - weeklyData[weeklyData.length - 1].avg_weekly_performance : 0
                }
            };
            
            return analysis;
        } catch (error) {
            throw new Error(`Failed to get training intensity: ${error.message}`);
        }
    }

    /**
     * Connect training with development plans
     * @param {number} trainingId - Training ID
     * @param {number} developmentPlanId - Development plan ID
     * @param {string} notes - Optional notes about the connection
     * @returns {Promise<Object>} Connection result
     */
    static async connectToDevelopment(trainingId, developmentPlanId, notes = null) {
        try {
            // This would require a new junction table in the schema
            // For now, we'll update the training_plan field with development context
            const query = `
                UPDATE trainings 
                SET training_plan = CASE 
                    WHEN training_plan IS NULL OR training_plan = '' 
                    THEN 'Development Plan #' || ? || COALESCE(': ' || ?, '')
                    ELSE training_plan || '; Development Plan #' || ? || COALESCE(': ' || ?, '')
                END
                WHERE id = ?
            `;
            
            return await db.run(query, [developmentPlanId, notes, developmentPlanId, notes, trainingId]);
        } catch (error) {
            throw new Error(`Failed to connect training to development plan: ${error.message}`);
        }
    }
}

module.exports = Training;