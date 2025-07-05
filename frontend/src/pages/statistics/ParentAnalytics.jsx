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

const ParentAnalytics = () => {
    const { user } = useAuth();
    const [analyticsData, setAnalyticsData] = useState({
        childProgress: {},
        skillDevelopment: [],
        attendanceAnalysis: [],
        performanceTrends: [],
        peerComparison: {},
        achievementTimeline: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('progress');
    const [selectedChild, setSelectedChild] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [children, setChildren] = useState([]);

    useEffect(() => {
        fetchChildren();
    }, []);

    useEffect(() => {
        if (selectedChild) {
            fetchAnalyticsData();
        }
    }, [selectedChild, selectedPeriod]);

    const fetchChildren = async () => {
        try {
            const response = await api.get('/parent/children');
            setChildren(response.data);
            if (response.data.length > 0) {
                setSelectedChild(response.data[0].id);
            }
        } catch (error) {
            console.error('Error fetching children:', error);
            setError('Failed to load children data.');
        }
    };

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);
            setError('');

            const params = new URLSearchParams({
                child_id: selectedChild,
                period: selectedPeriod
            });

            const [
                progressRes,
                skillsRes,
                attendanceRes,
                trendsRes,
                comparisonRes,
                achievementsRes
            ] = await Promise.all([
                api.get(`/parent/analytics/child-progress?${params}`),
                api.get(`/parent/analytics/skill-development?${params}`),
                api.get(`/parent/analytics/attendance-analysis?${params}`),
                api.get(`/parent/analytics/performance-trends?${params}`),
                api.get(`/parent/analytics/peer-comparison?${params}`),
                api.get(`/parent/analytics/achievement-timeline?${params}`)
            ]);

            setAnalyticsData({
                childProgress: progressRes.data,
                skillDevelopment: skillsRes.data,
                attendanceAnalysis: attendanceRes.data,
                performanceTrends: trendsRes.data,
                peerComparison: comparisonRes.data,
                achievementTimeline: achievementsRes.data
            });
        } catch (error) {
            console.error('Error fetching analytics data:', error);
            setError('Failed to load analytics data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async () => {
        try {
            const response = await api.get('/parent/analytics/generate-report', {
                params: { child_id: selectedChild, period: selectedPeriod },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const childName = children.find(c => c.id === selectedChild)?.first_name || 'child';
            link.setAttribute('download', `${childName}_progress_report_${selectedPeriod}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error generating report:', error);
            setError('Failed to generate progress report.');
        }
    };

    if (loading && !selectedChild) {
        return (
            <div className="parent-analytics">
                <div className="parent-analytics__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading analytics dashboard...</p>
                </div>
            </div>
        );
    }

    if (children.length === 0) {
        return (
            <div className="parent-analytics">
                <div className="parent-analytics__empty">
                    <h2>📊 Child Analytics</h2>
                    <p>No children are currently registered for analytics tracking.</p>
                </div>
            </div>
        );
    }

    const selectedChildData = children.find(c => c.id === selectedChild);

    return (
        <div className="parent-analytics">
            {/* Header */}
            <div className="parent-analytics__header">
                <div className="parent-analytics__header-content">
                    <div className="parent-analytics__title">
                        <h1>📊 Child Development Analytics</h1>
                        <p>Comprehensive insights into your child's football progress</p>
                    </div>
                    <div className="parent-analytics__header-actions">
                        <select 
                            className="parent-analytics__child-filter"
                            value={selectedChild}
                            onChange={(e) => setSelectedChild(e.target.value)}
                        >
                            {children.map(child => (
                                <option key={child.id} value={child.id}>
                                    {child.first_name} {child.last_name}
                                </option>
                            ))}
                        </select>
                        <select 
                            className="parent-analytics__period-filter"
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                        >
                            <option value="month">This Month</option>
                            <option value="quarter">This Quarter</option>
                            <option value="season">This Season</option>
                            <option value="year">This Year</option>
                        </select>
                        <Button 
                            onClick={generateReport}
                            variant="secondary"
                        >
                            📄 Generate Report
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Child Info Banner */}
            {selectedChildData && (
                <div className="parent-analytics__child-banner">
                    <div className="parent-analytics__child-info">
                        <div className="parent-analytics__child-avatar">
                            {selectedChildData.profile_picture ? (
                                <img src={selectedChildData.profile_picture} alt={selectedChildData.first_name} />
                            ) : (
                                <div className="parent-analytics__child-initials">
                                    {selectedChildData.first_name?.[0]}{selectedChildData.last_name?.[0]}
                                </div>
                            )}
                        </div>
                        <div className="parent-analytics__child-details">
                            <h2>{selectedChildData.first_name} {selectedChildData.last_name}</h2>
                            <p>
                                {selectedChildData.position || 'No position'} • 
                                Age {Math.floor((new Date() - new Date(selectedChildData.birth_date)) / (365.25 * 24 * 60 * 60 * 1000))} • 
                                {selectedChildData.team_name || 'Not assigned to team'}
                            </p>
                        </div>
                        <div className="parent-analytics__child-stats">
                            <div className="parent-analytics__quick-stat">
                                <span className="parent-analytics__stat-value">
                                    {analyticsData.childProgress.overall_rating?.toFixed(1) || '0.0'}
                                </span>
                                <span className="parent-analytics__stat-label">Overall Rating</span>
                            </div>
                            <div className="parent-analytics__quick-stat">
                                <span className="parent-analytics__stat-value">
                                    {analyticsData.childProgress.total_goals || 0}
                                </span>
                                <span className="parent-analytics__stat-label">Goals</span>
                            </div>
                            <div className="parent-analytics__quick-stat">
                                <span className="parent-analytics__stat-value">
                                    {analyticsData.childProgress.attendance_rate || 0}%
                                </span>
                                <span className="parent-analytics__stat-label">Attendance</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="progress">Development Progress</Tabs.Trigger>
                        <Tabs.Trigger value="skills">Skill Analysis</Tabs.Trigger>
                        <Tabs.Trigger value="performance">Performance Trends</Tabs.Trigger>
                        <Tabs.Trigger value="attendance">Attendance Insights</Tabs.Trigger>
                        <Tabs.Trigger value="comparison">Peer Comparison</Tabs.Trigger>
                        <Tabs.Trigger value="achievements">Achievements</Tabs.Trigger>
                    </Tabs.List>

                    {/* Development Progress Tab */}
                    <Tabs.Content value="progress">
                        <div className="parent-analytics__section">
                            <h3>📈 Development Progress Overview</h3>
                            
                            {/* Progress Metrics */}
                            <div className="parent-analytics__metrics-grid">
                                <div className="parent-analytics__metric-card">
                                    <div className="parent-analytics__metric-icon">⚽</div>
                                    <div className="parent-analytics__metric-content">
                                        <h4>Goals This Period</h4>
                                        <div className="parent-analytics__metric-value">
                                            {analyticsData.childProgress.goals_this_period || 0}
                                        </div>
                                        <p className="parent-analytics__metric-trend">
                                            {calculateTrend(analyticsData.performanceTrends, 'goals') > 0 ? '📈' : '📉'} 
                                            {Math.abs(calculateTrend(analyticsData.performanceTrends, 'goals')).toFixed(1)}% trend
                                        </p>
                                    </div>
                                </div>

                                <div className="parent-analytics__metric-card">
                                    <div className="parent-analytics__metric-icon">🎯</div>
                                    <div className="parent-analytics__metric-content">
                                        <h4>Performance Rating</h4>
                                        <div className="parent-analytics__metric-value">
                                            {analyticsData.childProgress.average_rating?.toFixed(1) || '0.0'}
                                        </div>
                                        <p className="parent-analytics__metric-trend">
                                            {calculatePerformanceGrade(analyticsData.childProgress.average_rating)} performance
                                        </p>
                                    </div>
                                </div>

                                <div className="parent-analytics__metric-card">
                                    <div className="parent-analytics__metric-icon">📚</div>
                                    <div className="parent-analytics__metric-content">
                                        <h4>Training Sessions</h4>
                                        <div className="parent-analytics__metric-value">
                                            {analyticsData.childProgress.training_sessions || 0}
                                        </div>
                                        <p className="parent-analytics__metric-trend">
                                            {analyticsData.childProgress.attendance_rate || 0}% attendance rate
                                        </p>
                                    </div>
                                </div>

                                <div className="parent-analytics__metric-card">
                                    <div className="parent-analytics__metric-icon">🏆</div>
                                    <div className="parent-analytics__metric-content">
                                        <h4>Achievements</h4>
                                        <div className="parent-analytics__metric-value">
                                            {analyticsData.childProgress.achievements_earned || 0}
                                        </div>
                                        <p className="parent-analytics__metric-trend">
                                            New this {selectedPeriod}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Charts */}
                            <div className="parent-analytics__charts-grid">
                                <LineChart
                                    data={transformPlayerData(analyticsData.performanceTrends, 'performance')}
                                    lines={[
                                        { dataKey: 'rating', name: 'Performance Rating', color: '#3498DB' },
                                        { dataKey: 'goals', name: 'Goals per Game', color: '#27AE60' },
                                        { dataKey: 'assists', name: 'Assists per Game', color: '#F39C12' }
                                    ]}
                                    title="Performance Development"
                                    subtitle="Your child's progress over time"
                                    {...getChartConfig('performance')}
                                />

                                <AreaChart
                                    data={analyticsData.attendanceAnalysis}
                                    areas={[
                                        { dataKey: 'training_attendance', name: 'Training', color: '#27AE60' },
                                        { dataKey: 'match_attendance', name: 'Matches', color: '#3498DB' }
                                    ]}
                                    xAxisKey="period"
                                    title="Attendance Consistency"
                                    subtitle="Training and match attendance rates"
                                    {...getChartConfig('trend')}
                                />
                            </div>

                            {/* Coach Feedback Summary */}
                            <div className="parent-analytics__feedback-section">
                                <h4>💬 Recent Coach Feedback</h4>
                                <div className="parent-analytics__feedback-cards">
                                    {analyticsData.childProgress.recent_feedback?.map((feedback, index) => (
                                        <div key={index} className="parent-analytics__feedback-card">
                                            <div className="parent-analytics__feedback-header">
                                                <h5>{feedback.coach_name}</h5>
                                                <span className="parent-analytics__feedback-date">
                                                    {new Date(feedback.date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="parent-analytics__feedback-content">
                                                <div className="parent-analytics__feedback-rating">
                                                    {Array.from({ length: 5 }, (_, i) => (
                                                        <span key={i} className={i < feedback.rating ? 'filled' : 'empty'}>
                                                            ⭐
                                                        </span>
                                                    ))}
                                                </div>
                                                <p>{feedback.comment}</p>
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="parent-analytics__empty-state">
                                            <p>No recent feedback available.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Skill Analysis Tab */}
                    <Tabs.Content value="skills">
                        <div className="parent-analytics__section">
                            <h3>⚽ Skill Development Analysis</h3>
                            
                            <div className="parent-analytics__charts-grid">
                                <RadarChart
                                    data={analyticsData.skillDevelopment.skillRadar || []}
                                    radars={[
                                        { dataKey: 'current_level', name: 'Current Level', color: '#3498DB' },
                                        { dataKey: 'target_level', name: 'Target Level', color: '#27AE60' },
                                        { dataKey: 'age_group_average', name: 'Age Group Average', color: '#95A5A6' }
                                    ]}
                                    title="Skill Assessment Radar"
                                    subtitle="Current abilities vs targets and peers"
                                    {...getChartConfig('skills')}
                                />

                                <BarChart
                                    data={analyticsData.skillDevelopment.skillProgress || []}
                                    bars={[
                                        { dataKey: 'improvement', name: 'Improvement', color: '#27AE60' },
                                        { dataKey: 'current_level', name: 'Current Level', color: '#3498DB' }
                                    ]}
                                    xAxisKey="skill_name"
                                    title="Skill Improvement"
                                    subtitle="Progress made in each skill area"
                                    {...getChartConfig('comparison')}
                                />
                            </div>

                            {/* Skill Categories */}
                            <div className="parent-analytics__skill-categories">
                                <div className="parent-analytics__skill-category">
                                    <h4>⚽ Technical Skills</h4>
                                    <div className="parent-analytics__skill-bars">
                                        {analyticsData.skillDevelopment.technical?.map((skill, index) => (
                                            <div key={index} className="parent-analytics__skill-bar">
                                                <span className="parent-analytics__skill-name">{skill.name}</span>
                                                <div className="parent-analytics__skill-progress">
                                                    <div 
                                                        className="parent-analytics__skill-fill"
                                                        style={{ width: `${skill.level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="parent-analytics__skill-level">{skill.level}%</span>
                                            </div>
                                        )) || <p>No technical skills data available.</p>}
                                    </div>
                                </div>

                                <div className="parent-analytics__skill-category">
                                    <h4>🏃 Physical Skills</h4>
                                    <div className="parent-analytics__skill-bars">
                                        {analyticsData.skillDevelopment.physical?.map((skill, index) => (
                                            <div key={index} className="parent-analytics__skill-bar">
                                                <span className="parent-analytics__skill-name">{skill.name}</span>
                                                <div className="parent-analytics__skill-progress">
                                                    <div 
                                                        className="parent-analytics__skill-fill"
                                                        style={{ width: `${skill.level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="parent-analytics__skill-level">{skill.level}%</span>
                                            </div>
                                        )) || <p>No physical skills data available.</p>}
                                    </div>
                                </div>

                                <div className="parent-analytics__skill-category">
                                    <h4>🧠 Mental Skills</h4>
                                    <div className="parent-analytics__skill-bars">
                                        {analyticsData.skillDevelopment.mental?.map((skill, index) => (
                                            <div key={index} className="parent-analytics__skill-bar">
                                                <span className="parent-analytics__skill-name">{skill.name}</span>
                                                <div className="parent-analytics__skill-progress">
                                                    <div 
                                                        className="parent-analytics__skill-fill"
                                                        style={{ width: `${skill.level}%` }}
                                                    ></div>
                                                </div>
                                                <span className="parent-analytics__skill-level">{skill.level}%</span>
                                            </div>
                                        )) || <p>No mental skills data available.</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Performance Trends Tab */}
                    <Tabs.Content value="performance">
                        <div className="parent-analytics__section">
                            <h3>📊 Performance Trends Analysis</h3>
                            
                            <div className="parent-analytics__charts-grid">
                                <LineChart
                                    data={analyticsData.performanceTrends}
                                    lines={[
                                        { dataKey: 'goals', name: 'Goals', color: '#27AE60' },
                                        { dataKey: 'assists', name: 'Assists', color: '#3498DB' },
                                        { dataKey: 'rating', name: 'Performance Rating', color: '#F39C12' }
                                    ]}
                                    xAxisKey="match_date"
                                    title="Match Performance Trends"
                                    subtitle="Goals, assists, and ratings over time"
                                    {...getChartConfig('performance')}
                                />

                                <AreaChart
                                    data={analyticsData.performanceTrends}
                                    areas={[
                                        { dataKey: 'minutes_played', name: 'Minutes Played', color: '#9B59B6' },
                                        { dataKey: 'touches', name: 'Ball Touches', color: '#1ABC9C' }
                                    ]}
                                    xAxisKey="match_date"
                                    title="Game Involvement"
                                    subtitle="Playing time and ball involvement"
                                    {...getChartConfig('trend')}
                                />
                            </div>

                            {/* Performance Insights */}
                            <div className="parent-analytics__insights">
                                <h4>💡 Performance Insights</h4>
                                <div className="parent-analytics__insights-grid">
                                    <div className="parent-analytics__insight-card">
                                        <div className="parent-analytics__insight-icon">🔥</div>
                                        <div className="parent-analytics__insight-content">
                                            <h5>Best Performance</h5>
                                            <p>
                                                {analyticsData.childProgress.best_match?.opponent || 'No data'} 
                                                ({analyticsData.childProgress.best_match?.rating || 0}/10)
                                            </p>
                                        </div>
                                    </div>

                                    <div className="parent-analytics__insight-card">
                                        <div className="parent-analytics__insight-icon">📈</div>
                                        <div className="parent-analytics__insight-content">
                                            <h5>Improvement Area</h5>
                                            <p>{analyticsData.childProgress.improvement_area || 'Overall development'}</p>
                                        </div>
                                    </div>

                                    <div className="parent-analytics__insight-card">
                                        <div className="parent-analytics__insight-icon">⭐</div>
                                        <div className="parent-analytics__insight-content">
                                            <h5>Strength</h5>
                                            <p>{analyticsData.childProgress.strength_area || 'Team player'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Attendance Insights Tab */}
                    <Tabs.Content value="attendance">
                        <div className="parent-analytics__section">
                            <h3>📅 Attendance Analysis</h3>
                            
                            <div className="parent-analytics__charts-grid">
                                <PieChart
                                    data={[
                                        { name: 'Present', value: analyticsData.attendanceAnalysis.summary?.present || 0 },
                                        { name: 'Absent', value: analyticsData.attendanceAnalysis.summary?.absent || 0 },
                                        { name: 'Late', value: analyticsData.attendanceAnalysis.summary?.late || 0 }
                                    ]}
                                    title="Attendance Distribution"
                                    subtitle="Overall attendance breakdown"
                                    {...getChartConfig('distribution')}
                                />

                                <LineChart
                                    data={analyticsData.attendanceAnalysis.trends || []}
                                    lines={[
                                        { dataKey: 'training_rate', name: 'Training Attendance', color: '#27AE60' },
                                        { dataKey: 'match_rate', name: 'Match Attendance', color: '#3498DB' }
                                    ]}
                                    xAxisKey="period"
                                    title="Attendance Trends"
                                    subtitle="Attendance rates over time"
                                    {...getChartConfig('performance')}
                                />
                            </div>

                            {/* Attendance Statistics */}
                            <div className="parent-analytics__attendance-stats">
                                <h4>📊 Attendance Statistics</h4>
                                <div className="parent-analytics__stats-grid">
                                    <div className="parent-analytics__stat-item">
                                        <span className="parent-analytics__stat-label">Overall Rate</span>
                                        <span className="parent-analytics__stat-value">
                                            {analyticsData.attendanceAnalysis.summary?.overall_rate || 0}%
                                        </span>
                                    </div>
                                    <div className="parent-analytics__stat-item">
                                        <span className="parent-analytics__stat-label">Training Rate</span>
                                        <span className="parent-analytics__stat-value">
                                            {analyticsData.attendanceAnalysis.summary?.training_rate || 0}%
                                        </span>
                                    </div>
                                    <div className="parent-analytics__stat-item">
                                        <span className="parent-analytics__stat-label">Match Rate</span>
                                        <span className="parent-analytics__stat-value">
                                            {analyticsData.attendanceAnalysis.summary?.match_rate || 0}%
                                        </span>
                                    </div>
                                    <div className="parent-analytics__stat-item">
                                        <span className="parent-analytics__stat-label">Punctuality</span>
                                        <span className="parent-analytics__stat-value">
                                            {analyticsData.attendanceAnalysis.summary?.punctuality_rate || 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Impact */}
                            <div className="parent-analytics__attendance-impact">
                                <h4>🎯 Attendance Impact on Performance</h4>
                                <div className="parent-analytics__impact-chart">
                                    <BarChart
                                        data={analyticsData.attendanceAnalysis.performanceCorrelation || []}
                                        bars={[
                                            { dataKey: 'performance_rating', name: 'Performance Rating', color: '#3498DB' },
                                            { dataKey: 'attendance_rate', name: 'Attendance Rate', color: '#27AE60' }
                                        ]}
                                        xAxisKey="period"
                                        title="Attendance vs Performance"
                                        subtitle="Correlation between attendance and performance"
                                        {...getChartConfig('comparison')}
                                    />
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Peer Comparison Tab */}
                    <Tabs.Content value="comparison">
                        <div className="parent-analytics__section">
                            <h3>👥 Peer Group Comparison</h3>
                            <p className="parent-analytics__privacy-note">
                                🔒 All peer data is anonymized to protect privacy while providing valuable insights.
                            </p>
                            
                            <div className="parent-analytics__charts-grid">
                                <BarChart
                                    data={[
                                        { name: 'Your Child', goals: analyticsData.peerComparison.child_goals || 0 },
                                        { name: 'Peer Average', goals: analyticsData.peerComparison.peer_average_goals || 0 },
                                        { name: 'Top Performer', goals: analyticsData.peerComparison.top_performer_goals || 0 }
                                    ]}
                                    bars={[{ dataKey: 'goals', name: 'Goals', color: '#27AE60' }]}
                                    title="Goal Scoring Comparison"
                                    subtitle="Goals scored vs peer group"
                                    {...getChartConfig('comparison')}
                                />

                                <RadarChart
                                    data={analyticsData.peerComparison.skillComparison || []}
                                    radars={[
                                        { dataKey: 'child_level', name: 'Your Child', color: '#3498DB' },
                                        { dataKey: 'peer_average', name: 'Peer Average', color: '#95A5A6' }
                                    ]}
                                    title="Skill Level Comparison"
                                    subtitle="Skills vs age group average"
                                    {...getChartConfig('skills')}
                                />
                            </div>

                            {/* Comparison Statistics */}
                            <div className="parent-analytics__comparison-stats">
                                <h4>📈 Comparative Performance</h4>
                                <div className="parent-analytics__comparison-grid">
                                    {analyticsData.peerComparison.statistics?.map((stat, index) => (
                                        <div key={index} className="parent-analytics__comparison-item">
                                            <div className="parent-analytics__comparison-metric">
                                                <h5>{stat.metric_name}</h5>
                                                <div className="parent-analytics__comparison-bars">
                                                    <div className="parent-analytics__comparison-bar">
                                                        <span>Your Child</span>
                                                        <div className="parent-analytics__bar-container">
                                                            <div 
                                                                className="parent-analytics__bar parent-analytics__bar--child"
                                                                style={{ width: `${stat.child_percentile}%` }}
                                                            ></div>
                                                        </div>
                                                        <span>{stat.child_value}</span>
                                                    </div>
                                                    <div className="parent-analytics__comparison-bar">
                                                        <span>Peer Average</span>
                                                        <div className="parent-analytics__bar-container">
                                                            <div 
                                                                className="parent-analytics__bar parent-analytics__bar--peer"
                                                                style={{ width: '50%' }}
                                                            ></div>
                                                        </div>
                                                        <span>{stat.peer_average}</span>
                                                    </div>
                                                </div>
                                                <p className="parent-analytics__percentile">
                                                    {stat.child_percentile}th percentile in age group
                                                </p>
                                            </div>
                                        </div>
                                    )) || (
                                        <div className="parent-analytics__empty-state">
                                            <p>Peer comparison data not available yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Achievements Tab */}
                    <Tabs.Content value="achievements">
                        <div className="parent-analytics__section">
                            <h3>🏆 Achievement Timeline</h3>
                            
                            <div className="parent-analytics__achievement-timeline">
                                {analyticsData.achievementTimeline.length > 0 ? (
                                    <div className="parent-analytics__timeline">
                                        {analyticsData.achievementTimeline.map((achievement, index) => (
                                            <div key={index} className="parent-analytics__timeline-item">
                                                <div className="parent-analytics__timeline-date">
                                                    {new Date(achievement.earned_date).toLocaleDateString()}
                                                </div>
                                                <div className="parent-analytics__timeline-content">
                                                    <div className="parent-analytics__achievement-icon">
                                                        {achievement.type === 'goal' && '⚽'}
                                                        {achievement.type === 'skill' && '🎯'}
                                                        {achievement.type === 'attendance' && '📅'}
                                                        {achievement.type === 'leadership' && '👑'}
                                                        {achievement.type === 'improvement' && '📈'}
                                                    </div>
                                                    <div className="parent-analytics__achievement-details">
                                                        <h4>{achievement.title}</h4>
                                                        <p>{achievement.description}</p>
                                                        <span className="parent-analytics__achievement-level">
                                                            {achievement.level} Level
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="parent-analytics__empty-state">
                                        <div className="parent-analytics__empty-icon">🏆</div>
                                        <h4>No Achievements Yet</h4>
                                        <p>Keep playing and improving to unlock achievements!</p>
                                    </div>
                                )}
                            </div>

                            {/* Achievement Categories */}
                            <div className="parent-analytics__achievement-categories">
                                <h4>🎯 Achievement Categories</h4>
                                <div className="parent-analytics__categories-grid">
                                    <PieChart
                                        data={analyticsData.achievementTimeline.reduce((acc, achievement) => {
                                            const existing = acc.find(item => item.name === achievement.type);
                                            if (existing) {
                                                existing.value++;
                                            } else {
                                                acc.push({ name: achievement.type, value: 1 });
                                            }
                                            return acc;
                                        }, [])}
                                        title="Achievement Distribution"
                                        subtitle="Achievements by category"
                                        innerRadius={60}
                                        {...getChartConfig('distribution')}
                                    />
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>
        </div>
    );
};

export default ParentAnalytics;