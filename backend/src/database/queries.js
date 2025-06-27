const db = require('./connection');

/**
 * Complex Analytical Queries
 * Advanced database queries for analytics and reporting
 */
class AnalyticalQueries {
    
    // =====================================================================
    // PERFORMANCE ANALYTICS
    // =====================================================================

    /**
     * Get comprehensive performance analytics
     * @param {Object} filters - Filters (team_id, season, player_id, date_from, date_to)
     * @returns {Promise<Object>} Performance analytics data
     */
    static async getPerformanceAnalytics(filters = {}) {
        try {
            let baseQuery = `
                FROM player_match_performance pmp
                JOIN matches m ON pmp.match_id = m.id
                JOIN players p ON pmp.player_id = p.id
                JOIN teams t ON pmp.team_id = t.id
                WHERE m.match_status = 'finished'
            `;
            
            const params = [];
            
            if (filters.team_id) {
                baseQuery += ' AND pmp.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.season) {
                baseQuery += ' AND m.season = ?';
                params.push(filters.season);
            }
            
            if (filters.player_id) {
                baseQuery += ' AND pmp.player_id = ?';
                params.push(filters.player_id);
            }
            
            if (filters.date_from) {
                baseQuery += ' AND m.match_date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                baseQuery += ' AND m.match_date <= ?';
                params.push(filters.date_to);
            }
            
            // Performance summary
            const summaryQuery = `
                SELECT 
                    COUNT(DISTINCT pmp.player_id) as unique_players,
                    COUNT(DISTINCT pmp.match_id) as total_matches,
                    COUNT(DISTINCT pmp.team_id) as teams_involved,
                    AVG(pmp.performance_rating) as avg_performance_rating,
                    SUM(pmp.goals) as total_goals,
                    SUM(pmp.assists) as total_assists,
                    AVG(pmp.minutes_played) as avg_minutes_played,
                    COUNT(CASE WHEN pmp.starter = 1 THEN 1 END) as total_starts
                ${baseQuery}
            `;
            
            // Top performers by position
            const topPerformersQuery = `
                SELECT 
                    p.position,
                    p.name as player_name,
                    t.name as team_name,
                    AVG(pmp.performance_rating) as avg_rating,
                    SUM(pmp.goals) as total_goals,
                    SUM(pmp.assists) as total_assists,
                    COUNT(DISTINCT pmp.match_id) as matches_played
                ${baseQuery}
                GROUP BY p.position, p.id, p.name, t.name
                HAVING COUNT(DISTINCT pmp.match_id) >= 3
                ORDER BY p.position, avg_rating DESC
            `;
            
            // Performance trends by month
            const trendsQuery = `
                SELECT 
                    strftime('%Y-%m', m.match_date) as month,
                    AVG(pmp.performance_rating) as avg_rating,
                    SUM(pmp.goals) as total_goals,
                    COUNT(DISTINCT pmp.match_id) as matches_count
                ${baseQuery}
                GROUP BY strftime('%Y-%m', m.match_date)
                ORDER BY month
            `;
            
            const [summary, topPerformers, trends] = await Promise.all([
                db.query(summaryQuery, params),
                db.query(topPerformersQuery, params),
                db.query(trendsQuery, params)
            ]);
            
            return {
                summary: summary[0] || {},
                top_performers_by_position: this.groupByPosition(topPerformers),
                performance_trends: trends
            };
        } catch (error) {
            throw new Error(`Failed to get performance analytics: ${error.message}`);
        }
    }

