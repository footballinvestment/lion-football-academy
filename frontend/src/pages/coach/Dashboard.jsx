import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, StatCard, Alert, LoadingSpinner } from '../../components/ui';
import { api } from '../../services/api';
import './Dashboard.css';

const CoachDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        teams: [],
        statistics: {},
        recentActivity: [],
        upcomingEvents: [],
        notifications: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');

            const [teamsRes, statsRes, activityRes, eventsRes, notificationsRes] = await Promise.all([
                api.get('/coach/teams'),
                api.get('/coach/statistics'),
                api.get('/coach/recent-activity'),
                api.get('/coach/upcoming-events'),
                api.get('/coach/notifications')
            ]);

            setDashboardData({
                teams: teamsRes.data,
                statistics: statsRes.data,
                recentActivity: activityRes.data,
                upcomingEvents: eventsRes.data,
                notifications: notificationsRes.data
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getActivityIcon = (type) => {
        const icons = {
            training: '🏃',
            match: '⚽',
            injury: '🩹',
            performance: '📊',
            communication: '💬'
        };
        return icons[type] || '📝';
    };

    const getEventPriority = (type) => {
        const priorities = {
            match: 'high',
            training: 'medium',
            meeting: 'low'
        };
        return priorities[type] || 'medium';
    };

    if (loading) {
        return (
            <div className="coach-dashboard">
                <div className="coach-dashboard__header">
                    <h1>Coach Dashboard</h1>
                </div>
                <div className="coach-dashboard__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="coach-dashboard">
            {/* Header */}
            <div className="coach-dashboard__header">
                <div className="coach-dashboard__header-content">
                    <div className="coach-dashboard__title">
                        <h1>Welcome back, Coach {user?.last_name}</h1>
                        <p className="coach-dashboard__subtitle">
                            Manage your teams and track their progress
                        </p>
                    </div>
                    <div className="coach-dashboard__header-actions">
                        <Button 
                            as={Link} 
                            to="/coach/trainings/new"
                            variant="primary"
                            className="coach-dashboard__quick-action"
                        >
                            📅 Schedule Training
                        </Button>
                        <Button 
                            as={Link} 
                            to="/coach/matches/new"
                            variant="secondary"
                            className="coach-dashboard__quick-action"
                        >
                            ⚽ Create Match
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Quick Stats */}
            <div className="coach-dashboard__stats">
                <StatCard
                    title="Total Players"
                    value={dashboardData.statistics.totalPlayers || 0}
                    icon="👥"
                    trend={dashboardData.statistics.playersTrend}
                    color="blue"
                />
                <StatCard
                    title="Active Teams"
                    value={dashboardData.teams?.length || 0}
                    icon="🏆"
                    trend={dashboardData.statistics.teamsTrend}
                    color="green"
                />
                <StatCard
                    title="This Week's Trainings"
                    value={dashboardData.statistics.weeklyTrainings || 0}
                    icon="🏃"
                    trend={dashboardData.statistics.trainingsTrend}
                    color="orange"
                />
                <StatCard
                    title="Upcoming Matches"
                    value={dashboardData.statistics.upcomingMatches || 0}
                    icon="⚽"
                    trend={dashboardData.statistics.matchesTrend}
                    color="purple"
                />
            </div>

            <div className="coach-dashboard__content">
                {/* Quick Actions Panel */}
                <div className="coach-dashboard__section">
                    <Card>
                        <Card.Header>
                            <h2>Quick Actions</h2>
                        </Card.Header>
                        <Card.Body>
                            <div className="coach-dashboard__quick-actions">
                                <Button 
                                    as={Link} 
                                    to="/coach/teams"
                                    variant="ghost"
                                    className="coach-dashboard__action-btn"
                                >
                                    <span className="coach-dashboard__action-icon">👥</span>
                                    <div className="coach-dashboard__action-content">
                                        <h3>Manage Teams</h3>
                                        <p>View and manage your teams</p>
                                    </div>
                                </Button>

                                <Button 
                                    as={Link} 
                                    to="/coach/players"
                                    variant="ghost"
                                    className="coach-dashboard__action-btn"
                                >
                                    <span className="coach-dashboard__action-icon">⭐</span>
                                    <div className="coach-dashboard__action-content">
                                        <h3>Player Performance</h3>
                                        <p>Track individual progress</p>
                                    </div>
                                </Button>

                                <Button 
                                    as={Link} 
                                    to="/coach/trainings"
                                    variant="ghost"
                                    className="coach-dashboard__action-btn"
                                >
                                    <span className="coach-dashboard__action-icon">📋</span>
                                    <div className="coach-dashboard__action-content">
                                        <h3>Training Plans</h3>
                                        <p>Create and manage training sessions</p>
                                    </div>
                                </Button>

                                <Button 
                                    as={Link} 
                                    to="/coach/statistics"
                                    variant="ghost"
                                    className="coach-dashboard__action-btn"
                                >
                                    <span className="coach-dashboard__action-icon">📊</span>
                                    <div className="coach-dashboard__action-content">
                                        <h3>Analytics</h3>
                                        <p>View team statistics and insights</p>
                                    </div>
                                </Button>

                                <Button 
                                    as={Link} 
                                    to="/coach/injuries"
                                    variant="ghost"
                                    className="coach-dashboard__action-btn"
                                >
                                    <span className="coach-dashboard__action-icon">🩹</span>
                                    <div className="coach-dashboard__action-content">
                                        <h3>Injury Management</h3>
                                        <p>Monitor player health status</p>
                                    </div>
                                </Button>

                                <Button 
                                    as={Link} 
                                    to="/announcements"
                                    variant="ghost"
                                    className="coach-dashboard__action-btn"
                                >
                                    <span className="coach-dashboard__action-icon">📢</span>
                                    <div className="coach-dashboard__action-content">
                                        <h3>Communication</h3>
                                        <p>Send announcements and updates</p>
                                    </div>
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </div>

                <div className="coach-dashboard__columns">
                    {/* Recent Activity */}
                    <div className="coach-dashboard__column">
                        <Card>
                            <Card.Header>
                                <h2>Recent Activity</h2>
                                <Button 
                                    as={Link} 
                                    to="/coach/activity"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View All
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {dashboardData.recentActivity.length > 0 ? (
                                    <div className="coach-dashboard__activity-list">
                                        {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                                            <div key={index} className="coach-dashboard__activity-item">
                                                <span className="coach-dashboard__activity-icon">
                                                    {getActivityIcon(activity.type)}
                                                </span>
                                                <div className="coach-dashboard__activity-content">
                                                    <p className="coach-dashboard__activity-text">
                                                        {activity.description}
                                                    </p>
                                                    <span className="coach-dashboard__activity-time">
                                                        {formatDate(activity.timestamp)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="coach-dashboard__empty-state">
                                        No recent activity to display
                                    </p>
                                )}
                            </Card.Body>
                        </Card>
                    </div>

                    {/* Upcoming Events */}
                    <div className="coach-dashboard__column">
                        <Card>
                            <Card.Header>
                                <h2>Upcoming Events</h2>
                                <Button 
                                    as={Link} 
                                    to="/coach/calendar"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View Calendar
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {dashboardData.upcomingEvents.length > 0 ? (
                                    <div className="coach-dashboard__events-list">
                                        {dashboardData.upcomingEvents.slice(0, 5).map((event, index) => (
                                            <div key={index} className="coach-dashboard__event-item">
                                                <div className={`coach-dashboard__event-priority coach-dashboard__event-priority--${getEventPriority(event.type)}`}>
                                                    <span className="coach-dashboard__event-icon">
                                                        {getActivityIcon(event.type)}
                                                    </span>
                                                </div>
                                                <div className="coach-dashboard__event-content">
                                                    <h4 className="coach-dashboard__event-title">
                                                        {event.title}
                                                    </h4>
                                                    <p className="coach-dashboard__event-details">
                                                        {event.team && `${event.team} • `}
                                                        {formatDate(event.datetime)}
                                                    </p>
                                                    {event.location && (
                                                        <p className="coach-dashboard__event-location">
                                                            📍 {event.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="coach-dashboard__empty-state">
                                        No upcoming events scheduled
                                    </p>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                </div>

                {/* Team Overview */}
                {dashboardData.teams.length > 0 && (
                    <div className="coach-dashboard__section">
                        <Card>
                            <Card.Header>
                                <h2>Your Teams</h2>
                                <Button 
                                    as={Link} 
                                    to="/coach/teams"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    Manage All
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <div className="coach-dashboard__teams-grid">
                                    {dashboardData.teams.map((team) => (
                                        <Link 
                                            key={team.id}
                                            to={`/coach/teams/${team.id}`}
                                            className="coach-dashboard__team-card"
                                        >
                                            <div className="coach-dashboard__team-header">
                                                <h3>{team.name}</h3>
                                                <span className="coach-dashboard__team-category">
                                                    {team.category}
                                                </span>
                                            </div>
                                            <div className="coach-dashboard__team-stats">
                                                <div className="coach-dashboard__team-stat">
                                                    <span className="coach-dashboard__team-stat-label">Players</span>
                                                    <span className="coach-dashboard__team-stat-value">
                                                        {team.playerCount || 0}
                                                    </span>
                                                </div>
                                                <div className="coach-dashboard__team-stat">
                                                    <span className="coach-dashboard__team-stat-label">Wins</span>
                                                    <span className="coach-dashboard__team-stat-value">
                                                        {team.wins || 0}
                                                    </span>
                                                </div>
                                                <div className="coach-dashboard__team-stat">
                                                    <span className="coach-dashboard__team-stat-label">Next Match</span>
                                                    <span className="coach-dashboard__team-stat-value">
                                                        {team.nextMatch ? formatDate(team.nextMatch) : 'TBD'}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}

                {/* Notifications */}
                {dashboardData.notifications.length > 0 && (
                    <div className="coach-dashboard__section">
                        <Card>
                            <Card.Header>
                                <h2>Notifications</h2>
                                <Button 
                                    as={Link} 
                                    to="/notifications"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View All
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <div className="coach-dashboard__notifications">
                                    {dashboardData.notifications.slice(0, 3).map((notification, index) => (
                                        <div key={index} className={`coach-dashboard__notification coach-dashboard__notification--${notification.type}`}>
                                            <div className="coach-dashboard__notification-content">
                                                <h4>{notification.title}</h4>
                                                <p>{notification.message}</p>
                                                <span className="coach-dashboard__notification-time">
                                                    {formatDate(notification.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CoachDashboard;