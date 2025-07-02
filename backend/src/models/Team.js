const db = require('../database/connection');

class Team {
    static async create(teamData) {
        const { name, age_group, season, coach_name, team_color } = teamData;
        const sql = `
            INSERT INTO teams (name, age_group, season, coach_name, team_color)
            VALUES (?, ?, ?, ?, ?)
        `;
        return await db.run(sql, [name, age_group, season, coach_name, team_color]);
    }

    static async findAll() {
        const sql = 'SELECT * FROM teams ORDER BY created_at DESC';
        return await db.query(sql);
    }

    static async findById(id) {
        const sql = 'SELECT * FROM teams WHERE id = ?';
        const results = await db.query(sql, [id]);
        return results[0] || null;
    }

    static async update(id, teamData) {
        const { name, age_group, season, coach_name, team_color } = teamData;
        const sql = `
            UPDATE teams 
            SET name = ?, age_group = ?, season = ?, coach_name = ?, team_color = ?
            WHERE id = ?
        `;
        return await db.run(sql, [name, age_group, season, coach_name, team_color, id]);
    }

    static async delete(id) {
        const sql = 'DELETE FROM teams WHERE id = ?';
        return await db.run(sql, [id]);
    }

    static async getPlayersCount(teamId) {
        const sql = 'SELECT COUNT(*) as count FROM players WHERE team_id = ?';
        const result = await db.query(sql, [teamId]);
        return result[0].count;
    }

    // =====================================================================
    // SEASON STATISTICS AND MATCH RESULTS
    // =====================================================================

    /**
     * Get team season statistics
     * @param {number} teamId - Team ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Team season statistics
     */
    static async getSeasonStats(teamId, season = null) {
        try {
            let query = `
                SELECT 
                    COUNT(DISTINCT m.id) as matches_played,
                    SUM(CASE WHEN (m.home_team_id = ? AND m.home_score > m.away_score) OR 
                                  (m.away_team_id = ? AND m.away_score > m.home_score) THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as draws,
                    SUM(CASE WHEN (m.home_team_id = ? AND m.home_score < m.away_score) OR 
                                  (m.away_team_id = ? AND m.away_score < m.home_score) THEN 1 ELSE 0 END) as losses,
                    SUM(CASE WHEN m.home_team_id = ? THEN m.home_score ELSE m.away_score END) as goals_for,
                    SUM(CASE WHEN m.home_team_id = ? THEN m.away_score ELSE m.home_score END) as goals_against,
                    COUNT(CASE WHEN m.home_team_id = ? THEN 1 END) as home_matches,
                    COUNT(CASE WHEN m.away_team_id = ? THEN 1 END) as away_matches
                FROM matches m
                WHERE (m.home_team_id = ? OR m.away_team_id = ?) AND m.match_status = 'finished'
            `;
            
            const params = [teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId, teamId];
            
            if (season) {
                query += ' AND m.season = ?';
                params.push(season);
            }
            
            const results = await db.query(query, params);
            const stats = results[0] || {};
            
            // Calculate additional metrics
            if (stats.matches_played > 0) {
                stats.win_percentage = ((stats.wins / stats.matches_played) * 100).toFixed(1);
                stats.points = (stats.wins * 3) + stats.draws;
                stats.goal_difference = stats.goals_for - stats.goals_against;
                stats.goals_per_match = (stats.goals_for / stats.matches_played).toFixed(2);
                stats.goals_conceded_per_match = (stats.goals_against / stats.matches_played).toFixed(2);
            }
            
            return stats;
        } catch (error) {
            throw new Error(`Failed to get team season statistics: ${error.message}`);
        }
    }

