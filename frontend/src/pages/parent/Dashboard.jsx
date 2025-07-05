import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, StatCard, Alert, LoadingSpinner } from '../../components/ui';
import { api } from '../../services/api';
import './Dashboard.css';

const ParentDashboard = () => {
    const { user } = useAuth();
    const [dashboardData, setDashboardData] = useState({
        children: [],
        familyStats: {},
        upcomingEvents: [],
        recentActivity: [],
        notifications: [],
        paymentStatus: {},
        achievements: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedChild, setSelectedChild] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        if (dashboardData.children.length > 0 && !selectedChild) {
            setSelectedChild(dashboardData.children[0]);
        }
    }, [dashboardData.children]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError('');

            const [childrenRes, familyRes, eventsRes, activityRes, notificationsRes, paymentRes, achievementsRes] = await Promise.all([
                api.get('/parent/children'),
                api.get('/parent/family-stats'),
                api.get('/parent/upcoming-events'),
                api.get('/parent/recent-activity'),
                api.get('/parent/notifications'),
                api.get('/parent/payment-status'),
                api.get('/parent/recent-achievements')
            ]);

            setDashboardData({
                children: childrenRes.data,
                familyStats: familyRes.data,
                upcomingEvents: eventsRes.data,
                recentActivity: activityRes.data,
                notifications: notificationsRes.data,
                paymentStatus: paymentRes.data,
                achievements: achievementsRes.data
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setError('Failed to load family dashboard. Please try again.');
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
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getPerformanceColor = (rating) => {
        if (rating >= 4.5) return 'excellent';
        if (rating >= 4) return 'good';
        if (rating >= 3) return 'average';
        return 'needs-improvement';
    };

    const getPaymentStatusColor = (status) => {
        const colors = {
            'paid': 'success',
            'pending': 'warning',
            'overdue': 'error',
            'upcoming': 'info'
        };
        return colors[status] || 'gray';
    };

    const getEventPriority = (type) => {
        const priorities = {
            'match': 'high',
            'payment': 'high',
            'meeting': 'medium',
            'training': 'low',
            'event': 'medium'
        };
        return priorities[type] || 'low';
    };

    const renderChildCard = (child) => (
        <div 
            key={child.id}
            className={`parent-dashboard__child-card ${selectedChild?.id === child.id ? 'parent-dashboard__child-card--selected' : ''}`}
            onClick={() => setSelectedChild(child)}
        >
            <div className="parent-dashboard__child-avatar">
                {child.profile_picture ? (
                    <img 
                        src={child.profile_picture} 
                        alt={`${child.first_name} ${child.last_name}`}
                    />
                ) : (
                    <div className="parent-dashboard__child-initials">
                        {child.first_name?.[0]}{child.last_name?.[0]}
                    </div>
                )}
                <div className={`parent-dashboard__child-status parent-dashboard__child-status--${child.status || 'active'}`}>
                    {child.status === 'active' && '✓'}
                    {child.status === 'injured' && '🩹'}
                    {child.status === 'inactive' && '○'}
                </div>
            </div>
            
            <div className="parent-dashboard__child-info">
                <h3>{child.first_name} {child.last_name}</h3>
                <p className="parent-dashboard__child-age">Age {calculateAge(child.birth_date)}</p>
                <div className="parent-dashboard__child-details">
                    <span className="parent-dashboard__child-team">
                        🏆 {child.team_name || 'Not assigned'}
                    </span>
                    <span className="parent-dashboard__child-position">
                        ⚽ {child.position || 'No position'}
                    </span>
                </div>
                
                <div className="parent-dashboard__child-stats">
                    <div className="parent-dashboard__child-stat">
                        <span className="parent-dashboard__child-stat-value">{child.stats?.goals || 0}</span>
                        <span className="parent-dashboard__child-stat-label">Goals</span>
                    </div>
                    <div className="parent-dashboard__child-stat">
                        <span className="parent-dashboard__child-stat-value">{child.stats?.attendance || 0}%</span>
                        <span className="parent-dashboard__child-stat-label">Attendance</span>
                    </div>
                    <div className="parent-dashboard__child-stat">
                        <span className="parent-dashboard__child-stat-value">{child.stats?.rating || 0}/5</span>
                        <span className="parent-dashboard__child-stat-label">Rating</span>
                    </div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="parent-dashboard">
                <div className="parent-dashboard__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading family dashboard...</p>
                </div>
            </div>
        );
    }

    if (dashboardData.children.length === 0) {
        return (
            <div className="parent-dashboard">
                <div className="parent-dashboard__empty">
                    <h2>👨‍👩‍👧‍👦 Welcome to Your Family Dashboard</h2>
                    <p>No children are currently registered. Please contact the academy to add your child.</p>
                    <Button as={Link} to="/announcements" variant="primary">
                        View Academy News
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="parent-dashboard">
            {/* Header */}
            <div className="parent-dashboard__header">
                <div className="parent-dashboard__header-content">
                    <div className="parent-dashboard__title">
                        <h1>👨‍👩‍👧‍👦 Family Dashboard</h1>
                        <p>Stay connected with your child's football journey</p>
                    </div>
                    <div className="parent-dashboard__header-actions">
                        <Button 
                            as={Link} 
                            to="/parent/calendar"
                            variant="primary"
                        >
                            📅 Family Calendar
                        </Button>
                        <Button 
                            as={Link} 
                            to="/parent/payments"
                            variant="secondary"
                        >
                            💳 Payments
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Children Overview */}
            <div className="parent-dashboard__children-section">
                <Card>
                    <Card.Header>
                        <h2>👶 Your Children</h2>
                        <span className="parent-dashboard__children-count">
                            {dashboardData.children.length} registered
                        </span>
                    </Card.Header>
                    <Card.Body>
                        <div className="parent-dashboard__children-grid">
                            {dashboardData.children.map(child => renderChildCard(child))}
                        </div>
                    </Card.Body>
                </Card>
            </div>

            {/* Family Stats */}
            {selectedChild && (
                <div className="parent-dashboard__stats-section">
                    <h3>📊 {selectedChild.first_name}'s Overview</h3>
                    <div className="parent-dashboard__stats-grid">
                        <StatCard
                            title="Goals This Season"
                            value={selectedChild.stats?.goals || 0}
                            icon="⚽"
                            trend={selectedChild.stats?.goalsTrend}
                            color="green"
                            subtitle="Keep encouraging!"
                        />
                        <StatCard
                            title="Training Attendance"
                            value={`${selectedChild.stats?.attendance || 0}%`}
                            icon="🎯"
                            trend={selectedChild.stats?.attendanceTrend}
                            color={selectedChild.stats?.attendance >= 90 ? 'success' : selectedChild.stats?.attendance >= 75 ? 'warning' : 'error'}
                            subtitle="Consistency is key"
                        />
                        <StatCard
                            title="Coach Rating"
                            value={`${selectedChild.stats?.rating || 0}/5`}
                            icon="⭐"
                            trend={selectedChild.stats?.ratingTrend}
                            color={getPerformanceColor(selectedChild.stats?.rating || 0)}
                            subtitle="Overall performance"
                        />
                        <StatCard
                            title="Matches Played"
                            value={selectedChild.stats?.matchesPlayed || 0}
                            icon="🏟️"
                            trend={selectedChild.stats?.matchesTrend}
                            color="blue"
                            subtitle="Experience gained"
                        />
                    </div>
                </div>
            )}

            <div className="parent-dashboard__content">
                {/* Payment Status */}
                <div className="parent-dashboard__section">
                    <Card>
                        <Card.Header>
                            <h3>💰 Payment Status</h3>
                            <Button 
                                as={Link} 
                                to="/parent/payments"
                                variant="ghost" 
                                size="sm"
                            >
                                View Details
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <div className="parent-dashboard__payment-overview">
                                <div className="parent-dashboard__payment-summary">
                                    <div className={`parent-dashboard__payment-status parent-dashboard__payment-status--${getPaymentStatusColor(dashboardData.paymentStatus.status)}`}>
                                        <div className="parent-dashboard__payment-icon">
                                            {dashboardData.paymentStatus.status === 'paid' && '✅'}
                                            {dashboardData.paymentStatus.status === 'pending' && '⏳'}
                                            {dashboardData.paymentStatus.status === 'overdue' && '❌'}
                                            {dashboardData.paymentStatus.status === 'upcoming' && '📅'}
                                        </div>
                                        <div className="parent-dashboard__payment-info">
                                            <h4>
                                                {dashboardData.paymentStatus.status === 'paid' && 'All Paid Up!'}
                                                {dashboardData.paymentStatus.status === 'pending' && 'Payment Pending'}
                                                {dashboardData.paymentStatus.status === 'overdue' && 'Payment Overdue'}
                                                {dashboardData.paymentStatus.status === 'upcoming' && 'Payment Due Soon'}
                                            </h4>
                                            <p>
                                                Current balance: ${dashboardData.paymentStatus.balance || 0}
                                            </p>
                                            {dashboardData.paymentStatus.nextDueDate && (
                                                <p className="parent-dashboard__next-payment">
                                                    Next payment: {formatDate(dashboardData.paymentStatus.nextDueDate)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {dashboardData.paymentStatus.status !== 'paid' && (
                                    <div className="parent-dashboard__payment-actions">
                                        <Button 
                                            as={Link} 
                                            to="/parent/payments/pay"
                                            variant="primary"
                                            size="sm"
                                        >
                                            Make Payment
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </div>

                <div className="parent-dashboard__columns">
                    {/* Recent Activity */}
                    <div className="parent-dashboard__column">
                        <Card>
                            <Card.Header>
                                <h3>📝 Recent Activity</h3>
                                <Button 
                                    as={Link} 
                                    to="/parent/child-progress"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View Progress
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {dashboardData.recentActivity.length > 0 ? (
                                    <div className="parent-dashboard__activity-list">
                                        {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
                                            <div key={index} className="parent-dashboard__activity-item">
                                                <div className="parent-dashboard__activity-avatar">
                                                    {activity.child_photo ? (
                                                        <img src={activity.child_photo} alt={activity.child_name} />
                                                    ) : (
                                                        <div className="parent-dashboard__activity-initials">
                                                            {activity.child_name?.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="parent-dashboard__activity-content">
                                                    <h4>{activity.child_name}</h4>
                                                    <p className="parent-dashboard__activity-description">
                                                        {activity.description}
                                                    </p>
                                                    <span className="parent-dashboard__activity-time">
                                                        {formatDate(activity.timestamp)}
                                                    </span>
                                                </div>
                                                <div className="parent-dashboard__activity-type">
                                                    {activity.type === 'goal' && '⚽'}
                                                    {activity.type === 'training' && '🏃'}
                                                    {activity.type === 'match' && '🏟️'}
                                                    {activity.type === 'achievement' && '🏆'}
                                                    {activity.type === 'feedback' && '💬'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="parent-dashboard__empty-state">
                                        <p>No recent activity to display</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </div>

                    {/* Upcoming Events */}
                    <div className="parent-dashboard__column">
                        <Card>
                            <Card.Header>
                                <h3>📅 Upcoming Events</h3>
                                <Button 
                                    as={Link} 
                                    to="/parent/calendar"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View Calendar
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {dashboardData.upcomingEvents.length > 0 ? (
                                    <div className="parent-dashboard__events-list">
                                        {dashboardData.upcomingEvents.slice(0, 5).map((event, index) => (
                                            <div key={index} className={`parent-dashboard__event-item parent-dashboard__event-item--${getEventPriority(event.type)}`}>
                                                <div className="parent-dashboard__event-date">
                                                    <span className="parent-dashboard__event-day">
                                                        {new Date(event.datetime).getDate()}
                                                    </span>
                                                    <span className="parent-dashboard__event-month">
                                                        {new Date(event.datetime).toLocaleDateString('en-US', { month: 'short' })}
                                                    </span>
                                                </div>
                                                <div className="parent-dashboard__event-content">
                                                    <h4>{event.title}</h4>
                                                    <p className="parent-dashboard__event-type">
                                                        {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                                                        {event.child_name && ` • ${event.child_name}`}
                                                    </p>
                                                    <p className="parent-dashboard__event-time">
                                                        {new Date(event.datetime).toLocaleTimeString('en-US', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </p>
                                                    {event.location && (
                                                        <p className="parent-dashboard__event-location">
                                                            📍 {event.location}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="parent-dashboard__event-icon">
                                                    {event.type === 'match' && '⚽'}
                                                    {event.type === 'training' && '🏃'}
                                                    {event.type === 'meeting' && '💬'}
                                                    {event.type === 'payment' && '💰'}
                                                    {event.type === 'event' && '🎉'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="parent-dashboard__empty-state">
                                        <p>No upcoming events scheduled</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                </div>

                {/* Recent Achievements */}
                {dashboardData.achievements.length > 0 && (
                    <div className="parent-dashboard__section">
                        <Card>
                            <Card.Header>
                                <h3>🏆 Recent Achievements</h3>
                                <Button 
                                    as={Link} 
                                    to="/parent/achievements"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View All
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <div className="parent-dashboard__achievements">
                                    {dashboardData.achievements.slice(0, 6).map((achievement, index) => (
                                        <div key={index} className={`parent-dashboard__achievement parent-dashboard__achievement--${achievement.level}`}>
                                            <div className="parent-dashboard__achievement-child">
                                                <img 
                                                    src={achievement.child_photo || '/default-avatar.png'} 
                                                    alt={achievement.child_name}
                                                    className="parent-dashboard__achievement-photo"
                                                />
                                            </div>
                                            <div className="parent-dashboard__achievement-content">
                                                <div className="parent-dashboard__achievement-icon">
                                                    {achievement.type === 'goal' && '⚽'}
                                                    {achievement.type === 'attendance' && '🎯'}
                                                    {achievement.type === 'improvement' && '📈'}
                                                    {achievement.type === 'teamwork' && '🤝'}
                                                    {achievement.type === 'leadership' && '👑'}
                                                </div>
                                                <div className="parent-dashboard__achievement-info">
                                                    <h4>{achievement.title}</h4>
                                                    <p>{achievement.child_name}</p>
                                                    <span className="parent-dashboard__achievement-date">
                                                        {formatDate(achievement.earned_date)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}

                {/* Notifications */}
                {dashboardData.notifications.length > 0 && (
                    <div className="parent-dashboard__section">
                        <Card>
                            <Card.Header>
                                <h3>📢 Important Notifications</h3>
                                <Button 
                                    as={Link} 
                                    to="/parent/communication"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View All
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <div className="parent-dashboard__notifications">
                                    {dashboardData.notifications.slice(0, 3).map((notification, index) => (
                                        <div key={index} className={`parent-dashboard__notification parent-dashboard__notification--${notification.priority}`}>
                                            <div className="parent-dashboard__notification-icon">
                                                {notification.type === 'payment' && '💰'}
                                                {notification.type === 'schedule' && '📅'}
                                                {notification.type === 'message' && '💬'}
                                                {notification.type === 'emergency' && '🚨'}
                                                {notification.type === 'achievement' && '🏆'}
                                            </div>
                                            <div className="parent-dashboard__notification-content">
                                                <h4>{notification.title}</h4>
                                                <p>{notification.message}</p>
                                                <span className="parent-dashboard__notification-time">
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

                {/* Quick Actions */}
                <div className="parent-dashboard__section">
                    <Card>
                        <Card.Header>
                            <h3>⚡ Quick Actions</h3>
                        </Card.Header>
                        <Card.Body>
                            <div className="parent-dashboard__quick-actions">
                                <Link 
                                    to="/parent/child-progress" 
                                    className="parent-dashboard__action-btn"
                                >
                                    <div className="parent-dashboard__action-icon">📈</div>
                                    <div className="parent-dashboard__action-content">
                                        <h4>View Progress</h4>
                                        <p>Track your child's development</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/parent/communication" 
                                    className="parent-dashboard__action-btn"
                                >
                                    <div className="parent-dashboard__action-icon">💬</div>
                                    <div className="parent-dashboard__action-content">
                                        <h4>Message Coach</h4>
                                        <p>Send a message to the coaching staff</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/parent/calendar" 
                                    className="parent-dashboard__action-btn"
                                >
                                    <div className="parent-dashboard__action-icon">📅</div>
                                    <div className="parent-dashboard__action-content">
                                        <h4>Family Calendar</h4>
                                        <p>View schedule and important dates</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/parent/payments" 
                                    className="parent-dashboard__action-btn"
                                >
                                    <div className="parent-dashboard__action-icon">💳</div>
                                    <div className="parent-dashboard__action-content">
                                        <h4>Manage Payments</h4>
                                        <p>View invoices and make payments</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/announcements" 
                                    className="parent-dashboard__action-btn"
                                >
                                    <div className="parent-dashboard__action-icon">📢</div>
                                    <div className="parent-dashboard__action-content">
                                        <h4>Academy News</h4>
                                        <p>Latest announcements and updates</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/profile" 
                                    className="parent-dashboard__action-btn"
                                >
                                    <div className="parent-dashboard__action-icon">⚙️</div>
                                    <div className="parent-dashboard__action-content">
                                        <h4>Family Settings</h4>
                                        <p>Update contact info and preferences</p>
                                    </div>
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;