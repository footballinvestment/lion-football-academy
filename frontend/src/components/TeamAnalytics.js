import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './TeamAnalytics.css';

/**
 * TeamAnalytics Component
 * Comprehensive team performance analysis with charts and comparisons
 */
const TeamAnalytics = ({ userRole, teamId }) => {
    const [teams, setTeams] = useState([]);
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [teamStats, setTeamStats] = useState(null);
    const [matchResults, setMatchResults] = useState([]);
    const [playerContributions, setPlayerContributions] = useState([]);
    const [formationData, setFormationData] = useState(null);
    const [comparisonData, setComparisonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [filters, setFilters] = useState({
        season: '2024-25',
        match_type: '',
        period: 'all',
        comparison_team: ''
    });

    // Fetch teams based on role
    const fetchTeams = useCallback(async () => {
        try {
            let response;
            if (userRole === 'coach' && teamId) {
                response = await apiService.teams.getById(teamId);
                setTeams([response.data]);
                setSelectedTeam(response.data);
            } else {
                response = await apiService.teams.getAll();
                setTeams(response.data);
            }
        } catch (err) {
            setError('Csapatok betöltése sikertelen: ' + err.message);
        }
    }, [userRole, teamId]);

    // Fetch comprehensive team analytics
    const fetchTeamAnalytics = useCallback(async (team) => {
        if (!team) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const [
                statsResponse,
                matchesResponse,
                playersResponse,
                formationResponse
            ] = await Promise.all([
                apiService.matches.getTeamPerformance({ 
                    team_id: team.id, 
                    season: filters.season,
                    match_type: filters.match_type 
                }),
                apiService.matches.getMatchResults({ 
                    team_id: team.id, 
                    season: filters.season 
                }),
                apiService.matches.getPlayerSeasonPerformance({ 
                    team_id: team.id, 
                    season: filters.season 
                }),
                apiService.api.get(`/analytics/team-formation-analysis/${team.id}?season=${filters.season}`)
            ]);

            setTeamStats(statsResponse.data);
            setMatchResults(matchesResponse.data);
            setPlayerContributions(playersResponse.data);
            setFormationData(formationResponse.data);

            // Fetch comparison data if comparison team is selected
            if (filters.comparison_team) {
                const comparisonResponse = await apiService.matches.getTeamPerformance({ 
                    team_id: filters.comparison_team, 
                    season: filters.season 
                });
                setComparisonData(comparisonResponse.data);
            } else {
                setComparisonData(null);
            }
        } catch (err) {
            setError('Csapat analitika betöltése sikertelen: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    useEffect(() => {
        if (selectedTeam) {
            fetchTeamAnalytics(selectedTeam);
        }
    }, [selectedTeam, fetchTeamAnalytics]);

    // Performance Overview Component
    const PerformanceOverview = () => {
        if (!teamStats) return <div className="text-muted">Nincsenek elérhető statisztikák</div>;

        const winPercentage = teamStats.total_matches > 0 
            ? ((teamStats.wins / teamStats.total_matches) * 100).toFixed(1)
            : 0;

        return (
            <div className="performance-overview">
                <div className="row">
                    <div className="col-lg-8">
                        <div className="stats-grid">
                            <div className="stat-card wins">
                                <div className="stat-icon">🏆</div>
                                <div className="stat-value">{teamStats.wins || 0}</div>
                                <div className="stat-label">Győzelmek</div>
                                <div className="stat-percentage">{winPercentage}%</div>
                            </div>
                            <div className="stat-card draws">
                                <div className="stat-icon">🤝</div>
                                <div className="stat-value">{teamStats.draws || 0}</div>
                                <div className="stat-label">Döntetlenek</div>
                            </div>
                            <div className="stat-card losses">
                                <div className="stat-icon">😔</div>
                                <div className="stat-value">{teamStats.losses || 0}</div>
                                <div className="stat-label">Vereségek</div>
                            </div>
                            <div className="stat-card goals">
                                <div className="stat-icon">⚽</div>
                                <div className="stat-value">{teamStats.goals_scored || 0}</div>
                                <div className="stat-label">Lőtt gólok</div>
                            </div>
                            <div className="stat-card goals-against">
                                <div className="stat-icon">🥅</div>
                                <div className="stat-value">{teamStats.goals_conceded || 0}</div>
                                <div className="stat-label">Kapott gólok</div>
                            </div>
                            <div className="stat-card goal-difference">
                                <div className="stat-icon">📊</div>
                                <div className="stat-value">
                                    {(teamStats.goals_scored || 0) - (teamStats.goals_conceded || 0) > 0 ? '+' : ''}
                                    {(teamStats.goals_scored || 0) - (teamStats.goals_conceded || 0)}
                                </div>
                                <div className="stat-label">Gólkülönbség</div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="performance-chart">
                            <h6>Forma (utolsó 10 mérkőzés)</h6>
                            <div className="form-display">
                                {matchResults.slice(-10).map((match, index) => {
                                    const result = match.team_id === selectedTeam.id 
                                        ? (match.home_score > match.away_score ? 'W' : 
                                           match.home_score < match.away_score ? 'L' : 'D')
                                        : (match.away_score > match.home_score ? 'W' : 
                                           match.away_score < match.home_score ? 'L' : 'D');
                                    
                                    return (
                                        <span 
                                            key={index} 
                                            className={`form-result ${result.toLowerCase()}`}
                                            title={`${match.home_team} ${match.home_score}-${match.away_score} ${match.away_team}`}
                                        >
                                            {result}
                                        </span>
                                    );
                                })}
                            </div>
                            
                            <div className="performance-metrics mt-4">
                                <div className="metric-item">
                                    <span className="metric-label">Átlag gólok/mérkőzés</span>
                                    <span className="metric-value">
                                        {teamStats.total_matches > 0 
                                            ? (teamStats.goals_scored / teamStats.total_matches).toFixed(1)
                                            : '0.0'
                                        }
                                    </span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Tiszta lapok</span>
                                    <span className="metric-value">{teamStats.clean_sheets || 0}</span>
                                </div>
                                <div className="metric-item">
                                    <span className="metric-label">Pontok</span>
                                    <span className="metric-value">
                                        {(teamStats.wins || 0) * 3 + (teamStats.draws || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Goals Trend Chart */}
                <div className="goals-trend mt-4">
                    <h6>Gólok trendje</h6>
                    <div className="trend-chart">
                        <div className="chart-container">
                            <div className="trend-bars">
                                {matchResults.slice(-8).map((match, index) => {
                                    const goalsScored = match.team_id === selectedTeam.id ? match.home_score : match.away_score;
                                    const goalsConceded = match.team_id === selectedTeam.id ? match.away_score : match.home_score;
                                    
                                    return (
                                        <div key={index} className="trend-bar-group">
                                            <div className="trend-date">{new Date(match.match_date).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}</div>
                                            <div className="trend-bars-container">
                                                <div 
                                                    className="trend-bar scored" 
                                                    style={{height: `${Math.max(goalsScored * 25, 5)}px`}}
                                                    title={`${goalsScored} lőtt gól`}
                                                ></div>
                                                <div 
                                                    className="trend-bar conceded" 
                                                    style={{height: `${Math.max(goalsConceded * 25, 5)}px`}}
                                                    title={`${goalsConceded} kapott gól`}
                                                ></div>
                                            </div>
                                            <div className="trend-values">
                                                <small>{goalsScored}-{goalsConceded}</small>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="chart-legend">
                                <span className="legend-item">
                                    <span className="legend-color scored"></span> Lőtt gólok
                                </span>
                                <span className="legend-item">
                                    <span className="legend-color conceded"></span> Kapott gólok
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Player Contributions Component
    const PlayerContributions = () => {
        if (!playerContributions.length) return <div className="text-muted">Nincsenek játékos adatok</div>;

        const topScorers = [...playerContributions]
            .sort((a, b) => (b.total_goals || 0) - (a.total_goals || 0))
            .slice(0, 10);

        const topAssists = [...playerContributions]
            .sort((a, b) => (b.total_assists || 0) - (a.total_assists || 0))
            .slice(0, 10);

        return (
            <div className="player-contributions">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="contribution-section">
                            <h6>Gólkirályok</h6>
                            <div className="contribution-list">
                                {topScorers.map((player, index) => (
                                    <div key={player.player_id} className="contribution-item">
                                        <div className="player-rank">#{index + 1}</div>
                                        <div className="player-info">
                                            <div className="player-name">{player.player_name}</div>
                                            <div className="player-position">{player.position || 'N/A'}</div>
                                        </div>
                                        <div className="contribution-stats">
                                            <div className="stat-value">{player.total_goals || 0}</div>
                                            <div className="stat-label">gól</div>
                                        </div>
                                        <div className="contribution-bar">
                                            <div 
                                                className="bar-fill goals" 
                                                style={{
                                                    width: `${Math.min((player.total_goals || 0) / (topScorers[0]?.total_goals || 1) * 100, 100)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="contribution-section">
                            <h6>Gólpassz rekorderek</h6>
                            <div className="contribution-list">
                                {topAssists.map((player, index) => (
                                    <div key={player.player_id} className="contribution-item">
                                        <div className="player-rank">#{index + 1}</div>
                                        <div className="player-info">
                                            <div className="player-name">{player.player_name}</div>
                                            <div className="player-position">{player.position || 'N/A'}</div>
                                        </div>
                                        <div className="contribution-stats">
                                            <div className="stat-value">{player.total_assists || 0}</div>
                                            <div className="stat-label">assist</div>
                                        </div>
                                        <div className="contribution-bar">
                                            <div 
                                                className="bar-fill assists" 
                                                style={{
                                                    width: `${Math.min((player.total_assists || 0) / (topAssists[0]?.total_assists || 1) * 100, 100)}%`
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Playing Time Analysis */}
                <div className="playing-time-analysis mt-4">
                    <h6>Játékidő elemzés</h6>
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead>
                                <tr>
                                    <th>Játékos</th>
                                    <th>Pozíció</th>
                                    <th>Mérkőzések</th>
                                    <th>Játékperc</th>
                                    <th>Átlag/meccs</th>
                                    <th>G+A</th>
                                    <th>Értékelés</th>
                                </tr>
                            </thead>
                            <tbody>
                                {playerContributions
                                    .sort((a, b) => (b.minutes_played || 0) - (a.minutes_played || 0))
                                    .slice(0, 15)
                                    .map(player => (
                                        <tr key={player.player_id}>
                                            <td>
                                                <strong>{player.player_name}</strong>
                                            </td>
                                            <td>{player.position || 'N/A'}</td>
                                            <td>{player.matches_played || 0}</td>
                                            <td>{player.minutes_played || 0}'</td>
                                            <td>
                                                {player.matches_played > 0 
                                                    ? Math.round((player.minutes_played || 0) / player.matches_played) + "'"
                                                    : "0'"
                                                }
                                            </td>
                                            <td>{(player.total_goals || 0) + (player.total_assists || 0)}</td>
                                            <td>
                                                {player.average_rating ? (
                                                    <span className={`badge ${
                                                        player.average_rating >= 7.5 ? 'bg-success' :
                                                        player.average_rating >= 6.5 ? 'bg-warning' : 'bg-secondary'
                                                    }`}>
                                                        {player.average_rating.toFixed(1)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    // Formation Analysis Component
    const FormationAnalysis = () => {
        if (!formationData) return <div className="text-muted">Nincsenek felállási adatok</div>;

        return (
            <div className="formation-analysis">
                <div className="row">
                    <div className="col-lg-6">
                        <div className="formation-stats">
                            <h6>Leggyakoribb felállások</h6>
                            <div className="formation-list">
                                {formationData.most_used_formations?.map((formation, index) => (
                                    <div key={index} className="formation-item">
                                        <div className="formation-name">{formation.formation}</div>
                                        <div className="formation-usage">
                                            <div className="usage-bar">
                                                <div 
                                                    className="usage-fill" 
                                                    style={{width: `${formation.usage_percentage}%`}}
                                                ></div>
                                            </div>
                                            <span className="usage-text">{formation.usage_percentage}%</span>
                                        </div>
                                        <div className="formation-record">
                                            {formation.wins}G-{formation.draws}D-{formation.losses}V
                                        </div>
                                    </div>
                                )) || []}
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="tactical-insights">
                            <h6>Taktikai betekintés</h6>
                            <div className="insight-items">
                                <div className="insight-item">
                                    <div className="insight-label">Legsikeresebb felállás</div>
                                    <div className="insight-value">
                                        {formationData.best_formation?.formation || 'N/A'}
                                        <small className="text-muted ms-2">
                                            ({formationData.best_formation?.win_rate}% győzelmi arány)
                                        </small>
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-label">Átlagos gólszám felállás szerint</div>
                                    <div className="insight-value">
                                        {formationData.goals_by_formation?.map(item => (
                                            <div key={item.formation} className="formation-goals">
                                                <span>{item.formation}:</span>
                                                <span className="goals-avg">{item.avg_goals.toFixed(1)} gól/meccs</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-label">Védekezési hatékonyság</div>
                                    <div className="insight-value">
                                        {formationData.defensive_record ? (
                                            <div className="defensive-stats">
                                                <div>Tiszta lapok: {formationData.defensive_record.clean_sheets}</div>
                                                <div>Átlag kapott gól: {formationData.defensive_record.avg_conceded.toFixed(1)}</div>
                                            </div>
                                        ) : 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Formation Visualization */}
                <div className="formation-visualization mt-4">
                    <h6>Aktuális felállás</h6>
                    <div className="pitch-container">
                        <div className="pitch">
                            <div className="pitch-half">
                                <div className="position-group defense">
                                    <div className="position-line">
                                        {formationData.current_lineup?.defense?.map((player, index) => (
                                            <div key={index} className="player-position">
                                                <div className="player-dot"></div>
                                                <div className="player-name">{player.name}</div>
                                            </div>
                                        )) || []}
                                    </div>
                                </div>
                                <div className="position-group midfield">
                                    <div className="position-line">
                                        {formationData.current_lineup?.midfield?.map((player, index) => (
                                            <div key={index} className="player-position">
                                                <div className="player-dot"></div>
                                                <div className="player-name">{player.name}</div>
                                            </div>
                                        )) || []}
                                    </div>
                                </div>
                                <div className="position-group attack">
                                    <div className="position-line">
                                        {formationData.current_lineup?.attack?.map((player, index) => (
                                            <div key={index} className="player-position">
                                                <div className="player-dot"></div>
                                                <div className="player-name">{player.name}</div>
                                            </div>
                                        )) || []}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Team Comparison Component
    const TeamComparison = () => {
        if (!comparisonData) {
            return (
                <div className="text-center py-4">
                    <p className="text-muted">Válassz egy csapatot az összehasonlításhoz</p>
                </div>
            );
        }

        const compareMetrics = [
            { key: 'wins', label: 'Győzelmek' },
            { key: 'goals_scored', label: 'Lőtt gólok' },
            { key: 'goals_conceded', label: 'Kapott gólok' },
            { key: 'clean_sheets', label: 'Tiszta lapok' },
            { key: 'total_matches', label: 'Mérkőzések' }
        ];

        return (
            <div className="team-comparison">
                <div className="comparison-header">
                    <h6>Csapat összehasonlítás</h6>
                    <div className="team-badges">
                        <span className="team-badge primary">{selectedTeam.name}</span>
                        <span className="vs">VS</span>
                        <span className="team-badge secondary">
                            {teams.find(t => t.id == filters.comparison_team)?.name || 'Ismeretlen'}
                        </span>
                    </div>
                </div>

                <div className="comparison-metrics">
                    {compareMetrics.map(metric => {
                        const teamValue = teamStats[metric.key] || 0;
                        const comparisonValue = comparisonData[metric.key] || 0;
                        const max = Math.max(teamValue, comparisonValue, 1);

                        return (
                            <div key={metric.key} className="comparison-row">
                                <div className="metric-label">{metric.label}</div>
                                <div className="comparison-bars">
                                    <div className="team-comparison-item">
                                        <div className="team-value">{teamValue}</div>
                                        <div className="comparison-bar primary">
                                            <div 
                                                className="bar-fill" 
                                                style={{width: `${(teamValue / max) * 100}%`}}
                                            ></div>
                                        </div>
                                    </div>
                                    <div className="team-comparison-item">
                                        <div className="comparison-bar secondary">
                                            <div 
                                                className="bar-fill" 
                                                style={{width: `${(comparisonValue / max) * 100}%`}}
                                            ></div>
                                        </div>
                                        <div className="team-value">{comparisonValue}</div>
                                    </div>
                                </div>
                                <div className="comparison-winner">
                                    {teamValue > comparisonValue ? '👈' : 
                                     teamValue < comparisonValue ? '👉' : '🤝'}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="head-to-head mt-4">
                    <h6>Egymás elleni eredmények</h6>
                    <div className="h2h-matches">
                        {matchResults
                            .filter(match => 
                                (match.home_team_id == filters.comparison_team && match.away_team_id == selectedTeam.id) ||
                                (match.away_team_id == filters.comparison_team && match.home_team_id == selectedTeam.id)
                            )
                            .slice(0, 5)
                            .map((match, index) => (
                                <div key={index} className="h2h-match">
                                    <div className="match-date">
                                        {new Date(match.match_date).toLocaleDateString('hu-HU')}
                                    </div>
                                    <div className="match-teams">
                                        <span className={match.home_team_id == selectedTeam.id ? 'team-name primary' : 'team-name'}>
                                            {match.home_team}
                                        </span>
                                        <span className="score">{match.home_score} - {match.away_score}</span>
                                        <span className={match.away_team_id == selectedTeam.id ? 'team-name primary' : 'team-name'}>
                                            {match.away_team}
                                        </span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        );
    };

    // Export functionality
    const handleExport = (format) => {
        if (!selectedTeam || !teamStats) return;

        const exportData = {
            team: {
                name: selectedTeam.name,
                age_group: selectedTeam.age_group
            },
            statistics: teamStats,
            matches: matchResults,
            players: playerContributions,
            season: filters.season,
            exportDate: new Date().toISOString()
        };

        if (format === 'json') {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${selectedTeam.name.replace(/\s+/g, '_')}_analytics_${filters.season}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            // CSV export for player statistics
            const csvData = playerContributions.map(player => ({
                'Játékos': player.player_name,
                'Pozíció': player.position || 'N/A',
                'Mérkőzések': player.matches_played || 0,
                'Gólok': player.total_goals || 0,
                'Gólpasszok': player.total_assists || 0,
                'Játékperc': player.minutes_played || 0,
                'Értékelés': player.average_rating ? player.average_rating.toFixed(1) : 'N/A'
            }));
            
            const csvContent = [
                Object.keys(csvData[0]).join(','),
                ...csvData.map(row => Object.values(row).join(','))
            ].join('\n');
            
            const dataBlob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${selectedTeam.name.replace(/\s+/g, '_')}_players_${filters.season}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    if (loading && !selectedTeam) return <LoadingSpinner />;

    return (
        <div className="team-analytics">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Csapat analitika</h3>
                {selectedTeam && (
                    <div className="btn-group">
                        <button 
                            className="btn btn-outline-secondary btn-sm dropdown-toggle"
                            type="button"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                        >
                            📊 Exportálás
                        </button>
                        <ul className="dropdown-menu">
                            <li><button className="dropdown-item" onClick={() => handleExport('json')}>JSON formátum</button></li>
                            <li><button className="dropdown-item" onClick={() => handleExport('csv')}>CSV (játékosok)</button></li>
                        </ul>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Team Selection and Filters */}
            <div className="controls-section mb-4">
                <div className="row g-3">
                    {userRole !== 'coach' && (
                        <div className="col-lg-3">
                            <label className="form-label">Csapat</label>
                            <select
                                className="form-select"
                                value={selectedTeam?.id || ''}
                                onChange={(e) => {
                                    const team = teams.find(t => t.id === parseInt(e.target.value));
                                    setSelectedTeam(team);
                                }}
                                aria-label="Csapat kiválasztása"
                            >
                                <option value="">Válassz csapatot...</option>
                                {teams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} ({team.age_group})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="col-lg-2">
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
                    <div className="col-lg-2">
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
                    <div className="col-lg-2">
                        <label className="form-label">Időszak</label>
                        <select
                            className="form-select"
                            value={filters.period}
                            onChange={(e) => setFilters(prev => ({...prev, period: e.target.value}))}
                        >
                            <option value="all">Teljes szezon</option>
                            <option value="last30">Utolsó 30 nap</option>
                            <option value="last10">Utolsó 10 meccs</option>
                        </select>
                    </div>
                    <div className="col-lg-3">
                        <label className="form-label">Összehasonlítás</label>
                        <select
                            className="form-select"
                            value={filters.comparison_team}
                            onChange={(e) => setFilters(prev => ({...prev, comparison_team: e.target.value}))}
                        >
                            <option value="">Válassz csapatot...</option>
                            {teams
                                .filter(t => t.id !== selectedTeam?.id)
                                .map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name} ({team.age_group})
                                    </option>
                                ))}
                        </select>
                    </div>
                </div>
            </div>

            {selectedTeam ? (
                <>
                    {/* Team Info Header */}
                    <div className="team-header mb-4">
                        <div className="row">
                            <div className="col-md-8">
                                <h4>{selectedTeam.name}</h4>
                                <div className="team-details">
                                    <span className="badge bg-primary me-2">{selectedTeam.age_group}</span>
                                    <span className="badge bg-secondary me-2">{filters.season} szezon</span>
                                    {teamStats && (
                                        <span className="badge bg-success">
                                            {teamStats.total_matches || 0} mérkőzés
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="col-md-4 text-end">
                                <div className="team-record">
                                    {teamStats && (
                                        <>
                                            <div className="record-line">
                                                <strong>
                                                    {teamStats.wins || 0}G - {teamStats.draws || 0}D - {teamStats.losses || 0}V
                                                </strong>
                                            </div>
                                            <div className="points-line">
                                                <small>
                                                    {(teamStats.wins || 0) * 3 + (teamStats.draws || 0)} pont
                                                </small>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Tabs */}
                    <div className="analytics-tabs">
                        <ul className="nav nav-tabs mb-4" role="tablist">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('overview')}
                                    type="button"
                                    role="tab"
                                >
                                    Áttekintés
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'players' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('players')}
                                    type="button"
                                    role="tab"
                                >
                                    Játékos teljesítmény
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'formation' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('formation')}
                                    type="button"
                                    role="tab"
                                >
                                    Felállás & Taktika
                                </button>
                            </li>
                            {filters.comparison_team && (
                                <li className="nav-item">
                                    <button
                                        className={`nav-link ${activeTab === 'comparison' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('comparison')}
                                        type="button"
                                        role="tab"
                                    >
                                        Összehasonlítás
                                    </button>
                                </li>
                            )}
                        </ul>

                        <div className="tab-content">
                            {loading ? (
                                <div className="text-center py-5">
                                    <LoadingSpinner />
                                    <p className="text-muted mt-2">Analitika betöltése...</p>
                                </div>
                            ) : (
                                <>
                                    {activeTab === 'overview' && (
                                        <div className="tab-pane active">
                                            <PerformanceOverview />
                                        </div>
                                    )}
                                    {activeTab === 'players' && (
                                        <div className="tab-pane active">
                                            <PlayerContributions />
                                        </div>
                                    )}
                                    {activeTab === 'formation' && (
                                        <div className="tab-pane active">
                                            <FormationAnalysis />
                                        </div>
                                    )}
                                    {activeTab === 'comparison' && filters.comparison_team && (
                                        <div className="tab-pane active">
                                            <TeamComparison />
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
                        <h5 className="text-muted">Válassz egy csapatot az analitika megtekintéséhez</h5>
                        <p className="text-muted">
                            {userRole === 'coach' 
                                ? 'Nincs hozzárendelt csapat' 
                                : 'Válassz egy csapatot a legördülő menüből'
                            }
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

TeamAnalytics.propTypes = {
    userRole: PropTypes.string.isRequired,
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default TeamAnalytics;