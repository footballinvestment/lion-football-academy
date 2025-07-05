const db = require('../database/connection');
const { validationResult } = require('express-validator');
const { calculateStatistics } = require('../utils/statisticsHelpers');

class AnalyticsController {
    
    // Player Analytics Methods
    async getPlayerPersonalStats(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            const dateFilter = this.getDateFilter(period, season);
            
            const query = `
                SELECT 
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.position,
                    p.level as player_level,
                    p.experience_points,
                    t.name as team_name,
                    COUNT(DISTINCT m.id) as total_matches,
                    COALESCE(SUM(mp.goals), 0) as total_goals,
                    COALESCE(SUM(mp.assists), 0) as total_assists,
                    COALESCE(AVG(mp.rating), 0) as average_rating,
                    COALESCE(AVG(a.attendance_rate), 0) as attendance_rate,
                    COUNT(DISTINCT CASE WHEN m.match_date >= ? THEN m.id END) as matches_this_period,
                    COALESCE(SUM(CASE WHEN m.match_date >= ? THEN mp.goals ELSE 0 END), 0) as goals_this_period,
                    COALESCE(SUM(CASE WHEN m.match_date >= ? THEN mp.assists ELSE 0 END), 0) as assists_this_period
                FROM users u
                LEFT JOIN players p ON u.id = p.user_id
                LEFT JOIN teams t ON p.team_id = t.id
                LEFT JOIN match_players mp ON p.id = mp.player_id
                LEFT JOIN matches m ON mp.match_id = m.id
                LEFT JOIN (
                    SELECT player_id, AVG(
                        CASE 
                            WHEN status = 'present' THEN 100
                            WHEN status = 'late' THEN 75
                            ELSE 0
                        END
                    ) as attendance_rate
                    FROM training_attendance
                    GROUP BY player_id
                ) a ON p.id = a.player_id
                WHERE u.id = ?
                GROUP BY u.id, u.first_name, u.last_name, u.position, p.level, p.experience_points, t.name
            `;
            
            const [stats] = await db.execute(query, [dateFilter, dateFilter, dateFilter, user_id]);
            
            // Get recent highlights
            const highlightsQuery = `
                SELECT 
                    'goal' as type,
                    CONCAT('Goal scored against ', opponent) as title,
                    CONCAT('Great finish in the ', FLOOR(minute), 'th minute!') as description,
                    match_date as date
                FROM matches m
                JOIN match_players mp ON m.id = mp.match_id
                JOIN players p ON mp.player_id = p.id
                WHERE p.user_id = ? AND mp.goals > 0
                ORDER BY match_date DESC
                LIMIT 5
            `;
            
            const [highlights] = await db.execute(highlightsQuery, [user_id]);
            
            const result = {
                ...stats[0],
                recent_highlights: highlights
            };
            
            res.json(result);
        } catch (error) {
            console.error('Error fetching player personal stats:', error);
            res.status(500).json({ error: 'Failed to fetch personal statistics' });
        }
    }
    
    async getPlayerPerformanceHistory(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            const dateFilter = this.getDateFilter(period, season);
            
            const query = `
                SELECT 
                    m.match_date,
                    m.opponent,
                    mp.goals,
                    mp.assists,
                    mp.rating,
                    mp.minutes_played,
                    CASE 
                        WHEN m.home_score > m.away_score THEN 'win'
                        WHEN m.home_score < m.away_score THEN 'loss'
                        ELSE 'draw'
                    END as result
                FROM matches m
                JOIN match_players mp ON m.id = mp.match_id
                JOIN players p ON mp.player_id = p.id
                WHERE p.user_id = ? AND m.match_date >= ?
                ORDER BY m.match_date DESC
            `;
            
            const [history] = await db.execute(query, [user_id, dateFilter]);
            
            res.json(history);
        } catch (error) {
            console.error('Error fetching performance history:', error);
            res.status(500).json({ error: 'Failed to fetch performance history' });
        }
    }
    
    async getPlayerSkillAssessment(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            const dateFilter = this.getDateFilter(period, season);
            
            const query = `
                SELECT 
                    sa.skill_name,
                    sa.current_level,
                    sa.target_level,
                    sa.assessment_date,
                    sa.category,
                    sa.improvement_rate
                FROM skill_assessments sa
                JOIN players p ON sa.player_id = p.id
                WHERE p.user_id = ? AND sa.assessment_date >= ?
                ORDER BY sa.assessment_date DESC
            `;
            
            const [assessments] = await db.execute(query, [user_id, dateFilter]);
            
            // Group by category
            const skillsByCategory = {
                technical: [],
                physical: [],
                mental: []
            };
            
            assessments.forEach(skill => {
                const category = skill.category || 'technical';
                if (skillsByCategory[category]) {
                    skillsByCategory[category].push({
                        name: skill.skill_name,
                        level: skill.current_level,
                        target: skill.target_level,
                        improvement: skill.improvement_rate
                    });
                }
            });
            
            // Create radar chart data
            const skillRadar = assessments.map(skill => ({
                skill: skill.skill_name,
                current_level: skill.current_level,
                target_level: skill.target_level,
                team_average: 65 // This would be calculated from team data
            }));
            
            res.json({
                technical: skillsByCategory.technical,
                physical: skillsByCategory.physical,
                mental: skillsByCategory.mental,
                skillRadar,
                skillProgress: assessments.map(skill => ({
                    skill_name: skill.skill_name,
                    current_level: skill.current_level,
                    improvement: skill.improvement_rate
                }))
            });
        } catch (error) {
            console.error('Error fetching skill assessment:', error);
            res.status(500).json({ error: 'Failed to fetch skill assessment' });
        }
    }
    
    // Parent Analytics Methods
    // Additional Player Analytics Methods
    async getPlayerGoalAnalysis(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            const dateFilter = this.getDateFilter(period, season);
            
            const query = `
                SELECT 
                    COUNT(*) as total_goals,
                    AVG(minute) as average_minute,
                    goal_type,
                    body_part,
                    assist_type
                FROM goals g
                JOIN match_players mp ON g.match_player_id = mp.id
                JOIN players p ON mp.player_id = p.id
                JOIN matches m ON mp.match_id = m.id
                WHERE p.user_id = ? AND m.match_date >= ?
                GROUP BY goal_type, body_part, assist_type
            `;
            
            const [goals] = await db.execute(query, [user_id, dateFilter]);
            
            res.json({
                goalTypes: goals,
                bodyParts: goals,
                goalTimeline: goals,
                goalMinutes: goals,
                summary: {
                    total_goals: goals.length,
                    goals_per_game: goals.length / 10, // Mock calculation
                    shooting_accuracy: 75, // Mock value
                    favorite_goal_type: 'Open Play'
                }
            });
        } catch (error) {
            console.error('Error fetching goal analysis:', error);
            res.status(500).json({ error: 'Failed to fetch goal analysis' });
        }
    }
    
    async getPlayerMatchPerformance(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            const dateFilter = this.getDateFilter(period, season);
            
            const query = `
                SELECT 
                    m.match_date,
                    m.opponent,
                    mp.goals,
                    mp.assists,
                    mp.rating,
                    mp.minutes_played,
                    mp.touches,
                    CASE 
                        WHEN m.home_score > m.away_score THEN 'win'
                        WHEN m.home_score < m.away_score THEN 'loss'
                        ELSE 'draw'
                    END as result
                FROM matches m
                JOIN match_players mp ON m.id = mp.match_id
                JOIN players p ON mp.player_id = p.id
                WHERE p.user_id = ? AND m.match_date >= ?
                ORDER BY m.match_date DESC
            `;
            
            const [performance] = await db.execute(query, [user_id, dateFilter]);
            
            res.json(performance);
        } catch (error) {
            console.error('Error fetching match performance:', error);
            res.status(500).json({ error: 'Failed to fetch match performance' });
        }
    }
    
    async getPlayerTeamContribution(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            // Mock data for team contribution
            res.json({
                player_goals: 5,
                team_goals: 25,
                player_assists: 3,
                team_average_goals: 2.1,
                team_average_assists: 1.5,
                player_rating: 7.8,
                team_average_rating: 7.2,
                goal_percentage: 20,
                assist_percentage: 15,
                rating_rank: 3,
                team_size: 15
            });
        } catch (error) {
            console.error('Error fetching team contribution:', error);
            res.status(500).json({ error: 'Failed to fetch team contribution' });
        }
    }
    
    async getPlayerImprovements(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            // Mock data for improvements
            res.json([
                {
                    assessment_date: '2024-01-15',
                    skill_level: 75,
                    confidence: 80,
                    teamwork: 85,
                    training_attendance: 95,
                    practice_hours: 12
                },
                {
                    assessment_date: '2024-02-15',
                    skill_level: 78,
                    confidence: 82,
                    teamwork: 87,
                    training_attendance: 93,
                    practice_hours: 14
                }
            ]);
        } catch (error) {
            console.error('Error fetching improvements:', error);
            res.status(500).json({ error: 'Failed to fetch improvements' });
        }
    }
    
    // Parent Analytics Methods
    async getParentChildren(req, res) {
        try {
            const { user_id } = req.user;
            
            const query = `
                SELECT 
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.birth_date,
                    u.position,
                    u.profile_picture,
                    t.name as team_name
                FROM users u
                JOIN players p ON u.id = p.user_id
                LEFT JOIN teams t ON p.team_id = t.id
                JOIN parent_child_relationships pcr ON p.id = pcr.child_id
                WHERE pcr.parent_id = (SELECT id FROM players WHERE user_id = ?)
            `;
            
            const [children] = await db.execute(query, [user_id]);
            
            res.json(children);
        } catch (error) {
            console.error('Error fetching children:', error);
            res.status(500).json({ error: 'Failed to fetch children data' });
        }
    }

    async getParentChildProgress(req, res) {
        try {
            const { user_id } = req.user;
            const { child_id, period = 'month' } = req.query;
            
            const dateFilter = this.getDateFilter(period);
            
            const query = `
                SELECT 
                    u.first_name,
                    u.last_name,
                    u.position,
                    p.level as player_level,
                    p.experience_points,
                    t.name as team_name,
                    COUNT(DISTINCT m.id) as total_matches,
                    COALESCE(SUM(mp.goals), 0) as total_goals,
                    COALESCE(SUM(mp.assists), 0) as total_assists,
                    COALESCE(AVG(mp.rating), 0) as average_rating,
                    COALESCE(AVG(CASE WHEN ta.status = 'present' THEN 100 WHEN ta.status = 'late' THEN 75 ELSE 0 END), 0) as attendance_rate,
                    COUNT(DISTINCT CASE WHEN m.match_date >= ? THEN m.id END) as matches_this_period,
                    COALESCE(SUM(CASE WHEN m.match_date >= ? THEN mp.goals ELSE 0 END), 0) as goals_this_period,
                    COALESCE(SUM(CASE WHEN m.match_date >= ? THEN mp.assists ELSE 0 END), 0) as assists_this_period
                FROM users u
                JOIN players p ON u.id = p.user_id
                LEFT JOIN teams t ON p.team_id = t.id
                LEFT JOIN match_players mp ON p.id = mp.player_id
                LEFT JOIN matches m ON mp.match_id = m.id
                LEFT JOIN training_attendance ta ON p.id = ta.player_id
                WHERE u.id = ? AND p.id IN (
                    SELECT child_id FROM parent_child_relationships 
                    WHERE parent_id = (SELECT id FROM players WHERE user_id = ?)
                )
                GROUP BY u.id, u.first_name, u.last_name, u.position, p.level, p.experience_points, t.name
            `;
            
            const [progress] = await db.execute(query, [dateFilter, dateFilter, dateFilter, child_id, user_id]);
            
            res.json(progress[0] || {});
        } catch (error) {
            console.error('Error fetching child progress:', error);
            res.status(500).json({ error: 'Failed to fetch child progress' });
        }
    }
    
    async getParentSkillDevelopment(req, res) {
        try {
            const { child_id } = req.query;
            
            // Mock skill development data
            res.json({
                skillRadar: [
                    { skill: 'Passing', current_level: 75, target_level: 85, age_group_average: 70 },
                    { skill: 'Shooting', current_level: 80, target_level: 90, age_group_average: 75 },
                    { skill: 'Dribbling', current_level: 70, target_level: 80, age_group_average: 68 }
                ],
                skillProgress: [
                    { skill_name: 'Passing', current_level: 75, improvement: 5 },
                    { skill_name: 'Shooting', current_level: 80, improvement: 8 }
                ],
                technical: [
                    { name: 'Ball Control', level: 75 },
                    { name: 'Passing', level: 80 }
                ],
                physical: [
                    { name: 'Speed', level: 70 },
                    { name: 'Strength', level: 65 }
                ],
                mental: [
                    { name: 'Decision Making', level: 78 },
                    { name: 'Positioning', level: 72 }
                ]
            });
        } catch (error) {
            console.error('Error fetching skill development:', error);
            res.status(500).json({ error: 'Failed to fetch skill development' });
        }
    }
    
    async getParentAttendanceAnalysis(req, res) {
        try {
            const { child_id } = req.query;
            
            // Mock attendance data
            res.json({
                summary: {
                    present: 18,
                    absent: 2,
                    late: 1,
                    overall_rate: 90,
                    training_rate: 85,
                    match_rate: 95,
                    punctuality_rate: 95
                },
                trends: [
                    { period: 'Week 1', training_rate: 100, match_rate: 100 },
                    { period: 'Week 2', training_rate: 80, match_rate: 100 }
                ],
                performanceCorrelation: [
                    { period: 'Month 1', performance_rating: 7.5, attendance_rate: 90 },
                    { period: 'Month 2', performance_rating: 8.0, attendance_rate: 95 }
                ]
            });
        } catch (error) {
            console.error('Error fetching attendance analysis:', error);
            res.status(500).json({ error: 'Failed to fetch attendance analysis' });
        }
    }
    
    async getParentPerformanceTrends(req, res) {
        try {
            const { child_id } = req.query;
            
            // Mock performance trends
            res.json([
                {
                    match_date: '2024-01-15',
                    goals: 1,
                    assists: 0,
                    rating: 7.5,
                    minutes_played: 90,
                    touches: 45
                },
                {
                    match_date: '2024-01-22',
                    goals: 0,
                    assists: 2,
                    rating: 8.0,
                    minutes_played: 85,
                    touches: 52
                }
            ]);
        } catch (error) {
            console.error('Error fetching performance trends:', error);
            res.status(500).json({ error: 'Failed to fetch performance trends' });
        }
    }
    
    async getParentPeerComparison(req, res) {
        try {
            const { child_id } = req.query;
            
            // Mock peer comparison data
            res.json({
                child_goals: 5,
                peer_average_goals: 3.2,
                top_performer_goals: 8,
                skillComparison: [
                    { skill: 'Passing', child_level: 75, peer_average: 70 },
                    { skill: 'Shooting', child_level: 80, peer_average: 75 }
                ],
                statistics: [
                    {
                        metric_name: 'Goals',
                        child_value: 5,
                        peer_average: 3.2,
                        child_percentile: 75
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching peer comparison:', error);
            res.status(500).json({ error: 'Failed to fetch peer comparison' });
        }
    }
    
    async getParentAchievementTimeline(req, res) {
        try {
            const { child_id } = req.query;
            
            // Mock achievement data
            res.json([
                {
                    title: 'First Goal',
                    description: 'Scored first goal of the season',
                    type: 'goal',
                    level: 'Bronze',
                    earned_date: '2024-01-15'
                },
                {
                    title: 'Team Player',
                    description: 'Made 5 assists in a month',
                    type: 'skill',
                    level: 'Silver',
                    earned_date: '2024-02-01'
                }
            ]);
        } catch (error) {
            console.error('Error fetching achievement timeline:', error);
            res.status(500).json({ error: 'Failed to fetch achievement timeline' });
        }
    }
    
    // Coach Analytics Methods
    async getCoachTeams(req, res) {
        try {
            const { user_id } = req.user;
            
            const query = `
                SELECT 
                    t.id,
                    t.name,
                    t.age_group,
                    COUNT(p.id) as player_count
                FROM teams t
                LEFT JOIN players p ON t.id = p.team_id
                WHERE t.coach_id = (SELECT id FROM coaches WHERE user_id = ?)
                GROUP BY t.id, t.name, t.age_group
            `;
            
            const [teams] = await db.execute(query, [user_id]);
            
            res.json(teams);
        } catch (error) {
            console.error('Error fetching teams:', error);
            res.status(500).json({ error: 'Failed to fetch teams' });
        }
    }
    
    async getCoachTrainingEffectiveness(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            // Mock training effectiveness data
            res.json([
                {
                    training_date: '2024-01-15',
                    training_type: 'Technical',
                    attendance_rate: 90,
                    performance_improvement: 5,
                    drill_completion_rate: 85,
                    skill_assessment_score: 78
                },
                {
                    training_date: '2024-01-18',
                    training_type: 'Physical',
                    attendance_rate: 95,
                    performance_improvement: 8,
                    drill_completion_rate: 92,
                    skill_assessment_score: 82
                }
            ]);
        } catch (error) {
            console.error('Error fetching training effectiveness:', error);
            res.status(500).json({ error: 'Failed to fetch training effectiveness' });
        }
    }
    
    async getCoachMatchAnalysis(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            // Mock match analysis data
            res.json([
                {
                    match_date: '2024-01-15',
                    opponent: 'Team A',
                    goals_for: 3,
                    goals_against: 1,
                    possession_percentage: 65,
                    pass_accuracy: 85,
                    shots_on_target: 8
                },
                {
                    match_date: '2024-01-22',
                    opponent: 'Team B',
                    goals_for: 2,
                    goals_against: 2,
                    possession_percentage: 55,
                    pass_accuracy: 78,
                    shots_on_target: 6
                }
            ]);
        } catch (error) {
            console.error('Error fetching match analysis:', error);
            res.status(500).json({ error: 'Failed to fetch match analysis' });
        }
    }
    
    async getCoachDevelopmentTracking(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            // Mock development tracking data
            res.json({
                skillAverages: [
                    { skill: 'Passing', current_level: 75, target_level: 85, league_average: 70 },
                    { skill: 'Shooting', current_level: 70, target_level: 80, league_average: 68 }
                ],
                progressOverTime: [
                    {
                        assessment_date: '2024-01-01',
                        technical_skills: 70,
                        physical_skills: 65,
                        mental_skills: 75,
                        social_skills: 80
                    }
                ],
                milestones: [
                    {
                        title: 'Team Passing Accuracy',
                        description: 'Achieve 85% team passing accuracy',
                        target_date: '2024-06-01',
                        progress_percentage: 75,
                        achieved: false
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching development tracking:', error);
            res.status(500).json({ error: 'Failed to fetch development tracking' });
        }
    }
    
    async getCoachComparativeStats(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            // Mock comparative stats data
            res.json({
                teamComparison: [
                    { team_name: 'Our Team', goals_scored: 25, goals_conceded: 8 },
                    { team_name: 'Team A', goals_scored: 20, goals_conceded: 12 },
                    { team_name: 'Team B', goals_scored: 18, goals_conceded: 15 }
                ],
                leaguePosition: [
                    { round: 1, position: 3, points: 3 },
                    { round: 2, position: 2, points: 6 },
                    { round: 3, position: 1, points: 9 }
                ],
                leagueTable: [
                    {
                        position: 1,
                        team_name: 'Our Team',
                        played: 10,
                        won: 8,
                        drawn: 1,
                        lost: 1,
                        goals_for: 25,
                        goals_against: 8,
                        goal_difference: 17,
                        points: 25,
                        is_current_team: true
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching comparative stats:', error);
            res.status(500).json({ error: 'Failed to fetch comparative stats' });
        }
    }
    
    // Coach Analytics Methods
    async getCoachOverview(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            const dateFilter = this.getDateFilter(period);
            
            let teamFilter = '';
            let queryParams = [user_id, dateFilter, dateFilter];
            
            if (team_id && team_id !== 'all') {
                teamFilter = 'AND t.id = ?';
                queryParams.push(team_id);
            }
            
            const query = `
                SELECT 
                    COUNT(DISTINCT t.id) as total_teams,
                    COUNT(DISTINCT p.id) as total_players,
                    COUNT(DISTINCT m.id) as total_matches,
                    COALESCE(SUM(CASE WHEN m.match_date >= ? THEN m.home_score ELSE 0 END), 0) as total_goals,
                    COALESCE(SUM(CASE WHEN m.match_date >= ? THEN m.away_score ELSE 0 END), 0) as total_goals_against,
                    COALESCE(AVG(mp.rating), 0) as average_rating,
                    COUNT(DISTINCT CASE WHEN m.home_score > m.away_score THEN m.id END) as wins,
                    COUNT(DISTINCT CASE WHEN m.home_score = m.away_score THEN m.id END) as draws,
                    COUNT(DISTINCT CASE WHEN m.home_score < m.away_score THEN m.id END) as losses
                FROM coaches c
                JOIN teams t ON c.id = t.coach_id
                LEFT JOIN players p ON t.id = p.team_id
                LEFT JOIN match_players mp ON p.id = mp.player_id
                LEFT JOIN matches m ON mp.match_id = m.id
                WHERE c.user_id = ? ${teamFilter}
                GROUP BY c.id
            `;
            
            const [overview] = await db.execute(query, queryParams);
            
            const result = overview[0] || {};
            result.win_rate = result.total_matches > 0 ? 
                ((result.wins / result.total_matches) * 100).toFixed(1) : 0;
            
            res.json(result);
        } catch (error) {
            console.error('Error fetching coach overview:', error);
            res.status(500).json({ error: 'Failed to fetch coach overview' });
        }
    }
    
    async getCoachPlayerPerformance(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            const dateFilter = this.getDateFilter(period);
            
            let teamFilter = '';
            let queryParams = [user_id, dateFilter];
            
            if (team_id && team_id !== 'all') {
                teamFilter = 'AND t.id = ?';
                queryParams.push(team_id);
            }
            
            const query = `
                SELECT 
                    u.first_name,
                    u.last_name,
                    CONCAT(u.first_name, ' ', u.last_name) as player_name,
                    u.position,
                    COUNT(DISTINCT m.id) as matches_played,
                    COALESCE(SUM(mp.goals), 0) as goals,
                    COALESCE(SUM(mp.assists), 0) as assists,
                    COALESCE(AVG(mp.rating), 0) as average_rating,
                    COALESCE(SUM(mp.minutes_played), 0) as minutes_played
                FROM coaches c
                JOIN teams t ON c.id = t.coach_id
                JOIN players p ON t.id = p.team_id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN match_players mp ON p.id = mp.player_id
                LEFT JOIN matches m ON mp.match_id = m.id AND m.match_date >= ?
                WHERE c.user_id = ? ${teamFilter}
                GROUP BY u.id, u.first_name, u.last_name, u.position
                ORDER BY average_rating DESC, goals DESC
            `;
            
            const [performance] = await db.execute(query, queryParams);
            
            res.json(performance);
        } catch (error) {
            console.error('Error fetching player performance:', error);
            res.status(500).json({ error: 'Failed to fetch player performance' });
        }
    }
    
    // Utility Methods
    getDateFilter(period, season = 'current') {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case 'season':
                // Football season typically runs Sept-May
                if (season === 'current') {
                    if (now.getMonth() >= 8) { // September onwards
                        startDate = new Date(now.getFullYear(), 8, 1);
                    } else {
                        startDate = new Date(now.getFullYear() - 1, 8, 1);
                    }
                } else {
                    startDate = new Date(now.getFullYear() - 1, 8, 1);
                }
                break;
            case 'year':
                startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        }
        
        return startDate.toISOString().split('T')[0];
    }
    
    // Export/Share Methods
    async sharePlayerStats(req, res) {
        try {
            const { user_id } = req.user;
            const { period = 'season', season = 'current' } = req.query;
            
            // This would generate a PDF report
            // For now, we'll return a success response
            res.json({ message: 'Stats shared successfully' });
        } catch (error) {
            console.error('Error sharing stats:', error);
            res.status(500).json({ error: 'Failed to share stats' });
        }
    }
    
    async generateParentReport(req, res) {
        try {
            const { user_id } = req.user;
            const { child_id, period = 'month' } = req.query;
            
            // This would generate a PDF report
            // For now, we'll return a success response
            res.json({ message: 'Report generated successfully' });
        } catch (error) {
            console.error('Error generating report:', error);
            res.status(500).json({ error: 'Failed to generate report' });
        }
    }
    
    async exportCoachAnalytics(req, res) {
        try {
            const { user_id } = req.user;
            const { team_id, period = 'month' } = req.query;
            
            // This would generate a PDF report
            // For now, we'll return a success response
            res.json({ message: 'Analytics exported successfully' });
        } catch (error) {
            console.error('Error exporting analytics:', error);
            res.status(500).json({ error: 'Failed to export analytics' });
        }
    }
}

module.exports = new AnalyticsController();