    /**
     * Get team comparison analytics
     * @param {Array} teamIds - Array of team IDs to compare
     * @param {string} season - Season for comparison
     * @returns {Promise<Object>} Team comparison data
     */
    static async getTeamComparison(teamIds, season = null) {
        try {
            if (!Array.isArray(teamIds) || teamIds.length < 2) {
                throw new Error('At least 2 team IDs required for comparison');
            }

            const placeholders = teamIds.map(() => '?').join(',');
            let query = `
                SELECT 
                    t.id as team_id,
                    t.name as team_name,
                    COUNT(DISTINCT m.id) as matches_played,
                    AVG(pmp.performance_rating) as avg_performance_rating,
                    SUM(pmp.goals) as total_goals,
                    SUM(pmp.assists) as total_assists,
                    AVG(pmp.minutes_played) as avg_minutes_played,
                    
                    -- Match results
                    SUM(CASE WHEN (m.home_team_id = t.id AND m.home_score > m.away_score) OR 
                                  (m.away_team_id = t.id AND m.away_score > m.home_score) THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN m.home_score = m.away_score THEN 1 ELSE 0 END) as draws,
                    SUM(CASE WHEN (m.home_team_id = t.id AND m.home_score < m.away_score) OR 
                                  (m.away_team_id = t.id AND m.away_score < m.home_score) THEN 1 ELSE 0 END) as losses,
                    
                    -- Goals for/against
                    SUM(CASE WHEN m.home_team_id = t.id THEN m.home_score ELSE m.away_score END) as goals_for,
                    SUM(CASE WHEN m.home_team_id = t.id THEN m.away_score ELSE m.home_score END) as goals_against,
                    
                    -- Player stats
                    COUNT(DISTINCT p.id) as squad_size,
                    AVG(CASE WHEN pmp.starter = 1 THEN 1.0 ELSE 0.0 END) as starter_rate
                    
                FROM teams t
                LEFT JOIN matches m ON (t.id = m.home_team_id OR t.id = m.away_team_id) AND m.match_status = 'finished'
                LEFT JOIN player_match_performance pmp ON pmp.team_id = t.id AND pmp.match_id = m.id
                LEFT JOIN players p ON p.team_id = t.id
                WHERE t.id IN (${placeholders})
            `;
            
            const params = [...teamIds];
            
            if (season) {
                query += ' AND m.season = ?';
                params.push(season);
            }
            
            query += ' GROUP BY t.id, t.name ORDER BY wins DESC, avg_performance_rating DESC';
            
            const results = await db.query(query, params);
            
            // Calculate additional metrics
            const enhanced = results.map(team => ({
                ...team,
                win_percentage: team.matches_played > 0 ? ((team.wins / team.matches_played) * 100).toFixed(1) : 0,
                goal_difference: team.goals_for - team.goals_against,
                points: (team.wins * 3) + team.draws,
                goals_per_match: team.matches_played > 0 ? (team.goals_for / team.matches_played).toFixed(2) : 0,
                goals_conceded_per_match: team.matches_played > 0 ? (team.goals_against / team.matches_played).toFixed(2) : 0
            }));
            
            return {
                team_comparison: enhanced,
                comparison_summary: this.generateComparisonSummary(enhanced)
            };
        } catch (error) {
            throw new Error(`Failed to get team comparison: ${error.message}`);
        }
    }

