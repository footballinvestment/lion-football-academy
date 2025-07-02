const db = require('../database/connection');

/**
 * Match Event Model
 * Handles match events like goals, cards, substitutions, etc.
 */
class MatchEvent {
    /**
     * Create a new match event
     * @param {Object} eventData - Event data object
     * @returns {Promise<Object>} Created event with ID
     */
    static async create(eventData) {
        try {
            // Validate required fields
            if (!eventData.match_id || !eventData.team_id || !eventData.event_type || eventData.event_minute === undefined) {
                throw new Error('Missing required fields: match_id, team_id, event_type, event_minute');
            }

            // Validate event type
            const validEventTypes = ['goal', 'assist', 'yellow_card', 'red_card', 'substitution_in', 'substitution_out', 'injury', 'penalty', 'own_goal'];
            if (!validEventTypes.includes(eventData.event_type)) {
                throw new Error(`Invalid event type: ${eventData.event_type}`);
            }

            const query = `
                INSERT INTO match_events (
                    match_id, player_id, team_id, event_type, event_minute,
                    event_description, assisted_by_player_id, substituted_player_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await db.run(query, [
                eventData.match_id,
                eventData.player_id || null,
                eventData.team_id,
                eventData.event_type,
                eventData.event_minute,
                eventData.event_description || null,
                eventData.assisted_by_player_id || null,
                eventData.substituted_player_id || null
            ]);
            
            return { id: result.lastID };
        } catch (error) {
            throw new Error(`Failed to create match event: ${error.message}`);
        }
    }

    /**
     * Update existing match event
     * @param {number} id - Event ID
     * @param {Object} eventData - Updated event data
     * @returns {Promise<Object>} Update result
     */
    static async update(id, eventData) {
        try {
            const query = `
                UPDATE match_events SET
                    player_id = ?, event_type = ?, event_minute = ?,
                    event_description = ?, assisted_by_player_id = ?, substituted_player_id = ?
                WHERE id = ?
            `;
            
            return await db.run(query, [
                eventData.player_id || null,
                eventData.event_type,
                eventData.event_minute,
                eventData.event_description || null,
                eventData.assisted_by_player_id || null,
                eventData.substituted_player_id || null,
                id
            ]);
        } catch (error) {
            throw new Error(`Failed to update match event: ${error.message}`);
        }
    }

    /**
     * Find event by ID
     * @param {number} id - Event ID
     * @returns {Promise<Object|null>} Event record or null
     */
    static async findById(id) {
        try {
            const query = `
                SELECT me.*, 
                       p.name as player_name, 
                       t.name as team_name,
                       ap.name as assisted_by_name,
                       sp.name as substituted_player_name,
                       m.match_date, m.season
                FROM match_events me
                LEFT JOIN players p ON me.player_id = p.id
                JOIN teams t ON me.team_id = t.id
                LEFT JOIN players ap ON me.assisted_by_player_id = ap.id
                LEFT JOIN players sp ON me.substituted_player_id = sp.id
                JOIN matches m ON me.match_id = m.id
                WHERE me.id = ?
            `;
            const results = await db.query(query, [id]);
            return results[0] || null;
        } catch (error) {
            throw new Error(`Failed to find match event: ${error.message}`);
        }
    }

    /**
     * Get all events for a specific match
     * @param {number} matchId - Match ID
     * @param {Object} filters - Optional filters (event_type, team_id)
     * @returns {Promise<Array>} Array of match events
     */
    static async findByMatch(matchId, filters = {}) {
        try {
            let query = `
                SELECT me.*, 
                       p.name as player_name, 
                       t.name as team_name,
                       ap.name as assisted_by_name,
                       sp.name as substituted_player_name
                FROM match_events me
                LEFT JOIN players p ON me.player_id = p.id
                JOIN teams t ON me.team_id = t.id
                LEFT JOIN players ap ON me.assisted_by_player_id = ap.id
                LEFT JOIN players sp ON me.substituted_player_id = sp.id
                WHERE me.match_id = ?
            `;
            
            const params = [matchId];
            
            if (filters.event_type) {
                query += ' AND me.event_type = ?';
                params.push(filters.event_type);
            }
            
            if (filters.team_id) {
                query += ' AND me.team_id = ?';
                params.push(filters.team_id);
            }
            
            query += ' ORDER BY me.event_minute ASC, me.created_at ASC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to find match events: ${error.message}`);
        }
    }

    /**
     * Get events for a specific player
     * @param {number} playerId - Player ID
     * @param {Object} filters - Optional filters (season, event_type, limit)
     * @returns {Promise<Array>} Array of player events
     */
    static async findByPlayer(playerId, filters = {}) {
        try {
            let query = `
                SELECT me.*, 
                       t.name as team_name,
                       m.match_date, m.season,
                       ht.name as home_team, at.name as away_team,
                       ap.name as assisted_by_name
                FROM match_events me
                JOIN teams t ON me.team_id = t.id
                JOIN matches m ON me.match_id = m.id
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                LEFT JOIN players ap ON me.assisted_by_player_id = ap.id
                WHERE me.player_id = ?
            `;
            
            const params = [playerId];
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.event_type) {
                query += ' AND me.event_type = ?';
                params.push(filters.event_type);
            }
            
            if (filters.date_from) {
                query += ' AND m.match_date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                query += ' AND m.match_date <= ?';
                params.push(filters.date_to);
            }
            
            query += ' ORDER BY m.match_date DESC, me.event_minute ASC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to find player events: ${error.message}`);
        }
    }

    /**
     * Delete match event
     * @param {number} id - Event ID
     * @returns {Promise<Object>} Delete result
     */
    static async delete(id) {
        try {
            return await db.run('DELETE FROM match_events WHERE id = ?', [id]);
        } catch (error) {
            throw new Error(`Failed to delete match event: ${error.message}`);
        }
    }

    /**
     * Create multiple events in bulk
     * @param {Array} events - Array of event data objects
     * @returns {Promise<Array>} Array of created event IDs
     */
    static async createBulk(events) {
        try {
            const results = [];
            for (const event of events) {
                const result = await this.create(event);
                results.push(result);
            }
            return results;
        } catch (error) {
            throw new Error(`Failed to create bulk events: ${error.message}`);
        }
    }

    /**
     * Get match timeline (all events chronologically)
     * @param {number} matchId - Match ID
     * @returns {Promise<Array>} Chronological event timeline
     */
    static async getMatchTimeline(matchId) {
        try {
            const query = `
                SELECT me.*, 
                       p.name as player_name, 
                       t.name as team_name,
                       ap.name as assisted_by_name,
                       sp.name as substituted_player_name
                FROM match_events me
                LEFT JOIN players p ON me.player_id = p.id
                JOIN teams t ON me.team_id = t.id
                LEFT JOIN players ap ON me.assisted_by_player_id = ap.id
                LEFT JOIN players sp ON me.substituted_player_id = sp.id
                WHERE me.match_id = ?
                ORDER BY me.event_minute ASC, 
                         CASE me.event_type 
                            WHEN 'goal' THEN 1 
                            WHEN 'assist' THEN 2 
                            WHEN 'yellow_card' THEN 3 
                            WHEN 'red_card' THEN 4 
                            WHEN 'substitution_out' THEN 5 
                            WHEN 'substitution_in' THEN 6 
                            ELSE 7 
                         END
            `;
            
            return await db.query(query, [matchId]);
        } catch (error) {
            throw new Error(`Failed to get match timeline: ${error.message}`);
        }
    }

    /**
     * Get goal scorers for a match or season
     * @param {Object} filters - Filters (match_id, season, team_id, limit)
     * @returns {Promise<Array>} Goal scorers list
     */
    static async getGoalScorers(filters = {}) {
        try {
            let query = `
                SELECT 
                    p.id, p.name as player_name, p.position,
                    t.name as team_name,
                    COUNT(me.id) as goals_scored,
                    COUNT(CASE WHEN me.event_type = 'penalty' THEN 1 END) as penalty_goals
                FROM match_events me
                JOIN players p ON me.player_id = p.id
                JOIN teams t ON me.team_id = t.id
                JOIN matches m ON me.match_id = m.id
                WHERE me.event_type = 'goal' AND m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.match_id) {
                query += ' AND me.match_id = ?';
                params.push(filters.match_id);
            }
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.team_id) {
                query += ' AND me.team_id = ?';
                params.push(filters.team_id);
            }
            
            query += ' GROUP BY p.id, p.name, p.position, t.name ORDER BY goals_scored DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get goal scorers: ${error.message}`);
        }
    }

    /**
     * Get assist providers for a match or season
     * @param {Object} filters - Filters (match_id, season, team_id, limit)
     * @returns {Promise<Array>} Assist providers list
     */
    static async getAssistProviders(filters = {}) {
        try {
            let query = `
                SELECT 
                    p.id, p.name as player_name, p.position,
                    t.name as team_name,
                    COUNT(me.id) as assists_provided
                FROM match_events me
                JOIN players p ON me.assisted_by_player_id = p.id
                JOIN teams t ON me.team_id = t.id
                JOIN matches m ON me.match_id = m.id
                WHERE me.event_type = 'goal' AND me.assisted_by_player_id IS NOT NULL 
                      AND m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.match_id) {
                query += ' AND me.match_id = ?';
                params.push(filters.match_id);
            }
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.team_id) {
                query += ' AND me.team_id = ?';
                params.push(filters.team_id);
            }
            
            query += ' GROUP BY p.id, p.name, p.position, t.name ORDER BY assists_provided DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get assist providers: ${error.message}`);
        }
    }

    /**
     * Get disciplinary records (cards)
     * @param {Object} filters - Filters (player_id, team_id, season, card_type)
     * @returns {Promise<Array>} Disciplinary records
     */
    static async getDisciplinaryRecords(filters = {}) {
        try {
            let query = `
                SELECT 
                    p.id, p.name as player_name, p.position,
                    t.name as team_name,
                    me.event_type as card_type,
                    COUNT(me.id) as card_count,
                    m.match_date, m.season,
                    ht.name as home_team, at.name as away_team
                FROM match_events me
                JOIN players p ON me.player_id = p.id
                JOIN teams t ON me.team_id = t.id
                JOIN matches m ON me.match_id = m.id
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE me.event_type IN ('yellow_card', 'red_card') AND m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.player_id) {
                query += ' AND me.player_id = ?';
                params.push(filters.player_id);
            }
            
            if (filters.team_id) {
                query += ' AND me.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.card_type) {
                query += ' AND me.event_type = ?';
                params.push(filters.card_type);
            }
            
            if (filters.summary) {
                query += ' GROUP BY p.id, p.name, p.position, t.name, me.event_type ORDER BY card_count DESC';
            } else {
                query += ' ORDER BY m.match_date DESC, me.event_minute ASC';
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get disciplinary records: ${error.message}`);
        }
    }

    /**
     * Get substitution patterns
     * @param {Object} filters - Filters (match_id, team_id, season, player_id)
     * @returns {Promise<Array>} Substitution data
     */
    static async getSubstitutions(filters = {}) {
        try {
            let query = `
                SELECT 
                    sub_in.match_id,
                    sub_in.event_minute,
                    p_in.name as player_in_name,
                    p_out.name as player_out_name,
                    t.name as team_name,
                    m.match_date, m.season
                FROM match_events sub_in
                JOIN match_events sub_out ON sub_in.match_id = sub_out.match_id 
                    AND sub_in.event_minute = sub_out.event_minute 
                    AND sub_in.team_id = sub_out.team_id
                JOIN players p_in ON sub_in.player_id = p_in.id
                JOIN players p_out ON sub_out.player_id = p_out.id
                JOIN teams t ON sub_in.team_id = t.id
                JOIN matches m ON sub_in.match_id = m.id
                WHERE sub_in.event_type = 'substitution_in' 
                      AND sub_out.event_type = 'substitution_out'
                      AND m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.match_id) {
                query += ' AND sub_in.match_id = ?';
                params.push(filters.match_id);
            }
            
            if (filters.team_id) {
                query += ' AND sub_in.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.player_id) {
                query += ' AND (sub_in.player_id = ? OR sub_out.player_id = ?)';
                params.push(filters.player_id, filters.player_id);
            }
            
            query += ' ORDER BY m.match_date DESC, sub_in.event_minute ASC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get substitutions: ${error.message}`);
        }
    }

    /**
     * Get event statistics summary
     * @param {Object} filters - Filters (match_id, team_id, season)
     * @returns {Promise<Object>} Event statistics
     */
    static async getEventStats(filters = {}) {
        try {
            let query = `
                SELECT 
                    COUNT(CASE WHEN event_type = 'goal' THEN 1 END) as total_goals,
                    COUNT(CASE WHEN event_type = 'yellow_card' THEN 1 END) as total_yellow_cards,
                    COUNT(CASE WHEN event_type = 'red_card' THEN 1 END) as total_red_cards,
                    COUNT(CASE WHEN event_type = 'substitution_in' THEN 1 END) as total_substitutions,
                    COUNT(CASE WHEN event_type = 'penalty' THEN 1 END) as total_penalties,
                    COUNT(CASE WHEN event_type = 'own_goal' THEN 1 END) as total_own_goals,
                    AVG(CASE WHEN event_type = 'goal' THEN event_minute END) as avg_goal_minute
                FROM match_events me
                JOIN matches m ON me.match_id = m.id
                WHERE m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.match_id) {
                query += ' AND me.match_id = ?';
                params.push(filters.match_id);
            }
            
            if (filters.team_id) {
                query += ' AND me.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.season) {
                query += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            const results = await db.query(query, params);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get event statistics: ${error.message}`);
        }
    }
}

module.exports = MatchEvent;