import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Card, Button, StatCard, Alert, LoadingSpinner } from '../../components/ui';
import { api } from '../../services/api';
import './Dashboard.css';

const PlayerDashboard = () => {
    const { user } = useAuth();
    const [playerData, setPlayerData] = useState({
        profile: {},
        stats: {},
        recentMatches: [],
        upcomingEvents: [],
        achievements: [],
        trainingAttendance: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchPlayerData();
    }, []);

    const fetchPlayerData = async () => {
        try {
            setLoading(true);
            setError('');

            const [profileRes, statsRes, matchesRes, eventsRes, achievementsRes, attendanceRes] = await Promise.all([
                api.get('/player/profile'),
                api.get('/player/statistics'),
                api.get('/player/recent-matches'),
                api.get('/player/upcoming-events'),
                api.get('/player/achievements'),
                api.get('/player/training-attendance')
            ]);

            setPlayerData({
                profile: profileRes.data,
                stats: statsRes.data,
                recentMatches: matchesRes.data,
                upcomingEvents: eventsRes.data,
                achievements: achievementsRes.data,
                trainingAttendance: attendanceRes.data
            });
        } catch (error) {
            console.error('Error fetching player data:', error);
            setError('Failed to load your dashboard. Please try again.');
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

    const getAttendanceColor = (percentage) => {
        if (percentage >= 90) return 'success';
        if (percentage >= 75) return 'warning';
        return 'error';
    };

    const renderAchievementBadge = (achievement) => {
        const badgeIcons = {
            'goals': '⚽',
            'assists': '🅰️',
            'attendance': '🎯',
            'improvement': '📈',
            'teamwork': '🤝',
            'leadership': '👑',
            'dedication': '💪',
            'sportsmanship': '🏆'
        };

        return (
            <div 
                key={achievement.id}
                className={`player-dashboard__achievement player-dashboard__achievement--${achievement.level}`}
                title={achievement.description}
            >
                <span className="player-dashboard__achievement-icon">
                    {badgeIcons[achievement.type] || '🏅'}
                </span>
                <span className="player-dashboard__achievement-name">
                    {achievement.name}
                </span>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="player-dashboard">
                <div className="player-dashboard__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="player-dashboard">
            {/* Header */}
            <div className="player-dashboard__header">
                <div className="player-dashboard__welcome">
                    <h1>Welcome back, {user?.first_name}! 👋</h1>
                    <p>Ready to become a football star? Let's check your progress!</p>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <div className="player-dashboard__content">
                {/* Profile Card */}
                <div className="player-dashboard__profile-section">
                    <Card className="player-dashboard__profile-card">
                        <Card.Body>
                            <div className="player-dashboard__profile-content">
                                <div className="player-dashboard__avatar-section">
                                    <div className="player-dashboard__avatar">
                                        {playerData.profile.profile_picture ? (
                                            <img 
                                                src={playerData.profile.profile_picture} 
                                                alt={`${user?.first_name} ${user?.last_name}`}
                                            />
                                        ) : (
                                            <div className="player-dashboard__avatar-placeholder">
                                                {user?.first_name?.[0]}{user?.last_name?.[0]}
                                            </div>
                                        )}
                                        <div className="player-dashboard__level-badge">
                                            Level {playerData.profile.level || 1}
                                        </div>
                                    </div>
                                    <div className="player-dashboard__xp-bar">
                                        <div className="player-dashboard__xp-label">
                                            XP: {playerData.profile.experience_points || 0}
                                        </div>
                                        <div className="player-dashboard__xp-progress">
                                            <div 
                                                className="player-dashboard__xp-fill"
                                                style={{ 
                                                    width: `${((playerData.profile.experience_points || 0) % 100)}%` 
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="player-dashboard__profile-info">
                                    <h2>{user?.first_name} {user?.last_name}</h2>
                                    <div className="player-dashboard__profile-details">
                                        <div className="player-dashboard__profile-row">
                                            <span className="player-dashboard__profile-label">Position:</span>
                                            <span className="player-dashboard__profile-value">
                                                {playerData.profile.position || 'Not assigned'}
                                            </span>
                                        </div>
                                        <div className="player-dashboard__profile-row">
                                            <span className="player-dashboard__profile-label">Jersey #:</span>
                                            <span className="player-dashboard__profile-value">
                                                {playerData.profile.jersey_number || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="player-dashboard__profile-row">
                                            <span className="player-dashboard__profile-label">Age:</span>
                                            <span className="player-dashboard__profile-value">
                                                {calculateAge(playerData.profile.birth_date)}
                                            </span>
                                        </div>
                                        <div className="player-dashboard__profile-row">
                                            <span className="player-dashboard__profile-label">Team:</span>
                                            <span className="player-dashboard__profile-value">
                                                {playerData.profile.team_name || 'Not assigned'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="player-dashboard__quick-actions">
                                        <Button 
                                            as={Link} 
                                            to="/player/qr-checkin"
                                            variant="primary"
                                            size="sm"
                                        >
                                            📱 My QR Code
                                        </Button>
                                        <Button 
                                            as={Link} 
                                            to="/profile"
                                            variant="secondary"
                                            size="sm"
                                        >
                                            ✏️ Edit Profile
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </div>

                {/* Stats Overview */}
                <div className="player-dashboard__stats-section">
                    <h3>⚡ Your Season Stats</h3>
                    <div className="player-dashboard__stats-grid">
                        <StatCard
                            title="Goals Scored"
                            value={playerData.stats.goals || 0}
                            icon="⚽"
                            trend={playerData.stats.goalsTrend}
                            color="green"
                            subtitle="Keep shooting!"
                        />
                        <StatCard
                            title="Assists"
                            value={playerData.stats.assists || 0}
                            icon="🅰️"
                            trend={playerData.stats.assistsTrend}
                            color="blue"
                            subtitle="Team player!"
                        />
                        <StatCard
                            title="Minutes Played"
                            value={playerData.stats.minutesPlayed || 0}
                            icon="⏱️"
                            trend={playerData.stats.minutesTrend}
                            color="purple"
                            subtitle="Great commitment!"
                        />
                        <StatCard
                            title="Training Attendance"
                            value={`${playerData.trainingAttendance.percentage || 0}%`}
                            icon="🎯"
                            trend={playerData.trainingAttendance.trend}
                            color={getAttendanceColor(playerData.trainingAttendance.percentage || 0)}
                            subtitle={playerData.trainingAttendance.percentage >= 90 ? 'Outstanding!' : 'Keep it up!'}
                        />
                    </div>
                </div>

                {/* Achievements */}
                {playerData.achievements.length > 0 && (
                    <div className="player-dashboard__achievements-section">
                        <Card>
                            <Card.Header>
                                <h3>🏆 Your Achievements</h3>
                                <Button 
                                    as={Link} 
                                    to="/player/achievements"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View All
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                <div className="player-dashboard__achievements">
                                    {playerData.achievements.slice(0, 6).map(achievement => 
                                        renderAchievementBadge(achievement)
                                    )}
                                    {playerData.achievements.length > 6 && (
                                        <div className="player-dashboard__achievement player-dashboard__achievement--more">
                                            <span className="player-dashboard__achievement-icon">+</span>
                                            <span className="player-dashboard__achievement-name">
                                                {playerData.achievements.length - 6} more
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                )}

                <div className="player-dashboard__main-content">
                    {/* Recent Performance */}
                    <div className="player-dashboard__column">
                        <Card>
                            <Card.Header>
                                <h3>🎮 Recent Match Performance</h3>
                                <Button 
                                    as={Link} 
                                    to="/player/matches"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View All Matches
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {playerData.recentMatches.length > 0 ? (
                                    <div className="player-dashboard__matches">
                                        {playerData.recentMatches.slice(0, 4).map((match, index) => (
                                            <div key={index} className="player-dashboard__match-item">
                                                <div className="player-dashboard__match-header">
                                                    <span className="player-dashboard__match-opponent">
                                                        vs {match.opponent}
                                                    </span>
                                                    <span className={`player-dashboard__match-result player-dashboard__match-result--${match.result}`}>
                                                        {match.score}
                                                    </span>
                                                </div>
                                                <div className="player-dashboard__match-performance">
                                                    <div className="player-dashboard__match-stats">
                                                        {match.goals > 0 && (
                                                            <span className="player-dashboard__match-stat">
                                                                ⚽ {match.goals}
                                                            </span>
                                                        )}
                                                        {match.assists > 0 && (
                                                            <span className="player-dashboard__match-stat">
                                                                🅰️ {match.assists}
                                                            </span>
                                                        )}
                                                        <span className="player-dashboard__match-stat">
                                                            ⏱️ {match.minutesPlayed}'
                                                        </span>
                                                    </div>
                                                    <div className={`player-dashboard__match-rating player-dashboard__match-rating--${getPerformanceColor(match.rating)}`}>
                                                        ⭐ {match.rating}/5
                                                    </div>
                                                </div>
                                                <div className="player-dashboard__match-date">
                                                    {formatDate(match.date)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="player-dashboard__empty-state">
                                        <p>No recent matches to show. Keep training and you'll be playing soon! 💪</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </div>

                    {/* Upcoming Events */}
                    <div className="player-dashboard__column">
                        <Card>
                            <Card.Header>
                                <h3>📅 What's Coming Up</h3>
                                <Button 
                                    as={Link} 
                                    to="/player/calendar"
                                    variant="ghost" 
                                    size="sm"
                                >
                                    View Calendar
                                </Button>
                            </Card.Header>
                            <Card.Body>
                                {playerData.upcomingEvents.length > 0 ? (
                                    <div className="player-dashboard__events">
                                        {playerData.upcomingEvents.slice(0, 4).map((event, index) => (
                                            <div key={index} className={`player-dashboard__event player-dashboard__event--${event.type}`}>
                                                <div className="player-dashboard__event-icon">
                                                    {event.type === 'match' && '⚽'}
                                                    {event.type === 'training' && '🏃'}
                                                    {event.type === 'meeting' && '💬'}
                                                </div>
                                                <div className="player-dashboard__event-content">
                                                    <h4>{event.title}</h4>
                                                    <p>{formatDate(event.datetime)}</p>
                                                    {event.location && (
                                                        <span className="player-dashboard__event-location">
                                                            📍 {event.location}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="player-dashboard__event-importance">
                                                    {event.type === 'match' && '🔥'}
                                                    {event.type === 'training' && '💪'}
                                                    {event.type === 'meeting' && '📝'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="player-dashboard__empty-state">
                                        <p>No upcoming events. Check back soon! 📅</p>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </div>
                </div>

                {/* Quick Navigation */}
                <div className="player-dashboard__navigation-section">
                    <Card>
                        <Card.Header>
                            <h3>🎯 Quick Access</h3>
                        </Card.Header>
                        <Card.Body>
                            <div className="player-dashboard__navigation-grid">
                                <Link 
                                    to="/player/stats" 
                                    className="player-dashboard__nav-item"
                                >
                                    <div className="player-dashboard__nav-icon">📊</div>
                                    <div className="player-dashboard__nav-content">
                                        <h4>My Stats</h4>
                                        <p>View detailed statistics</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/player/matches" 
                                    className="player-dashboard__nav-item"
                                >
                                    <div className="player-dashboard__nav-icon">⚽</div>
                                    <div className="player-dashboard__nav-content">
                                        <h4>My Matches</h4>
                                        <p>Match history & performance</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/player/trainings" 
                                    className="player-dashboard__nav-item"
                                >
                                    <div className="player-dashboard__nav-icon">🏃</div>
                                    <div className="player-dashboard__nav-content">
                                        <h4>Training</h4>
                                        <p>Attendance & feedback</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/player/development-plans" 
                                    className="player-dashboard__nav-item"
                                >
                                    <div className="player-dashboard__nav-icon">📈</div>
                                    <div className="player-dashboard__nav-content">
                                        <h4>Development</h4>
                                        <p>Track your progress</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/player/qr-checkin" 
                                    className="player-dashboard__nav-item"
                                >
                                    <div className="player-dashboard__nav-icon">📱</div>
                                    <div className="player-dashboard__nav-content">
                                        <h4>QR Code</h4>
                                        <p>Quick check-in</p>
                                    </div>
                                </Link>

                                <Link 
                                    to="/announcements" 
                                    className="player-dashboard__nav-item"
                                >
                                    <div className="player-dashboard__nav-icon">📢</div>
                                    <div className="player-dashboard__nav-content">
                                        <h4>News</h4>
                                        <p>Team announcements</p>
                                    </div>
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </div>

                {/* Motivational Footer */}
                <div className="player-dashboard__motivation">
                    <div className="player-dashboard__motivation-content">
                        <h3>💪 Keep Going, Champion!</h3>
                        <p>
                            "Champions keep playing until they get it right." - Billie Jean King
                        </p>
                        <div className="player-dashboard__motivation-stats">
                            <span>🎯 Next goal: {playerData.profile.nextGoal || 'Score your first goal!'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayerDashboard;