import React, { useState, useEffect } from 'react';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './MyStats.css';

const MyStats = () => {
    const [statsData, setStatsData] = useState({
        season: {},
        career: {},
        position: {},
        teamComparison: {},
        personalRecords: {},
        progressData: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('season');
    const [selectedSeason, setSelectedSeason] = useState('current');

    useEffect(() => {
        fetchStatsData();
    }, [selectedSeason]);

    const fetchStatsData = async () => {
        try {
            setLoading(true);
            setError('');

            const [seasonRes, careerRes, positionRes, comparisonRes, recordsRes, progressRes] = await Promise.all([
                api.get(`/player/statistics/season?season=${selectedSeason}`),
                api.get('/player/statistics/career'),
                api.get('/player/statistics/position'),
                api.get('/player/statistics/team-comparison'),
                api.get('/player/statistics/records'),
                api.get('/player/statistics/progress')
            ]);

            setStatsData({
                season: seasonRes.data,
                career: careerRes.data,
                position: positionRes.data,
                teamComparison: comparisonRes.data,
                personalRecords: recordsRes.data,
                progressData: progressRes.data
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            setError('Failed to load your statistics. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const renderStatCard = (title, value, icon, subtitle, trend) => (
        <div className="my-stats__stat-card">
            <div className="my-stats__stat-header">
                <span className="my-stats__stat-icon">{icon}</span>
                <h4>{title}</h4>
            </div>
            <div className="my-stats__stat-value">
                {value}
                {trend && (
                    <span className={`my-stats__trend my-stats__trend--${trend > 0 ? 'up' : 'down'}`}>
                        {trend > 0 ? '↗️' : '↘️'} {Math.abs(trend)}%
                    </span>
                )}
            </div>
            {subtitle && <p className="my-stats__stat-subtitle">{subtitle}</p>}
        </div>
    );

    const renderProgressChart = (data, title, color = 'blue') => (
        <div className="my-stats__chart">
            <h4>{title}</h4>
            <div className="my-stats__chart-container">
                <div className="my-stats__chart-bars">
                    {data.map((item, index) => (
                        <div key={index} className="my-stats__chart-bar-container">
                            <div 
                                className={`my-stats__chart-bar my-stats__chart-bar--${color}`}
                                style={{ height: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%` }}
                                title={`${item.label}: ${item.value}`}
                            ></div>
                            <span className="my-stats__chart-label">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderComparisonBar = (playerValue, teamAverage, label, unit = '') => {
        const maxValue = Math.max(playerValue, teamAverage) * 1.2;
        const playerPercentage = (playerValue / maxValue) * 100;
        const teamPercentage = (teamAverage / maxValue) * 100;

        return (
            <div className="my-stats__comparison-item">
                <div className="my-stats__comparison-header">
                    <span className="my-stats__comparison-label">{label}</span>
                    <span className="my-stats__comparison-values">
                        You: {playerValue}{unit} | Team: {teamAverage.toFixed(1)}{unit}
                    </span>
                </div>
                <div className="my-stats__comparison-bars">
                    <div className="my-stats__comparison-bar-container">
                        <div className="my-stats__comparison-bar-label">You</div>
                        <div className="my-stats__comparison-bar-track">
                            <div 
                                className="my-stats__comparison-bar my-stats__comparison-bar--player"
                                style={{ width: `${playerPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="my-stats__comparison-bar-container">
                        <div className="my-stats__comparison-bar-label">Team Avg</div>
                        <div className="my-stats__comparison-bar-track">
                            <div 
                                className="my-stats__comparison-bar my-stats__comparison-bar--team"
                                style={{ width: `${teamPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="my-stats">
                <div className="my-stats__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading your statistics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="my-stats">
            {/* Header */}
            <div className="my-stats__header">
                <div className="my-stats__header-content">
                    <div className="my-stats__title">
                        <h1>📊 My Statistics</h1>
                        <p>Track your progress and see how you're improving!</p>
                    </div>
                    <div className="my-stats__header-controls">
                        <select 
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                            className="my-stats__season-select"
                        >
                            <option value="current">Current Season</option>
                            <option value="2023">2023 Season</option>
                            <option value="2022">2022 Season</option>
                        </select>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Stats Content */}
            <Card>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List>
                        <Tabs.Trigger value="season">Season Stats</Tabs.Trigger>
                        <Tabs.Trigger value="position">Position Stats</Tabs.Trigger>
                        <Tabs.Trigger value="comparison">Team Comparison</Tabs.Trigger>
                        <Tabs.Trigger value="records">Personal Records</Tabs.Trigger>
                        <Tabs.Trigger value="progress">Progress</Tabs.Trigger>
                    </Tabs.List>

                    {/* Season Stats Tab */}
                    <Tabs.Content value="season">
                        <div className="my-stats__section">
                            <h3>⚽ Season Overview</h3>
                            <div className="my-stats__stats-grid">
                                {renderStatCard(
                                    'Goals',
                                    statsData.season.goals || 0,
                                    '⚽',
                                    'Keep shooting!',
                                    statsData.season.goalsTrend
                                )}
                                {renderStatCard(
                                    'Assists',
                                    statsData.season.assists || 0,
                                    '🅰️',
                                    'Great teamwork!',
                                    statsData.season.assistsTrend
                                )}
                                {renderStatCard(
                                    'Matches Played',
                                    statsData.season.matchesPlayed || 0,
                                    '🏟️',
                                    'Experience gained',
                                    statsData.season.matchesTrend
                                )}
                                {renderStatCard(
                                    'Minutes Played',
                                    statsData.season.minutesPlayed || 0,
                                    '⏱️',
                                    'Time on field',
                                    statsData.season.minutesTrend
                                )}
                                {renderStatCard(
                                    'Pass Accuracy',
                                    `${statsData.season.passAccuracy || 0}%`,
                                    '🎯',
                                    'Precision passing',
                                    statsData.season.passAccuracyTrend
                                )}
                                {renderStatCard(
                                    'Shots on Target',
                                    `${statsData.season.shotsOnTarget || 0}%`,
                                    '🏹',
                                    'Accurate shooting',
                                    statsData.season.shotsTrend
                                )}
                            </div>

                            {/* Performance Chart */}
                            <div className="my-stats__chart-section">
                                <h4>🎮 Monthly Performance</h4>
                                {statsData.progressData.length > 0 ? (
                                    <div className="my-stats__charts-grid">
                                        {renderProgressChart(
                                            statsData.progressData.map(item => ({
                                                label: item.month,
                                                value: item.goals
                                            })),
                                            'Goals per Month',
                                            'green'
                                        )}
                                        {renderProgressChart(
                                            statsData.progressData.map(item => ({
                                                label: item.month,
                                                value: item.assists
                                            })),
                                            'Assists per Month',
                                            'blue'
                                        )}
                                    </div>
                                ) : (
                                    <div className="my-stats__empty-chart">
                                        <p>📈 Play more matches to see your progress chart!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Position Stats Tab */}
                    <Tabs.Content value="position">
                        <div className="my-stats__section">
                            <h3>🎯 Position-Specific Stats</h3>
                            <div className="my-stats__position-header">
                                <div className="my-stats__position-info">
                                    <h4>Playing as: {statsData.position.position || 'Not assigned'}</h4>
                                    <p>Here are the key metrics for your position</p>
                                </div>
                            </div>

                            <div className="my-stats__stats-grid">
                                {statsData.position.position === 'Goalkeeper' && (
                                    <>
                                        {renderStatCard('Saves', statsData.position.saves || 0, '🥅', 'Great reflexes!')}
                                        {renderStatCard('Clean Sheets', statsData.position.cleanSheets || 0, '🛡️', 'Solid defense!')}
                                        {renderStatCard('Save %', `${statsData.position.savePercentage || 0}%`, '📊', 'Shot stopping')}
                                    </>
                                )}

                                {['Defender', 'Centre-back'].includes(statsData.position.position) && (
                                    <>
                                        {renderStatCard('Tackles', statsData.position.tackles || 0, '🛡️', 'Strong defending!')}
                                        {renderStatCard('Interceptions', statsData.position.interceptions || 0, '🚫', 'Reading the game!')}
                                        {renderStatCard('Clearances', statsData.position.clearances || 0, '🦵', 'Clearing danger!')}
                                    </>
                                )}

                                {['Midfielder', 'Central Midfielder'].includes(statsData.position.position) && (
                                    <>
                                        {renderStatCard('Pass Accuracy', `${statsData.position.passAccuracy || 0}%`, '🎯', 'Great passing!')}
                                        {renderStatCard('Key Passes', statsData.position.keyPasses || 0, '🔑', 'Creating chances!')}
                                        {renderStatCard('Distance Covered', `${statsData.position.distanceCovered || 0}km`, '🏃', 'Engine of the team!')}
                                    </>
                                )}

                                {['Forward', 'Striker', 'Winger'].includes(statsData.position.position) && (
                                    <>
                                        {renderStatCard('Goals', statsData.position.goals || 0, '⚽', 'Clinical finishing!')}
                                        {renderStatCard('Shots per Game', statsData.position.shotsPerGame || 0, '🏹', 'Always threatening!')}
                                        {renderStatCard('Dribbles', statsData.position.dribbles || 0, '🕺', 'Skillful moves!')}
                                    </>
                                )}

                                {/* Universal stats */}
                                {renderStatCard('Rating', `${statsData.position.averageRating || 0}/5`, '⭐', 'Overall performance')}
                                {renderStatCard('Fouls', statsData.position.fouls || 0, '⚠️', 'Play fair!')}
                                {renderStatCard('Yellow Cards', statsData.position.yellowCards || 0, '🟨', 'Stay disciplined!')}
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Team Comparison Tab */}
                    <Tabs.Content value="comparison">
                        <div className="my-stats__section">
                            <h3>👥 How You Compare</h3>
                            <p className="my-stats__comparison-intro">
                                See how your stats stack up against your teammates!
                            </p>

                            <div className="my-stats__comparison-grid">
                                {renderComparisonBar(
                                    statsData.teamComparison.playerGoals || 0,
                                    statsData.teamComparison.teamAverageGoals || 0,
                                    'Goals'
                                )}
                                {renderComparisonBar(
                                    statsData.teamComparison.playerAssists || 0,
                                    statsData.teamComparison.teamAverageAssists || 0,
                                    'Assists'
                                )}
                                {renderComparisonBar(
                                    statsData.teamComparison.playerMinutes || 0,
                                    statsData.teamComparison.teamAverageMinutes || 0,
                                    'Minutes Played'
                                )}
                                {renderComparisonBar(
                                    statsData.teamComparison.playerPassAccuracy || 0,
                                    statsData.teamComparison.teamAveragePassAccuracy || 0,
                                    'Pass Accuracy',
                                    '%'
                                )}
                                {renderComparisonBar(
                                    statsData.teamComparison.playerRating || 0,
                                    statsData.teamComparison.teamAverageRating || 0,
                                    'Average Rating',
                                    '/5'
                                )}
                            </div>

                            <div className="my-stats__team-ranking">
                                <h4>🏆 Team Rankings</h4>
                                <div className="my-stats__rankings">
                                    <div className="my-stats__ranking-item">
                                        <span className="my-stats__ranking-stat">Goals</span>
                                        <span className="my-stats__ranking-position">
                                            #{statsData.teamComparison.goalsRanking || '-'} of {statsData.teamComparison.teamSize || 0}
                                        </span>
                                    </div>
                                    <div className="my-stats__ranking-item">
                                        <span className="my-stats__ranking-stat">Assists</span>
                                        <span className="my-stats__ranking-position">
                                            #{statsData.teamComparison.assistsRanking || '-'} of {statsData.teamComparison.teamSize || 0}
                                        </span>
                                    </div>
                                    <div className="my-stats__ranking-item">
                                        <span className="my-stats__ranking-stat">Minutes</span>
                                        <span className="my-stats__ranking-position">
                                            #{statsData.teamComparison.minutesRanking || '-'} of {statsData.teamComparison.teamSize || 0}
                                        </span>
                                    </div>
                                    <div className="my-stats__ranking-item">
                                        <span className="my-stats__ranking-stat">Rating</span>
                                        <span className="my-stats__ranking-position">
                                            #{statsData.teamComparison.ratingRanking || '-'} of {statsData.teamComparison.teamSize || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Personal Records Tab */}
                    <Tabs.Content value="records">
                        <div className="my-stats__section">
                            <h3>🏆 Personal Records</h3>
                            <p className="my-stats__records-intro">
                                Your personal bests and memorable moments!
                            </p>

                            <div className="my-stats__records-grid">
                                <div className="my-stats__record-card">
                                    <div className="my-stats__record-icon">⚽</div>
                                    <div className="my-stats__record-content">
                                        <h4>Most Goals in a Match</h4>
                                        <div className="my-stats__record-value">
                                            {statsData.personalRecords.mostGoalsInMatch || 0}
                                        </div>
                                        <p className="my-stats__record-date">
                                            {statsData.personalRecords.mostGoalsDate || 'Not set yet'}
                                        </p>
                                    </div>
                                </div>

                                <div className="my-stats__record-card">
                                    <div className="my-stats__record-icon">🅰️</div>
                                    <div className="my-stats__record-content">
                                        <h4>Most Assists in a Match</h4>
                                        <div className="my-stats__record-value">
                                            {statsData.personalRecords.mostAssistsInMatch || 0}
                                        </div>
                                        <p className="my-stats__record-date">
                                            {statsData.personalRecords.mostAssistsDate || 'Not set yet'}
                                        </p>
                                    </div>
                                </div>

                                <div className="my-stats__record-card">
                                    <div className="my-stats__record-icon">⭐</div>
                                    <div className="my-stats__record-content">
                                        <h4>Highest Match Rating</h4>
                                        <div className="my-stats__record-value">
                                            {statsData.personalRecords.highestRating || 0}/5
                                        </div>
                                        <p className="my-stats__record-date">
                                            {statsData.personalRecords.highestRatingDate || 'Not set yet'}
                                        </p>
                                    </div>
                                </div>

                                <div className="my-stats__record-card">
                                    <div className="my-stats__record-icon">🔥</div>
                                    <div className="my-stats__record-content">
                                        <h4>Longest Goal Streak</h4>
                                        <div className="my-stats__record-value">
                                            {statsData.personalRecords.longestGoalStreak || 0} games
                                        </div>
                                        <p className="my-stats__record-date">
                                            {statsData.personalRecords.streakPeriod || 'Not set yet'}
                                        </p>
                                    </div>
                                </div>

                                <div className="my-stats__record-card">
                                    <div className="my-stats__record-icon">⏱️</div>
                                    <div className="my-stats__record-content">
                                        <h4>Most Minutes in Season</h4>
                                        <div className="my-stats__record-value">
                                            {statsData.personalRecords.mostMinutesInSeason || 0}
                                        </div>
                                        <p className="my-stats__record-date">
                                            {statsData.personalRecords.mostMinutesSeason || 'Not set yet'}
                                        </p>
                                    </div>
                                </div>

                                <div className="my-stats__record-card">
                                    <div className="my-stats__record-icon">🎯</div>
                                    <div className="my-stats__record-content">
                                        <h4>Best Pass Accuracy</h4>
                                        <div className="my-stats__record-value">
                                            {statsData.personalRecords.bestPassAccuracy || 0}%
                                        </div>
                                        <p className="my-stats__record-date">
                                            {statsData.personalRecords.passAccuracyDate || 'Not set yet'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="my-stats__milestones">
                                <h4>🎖️ Milestones</h4>
                                <div className="my-stats__milestones-list">
                                    <div className="my-stats__milestone">
                                        <span className="my-stats__milestone-icon">⚽</span>
                                        <span className="my-stats__milestone-text">
                                            First Goal: {statsData.personalRecords.firstGoalDate || 'Still hunting for it!'}
                                        </span>
                                    </div>
                                    <div className="my-stats__milestone">
                                        <span className="my-stats__milestone-icon">🏟️</span>
                                        <span className="my-stats__milestone-text">
                                            First Match: {statsData.personalRecords.firstMatchDate || 'Coming soon!'}
                                        </span>
                                    </div>
                                    <div className="my-stats__milestone">
                                        <span className="my-stats__milestone-icon">🅰️</span>
                                        <span className="my-stats__milestone-text">
                                            First Assist: {statsData.personalRecords.firstAssistDate || 'Keep creating chances!'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>

                    {/* Progress Tab */}
                    <Tabs.Content value="progress">
                        <div className="my-stats__section">
                            <h3>📈 Your Progress Journey</h3>
                            <p className="my-stats__progress-intro">
                                Watch how you've grown as a player over time!
                            </p>

                            {statsData.progressData.length > 0 ? (
                                <div className="my-stats__progress-charts">
                                    <div className="my-stats__progress-chart">
                                        <h4>⚽ Goals Progress</h4>
                                        <div className="my-stats__progress-line">
                                            {statsData.progressData.map((month, index) => (
                                                <div key={index} className="my-stats__progress-point">
                                                    <div 
                                                        className="my-stats__progress-dot"
                                                        style={{ 
                                                            height: `${Math.max(month.goals * 10, 10)}px`,
                                                            backgroundColor: month.goals > 0 ? '#22c55e' : '#e5e7eb'
                                                        }}
                                                    ></div>
                                                    <span className="my-stats__progress-label">{month.month}</span>
                                                    <span className="my-stats__progress-value">{month.goals}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="my-stats__progress-chart">
                                        <h4>🅰️ Assists Progress</h4>
                                        <div className="my-stats__progress-line">
                                            {statsData.progressData.map((month, index) => (
                                                <div key={index} className="my-stats__progress-point">
                                                    <div 
                                                        className="my-stats__progress-dot"
                                                        style={{ 
                                                            height: `${Math.max(month.assists * 10, 10)}px`,
                                                            backgroundColor: month.assists > 0 ? '#3b82f6' : '#e5e7eb'
                                                        }}
                                                    ></div>
                                                    <span className="my-stats__progress-label">{month.month}</span>
                                                    <span className="my-stats__progress-value">{month.assists}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="my-stats__progress-chart">
                                        <h4>⭐ Rating Progress</h4>
                                        <div className="my-stats__progress-line">
                                            {statsData.progressData.map((month, index) => (
                                                <div key={index} className="my-stats__progress-point">
                                                    <div 
                                                        className="my-stats__progress-dot"
                                                        style={{ 
                                                            height: `${Math.max(month.rating * 20, 10)}px`,
                                                            backgroundColor: month.rating >= 4 ? '#f59e0b' : month.rating >= 3 ? '#3b82f6' : '#e5e7eb'
                                                        }}
                                                    ></div>
                                                    <span className="my-stats__progress-label">{month.month}</span>
                                                    <span className="my-stats__progress-value">{month.rating}/5</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="my-stats__empty-progress">
                                    <div className="my-stats__empty-progress-icon">📊</div>
                                    <h4>Start Your Journey!</h4>
                                    <p>Play some matches and attend training to see your progress charts appear here.</p>
                                </div>
                            )}

                            <div className="my-stats__improvement-tips">
                                <h4>💡 Tips to Improve</h4>
                                <div className="my-stats__tips-grid">
                                    <div className="my-stats__tip">
                                        <div className="my-stats__tip-icon">⚽</div>
                                        <div className="my-stats__tip-content">
                                            <h5>Score More Goals</h5>
                                            <p>Practice shooting from different angles and distances</p>
                                        </div>
                                    </div>
                                    <div className="my-stats__tip">
                                        <div className="my-stats__tip-icon">🏃</div>
                                        <div className="my-stats__tip-content">
                                            <h5>Attend Training</h5>
                                            <p>Regular training improves all your skills</p>
                                        </div>
                                    </div>
                                    <div className="my-stats__tip">
                                        <div className="my-stats__tip-icon">🤝</div>
                                        <div className="my-stats__tip-content">
                                            <h5>Be a Team Player</h5>
                                            <p>Look for assist opportunities to help your team</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Tabs.Content>
                </Tabs>
            </Card>
        </div>
    );
};

export default MyStats;