    /**
     * Get team match results
     * @param {number} teamId - Team ID
     * @param {Object} filters - Optional filters (season, match_type, limit)
     * @returns {Promise<Array>} Team match results
     */
    static async getMatchResults(teamId, filters = {}) {
        try {
            let query = `
                SELECT 
                    m.id, m.match_date, m.match_type, m.season, m.venue,
                    ht.name as home_team, at.name as away_team,
                    m.home_score, m.away_score, m.match_status,
                    CASE WHEN m.home_team_id = ? THEN 'home' ELSE 'away' END as venue_type,
                    CASE WHEN m.home_team_id = ? THEN m.home_score ELSE m.away_score END as team_score,
                    CASE WHEN m.home_team_id = ? THEN m.away_score ELSE m.home_score END as opponent_score,
                    CASE 
                        WHEN (m.home_team_id = ? AND m.home_score > m.away_score) OR 
                             (m.away_team_id = ? AND m.away_score > m.home_score) THEN 'W'
                        WHEN m.home_score = m.away_score THEN 'D'
                        ELSE 'L'
                    END as result
                FROM matches m
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE (m.home_team_id = ? OR m.away_team_id = ?)
            `;
            
            const params = [teamId, teamId, teamId, teamId, teamId, teamId, teamId];
            
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
            
            query += ' ORDER BY m.match_date DESC';
            
            if (filters.limit) {
                query += ' LIMIT ?';
                params.push(filters.limit);
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get team match results: ${error.message}`);
        }
    }

    /**
     * Get team form (recent match results)
     * @param {number} teamId - Team ID
     * @param {number} lastMatches - Number of recent matches (default 5)
     * @returns {Promise<Object>} Team form analysis
     */
    static async getTeamForm(teamId, lastMatches = 5) {
        try {
            const recentResults = await this.getMatchResults(teamId, { 
                match_status: 'finished', 
                limit: lastMatches 
            });
            
            const formAnalysis = {
                recent_matches: recentResults,
                form_summary: {
                    matches: recentResults.length,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goals_for: 0,
                    goals_against: 0,
                    form_string: ''
                }
            };
            
            recentResults.forEach(match => {
                if (match.result === 'W') formAnalysis.form_summary.wins++;
                else if (match.result === 'D') formAnalysis.form_summary.draws++;
                else if (match.result === 'L') formAnalysis.form_summary.losses++;
                
                formAnalysis.form_summary.goals_for += match.team_score || 0;
                formAnalysis.form_summary.goals_against += match.opponent_score || 0;
                formAnalysis.form_summary.form_string += match.result;
            });
            
            return formAnalysis;
        } catch (error) {
            throw new Error(`Failed to get team form: ${error.message}`);
        }
    }

    /**
     * Get team player statistics
     * @param {number} teamId - Team ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Array>} Player statistics for the team
     */
    static async getPlayerStats(teamId, season = null) {
        try {
            let query = `
                SELECT 
                    p.id, p.name, p.position,
                    COUNT(DISTINCT pmp.match_id) as matches_played,
                    SUM(pmp.goals) as goals,
                    SUM(pmp.assists) as assists,
                    SUM(pmp.minutes_played) as total_minutes,
                    AVG(pmp.performance_rating) as avg_rating,
                    COUNT(CASE WHEN pmp.starter = 1 THEN 1 END) as starts
                FROM players p
                LEFT JOIN player_match_performance pmp ON p.id = pmp.player_id
                LEFT JOIN matches m ON pmp.match_id = m.id AND m.match_status = 'finished'
                WHERE p.team_id = ?
            `;
            
            const params = [teamId];
            
            if (season) {
                query += ' AND m.season = ?';
                params.push(season);
            }
            
            query += ' GROUP BY p.id, p.name, p.position ORDER BY goals DESC, assists DESC';
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to get team player statistics: ${error.message}`);
        }
    }

