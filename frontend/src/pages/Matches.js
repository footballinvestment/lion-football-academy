import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const Matches = () => {
    const { user, isAdminOrCoach } = useContext(AuthContext);
    
    // DEBUG LOG
    console.log('Matches page - User role:', user?.role, 'User:', user, 'Access granted:', true);
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('matches');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('match');
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [topScorers, setTopScorers] = useState([]);
    const [teamPerformance, setTeamPerformance] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        season: '2024/2025',
        match_type: '',
        match_status: '',
        date_from: '',
        date_to: ''
    });

    // Form data for various modals
    const [matchForm, setMatchForm] = useState({
        home_team_id: '',
        away_team_id: '',
        match_date: '',
        match_time: '',
        venue: '',
        match_type: 'friendly',
        season: '2024/2025',
        referee_name: '',
        weather_conditions: '',
        notes: ''
    });

    const [scoreForm, setScoreForm] = useState({
        home_score: 0,
        away_score: 0
    });

    const [performanceForm, setPerformanceForm] = useState({
        player_id: '',
        team_id: '',
        position: '',
        minutes_played: 90,
        starter: true,
        goals: 0,
        assists: 0,
        yellow_cards: 0,
        red_cards: 0,
        performance_rating: 7,
        coach_notes: ''
    });

    const [eventForm, setEventForm] = useState({
        player_id: '',
        team_id: '',
        event_type: 'goal',
        event_minute: '',
        event_description: '',
        assisted_by_player_id: ''
    });

    const matchTypes = [
        { value: 'friendly', label: '🤝 Barátságos', color: 'secondary' },
        { value: 'league', label: '🏆 Bajnoki', color: 'primary' },
        { value: 'cup', label: '🏅 Kupa', color: 'warning' },
        { value: 'tournament', label: '🥇 Torna', color: 'success' }
    ];

    const matchStatuses = [
        { value: 'scheduled', label: '📅 Tervezett', color: 'info' },
        { value: 'ongoing', label: '⚽ Folyamatban', color: 'warning' },
        { value: 'finished', label: '✅ Befejezett', color: 'success' },
        { value: 'cancelled', label: '❌ Elmarad', color: 'danger' },
        { value: 'postponed', label: '⏰ Elhalasztva', color: 'secondary' }
    ];

    const eventTypes = [
        { value: 'goal', label: '⚽ Gól', color: 'success' },
        { value: 'assist', label: '🎯 Gólpassz', color: 'info' },
        { value: 'yellow_card', label: '🟨 Sárga lap', color: 'warning' },
        { value: 'red_card', label: '🟥 Piros lap', color: 'danger' },
        { value: 'substitution_in', label: '🔄 Csere be', color: 'primary' },
        { value: 'substitution_out', label: '🔄 Csere ki', color: 'secondary' },
        { value: 'penalty', label: '⭐ Tizenegy', color: 'dark' },
        { value: 'injury', label: '🏥 Sérülés', color: 'danger' }
    ];

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);
            
            // Admin és coach esetén minden adat kell
            if (user.role === 'admin' || user.role === 'coach') {
                const [matchesData, teamsData, playersData] = await Promise.all([
                    apiService.matches.getAll(filters),
                    apiService.teams.getAll(),
                    apiService.players.getAll()
                ]);
                
                setMatches(matchesData.data);
                setTeams(teamsData.data);
                setPlayers(playersData.data);
            } else {
                // Player és parent esetén csak matches és teams
                const [matchesData, teamsData] = await Promise.all([
                    apiService.matches.getAll(filters),
                    apiService.teams.getAll()
                ]);
                
                let matchesToShow = matchesData.data;
                
                // Player role csak a saját csapat mérkőzéseit látja
                if (user.role === 'player' && user.team_id) {
                    matchesToShow = matchesData.data.filter(match => 
                        match.home_team_id === user.team_id || match.away_team_id === user.team_id
                    );
                }
                
                setMatches(matchesToShow);
                setTeams(teamsData.data);
                setPlayers([]); // Player role nem fér hozzá a játékos listához
            }
            
            if (activeTab === 'statistics') {
                await fetchStatistics();
            }
        } catch (error) {
            setError('Hiba az adatok betöltésekor');
            console.error('Data fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatistics = async () => {
        try {
            const [scorersData, teamPerfData] = await Promise.all([
                apiService.matches.getTopScorers({ season: filters.season }),
                apiService.matches.getTeamPerformance({ season: filters.season })
            ]);
            
            setTopScorers(scorersData.data);
            setTeamPerformance(teamPerfData.data);
        } catch (error) {
            console.error('Statistics fetch error:', error);
        }
    };

    const handleCreateMatch = async (e) => {
        e.preventDefault();
        try {
            await apiService.matches.create(matchForm);
            setShowModal(false);
            resetMatchForm();
            fetchData();
            setSuccess('Mérkőzés sikeresen létrehozva!');
        } catch (error) {
            setError('Hiba a mérkőzés létrehozásakor');
        }
    };

    const handleUpdateScore = async (matchId) => {
        try {
            await apiService.matches.updateScore(matchId, scoreForm);
            setShowModal(false);
            fetchData();
            setSuccess('Eredmény sikeresen frissítve!');
        } catch (error) {
            setError('Hiba az eredmény frissítésekor');
        }
    };

    const handleRecordPerformance = async (e) => {
        e.preventDefault();
        try {
            await apiService.matches.recordPerformance(selectedMatch.id, performanceForm);
            setShowModal(false);
            resetPerformanceForm();
            setSuccess('Teljesítmény sikeresen rögzítve!');
        } catch (error) {
            setError('Hiba a teljesítmény rögzítésekor');
        }
    };

    const handleAddEvent = async (e) => {
        e.preventDefault();
        try {
            await apiService.matches.addEvent(selectedMatch.id, eventForm);
            setShowModal(false);
            resetEventForm();
            setSuccess('Esemény sikeresen hozzáadva!');
        } catch (error) {
            setError('Hiba az esemény hozzáadásakor');
        }
    };

    const openModal = (type, match = null) => {
        setModalType(type);
        setSelectedMatch(match);
        setShowModal(true);
        
        if (type === 'score' && match) {
            setScoreForm({
                home_score: match.home_score || 0,
                away_score: match.away_score || 0
            });
        }
        
        if (type === 'performance' && match) {
            setPerformanceForm({
                ...performanceForm,
                team_id: user.team_id || match.home_team_id
            });
        }
        
        if (type === 'event' && match) {
            setEventForm({
                ...eventForm,
                team_id: user.team_id || match.home_team_id
            });
        }
    };

    const resetMatchForm = () => {
        setMatchForm({
            home_team_id: '',
            away_team_id: '',
            match_date: '',
            match_time: '',
            venue: '',
            match_type: 'friendly',
            season: '2024/2025',
            referee_name: '',
            weather_conditions: '',
            notes: ''
        });
    };

    const resetPerformanceForm = () => {
        setPerformanceForm({
            player_id: '',
            team_id: '',
            position: '',
            minutes_played: 90,
            starter: true,
            goals: 0,
            assists: 0,
            yellow_cards: 0,
            red_cards: 0,
            performance_rating: 7,
            coach_notes: ''
        });
    };

    const resetEventForm = () => {
        setEventForm({
            player_id: '',
            team_id: '',
            event_type: 'goal',
            event_minute: '',
            event_description: '',
            assisted_by_player_id: ''
        });
    };

    const getMatchTypeBadge = (type) => {
        const matchType = matchTypes.find(mt => mt.value === type);
        return matchType ? `badge bg-${matchType.color}` : 'badge bg-secondary';
    };

    const getMatchStatusBadge = (status) => {
        const matchStatus = matchStatuses.find(ms => ms.value === status);
        return matchStatus ? `badge bg-${matchStatus.color}` : 'badge bg-secondary';
    };

    const getEventTypeBadge = (type) => {
        const eventType = eventTypes.find(et => et.value === type);
        return eventType ? `badge bg-${eventType.color}` : 'badge bg-secondary';
    };

    const formatMatchResult = (match) => {
        if (match.match_status === 'finished') {
            return `${match.home_score} - ${match.away_score}`;
        }
        return '-';
    };

    const getTeamDisplayName = (teams, teamId) => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : 'Ismeretlen csapat';
    };

    const getPlayerDisplayName = (players, playerId) => {
        const player = players.find(p => p.id === playerId);
        return player ? player.name : 'Ismeretlen játékos';
    };

    if (!user) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    Bejelentkezés szükséges a mérkőzések megtekintéséhez.
                </div>
            </div>
        );
    }

    if (loading) return <div className="text-center mt-5"><div className="spinner-border"></div></div>;

    return (
        <div className="container-fluid mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>⚽ Mérkőzések {user.role === 'player' ? '- Saját Csapat' : '& Statisztikák'}</h2>
                        {isAdminOrCoach() && (
                            <button 
                                className="btn btn-primary"
                                onClick={() => openModal('match')}
                            >
                                ➕ Új mérkőzés
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success" role="alert">
                            {success}
                        </div>
                    )}

                    {/* Tabs */}
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'matches' ? 'active' : ''}`}
                                onClick={() => setActiveTab('matches')}
                            >
                                📅 Mérkőzések
                            </button>
                        </li>
                        {isAdminOrCoach() && (
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'statistics' ? 'active' : ''}`}
                                    onClick={() => {setActiveTab('statistics'); fetchStatistics();}}
                                >
                                    📊 Statisztikák
                                </button>
                            </li>
                        )}
                    </ul>

                    {/* Matches Tab */}
                    {activeTab === 'matches' && (
                        <>
                            {/* Filters */}
                            <div className="card mb-4">
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-2">
                                            <label className="form-label">Szezon</label>
                                            <select 
                                                className="form-select"
                                                value={filters.season}
                                                onChange={(e) => setFilters({...filters, season: e.target.value})}
                                            >
                                                <option value="2024/2025">2024/2025</option>
                                                <option value="2023/2024">2023/2024</option>
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Típus</label>
                                            <select 
                                                className="form-select"
                                                value={filters.match_type}
                                                onChange={(e) => setFilters({...filters, match_type: e.target.value})}
                                            >
                                                <option value="">Minden</option>
                                                {matchTypes.map(type => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Állapot</label>
                                            <select 
                                                className="form-select"
                                                value={filters.match_status}
                                                onChange={(e) => setFilters({...filters, match_status: e.target.value})}
                                            >
                                                <option value="">Minden</option>
                                                {matchStatuses.map(status => (
                                                    <option key={status.value} value={status.value}>
                                                        {status.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Dátumtól</label>
                                            <input 
                                                type="date"
                                                className="form-control"
                                                value={filters.date_from}
                                                onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">Dátumig</label>
                                            <input 
                                                type="date"
                                                className="form-control"
                                                value={filters.date_to}
                                                onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-2">
                                            <label className="form-label">&nbsp;</label>
                                            <button 
                                                className="btn btn-outline-secondary w-100"
                                                onClick={() => setFilters({
                                                    season: '2024/2025',
                                                    match_type: '',
                                                    match_status: '',
                                                    date_from: '',
                                                    date_to: ''
                                                })}
                                            >
                                                🔄 Törlés
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Matches List */}
                            <div className="card">
                                <div className="card-header">
                                    <h5>Mérkőzések listája</h5>
                                </div>
                                <div className="card-body">
                                    {matches.length === 0 ? (
                                        <div className="text-center py-4">
                                            <p className="text-muted">Nincsenek mérkőzések a megadott szűrőkkel.</p>
                                        </div>
                                    ) : (
                                        <div className="table-responsive">
                                            <table className="table table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>Dátum</th>
                                                        <th>Hazai</th>
                                                        <th>Vendég</th>
                                                        <th>Eredmény</th>
                                                        <th>Típus</th>
                                                        <th>Állapot</th>
                                                        <th>Helyszín</th>
                                                        <th>Műveletek</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {matches.map(match => (
                                                        <tr key={match.id}>
                                                            <td>
                                                                <strong>{new Date(match.match_date).toLocaleDateString('hu-HU')}</strong>
                                                                {match.match_time && <br/>}
                                                                <small className="text-muted">{match.match_time}</small>
                                                            </td>
                                                            <td>
                                                                <strong>{match.home_team_name}</strong>
                                                            </td>
                                                            <td>
                                                                <strong>{match.away_team_name}</strong>
                                                            </td>
                                                            <td>
                                                                <h5 className="mb-0">
                                                                    {formatMatchResult(match)}
                                                                </h5>
                                                            </td>
                                                            <td>
                                                                <span className={getMatchTypeBadge(match.match_type)}>
                                                                    {matchTypes.find(mt => mt.value === match.match_type)?.label || match.match_type}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className={getMatchStatusBadge(match.match_status)}>
                                                                    {matchStatuses.find(ms => ms.value === match.match_status)?.label || match.match_status}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <small>{match.venue || '-'}</small>
                                                            </td>
                                                            <td>
                                                                {isAdminOrCoach() ? (
                                                                    <div className="btn-group btn-group-sm">
                                                                        <button 
                                                                            className="btn btn-outline-success"
                                                                            onClick={() => openModal('score', match)}
                                                                            title="Eredmény"
                                                                        >
                                                                            🏆
                                                                        </button>
                                                                        <button 
                                                                            className="btn btn-outline-primary"
                                                                            onClick={() => openModal('performance', match)}
                                                                            title="Teljesítmény"
                                                                        >
                                                                            📊
                                                                        </button>
                                                                        <button 
                                                                            className="btn btn-outline-warning"
                                                                            onClick={() => openModal('event', match)}
                                                                            title="Esemény"
                                                                        >
                                                                            ⚽
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <small className="text-muted">Csak megtekintés</small>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Statistics Tab */}
                    {activeTab === 'statistics' && (
                        <>
                            <div className="row">
                                {/* Top Scorers */}
                                <div className="col-lg-6">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>⚽ Góllövő Lista</h5>
                                        </div>
                                        <div className="card-body">
                                            {topScorers.length === 0 ? (
                                                <p className="text-muted text-center">Nincsenek adatok.</p>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>Játékos</th>
                                                                <th>Csapat</th>
                                                                <th>Gól</th>
                                                                <th>Gólpassz</th>
                                                                <th>Mérkőzés</th>
                                                                <th>Átlag</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {topScorers.map((player, index) => (
                                                                <tr key={player.id}>
                                                                    <td>
                                                                        <strong className="text-primary">#{index + 1}</strong>
                                                                    </td>
                                                                    <td>
                                                                        <strong>{player.name}</strong>
                                                                    </td>
                                                                    <td>
                                                                        <small>{player.team_name}</small>
                                                                    </td>
                                                                    <td>
                                                                        <span className="badge bg-success">{player.total_goals}</span>
                                                                    </td>
                                                                    <td>
                                                                        <span className="badge bg-info">{player.total_assists}</span>
                                                                    </td>
                                                                    <td>
                                                                        <small>{player.matches_played}</small>
                                                                    </td>
                                                                    <td>
                                                                        <small>{player.avg_rating || '-'}</small>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Team Performance */}
                                <div className="col-lg-6">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>🏆 Csapat Teljesítmény</h5>
                                        </div>
                                        <div className="card-body">
                                            {teamPerformance.length === 0 ? (
                                                <p className="text-muted text-center">Nincsenek adatok.</p>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table table-sm">
                                                        <thead>
                                                            <tr>
                                                                <th>Csapat</th>
                                                                <th>M</th>
                                                                <th>Gy</th>
                                                                <th>D</th>
                                                                <th>V</th>
                                                                <th>GK</th>
                                                                <th>GE</th>
                                                                <th>Pont</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {teamPerformance.map((team, index) => (
                                                                <tr key={team.id}>
                                                                    <td>
                                                                        <strong>{team.name}</strong>
                                                                    </td>
                                                                    <td>{team.matches_played}</td>
                                                                    <td><span className="badge bg-success">{team.wins}</span></td>
                                                                    <td><span className="badge bg-warning">{team.draws}</span></td>
                                                                    <td><span className="badge bg-danger">{team.losses}</span></td>
                                                                    <td>{team.goals_for}</td>
                                                                    <td>{team.goals_against}</td>
                                                                    <td>
                                                                        <strong>{(team.wins * 3) + (team.draws * 1)}</strong>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className={`modal-dialog ${modalType === 'match' ? 'modal-lg' : ''}`}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modalType === 'match' && '⚽ Új mérkőzés'}
                                    {modalType === 'score' && '🏆 Eredmény rögzítése'}
                                    {modalType === 'performance' && '📊 Teljesítmény rögzítése'}
                                    {modalType === 'event' && '⚽ Esemény hozzáadása'}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>

                            {/* Match Form */}
                            {modalType === 'match' && (
                                <form onSubmit={handleCreateMatch}>
                                    <div className="modal-body">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Hazai csapat *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={matchForm.home_team_id}
                                                        onChange={(e) => setMatchForm({...matchForm, home_team_id: e.target.value})}
                                                        required
                                                    >
                                                        <option value="">Válasszon csapatot</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Vendég csapat *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={matchForm.away_team_id}
                                                        onChange={(e) => setMatchForm({...matchForm, away_team_id: e.target.value})}
                                                        required
                                                    >
                                                        <option value="">Válasszon csapatot</option>
                                                        {teams.map(team => (
                                                            <option key={team.id} value={team.id}>
                                                                {team.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Dátum *</label>
                                                    <input 
                                                        type="date"
                                                        className="form-control"
                                                        value={matchForm.match_date}
                                                        onChange={(e) => setMatchForm({...matchForm, match_date: e.target.value})}
                                                        required
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Idő</label>
                                                    <input 
                                                        type="time"
                                                        className="form-control"
                                                        value={matchForm.match_time}
                                                        onChange={(e) => setMatchForm({...matchForm, match_time: e.target.value})}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Helyszín</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        value={matchForm.venue}
                                                        onChange={(e) => setMatchForm({...matchForm, venue: e.target.value})}
                                                        placeholder="Stadion neve"
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Típus *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={matchForm.match_type}
                                                        onChange={(e) => setMatchForm({...matchForm, match_type: e.target.value})}
                                                        required
                                                    >
                                                        {matchTypes.map(type => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Szezon</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        value={matchForm.season}
                                                        onChange={(e) => setMatchForm({...matchForm, season: e.target.value})}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Játékvezető</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        value={matchForm.referee_name}
                                                        onChange={(e) => setMatchForm({...matchForm, referee_name: e.target.value})}
                                                        placeholder="Játékvezető neve"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Időjárás</label>
                                            <input 
                                                type="text"
                                                className="form-control"
                                                value={matchForm.weather_conditions}
                                                onChange={(e) => setMatchForm({...matchForm, weather_conditions: e.target.value})}
                                                placeholder="Pl: Napos, 22°C"
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Megjegyzések</label>
                                            <textarea 
                                                className="form-control"
                                                rows="3"
                                                value={matchForm.notes}
                                                onChange={(e) => setMatchForm({...matchForm, notes: e.target.value})}
                                                placeholder="További információk"
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary"
                                            onClick={() => setShowModal(false)}
                                        >
                                            Mégse
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Mérkőzés létrehozása
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Score Form */}
                            {modalType === 'score' && selectedMatch && (
                                <div>
                                    <div className="modal-body">
                                        <div className="text-center mb-4">
                                            <h4>
                                                {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
                                            </h4>
                                            <small className="text-muted">
                                                {new Date(selectedMatch.match_date).toLocaleDateString('hu-HU')}
                                            </small>
                                        </div>
                                        <div className="row">
                                            <div className="col-6">
                                                <label className="form-label text-center d-block">
                                                    <strong>{selectedMatch.home_team_name}</strong>
                                                </label>
                                                <input 
                                                    type="number"
                                                    className="form-control form-control-lg text-center"
                                                    value={scoreForm.home_score}
                                                    onChange={(e) => setScoreForm({...scoreForm, home_score: parseInt(e.target.value) || 0})}
                                                    min="0"
                                                />
                                            </div>
                                            <div className="col-6">
                                                <label className="form-label text-center d-block">
                                                    <strong>{selectedMatch.away_team_name}</strong>
                                                </label>
                                                <input 
                                                    type="number"
                                                    className="form-control form-control-lg text-center"
                                                    value={scoreForm.away_score}
                                                    onChange={(e) => setScoreForm({...scoreForm, away_score: parseInt(e.target.value) || 0})}
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary"
                                            onClick={() => setShowModal(false)}
                                        >
                                            Mégse
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-success"
                                            onClick={() => handleUpdateScore(selectedMatch.id)}
                                        >
                                            Eredmény mentése
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Performance Form */}
                            {modalType === 'performance' && selectedMatch && (
                                <form onSubmit={handleRecordPerformance}>
                                    <div className="modal-body">
                                        <div className="text-center mb-3">
                                            <h6>
                                                {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
                                            </h6>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Játékos *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={performanceForm.player_id}
                                                        onChange={(e) => setPerformanceForm({...performanceForm, player_id: e.target.value})}
                                                        required
                                                    >
                                                        <option value="">Válasszon játékost</option>
                                                        {players.filter(p => 
                                                            user.role === 'admin' || 
                                                            p.team_id === user.team_id ||
                                                            p.team_id === selectedMatch.home_team_id ||
                                                            p.team_id === selectedMatch.away_team_id
                                                        ).map(player => (
                                                            <option key={player.id} value={player.id}>
                                                                {player.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Poszt</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        value={performanceForm.position}
                                                        onChange={(e) => setPerformanceForm({...performanceForm, position: e.target.value})}
                                                        placeholder="Pl: Középpályás"
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Játékperc</label>
                                                    <input 
                                                        type="number"
                                                        className="form-control"
                                                        value={performanceForm.minutes_played}
                                                        onChange={(e) => setPerformanceForm({...performanceForm, minutes_played: parseInt(e.target.value) || 0})}
                                                        min="0"
                                                        max="120"
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <div className="form-check">
                                                        <input 
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={performanceForm.starter}
                                                            onChange={(e) => setPerformanceForm({...performanceForm, starter: e.target.checked})}
                                                        />
                                                        <label className="form-check-label">
                                                            Kezdő játékos
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="row">
                                                    <div className="col-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Gólok</label>
                                                            <input 
                                                                type="number"
                                                                className="form-control"
                                                                value={performanceForm.goals}
                                                                onChange={(e) => setPerformanceForm({...performanceForm, goals: parseInt(e.target.value) || 0})}
                                                                min="0"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Gólpasszok</label>
                                                            <input 
                                                                type="number"
                                                                className="form-control"
                                                                value={performanceForm.assists}
                                                                onChange={(e) => setPerformanceForm({...performanceForm, assists: parseInt(e.target.value) || 0})}
                                                                min="0"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="row">
                                                    <div className="col-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Sárga lap</label>
                                                            <input 
                                                                type="number"
                                                                className="form-control"
                                                                value={performanceForm.yellow_cards}
                                                                onChange={(e) => setPerformanceForm({...performanceForm, yellow_cards: parseInt(e.target.value) || 0})}
                                                                min="0"
                                                                max="2"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Piros lap</label>
                                                            <input 
                                                                type="number"
                                                                className="form-control"
                                                                value={performanceForm.red_cards}
                                                                onChange={(e) => setPerformanceForm({...performanceForm, red_cards: parseInt(e.target.value) || 0})}
                                                                min="0"
                                                                max="1"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Teljesítmény (1-10)</label>
                                                    <input 
                                                        type="number"
                                                        className="form-control"
                                                        value={performanceForm.performance_rating}
                                                        onChange={(e) => setPerformanceForm({...performanceForm, performance_rating: parseFloat(e.target.value) || 7})}
                                                        min="1"
                                                        max="10"
                                                        step="0.1"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Edző megjegyzések</label>
                                            <textarea 
                                                className="form-control"
                                                rows="3"
                                                value={performanceForm.coach_notes}
                                                onChange={(e) => setPerformanceForm({...performanceForm, coach_notes: e.target.value})}
                                                placeholder="Teljesítmény értékelése, fejlesztendő területek"
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary"
                                            onClick={() => setShowModal(false)}
                                        >
                                            Mégse
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Teljesítmény rögzítése
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Event Form */}
                            {modalType === 'event' && selectedMatch && (
                                <form onSubmit={handleAddEvent}>
                                    <div className="modal-body">
                                        <div className="text-center mb-3">
                                            <h6>
                                                {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
                                            </h6>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Játékos</label>
                                                    <select 
                                                        className="form-select"
                                                        value={eventForm.player_id}
                                                        onChange={(e) => setEventForm({...eventForm, player_id: e.target.value})}
                                                    >
                                                        <option value="">Válasszon játékost</option>
                                                        {players.filter(p => 
                                                            p.team_id === selectedMatch.home_team_id ||
                                                            p.team_id === selectedMatch.away_team_id
                                                        ).map(player => (
                                                            <option key={player.id} value={player.id}>
                                                                {player.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Esemény típusa *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={eventForm.event_type}
                                                        onChange={(e) => setEventForm({...eventForm, event_type: e.target.value})}
                                                        required
                                                    >
                                                        {eventTypes.map(type => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Perc *</label>
                                                    <input 
                                                        type="number"
                                                        className="form-control"
                                                        value={eventForm.event_minute}
                                                        onChange={(e) => setEventForm({...eventForm, event_minute: parseInt(e.target.value) || ''})}
                                                        min="1"
                                                        max="120"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                {eventForm.event_type === 'goal' && (
                                                    <div className="mb-3">
                                                        <label className="form-label">Gólpassz adó</label>
                                                        <select 
                                                            className="form-select"
                                                            value={eventForm.assisted_by_player_id}
                                                            onChange={(e) => setEventForm({...eventForm, assisted_by_player_id: e.target.value})}
                                                        >
                                                            <option value="">Nincs gólpassz</option>
                                                            {players.filter(p => 
                                                                p.team_id === eventForm.team_id
                                                            ).map(player => (
                                                                <option key={player.id} value={player.id}>
                                                                    {player.name}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                                <div className="mb-3">
                                                    <label className="form-label">Csapat *</label>
                                                    <select 
                                                        className="form-select"
                                                        value={eventForm.team_id}
                                                        onChange={(e) => setEventForm({...eventForm, team_id: e.target.value})}
                                                        required
                                                    >
                                                        <option value="">Válasszon csapatot</option>
                                                        <option value={selectedMatch.home_team_id}>
                                                            {selectedMatch.home_team_name}
                                                        </option>
                                                        <option value={selectedMatch.away_team_id}>
                                                            {selectedMatch.away_team_name}
                                                        </option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Leírás</label>
                                            <textarea 
                                                className="form-control"
                                                rows="3"
                                                value={eventForm.event_description}
                                                onChange={(e) => setEventForm({...eventForm, event_description: e.target.value})}
                                                placeholder="Az esemény részletes leírása"
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary"
                                            onClick={() => setShowModal(false)}
                                        >
                                            Mégse
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            Esemény hozzáadása
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Matches;