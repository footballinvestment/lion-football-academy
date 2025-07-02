import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    // userType is equivalent to user?.role for clarity
    const userType = user?.role;
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
            console.log('Dashboard - User:', user, 'UserType:', userType);
            
            if (userType === 'parent') {
                // Parent-specific dashboard data with graceful error handling
                const [childrenRes, statisticsRes, trainingsRes, announcementsRes] = await Promise.allSettled([
                    apiService.parents.getChildren(user.id).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to children data');
                            return { data: { children: [], childCount: 0 } };
                        }
                        throw err;
                    }),
                    apiService.parents.getStatistics(user.id).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to parent statistics');
                            return { data: { statistics: { teamsInvolved: 0 } } };
                        }
                        throw err;
                    }),
                    apiService.trainings.getUpcoming({ limit: 5 }).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to trainings');
                            return { data: [] };
                        }
                        throw err;
                    }),
                    apiService.announcements.getAll({ limit: 5 }).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to announcements');
                            return { data: [] };
                        }
                        throw err;
                    })
                ]);
                
                const childrenData = childrenRes.status === 'fulfilled' ? childrenRes.value?.data : { children: [], childCount: 0 };
                const statisticsData = statisticsRes.status === 'fulfilled' ? statisticsRes.value?.data : { statistics: { teamsInvolved: 0 } };
                const trainingsData = trainingsRes.status === 'fulfilled' ? trainingsRes.value?.data : [];
                const announcementsData = announcementsRes.status === 'fulfilled' ? announcementsRes.value?.data : [];
                
                setParentData({
                    children: childrenData.children || [],
                    statistics: statisticsData.statistics || null
                });
                
                setStats({
                    totalPlayers: childrenData.childCount || 0,
                    totalTeams: statisticsData.statistics?.teamsInvolved || 0,
                    upcomingTrainings: trainingsData || [],
                    recentAnnouncements: announcementsData || []
                });
            } else if (userType === 'admin' || userType === 'coach') {
                // General dashboard data for admin/coach with graceful error handling
                const [playersRes, teamsRes, trainingsRes, announcementsRes] = await Promise.allSettled([
                    apiService.players.getAll().catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to players data');
                            return { data: [] };
                        }
                        throw err;
                    }),
                    apiService.teams.getAll().catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to teams data');
                            return { data: [] };
                        }
                        throw err;
                    }),
                    apiService.trainings.getUpcoming({ limit: 5 }).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to trainings');
                            return { data: [] };
                        }
                        throw err;
                    }),
                    apiService.announcements.getAll({ limit: 5 }).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to announcements');
                            return { data: [] };
                        }
                        throw err;
                    })
                ]);
                
                const playersData = playersRes.status === 'fulfilled' ? playersRes.value?.data : [];
                const teamsData = teamsRes.status === 'fulfilled' ? teamsRes.value?.data : [];
                const trainingsData = trainingsRes.status === 'fulfilled' ? trainingsRes.value?.data : [];
                const announcementsData = announcementsRes.status === 'fulfilled' ? announcementsRes.value?.data : [];
                
                setStats({
                    totalPlayers: playersData.length || 0,
                    totalTeams: teamsData.length || 0,
                    upcomingTrainings: trainingsData || [],
                    recentAnnouncements: announcementsData || []
                });
            } else {
                // Player role or other roles - limited dashboard data with graceful error handling
                const [trainingsRes, announcementsRes] = await Promise.allSettled([
                    apiService.trainings.getUpcoming({ limit: 5 }).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to trainings');
                            return { data: [] };
                        }
                        throw err;
                    }),
                    apiService.announcements.getAll({ limit: 5 }).catch(err => {
                        if (err.response?.status === 403) {
                            console.info('Dashboard - No access to announcements');
                            return { data: [] };
                        }
                        throw err;
                    })
                ]);
                
                const trainingsData = trainingsRes.status === 'fulfilled' ? trainingsRes.value?.data : [];
                const announcementsData = announcementsRes.status === 'fulfilled' ? announcementsRes.value?.data : [];
                
                setStats({
                    totalPlayers: 1, // Show only self
                    totalTeams: user?.team_id ? 1 : 0,
                    upcomingTrainings: trainingsData || [],
                    recentAnnouncements: announcementsData || []
                });
            }
        } catch (error) {
            console.log('Dashboard - Error details:', error.response?.status, error.response?.data);
            
            // Handle 403 Forbidden errors gracefully
            if (error.response?.status === 403) {
                console.info('Dashboard - Access denied to some resources due to user permissions');
                // Don't set error state for permission issues, just log and continue
                // This allows the dashboard to show what the user CAN access
                setError(null);
            } else {
                console.error('Dashboard - Unexpected error loading data:', error);
                setError('Hiba történt az adatok betöltése során');
            }
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
                {userType === 'parent' && (
                    <span className="badge bg-info ms-2">Szülői Nézet</span>
                )}
                {userType === 'player' && (
                    <span className="badge bg-success ms-2">Játékos Nézet</span>
                )}
            </h1>
            
            {/* Statisztika kártyák */}
            <div className="row mb-4">
                {/* Játékos statisztika - csak admin/coach/parent esetén */}
                {(userType === 'admin' || userType === 'coach' || userType === 'parent') && (
                    <div className="col-md-3 mb-3">
                        <div className="card bg-info text-white h-100">
                            <div className="card-body text-center">
                                <h2 className="card-title">{stats.totalPlayers}</h2>
                                <p className="card-text">
                                    {userType === 'parent' ? 'Gyermekeim' : 'Összes Játékos'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="col-md-3 mb-3">
                    <div className="card bg-success text-white h-100">
                        <div className="card-body text-center">
                            <h2 className="card-title">{stats.totalTeams}</h2>
                            <p className="card-text">
                                {userType === 'parent' ? 'Érintett Csapatok' : 'Összes Csapat'}
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
            {userType === 'parent' && (
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

            {/* Player-specific section */}
            {userType === 'player' && (
                <div className="row mb-4">
                    <div className="col-12">
                        <div className="card">
                            <div className="card-header">
                                <h5 className="card-title mb-0">⚽ Játékos Dashboard</h5>
                            </div>
                            <div className="card-body">
                                <div className="alert alert-info">
                                    <h6>👋 Üdvözöljük, {user?.full_name}!</h6>
                                    <p className="mb-0">
                                        Itt tekintheti meg az edzéseket, híreket és saját statisztikáit.
                                        A részletes játékos funkciók hamarosan elérhetők lesznek.
                                    </p>
                                </div>
                                {user?.team_id && (
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="card bg-light">
                                                <div className="card-body text-center">
                                                    <h6 className="card-title">🏆 Csapatom</h6>
                                                    <p className="card-text">Csapat ID: {user.team_id}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="card bg-light">
                                                <div className="card-body text-center">
                                                    <h6 className="card-title">📊 Státusz</h6>
                                                    <p className="card-text">Aktív játékos</p>
                                                </div>
                                            </div>
                                        </div>
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