import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({
        totalPlayers: 0,
        totalTeams: 0,
        upcomingTrainings: [],
        recentAnnouncements: []
    });
    const [parentData, setParentData] = useState({
        children: [],
        statistics: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            
            if (user?.role === 'parent') {
                // Parent-specific dashboard data
                const [childrenRes, statisticsRes, trainingsRes, announcementsRes] = await Promise.all([
                    apiService.parents.getChildren(user.id),
                    apiService.parents.getStatistics(user.id),
                    apiService.trainings.getUpcoming({ limit: 5 }),
                    apiService.announcements.getAll({ limit: 5 })
                ]);
                
                setParentData({
                    children: childrenRes.data.children || [],
                    statistics: statisticsRes.data.statistics || null
                });
                
                setStats({
                    totalPlayers: childrenRes.data.childCount || 0,
                    totalTeams: statisticsRes.data.statistics?.teamsInvolved || 0,
                    upcomingTrainings: trainingsRes.data || [],
                    recentAnnouncements: announcementsRes.data || []
                });
            } else {
                // General dashboard data for admin/coach
                const [playersRes, teamsRes, trainingsRes, announcementsRes] = await Promise.all([
                    apiService.players.getAll(),
                    apiService.teams.getAll(),
                    apiService.trainings.getUpcoming({ limit: 5 }),
                    apiService.announcements.getAll({ limit: 5 })
                ]);
                
                setStats({
                    totalPlayers: playersRes.data.length,
                    totalTeams: teamsRes.data.length,
                    upcomingTrainings: trainingsRes.data || [],
                    recentAnnouncements: announcementsRes.data || []
                });
            }
        } catch (error) {
            console.error('Hiba a dashboard adatok betöltésénél:', error);
            setError('Hiba történt az adatok betöltése során');
        } finally {
            setLoading(false);
        }
    };

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
            </div>
        );
    }

    return (
        <div>
            <h1 className="mb-4">
                📊 Dashboard
                {user?.role === 'parent' && (
                    <span className="badge bg-info ms-2">Szülői Nézet</span>
                )}
            </h1>
            
            {/* Statisztika kártyák */}
            <div className="row mb-4">
                <div className="col-md-3 mb-3">
                    <div className="card bg-info text-white h-100">
                        <div className="card-body text-center">
                            <h2 className="card-title">{stats.totalPlayers}</h2>
                            <p className="card-text">
                                {user?.role === 'parent' ? 'Gyermekeim' : 'Összes Játékos'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-3 mb-3">
                    <div className="card bg-success text-white h-100">
                        <div className="card-body text-center">
                            <h2 className="card-title">{stats.totalTeams}</h2>
                            <p className="card-text">
                                {user?.role === 'parent' ? 'Érintett Csapatok' : 'Összes Csapat'}
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-3 mb-3">
                    <div className="card bg-warning text-white h-100">
                        <div className="card-body text-center">
                            <h2 className="card-title">{stats.upcomingTrainings.length}</h2>
                            <p className="card-text">Közelgő Edzések</p>
                        </div>
                    </div>
                </div>
                
                <div className="col-md-3 mb-3">
                    <div className="card bg-primary text-white h-100">
                        <div className="card-body text-center">
                            <h2 className="card-title">{stats.recentAnnouncements.length}</h2>
                            <p className="card-text">Új Hírek</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Parent-specific MyChildren section */}
            {user?.role === 'parent' && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">👪 Gyermekeim</h5>
                            </div>
                            <div className="card-body">
                                {parentData.children.length === 0 ? (
                                    <div className="alert alert-warning">
                                        <strong>Nincs hozzárendelt gyermek!</strong><br />
                                        Kérjük, vegye fel a kapcsolatot az adminisztrátorral a gyermeke hozzárendeléséhez.
                                    </div>
                                ) : (
                                    <div className="row">
                                        {parentData.children.map(child => (
                                            <div key={child.id} className="col-md-6 col-lg-4 mb-3">
                                                <div className="card h-100">
                                                    <div className="card-body">
                                                        <h6 className="card-title">
                                                            ⚽ {child.name}
                                                        </h6>
                                                        <div className="card-text">
                                                            <p className="mb-1">
                                                                <strong>Csapat:</strong> {child.team_name || 'Nincs csapat'}
                                                            </p>
                                                            <p className="mb-1">
                                                                <strong>Pozíció:</strong> {child.position || 'Nincs megadva'}
                                                            </p>
                                                            <p className="mb-1">
                                                                <strong>Életkor:</strong> {
                                                                    child.birth_date ? 
                                                                    new Date().getFullYear() - new Date(child.birth_date).getFullYear() + ' év' : 
                                                                    'Nincs megadva'
                                                                }
                                                            </p>
                                                            {child.dominant_foot && (
                                                                <p className="mb-1">
                                                                    <strong>Erősebb láb:</strong> {child.dominant_foot}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="card-footer bg-transparent">
                                                        <small className="text-muted">
                                                            Részletes adatok hamarosan...
                                                        </small>
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
            )}

            <div className="row">
                {/* Közelgő edzések */}
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="card-title mb-0">🏃 Közelgő Edzések</h5>
                        </div>
                        <div className="card-body">
                            {stats.upcomingTrainings.length === 0 ? (
                                <p className="text-muted">Nincsenek közelgő edzések</p>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {stats.upcomingTrainings.map(training => (
                                        <div key={training.id} className="list-group-item border-0 px-0">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 className="mb-1">{training.type}</h6>
                                                    <p className="mb-1 text-muted small">
                                                        {training.team_name || 'Nincs csapat megadva'}
                                                    </p>
                                                    <small className="text-muted">
                                                        📍 {training.location || 'Nincs helyszín'}
                                                    </small>
                                                </div>
                                                <small className="text-muted">
                                                    {new Date(training.date).toLocaleDateString('hu-HU')} {training.time}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Legújabb hírek */}
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="card-title mb-0">📢 Legújabb Hírek</h5>
                        </div>
                        <div className="card-body">
                            {stats.recentAnnouncements.length === 0 ? (
                                <p className="text-muted">Nincsenek új hírek</p>
                            ) : (
                                <div className="list-group list-group-flush">
                                    {stats.recentAnnouncements.map(announcement => (
                                        <div key={announcement.id} className="list-group-item border-0 px-0">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div className="flex-grow-1">
                                                    <h6 className="mb-1">
                                                        {announcement.urgent ? '🚨 ' : ''}
                                                        {announcement.title}
                                                    </h6>
                                                    <p className="mb-1 text-muted small">
                                                        {announcement.content.length > 100 
                                                            ? announcement.content.substring(0, 100) + '...' 
                                                            : announcement.content}
                                                    </p>
                                                    <small className="text-muted">
                                                        🏷️ {announcement.category} • {announcement.team_name || 'Általános'}
                                                    </small>
                                                </div>
                                                <small className="text-muted ms-2">
                                                    {new Date(announcement.created_at).toLocaleDateString('hu-HU')}
                                                </small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;