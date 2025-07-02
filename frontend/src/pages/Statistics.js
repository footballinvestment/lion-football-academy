import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const Statistics = () => {
    const [stats, setStats] = useState({
        playerStats: [],
        teamStats: [],
        topPerformers: [],
        monthlyAttendance: [],
        dashboardStats: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        fetchStatistics();
    }, [selectedYear]);

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            
            const [
                playerAttendanceRes,
                teamPerformanceRes,
                topPerformersRes,
                monthlyAttendanceRes,
                dashboardRes
            ] = await Promise.all([
                apiService.statistics.getPlayerAttendance(),
                apiService.statistics.getTeamPerformance(),
                apiService.statistics.getTopPerformers({ limit: 10 }),
                apiService.statistics.getMonthlyAttendance({ year: selectedYear }),
                apiService.statistics.getDashboard()
            ]);
            
            setStats({
                playerStats: playerAttendanceRes.data,
                teamStats: teamPerformanceRes.data,
                topPerformers: topPerformersRes.data,
                monthlyAttendance: monthlyAttendanceRes.data,
                dashboardStats: dashboardRes.data
            });
        } catch (error) {
            console.error('Statisztikák betöltési hiba:', error);
            setError('Hiba történt a statisztikák betöltése során');
        } finally {
            setLoading(false);
        }
    };

    const getAttendanceBadgeClass = (percentage) => {
        if (percentage >= 90) return 'bg-success';
        if (percentage >= 75) return 'bg-warning';
        return 'bg-danger';
    };

    const getPerformanceBadgeClass = (rating) => {
        if (rating >= 4.5) return 'bg-success';
        if (rating >= 3.5) return 'bg-warning';
        return 'bg-secondary';
    };

    const monthNames = [
        'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
        'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
    ];

    if (loading) {
        return (
            <div className="d-flex justify-content-center">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Betöltés...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
                <button 
                    className="btn btn-outline-danger ms-3" 
                    onClick={fetchStatistics}
                >
                    Újrapróbálás
                </button>
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>📊 Statisztikák</h1>
                <div>
                    <select
                        className="form-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {[2023, 2024, 2025, 2026].map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Dashboard áttekintő */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card bg-primary text-white">
                        <div className="card-body text-center">
                            <h3>{stats.dashboardStats.total_players || 0}</h3>
                            <p>Összes Játékos</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-success text-white">
                        <div className="card-body text-center">
                            <h3>{stats.dashboardStats.total_teams || 0}</h3>
                            <p>Összes Csapat</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-info text-white">
                        <div className="card-body text-center">
                            <h3>{stats.dashboardStats.total_trainings || 0}</h3>
                            <p>Összes Edzés</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card bg-warning text-white">
                        <div className="card-body text-center">
                            <h3>{stats.dashboardStats.recent_attendance_percentage || 0}%</h3>
                            <p>Jelenlét (30 nap)</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Legjobb teljesítménnyel rendelkező játékosok */}
                <div className="col-md-6 mb-4">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">🏆 Legjobb Teljesítmény - Top 10</h5>
                        </div>
                        <div className="card-body">
                            {stats.topPerformers.length === 0 ? (
                                <p className="text-muted">Nincsenek teljesítmény adatok</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Játékos</th>
                                                <th>Átlag</th>
                                                <th>Jelenlét</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.topPerformers.map((player, index) => (
                                                <tr key={player.id}>
                                                    <td>
                                                        <span className="badge bg-secondary">{index + 1}</span>
                                                    </td>
                                                    <td>
                                                        <strong>{player.name}</strong>
                                                        <br/>
                                                        <small className="text-muted">{player.team_name}</small>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getPerformanceBadgeClass(player.avg_performance)}`}>
                                                            {parseFloat(player.avg_performance).toFixed(1)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getAttendanceBadgeClass(player.attendance_percentage)}`}>
                                                            {player.attendance_percentage}%
                                                        </span>
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

                {/* Jelenlét toplista */}
                <div className="col-md-6 mb-4">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">📈 Legjobb Jelenlét - Top 10</h5>
                        </div>
                        <div className="card-body">
                            {stats.playerStats.length === 0 ? (
                                <p className="text-muted">Nincsenek jelenlét adatok</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Játékos</th>
                                                <th>Jelenlét %</th>
                                                <th>Edzések</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.playerStats.slice(0, 10).map((player, index) => (
                                                <tr key={player.id}>
                                                    <td>
                                                        <span className="badge bg-secondary">{index + 1}</span>
                                                    </td>
                                                    <td>
                                                        <strong>{player.name}</strong>
                                                        <br/>
                                                        <small className="text-muted">{player.team_name}</small>
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getAttendanceBadgeClass(player.attendance_percentage)}`}>
                                                            {player.attendance_percentage}%
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {player.attended_trainings}/{player.total_trainings}
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

            {/* Csapat statisztikák */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">🏆 Csapat Statisztikák</h5>
                        </div>
                        <div className="card-body">
                            {stats.teamStats.length === 0 ? (
                                <p className="text-muted">Nincsenek csapat adatok</p>
                            ) : (
                                <div className="row">
                                    {stats.teamStats.map(team => (
                                        <div key={team.id} className="col-md-4 mb-3">
                                            <div className="card h-100">
                                                <div className="card-body">
                                                    <h6 className="card-title">{team.name}</h6>
                                                    <p className="card-text">
                                                        <strong>Korosztály:</strong> {team.age_group}<br/>
                                                        <strong>Aktív játékosok:</strong> {team.active_players}<br/>
                                                        <strong>Edzések száma:</strong> {team.total_trainings}
                                                    </p>
                                                    <div className="text-center">
                                                        <span className={`badge ${getAttendanceBadgeClass(team.avg_attendance)} fs-6`}>
                                                            {team.avg_attendance}% átlag jelenlét
                                                        </span>
                                                        {team.avg_performance_rating && (
                                                            <div className="mt-2">
                                                                <span className={`badge ${getPerformanceBadgeClass(team.avg_performance_rating)}`}>
                                                                    ⭐ {parseFloat(team.avg_performance_rating).toFixed(1)} átlag teljesítmény
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Havi jelenlét */}
            {stats.monthlyAttendance.length > 0 && (
                <div className="row">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="mb-0">📅 Havi Jelenlét Alakulása ({selectedYear})</h5>
                            </div>
                            <div className="card-body">
                                <div className="table-responsive">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Hónap</th>
                                                <th>Edzések száma</th>
                                                <th>Játékosok</th>
                                                <th>Jelenlét rekordok</th>
                                                <th>Jelenlét %</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.monthlyAttendance.map(month => (
                                                <tr key={`${month.year}-${month.month}`}>
                                                    <td>
                                                        <strong>{monthNames[parseInt(month.month) - 1]}</strong>
                                                    </td>
                                                    <td>{month.total_trainings}</td>
                                                    <td>{month.unique_players}</td>
                                                    <td>{month.total_present}/{month.total_records}</td>
                                                    <td>
                                                        <span className={`badge ${getAttendanceBadgeClass(month.attendance_percentage)}`}>
                                                            {month.attendance_percentage}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Statistics;