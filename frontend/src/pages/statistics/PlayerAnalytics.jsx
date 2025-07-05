import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { LineChart, BarChart, PieChart, AreaChart, RadarChart } from '../../components/charts';
import { api } from '../../services/api';
import { 
    transformPlayerData, 
    calculateStatistics, 
    calculateTrend,
    getChartConfig,
    calculatePerformanceGrade 
} from '../../utils/chartConfig';
import './Analytics.css';

const PlayerAnalytics = () => {
    const { user } = useAuth();
    const [analyticsData, setAnalyticsData] = useState({
        personalStats: {},
        performanceHistory: [],
        skillAssessment: [],
        goalAnalysis: [],
        matchPerformance: [],
        teamContribution: {},
        improvements: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedPeriod, setSelectedPeriod] = useState('season');
    const [selectedSeason, setSelectedSeason] = useState('current');

    useEffect(() => {
        fetchAnalyticsData();
    }, [selectedPeriod, selectedSeason]);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams({
                period: selectedPeriod,
                season: selectedSeason
            });

            const [
                statsRes,
                historyRes,
                skillsRes,
                goalsRes,
                matchRes,
                teamRes,
                improvementRes
            ] = await Promise.all([
                api.get(`/player/analytics/personal-stats?${params}`),
                api.get(`/player/analytics/performance-history?${params}`),
                api.get(`/player/analytics/skill-assessment?${params}`),
                api.get(`/player/analytics/goal-analysis?${params}`),
                api.get(`/player/analytics/match-performance?${params}`),
                api.get(`/player/analytics/team-contribution?${params}`),
                api.get(`/player/analytics/improvements?${params}`)
            ]);

            setAnalyticsData({
                personalStats: statsRes.data,
                performanceHistory: historyRes.data,
                skillAssessment: skillsRes.data,
                goalAnalysis: goalsRes.data,
                matchPerformance: matchRes.data,
                teamContribution: teamRes.data,
                improvements: improvementRes.data
            });
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setError('Failed to load your analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const shareStats = async () => {
        try {
            const response = await api.get('/player/analytics/share-stats', {
                params: { period: selectedPeriod, season: selectedSeason },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `my_football_stats_${selectedPeriod}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error sharing stats:', error);
            setError('Failed to generate stats report.');
        }
    };

    if (loading) {
        return (
            <div className="player-analytics">
                <div className="player-analytics__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading your football analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="player-analytics">
            {/* Header */}
            <div className="player-analytics__header">
                <div className="player-analytics__header-content">
                    <div className="player-analytics__title">
                        <h1>📊 My Football Analytics</h1>
                        <p>Track your progress and see how awesome you're becoming! ⚽</p>
                    </div>
                    <div className="player-analytics__header-actions">
                        <select 
                            className="player-analytics__period-filter"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="season">This Season</option>
                        </select>
                        <select 
                            className="player-analytics__season-filter"
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                        >
                            <option value="current">Current Season</option>
                            <option value="previous">Previous Season</option>
                        </select>
                        <Button 
                            onClick={shareStats}
                            variant="secondary"
                        >
                            📤 Share My Stats
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Player Info Banner */}
            <div className="player-analytics__player-banner">
                <div className="player-analytics__player-info">
                    <div className="player-analytics__player-avatar">
                        {user?.profile_picture ? (
                            <img src={user.profile_picture} alt={user.first_name} />
                        ) : (
                            <div className="player-analytics__player-initials">
                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                            </div>
                        )}
                    </div>
                    <div className="player-analytics__player-details">
                        <h2>🌟 {user?.first_name} {user?.last_name}</h2>
                        <p>
                            {user?.position || 'Player'} • 
                            Level {analyticsData.personalStats.player_level || 1} • 
                            {analyticsData.personalStats.team_name || 'Lion Football Academy'}
                        </p>
                        <div className="player-analytics__xp-bar">
                            <div className="player-analytics__xp-fill" 
                                 style={{ width: `${(analyticsData.personalStats.experience_points % 100)}%` }}>
                            </div>
                            <span className="player-analytics__xp-text">
                                {analyticsData.personalStats.experience_points || 0} XP
                            </span>
                        </div>
                    </div>
                    <div className="player-analytics__player-stats">
                        <div className="player-analytics__quick-stat">
                            <span className="player-analytics__stat-value">
                                {analyticsData.personalStats.total_goals || 0}
                            </span>
                            <span className="player-analytics__stat-label">⚽ Goals</span>
                        </div>
                        <div className="player-analytics__quick-stat">
                            <span className="player-analytics__stat-value">
                                {analyticsData.personalStats.total_assists || 0}
                            </span>
                            <span className="player-analytics__stat-label">🎯 Assists</span>
                        </div>
                        <div className="player-analytics__quick-stat">
                            <span className="player-analytics__stat-value">
                                {analyticsData.personalStats.average_rating?.toFixed(1) || '0.0'}
                            </span>
                            <span className="player-analytics__stat-label">⭐ Rating</span>
                        </div>
                    </div>
                </div>
            </div>

            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="overview">My Overview</Tabs.Trigger>
                        <Tabs.Trigger value="skills">Skill Development</Tabs.Trigger>
                        <Tabs.Trigger value="goals">Goal Analysis</Tabs.Trigger>
                        <Tabs.Trigger value="matches">Match Performance</Tabs.Trigger>
                        <Tabs.Trigger value="team">Team Contribution</Tabs.Trigger>
                        <Tabs.Trigger value="growth">My Growth</Tabs.Trigger>
                    </Tabs.List>

                    {/* Overview Tab */}
                    <Tabs.Content value="overview">
                        <div className="player-analytics__section">
                            <h3>🏆 Your Football Journey</h3>
                            
                            {/* Achievement Cards */}
                            <div className="player-analytics__achievement-cards">
                                <div className="player-analytics__achievement-card">
                                    <div className="player-analytics__achievement-icon">⚽</div>
                                    <div className="player-analytics__achievement-content">
                                        <h4>Goals This {selectedPeriod}</h4>
                                        <div className="player-analytics__achievement-value">
                                            {analyticsData.personalStats.goals_this_period || 0}
                                        </div>
                                        <p className="player-analytics__achievement-progress">
                                            {calculateTrend(analyticsData.performanceHistory, 'goals') > 0 ? '🔥' : '💪'} 
                                            {calculateTrend(analyticsData.performanceHistory, 'goals') > 0 ? 'On fire!' : 'Keep going!'}
                                        </p>
                                    </div>
                                </div>

                                <div className="player-analytics__achievement-card">
                                    <div className="player-analytics__achievement-icon">🎯</div>
                                    <div className="player-analytics__achievement-content">
                                        <h4>Assist Hero</h4>
                                        <div className="player-analytics__achievement-value">
                                            {analyticsData.personalStats.assists_this_period || 0}
                                        </div>
                                        <p className="player-analytics__achievement-progress">
                                            Great teamwork! 🤝
                                        </p>
                                    </div>
                                </div>

                                <div className="player-analytics__achievement-card">
                                    <div className="player-analytics__achievement-icon">⭐</div>
                                    <div className="player-analytics__achievement-content">
                                        <h4>Performance Level</h4>
                                        <div className="player-analytics__achievement-value">
                                            {calculatePerformanceGrade(analyticsData.personalStats.average_rating)}
                                        </div>
                                        <p className="player-analytics__achievement-progress">
                                            {analyticsData.personalStats.average_rating?.toFixed(1) || '0.0'}/10 average rating
                                        </p>
                                    </div>
                                </div>

                                <div className="player-analytics__achievement-card">
                                    <div className="player-analytics__achievement-icon">📅</div>
                                    <div className="player-analytics__achievement-content">
                                        <h4>Attendance Star</h4>
                                        <div className="player-analytics__achievement-value">
                                            {analyticsData.personalStats.attendance_rate || 0}%
                                        </div>
                                        <p className="player-analytics__achievement-progress">
                                            {analyticsData.personalStats.attendance_rate >= 90 ? 'Perfect! 🌟' : 'Good effort! 👍'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Charts */}
                            <div className="player-analytics__charts-grid">
                                <LineChart
                                    data={transformPlayerData(analyticsData.performanceHistory, 'performance')}
                                    lines={[
                                        { dataKey: 'goals', name: 'Goals per Game', color: '#27AE60' },
                                        { dataKey: 'assists', name: 'Assists per Game', color: '#3498DB' },
                                        { dataKey: 'rating', name: 'Match Rating', color: '#F39C12' }
                                    ]}
                                    title="📈 Your Performance Journey"
                                    subtitle="See how you're improving over time!"
                                    {...getChartConfig('performance')}
                                />

                                <PieChart
                                    data={[
                                        { name: 'Goals', value: analyticsData.personalStats.total_goals || 0 },
                                        { name: 'Assists', value: analyticsData.personalStats.total_assists || 0 },
                                        { name: 'Key Passes', value: analyticsData.personalStats.key_passes || 0 }
                                    ]}
                                    title="🎯 Your Contribution Mix"
                                    subtitle="How you help your team score!"
                                    {...getChartConfig('distribution')}
                                />
                            </div>

                            {/* Recent Highlights */}
                            <div className="player-analytics__highlights">
                                <h4>🌟 Recent Highlights</h4>
                                <div className="player-analytics__highlights-list">
                                    {analyticsData.personalStats.recent_highlights?.map((highlight, index) => (
                                        <div key={index} className="player-analytics__highlight-item">
                                            <div className="player-analytics__highlight-icon">
                                                {highlight.type === 'goal' && '⚽'}
                                                {highlight.type === 'assist' && '🎯'}
                                                {highlight.type === 'performance' && '⭐'}
                                                {highlight.type === 'skill' && '💪'}
                                            </div>
                                            <div className="player-analytics__highlight-content">
                                                <h5>{highlight.title}</h5>
                                                <p>{highlight.description}</p>
                                                <span className="player-analytics__highlight-date">
                                                    {new Date(highlight.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="player-analytics__empty-state">
                                            <p>Keep playing to create amazing highlights! 🌟</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Skills Tab */}
                    <Tabs.Content value="skills">
                        <div className="player-analytics__section">
                            <h3>💪 Your Skill Development</h3>
                            
                            <div className="player-analytics__charts-grid">
                                <RadarChart
                                    data={analyticsData.skillAssessment.skillRadar || []}
                                    radars={[
                                        { dataKey: 'current_level', name: 'Your Level', color: '#3498DB' },
                                        { dataKey: 'target_level', name: 'Target Level', color: '#27AE60' },
                                        { dataKey: 'team_average', name: 'Team Average', color: '#95A5A6' }
                                    ]}
                                    title="🕷️ Your Skill Spider"
                                    subtitle="See your strengths and areas to improve!"
                                    {...getChartConfig('skills')}
                                />

                                <BarChart
                                    data={analyticsData.skillAssessment.skillProgress || []}
                                    bars={[
                                        { dataKey: 'improvement', name: 'Improvement', color: '#27AE60' },
                                        { dataKey: 'current_level', name: 'Current Level', color: '#3498DB' }
                                    ]}
                                    xAxisKey="skill_name"
                                    title="📊 Skill Improvements"
                                    subtitle="How much you've improved in each skill!"
                                    {...getChartConfig('comparison')}
                                />
                            </div>

                            {/* Skill Categories with Fun Icons */}
                            <div className="player-analytics__skill-categories">
                                <div className="player-analytics__skill-category">
                                    <h4>⚽ Ball Skills</h4>
                                    <div className="player-analytics__skill-bars">
                                        {analyticsData.skillAssessment.technical?.map((skill, index) => (
                                            <div key={index} className="player-analytics__skill-bar">
                                                <span className="player-analytics__skill-name">
                                                    {skill.name}
                                                    {skill.level >= 80 && ' 🔥'}
                                                    {skill.level >= 60 && skill.level < 80 && ' 👍'}
                                                    {skill.level < 60 && ' 💪'}
                                                </span>
                                                <div className="player-analytics__skill-progress">
                                                    <div 
                                                        className="player-analytics__skill-fill"
                                                        style={{ width: `${skill.level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="player-analytics__skill-level">{skill.level}%</span>
                                            </div>
                                        )) || <p>Keep training to unlock ball skills data! ⚽</p>}
                                    </div>
                                </div>

                                <div className="player-analytics__skill-category">
                                    <h4>🏃 Athletic Skills</h4>
                                    <div className="player-analytics__skill-bars">
                                        {analyticsData.skillAssessment.physical?.map((skill, index) => (
                                            <div key={index} className="player-analytics__skill-bar">
                                                <span className="player-analytics__skill-name">
                                                    {skill.name}
                                                    {skill.level >= 80 && ' ⚡'}
                                                    {skill.level >= 60 && skill.level < 80 && ' 💪'}
                                                    {skill.level < 60 && ' 🏃'}
                                                </span>
                                                <div className="player-analytics__skill-progress">
                                                    <div 
                                                        className="player-analytics__skill-fill"
                                                        style={{ width: `${skill.level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="player-analytics__skill-level">{skill.level}%</span>
                                            </div>
                                        )) || <p>Keep training to unlock athletic skills data! 🏃</p>}
                                    </div>
                                </div>

                                <div className="player-analytics__skill-category">
                                    <h4>🧠 Game Intelligence</h4>
                                    <div className="player-analytics__skill-bars">
                                        {analyticsData.skillAssessment.mental?.map((skill, index) => (
                                            <div key={index} className="player-analytics__skill-bar">
                                                <span className="player-analytics__skill-name">
                                                    {skill.name}
                                                    {skill.level >= 80 && ' 🧠'}
                                                    {skill.level >= 60 && skill.level < 80 && ' 💡'}
                                                    {skill.level < 60 && ' 🤔'}
                                                </span>
                                                <div className="player-analytics__skill-progress">
                                                    <div 
                                                        className="player-analytics__skill-fill"
                                                        style={{ width: `${skill.level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="player-analytics__skill-level">{skill.level}%</span>
                                            </div>
                                        )) || <p>Keep learning to unlock mental skills data! 🧠</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Goals Tab */}
                    <Tabs.Content value="goals">
                        <div className="player-analytics__section">
                            <h3>⚽ Your Goal-Scoring Story</h3>
                            
                            <div className="player-analytics__charts-grid">
                                <BarChart
                                    data={analyticsData.goalAnalysis.goalTypes || []}
                                    bars={[{ dataKey: 'count', name: 'Goals', color: '#27AE60' }]}
                                    xAxisKey="goal_type"
                                    title="🎯 How You Score"
                                    subtitle="Different types of goals you've scored!"
                                    {...getChartConfig('comparison')}
                                />

                                <PieChart
                                    data={analyticsData.goalAnalysis.bodyParts || []}
                                    title="🦶 Scoring Body Parts"
                                    subtitle="Which part of your body scores most!"
                                    {...getChartConfig('distribution')}
                                />
                            </div>

                            <div className="player-analytics__charts-grid">
                                <LineChart
                                    data={analyticsData.goalAnalysis.goalTimeline || []}
                                    lines={[
                                        { dataKey: 'goals', name: 'Goals', color: '#27AE60' },
                                        { dataKey: 'shots', name: 'Shots', color: '#3498DB' }
                                    ]}
                                    xAxisKey="match_date"
                                    title="📈 Goal Scoring Progress"
                                    subtitle="Your goal-scoring journey over time!"
                                    {...getChartConfig('performance')}
                                />

                                <BarChart
                                    data={analyticsData.goalAnalysis.goalMinutes || []}
                                    bars={[{ dataKey: 'goals', name: 'Goals', color: '#F39C12' }]}
                                    xAxisKey="minute_range"
                                    title="⏰ When You Score"
                                    subtitle="Which parts of the game you score in!"
                                    {...getChartConfig('comparison')}
                                />
                            </div>

                            {/* Goal Statistics */}
                            <div className="player-analytics__goal-stats">
                                <h4>🏆 Your Goal Stats</h4>
                                <div className="player-analytics__stats-grid">
                                    <div className="player-analytics__stat-item">
                                        <span className="player-analytics__stat-label">Total Goals</span>
                                        <span className="player-analytics__stat-value">
                                            {analyticsData.goalAnalysis.summary?.total_goals || 0} ⚽
                                        </span>
                                    </div>
                                    <div className="player-analytics__stat-item">
                                        <span className="player-analytics__stat-label">Goals per Game</span>
                                        <span className="player-analytics__stat-value">
                                            {analyticsData.goalAnalysis.summary?.goals_per_game?.toFixed(1) || '0.0'} 📊
                                        </span>
                                    </div>
                                    <div className="player-analytics__stat-item">
                                        <span className="player-analytics__stat-label">Shooting Accuracy</span>
                                        <span className="player-analytics__stat-value">
                                            {analyticsData.goalAnalysis.summary?.shooting_accuracy || 0}% 🎯
                                        </span>
                                    </div>
                                    <div className="player-analytics__stat-item">
                                        <span className="player-analytics__stat-label">Favorite Goal Type</span>
                                        <span className="player-analytics__stat-value">
                                            {analyticsData.goalAnalysis.summary?.favorite_goal_type || 'Open Play'} ⭐
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Matches Tab */}
                    <Tabs.Content value="matches">
                        <div className="player-analytics__section">
                            <h3>🏟️ Your Match Performances</h3>
                            
                            <div className="player-analytics__charts-grid">
                                <LineChart
                                    data={analyticsData.matchPerformance}
                                    lines={[
                                        { dataKey: 'rating', name: 'Match Rating', color: '#F39C12' },
                                        { dataKey: 'goals', name: 'Goals', color: '#27AE60' },
                                        { dataKey: 'assists', name: 'Assists', color: '#3498DB' }
                                    ]}
                                    xAxisKey="match_date"
                                    title="📊 Match by Match Progress"
                                    subtitle="Your performance in each game!"
                                    {...getChartConfig('performance')}
                                />

                                <AreaChart
                                    data={analyticsData.matchPerformance}
                                    areas={[
                                        { dataKey: 'minutes_played', name: 'Minutes Played', color: '#9B59B6' },
                                        { dataKey: 'touches', name: 'Ball Touches', color: '#1ABC9C' }
                                    ]}
                                    xAxisKey="match_date"
                                    title="⏱️ Game Time & Involvement"
                                    subtitle="How much you played and touched the ball!"
                                    {...getChartConfig('trend')}
                                />
                            </div>

                            {/* Match Performance Table */}
                            <div className="player-analytics__match-table">
                                <h4>📋 Recent Match Details</h4>
                                <div className="player-analytics__table-wrapper">
                                    <table className="player-analytics__table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Opponent</th>
                                                <th>Result</th>
                                                <th>Goals</th>
                                                <th>Assists</th>
                                                <th>Rating</th>
                                                <th>Minutes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsData.matchPerformance.slice(0, 10).map((match, index) => (
                                                <tr key={index}>
                                                    <td>{new Date(match.match_date).toLocaleDateString()}</td>
                                                    <td>{match.opponent}</td>
                                                    <td className={`player-analytics__result player-analytics__result--${match.result}`}>
                                                        {match.result === 'win' && '🏆 Win'}
                                                        {match.result === 'draw' && '🤝 Draw'}
                                                        {match.result === 'loss' && '😔 Loss'}
                                                    </td>
                                                    <td>{match.goals || 0} ⚽</td>
                                                    <td>{match.assists || 0} 🎯</td>
                                                    <td className="player-analytics__rating">
                                                        {match.rating?.toFixed(1) || '0.0'} ⭐
                                                    </td>
                                                    <td>{match.minutes_played || 0} min</td>
                                                </tr>
                                            )) || (
                                                <tr>
                                                    <td colSpan="7" className="player-analytics__no-data">
                                                        No match data available yet. Keep playing! 🌟
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Team Tab */}
                    <Tabs.Content value="team">
                        <div className="player-analytics__section">
                            <h3>🤝 Your Team Contribution</h3>
                            
                            <div className="player-analytics__charts-grid">
                                <PieChart
                                    data={[
                                        { name: 'Your Goals', value: analyticsData.teamContribution.player_goals || 0 },
                                        { name: 'Team Goals', value: (analyticsData.teamContribution.team_goals || 0) - (analyticsData.teamContribution.player_goals || 0) }
                                    ]}
                                    title="⚽ Goal Contribution"
                                    subtitle="How many team goals you've scored!"
                                    {...getChartConfig('distribution')}
                                />

                                <BarChart
                                    data={[
                                        { name: 'Goals', you: analyticsData.teamContribution.player_goals || 0, team: analyticsData.teamContribution.team_average_goals || 0 },
                                        { name: 'Assists', you: analyticsData.teamContribution.player_assists || 0, team: analyticsData.teamContribution.team_average_assists || 0 },
                                        { name: 'Rating', you: analyticsData.teamContribution.player_rating || 0, team: analyticsData.teamContribution.team_average_rating || 0 }
                                    ]}
                                    bars={[
                                        { dataKey: 'you', name: 'You', color: '#3498DB' },
                                        { dataKey: 'team', name: 'Team Average', color: '#95A5A6' }
                                    ]}
                                    xAxisKey="name"
                                    title="📊 You vs Team Average"
                                    subtitle="How you compare to your teammates!"
                                    {...getChartConfig('comparison')}
                                />
                            </div>

                            {/* Team Impact */}
                            <div className="player-analytics__team-impact">
                                <h4>🌟 Your Impact on the Team</h4>
                                <div className="player-analytics__impact-cards">
                                    <div className="player-analytics__impact-card">
                                        <div className="player-analytics__impact-icon">⚽</div>
                                        <div className="player-analytics__impact-content">
                                            <h5>Goal Scorer</h5>
                                            <p>
                                                You've scored {analyticsData.teamContribution.goal_percentage || 0}% 
                                                of your team's goals! 
                                                {analyticsData.teamContribution.goal_percentage >= 20 && ' 🔥'}
                                                {analyticsData.teamContribution.goal_percentage >= 10 && analyticsData.teamContribution.goal_percentage < 20 && ' 👍'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="player-analytics__impact-card">
                                        <div className="player-analytics__impact-icon">🎯</div>
                                        <div className="player-analytics__impact-content">
                                            <h5>Team Player</h5>
                                            <p>
                                                You've helped create {analyticsData.teamContribution.assist_percentage || 0}% 
                                                of your team's goals through assists! 
                                                {analyticsData.teamContribution.assist_percentage >= 15 && ' 🤝'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="player-analytics__impact-card">
                                        <div className="player-analytics__impact-icon">⭐</div>
                                        <div className="player-analytics__impact-content">
                                            <h5>Performance Star</h5>
                                            <p>
                                                Your average rating is {analyticsData.teamContribution.rating_rank || 0} 
                                                out of {analyticsData.teamContribution.team_size || 0} players! 
                                                {analyticsData.teamContribution.rating_rank <= 3 && ' 🌟'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Growth Tab */}
                    <Tabs.Content value="growth">
                        <div className="player-analytics__section">
                            <h3>🌱 Your Amazing Growth</h3>
                            
                            <div className="player-analytics__charts-grid">
                                <LineChart
                                    data={analyticsData.improvements}
                                    lines={[
                                        { dataKey: 'skill_level', name: 'Overall Skill Level', color: '#27AE60' },
                                        { dataKey: 'confidence', name: 'Confidence Level', color: '#3498DB' },
                                        { dataKey: 'teamwork', name: 'Teamwork', color: '#F39C12' }
                                    ]}
                                    xAxisKey="assessment_date"
                                    title="📈 Your Development Journey"
                                    subtitle="See how you're growing as a player!"
                                    {...getChartConfig('performance')}
                                />

                                <AreaChart
                                    data={analyticsData.improvements}
                                    areas={[
                                        { dataKey: 'training_attendance', name: 'Training Attendance', color: '#27AE60' },
                                        { dataKey: 'practice_hours', name: 'Practice Hours', color: '#3498DB' }
                                    ]}
                                    xAxisKey="assessment_date"
                                    title="💪 Your Dedication"
                                    subtitle="How much effort you put in!"
                                    {...getChartConfig('trend')}
                                />
                            </div>

                            {/* Growth Milestones */}
                            <div className="player-analytics__milestones">
                                <h4>🎯 Growth Milestones</h4>
                                <div className="player-analytics__milestones-list">
                                    {analyticsData.improvements.milestones?.map((milestone, index) => (
                                        <div key={index} className="player-analytics__milestone-item">
                                            <div className="player-analytics__milestone-icon">
                                                {milestone.achieved ? '✅' : '🎯'}
                                            </div>
                                            <div className="player-analytics__milestone-content">
                                                <h5>{milestone.title}</h5>
                                                <p>{milestone.description}</p>
                                                <div className="player-analytics__milestone-progress">
                                                    <div className="player-analytics__progress-bar">
                                                        <div 
                                                            className="player-analytics__progress-fill"
                                                            style={{ width: `${milestone.progress || 0}%` }}
                                                        ></div>
                                                    </div>
                                                    <span>{milestone.progress || 0}% complete</span>
                                                </div>
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="player-analytics__empty-state">
                                            <p>Keep playing to unlock growth milestones! 🌟</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Encouragement Messages */}
                            <div className="player-analytics__encouragement">
                                <h4>🌟 Keep Going, Champion!</h4>
                                <div className="player-analytics__encouragement-messages">
                                    {analyticsData.personalStats.recent_improvements?.map((improvement, index) => (
                                        <div key={index} className="player-analytics__encouragement-card">
                                            <div className="player-analytics__encouragement-icon">🎉</div>
                                            <div className="player-analytics__encouragement-content">
                                                <h5>You improved in {improvement.skill_name}!</h5>
                                                <p>You went from {improvement.previous_level}% to {improvement.current_level}%! That's awesome! 🚀</p>
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="player-analytics__encouragement-card">
                                            <div className="player-analytics__encouragement-icon">💪</div>
                                            <div className="player-analytics__encouragement-content">
                                                <h5>You're doing great!</h5>
                                                <p>Keep training, keep playing, and keep having fun! Every practice makes you better! 🌟</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>
        </div>
    );
};

export default PlayerAnalytics;