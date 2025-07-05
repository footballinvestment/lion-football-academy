const db = require('../database/connection');

class Player {
    static async create(playerData) {
        const { 
            name, birth_date, position, dominant_foot, team_id,
            parent_name, parent_phone, parent_email, medical_notes, profile_image 
        } = playerData;
        
        const sql = `
            INSERT INTO players (
                name, birth_date, position, dominant_foot, team_id,
                parent_name, parent_phone, parent_email, medical_notes, profile_image
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await db.run(sql, [
            name, birth_date, position, dominant_foot, team_id,
            parent_name, parent_phone, parent_email, medical_notes, profile_image
        ]);
    }

    static async findAll() {
        const sql = `
            SELECT p.*, t.name as team_name 
            FROM players p 
            LEFT JOIN teams t ON p.team_id = t.id 
            ORDER BY p.name
        `;
        return await db.query(sql);
    }

    static async findById(id) {
        const sql = `
            SELECT p.*, t.name as team_name 
            FROM players p 
            LEFT JOIN teams t ON p.team_id = t.id 
            WHERE p.id = ?
        `;
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async findByTeam(teamId) {
        const sql = 'SELECT * FROM players WHERE team_id = ? ORDER BY name';
        return await db.query(sql, [teamId]);
    }

    static async findByUserId(userId) {
        const sql = `
            SELECT p.*, t.name as team_name 
            FROM players p 
            LEFT JOIN teams t ON p.team_id = t.id 
            WHERE p.user_id = ?
        `;
        const results = await db.query(sql, [userId]);
        return results[0] || null;
    }

    static async update(id, playerData) {
        const { 
            name, birth_date, position, dominant_foot, team_id,
            parent_name, parent_phone, parent_email, medical_notes, profile_image 
        } = playerData;
        
        const sql = `
            UPDATE players SET 
                name = ?, birth_date = ?, position = ?, dominant_foot = ?, team_id = ?,
                parent_name = ?, parent_phone = ?, parent_email = ?, medical_notes = ?, 
                profile_image = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(sql, [
            name, birth_date, position, dominant_foot, team_id,
            parent_name, parent_phone, parent_email, medical_notes, profile_image, id
        ]);
    }

    static async delete(id) {
        const sql = 'DELETE FROM players WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async getAge(playerId) {
        const sql = 'SELECT birth_date FROM players WHERE id = ?';
        const result = await db.query(sql, [playerId]);
        if (result[0]) {
            const birthDate = new Date(result[0].birth_date);
            const today = new Date();
            return today.getFullYear() - birthDate.getFullYear();
        }
        return null;
    }

    static async findByParent(parentId) {
        const sql = `
            SELECT p.*, t.name as team_name
            FROM players p 
            LEFT JOIN teams t ON p.team_id = t.id
            WHERE EXISTS (
                SELECT 1 FROM users u 
                WHERE u.id = ? AND u.player_id = p.id AND u.role = 'parent'
            )
            ORDER BY p.name
        `;
        return await db.query(sql, [parentId]);
    }

    // =====================================================================
    // STATISTICS AND PERFORMANCE METHODS
    // =====================================================================

