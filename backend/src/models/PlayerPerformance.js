const db = require('../database/connection');

/**
 * Player Performance Model
 * Handles player match performance data and statistics
 */
class PlayerPerformance {
    /**
     * Create a new player performance record
     * @param {Object} performanceData - Performance data object
     * @returns {Promise<Object>} Created record with ID
     */
    static async create(performanceData) {
        try {
            // Validate required fields
            if (!performanceData.match_id || !performanceData.player_id || !performanceData.team_id) {
                throw new Error('Missing required fields: match_id, player_id, team_id');
            }

            const query = `
                INSERT INTO player_match_performance (
                    match_id, player_id, team_id, position, minutes_played, starter,
                    substituted_in_minute, substituted_out_minute, goals, assists,
                    yellow_cards, red_cards, shots_total, shots_on_target,
                    passes_completed, passes_attempted, tackles_won, tackles_attempted,
                    distance_covered_km, top_speed_kmh, performance_rating, coach_notes,
                    player_self_rating
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await db.run(query, [
                performanceData.match_id,
                performanceData.player_id,
                performanceData.team_id,
                performanceData.position || null,
                performanceData.minutes_played || 0,
                performanceData.starter || 0,
                performanceData.substituted_in_minute || null,
                performanceData.substituted_out_minute || null,
                performanceData.goals || 0,
                performanceData.assists || 0,
                performanceData.yellow_cards || 0,
                performanceData.red_cards || 0,
                performanceData.shots_total || 0,
                performanceData.shots_on_target || 0,
                performanceData.passes_completed || 0,
                performanceData.passes_attempted || 0,
                performanceData.tackles_won || 0,
                performanceData.tackles_attempted || 0,
                performanceData.distance_covered_km || null,
                performanceData.top_speed_kmh || null,
                performanceData.performance_rating || null,
                performanceData.coach_notes || null,
                performanceData.player_self_rating || null
            ]);
            
            return { id: result.lastID };
        } catch (error) {
            throw new Error(`Failed to create player performance: ${error.message}`);
        }
    }

    /**
     * Update existing player performance record
     * @param {number} id - Performance record ID
     * @param {Object} performanceData - Updated performance data
     * @returns {Promise<Object>} Update result
     */
    static async update(id, performanceData) {
        try {
            const query = `
                UPDATE player_match_performance SET
                    position = ?, minutes_played = ?, starter = ?,
                    substituted_in_minute = ?, substituted_out_minute = ?,
                    goals = ?, assists = ?, yellow_cards = ?, red_cards = ?,
                    shots_total = ?, shots_on_target = ?, passes_completed = ?,
                    passes_attempted = ?, tackles_won = ?, tackles_attempted = ?,
                    distance_covered_km = ?, top_speed_kmh = ?, performance_rating = ?,
                    coach_notes = ?, player_self_rating = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            return await db.run(query, [
                performanceData.position || null,
                performanceData.minutes_played || 0,
                performanceData.starter || 0,
                performanceData.substituted_in_minute || null,
                performanceData.substituted_out_minute || null,
                performanceData.goals || 0,
                performanceData.assists || 0,
                performanceData.yellow_cards || 0,
                performanceData.red_cards || 0,
                performanceData.shots_total || 0,
                performanceData.shots_on_target || 0,
                performanceData.passes_completed || 0,
                performanceData.passes_attempted || 0,
                performanceData.tackles_won || 0,
                performanceData.tackles_attempted || 0,
                performanceData.distance_covered_km || null,
                performanceData.top_speed_kmh || null,
                performanceData.performance_rating || null,
                performanceData.coach_notes || null,
                performanceData.player_self_rating || null,
                id
            ]);
        } catch (error) {
            throw new Error(`Failed to update player performance: ${error.message}`);
        }
    }

    /**
     * Find performance record by ID
     * @param {number} id - Performance record ID
     * @returns {Promise<Object|null>} Performance record or null
     */
    static async findById(id) {
        try {
            const query = `
                SELECT pmp.*, p.name as player_name, t.name as team_name,
                       m.match_date, m.match_type, m.season,
                       ht.name as home_team, at.name as away_team,
                       m.home_score, m.away_score
                FROM player_match_performance pmp
                JOIN players p ON pmp.player_id = p.id
                JOIN teams t ON pmp.team_id = t.id
                JOIN matches m ON pmp.match_id = m.id
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE pmp.id = ?
            `;
            const results = await db.query(query, [id]);
            return results[0] || null;
        } catch (error) {
            throw new Error(`Failed to find performance record: ${error.message}`);
        }
    }

