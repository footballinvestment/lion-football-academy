const db = require('../database/connection');

class Match {
    // Core CRUD operations
    static async findAll(filters = {}) {
        let query = `
            SELECT m.*, 
                   ht.name as home_team_name,
                   at.name as away_team_name,
                   u.full_name as created_by_name
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            LEFT JOIN users u ON m.created_by = u.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (filters.season) {
            query += ' AND m.season = ?';
            params.push(filters.season);
        }
        
        if (filters.match_type) {
            query += ' AND m.match_type = ?';
            params.push(filters.match_type);
        }
        
        if (filters.match_status) {
            query += ' AND m.match_status = ?';
            params.push(filters.match_status);
        }
        
        if (filters.team_id) {
            query += ' AND (m.home_team_id = ? OR m.away_team_id = ?)';
            params.push(filters.team_id, filters.team_id);
        }
        
        if (filters.date_from) {
            query += ' AND m.match_date >= ?';
            params.push(filters.date_from);
        }
        
        if (filters.date_to) {
            query += ' AND m.match_date <= ?';
            params.push(filters.date_to);
        }
        
        query += ' ORDER BY m.match_date DESC, m.match_time DESC';
        
        return await db.query(query, params);
    }

    static async findById(id) {
        const query = `
            SELECT m.*, 
                   ht.name as home_team_name,
                   at.name as away_team_name,
                   u.full_name as created_by_name
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `;
        const results = await db.query(query, [id]);
        return results[0] || null;
    }

    static async findByTeam(teamId, filters = {}) {
        let query = `
            SELECT m.*, 
                   ht.name as home_team_name,
                   at.name as away_team_name,
                   CASE WHEN m.home_team_id = ? THEN 'home' ELSE 'away' END as team_role,
                   CASE WHEN m.home_team_id = ? THEN m.home_score ELSE m.away_score END as team_score,
                   CASE WHEN m.home_team_id = ? THEN m.away_score ELSE m.home_score END as opponent_score
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE (m.home_team_id = ? OR m.away_team_id = ?)
        `;
        
        const params = [teamId, teamId, teamId, teamId, teamId];
        
        if (filters.season) {
            query += ' AND m.season = ?';
            params.push(filters.season);
        }
        
        if (filters.match_status) {
            query += ' AND m.match_status = ?';
            params.push(filters.match_status);
        }
        
        query += ' ORDER BY m.match_date DESC';
        
        return await db.query(query, params);
    }

    static async create(matchData) {
        const query = `
            INSERT INTO matches (
                home_team_id, away_team_id, match_date, match_time,
                venue, match_type, season, match_duration,
                weather_conditions, referee_name, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await db.run(query, [
            matchData.home_team_id,
            matchData.away_team_id,
            matchData.match_date,
            matchData.match_time || null,
            matchData.venue || null,
            matchData.match_type,
            matchData.season,
            matchData.match_duration || 90,
            matchData.weather_conditions || null,
            matchData.referee_name || null,
            matchData.notes || null,
            matchData.created_by
        ]);
        
        return { id: result.lastID };
    }

    static async update(id, matchData) {
        const query = `
            UPDATE matches SET
                home_team_id = ?, away_team_id = ?, match_date = ?, match_time = ?,
                venue = ?, match_type = ?, season = ?, home_score = ?, away_score = ?,
                match_status = ?, match_duration = ?, weather_conditions = ?,
                referee_name = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        return await db.run(query, [
            matchData.home_team_id,
            matchData.away_team_id,
            matchData.match_date,
            matchData.match_time || null,
            matchData.venue || null,
            matchData.match_type,
            matchData.season,
            matchData.home_score || 0,
            matchData.away_score || 0,
            matchData.match_status || 'scheduled',
            matchData.match_duration || 90,
            matchData.weather_conditions || null,
            matchData.referee_name || null,
            matchData.notes || null,
            id
        ]);
    }

    static async updateScore(id, homeScore, awayScore) {
        const query = `
            UPDATE matches SET
                home_score = ?, away_score = ?, match_status = 'finished',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        return await db.run(query, [homeScore, awayScore, id]);
    }

    static async delete(id) {
        return await db.run('DELETE FROM matches WHERE id = ?', [id]);
    }

    // Player Performance Methods
    static async getPlayerPerformance(matchId, playerId = null) {
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
    }

    static async recordPlayerPerformance(performanceData) {
        const query = `
            INSERT OR REPLACE INTO player_match_performance (
                match_id, player_id, team_id, position, minutes_played, starter,
                substituted_in_minute, substituted_out_minute, goals, assists,
                yellow_cards, red_cards, shots_total, shots_on_target,
                passes_completed, passes_attempted, tackles_won, tackles_attempted,
                distance_covered_km, top_speed_kmh, performance_rating, coach_notes,
                player_self_rating
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await db.run(query, [
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
    }

    // Match Events Methods
    static async getMatchEvents(matchId) {
        const query = `
            SELECT me.*, p.name as player_name, t.name as team_name,
                   ap.name as assisted_by_name
            FROM match_events me
            LEFT JOIN players p ON me.player_id = p.id
            JOIN teams t ON me.team_id = t.id
            LEFT JOIN players ap ON me.assisted_by_player_id = ap.id
            WHERE me.match_id = ?
            ORDER BY me.event_minute ASC
        `;
        return await db.query(query, [matchId]);
    }

    static async addMatchEvent(eventData) {
        const query = `
            INSERT INTO match_events (
                match_id, player_id, team_id, event_type, event_minute,
                event_description, assisted_by_player_id, substituted_player_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await db.run(query, [
            eventData.match_id,
            eventData.player_id || null,
            eventData.team_id,
            eventData.event_type,
            eventData.event_minute,
            eventData.event_description || null,
            eventData.assisted_by_player_id || null,
            eventData.substituted_player_id || null
        ]);
    }

    // Statistics Methods
    static async getTopScorers(season = null, teamId = null) {
        let query = `
            SELECT * FROM top_scorers
            WHERE 1=1
        `;
        
        const params = [];
        
        if (teamId) {
            query += ' AND team_id = ?';
            params.push(teamId);
        }
        
        // Note: season filtering would need to be added to the view
        query += ' LIMIT 20';
        
        return await db.query(query, params);
    }

    static async getTeamPerformance(season = null) {
        let query = 'SELECT * FROM team_performance';
        
        if (season) {
            // This would need season filtering in the view
            query += ' ORDER BY wins DESC, goals_for DESC';
        } else {
            query += ' ORDER BY wins DESC, goals_for DESC';
        }
        
        return await db.query(query);
    }

    static async getMatchStatistics(matchId) {
        const query = `
            SELECT tms.*, t.name as team_name
            FROM team_match_statistics tms
            JOIN teams t ON tms.team_id = t.id
            WHERE tms.match_id = ?
        `;
        return await db.query(query, [matchId]);
    }

    static async recordTeamStatistics(statsData) {
        const query = `
            INSERT OR REPLACE INTO team_match_statistics (
                match_id, team_id, possession_percentage, shots_total, shots_on_target,
                corners, fouls, offsides, passes_completed, passes_attempted,
                crosses_completed, crosses_attempted, free_kicks, throw_ins,
                goalkeeper_saves, formation, tactical_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        return await db.run(query, [
            statsData.match_id,
            statsData.team_id,
            statsData.possession_percentage || null,
            statsData.shots_total || 0,
            statsData.shots_on_target || 0,
            statsData.corners || 0,
            statsData.fouls || 0,
            statsData.offsides || 0,
            statsData.passes_completed || 0,
            statsData.passes_attempted || 0,
            statsData.crosses_completed || 0,
            statsData.crosses_attempted || 0,
            statsData.free_kicks || 0,
            statsData.throw_ins || 0,
            statsData.goalkeeper_saves || 0,
            statsData.formation || null,
            statsData.tactical_notes || null
        ]);
    }

    static async getSeasonStatistics(playerId = null, season = null) {
        let query = `
            SELECT ss.*, p.name as player_name, t.name as team_name
            FROM season_statistics ss
            JOIN players p ON ss.player_id = p.id
            JOIN teams t ON ss.team_id = t.id
            WHERE 1=1
        `;
        
        const params = [];
        
        if (playerId) {
            query += ' AND ss.player_id = ?';
            params.push(playerId);
        }
        
        if (season) {
            query += ' AND ss.season = ?';
            params.push(season);
        }
        
        query += ' ORDER BY ss.goals DESC, ss.assists DESC';
        
        return await db.query(query, params);
    }

    // Advanced Analytics
    static async getPlayerForm(playerId, lastMatches = 5) {
        const query = `
            SELECT pmp.*, m.match_date, ht.name as home_team, at.name as away_team,
                   m.home_score, m.away_score
            FROM player_match_performance pmp
            JOIN matches m ON pmp.match_id = m.id
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE pmp.player_id = ? AND m.match_status = 'finished'
            ORDER BY m.match_date DESC
            LIMIT ?
        `;
        return await db.query(query, [playerId, lastMatches]);
    }

    static async getTeamForm(teamId, lastMatches = 5) {
        const query = `
            SELECT m.*, ht.name as home_team, at.name as away_team,
                   CASE WHEN m.home_team_id = ? THEN 'home' ELSE 'away' END as team_role,
                   CASE 
                       WHEN (m.home_team_id = ? AND m.home_score > m.away_score) OR 
                            (m.away_team_id = ? AND m.away_score > m.home_score) THEN 'W'
                       WHEN m.home_score = m.away_score THEN 'D'
                       ELSE 'L'
                   END as result
            FROM matches m
            JOIN teams ht ON m.home_team_id = ht.id
            JOIN teams at ON m.away_team_id = at.id
            WHERE (m.home_team_id = ? OR m.away_team_id = ?) AND m.match_status = 'finished'
            ORDER BY m.match_date DESC
            LIMIT ?
        `;
        return await db.query(query, [teamId, teamId, teamId, teamId, teamId, lastMatches]);
    }

    static async getMatchResults(filters = {}) {
        let query = 'SELECT * FROM match_results WHERE 1=1';
        const params = [];
        
        if (filters.season) {
            query += ' AND season = ?';
            params.push(filters.season);
        }
        
        if (filters.team_name) {
            query += ' AND (home_team = ? OR away_team = ?)';
            params.push(filters.team_name, filters.team_name);
        }
        
        query += ' ORDER BY match_date DESC LIMIT 50';
        
        return await db.query(query, params);
    }

    static async getPlayerSeasonPerformance(season = null, teamId = null) {
        let query = 'SELECT * FROM player_season_performance WHERE 1=1';
        const params = [];
        
        if (season) {
            query += ' AND season = ?';
            params.push(season);
        }
        
        if (teamId) {
            query += ' AND team_name = (SELECT name FROM teams WHERE id = ?)';
            params.push(teamId);
        }
        
        query += ' ORDER BY goals DESC, assists DESC LIMIT 50';
        
        return await db.query(query, params);
    }
}

module.exports = Match;