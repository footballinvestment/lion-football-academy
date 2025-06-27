import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './MatchManagement.css';

const MatchManagement = ({ userRole, teamId }) => {
    const [matches, setMatches] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const [showMatchModal, setShowMatchModal] = useState(false);
    const [showScoreModal, setShowScoreModal] = useState(false);
    const [showEventsModal, setShowEventsModal] = useState(false);
    const [matchEvents, setMatchEvents] = useState([]);
    const [filters, setFilters] = useState({
        season: '2024-25',
        match_type: '',
        status: '',
        team_id: teamId || ''
    });

    // Fetch matches with filters
    const fetchMatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiService.matches.getAll(filters);
            setMatches(response.data);
        } catch (err) {
            setError('Mérkőzések betöltése sikertelen: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Fetch teams for dropdowns
    const fetchTeams = useCallback(async () => {
        try {
            const response = await apiService.teams.getAll();
            setTeams(response.data);
        } catch (err) {
            console.error('Csapatok betöltése sikertelen:', err);
        }
    }, []);

    useEffect(() => {
        fetchMatches();
        fetchTeams();
    }, [fetchMatches, fetchTeams]);

    // Match form component
    const MatchForm = ({ match, onSave, onCancel }) => {
        const [formData, setFormData] = useState({
            home_team_id: match?.home_team_id || '',
            away_team_id: match?.away_team_id || '',
            match_date: match?.match_date || '',
            match_time: match?.match_time || '10:00',
            venue: match?.venue || 'Lion Football Academy Complex',
            match_type: match?.match_type || 'friendly',
            season: match?.season || '2024-25',
            match_duration: match?.match_duration || 90
        });
        const [formErrors, setFormErrors] = useState({});
        const [saving, setSaving] = useState(false);

        const validateForm = () => {
            const errors = {};
            if (!formData.home_team_id) errors.home_team_id = 'Hazai csapat kiválasztása kötelező';
            if (!formData.away_team_id) errors.away_team_id = 'Vendég csapat kiválasztása kötelező';
            if (formData.home_team_id === formData.away_team_id) {
                errors.teams = 'A hazai és vendég csapat nem lehet ugyanaz';
            }
            if (!formData.match_date) errors.match_date = 'Mérkőzés dátuma kötelező';
            if (!formData.match_time) errors.match_time = 'Mérkőzés időpontja kötelező';
            if (!formData.venue) errors.venue = 'Helyszín megadása kötelező';
            
            return errors;
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            const errors = validateForm();
            setFormErrors(errors);

            if (Object.keys(errors).length === 0) {
                setSaving(true);
                try {
                    if (match?.id) {
                        await apiService.matches.update(match.id, formData);
                    } else {
                        await apiService.matches.create(formData);
                    }
                    onSave();
                    setShowMatchModal(false);
                } catch (err) {
                    setError('Mérkőzés mentése sikertelen: ' + err.message);
                } finally {
                    setSaving(false);
                }
            }
        };

        return (
            <form onSubmit={handleSubmit} className="match-form">
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="home_team_id" className="form-label">
                                Hazai csapat <span className="text-danger">*</span>
                            </label>
                            <select
                                id="home_team_id"
                                className={`form-select ${formErrors.home_team_id ? 'is-invalid' : ''}`}
                                value={formData.home_team_id}
                                onChange={(e) => setFormData({...formData, home_team_id: e.target.value})}
                                aria-describedby="home_team_id_error"
                            >
                                <option value="">Válassz csapatot...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} ({team.age_group})
                                    </option>
                                ))}
                            </select>
                            {formErrors.home_team_id && (
                                <div id="home_team_id_error" className="invalid-feedback">
                                    {formErrors.home_team_id}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="away_team_id" className="form-label">
                                Vendég csapat <span className="text-danger">*</span>
                            </label>
                            <select
                                id="away_team_id"
                                className={`form-select ${formErrors.away_team_id ? 'is-invalid' : ''}`}
                                value={formData.away_team_id}
                                onChange={(e) => setFormData({...formData, away_team_id: e.target.value})}
                                aria-describedby="away_team_id_error"
                            >
                                <option value="">Válassz csapatot...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} ({team.age_group})
                                    </option>
                                ))}
                            </select>
                            {formErrors.away_team_id && (
                                <div id="away_team_id_error" className="invalid-feedback">
                                    {formErrors.away_team_id}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {formErrors.teams && (
                    <div className="alert alert-danger" role="alert">
                        {formErrors.teams}
                    </div>
                )}

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="match_date" className="form-label">
                                Dátum <span className="text-danger">*</span>
                            </label>
                            <input
                                type="date"
                                id="match_date"
                                className={`form-control ${formErrors.match_date ? 'is-invalid' : ''}`}
                                value={formData.match_date}
                                onChange={(e) => setFormData({...formData, match_date: e.target.value})}
                                aria-describedby="match_date_error"
                            />
                            {formErrors.match_date && (
                                <div id="match_date_error" className="invalid-feedback">
                                    {formErrors.match_date}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="match_time" className="form-label">
                                Időpont <span className="text-danger">*</span>
                            </label>
                            <input
                                type="time"
                                id="match_time"
                                className={`form-control ${formErrors.match_time ? 'is-invalid' : ''}`}
                                value={formData.match_time}
                                onChange={(e) => setFormData({...formData, match_time: e.target.value})}
                                aria-describedby="match_time_error"
                            />
                            {formErrors.match_time && (
                                <div id="match_time_error" className="invalid-feedback">
                                    {formErrors.match_time}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="venue" className="form-label">
                                Helyszín <span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                id="venue"
                                className={`form-control ${formErrors.venue ? 'is-invalid' : ''}`}
                                value={formData.venue}
                                onChange={(e) => setFormData({...formData, venue: e.target.value})}
                                placeholder="Mérkőzés helyszíne"
                                aria-describedby="venue_error"
                            />
                            {formErrors.venue && (
                                <div id="venue_error" className="invalid-feedback">
                                    {formErrors.venue}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="match_type" className="form-label">
                                Típus
                            </label>
                            <select
                                id="match_type"
                                className="form-select"
                                value={formData.match_type}
                                onChange={(e) => setFormData({...formData, match_type: e.target.value})}
                            >
                                <option value="friendly">Felkészülési</option>
                                <option value="league">Bajnoki</option>
                                <option value="cup">Kupa</option>
                                <option value="tournament">Torna</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="season" className="form-label">
                                Szezon
                            </label>
                            <select
                                id="season"
                                className="form-select"
                                value={formData.season}
                                onChange={(e) => setFormData({...formData, season: e.target.value})}
                            >
                                <option value="2024-25">2024-25</option>
                                <option value="2023-24">2023-24</option>
                                <option value="2022-23">2022-23</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="match_duration" className="form-label">
                                Játékidő (perc)
                            </label>
                            <input
                                type="number"
                                id="match_duration"
                                className="form-control"
                                value={formData.match_duration}
                                onChange={(e) => setFormData({...formData, match_duration: parseInt(e.target.value)})}
                                min="60"
                                max="120"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary me-2"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Mégse
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Mentés...
                            </>
                        ) : (
                            match?.id ? 'Frissítés' : 'Létrehozás'
                        )}
                    </button>
                </div>
            </form>
        );
    };

    // Score management component
    const ScoreManager = ({ match, onSave, onCancel }) => {
        const [homeScore, setHomeScore] = useState(match?.home_score || 0);
        const [awayScore, setAwayScore] = useState(match?.away_score || 0);
        const [saving, setSaving] = useState(false);

        const handleScoreUpdate = async () => {
            setSaving(true);
            try {
                await apiService.matches.updateScore(match.id, {
                    home_score: homeScore,
                    away_score: awayScore
                });
                onSave();
                setShowScoreModal(false);
            } catch (err) {
                setError('Eredmény frissítése sikertelen: ' + err.message);
            } finally {
                setSaving(false);
            }
        };

        return (
            <div className="score-manager">
                <div className="match-info mb-4">
                    <h5 className="text-center mb-3">
                        {match.home_team_name} vs {match.away_team_name}
                    </h5>
                    <p className="text-center text-muted">
                        {new Date(match.match_date).toLocaleDateString('hu-HU')} • {match.match_time}
                    </p>
                </div>

                <div className="score-inputs">
                    <div className="row align-items-center">
                        <div className="col-4 text-center">
                            <h6>{match.home_team_name}</h6>
                            <div className="score-input-group">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setHomeScore(Math.max(0, homeScore - 1))}
                                    disabled={homeScore <= 0}
                                    aria-label="Hazai gól törlése"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    className="form-control score-input"
                                    value={homeScore}
                                    onChange={(e) => setHomeScore(Math.max(0, parseInt(e.target.value) || 0))}
                                    min="0"
                                    aria-label="Hazai gólok száma"
                                />
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => setHomeScore(homeScore + 1)}
                                    aria-label="Hazai gól hozzáadása"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="col-4 text-center">
                            <h3 className="score-display">
                                {homeScore} : {awayScore}
                            </h3>
                        </div>

                        <div className="col-4 text-center">
                            <h6>{match.away_team_name}</h6>
                            <div className="score-input-group">
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setAwayScore(Math.max(0, awayScore - 1))}
                                    disabled={awayScore <= 0}
                                    aria-label="Vendég gól törlése"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    className="form-control score-input"
                                    value={awayScore}
                                    onChange={(e) => setAwayScore(Math.max(0, parseInt(e.target.value) || 0))}
                                    min="0"
                                    aria-label="Vendég gólok száma"
                                />
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => setAwayScore(awayScore + 1)}
                                    aria-label="Vendég gól hozzáadása"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="form-actions mt-4">
                    <button
                        type="button"
                        className="btn btn-secondary me-2"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Mégse
                    </button>
                    <button
                        type="button"
                        className="btn btn-success"
                        onClick={handleScoreUpdate}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Mentés...
                            </>
                        ) : (
                            'Eredmény rögzítése'
                        )}
                    </button>
                </div>
            </div>
        );
    };

    // Event manager component
    const EventManager = ({ match }) => {
        const [newEvent, setNewEvent] = useState({
            team_id: '',
            event_type: 'goal',
            event_minute: '',
            event_description: '',
            player_name: ''
        });
        const [saving, setSaving] = useState(false);

        const fetchMatchEvents = async () => {
            try {
                const response = await apiService.matches.getEvents(match.id);
                setMatchEvents(response.data);
            } catch (err) {
                console.error('Események betöltése sikertelen:', err);
            }
        };

        useEffect(() => {
            if (match?.id) {
                fetchMatchEvents();
            }
        }, [match]);

        const handleAddEvent = async (e) => {
            e.preventDefault();
            if (!newEvent.team_id || !newEvent.event_minute) return;

            setSaving(true);
            try {
                await apiService.matches.addEvent(match.id, newEvent);
                await fetchMatchEvents();
                setNewEvent({
                    team_id: '',
                    event_type: 'goal',
                    event_minute: '',
                    event_description: '',
                    player_name: ''
                });
            } catch (err) {
                setError('Esemény hozzáadása sikertelen: ' + err.message);
            } finally {
                setSaving(false);
            }
        };

        const getEventIcon = (eventType) => {
            const icons = {
                goal: '⚽',
                assist: '🅰️',
                yellow_card: '🟨',
                red_card: '🟥',
                substitution_in: '🔄',
                substitution_out: '🔄',
                injury: '🏥',
                penalty: '🥅',
                own_goal: '🤦'
            };
            return icons[eventType] || '📝';
        };

        return (
            <div className="event-manager">
                <div className="match-info mb-4">
                    <h5 className="text-center">
                        {match.home_team_name} {match.home_score || 0} : {match.away_score || 0} {match.away_team_name}
                    </h5>
                </div>

                {/* Add Event Form */}
                <div className="add-event-form mb-4">
                    <h6>Új esemény hozzáadása</h6>
                    <form onSubmit={handleAddEvent} className="row g-2">
                        <div className="col-md-3">
                            <select
                                className="form-select form-select-sm"
                                value={newEvent.team_id}
                                onChange={(e) => setNewEvent({...newEvent, team_id: e.target.value})}
                                required
                            >
                                <option value="">Csapat...</option>
                                <option value={match.home_team_id}>{match.home_team_name}</option>
                                <option value={match.away_team_id}>{match.away_team_name}</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <select
                                className="form-select form-select-sm"
                                value={newEvent.event_type}
                                onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value})}
                            >
                                <option value="goal">Gól</option>
                                <option value="assist">Gólpassz</option>
                                <option value="yellow_card">Sárga lap</option>
                                <option value="red_card">Piros lap</option>
                                <option value="substitution_in">Csere be</option>
                                <option value="substitution_out">Csere ki</option>
                                <option value="injury">Sérülés</option>
                                <option value="penalty">Tizenegyest</option>
                            </select>
                        </div>
                        <div className="col-md-2">
                            <input
                                type="number"
                                className="form-control form-control-sm"
                                placeholder="Perc"
                                value={newEvent.event_minute}
                                onChange={(e) => setNewEvent({...newEvent, event_minute: e.target.value})}
                                min="1"
                                max="120"
                                required
                            />
                        </div>
                        <div className="col-md-3">
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Játékos neve"
                                value={newEvent.player_name}
                                onChange={(e) => setNewEvent({...newEvent, player_name: e.target.value})}
                            />
                        </div>
                        <div className="col-md-2">
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm w-100"
                                disabled={saving}
                            >
                                {saving ? '...' : 'Hozzáad'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Events Timeline */}
                <div className="events-timeline">
                    <h6>Mérkőzés eseményei</h6>
                    {matchEvents.length === 0 ? (
                        <p className="text-muted">Még nincsenek rögzített események</p>
                    ) : (
                        <div className="events-list">
                            {matchEvents
                                .sort((a, b) => a.event_minute - b.event_minute)
                                .map((event, index) => (
                                    <div key={index} className="event-item">
                                        <span className="event-minute badge bg-secondary">
                                            {event.event_minute}'
                                        </span>
                                        <span className="event-icon">
                                            {getEventIcon(event.event_type)}
                                        </span>
                                        <span className="event-description">
                                            {event.event_description}
                                            {event.player_name && ` - ${event.player_name}`}
                                        </span>
                                        <span className="event-team">
                                            ({event.team_id === match.home_team_id ? match.home_team_name : match.away_team_name})
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Delete match confirmation
    const handleDeleteMatch = async (matchId) => {
        if (window.confirm('Biztosan törölni szeretnéd ezt a mérkőzést?')) {
            try {
                await apiService.matches.delete(matchId);
                await fetchMatches();
            } catch (err) {
                setError('Mérkőzés törlése sikertelen: ' + err.message);
            }
        }
    };

    // Filter change handler
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="match-management">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Mérkőzések kezelése</h3>
                {(userRole === 'admin' || userRole === 'coach') && (
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            setSelectedMatch(null);
                            setShowMatchModal(true);
                        }}
                    >
                        Új mérkőzés
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="filters-section mb-4">
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="form-label">Szezon</label>
                        <select
                            className="form-select"
                            value={filters.season}
                            onChange={(e) => handleFilterChange('season', e.target.value)}
                        >
                            <option value="">Minden szezon</option>
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Típus</label>
                        <select
                            className="form-select"
                            value={filters.match_type}
                            onChange={(e) => handleFilterChange('match_type', e.target.value)}
                        >
                            <option value="">Minden típus</option>
                            <option value="friendly">Felkészülési</option>
                            <option value="league">Bajnoki</option>
                            <option value="cup">Kupa</option>
                            <option value="tournament">Torna</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Státusz</label>
                        <select
                            className="form-select"
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                        >
                            <option value="">Minden státusz</option>
                            <option value="scheduled">Tervezett</option>
                            <option value="finished">Befejezett</option>
                            <option value="cancelled">Törölve</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Csapat</label>
                        <select
                            className="form-select"
                            value={filters.team_id}
                            onChange={(e) => handleFilterChange('team_id', e.target.value)}
                        >
                            <option value="">Minden csapat</option>
                            {teams.map(team => (
                                <option key={team.id} value={team.id}>
                                    {team.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Matches Table */}
            <div className="matches-table-container">
                {matches.length === 0 ? (
                    <div className="text-center py-5">
                        <p className="text-muted">Nincsenek mérkőzések a kiválasztott feltételek alapján</p>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead className="table-light">
                                <tr>
                                    <th>Dátum</th>
                                    <th>Időpont</th>
                                    <th>Mérkőzés</th>
                                    <th>Eredmény</th>
                                    <th>Típus</th>
                                    <th>Helyszín</th>
                                    <th>Státusz</th>
                                    <th>Műveletek</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matches.map(match => (
                                    <tr key={match.id}>
                                        <td>
                                            {new Date(match.match_date).toLocaleDateString('hu-HU')}
                                        </td>
                                        <td>{match.match_time}</td>
                                        <td>
                                            <strong>
                                                {match.home_team_name || 'TBA'} vs {match.away_team_name || 'TBA'}
                                            </strong>
                                        </td>
                                        <td>
                                            {match.match_status === 'finished' ? (
                                                <span className="badge bg-success">
                                                    {match.home_score} : {match.away_score}
                                                </span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${
                                                match.match_type === 'league' ? 'bg-primary' :
                                                match.match_type === 'cup' ? 'bg-warning' :
                                                match.match_type === 'tournament' ? 'bg-info' : 'bg-secondary'
                                            }`}>
                                                {match.match_type === 'friendly' ? 'Felkészülési' :
                                                 match.match_type === 'league' ? 'Bajnoki' :
                                                 match.match_type === 'cup' ? 'Kupa' :
                                                 match.match_type === 'tournament' ? 'Torna' : match.match_type}
                                            </span>
                                        </td>
                                        <td className="text-truncate" style={{maxWidth: '150px'}}>
                                            {match.venue}
                                        </td>
                                        <td>
                                            <span className={`badge ${
                                                match.match_status === 'finished' ? 'bg-success' :
                                                match.match_status === 'scheduled' ? 'bg-primary' :
                                                'bg-secondary'
                                            }`}>
                                                {match.match_status === 'finished' ? 'Befejezett' :
                                                 match.match_status === 'scheduled' ? 'Tervezett' :
                                                 match.match_status === 'cancelled' ? 'Törölve' : match.match_status}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="btn-group" role="group">
                                                {(userRole === 'admin' || userRole === 'coach') && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => {
                                                                setSelectedMatch(match);
                                                                setShowMatchModal(true);
                                                            }}
                                                            title="Szerkesztés"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-success"
                                                            onClick={() => {
                                                                setSelectedMatch(match);
                                                                setShowScoreModal(true);
                                                            }}
                                                            title="Eredmény rögzítése"
                                                        >
                                                            ⚽
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-outline-info"
                                                            onClick={() => {
                                                                setSelectedMatch(match);
                                                                setShowEventsModal(true);
                                                            }}
                                                            title="Események"
                                                        >
                                                            📝
                                                        </button>
                                                        {userRole === 'admin' && (
                                                            <button
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => handleDeleteMatch(match.id)}
                                                                title="Törlés"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Match Modal */}
            {showMatchModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {selectedMatch ? 'Mérkőzés szerkesztése' : 'Új mérkőzés létrehozása'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowMatchModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <MatchForm
                                    match={selectedMatch}
                                    onSave={fetchMatches}
                                    onCancel={() => setShowMatchModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Score Modal */}
            {showScoreModal && selectedMatch && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Eredmény rögzítése</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowScoreModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <ScoreManager
                                    match={selectedMatch}
                                    onSave={fetchMatches}
                                    onCancel={() => setShowScoreModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Events Modal */}
            {showEventsModal && selectedMatch && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Mérkőzés események</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowEventsModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <EventManager match={selectedMatch} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

MatchManagement.propTypes = {
    userRole: PropTypes.string.isRequired,
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default MatchManagement;