    /**
     * Get performance records for a specific match
     * @param {number} matchId - Match ID
     * @param {number} playerId - Optional player ID filter
     * @returns {Promise<Array>} Performance records
     */
    static async findByMatch(matchId, playerId = null) {
        try {
            let query = `
                SELECT pmp.*, p.name as player_name, t.name as team_name
                FROM player_match_performance pmp
                JOIN players p ON pmp.player_id = p.id
                JOIN teams t ON pmp.team_id = t.id
                WHERE pmp.match_id = ?
            `;
            
            const params = [matchId];
            
            if (playerId) {
                query += ' AND pmp.player_id = ?';
                params.push(playerId);
                const results = await db.query(query, params);
                return results[0] || null;
            }
            
            query += ' ORDER BY pmp.starter DESC, pmp.minutes_played DESC';
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to find match performances: ${error.message}`);
        }
    }

    /**
     * Get performance records for a specific player
     * @param {number} playerId - Player ID
     * @param {Object} filters - Optional filters (season, limit, etc.)
     * @returns {Promise<Array>} Performance records
     */
    static async findByPlayer(playerId, filters = {}) {
        try {
            let query = `
                SELECT pmp.*, m.match_date, m.match_type, m.season,
                       ht.name as home_team, at.name as away_team,
                       m.home_score, m.away_score,
                       CASE WHEN m.home_team_id = pmp.team_id THEN 'home' ELSE 'away' END as venue
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE pmp.player_id = ?
            `;
            
            const params = [playerId];
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.match_type) {
                query += ' AND m.match_type = ?';
                params.push(filters.match_type);
            }
            
            if (filters.date_from) {
                query += ' AND m.match_date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND m.match_date <= ?';
                params.push(filters.date_to);
            }
            
            query += ' ORDER BY m.match_date DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to find player performances: ${error.message}`);
        }
    }

    /**
     * Delete performance record
     * @param {number} id - Performance record ID
     * @returns {Promise<Object>} Delete result
     */
    static async delete(id) {
        try {
            return await db.run('DELETE FROM player_match_performance WHERE id = ?', [id]);
        } catch (error) {
            throw new Error(`Failed to delete performance record: ${error.message}`);
        }
    }

    /**
     * Create multiple performance records in bulk
     * @param {Array} performanceRecords - Array of performance data objects
     * @returns {Promise<Array>} Array of created record IDs
     */
    static async createBulk(performanceRecords) {
        try {
            const results = [];
            for (const record of performanceRecords) {
                const result = await this.create(record);
                results.push(result);
            }
            return results;
        } catch (error) {
            throw new Error(`Failed to create bulk performance records: ${error.message}`);
        }
    }

    /**
     * Get player statistics summary
     * @param {number} playerId - Player ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Statistics summary
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
                    SUM(pmp.shots_total) as total_shots,
                    SUM(pmp.shots_on_target) as total_shots_on_target,
                    AVG(pmp.performance_rating) as avg_rating,
                    AVG(pmp.player_self_rating) as avg_self_rating,
                    SUM(pmp.distance_covered_km) as total_distance,
                    MAX(pmp.top_speed_kmh) as max_speed,
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
     * Get team performance statistics for a match
     * @param {number} matchId - Match ID
     * @param {number} teamId - Team ID
     * @returns {Promise<Object>} Team performance summary
     */
    static async getTeamMatchPerformance(matchId, teamId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as players_used,
                    SUM(goals) as team_goals,
                    SUM(assists) as team_assists,
                    SUM(yellow_cards) as team_yellow_cards,
                    SUM(red_cards) as team_red_cards,
                    SUM(shots_total) as team_shots,
                    SUM(shots_on_target) as team_shots_on_target,
                    AVG(performance_rating) as avg_team_rating,
                    SUM(distance_covered_km) as total_team_distance,
                    COUNT(CASE WHEN starter = 1 THEN 1 END) as starters,
                    COUNT(CASE WHEN substituted_in_minute IS NOT NULL THEN 1 END) as substitutions_in
                FROM player_match_performance
                WHERE match_id = ? AND team_id = ?
            `;
            
            const results = await db.query(query, [matchId, teamId]);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get team match performance: ${error.message}`);
        }
    }

    /**
     * Get top performers for specific criteria
     * @param {Object} criteria - Performance criteria (goals, assists, rating, etc.)
     * @param {Object} filters - Optional filters (season, team_id, limit)
     * @returns {Promise<Array>} Top performers list
     */
    static async getTopPerformers(criteria = 'goals', filters = {}) {
        try {
            const validCriteria = ['goals', 'assists', 'performance_rating', 'minutes_played', 'shots_total'];
            if (!validCriteria.includes(criteria)) {
                throw new Error(`Invalid criteria: ${criteria}`);
            }

            let query = `
                SELECT 
                    p.id, p.name as player_name, t.name as team_name,
                    SUM(pmp.goals) as total_goals,
                    SUM(pmp.assists) as total_assists,
                    COUNT(DISTINCT pmp.match_id) as matches_played,
                    AVG(pmp.performance_rating) as avg_rating,
                    SUM(pmp.minutes_played) as total_minutes
                FROM player_match_performance pmp
                JOIN players p ON pmp.player_id = p.id
                JOIN teams t ON pmp.team_id = t.id
                JOIN matches m ON pmp.match_id = m.id
                WHERE m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.team_id) {
                query += ' AND pmp.team_id = ?';
                params.push(filters.team_id);
            }
            
            query += ' GROUP BY p.id, p.name, t.name';
            query += ` ORDER BY ${criteria === 'performance_rating' ? 'avg_rating' : `total_${criteria}`} DESC`;
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            } else {
                query += ' LIMIT 20';
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get top performers: ${error.message}`);
        }
    }

    /**
     * Get player form over recent matches
     * @param {number} playerId - Player ID
     * @param {number} lastMatches - Number of recent matches to analyze
     * @returns {Promise<Object>} Form analysis
     */
    static async getPlayerForm(playerId, lastMatches = 5) {
        try {
            const query = `
                SELECT 
                    pmp.*,
                    m.match_date,
                    m.season,
                    ht.name as home_team,
                    at.name as away_team,
                    m.home_score,
                    m.away_score,
                    CASE WHEN m.home_team_id = pmp.team_id THEN 'home' ELSE 'away' END as venue
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE pmp.player_id = ? AND m.match_status = 'finished'
                ORDER BY m.match_date DESC
                LIMIT ?
            `;
            
            const performances = await db.query(query, [playerId, lastMatches]);
            
            // Calculate form statistics
            const formStats = {
                matches: performances.length,
                avg_rating: 0,
                goals: 0,
                assists: 0,
                minutes_played: 0,
                form_trend: 'stable'
            };
            
            if (performances.length > 0) {
                formStats.avg_rating = performances.reduce((sum, p) => sum + (p.performance_rating || 0), 0) / performances.length;
                formStats.goals = performances.reduce((sum, p) => sum + p.goals, 0);
                formStats.assists = performances.reduce((sum, p) => sum + p.assists, 0);
                formStats.minutes_played = performances.reduce((sum, p) => sum + p.minutes_played, 0);
                
                // Simple trend analysis based on ratings
                if (performances.length >= 3) {
                    const recentAvg = performances.slice(0, 2).reduce((sum, p) => sum + (p.performance_rating || 0), 0) / 2;
                    const olderAvg = performances.slice(-2).reduce((sum, p) => sum + (p.performance_rating || 0), 0) / 2;
                    
                    if (recentAvg > olderAvg + 0.5) formStats.form_trend = 'improving';
                    else if (recentAvg < olderAvg - 0.5) formStats.form_trend = 'declining';
                }
            }
            
            return {
                form_stats: formStats,
                recent_performances: performances
            };
        } catch (error) {
            throw new Error(`Failed to get player form: ${error.message}`);
        }
    }

    /**
     * Get performance comparison between players
     * @param {Array} playerIds - Array of player IDs to compare
     * @param {string} season - Optional season filter
     * @returns {Promise<Array>} Comparison data
     */
    static async comparePlayerPerformance(playerIds, season = null) {
        try {
            if (!Array.isArray(playerIds) || playerIds.length === 0) {
                throw new Error('Player IDs must be a non-empty array');
            }

            const placeholders = playerIds.map(() => '?').join(',');
            let query = `
                SELECT 
                    p.id, p.name as player_name, p.position,
                    COUNT(DISTINCT pmp.match_id) as matches_played,
                    SUM(pmp.goals) as total_goals,
                    SUM(pmp.assists) as total_assists,
                    AVG(pmp.performance_rating) as avg_rating,
                    SUM(pmp.minutes_played) as total_minutes,
                    ROUND(SUM(pmp.goals) * 1.0 / NULLIF(COUNT(DISTINCT pmp.match_id), 0), 2) as goals_per_match,
                    ROUND(SUM(pmp.assists) * 1.0 / NULLIF(COUNT(DISTINCT pmp.match_id), 0), 2) as assists_per_match
                FROM players p
                LEFT JOIN player_match_performance pmp ON p.id = pmp.player_id
                LEFT JOIN matches m ON pmp.match_id = m.id AND m.match_status = 'finished'
                WHERE p.id IN (${placeholders})
            `;
            
            const params = [...playerIds];
            
            if (season) {
                query += ' AND m.season = ?';
                params.push(season);
            }
            
            query += ' GROUP BY p.id, p.name, p.position ORDER BY avg_rating DESC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to compare player performance: ${error.message}`);
        }
    }
}

module.exports = PlayerPerformance;