    /**
     * Get team health overview
     * @param {number} teamId - Team ID
     * @returns {Promise<Object>} Team health summary
     */
    static async getHealthOverview(teamId) {
        try {
            const query = `
                SELECT * FROM team_health_overview
                WHERE team_id = ?
            `;
            
            const results = await db.query(query, [teamId]);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get team health overview: ${error.message}`);
        }
    }

    /**
     * Get team development overview
     * @param {number} teamId - Team ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Development overview
     */
    static async getDevelopmentOverview(teamId, season = null) {
        try {
            let query = `
                SELECT 
                    p.id, p.name as player_name,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as avg_completion,
                    COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans,
                    COUNT(CASE WHEN dp.status = 'completed' THEN 1 END) as completed_plans
                FROM players p
                LEFT JOIN development_plans dp ON p.id = dp.player_id
                WHERE p.team_id = ?
            `;
            
            const params = [teamId];
            
            if (season) {
                query += ' AND dp.season = ?';
                params.push(season);
            }
            
            query += ' GROUP BY p.id, p.name ORDER BY avg_completion DESC';
            
            const playerProgress = await db.query(query, params);
            
            // Get team development statistics
            let statsQuery = `
                SELECT 
                    COUNT(DISTINCT dp.player_id) as players_with_plans,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as team_avg_completion,
                    COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans,
                    COUNT(CASE WHEN dp.plan_type = 'technical' THEN 1 END) as technical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'physical' THEN 1 END) as physical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'tactical' THEN 1 END) as tactical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'mental' THEN 1 END) as mental_plans
                FROM development_plans dp
                JOIN players p ON dp.player_id = p.id
                WHERE p.team_id = ?
            `;
            
            const statsParams = [teamId];
            
            if (season) {
                statsQuery += ' AND dp.season = ?';
                statsParams.push(season);
            }
            
            const teamStats = await db.query(statsQuery, statsParams);
            
            return {
                player_progress: playerProgress,
                team_statistics: teamStats[0] || {}
            };
        } catch (error) {
            throw new Error(`Failed to get team development overview: ${error.message}`);
        }
    }

    /**
     * Get upcoming team fixtures
     * @param {number} teamId - Team ID
     * @param {number} days - Days ahead to look (default 30)
     * @returns {Promise<Array>} Upcoming fixtures
     */
    static async getUpcomingFixtures(teamId, days = 30) {
        try {
            const query = `
                SELECT 
                    m.*, ht.name as home_team, at.name as away_team,
                    CASE WHEN m.home_team_id = ? THEN 'home' ELSE 'away' END as venue_type
                FROM matches m
                JOIN teams ht ON m.home_team_id = ht.id
                JOIN teams at ON m.away_team_id = at.id
                WHERE (m.home_team_id = ? OR m.away_team_id = ?)
                AND m.match_status IN ('scheduled', 'ongoing')
                AND m.match_date BETWEEN DATE('now') AND DATE('now', '+${days} days')
                ORDER BY m.match_date ASC, m.match_time ASC
            `;
            
            return await db.query(query, [teamId, teamId, teamId]);
        } catch (error) {
            throw new Error(`Failed to get upcoming fixtures: ${error.message}`);
        }
    }

    /**
     * Get team attendance statistics
     * @param {number} teamId - Team ID
     * @param {Object} filters - Optional filters (date_from, date_to)
     * @returns {Promise<Object>} Team attendance statistics
     */
    static async getAttendanceStats(teamId, filters = {}) {
        try {
            let query = `
                SELECT 
                    COUNT(DISTINCT t.id) as total_trainings,
                    COUNT(DISTINCT a.player_id) as unique_players,
                    COUNT(a.id) as total_attendances,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id), 1) as attendance_percentage,
                    AVG(a.performance_rating) as avg_performance_rating
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
            
            const results = await db.query(query, params);
            return results[0] || {};
        } catch (error) {
            throw new Error(`Failed to get team attendance statistics: ${error.message}`);
        }
    }

    /**
     * Get comprehensive team overview
     * @param {number} teamId - Team ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Complete team overview
     */
    static async getTeamOverview(teamId, season = null) {
        try {
            // Get basic team info
            const team = await this.findById(teamId);
            if (!team) {
                throw new Error('Team not found');
            }

            // Get all the statistics
            const [
                seasonStats,
                playerStats,
                healthOverview,
                developmentOverview,
                upcomingFixtures,
                attendanceStats,
                recentForm
            ] = await Promise.all([
                this.getSeasonStats(teamId, season),
                this.getPlayerStats(teamId, season),
                this.getHealthOverview(teamId),
                this.getDevelopmentOverview(teamId, season),
                this.getUpcomingFixtures(teamId),
                this.getAttendanceStats(teamId),
                this.getTeamForm(teamId, 5)
            ]);

            return {
                team_info: team,
                season_statistics: seasonStats,
                player_statistics: playerStats,
                health_overview: healthOverview,
                development_overview: developmentOverview,
                upcoming_fixtures: upcomingFixtures,
                attendance_statistics: attendanceStats,
                recent_form: recentForm,
                player_count: await this.getPlayersCount(teamId)
            };
        } catch (error) {
            throw new Error(`Failed to get team overview: ${error.message}`);
        }
    }

    /**
     * Compare team performance with league/division
     * @param {number} teamId - Team ID
     * @param {string} season - Season for comparison
     * @param {string} division - Optional division filter
     * @returns {Promise<Object>} Team performance comparison
     */
    static async compareWithLeague(teamId, season, division = null) {
        try {
            const teamStats = await this.getSeasonStats(teamId, season);
            
            // Get league averages
            let leagueQuery = `
                SELECT 
                    AVG(goals_for) as avg_goals_for,
                    AVG(goals_against) as avg_goals_against,
                    AVG(wins) as avg_wins,
                    AVG(matches_played) as avg_matches_played
                FROM team_performance
                WHERE 1=1
            `;
            
            const params = [];
            
            if (division) {
                // This would need to be implemented based on how divisions are stored
                // leagueQuery += ' AND division = ?';
                // params.push(division);
            }
            
            const leagueStats = await db.query(leagueQuery, params);
            
            return {
                team_stats: teamStats,
                league_averages: leagueStats[0] || {},
                comparison: {
                    goals_for_vs_avg: teamStats.goals_for ? teamStats.goals_for / (leagueStats[0]?.avg_goals_for || 1) : 0,
                    goals_against_vs_avg: teamStats.goals_against ? teamStats.goals_against / (leagueStats[0]?.avg_goals_against || 1) : 0,
                    wins_vs_avg: teamStats.wins ? teamStats.wins / (leagueStats[0]?.avg_wins || 1) : 0
                }
            };
        } catch (error) {
            throw new Error(`Failed to compare with league: ${error.message}`);
        }
    }
}

module.exports = Team;