    /**
     * Get comprehensive player statistics
     * @param {number} playerId - Player ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Player statistics summary
     */
    static async getPlayerStats(playerId, season = null) {
        try {
            let query = `
                SELECT 
                    COUNT(DISTINCT pmp.match_id) as matches_played,
                    SUM(pmp.minutes_played) as total_minutes,
                    SUM(pmp.goals) as total_goals,
                    SUM(pmp.assists) as total_assists,
                    SUM(pmp.yellow_cards) as total_yellow_cards,
                    SUM(pmp.red_cards) as total_red_cards,
                    AVG(pmp.performance_rating) as avg_rating,
                    COUNT(CASE WHEN pmp.starter = 1 THEN 1 END) as starts,
                    ROUND(AVG(pmp.minutes_played), 1) as avg_minutes_per_match,
                    ROUND(SUM(pmp.goals) * 1.0 / NULLIF(COUNT(DISTINCT pmp.match_id), 0), 2) as goals_per_match
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                WHERE pmp.player_id = ? AND m.match_status = 'finished'
            `;
            
            const params = [playerId];
            
            if (season) {
                query += ' AND m.season = ?';
                params.push(season);
            }
            
            const results = await db.query(query, params);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get player statistics: ${error.message}`);
        }
    }

    /**
     * Get player's recent match performances
     * @param {number} playerId - Player ID
     * @param {number} limit - Number of recent matches (default 5)
     * @returns {Promise<Array>} Recent match performances
     */
    static async getRecentPerformances(playerId, limit = 5) {
        try {
            const query = `
                SELECT 
                    pmp.*, m.match_date, m.season,
                    ht.name as home_team, at.name as away_team,
                    m.home_score, m.away_score,
                    CASE WHEN m.home_team_id = pmp.team_id THEN 'home' ELSE 'away' END as venue
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE pmp.player_id = ? AND m.match_status = 'finished'
                ORDER BY m.match_date DESC
                LIMIT ?
            `;
            
            return await db.query(query, [playerId, limit]);
        } catch (error) {
            throw new Error(`Failed to get recent performances: ${error.message}`);
        }
    }

    /**
     * Get player's season statistics summary
     * @param {number} playerId - Player ID
     * @returns {Promise<Array>} Season statistics by year
     */
    static async getSeasonStats(playerId) {
        try {
            const query = `
                SELECT * FROM season_statistics
                WHERE player_id = ?
                ORDER BY season DESC
            `;
            
            return await db.query(query, [playerId]);
        } catch (error) {
            throw new Error(`Failed to get season statistics: ${error.message}`);
        }
    }

    /**
     * Get player's injury history
     * @param {number} playerId - Player ID
     * @param {boolean} activeOnly - Get only active injuries
     * @returns {Promise<Array>} Injury history
     */
    static async getInjuryHistory(playerId, activeOnly = false) {
        try {
            let query = `
                SELECT i.*, u.full_name as created_by_name
                FROM injuries i
                LEFT JOIN users u ON i.created_by = u.id
                WHERE i.player_id = ?
            `;
            
            if (activeOnly) {
                query += ' AND i.actual_recovery_date IS NULL';
            }
            
            query += ' ORDER BY i.injury_date DESC';
            
            return await db.query(query, [playerId]);
        } catch (error) {
            throw new Error(`Failed to get injury history: ${error.message}`);
        }
    }

    /**
     * Get player's medical records
     * @param {number} playerId - Player ID
     * @param {string} recordType - Optional record type filter
     * @returns {Promise<Array>} Medical records
     */
    static async getMedicalRecords(playerId, recordType = null) {
        try {
            let query = `
                SELECT mr.*, u.full_name as created_by_name
                FROM medical_records mr
                LEFT JOIN users u ON mr.created_by = u.id
                WHERE mr.player_id = ?
            `;
            
            const params = [playerId];
            
            if (recordType) {
                query += ' AND mr.record_type = ?';
                params.push(recordType);
            }
            
            query += ' ORDER BY mr.record_date DESC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get medical records: ${error.message}`);
        }
    }

    /**
     * Get player's health status
     * @param {number} playerId - Player ID
     * @returns {Promise<Object>} Health status summary
     */
    static async getHealthStatus(playerId) {
        try {
            const query = `
                SELECT * FROM player_health_summary
                WHERE player_id = ?
            `;
            
            const results = await db.query(query, [playerId]);
            return results[0] || null;
        } catch (error) {
            throw new Error(`Failed to get health status: ${error.message}`);
        }
    }

    // =====================================================================
    // DEVELOPMENT TRACKING METHODS
    // =====================================================================

    /**
     * Get player's development plans
     * @param {number} playerId - Player ID
     * @param {Object} filters - Optional filters (season, status, plan_type)
     * @returns {Promise<Array>} Development plans
     */
    static async getDevelopmentPlans(playerId, filters = {}) {
        try {
            let query = `
                SELECT dp.*, u1.full_name as created_by_name, u2.full_name as reviewed_by_name
                FROM development_plans dp
                LEFT JOIN users u1 ON dp.created_by = u1.id
                LEFT JOIN users u2 ON dp.reviewed_by = u2.id
                WHERE dp.player_id = ?
            `;
            
            const params = [playerId];
            
            if (filters.season) {
                query += ' AND dp.season = ?';
                params.push(filters.season);
            }
            
            if (filters.status) {
                query += ' AND dp.status = ?';
                params.push(filters.status);
            }
            
            if (filters.plan_type) {
                query += ' AND dp.plan_type = ?';
                params.push(filters.plan_type);
            }
            
            query += ' ORDER BY dp.created_at DESC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get development plans: ${error.message}`);
        }
    }

    /**
     * Get player's latest skill assessments
     * @param {number} playerId - Player ID
     * @returns {Promise<Array>} Latest skill assessments
     */
    static async getLatestSkillAssessments(playerId) {
        try {
            const query = `
                SELECT DISTINCT
                    sa1.skill_category,
                    sa1.skill_name,
                    sa1.score,
                    sa1.assessment_date,
                    sa1.notes,
                    u.full_name as assessed_by_name
                FROM skills_assessments sa1
                LEFT JOIN users u ON sa1.assessed_by = u.id
                WHERE sa1.player_id = ?
                AND sa1.assessment_date = (
                    SELECT MAX(sa2.assessment_date)
                    FROM skills_assessments sa2
                    WHERE sa2.player_id = sa1.player_id
                    AND sa2.skill_name = sa1.skill_name
                )
                ORDER BY sa1.skill_category, sa1.skill_name
            `;
            
            return await db.query(query, [playerId]);
        } catch (error) {
            throw new Error(`Failed to get latest skill assessments: ${error.message}`);
        }
    }

    /**
     * Get comprehensive player profile
     * @param {number} playerId - Player ID
     * @returns {Promise<Object>} Complete player profile
     */
    static async getPlayerProfile(playerId) {
        try {
            // Get basic player info
            const player = await this.findById(playerId);
            if (!player) {
                throw new Error('Player not found');
            }

            // Get statistics
            const stats = await this.getPlayerStats(playerId);
            
            // Get recent performances
            const recentPerformances = await this.getRecentPerformances(playerId, 5);
            
            // Get health status
            const healthStatus = await this.getHealthStatus(playerId);
            
            // Get active development plans
            const developmentPlans = await this.getDevelopmentPlans(playerId, { status: 'active' });
            
            // Get latest skills
            const latestSkills = await this.getLatestSkillAssessments(playerId);
            
            // Get active injuries
            const activeInjuries = await this.getInjuryHistory(playerId, true);

            return {
                player_info: player,
                statistics: stats,
                recent_performances: recentPerformances,
                health_status: healthStatus,
                development_plans: developmentPlans,
                latest_skills: latestSkills,
                active_injuries: activeInjuries,
                age: await this.getAge(playerId)
            };
        } catch (error) {
            throw new Error(`Failed to get player profile: ${error.message}`);
        }
    }

    /**
     * Get attendance statistics for a player
     * @param {number} playerId - Player ID
     * @param {Object} filters - Optional filters (date_from, date_to, team_id)
     * @returns {Promise<Object>} Attendance statistics
     */
    static async getAttendanceStats(playerId, filters = {}) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_trainings,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                    COUNT(CASE WHEN a.status = 'excused' THEN 1 END) as excused_count,
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(*), 1) as attendance_percentage,
                    AVG(a.performance_rating) as avg_training_rating
                FROM attendance a
                JOIN trainings t ON a.training_id = t.id
                WHERE a.player_id = ?
            `;
            
            const params = [playerId];
            
            if (filters.date_from) {
                query += ' AND t.date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND t.date <= ?';
                params.push(filters.date_to);
            }
            
            if (filters.team_id) {
                query += ' AND t.team_id = ?';
                params.push(filters.team_id);
            }
            
            const results = await db.query(query, params);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get attendance statistics: ${error.message}`);
        }
    }

    /**
     * Compare player with team averages
     * @param {number} playerId - Player ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Player vs team comparison
     */
    static async compareWithTeam(playerId, season = null) {
        try {
            const player = await this.findById(playerId);
            if (!player || !player.team_id) {
                throw new Error('Player not found or not assigned to a team');
            }

            // Get player stats
            const playerStats = await this.getPlayerStats(playerId, season);
            
            // Get team averages
            let teamQuery = `
                SELECT 
                    AVG(pmp.goals) as avg_goals,
                    AVG(pmp.assists) as avg_assists,
                    AVG(pmp.performance_rating) as avg_rating,
                    AVG(pmp.minutes_played) as avg_minutes
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                WHERE pmp.team_id = ? AND m.match_status = 'finished'
            `;
            
            const teamParams = [player.team_id];
            
            if (season) {
                teamQuery += ' AND m.season = ?';
                teamParams.push(season);
            }
            
            const teamStats = await db.query(teamQuery, teamParams);
            
            return {
                player_stats: playerStats,
                team_averages: teamStats[0] || {},
                comparison: {
                    goals_vs_avg: playerStats.total_goals ? (playerStats.total_goals / playerStats.matches_played) / (teamStats[0]?.avg_goals || 1) : 0,
                    assists_vs_avg: playerStats.total_assists ? (playerStats.total_assists / playerStats.matches_played) / (teamStats[0]?.avg_assists || 1) : 0,
                    rating_vs_avg: playerStats.avg_rating ? playerStats.avg_rating / (teamStats[0]?.avg_rating || 1) : 0
                }
            };
        } catch (error) {
            throw new Error(`Failed to compare with team: ${error.message}`);
        }
    }
}

module.exports = Player;