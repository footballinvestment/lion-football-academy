import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './PlayerStatistics.css';

const PlayerStatistics = ({ userRole, playerId, teamId }) => {
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [playerStats, setPlayerStats] = useState(null);
    const [seasonPerformance, setSeasonPerformance] = useState([]);
    const [matchPerformance, setMatchPerformance] = useState([]);
    const [positionStats, setPositionStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [filters, setFilters] = useState({
        season: '2024-25',
        match_type: '',
        last_matches: 10
    });

    // Fetch players based on role
    const fetchPlayers = useCallback(async () => {
        try {
            let response;
            if (userRole === 'parent' && playerId) {
                // Parent sees only their children
                response = await apiService.players.getById(playerId);
                setPlayers([response.data]);
                setSelectedPlayer(response.data);
            } else if (teamId) {
                // Coach sees their team players
                response = await apiService.players.getByTeam(teamId);
                setPlayers(response.data);
            } else {
                // Admin sees all players
                response = await apiService.players.getAll();
                setPlayers(response.data);
            }
        } catch (err) {
            setError('Játékosok betöltése sikertelen: ' + err.message);
        }
    }, [userRole, playerId, teamId]);

    // Fetch player statistics
    const fetchPlayerStatistics = useCallback(async (player) => {
        if (!player) return;
        
        setLoading(true);
        setError(null);
        
        try {
            // Fetch various statistics in parallel
            const [
                statsResponse,
                seasonResponse,
                matchResponse,
                positionResponse
            ] = await Promise.all([
                apiService.matches.getPlayerSeasonPerformance({ player_id: player.id, season: filters.season }),
                apiService.matches.getPlayerForm(player.id, 50), // Get more data for trends
                apiService.matches.getPlayerForm(player.id, filters.last_matches),
                apiService.matches.getPlayerSeasonPerformance({ 
                    player_id: player.id, 
                    season: filters.season,
                    position: player.position 
                })
            ]);

            setPlayerStats(statsResponse.data);
            setSeasonPerformance(seasonResponse.data);
            setMatchPerformance(matchResponse.data);
            setPositionStats(positionResponse.data);
        } catch (err) {
            setError('Statisztikák betöltése sikertelen: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    useEffect(() => {
        if (selectedPlayer) {
            fetchPlayerStatistics(selectedPlayer);
        }
    }, [selectedPlayer, fetchPlayerStatistics]);

    // Calculate age helper
    const calculateAge = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Statistics Overview Component
    const StatisticsOverview = () => {
        if (!playerStats) return <div className="text-muted">Nincsenek elérhető statisztikák</div>;

        return (
            <div className="statistics-overview">
                <div className="row">
                    <div className="col-md-3">
                        <div className="stat-card bg-primary text-white">
                            <div className="stat-icon">⚽</div>
                            <div className="stat-value">{playerStats.total_goals || 0}</div>
                            <div className="stat-label">Gólok</div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="stat-card bg-success text-white">
                            <div className="stat-icon">🅰️</div>
                            <div className="stat-value">{playerStats.total_assists || 0}</div>
                            <div className="stat-label">Gólpasszok</div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="stat-card bg-info text-white">
                            <div className="stat-icon">📊</div>
                            <div className="stat-value">{playerStats.matches_played || 0}</div>
                            <div className="stat-label">Mérkőzések</div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="stat-card bg-warning text-white">
                            <div className="stat-icon">⭐</div>
                            <div className="stat-value">{playerStats.average_rating ? playerStats.average_rating.toFixed(1) : 'N/A'}</div>
                            <div className="stat-label">Átlag értékelés</div>
                        </div>
                    </div>
                </div>

                <div className="row mt-4">
                    <div className="col-md-6">
                        <div className="stats-section">
                            <h6>Teljesítmény mutatók</h6>
                            <div className="progress-stats">
                                <div className="progress-item">
                                    <div className="d-flex justify-content-between">
                                        <span>Gól/mérkőzés arány</span>
                                        <span><strong>{playerStats.goals_per_match ? playerStats.goals_per_match.toFixed(2) : '0.00'}</strong></span>
                                    </div>
                                    <div className="progress mt-1">
                                        <div 
                                            className="progress-bar bg-primary" 
                                            style={{width: `${Math.min((playerStats.goals_per_match || 0) * 50, 100)}%`}}
                                        ></div>
                                    </div>
                                </div>
                                <div className="progress-item">
                                    <div className="d-flex justify-content-between">
                                        <span>Gólpassz/mérkőzés arány</span>
                                        <span><strong>{playerStats.assists_per_match ? playerStats.assists_per_match.toFixed(2) : '0.00'}</strong></span>
                                    </div>
                                    <div className="progress mt-1">
                                        <div 
                                            className="progress-bar bg-success" 
                                            style={{width: `${Math.min((playerStats.assists_per_match || 0) * 50, 100)}%`}}
                                        ></div>
                                    </div>
                                </div>
                                <div className="progress-item">
                                    <div className="d-flex justify-content-between">
                                        <span>Játékidő (%)</span>
                                        <span><strong>{playerStats.minutes_percentage || 0}%</strong></span>
                                    </div>
                                    <div className="progress mt-1">
                                        <div 
                                            className="progress-bar bg-info" 
                                            style={{width: `${playerStats.minutes_percentage || 0}%`}}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="stats-section">
                            <h6>Fegyelmi mutatók</h6>
                            <div className="discipline-stats">
                                <div className="row">
                                    <div className="col-6">
                                        <div className="stat-item">
                                            <span className="stat-icon">🟨</span>
                                            <span className="stat-number">{playerStats.yellow_cards || 0}</span>
                                            <span className="stat-text">Sárga lap</span>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="stat-item">
                                            <span className="stat-icon">🟥</span>
                                            <span className="stat-number">{playerStats.red_cards || 0}</span>
                                            <span className="stat-text">Piros lap</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <small className="text-muted">
                                        Fegyelmi pontszám: <strong>{(playerStats.yellow_cards || 0) + (playerStats.red_cards || 0) * 3}</strong>
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Season Progression Component
    const SeasonProgression = () => {
        if (!seasonPerformance.length) return <div className="text-muted">Nincsenek szezonális adatok</div>;

        // Group data by months for trend analysis
        const monthlyStats = seasonPerformance.reduce((acc, match) => {
            const month = new Date(match.match_date).toLocaleString('hu-HU', { month: 'long' });
            if (!acc[month]) {
                acc[month] = { goals: 0, assists: 0, matches: 0, rating: 0 };
            }
            acc[month].goals += match.goals || 0;
            acc[month].assists += match.assists || 0;
            acc[month].matches += 1;
            acc[month].rating += match.player_rating || 0;
            return acc;
        }, {});

        // Calculate averages
        Object.keys(monthlyStats).forEach(month => {
            if (monthlyStats[month].matches > 0) {
                monthlyStats[month].avgRating = (monthlyStats[month].rating / monthlyStats[month].matches).toFixed(1);
            }
        });

        return (
            <div className="season-progression">
                <div className="row">
                    <div className="col-md-8">
                        <div className="chart-container">
                            <h6>Havi teljesítmény trend</h6>
                            <div className="simple-chart">
                                {Object.entries(monthlyStats).map(([month, stats], index) => (
                                    <div key={month} className="chart-bar-group">
                                        <div className="chart-month">{month}</div>
                                        <div className="chart-bars">
                                            <div 
                                                className="chart-bar goals" 
                                                style={{height: `${Math.max(stats.goals * 20, 5)}px`}}
                                                title={`${stats.goals} gól`}
                                            ></div>
                                            <div 
                                                className="chart-bar assists" 
                                                style={{height: `${Math.max(stats.assists * 20, 5)}px`}}
                                                title={`${stats.assists} gólpassz`}
                                            ></div>
                                        </div>
                                        <div className="chart-values">
                                            <small>{stats.goals}g / {stats.assists}a</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="chart-legend">
                                <span className="legend-item"><span className="legend-color goals"></span> Gólok</span>
                                <span className="legend-item"><span className="legend-color assists"></span> Gólpasszok</span>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="progression-summary">
                            <h6>Fejlődési összefoglaló</h6>
                            <div className="summary-stats">
                                <div className="summary-item">
                                    <span className="summary-label">Legjobb hónap</span>
                                    <span className="summary-value">
                                        {Object.entries(monthlyStats).reduce((best, [month, stats]) => 
                                            (stats.goals + stats.assists) > (best.stats?.goals + best.stats?.assists || 0) 
                                                ? {month, stats} : best, {}
                                        ).month || 'N/A'}
                                    </span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Átlag értékelés trend</span>
                                    <span className="summary-value">
                                        {seasonPerformance.length > 5 ? (
                                            (seasonPerformance.slice(-5).reduce((sum, match) => sum + (match.player_rating || 0), 0) / 5).toFixed(1)
                                        ) : 'N/A'}
                                    </span>
                                </div>
                                <div className="summary-item">
                                    <span className="summary-label">Forma</span>
                                    <span className={`summary-value badge ${
                                        seasonPerformance.slice(-3).reduce((sum, match) => sum + (match.goals || 0) + (match.assists || 0), 0) >= 3
                                            ? 'bg-success' : seasonPerformance.slice(-3).reduce((sum, match) => sum + (match.goals || 0) + (match.assists || 0), 0) >= 1
                                            ? 'bg-warning' : 'bg-secondary'
                                    }`}>
                                        {seasonPerformance.slice(-3).reduce((sum, match) => sum + (match.goals || 0) + (match.assists || 0), 0) >= 3
                                            ? 'Kiváló' : seasonPerformance.slice(-3).reduce((sum, match) => sum + (match.goals || 0) + (match.assists || 0), 0) >= 1
                                            ? 'Jó' : 'Átlagos'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="recent-matches mt-4">
                    <h6>Legutóbbi mérkőzések</h6>
                    <div className="table-responsive">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Dátum</th>
                                    <th>Ellenfél</th>
                                    <th>Eredmény</th>
                                    <th>G</th>
                                    <th>A</th>
                                    <th>Értékelés</th>
                                    <th>Játékidő</th>
                                </tr>
                            </thead>
                            <tbody>
                                {seasonPerformance.slice(-10).reverse().map((match, index) => (
                                    <tr key={index}>
                                        <td>{new Date(match.match_date).toLocaleDateString('hu-HU')}</td>
                                        <td>{match.opponent_name || 'Ismeretlen'}</td>
                                        <td>
                                            <span className={`badge ${
                                                match.result === 'win' ? 'bg-success' : 
                                                match.result === 'draw' ? 'bg-warning' : 'bg-danger'
                                            }`}>
                                                {match.team_score || 0} - {match.opponent_score || 0}
                                            </span>
                                        </td>
                                        <td>{match.goals || 0}</td>
                                        <td>{match.assists || 0}</td>
                                        <td>
                                            {match.player_rating ? (
                                                <span className={`badge ${
                                                    match.player_rating >= 8 ? 'bg-success' :
                                                    match.player_rating >= 6 ? 'bg-warning' : 'bg-secondary'
                                                }`}>
                                                    {match.player_rating.toFixed(1)}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td>{match.minutes_played || 0}'</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Position Analysis Component
    const PositionAnalysis = () => {
        if (!selectedPlayer || !positionStats) return <div className="text-muted">Nincsenek pozíció-specifikus adatok</div>;

        return (
            <div className="position-analysis">
                <div className="row">
                    <div className="col-md-6">
                        <div className="position-info">
                            <h6>Pozíció: {selectedPlayer.position || 'Ismeretlen'}</h6>
                            <div className="position-skills">
                                <div className="skill-item">
                                    <span className="skill-label">Fizikai képességek</span>
                                    <div className="skill-bar">
                                        <div 
                                            className="skill-fill physical" 
                                            style={{width: `${(positionStats.physical_rating || 0) * 20}%`}}
                                        ></div>
                                    </div>
                                    <span className="skill-value">{positionStats.physical_rating || 0}/5</span>
                                </div>
                                <div className="skill-item">
                                    <span className="skill-label">Technikai képességek</span>
                                    <div className="skill-bar">
                                        <div 
                                            className="skill-fill technical" 
                                            style={{width: `${(positionStats.technical_rating || 0) * 20}%`}}
                                        ></div>
                                    </div>
                                    <span className="skill-value">{positionStats.technical_rating || 0}/5</span>
                                </div>
                                <div className="skill-item">
                                    <span className="skill-label">Taktikai értelem</span>
                                    <div className="skill-bar">
                                        <div 
                                            className="skill-fill tactical" 
                                            style={{width: `${(positionStats.tactical_rating || 0) * 20}%`}}
                                        ></div>
                                    </div>
                                    <span className="skill-value">{positionStats.tactical_rating || 0}/5</span>
                                </div>
                                <div className="skill-item">
                                    <span className="skill-label">Mentális erősség</span>
                                    <div className="skill-bar">
                                        <div 
                                            className="skill-fill mental" 
                                            style={{width: `${(positionStats.mental_rating || 0) * 20}%`}}
                                        ></div>
                                    </div>
                                    <span className="skill-value">{positionStats.mental_rating || 0}/5</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="comparison-stats">
                            <h6>Összehasonlítás a pozíció átlagával</h6>
                            <div className="comparison-items">
                                <div className="comparison-item">
                                    <span className="comparison-label">Gólok</span>
                                    <div className="comparison-bar">
                                        <div className="player-bar" style={{width: `${Math.min((playerStats?.total_goals || 0) * 10, 100)}%`}}></div>
                                        <div className="average-line" style={{left: '50%'}}></div>
                                    </div>
                                    <span className="comparison-value">
                                        {playerStats?.total_goals || 0} vs {positionStats.position_avg_goals || 0} átlag
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <span className="comparison-label">Gólpasszok</span>
                                    <div className="comparison-bar">
                                        <div className="player-bar" style={{width: `${Math.min((playerStats?.total_assists || 0) * 10, 100)}%`}}></div>
                                        <div className="average-line" style={{left: '50%'}}></div>
                                    </div>
                                    <span className="comparison-value">
                                        {playerStats?.total_assists || 0} vs {positionStats.position_avg_assists || 0} átlag
                                    </span>
                                </div>
                                <div className="comparison-item">
                                    <span className="comparison-label">Értékelés</span>
                                    <div className="comparison-bar">
                                        <div className="player-bar" style={{width: `${Math.min((playerStats?.average_rating || 0) * 12.5, 100)}%`}}></div>
                                        <div className="average-line" style={{left: '62.5%'}}></div>
                                    </div>
                                    <span className="comparison-value">
                                        {playerStats?.average_rating?.toFixed(1) || 'N/A'} vs {positionStats.position_avg_rating?.toFixed(1) || 'N/A'} átlag
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="position-recommendations mt-4">
                    <h6>Fejlesztési javaslatok</h6>
                    <div className="recommendations">
                        {selectedPlayer.position === 'Támadó' && (
                            <div className="recommendation-item">
                                <span className="recommendation-icon">⚽</span>
                                <div className="recommendation-text">
                                    <strong>Gólszerzés javítása:</strong> További lövőgyakorlatok és kapura tartó lövések fejlesztése.
                                </div>
                            </div>
                        )}
                        {selectedPlayer.position === 'Középpályás' && (
                            <div className="recommendation-item">
                                <span className="recommendation-icon">🎯</span>
                                <div className="recommendation-text">
                                    <strong>Passzjáték finomítása:</strong> Hosszú és rövid passzok pontosságának javítása.
                                </div>
                            </div>
                        )}
                        {selectedPlayer.position === 'Védő' && (
                            <div className="recommendation-item">
                                <span className="recommendation-icon">🛡️</span>
                                <div className="recommendation-text">
                                    <strong>Védőmunka erősítése:</strong> Fejben és lábbal való védések gyakorlása.
                                </div>
                            </div>
                        )}
                        <div className="recommendation-item">
                            <span className="recommendation-icon">💪</span>
                            <div className="recommendation-text">
                                <strong>Fizikai állóképesség:</strong> Cardiovasculáris edzések növelése a teljesítmény javításáért.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Export functionality
    const handleExport = () => {
        if (!selectedPlayer || !playerStats) return;

        const exportData = {
            player: {
                name: selectedPlayer.name,
                position: selectedPlayer.position,
                age: calculateAge(selectedPlayer.birth_date),
                team: selectedPlayer.team_name
            },
            statistics: playerStats,
            season: filters.season,
            exportDate: new Date().toISOString(),
            recentMatches: seasonPerformance.slice(-10)
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selectedPlayer.name.replace(/\s+/g, '_')}_statistics_${filters.season}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (loading && !selectedPlayer) return <LoadingSpinner />;

    return (
        <div className="player-statistics">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Játékos statisztikák</h3>
                {selectedPlayer && (
                    <button 
                        className="btn btn-outline-secondary"
                        onClick={handleExport}
                        title="Statisztikák exportálása"
                    >
                        📊 Exportálás
                    </button>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Player Selection and Filters */}
            <div className="controls-section mb-4">
                <div className="row g-3">
                    {userRole !== 'parent' && (
                        <div className="col-md-4">
                            <label className="form-label">Játékos</label>
                            <select
                                className="form-select"
                                value={selectedPlayer?.id || ''}
                                onChange={(e) => {
                                    const player = players.find(p => p.id === parseInt(e.target.value));
                                    setSelectedPlayer(player);
                                }}
                                aria-label="Játékos kiválasztása"
                            >
                                <option value="">Válassz játékost...</option>
                                {players.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name} ({player.position || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="col-md-3">
                        <label className="form-label">Szezon</label>
                        <select
                            className="form-select"
                            value={filters.season}
                            onChange={(e) => setFilters(prev => ({...prev, season: e.target.value}))}
                        >
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Mérkőzés típus</label>
                        <select
                            className="form-select"
                            value={filters.match_type}
                            onChange={(e) => setFilters(prev => ({...prev, match_type: e.target.value}))}
                        >
                            <option value="">Minden típus</option>
                            <option value="league">Bajnoki</option>
                            <option value="cup">Kupa</option>
                            <option value="friendly">Felkészülési</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Utolsó</label>
                        <select
                            className="form-select"
                            value={filters.last_matches}
                            onChange={(e) => setFilters(prev => ({...prev, last_matches: parseInt(e.target.value)}))}
                        >
                            <option value="5">5 mérkőzés</option>
                            <option value="10">10 mérkőzés</option>
                            <option value="20">20 mérkőzés</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedPlayer ? (
                <>
                    {/* Player Info Header */}
                    <div className="player-header mb-4">
                        <div className="row">
                            <div className="col-md-8">
                                <h4>{selectedPlayer.name}</h4>
                                <div className="player-details">
                                    <span className="badge bg-primary me-2">{selectedPlayer.position || 'Pozíció nincs megadva'}</span>
                                    <span className="badge bg-secondary me-2">{calculateAge(selectedPlayer.birth_date)} év</span>
                                    <span className="badge bg-info me-2">{selectedPlayer.team_name || 'Nincs csapat'}</span>
                                    <span className="badge bg-success">{selectedPlayer.dominant_foot || 'N/A'} lábas</span>
                                </div>
                            </div>
                            <div className="col-md-4 text-end">
                                <div className="season-info">
                                    <h6>{filters.season} szezon</h6>
                                    <small className="text-muted">Utolsó frissítés: {new Date().toLocaleDateString('hu-HU')}</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Statistics Tabs */}
                    <div className="statistics-tabs">
                        <ul className="nav nav-tabs mb-4" role="tablist">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('overview')}
                                    type="button"
                                    role="tab"
                                    aria-controls="overview"
                                    aria-selected={activeTab === 'overview'}
                                >
                                    Áttekintés
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'progression' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('progression')}
                                    type="button"
                                    role="tab"
                                    aria-controls="progression"
                                    aria-selected={activeTab === 'progression'}
                                >
                                    Szezonális fejlődés
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'position' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('position')}
                                    type="button"
                                    role="tab"
                                    aria-controls="position"
                                    aria-selected={activeTab === 'position'}
                                >
                                    Pozíció elemzés
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content">
                            {loading ? (
                                <div className="text-center py-5">
                                    <LoadingSpinner />
                                    <p className="text-muted mt-2">Statisztikák betöltése...</p>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'overview' && (
                                        <div className="tab-pane active" id="overview" role="tabpanel">
                                            <StatisticsOverview />
                                        </div>
                                    )}
                                    {activeTab === 'progression' && (
                                        <div className="tab-pane active" id="progression" role="tabpanel">
                                            <SeasonProgression />
                                        </div>
                                    )}
                                    {activeTab === 'position' && (
                                        <div className="tab-pane active" id="position" role="tabpanel">
                                            <PositionAnalysis />
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-5">
                    <div className="empty-state">
                        <h5 className="text-muted">Válassz egy játékost a statisztikák megtekintéséhez</h5>
                        <p className="text-muted">
                            {userRole === 'parent' 
                                ? 'Nincsenek elérhető gyermekek' 
                                : 'Válassz egy játékost a legördülő menüből'
                            }
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

PlayerStatistics.propTypes = {
    userRole: PropTypes.string.isRequired,
    playerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default PlayerStatistics;