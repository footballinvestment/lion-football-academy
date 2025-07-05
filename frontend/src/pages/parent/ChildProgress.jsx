import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, Alert, LoadingSpinner, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './ChildProgress.css';

const ChildProgress = () => {
    const { user } = useAuth();
    const [progressData, setProgressData] = useState({
        children: [],
        selectedChildProgress: {},
        coachFeedback: [],
        skillDevelopment: {},
        attendanceData: {},
        peerComparison: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        fetchChildrenData();
    }, []);

    useEffect(() => {
        if (selectedChild) {
            fetchChildProgress(selectedChild.id);
        }
    }, [selectedChild]);

    const fetchChildrenData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/parent/children');
            setProgressData(prev => ({
                ...prev,
                children: response.data
            }));
            
            if (response.data.length > 0) {
                setSelectedChild(response.data[0]);
            }
        } catch (error) {
            console.error('Error fetching children:', error);
            setError('Failed to load children data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchChildProgress = async (childId) => {
        try {
            setLoading(true);
            setError('');

            const [progressRes, feedbackRes, skillsRes, attendanceRes, comparisonRes] = await Promise.all([
                api.get(`/parent/children/${childId}/progress`),
                api.get(`/parent/children/${childId}/feedback`),
                api.get(`/parent/children/${childId}/skills`),
                api.get(`/parent/children/${childId}/attendance`),
                api.get(`/parent/children/${childId}/peer-comparison`)
            ]);

            setProgressData(prev => ({
                ...prev,
                selectedChildProgress: progressRes.data,
                coachFeedback: feedbackRes.data,
                skillDevelopment: skillsRes.data,
                attendanceData: attendanceRes.data,
                peerComparison: comparisonRes.data
            }));
        } catch (error) {
            console.error('Error fetching child progress:', error);
            setError('Failed to load progress data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
        return age;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getSkillLevel = (score) => {
        if (score >= 90) return { level: 'Excellent', color: 'excellent' };
        if (score >= 75) return { level: 'Good', color: 'good' };
        if (score >= 60) return { level: 'Developing', color: 'developing' };
        return { level: 'Needs Work', color: 'needs-work' };
    };

    const renderSkillBar = (skill, score, maxScore = 100) => {
        const percentage = (score / maxScore) * 100;
        const skillInfo = getSkillLevel(score);
        
        return (
            <div key={skill} className="child-progress__skill-item">
                <div className="child-progress__skill-header">
                    <span className="child-progress__skill-name">{skill}</span>
                    <span className={`child-progress__skill-level child-progress__skill-level--${skillInfo.color}`}>
                        {skillInfo.level}
                    </span>
                </div>
                <div className="child-progress__skill-bar-container">
                    <div className="child-progress__skill-bar-track">
                        <div 
                            className={`child-progress__skill-bar child-progress__skill-bar--${skillInfo.color}`}
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    <span className="child-progress__skill-score">{score}/{maxScore}</span>
                </div>
            </div>
        );
    };

    const renderProgressChart = (data, title, color = 'blue') => (
        <div className="child-progress__chart">
            <h4>{title}</h4>
            <div className="child-progress__chart-container">
                <div className="child-progress__chart-bars">
                    {data.map((item, index) => (
                        <div key={index} className="child-progress__chart-bar-container">
                            <div 
                                className={`child-progress__chart-bar child-progress__chart-bar--${color}`}
                                style={{ height: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%` }}
                                title={`${item.label}: ${item.value}`}
                            ></div>
                            <span className="child-progress__chart-label">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderComparisonBar = (childValue, peerAverage, label, unit = '') => {
        const maxValue = Math.max(childValue, peerAverage) * 1.2;
        const childPercentage = (childValue / maxValue) * 100;
        const peerPercentage = (peerAverage / maxValue) * 100;

        return (
            <div className="child-progress__comparison-item">
                <div className="child-progress__comparison-header">
                    <span className="child-progress__comparison-label">{label}</span>
                    <span className="child-progress__comparison-values">
                        Your child: {childValue}{unit} | Peer avg: {peerAverage.toFixed(1)}{unit}
                    </span>
                </div>
                <div className="child-progress__comparison-bars">
                    <div className="child-progress__comparison-bar-container">
                        <div className="child-progress__comparison-bar-label">Your Child</div>
                        <div className="child-progress__comparison-bar-track">
                            <div 
                                className="child-progress__comparison-bar child-progress__comparison-bar--child"
                                style={{ width: `${childPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="child-progress__comparison-bar-container">
                        <div className="child-progress__comparison-bar-label">Peer Average</div>
                        <div className="child-progress__comparison-bar-track">
                            <div 
                                className="child-progress__comparison-bar child-progress__comparison-bar--peer"
                                style={{ width: `${peerPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading && !selectedChild) {
        return (
            <div className="child-progress">
                <div className="child-progress__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading progress data...</p>
                </div>
            </div>
        );
    }

    if (progressData.children.length === 0) {
        return (
            <div className="child-progress">
                <div className="child-progress__empty">
                    <h2>📈 Child Progress Tracking</h2>
                    <p>No children are currently registered for progress tracking.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="child-progress">
            {/* Header */}
            <div className="child-progress__header">
                <div className="child-progress__header-content">
                    <div className="child-progress__title">
                        <h1>📈 Child Development Progress</h1>
                        <p>Track your child's football journey and skill development</p>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Child Selector */}
            {progressData.children.length > 1 && (
                <div className="child-progress__child-selector">
                    <Card>
                        <Card.Header>
                            <h3>👶 Select Child</h3>
                        </Card.Header>
                        <Card.Body>
                            <div className="child-progress__children-list">
                                {progressData.children.map(child => (
                                    <button
                                        key={child.id}
                                        className={`child-progress__child-button ${
                                            selectedChild?.id === child.id ? 'child-progress__child-button--selected' : ''
                                        }`}
                                        onClick={() => setSelectedChild(child)}
                                    >
                                        <div className="child-progress__child-avatar">
                                            {child.profile_picture ? (
                                                <img src={child.profile_picture} alt={child.first_name} />
                                            ) : (
                                                <div className="child-progress__child-initials">
                                                    {child.first_name?.[0]}{child.last_name?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="child-progress__child-info">
                                            <h4>{child.first_name} {child.last_name}</h4>
                                            <p>Age {calculateAge(child.birth_date)} • {child.position || 'No position'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            )}

            {/* Selected Child Progress */}
            {selectedChild && (
                <Card>
                    <Card.Header>
                        <div className="child-progress__selected-child">
                            <div className="child-progress__selected-avatar">
                                {selectedChild.profile_picture ? (
                                    <img src={selectedChild.profile_picture} alt={selectedChild.first_name} />
                                ) : (
                                    <div className="child-progress__selected-initials">
                                        {selectedChild.first_name?.[0]}{selectedChild.last_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div className="child-progress__selected-info">
                                <h2>{selectedChild.first_name} {selectedChild.last_name}</h2>
                                <p>
                                    Age {calculateAge(selectedChild.birth_date)} • 
                                    {selectedChild.position || 'No position'} • 
                                    {selectedChild.team_name || 'Not assigned to team'}
                                </p>
                            </div>
                        </div>
                    </Card.Header>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <Tabs.List>
                            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
                            <Tabs.Trigger value="skills">Skill Development</Tabs.Trigger>
                            <Tabs.Trigger value="feedback">Coach Feedback</Tabs.Trigger>
                            <Tabs.Trigger value="attendance">Attendance</Tabs.Trigger>
                            <Tabs.Trigger value="comparison">Peer Comparison</Tabs.Trigger>
                        </Tabs.List>

                        {/* Overview Tab */}
                        <Tabs.Content value="overview">
                            <div className="child-progress__section">
                                <div className="child-progress__overview-stats">
                                    <div className="child-progress__stat-card">
                                        <div className="child-progress__stat-icon">⚽</div>
                                        <div className="child-progress__stat-content">
                                            <h4>Goals This Season</h4>
                                            <div className="child-progress__stat-value">
                                                {progressData.selectedChildProgress.goals || 0}
                                            </div>
                                            <p>
                                                {progressData.selectedChildProgress.goalsTrend > 0 && '📈 +'}
                                                {progressData.selectedChildProgress.goalsTrend < 0 && '📉 '}
                                                {Math.abs(progressData.selectedChildProgress.goalsTrend || 0)}% from last month
                                            </p>
                                        </div>
                                    </div>

                                    <div className="child-progress__stat-card">
                                        <div className="child-progress__stat-icon">🅰️</div>
                                        <div className="child-progress__stat-content">
                                            <h4>Assists</h4>
                                            <div className="child-progress__stat-value">
                                                {progressData.selectedChildProgress.assists || 0}
                                            </div>
                                            <p>Great teamwork skills!</p>
                                        </div>
                                    </div>

                                    <div className="child-progress__stat-card">
                                        <div className="child-progress__stat-icon">⭐</div>
                                        <div className="child-progress__stat-content">
                                            <h4>Overall Rating</h4>
                                            <div className="child-progress__stat-value">
                                                {progressData.selectedChildProgress.rating || 0}/5
                                            </div>
                                            <p>Coach evaluation</p>
                                        </div>
                                    </div>

                                    <div className="child-progress__stat-card">
                                        <div className="child-progress__stat-icon">🎯</div>
                                        <div className="child-progress__stat-content">
                                            <h4>Attendance Rate</h4>
                                            <div className="child-progress__stat-value">
                                                {progressData.selectedChildProgress.attendance || 0}%
                                            </div>
                                            <p>Training & matches</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Charts */}
                                {progressData.selectedChildProgress.monthlyProgress && (
                                    <div className="child-progress__charts-section">
                                        <h4>📊 Monthly Progress</h4>
                                        <div className="child-progress__charts-grid">
                                            {renderProgressChart(
                                                progressData.selectedChildProgress.monthlyProgress.goals || [],
                                                'Goals per Month',
                                                'green'
                                            )}
                                            {renderProgressChart(
                                                progressData.selectedChildProgress.monthlyProgress.performance || [],
                                                'Performance Rating',
                                                'blue'
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Recent Highlights */}
                                <div className="child-progress__highlights">
                                    <h4>🌟 Recent Highlights</h4>
                                    <div className="child-progress__highlights-list">
                                        {progressData.selectedChildProgress.highlights?.map((highlight, index) => (
                                            <div key={index} className="child-progress__highlight-item">
                                                <div className="child-progress__highlight-icon">
                                                    {highlight.type === 'goal' && '⚽'}
                                                    {highlight.type === 'improvement' && '📈'}
                                                    {highlight.type === 'achievement' && '🏆'}
                                                    {highlight.type === 'teamwork' && '🤝'}
                                                </div>
                                                <div className="child-progress__highlight-content">
                                                    <h5>{highlight.title}</h5>
                                                    <p>{highlight.description}</p>
                                                    <span className="child-progress__highlight-date">
                                                        {formatDate(highlight.date)}
                                                    </span>
                                                </div>
                                            </div>
                                        )) || (
                                            <div className="child-progress__empty-state">
                                                <p>Keep playing to unlock achievements and highlights! 🌟</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Tabs.Content>

                        {/* Skills Development Tab */}
                        <Tabs.Content value="skills">
                            <div className="child-progress__section">
                                <h3>⚽ Skill Development Assessment</h3>
                                <p className="child-progress__skills-intro">
                                    Your child's technical skills are evaluated by coaches during training and matches.
                                </p>

                                <div className="child-progress__skills-categories">
                                    <div className="child-progress__skills-category">
                                        <h4>⚽ Technical Skills</h4>
                                        <div className="child-progress__skills-list">
                                            {Object.entries(progressData.skillDevelopment.technical || {}).map(([skill, score]) =>
                                                renderSkillBar(skill, score)
                                            )}
                                        </div>
                                    </div>

                                    <div className="child-progress__skills-category">
                                        <h4>🏃 Physical Skills</h4>
                                        <div className="child-progress__skills-list">
                                            {Object.entries(progressData.skillDevelopment.physical || {}).map(([skill, score]) =>
                                                renderSkillBar(skill, score)
                                            )}
                                        </div>
                                    </div>

                                    <div className="child-progress__skills-category">
                                        <h4>🧠 Mental/Tactical Skills</h4>
                                        <div className="child-progress__skills-list">
                                            {Object.entries(progressData.skillDevelopment.mental || {}).map(([skill, score]) =>
                                                renderSkillBar(skill, score)
                                            )}
                                        </div>
                                    </div>

                                    <div className="child-progress__skills-category">
                                        <h4>🤝 Social Skills</h4>
                                        <div className="child-progress__skills-list">
                                            {Object.entries(progressData.skillDevelopment.social || {}).map(([skill, score]) =>
                                                renderSkillBar(skill, score)
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Improvement Recommendations */}
                                <div className="child-progress__recommendations">
                                    <h4>💡 Areas for Improvement</h4>
                                    <div className="child-progress__recommendations-list">
                                        {progressData.skillDevelopment.recommendations?.map((rec, index) => (
                                            <div key={index} className="child-progress__recommendation-item">
                                                <div className="child-progress__recommendation-icon">
                                                    {rec.priority === 'high' && '🔴'}
                                                    {rec.priority === 'medium' && '🟡'}
                                                    {rec.priority === 'low' && '🟢'}
                                                </div>
                                                <div className="child-progress__recommendation-content">
                                                    <h5>{rec.skill}</h5>
                                                    <p>{rec.suggestion}</p>
                                                    <span className="child-progress__recommendation-coach">
                                                        Coach recommendation
                                                    </span>
                                                </div>
                                            </div>
                                        )) || (
                                            <div className="child-progress__empty-state">
                                                <p>Great job! No specific areas need immediate attention. Keep up the excellent work! 🌟</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Tabs.Content>

                        {/* Coach Feedback Tab */}
                        <Tabs.Content value="feedback">
                            <div className="child-progress__section">
                                <h3>💬 Coach Feedback & Evaluations</h3>
                                <p className="child-progress__feedback-intro">
                                    Direct feedback from your child's coaches about their progress and development.
                                </p>

                                {progressData.coachFeedback.length > 0 ? (
                                    <div className="child-progress__feedback-list">
                                        {progressData.coachFeedback.map((feedback, index) => (
                                            <div key={index} className="child-progress__feedback-item">
                                                <div className="child-progress__feedback-header">
                                                    <div className="child-progress__coach-info">
                                                        <div className="child-progress__coach-avatar">
                                                            {feedback.coach_photo ? (
                                                                <img src={feedback.coach_photo} alt={feedback.coach_name} />
                                                            ) : (
                                                                <div className="child-progress__coach-initials">
                                                                    {feedback.coach_name?.split(' ').map(n => n[0]).join('')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="child-progress__coach-details">
                                                            <h4>Coach {feedback.coach_name}</h4>
                                                            <p>{feedback.session_type} • {formatDate(feedback.date)}</p>
                                                        </div>
                                                    </div>
                                                    <div className={`child-progress__feedback-rating child-progress__feedback-rating--${getSkillLevel(feedback.rating * 20).color}`}>
                                                        {Array.from({ length: 5 }, (_, i) => (
                                                            <span key={i} className={i < feedback.rating ? 'filled' : 'empty'}>⭐</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="child-progress__feedback-content">
                                                    <div className="child-progress__feedback-sections">
                                                        {feedback.strengths && (
                                                            <div className="child-progress__feedback-section">
                                                                <h5>💪 Strengths</h5>
                                                                <p>{feedback.strengths}</p>
                                                            </div>
                                                        )}
                                                        {feedback.areas_for_improvement && (
                                                            <div className="child-progress__feedback-section">
                                                                <h5>📈 Areas for Improvement</h5>
                                                                <p>{feedback.areas_for_improvement}</p>
                                                            </div>
                                                        )}
                                                        {feedback.goals && (
                                                            <div className="child-progress__feedback-section">
                                                                <h5>🎯 Goals for Next Period</h5>
                                                                <p>{feedback.goals}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {feedback.notes && (
                                                        <div className="child-progress__feedback-notes">
                                                            <h5>📝 Additional Notes</h5>
                                                            <p>{feedback.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="child-progress__empty-state">
                                        <p>📝 No coach feedback available yet. Feedback will appear here after training sessions and evaluations.</p>
                                    </div>
                                )}
                            </div>
                        </Tabs.Content>

                        {/* Attendance Tab */}
                        <Tabs.Content value="attendance">
                            <div className="child-progress__section">
                                <h3>📅 Attendance Monitoring</h3>
                                <p className="child-progress__attendance-intro">
                                    Track your child's attendance at training sessions, matches, and events.
                                </p>

                                <div className="child-progress__attendance-stats">
                                    <div className="child-progress__attendance-overview">
                                        <div className="child-progress__attendance-card">
                                            <h4>Overall Attendance</h4>
                                            <div className="child-progress__attendance-percentage">
                                                {progressData.attendanceData.overall || 0}%
                                            </div>
                                            <div className="child-progress__attendance-bar">
                                                <div 
                                                    className="child-progress__attendance-fill"
                                                    style={{ width: `${progressData.attendanceData.overall || 0}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="child-progress__attendance-breakdown">
                                            <div className="child-progress__attendance-item">
                                                <span className="child-progress__attendance-label">Training Sessions</span>
                                                <span className="child-progress__attendance-value">
                                                    {progressData.attendanceData.training || 0}%
                                                </span>
                                            </div>
                                            <div className="child-progress__attendance-item">
                                                <span className="child-progress__attendance-label">Matches</span>
                                                <span className="child-progress__attendance-value">
                                                    {progressData.attendanceData.matches || 0}%
                                                </span>
                                            </div>
                                            <div className="child-progress__attendance-item">
                                                <span className="child-progress__attendance-label">Events</span>
                                                <span className="child-progress__attendance-value">
                                                    {progressData.attendanceData.events || 0}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Monthly Attendance Chart */}
                                {progressData.attendanceData.monthly && (
                                    <div className="child-progress__attendance-chart">
                                        <h4>📊 Monthly Attendance Trend</h4>
                                        {renderProgressChart(
                                            progressData.attendanceData.monthly,
                                            'Attendance Percentage by Month',
                                            'green'
                                        )}
                                    </div>
                                )}

                                {/* Recent Attendance */}
                                <div className="child-progress__recent-attendance">
                                    <h4>📋 Recent Attendance</h4>
                                    {progressData.attendanceData.recent?.length > 0 ? (
                                        <div className="child-progress__attendance-list">
                                            {progressData.attendanceData.recent.map((session, index) => (
                                                <div key={index} className="child-progress__attendance-session">
                                                    <div className="child-progress__session-icon">
                                                        {session.type === 'training' && '🏃'}
                                                        {session.type === 'match' && '⚽'}
                                                        {session.type === 'event' && '🎉'}
                                                    </div>
                                                    <div className="child-progress__session-info">
                                                        <h5>{session.title}</h5>
                                                        <p>{formatDate(session.date)}</p>
                                                    </div>
                                                    <div className={`child-progress__session-status child-progress__session-status--${session.status}`}>
                                                        {session.status === 'present' && '✅ Present'}
                                                        {session.status === 'absent' && '❌ Absent'}
                                                        {session.status === 'late' && '⏰ Late'}
                                                        {session.status === 'excused' && '💬 Excused'}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="child-progress__empty-state">
                                            <p>📅 No recent attendance data available.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Tabs.Content>

                        {/* Peer Comparison Tab */}
                        <Tabs.Content value="comparison">
                            <div className="child-progress__section">
                                <h3>👥 Peer Comparison (Anonymized)</h3>
                                <p className="child-progress__comparison-intro">
                                    See how your child compares to peers in their age group. All data is anonymized to protect privacy.
                                </p>

                                <div className="child-progress__comparison-disclaimer">
                                    <div className="child-progress__disclaimer-icon">🔒</div>
                                    <div className="child-progress__disclaimer-content">
                                        <h4>Privacy Protection</h4>
                                        <p>This comparison shows aggregated, anonymized data from children in the same age group. Individual identities are never revealed.</p>
                                    </div>
                                </div>

                                <div className="child-progress__comparison-grid">
                                    {renderComparisonBar(
                                        progressData.peerComparison.childGoals || 0,
                                        progressData.peerComparison.peerAverageGoals || 0,
                                        'Goals This Season'
                                    )}
                                    {renderComparisonBar(
                                        progressData.peerComparison.childAssists || 0,
                                        progressData.peerComparison.peerAverageAssists || 0,
                                        'Assists This Season'
                                    )}
                                    {renderComparisonBar(
                                        progressData.peerComparison.childAttendance || 0,
                                        progressData.peerComparison.peerAverageAttendance || 0,
                                        'Attendance Rate',
                                        '%'
                                    )}
                                    {renderComparisonBar(
                                        progressData.peerComparison.childRating || 0,
                                        progressData.peerComparison.peerAverageRating || 0,
                                        'Coach Rating',
                                        '/5'
                                    )}
                                </div>

                                <div className="child-progress__peer-insights">
                                    <h4>💡 Insights</h4>
                                    <div className="child-progress__insights-list">
                                        {progressData.peerComparison.insights?.map((insight, index) => (
                                            <div key={index} className={`child-progress__insight-item child-progress__insight-item--${insight.type}`}>
                                                <div className="child-progress__insight-icon">
                                                    {insight.type === 'strength' && '💪'}
                                                    {insight.type === 'opportunity' && '📈'}
                                                    {insight.type === 'encouragement' && '🌟'}
                                                </div>
                                                <div className="child-progress__insight-content">
                                                    <h5>{insight.title}</h5>
                                                    <p>{insight.description}</p>
                                                </div>
                                            </div>
                                        )) || (
                                            <div className="child-progress__empty-state">
                                                <p>📊 Comparison insights will appear as more data becomes available.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Tabs.Content>
                    </Tabs>
                </Card>
            )}
        </div>
    );
};

export default ChildProgress;