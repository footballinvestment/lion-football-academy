import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Card, Button, Alert, LoadingSpinner, Modal, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './TeamManagement.css';

const TeamManagement = () => {
    const { teamId } = useParams();
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [showPlayerModal, setShowPlayerModal] = useState(false);
    const [activeTab, setActiveTab] = useState('roster');

    useEffect(() => {
        fetchTeams();
    }, []);

    useEffect(() => {
        if (teamId && teams.length > 0) {
            const team = teams.find(t => t.id === parseInt(teamId));
            if (team) {
                setSelectedTeam(team);
                fetchTeamPlayers(team.id);
            }
        } else if (teams.length > 0 && !teamId) {
            setSelectedTeam(teams[0]);
            fetchTeamPlayers(teams[0].id);
        }
    }, [teamId, teams]);

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const response = await api.get('/coach/teams');
            setTeams(response.data);
        } catch (error) {
            console.error('Error fetching teams:', error);
            setError('Failed to load teams. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTeamPlayers = async (teamId) => {
        try {
            const response = await api.get(`/teams/${teamId}/players`);
            setPlayers(response.data);
        } catch (error) {
            console.error('Error fetching players:', error);
            setError('Failed to load team players.');
        }
    };

    const handleTeamSelect = (team) => {
        setSelectedTeam(team);
        fetchTeamPlayers(team.id);
        setActiveTab('roster');
    };

    const handlePlayerClick = (player) => {
        setSelectedPlayer(player);
        setShowPlayerModal(true);
    };

    const updatePlayerPosition = async (playerId, position) => {
        try {
            await api.put(`/players/${playerId}/position`, { position });
            fetchTeamPlayers(selectedTeam.id);
        } catch (error) {
            console.error('Error updating player position:', error);
            setError('Failed to update player position.');
        }
    };

    const getPlayerStatusColor = (status) => {
        const colors = {
            active: 'success',
            injured: 'error',
            suspended: 'warning',
            inactive: 'gray'
        };
        return colors[status] || 'gray';
    };

    const getPositionIcon = (position) => {
        const icons = {
            'Goalkeeper': '🥅',
            'Defender': '🛡️',
            'Midfielder': '⚡',
            'Forward': '⚽',
            'Striker': '🎯'
        };
        return icons[position] || '👤';
    };

    const calculateAge = (birthDate) => {
        if (!birthDate) return 'N/A';
        const today = new Date();
        const birth = new Date(birthDate);
        const age = Math.floor((today - birth) / (365.25 * 24 * 60 * 60 * 1000));
        return age;
    };

    if (loading) {
        return (
            <div className="team-management">
                <div className="team-management__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading team data...</p>
                </div>
            </div>
        );
    }

    if (teams.length === 0) {
        return (
            <div className="team-management">
                <div className="team-management__empty">
                    <h2>No Teams Assigned</h2>
                    <p>You don't have any teams assigned to you yet.</p>
                    <Button as={Link} to="/coach/dashboard" variant="primary">
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="team-management">
            {/* Header */}
            <div className="team-management__header">
                <div className="team-management__header-content">
                    <div className="team-management__title">
                        <h1>Team Management</h1>
                        <p>Manage your teams and players</p>
                    </div>
                    <div className="team-management__header-actions">
                        <Button 
                            as={Link} 
                            to="/coach/players/add"
                            variant="primary"
                        >
                            ➕ Add Player
                        </Button>
                        <Button 
                            as={Link} 
                            to="/coach/trainings/new"
                            variant="secondary"
                        >
                            📅 Schedule Training
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            <div className="team-management__content">
                {/* Team Selector */}
                <div className="team-management__sidebar">
                    <Card>
                        <Card.Header>
                            <h2>Your Teams</h2>
                        </Card.Header>
                        <Card.Body>
                            <div className="team-management__teams-list">
                                {teams.map((team) => (
                                    <button
                                        key={team.id}
                                        className={`team-management__team-item ${
                                            selectedTeam?.id === team.id ? 'team-management__team-item--active' : ''
                                        }`}
                                        onClick={() => handleTeamSelect(team)}
                                    >
                                        <div className="team-management__team-info">
                                            <h3>{team.name}</h3>
                                            <p>{team.category}</p>
                                            <span className="team-management__team-stats">
                                                {team.playerCount || 0} players
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="team-management__main">
                    {selectedTeam && (
                        <>
                            {/* Team Info Card */}
                            <Card className="team-management__team-header">
                                <Card.Body>
                                    <div className="team-management__team-details">
                                        <div className="team-management__team-basic">
                                            <h2>{selectedTeam.name}</h2>
                                            <div className="team-management__team-meta">
                                                <span className="team-management__team-category">
                                                    {selectedTeam.category}
                                                </span>
                                                <span className="team-management__team-season">
                                                    {selectedTeam.season || '2024'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="team-management__team-stats-grid">
                                            <div className="team-management__stat">
                                                <span className="team-management__stat-value">
                                                    {players.length}
                                                </span>
                                                <span className="team-management__stat-label">Players</span>
                                            </div>
                                            <div className="team-management__stat">
                                                <span className="team-management__stat-value">
                                                    {selectedTeam.wins || 0}
                                                </span>
                                                <span className="team-management__stat-label">Wins</span>
                                            </div>
                                            <div className="team-management__stat">
                                                <span className="team-management__stat-value">
                                                    {selectedTeam.draws || 0}
                                                </span>
                                                <span className="team-management__stat-label">Draws</span>
                                            </div>
                                            <div className="team-management__stat">
                                                <span className="team-management__stat-value">
                                                    {selectedTeam.losses || 0}
                                                </span>
                                                <span className="team-management__stat-label">Losses</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card.Body>
                            </Card>

                            {/* Tabs */}
                            <Card>
                                <Tabs
                                    value={activeTab}
                                    onValueChange={setActiveTab}
                                    className="team-management__tabs"
                                >
                                    <Tabs.List>
                                        <Tabs.Trigger value="roster">Player Roster</Tabs.Trigger>
                                        <Tabs.Trigger value="formation">Formation</Tabs.Trigger>
                                        <Tabs.Trigger value="performance">Performance</Tabs.Trigger>
                                        <Tabs.Trigger value="injuries">Injuries</Tabs.Trigger>
                                    </Tabs.List>

                                    {/* Player Roster Tab */}
                                    <Tabs.Content value="roster">
                                        <div className="team-management__roster">
                                            {players.length > 0 ? (
                                                <div className="team-management__players-grid">
                                                    {players.map((player) => (
                                                        <div
                                                            key={player.id}
                                                            className="team-management__player-card"
                                                            onClick={() => handlePlayerClick(player)}
                                                        >
                                                            <div className="team-management__player-avatar">
                                                                {player.profile_picture ? (
                                                                    <img 
                                                                        src={player.profile_picture} 
                                                                        alt={`${player.first_name} ${player.last_name}`}
                                                                    />
                                                                ) : (
                                                                    <div className="team-management__player-initials">
                                                                        {player.first_name?.[0]}{player.last_name?.[0]}
                                                                    </div>
                                                                )}
                                                                <div className={`team-management__player-status team-management__player-status--${getPlayerStatusColor(player.status)}`}>
                                                                    {player.status === 'active' && '✓'}
                                                                    {player.status === 'injured' && '🩹'}
                                                                    {player.status === 'suspended' && '⚠️'}
                                                                    {player.status === 'inactive' && '○'}
                                                                </div>
                                                            </div>
                                                            <div className="team-management__player-info">
                                                                <h3>
                                                                    {player.first_name} {player.last_name}
                                                                </h3>
                                                                <div className="team-management__player-details">
                                                                    <span className="team-management__player-position">
                                                                        {getPositionIcon(player.position)} {player.position}
                                                                    </span>
                                                                    <span className="team-management__player-number">
                                                                        #{player.jersey_number || 'N/A'}
                                                                    </span>
                                                                </div>
                                                                <div className="team-management__player-meta">
                                                                    <span>Age: {calculateAge(player.birth_date)}</span>
                                                                    <span>Height: {player.height || 'N/A'}cm</span>
                                                                </div>
                                                                {player.performance_rating && (
                                                                    <div className="team-management__player-rating">
                                                                        <span>Rating: </span>
                                                                        <div className="team-management__rating-stars">
                                                                            {Array.from({ length: 5 }, (_, i) => (
                                                                                <span 
                                                                                    key={i}
                                                                                    className={`team-management__star ${
                                                                                        i < Math.floor(player.performance_rating) 
                                                                                            ? 'team-management__star--filled' 
                                                                                            : ''
                                                                                    }`}
                                                                                >
                                                                                    ⭐
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="team-management__empty-roster">
                                                    <p>No players assigned to this team yet.</p>
                                                    <Button 
                                                        as={Link} 
                                                        to="/coach/players/add"
                                                        variant="primary"
                                                    >
                                                        Add First Player
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </Tabs.Content>

                                    {/* Formation Tab */}
                                    <Tabs.Content value="formation">
                                        <div className="team-management__formation">
                                            <div className="team-management__field">
                                                <div className="team-management__field-background">
                                                    <div className="team-management__field-lines">
                                                        {/* Soccer field visualization */}
                                                        <div className="team-management__formation-section team-management__formation-section--defense">
                                                            <h4>Defense</h4>
                                                            <div className="team-management__formation-players">
                                                                {players
                                                                    .filter(p => p.position === 'Defender')
                                                                    .map(player => (
                                                                        <div key={player.id} className="team-management__formation-player">
                                                                            <span>{player.jersey_number || '?'}</span>
                                                                            <span>{player.last_name}</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="team-management__formation-section team-management__formation-section--midfield">
                                                            <h4>Midfield</h4>
                                                            <div className="team-management__formation-players">
                                                                {players
                                                                    .filter(p => p.position === 'Midfielder')
                                                                    .map(player => (
                                                                        <div key={player.id} className="team-management__formation-player">
                                                                            <span>{player.jersey_number || '?'}</span>
                                                                            <span>{player.last_name}</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                        <div className="team-management__formation-section team-management__formation-section--attack">
                                                            <h4>Attack</h4>
                                                            <div className="team-management__formation-players">
                                                                {players
                                                                    .filter(p => ['Forward', 'Striker'].includes(p.position))
                                                                    .map(player => (
                                                                        <div key={player.id} className="team-management__formation-player">
                                                                            <span>{player.jersey_number || '?'}</span>
                                                                            <span>{player.last_name}</span>
                                                                        </div>
                                                                    ))
                                                                }
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Tabs.Content>

                                    {/* Performance Tab */}
                                    <Tabs.Content value="performance">
                                        <div className="team-management__performance">
                                            <div className="team-management__performance-list">
                                                {players
                                                    .sort((a, b) => (b.performance_rating || 0) - (a.performance_rating || 0))
                                                    .map((player, index) => (
                                                        <div key={player.id} className="team-management__performance-item">
                                                            <div className="team-management__performance-rank">
                                                                #{index + 1}
                                                            </div>
                                                            <div className="team-management__performance-player">
                                                                <span className="team-management__performance-name">
                                                                    {player.first_name} {player.last_name}
                                                                </span>
                                                                <span className="team-management__performance-position">
                                                                    {player.position}
                                                                </span>
                                                            </div>
                                                            <div className="team-management__performance-stats">
                                                                <div className="team-management__performance-rating">
                                                                    {player.performance_rating || 0}/5
                                                                </div>
                                                                <div className="team-management__performance-metrics">
                                                                    <span>Goals: {player.goals || 0}</span>
                                                                    <span>Assists: {player.assists || 0}</span>
                                                                    <span>Attendance: {player.attendance_rate || 0}%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    </Tabs.Content>

                                    {/* Injuries Tab */}
                                    <Tabs.Content value="injuries">
                                        <div className="team-management__injuries">
                                            {players.filter(p => p.status === 'injured').length > 0 ? (
                                                <div className="team-management__injury-list">
                                                    {players
                                                        .filter(p => p.status === 'injured')
                                                        .map(player => (
                                                            <div key={player.id} className="team-management__injury-item">
                                                                <div className="team-management__injury-player">
                                                                    <h4>{player.first_name} {player.last_name}</h4>
                                                                    <span>{player.position}</span>
                                                                </div>
                                                                <div className="team-management__injury-details">
                                                                    <span className="team-management__injury-type">
                                                                        {player.injury_type || 'Injury'}
                                                                    </span>
                                                                    <span className="team-management__injury-date">
                                                                        Since: {player.injury_date ? new Date(player.injury_date).toLocaleDateString() : 'Unknown'}
                                                                    </span>
                                                                    <span className="team-management__injury-expected">
                                                                        Expected return: {player.expected_return ? new Date(player.expected_return).toLocaleDateString() : 'TBD'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    }
                                                </div>
                                            ) : (
                                                <div className="team-management__no-injuries">
                                                    <p>🎉 No injured players! Keep up the great work.</p>
                                                </div>
                                            )}
                                        </div>
                                    </Tabs.Content>
                                </Tabs>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            {/* Player Details Modal */}
            {showPlayerModal && selectedPlayer && (
                <Modal
                    isOpen={showPlayerModal}
                    onClose={() => setShowPlayerModal(false)}
                    title={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                    size="large"
                >
                    <div className="team-management__player-modal">
                        <div className="team-management__player-modal-header">
                            <div className="team-management__player-modal-avatar">
                                {selectedPlayer.profile_picture ? (
                                    <img 
                                        src={selectedPlayer.profile_picture} 
                                        alt={`${selectedPlayer.first_name} ${selectedPlayer.last_name}`}
                                    />
                                ) : (
                                    <div className="team-management__player-initials">
                                        {selectedPlayer.first_name?.[0]}{selectedPlayer.last_name?.[0]}
                                    </div>
                                )}
                            </div>
                            <div className="team-management__player-modal-info">
                                <h3>{selectedPlayer.first_name} {selectedPlayer.last_name}</h3>
                                <p>{selectedPlayer.position} • #{selectedPlayer.jersey_number || 'N/A'}</p>
                                <span className={`team-management__status-badge team-management__status-badge--${getPlayerStatusColor(selectedPlayer.status)}`}>
                                    {selectedPlayer.status}
                                </span>
                            </div>
                        </div>
                        
                        <div className="team-management__player-modal-content">
                            <div className="team-management__player-modal-section">
                                <h4>Personal Information</h4>
                                <div className="team-management__player-modal-grid">
                                    <div className="team-management__player-modal-field">
                                        <label>Age</label>
                                        <span>{calculateAge(selectedPlayer.birth_date)}</span>
                                    </div>
                                    <div className="team-management__player-modal-field">
                                        <label>Height</label>
                                        <span>{selectedPlayer.height || 'N/A'}cm</span>
                                    </div>
                                    <div className="team-management__player-modal-field">
                                        <label>Weight</label>
                                        <span>{selectedPlayer.weight || 'N/A'}kg</span>
                                    </div>
                                    <div className="team-management__player-modal-field">
                                        <label>Email</label>
                                        <span>{selectedPlayer.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="team-management__player-modal-section">
                                <h4>Performance Stats</h4>
                                <div className="team-management__player-modal-grid">
                                    <div className="team-management__player-modal-field">
                                        <label>Goals</label>
                                        <span>{selectedPlayer.goals || 0}</span>
                                    </div>
                                    <div className="team-management__player-modal-field">
                                        <label>Assists</label>
                                        <span>{selectedPlayer.assists || 0}</span>
                                    </div>
                                    <div className="team-management__player-modal-field">
                                        <label>Attendance Rate</label>
                                        <span>{selectedPlayer.attendance_rate || 0}%</span>
                                    </div>
                                    <div className="team-management__player-modal-field">
                                        <label>Performance Rating</label>
                                        <span>{selectedPlayer.performance_rating || 0}/5</span>
                                    </div>
                                </div>
                            </div>

                            <div className="team-management__player-modal-actions">
                                <Button 
                                    as={Link} 
                                    to={`/coach/players/${selectedPlayer.id}/edit`}
                                    variant="primary"
                                >
                                    Edit Player
                                </Button>
                                <Button 
                                    as={Link} 
                                    to={`/coach/players/${selectedPlayer.id}/development`}
                                    variant="secondary"
                                >
                                    Development Plan
                                </Button>
                                <Button 
                                    onClick={() => setShowPlayerModal(false)}
                                    variant="ghost"
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default TeamManagement;