    /**
     * Get player development analytics
     * @param {Object} filters - Filters (player_id, team_id, season, plan_type)
     * @returns {Promise<Object>} Development analytics data
     */
    static async getDevelopmentAnalytics(filters = {}) {
        try {
            let baseQuery = `
                FROM development_plans dp
                JOIN players p ON dp.player_id = p.id
                JOIN teams t ON p.team_id = t.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.player_id) {
                baseQuery += ' AND dp.player_id = ?';
                params.push(filters.player_id);
            }
            
            if (filters.team_id) {
                baseQuery += ' AND p.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.season) {
                baseQuery += ' AND dp.season = ?';
                params.push(filters.season);
            }
            
            if (filters.plan_type) {
                baseQuery += ' AND dp.plan_type = ?';
                params.push(filters.plan_type);
            }
            
            // Development summary
            const summaryQuery = `
                SELECT 
                    COUNT(DISTINCT dp.player_id) as players_with_plans,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as avg_completion,
                    COUNT(CASE WHEN dp.status = 'active' THEN 1 END) as active_plans,
                    COUNT(CASE WHEN dp.status = 'completed' THEN 1 END) as completed_plans,
                    COUNT(CASE WHEN dp.plan_type = 'technical' THEN 1 END) as technical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'physical' THEN 1 END) as physical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'tactical' THEN 1 END) as tactical_plans,
                    COUNT(CASE WHEN dp.plan_type = 'mental' THEN 1 END) as mental_plans
                ${baseQuery}
            `;
            
            // Progress by plan type
            const progressByTypeQuery = `
                SELECT 
                    dp.plan_type,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as avg_completion,
                    AVG(dp.target_level - dp.current_level) as avg_level_gap,
                    COUNT(CASE WHEN dp.status = 'completed' THEN 1 END) as completed_plans
                ${baseQuery}
                GROUP BY dp.plan_type
                ORDER BY avg_completion DESC
            `;
            
            // Top improving players
            const topImprovingQuery = `
                SELECT 
                    p.name as player_name,
                    t.name as team_name,
                    COUNT(dp.id) as total_plans,
                    AVG(dp.completion_percentage) as avg_completion,
                    SUM(dp.target_level - dp.current_level) as total_improvement_target
                ${baseQuery}
                GROUP BY p.id, p.name, t.name
                HAVING COUNT(dp.id) >= 2
                ORDER BY avg_completion DESC
                LIMIT 10
            `;
            
            const [summary, progressByType, topImproving] = await Promise.all([
                db.query(summaryQuery, params),
                db.query(progressByTypeQuery, params),
                db.query(topImprovingQuery, params)
            ]);
            
            return {
                summary: summary[0] || {},
                progress_by_type: progressByType,
                top_improving_players: topImproving
            };
        } catch (error) {
            throw new Error(`Failed to get development analytics: ${error.message}`);
        }
    }

    /**
     * Get injury analytics
     * @param {Object} filters - Filters (team_id, season, injury_type, severity)
     * @returns {Promise<Object>} Injury analytics data
     */
    static async getInjuryAnalytics(filters = {}) {
        try {
            let baseQuery = `
                FROM injuries i
                JOIN players p ON i.player_id = p.id
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.team_id) {
                baseQuery += ' AND p.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.season) {
                baseQuery += ' AND strftime("%Y", i.injury_date) = ?';
                params.push(filters.season.split('-')[0]);
            }
            
            if (filters.injury_type) {
                baseQuery += ' AND i.injury_type = ?';
                params.push(filters.injury_type);
            }
            
            if (filters.severity) {
                baseQuery += ' AND i.injury_severity = ?';
                params.push(filters.severity);
            }
            
            // Injury summary
            const summaryQuery = `
                SELECT 
                    COUNT(i.id) as total_injuries,
                    COUNT(DISTINCT i.player_id) as players_affected,
                    COUNT(CASE WHEN i.injury_severity = 'minor' THEN 1 END) as minor_injuries,
                    COUNT(CASE WHEN i.injury_severity = 'moderate' THEN 1 END) as moderate_injuries,
                    COUNT(CASE WHEN i.injury_severity = 'severe' THEN 1 END) as severe_injuries,
                    COUNT(CASE WHEN i.actual_recovery_date IS NULL THEN 1 END) as active_injuries,
                    AVG(CASE WHEN i.actual_recovery_date IS NOT NULL 
                        THEN julianday(i.actual_recovery_date) - julianday(i.injury_date) 
                        ELSE NULL END) as avg_recovery_days
                ${baseQuery}
            `;
            
            // Injury trends by month
            const trendsQuery = `
                SELECT 
                    strftime('%Y-%m', i.injury_date) as month,
                    COUNT(i.id) as injury_count,
                    COUNT(CASE WHEN i.injury_severity = 'severe' THEN 1 END) as severe_count
                ${baseQuery}
                AND i.injury_date >= DATE('now', '-12 months')
                GROUP BY strftime('%Y-%m', i.injury_date)
                ORDER BY month
            `;
            
            // Most common injuries
            const commonInjuriesQuery = `
                SELECT 
                    i.injury_type,
                    i.injury_location,
                    COUNT(i.id) as occurrence_count,
                    AVG(CASE WHEN i.actual_recovery_date IS NOT NULL 
                        THEN julianday(i.actual_recovery_date) - julianday(i.injury_date) 
                        ELSE NULL END) as avg_recovery_days
                ${baseQuery}
                GROUP BY i.injury_type, i.injury_location
                ORDER BY occurrence_count DESC
                LIMIT 10
            `;
            
            const [summary, trends, commonInjuries] = await Promise.all([
                db.query(summaryQuery, params),
                db.query(trendsQuery, params),
                db.query(commonInjuriesQuery, params)
            ]);
            
            return {
                summary: summary[0] || {},
                monthly_trends: trends,
                common_injuries: commonInjuries
            };
        } catch (error) {
            throw new Error(`Failed to get injury analytics: ${error.message}`);
        }
    }

    /**
     * Get attendance analytics
     * @param {Object} filters - Filters (team_id, date_from, date_to, training_type)
     * @returns {Promise<Object>} Attendance analytics data
     */
    static async getAttendanceAnalytics(filters = {}) {
        try {
            let baseQuery = `
                FROM attendance a
                JOIN trainings t ON a.training_id = t.id
                JOIN players p ON a.player_id = p.id
                LEFT JOIN teams tm ON p.team_id = tm.id
                WHERE 1=1
            `;
            
            const params = [];
            
            if (filters.team_id) {
                baseQuery += ' AND p.team_id = ?';
                params.push(filters.team_id);
            }
            
            if (filters.date_from) {
                baseQuery += ' AND t.date >= ?';
                params.push(filters.date_from);
            }
            
            if (filters.date_to) {
                baseQuery += ' AND t.date <= ?';
                params.push(filters.date_to);
            }
            
            if (filters.training_type) {
                baseQuery += ' AND t.type = ?';
                params.push(filters.training_type);
            }
            
            // Attendance summary
            const summaryQuery = `
                SELECT 
                    COUNT(a.id) as total_attendances,
                    COUNT(DISTINCT a.player_id) as unique_players,
                    COUNT(DISTINCT t.id) as total_sessions,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                    COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count,
                    COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id), 2) as attendance_percentage,
                    AVG(a.performance_rating) as avg_performance_rating
                ${baseQuery}
            `;
            
            // Attendance by player
            const playerAttendanceQuery = `
                SELECT 
                    p.name as player_name,
                    tm.name as team_name,
                    COUNT(a.id) as total_sessions,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id), 2) as attendance_rate,
                    AVG(a.performance_rating) as avg_performance
                ${baseQuery}
                GROUP BY p.id, p.name, tm.name
                HAVING COUNT(a.id) >= 5
                ORDER BY attendance_rate DESC
                LIMIT 20
            `;
            
            // Attendance trends
            const trendsQuery = `
                SELECT 
                    DATE(t.date, 'weekday 0', '-6 days') as week_start,
                    COUNT(a.id) as total_attendances,
                    COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
                    ROUND(COUNT(CASE WHEN a.status = 'present' THEN 1 END) * 100.0 / COUNT(a.id), 2) as attendance_rate
                ${baseQuery}
                AND t.date >= DATE('now', '-12 weeks')
                GROUP BY week_start
                ORDER BY week_start
            `;
            
            const [summary, playerAttendance, trends] = await Promise.all([
                db.query(summaryQuery, params),
                db.query(playerAttendanceQuery, params),
                db.query(trendsQuery, params)
            ]);
            
            return {
                summary: summary[0] || {},
                player_attendance: playerAttendance,
                weekly_trends: trends
            };
        } catch (error) {
            throw new Error(`Failed to get attendance analytics: ${error.message}`);
        }
    }

    // =====================================================================
    // ADVANCED REPORTING QUERIES
    // =====================================================================

    /**
     * Generate season report
     * @param {string} season - Season (e.g., '2024-25')
     * @param {number} teamId - Optional team filter
     * @returns {Promise<Object>} Comprehensive season report
     */
    static async generateSeasonReport(season, teamId = null) {
        try {
            const filters = { season };
            if (teamId) filters.team_id = teamId;
            
            const [
                performanceAnalytics,
                developmentAnalytics,
                injuryAnalytics,
                attendanceAnalytics
            ] = await Promise.all([
                this.getPerformanceAnalytics(filters),
                this.getDevelopmentAnalytics(filters),
                this.getInjuryAnalytics(filters),
                this.getAttendanceAnalytics(filters)
            ]);
            
            return {
                season,
                team_id: teamId,
                generated_at: new Date().toISOString(),
                performance: performanceAnalytics,
                development: developmentAnalytics,
                injuries: injuryAnalytics,
                attendance: attendanceAnalytics
            };
        } catch (error) {
            throw new Error(`Failed to generate season report: ${error.message}`);
        }
    }

    /**
     * Generate player report
     * @param {number} playerId - Player ID
     * @param {string} season - Optional season filter
     * @returns {Promise<Object>} Comprehensive player report
     */
    static async generatePlayerReport(playerId, season = null) {
        try {
            const filters = { player_id: playerId };
            if (season) filters.season = season;
            
            // Get player basic info
            const playerQuery = `
                SELECT p.*, t.name as team_name
                FROM players p
                LEFT JOIN teams t ON p.team_id = t.id
                WHERE p.id = ?
            `;
            const player = await db.query(playerQuery, [playerId]);
            
            if (player.length === 0) {
                throw new Error('Player not found');
            }
            
            const [
                performanceAnalytics,
                developmentAnalytics,
                injuryAnalytics,
                attendanceAnalytics
            ] = await Promise.all([
                this.getPerformanceAnalytics(filters),
                this.getDevelopmentAnalytics(filters),
                this.getInjuryAnalytics(filters),
                this.getAttendanceAnalytics(filters)
            ]);
            
            return {
                player: player[0],
                season,
                generated_at: new Date().toISOString(),
                performance: performanceAnalytics,
                development: developmentAnalytics,
                injuries: injuryAnalytics,
                attendance: attendanceAnalytics
            };
        } catch (error) {
            throw new Error(`Failed to generate player report: ${error.message}`);
        }
    }

    // =====================================================================
    // UTILITY METHODS
    // =====================================================================

    /**
     * Group performance data by position
     * @param {Array} data - Performance data
     * @returns {Object} Data grouped by position
     */
    static groupByPosition(data) {
        return data.reduce((groups, item) => {
            const position = item.position || 'Unknown';
            if (!groups[position]) {
                groups[position] = [];
            }
            groups[position].push(item);
            return groups;
        }, {});
    }

    /**
     * Generate comparison summary
     * @param {Array} teams - Team comparison data
     * @returns {Object} Comparison summary
     */
    static generateComparisonSummary(teams) {
        if (teams.length === 0) return {};
        
        const bestTeam = teams.reduce((best, team) => 
            team.points > best.points ? team : best
        );
        
        const highestScoring = teams.reduce((highest, team) => 
            team.total_goals > highest.total_goals ? team : highest
        );
        
        const bestDefense = teams.reduce((best, team) => 
            team.goals_against < best.goals_against ? team : best
        );
        
        return {
            best_overall: bestTeam.team_name,
            highest_scoring: highestScoring.team_name,
            best_defense: bestDefense.team_name,
            average_points: teams.reduce((sum, team) => sum + team.points, 0) / teams.length,
            total_matches: teams.reduce((sum, team) => sum + team.matches_played, 0)
        };
    }

    /**
     * Execute custom analytical query
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Array>} Query results
     */
    static async executeCustomQuery(query, params = []) {
        try {
            // Basic security check - only allow SELECT statements
            if (!query.trim().toLowerCase().startsWith('select')) {
                throw new Error('Only SELECT queries are allowed');
            }
            
            return await db.query(query, params);
        } catch (error) {
            throw new Error(`Failed to execute custom query: ${error.message}`);
        }
    }
}

module.exports = AnalyticalQueries;