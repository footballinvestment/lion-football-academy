import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './SeasonDashboard.css';

/**
 * SeasonDashboard Component
 * Comprehensive season overview and multi-season comparison dashboard
 */
const SeasonDashboard = ({ userRole }) => {
    const [dashboardData, setDashboardData] = useState(null);
    const [seasonsData, setSeasonsData] = useState([]);
    const [comparisonData, setComparisonData] = useState(null);
    const [kpiData, setKpiData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedSeasons, setSelectedSeasons] = useState(['2024-25', '2023-24']);
    const [filters, setFilters] = useState({
        current_season: '2024-25',
        age_group: '',
        metric_type: 'all'
    });

    const availableSeasons = ['2024-25', '2023-24', '2022-23', '2021-22', '2020-21'];

    // Fetch comprehensive dashboard data
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [
                currentSeasonResponse,
                allSeasonsResponse,
                kpiResponse
            ] = await Promise.all([
                apiService.api.get(`/analytics/season-overview/${filters.current_season}`),
                apiService.api.get('/analytics/all-seasons-summary'),
                apiService.api.get(`/analytics/kpi-dashboard/${filters.current_season}`)
            ]);

            setDashboardData(currentSeasonResponse.data);
            setSeasonsData(allSeasonsResponse.data);
            setKpiData(kpiResponse.data);

            // Fetch comparison data if multiple seasons selected
            if (selectedSeasons.length > 1) {
                const comparisonResponse = await apiService.api.get('/analytics/seasons-comparison', {
                    params: { seasons: selectedSeasons.join(',') }
                });
                setComparisonData(comparisonResponse.data);
            }
        } catch (err) {
            setError('Dashboard adatok betöltése sikertelen: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [filters.current_season, selectedSeasons]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // KPI Overview Component
    const KPIOverview = () => {
        if (!kpiData) return <div className="text-muted">Nincsenek KPI adatok</div>;

        const kpiItems = [
            { 
                key: 'total_players', 
                label: 'Összes játékos', 
                value: kpiData.total_players || 0, 
                icon: '👥',
                trend: kpiData.player_growth || 0,
                format: 'number'
            },
            { 
                key: 'total_matches', 
                label: 'Mérkőzések száma', 
                value: kpiData.total_matches || 0, 
                icon: '⚽',
                trend: kpiData.match_growth || 0,
                format: 'number'
            },
            { 
                key: 'win_rate', 
                label: 'Győzelmi arány', 
                value: kpiData.overall_win_rate || 0, 
                icon: '🏆',
                trend: kpiData.win_rate_change || 0,
                format: 'percentage'
            },
            { 
                key: 'attendance_rate', 
                label: 'Edzéslátogatottság', 
                value: kpiData.training_attendance_rate || 0, 
                icon: '📊',
                trend: kpiData.attendance_trend || 0,
                format: 'percentage'
            },
            { 
                key: 'injury_rate', 
                label: 'Sérülési arány', 
                value: kpiData.injury_rate || 0, 
                icon: '🏥',
                trend: kpiData.injury_trend || 0,
                format: 'percentage',
                inverse: true
            },
            { 
                key: 'development_score', 
                label: 'Fejlődési index', 
                value: kpiData.avg_development_score || 0, 
                icon: '📈',
                trend: kpiData.development_trend || 0,
                format: 'score'
            }
        ];

        return (
            <div className="kpi-overview">
                <div className="kpi-grid">
                    {kpiItems.map(kpi => (
                        <div key={kpi.key} className="kpi-card">
                            <div className="kpi-header">
                                <div className="kpi-icon">{kpi.icon}</div>
                                <div className="kpi-trend">
                                    {kpi.trend !== 0 && (
                                        <span className={`trend-indicator ${
                                            (kpi.inverse ? kpi.trend < 0 : kpi.trend > 0) ? 'positive' : 'negative'
                                        }`}>
                                            {kpi.trend > 0 ? '↗' : '↘'} {Math.abs(kpi.trend).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="kpi-value">
                                {kpi.format === 'percentage' ? `${kpi.value.toFixed(1)}%` :
                                 kpi.format === 'score' ? `${kpi.value.toFixed(1)}/10` :
                                 kpi.value}
                            </div>
                            <div className="kpi-label">{kpi.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Current Season Overview Component
    const CurrentSeasonOverview = () => {
        if (!dashboardData) return <div className="text-muted">Nincsenek szezon adatok</div>;

        return (
            <div className="season-overview">
                <div className="row">
                    <div className="col-lg-8">
                        <div className="overview-section">
                            <h6>Csapatok teljesítménye</h6>
                            <div className="teams-performance">
                                {dashboardData.teams_performance?.map(team => (
                                    <div key={team.team_id} className="team-performance-item">
                                        <div className="team-info">
                                            <div className="team-name">{team.team_name}</div>
                                            <div className="age-group">{team.age_group}</div>
                                        </div>
                                        <div className="team-stats">
                                            <div className="stat-item">
                                                <span className="stat-label">Mérkőzések</span>
                                                <span className="stat-value">{team.matches_played || 0}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Győzelmek</span>
                                                <span className="stat-value">{team.wins || 0}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Győzelmi %</span>
                                                <span className="stat-value">
                                                    {team.matches_played > 0 
                                                        ? ((team.wins / team.matches_played) * 100).toFixed(1)
                                                        : 0}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="team-progress">
                                            <div className="progress-bar">
                                                <div 
                                                    className="progress-fill" 
                                                    style={{
                                                        width: `${team.matches_played > 0 
                                                            ? (team.wins / team.matches_played) * 100 
                                                            : 0}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                )) || []}
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-4">
                        <div className="overview-section">
                            <h6>Havi aktivitás</h6>
                            <div className="monthly-activity">
                                {dashboardData.monthly_activity?.map((month, index) => (
                                    <div key={index} className="month-item">
                                        <div className="month-name">{month.month}</div>
                                        <div className="activities">
                                            <div className="activity-bar training">
                                                <div 
                                                    className="bar-fill" 
                                                    style={{width: `${Math.min(month.trainings * 5, 100)}%`}}
                                                    title={`${month.trainings} edzés`}
                                                ></div>
                                            </div>
                                            <div className="activity-bar matches">
                                                <div 
                                                    className="bar-fill" 
                                                    style={{width: `${Math.min(month.matches * 20, 100)}%`}}
                                                    title={`${month.matches} mérkőzés`}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="activity-count">
                                            {month.trainings}T / {month.matches}M
                                        </div>
                                    </div>
                                )) || []}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row mt-4">
                    <div className="col-lg-6">
                        <div className="overview-section">
                            <h6>Top teljesítmények</h6>
                            <div className="top-performances">
                                <div className="performance-category">
                                    <h7>Gólkirályok</h7>
                                    {dashboardData.top_scorers?.slice(0, 5).map((player, index) => (
                                        <div key={index} className="performance-item">
                                            <span className="rank">#{index + 1}</span>
                                            <span className="player-name">{player.player_name}</span>
                                            <span className="stat-value">{player.goals} gól</span>
                                        </div>
                                    )) || []}
                                </div>
                                <div className="performance-category">
                                    <h7>Legjobb gólpassz adók</h7>
                                    {dashboardData.top_assists?.slice(0, 5).map((player, index) => (
                                        <div key={index} className="performance-item">
                                            <span className="rank">#{index + 1}</span>
                                            <span className="player-name">{player.player_name}</span>
                                            <span className="stat-value">{player.assists} assist</span>
                                        </div>
                                    )) || []}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6">
                        <div className="overview-section">
                            <h6>Fejlesztési mutatók</h6>
                            <div className="development-metrics">
                                <div className="metric-item">
                                    <div className="metric-label">Aktív fejlesztési tervek</div>
                                    <div className="metric-value">{dashboardData.active_development_plans || 0}</div>
                                    <div className="metric-progress">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill development" 
                                                style={{width: '75%'}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Befejezett célok</div>
                                    <div className="metric-value">{dashboardData.completed_goals || 0}</div>
                                    <div className="metric-progress">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill completed" 
                                                style={{width: '85%'}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="metric-item">
                                    <div className="metric-label">Készségfelmérések</div>
                                    <div className="metric-value">{dashboardData.skill_assessments || 0}</div>
                                    <div className="metric-progress">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill assessments" 
                                                style={{width: '60%'}}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Season Comparison Component
    const SeasonComparison = () => {
        if (!comparisonData) return <div className="text-muted">Válassz több szezont az összehasonlításhoz</div>;

        const comparisonMetrics = [
            { key: 'total_players', label: 'Játékosok száma', format: 'number' },
            { key: 'total_matches', label: 'Mérkőzések', format: 'number' },
            { key: 'win_rate', label: 'Győzelmi arány', format: 'percentage' },
            { key: 'goals_scored', label: 'Lőtt gólok', format: 'number' },
            { key: 'goals_conceded', label: 'Kapott gólok', format: 'number' },
            { key: 'training_sessions', label: 'Edzések', format: 'number' },
            { key: 'injury_count', label: 'Sérülések', format: 'number' }
        ];

        return (
            <div className="season-comparison">
                <div className="comparison-header">
                    <h6>Szezonok összehasonlítása</h6>
                    <div className="seasons-selector">
                        {availableSeasons.map(season => (
                            <label key={season} className="season-checkbox">
                                <input
                                    type="checkbox"
                                    checked={selectedSeasons.includes(season)}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedSeasons(prev => [...prev, season]);
                                        } else {
                                            setSelectedSeasons(prev => prev.filter(s => s !== season));
                                        }
                                    }}
                                />
                                <span className="checkmark"></span>
                                {season}
                            </label>
                        ))}
                    </div>
                </div>

                <div className="comparison-table">
                    <table className="table table-hover">
                        <thead>
                            <tr>
                                <th>Mutató</th>
                                {selectedSeasons.map(season => (
                                    <th key={season}>{season}</th>
                                ))}
                                <th>Változás</th>
                            </tr>
                        </thead>
                        <tbody>
                            {comparisonMetrics.map(metric => (
                                <tr key={metric.key}>
                                    <td className="metric-name">{metric.label}</td>
                                    {selectedSeasons.map(season => {
                                        const value = comparisonData[season]?.[metric.key] || 0;
                                        return (
                                            <td key={season} className="metric-value">
                                                {metric.format === 'percentage' 
                                                    ? `${value.toFixed(1)}%` 
                                                    : value
                                                }
                                            </td>
                                        );
                                    })}
                                    <td className="metric-change">
                                        {selectedSeasons.length >= 2 && (
                                            (() => {
                                                const latest = comparisonData[selectedSeasons[0]]?.[metric.key] || 0;
                                                const previous = comparisonData[selectedSeasons[1]]?.[metric.key] || 0;
                                                const change = latest - previous;
                                                const percentage = previous > 0 ? ((change / previous) * 100).toFixed(1) : 0;
                                                
                                                return (
                                                    <span className={`change-indicator ${change >= 0 ? 'positive' : 'negative'}`}>
                                                        {change >= 0 ? '+' : ''}{change} ({percentage}%)
                                                    </span>
                                                );
                                            })()
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="comparison-charts mt-4">
                    <div className="row">
                        <div className="col-lg-6">
                            <div className="chart-container">
                                <h6>Játékosok számának alakulása</h6>
                                <div className="line-chart">
                                    {selectedSeasons.map((season, index) => {
                                        const value = comparisonData[season]?.total_players || 0;
                                        const maxValue = Math.max(...selectedSeasons.map(s => comparisonData[s]?.total_players || 0));
                                        const height = (value / maxValue) * 100;
                                        
                                        return (
                                            <div key={season} className="chart-bar">
                                                <div 
                                                    className="bar-fill players" 
                                                    style={{height: `${height}%`}}
                                                    title={`${season}: ${value} játékos`}
                                                ></div>
                                                <div className="bar-label">{season}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-6">
                            <div className="chart-container">
                                <h6>Győzelmi arány alakulása</h6>
                                <div className="line-chart">
                                    {selectedSeasons.map((season, index) => {
                                        const value = comparisonData[season]?.win_rate || 0;
                                        const height = value; // Already in percentage
                                        
                                        return (
                                            <div key={season} className="chart-bar">
                                                <div 
                                                    className="bar-fill winrate" 
                                                    style={{height: `${height}%`}}
                                                    title={`${season}: ${value.toFixed(1)}%`}
                                                ></div>
                                                <div className="bar-label">{season}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Age Group Progression Component
    const AgeGroupProgression = () => {
        if (!seasonsData) return <div className="text-muted">Nincsenek korosztály adatok</div>;

        const ageGroups = ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'];

        return (
            <div className="age-group-progression">
                <h6>Korosztályok fejlődése</h6>
                
                <div className="progression-matrix">
                    <div className="matrix-header">
                        <div className="age-group-cell">Korosztály</div>
                        {availableSeasons.slice(0, 4).map(season => (
                            <div key={season} className="season-cell">{season}</div>
                        ))}
                    </div>
                    
                    {ageGroups.map(ageGroup => (
                        <div key={ageGroup} className="matrix-row">
                            <div className="age-group-cell">{ageGroup}</div>
                            {availableSeasons.slice(0, 4).map(season => {
                                const seasonData = seasonsData.find(s => s.season === season);
                                const ageGroupData = seasonData?.age_groups?.find(ag => ag.age_group === ageGroup);
                                
                                return (
                                    <div key={season} className="progression-cell">
                                        {ageGroupData && (
                                            <div className="cell-content">
                                                <div className="player-count">{ageGroupData.player_count || 0}</div>
                                                <div className="win-rate">
                                                    {ageGroupData.win_rate ? `${ageGroupData.win_rate.toFixed(1)}%` : '0%'}
                                                </div>
                                                <div className="progression-indicator">
                                                    <div 
                                                        className="indicator-bar" 
                                                        style={{
                                                            width: `${ageGroupData.development_score || 0}%`,
                                                            backgroundColor: ageGroupData.development_score > 70 ? '#28a745' : 
                                                                           ageGroupData.development_score > 50 ? '#ffc107' : '#dc3545'
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="progression-legend">
                    <div className="legend-item">
                        <div className="legend-color players"></div>
                        <span>Játékosok száma</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color winrate"></div>
                        <span>Győzelmi arány</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color development"></div>
                        <span>Fejlődési mutató</span>
                    </div>
                </div>
            </div>
        );
    };

    // Export functionality
    const handleExport = (format) => {
        const exportData = {
            dashboard: dashboardData,
            kpi: kpiData,
            comparison: comparisonData,
            seasons: seasonsData,
            generated_at: new Date().toISOString(),
            selected_seasons: selectedSeasons,
            filters: filters
        };

        if (format === 'json') {
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], {type: 'application/json'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `season_dashboard_${filters.current_season}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if (format === 'csv') {
            // Export KPI data as CSV
            const csvData = [
                ['Mutató', 'Érték', 'Trend', 'Szezon'],
                ['Összes játékos', kpiData?.total_players || 0, kpiData?.player_growth || 0, filters.current_season],
                ['Mérkőzések száma', kpiData?.total_matches || 0, kpiData?.match_growth || 0, filters.current_season],
                ['Győzelmi arány', kpiData?.overall_win_rate || 0, kpiData?.win_rate_change || 0, filters.current_season],
                ['Edzéslátogatottság', kpiData?.training_attendance_rate || 0, kpiData?.attendance_trend || 0, filters.current_season],
                ['Sérülési arány', kpiData?.injury_rate || 0, kpiData?.injury_trend || 0, filters.current_season],
                ['Fejlődési index', kpiData?.avg_development_score || 0, kpiData?.development_trend || 0, filters.current_season]
            ];
            
            const csvContent = csvData.map(row => row.join(',')).join('\n');
            const dataBlob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `kpi_data_${filters.current_season}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="season-dashboard">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Szezon áttekintő</h3>
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
                        <li><button className="dropdown-item" onClick={() => handleExport('json')}>JSON adatok</button></li>
                        <li><button className="dropdown-item" onClick={() => handleExport('csv')}>CSV (KPI)</button></li>
                    </ul>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Dashboard Controls */}
            <div className="dashboard-controls mb-4">
                <div className="row g-3">
                    <div className="col-md-3">
                        <label className="form-label">Aktuális szezon</label>
                        <select
                            className="form-select"
                            value={filters.current_season}
                            onChange={(e) => setFilters(prev => ({...prev, current_season: e.target.value}))}
                        >
                            {availableSeasons.map(season => (
                                <option key={season} value={season}>{season}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Korosztály szűrő</label>
                        <select
                            className="form-select"
                            value={filters.age_group}
                            onChange={(e) => setFilters(prev => ({...prev, age_group: e.target.value}))}
                        >
                            <option value="">Minden korosztály</option>
                            <option value="U8">U8</option>
                            <option value="U10">U10</option>
                            <option value="U12">U12</option>
                            <option value="U14">U14</option>
                            <option value="U16">U16</option>
                            <option value="U18">U18</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Mutató típus</label>
                        <select
                            className="form-select"
                            value={filters.metric_type}
                            onChange={(e) => setFilters(prev => ({...prev, metric_type: e.target.value}))}
                        >
                            <option value="all">Minden mutató</option>
                            <option value="performance">Teljesítmény</option>
                            <option value="development">Fejlődés</option>
                            <option value="health">Egészség</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Időszak</label>
                        <select className="form-select">
                            <option value="full">Teljes szezon</option>
                            <option value="recent">Utolsó 3 hónap</option>
                            <option value="quarter">Negyed szezon</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="kpi-section mb-4">
                <KPIOverview />
            </div>

            {/* Dashboard Tabs */}
            <div className="dashboard-tabs">
                <ul className="nav nav-tabs mb-4" role="tablist">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('overview')}
                            type="button"
                            role="tab"
                        >
                            Szezon áttekintés
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'comparison' ? 'active' : ''}`}
                            onClick={() => setActiveTab('comparison')}
                            type="button"
                            role="tab"
                        >
                            Szezonok összehasonlítása
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'progression' ? 'active' : ''}`}
                            onClick={() => setActiveTab('progression')}
                            type="button"
                            role="tab"
                        >
                            Korosztályok fejlődése
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'reports' ? 'active' : ''}`}
                            onClick={() => setActiveTab('reports')}
                            type="button"
                            role="tab"
                        >
                            Jelentések
                        </button>
                    </li>
                </ul>

                <div className="tab-content">
                    {activeTab === 'overview' && (
                        <div className="tab-pane active">
                            <CurrentSeasonOverview />
                        </div>
                    )}
                    {activeTab === 'comparison' && (
                        <div className="tab-pane active">
                            <SeasonComparison />
                        </div>
                    )}
                    {activeTab === 'progression' && (
                        <div className="tab-pane active">
                            <AgeGroupProgression />
                        </div>
                    )}
                    {activeTab === 'reports' && (
                        <div className="tab-pane active">
                            <div className="reports-section">
                                <h6>Jelentések és elemzések</h6>
                                <div className="reports-grid">
                                    <div className="report-card">
                                        <h7>Havi teljesítményjelentés</h7>
                                        <p>Részletes összefoglaló az elmúlt hónap teljesítményéről</p>
                                        <button className="btn btn-primary btn-sm">Generálás</button>
                                    </div>
                                    <div className="report-card">
                                        <h7>Szezonzáró jelentés</h7>
                                        <p>Komplex analízis a teljes szezonról</p>
                                        <button className="btn btn-primary btn-sm">Generálás</button>
                                    </div>
                                    <div className="report-card">
                                        <h7>Fejlődési jelentés</h7>
                                        <p>Játékosok és csapatok fejlődésének elemzése</p>
                                        <button className="btn btn-primary btn-sm">Generálás</button>
                                    </div>
                                    <div className="report-card">
                                        <h7>Sérülés analízis</h7>
                                        <p>Sérülések tendenciái és megelőzési javaslatok</p>
                                        <button className="btn btn-primary btn-sm">Generálás</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

SeasonDashboard.propTypes = {
    userRole: PropTypes.string.isRequired
};

export default SeasonDashboard;