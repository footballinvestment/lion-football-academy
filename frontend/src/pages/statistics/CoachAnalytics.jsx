import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { LineChart, BarChart, PieChart, AreaChart, RadarChart } from '../../components/charts';
import { api } from '../../services/api';
import { 
    transformPlayerData, 
    transformTeamData, 
    calculateStatistics, 
    calculateTrend,
    getChartConfig 
} from '../../utils/chartConfig';
import './Analytics.css';

const CoachAnalytics = () => {
    const { user } = useAuth();
    const [analyticsData, setAnalyticsData] = useState({
        teamOverview: {},
        playerPerformance: [],
        trainingEffectiveness: [],
        matchAnalysis: [],
        developmentTracking: [],
        comparativeStats: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [teams, setTeams] = useState([]);

    useEffect(() => {
        fetchAnalyticsData();
        fetchTeams();
    }, [selectedTeam, selectedPeriod]);

    const fetchTeams = async () => {
        try {
            const response = await api.get('/coach/teams');
            setTeams(response.data);
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams({
                team_id: selectedTeam !== 'all' ? selectedTeam : '',
                period: selectedPeriod
            });

            const [
                overviewRes,
                performanceRes,
                trainingRes,
                matchRes,
                developmentRes,
                comparativeRes
            ] = await Promise.all([
                api.get(`/coach/analytics/overview?${params}`),
                api.get(`/coach/analytics/player-performance?${params}`),
                api.get(`/coach/analytics/training-effectiveness?${params}`),
                api.get(`/coach/analytics/match-analysis?${params}`),
                api.get(`/coach/analytics/development-tracking?${params}`),
                api.get(`/coach/analytics/comparative-stats?${params}`)
            ]);

            setAnalyticsData({
                teamOverview: overviewRes.data,
                playerPerformance: performanceRes.data,
                trainingEffectiveness: trainingRes.data,
                matchAnalysis: matchRes.data,
                developmentTracking: developmentRes.data,
                comparativeStats: comparativeRes.data
            });
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const exportAnalytics = async () => {
        try {
            const response = await api.get('/coach/analytics/export', {
                params: { team_id: selectedTeam, period: selectedPeriod },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `team_analytics_${selectedPeriod}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting analytics:', error);
            setError('Failed to export analytics report.');
        }
    };

    if (loading) {
        return (
            <div className="coach-analytics">
                <div className="coach-analytics__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading analytics dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="coach-analytics">
            {/* Header */}
            <div className="coach-analytics__header">
                <div className="coach-analytics__header-content">
                    <div className="coach-analytics__title">
                        <h1>📊 Team Analytics Dashboard</h1>
                        <p>Comprehensive performance insights and team analysis</p>
                    </div>
                    <div className="coach-analytics__header-actions">
                        <select 
                            className="coach-analytics__team-filter"
                            value={selectedTeam}
                            onChange={(e) => setSelectedTeam(e.target.value)}
                        >
                            <option value="all">All Teams</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name} ({team.age_group})
                                </option>
                            ))}
                        </select>
                        <select 
                            className="coach-analytics__period-filter"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="season">This Season</option>
                        </select>
                        <Button 
                            onClick={exportAnalytics}
                            variant="secondary"
                        >
                            📄 Export Report
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="overview">Team Overview</Tabs.Trigger>
                        <Tabs.Trigger value="performance">Player Performance</Tabs.Trigger>
                        <Tabs.Trigger value="training">Training Analysis</Tabs.Trigger>
                        <Tabs.Trigger value="matches">Match Analysis</Tabs.Trigger>
                        <Tabs.Trigger value="development">Development Tracking</Tabs.Trigger>
                        <Tabs.Trigger value="comparison">Team Comparison</Tabs.Trigger>
                    </Tabs.List>

                    {/* Team Overview Tab */}
                    <Tabs.Content value="overview">
                        <div className="coach-analytics__section">
                            <h3>🏆 Team Performance Overview</h3>
                            
                            {/* Key Metrics */}
                            <div className="coach-analytics__metrics-grid">
                                <div className="coach-analytics__metric-card">
                                    <div className="coach-analytics__metric-icon">⚽</div>
                                    <div className="coach-analytics__metric-content">
                                        <h4>Goals Scored</h4>
                                        <div className="coach-analytics__metric-value">
                                            {analyticsData.teamOverview.total_goals || 0}
                                        </div>
                                        <p className="coach-analytics__metric-trend">
                                            {calculateTrend(analyticsData.matchAnalysis, 'goals_for') > 0 ? '📈' : '📉'} 
                                            {Math.abs(calculateTrend(analyticsData.matchAnalysis, 'goals_for')).toFixed(1)}% trend
                                        </p>
                                    </div>
                                </div>

                                <div className="coach-analytics__metric-card">
                                    <div className="coach-analytics__metric-icon">🛡️</div>
                                    <div className="coach-analytics__metric-content">
                                        <h4>Goals Conceded</h4>
                                        <div className="coach-analytics__metric-value">
                                            {analyticsData.teamOverview.total_goals_against || 0}
                                        </div>
                                        <p className="coach-analytics__metric-trend">
                                            {calculateTrend(analyticsData.matchAnalysis, 'goals_against') < 0 ? '📈' : '📉'} 
                                            {Math.abs(calculateTrend(analyticsData.matchAnalysis, 'goals_against')).toFixed(1)}% trend
                                        </p>
                                    </div>
                                </div>

                                <div className="coach-analytics__metric-card">
                                    <div className="coach-analytics__metric-icon">🎯</div>
                                    <div className="coach-analytics__metric-content">
                                        <h4>Win Rate</h4>
                                        <div className="coach-analytics__metric-value">
                                            {analyticsData.teamOverview.win_rate || 0}%
                                        </div>
                                        <p className="coach-analytics__metric-trend">
                                            {analyticsData.teamOverview.wins || 0}W / {analyticsData.teamOverview.losses || 0}L
                                        </p>
                                    </div>
                                </div>

                                <div className="coach-analytics__metric-card">
                                    <div className="coach-analytics__metric-icon">📈</div>
                                    <div className="coach-analytics__metric-content">
                                        <h4>Avg Team Rating</h4>
                                        <div className="coach-analytics__metric-value">
                                            {analyticsData.teamOverview.average_rating?.toFixed(1) || '0.0'}
                                        </div>
                                        <p className="coach-analytics__metric-trend">
                                            Out of 10.0 scale
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Performance Charts */}
                            <div className="coach-analytics__charts-grid">
                                <div className="coach-analytics__chart-container">
                                    <LineChart
                                        data={transformTeamData(analyticsData.matchAnalysis, 'performance')}
                                        lines={[
                                            { dataKey: 'goalsFor', name: 'Goals For', color: '#27AE60' },
                                            { dataKey: 'goalsAgainst', name: 'Goals Against', color: '#E74C3C' }
                                        ]}
                                        title="Goals Trend"
                                        subtitle="Goals scored vs conceded over time"
                                        {...getChartConfig('performance')}
                                    />
                                </div>

                                <div className="coach-analytics__chart-container">
                                    <AreaChart
                                        data={transformTeamData(analyticsData.matchAnalysis, 'performance')}
                                        areas={[
                                            { dataKey: 'possession', name: 'Possession %', color: '#3498DB' },
                                            { dataKey: 'passAccuracy', name: 'Pass Accuracy %', color: '#9B59B6' }
                                        ]}
                                        title="Team Statistics"
                                        subtitle="Possession and passing accuracy trends"
                                        {...getChartConfig('trend')}
                                    />
                                </div>
                            </div>

                            {/* Formation Analysis */}
                            <div className="coach-analytics__formation-section">
                                <h4>📋 Formation Analysis</h4>
                                <div className="coach-analytics__charts-grid">
                                    <PieChart
                                        data={transformTeamData(analyticsData.teamOverview.formations || [], 'formation')}
                                        title="Position Distribution"
                                        subtitle="Player distribution by position"
                                        {...getChartConfig('distribution')}
                                    />
                                    
                                    <BarChart
                                        data={transformTeamData(analyticsData.teamOverview.formations || [], 'formation')}
                                        bars={[{ dataKey: 'avgRating', name: 'Average Rating' }]}
                                        title="Position Performance"
                                        subtitle="Average rating by position"
                                        {...getChartConfig('comparison')}
                                    />
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Player Performance Tab */}
                    <Tabs.Content value="performance">
                        <div className="coach-analytics__section">
                            <h3>👥 Individual Player Performance</h3>
                            
                            <div className="coach-analytics__charts-grid">
                                <BarChart
                                    data={analyticsData.playerPerformance.slice(0, 10)}
                                    bars={[
                                        { dataKey: 'goals', name: 'Goals', color: '#27AE60' },
                                        { dataKey: 'assists', name: 'Assists', color: '#3498DB' }
                                    ]}
                                    xAxisKey="player_name"
                                    title="Top Performers - Goals & Assists"
                                    subtitle="Leading goal scorers and assist providers"
                                    {...getChartConfig('comparison')}
                                />

                                <BarChart
                                    data={analyticsData.playerPerformance.slice(0, 10)}
                                    bars={[{ dataKey: 'average_rating', name: 'Average Rating' }]}
                                    xAxisKey="player_name"
                                    title="Player Ratings"
                                    subtitle="Average match ratings this period"
                                    {...getChartConfig('comparison')}
                                />
                            </div>

                            <div className="coach-analytics__charts-grid">
                                <LineChart
                                    data={transformPlayerData(analyticsData.playerPerformance, 'performance')}
                                    lines={[
                                        { dataKey: 'goals', name: 'Goals', color: '#27AE60' },
                                        { dataKey: 'assists', name: 'Assists', color: '#3498DB' },
                                        { dataKey: 'rating', name: 'Rating', color: '#F39C12' }
                                    ]}
                                    title="Team Performance Trends"
                                    subtitle="Collective team statistics over time"
                                    {...getChartConfig('performance')}
                                />

                                <PieChart
                                    data={analyticsData.playerPerformance.slice(0, 8).map(player => ({
                                        name: player.player_name,
                                        value: player.minutes_played || 0
                                    }))}
                                    title="Playing Time Distribution"
                                    subtitle="Minutes played by top players"
                                    {...getChartConfig('distribution')}
                                />
                            </div>

                            {/* Player Statistics Table */}
                            <div className="coach-analytics__stats-table">
                                <h4>📊 Detailed Player Statistics</h4>
                                <div className="coach-analytics__table-wrapper">
                                    <table className="coach-analytics__table">
                                        <thead>
                                            <tr>
                                                <th>Player</th>
                                                <th>Position</th>
                                                <th>Matches</th>
                                                <th>Goals</th>
                                                <th>Assists</th>
                                                <th>Rating</th>
                                                <th>Minutes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsData.playerPerformance.slice(0, 15).map((player, index) => (
                                                <tr key={index}>
                                                    <td className="coach-analytics__player-name">
                                                        {player.player_name}
                                                    </td>
                                                    <td>{player.position}</td>
                                                    <td>{player.matches_played || 0}</td>
                                                    <td>{player.goals || 0}</td>
                                                    <td>{player.assists || 0}</td>
                                                    <td className="coach-analytics__rating">
                                                        {player.average_rating?.toFixed(1) || '0.0'}
                                                    </td>
                                                    <td>{player.minutes_played || 0}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Training Analysis Tab */}
                    <Tabs.Content value="training">
                        <div className="coach-analytics__section">
                            <h3>🏃 Training Effectiveness Analysis</h3>
                            
                            <div className="coach-analytics__charts-grid">
                                <LineChart
                                    data={analyticsData.trainingEffectiveness}
                                    lines={[
                                        { dataKey: 'attendance_rate', name: 'Attendance Rate', color: '#27AE60' },
                                        { dataKey: 'performance_improvement', name: 'Performance Improvement', color: '#3498DB' }
                                    ]}
                                    xAxisKey="training_date"
                                    title="Training Attendance & Performance"
                                    subtitle="Correlation between attendance and improvement"
                                    {...getChartConfig('performance')}
                                />

                                <BarChart
                                    data={analyticsData.trainingEffectiveness}
                                    bars={[
                                        { dataKey: 'drill_completion_rate', name: 'Drill Completion %', color: '#F39C12' },
                                        { dataKey: 'skill_assessment_score', name: 'Skill Assessment', color: '#9B59B6' }
                                    ]}
                                    xAxisKey="training_type"
                                    title="Training Type Effectiveness"
                                    subtitle="Success rates by training category"
                                    {...getChartConfig('comparison')}
                                />
                            </div>

                            <div className="coach-analytics__training-insights">
                                <h4>💡 Training Insights</h4>
                                <div className="coach-analytics__insights-grid">
                                    {analyticsData.trainingEffectiveness.length > 0 && (
                                        <>
                                            <div className="coach-analytics__insight-card">
                                                <div className="coach-analytics__insight-icon">📈</div>
                                                <div className="coach-analytics__insight-content">
                                                    <h5>Best Training Day</h5>
                                                    <p>
                                                        {analyticsData.trainingEffectiveness
                                                            .sort((a, b) => b.attendance_rate - a.attendance_rate)[0]?.best_day || 'Tuesday'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="coach-analytics__insight-card">
                                                <div className="coach-analytics__insight-icon">⏰</div>
                                                <div className="coach-analytics__insight-content">
                                                    <h5>Optimal Duration</h5>
                                                    <p>
                                                        {analyticsData.teamOverview.optimal_training_duration || 90} minutes
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="coach-analytics__insight-card">
                                                <div className="coach-analytics__insight-icon">🎯</div>
                                                <div className="coach-analytics__insight-content">
                                                    <h5>Focus Area</h5>
                                                    <p>
                                                        {analyticsData.teamOverview.improvement_area || 'Passing accuracy'}
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Match Analysis Tab */}
                    <Tabs.Content value="matches">
                        <div className="coach-analytics__section">
                            <h3>⚽ Match Performance Analysis</h3>
                            
                            <div className="coach-analytics__charts-grid">
                                <AreaChart
                                    data={analyticsData.matchAnalysis}
                                    areas={[
                                        { dataKey: 'goals_for', name: 'Goals For', color: '#27AE60' },
                                        { dataKey: 'goals_against', name: 'Goals Against', color: '#E74C3C' }
                                    ]}
                                    xAxisKey="match_date"
                                    title="Goal Trends"
                                    subtitle="Goals scored and conceded over matches"
                                    {...getChartConfig('trend')}
                                />

                                <LineChart
                                    data={analyticsData.matchAnalysis}
                                    lines={[
                                        { dataKey: 'possession_percentage', name: 'Possession %', color: '#3498DB' },
                                        { dataKey: 'pass_accuracy', name: 'Pass Accuracy %', color: '#9B59B6' },
                                        { dataKey: 'shots_on_target', name: 'Shots on Target', color: '#F39C12' }
                                    ]}
                                    xAxisKey="opponent"
                                    title="Match Statistics"
                                    subtitle="Key performance indicators by match"
                                    {...getChartConfig('performance')}
                                />
                            </div>

                            {/* Match Results Summary */}
                            <div className="coach-analytics__match-summary">
                                <h4>🏆 Match Results Summary</h4>
                                <div className="coach-analytics__results-grid">
                                    <div className="coach-analytics__result-card coach-analytics__result-card--wins">
                                        <div className="coach-analytics__result-number">
                                            {analyticsData.teamOverview.wins || 0}
                                        </div>
                                        <div className="coach-analytics__result-label">Wins</div>
                                    </div>
                                    
                                    <div className="coach-analytics__result-card coach-analytics__result-card--draws">
                                        <div className="coach-analytics__result-number">
                                            {analyticsData.teamOverview.draws || 0}
                                        </div>
                                        <div className="coach-analytics__result-label">Draws</div>
                                    </div>
                                    
                                    <div className="coach-analytics__result-card coach-analytics__result-card--losses">
                                        <div className="coach-analytics__result-number">
                                            {analyticsData.teamOverview.losses || 0}
                                        </div>
                                        <div className="coach-analytics__result-label">Losses</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Development Tracking Tab */}
                    <Tabs.Content value="development">
                        <div className="coach-analytics__section">
                            <h3>📈 Player Development Tracking</h3>
                            
                            <div className="coach-analytics__charts-grid">
                                <RadarChart
                                    data={analyticsData.developmentTracking.skillAverages || []}
                                    radars={[
                                        { dataKey: 'current_level', name: 'Current Level', color: '#27AE60' },
                                        { dataKey: 'target_level', name: 'Target Level', color: '#3498DB' },
                                        { dataKey: 'league_average', name: 'League Average', color: '#95A5A6' }
                                    ]}
                                    title="Team Skill Development"
                                    subtitle="Average skill levels vs targets and league"
                                    {...getChartConfig('skills')}
                                />

                                <LineChart
                                    data={analyticsData.developmentTracking.progressOverTime || []}
                                    lines={[
                                        { dataKey: 'technical_skills', name: 'Technical', color: '#27AE60' },
                                        { dataKey: 'physical_skills', name: 'Physical', color: '#E74C3C' },
                                        { dataKey: 'mental_skills', name: 'Mental', color: '#3498DB' },
                                        { dataKey: 'social_skills', name: 'Social', color: '#F39C12' }
                                    ]}
                                    xAxisKey="assessment_date"
                                    title="Skill Development Over Time"
                                    subtitle="Progress tracking by skill category"
                                    {...getChartConfig('performance')}
                                />
                            </div>

                            {/* Development Milestones */}
                            <div className="coach-analytics__milestones">
                                <h4>🎯 Development Milestones</h4>
                                <div className="coach-analytics__milestones-list">
                                    {analyticsData.developmentTracking.milestones?.map((milestone, index) => (
                                        <div key={index} className="coach-analytics__milestone-item">
                                            <div className="coach-analytics__milestone-icon">
                                                {milestone.achieved ? '✅' : '🎯'}
                                            </div>
                                            <div className="coach-analytics__milestone-content">
                                                <h5>{milestone.title}</h5>
                                                <p>{milestone.description}</p>
                                                <span className="coach-analytics__milestone-date">
                                                    Target: {new Date(milestone.target_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="coach-analytics__milestone-progress">
                                                <div className="coach-analytics__progress-bar">
                                                    <div 
                                                        className="coach-analytics__progress-fill"
                                                        style={{ width: `${milestone.progress_percentage || 0}%` }}
                                                    ></div>
                                                </div>
                                                <span className="coach-analytics__progress-text">
                                                    {milestone.progress_percentage || 0}%
                                                </span>
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="coach-analytics__empty-state">
                                            <p>No development milestones set yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Team Comparison Tab */}
                    <Tabs.Content value="comparison">
                        <div className="coach-analytics__section">
                            <h3>🏆 Comparative Team Analysis</h3>
                            
                            <div className="coach-analytics__charts-grid">
                                <BarChart
                                    data={analyticsData.comparativeStats.teamComparison || []}
                                    bars={[
                                        { dataKey: 'goals_scored', name: 'Goals Scored', color: '#27AE60' },
                                        { dataKey: 'goals_conceded', name: 'Goals Conceded', color: '#E74C3C' }
                                    ]}
                                    xAxisKey="team_name"
                                    title="League Goal Statistics"
                                    subtitle="Goals scored vs conceded comparison"
                                    {...getChartConfig('comparison')}
                                />

                                <LineChart
                                    data={analyticsData.comparativeStats.leaguePosition || []}
                                    lines={[
                                        { dataKey: 'position', name: 'League Position', color: '#3498DB' },
                                        { dataKey: 'points', name: 'Points', color: '#F39C12' }
                                    ]}
                                    xAxisKey="round"
                                    title="League Position Trend"
                                    subtitle="Position and points progression"
                                    {...getChartConfig('performance')}
                                />
                            </div>

                            {/* League Standing */}
                            <div className="coach-analytics__league-table">
                                <h4>📊 Current League Standing</h4>
                                <div className="coach-analytics__table-wrapper">
                                    <table className="coach-analytics__table">
                                        <thead>
                                            <tr>
                                                <th>Pos</th>
                                                <th>Team</th>
                                                <th>Played</th>
                                                <th>Won</th>
                                                <th>Drawn</th>
                                                <th>Lost</th>
                                                <th>GF</th>
                                                <th>GA</th>
                                                <th>GD</th>
                                                <th>Points</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyticsData.comparativeStats.leagueTable?.map((team, index) => (
                                                <tr 
                                                    key={index} 
                                                    className={team.is_current_team ? 'coach-analytics__current-team' : ''}
                                                >
                                                    <td>{team.position}</td>
                                                    <td className="coach-analytics__team-name">
                                                        {team.team_name}
                                                        {team.is_current_team && ' 👑'}
                                                    </td>
                                                    <td>{team.played}</td>
                                                    <td>{team.won}</td>
                                                    <td>{team.drawn}</td>
                                                    <td>{team.lost}</td>
                                                    <td>{team.goals_for}</td>
                                                    <td>{team.goals_against}</td>
                                                    <td className={team.goal_difference >= 0 ? 'positive' : 'negative'}>
                                                        {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                                                    </td>
                                                    <td className="coach-analytics__points">{team.points}</td>
                                                </tr>
                                            )) || (
                                                <tr>
                                                    <td colSpan="10" className="coach-analytics__no-data">
                                                        No league data available
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>
        </div>
    );
};

export default CoachAnalytics;