import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const Profile = () => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('profile');

    // Profile edit form
    const [editMode, setEditMode] = useState(false);
    const [profileForm, setProfileForm] = useState({
        username: '',
        email: '',
        full_name: ''
    });

    // Password change form
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchProfileData();
        }
    }, [isAuthenticated]);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const [profileRes, dashboardRes, notificationsRes] = await Promise.all([
                apiService.profile.getProfile(),
                apiService.profile.getDashboard(),
                apiService.profile.getNotifications()
            ]);

            setProfile(profileRes.data.profile);
            setDashboardData(dashboardRes.data.dashboard);
            setNotifications(notificationsRes.data.notifications || []);

            // Initialize profile form
            setProfileForm({
                username: profileRes.data.profile.username,
                email: profileRes.data.profile.email,
                full_name: profileRes.data.profile.full_name
            });
        } catch (error) {
            console.error('Error fetching profile data:', error);
            setError('Hiba történt az adatok betöltésekor');
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            setError('');
            const response = await apiService.profile.updateProfile(profileForm);
            
            if (response.data.success) {
                setProfile(response.data.profile);
                setEditMode(false);
                setSuccess('Profil sikeresen frissítve!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a profil frissítésekor');
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        try {
            setPasswordLoading(true);
            setError('');

            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                setError('Az új jelszavak nem egyeznek');
                return;
            }

            const response = await apiService.profile.changePassword(passwordForm);
            
            if (response.data.success) {
                setPasswordForm({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                });
                setSuccess('Jelszó sikeresen megváltoztatva!');
                setTimeout(() => setSuccess(''), 3000);
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a jelszó változtatásakor');
        } finally {
            setPasswordLoading(false);
        }
    };

    const getAvatarPlaceholder = (name) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'admin': return 'Adminisztrátor';
            case 'coach': return 'Edző';
            case 'parent': return 'Szülő';
            default: return role;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Soha';
        return new Date(dateString).toLocaleDateString('hu-HU');
    };

    if (!isAuthenticated) {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4>Bejelentkezés szükséges</h4>
                    <p>A profil megtekintéséhez be kell jelentkeznie.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="d-flex justify-content-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Betöltés...</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <h2>👤 Profil</h2>
                    
                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success alert-dismissible fade show" role="alert">
                            {success}
                            <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                        </div>
                    )}

                    {/* Profile Header */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-auto">
                                    <div 
                                        className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                                        style={{ width: '80px', height: '80px', fontSize: '2rem' }}
                                    >
                                        {getAvatarPlaceholder(profile?.full_name)}
                                    </div>
                                </div>
                                <div className="col">
                                    <h4 className="mb-1">{profile?.full_name}</h4>
                                    <p className="text-muted mb-1">@{profile?.username}</p>
                                    <span className={`badge ${
                                        profile?.role === 'admin' ? 'bg-danger' :
                                        profile?.role === 'coach' ? 'bg-warning' : 'bg-info'
                                    }`}>
                                        {getRoleDisplayName(profile?.role)}
                                    </span>
                                    {profile?.team_name && (
                                        <span className="badge bg-secondary ms-2">{profile.team_name}</span>
                                    )}
                                </div>
                                <div className="col-auto">
                                    <small className="text-muted">
                                        Utolsó bejelentkezés: {formatDate(profile?.last_login)}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
                                onClick={() => setActiveTab('profile')}
                            >
                                📝 Profil Adatok
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                            >
                                📊 Személyes Dashboard
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
                                onClick={() => setActiveTab('notifications')}
                            >
                                🔔 Értesítések ({notifications.length})
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
                                onClick={() => setActiveTab('security')}
                            >
                                🔒 Biztonság
                            </button>
                        </li>
                    </ul>

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5>Profil Információk</h5>
                                <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => setEditMode(!editMode)}
                                >
                                    {editMode ? '❌ Mégse' : '✏️ Szerkesztés'}
                                </button>
                            </div>
                            <div className="card-body">
                                {editMode ? (
                                    <form onSubmit={handleProfileUpdate}>
                                        <div className="mb-3">
                                            <label className="form-label">Felhasználónév</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={profileForm.username}
                                                onChange={(e) => setProfileForm({...profileForm, username: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Email cím</label>
                                            <input
                                                type="email"
                                                className="form-control"
                                                value={profileForm.email}
                                                onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div className="mb-3">
                                            <label className="form-label">Teljes név</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={profileForm.full_name}
                                                onChange={(e) => setProfileForm({...profileForm, full_name: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary">
                                            Mentés
                                        </button>
                                    </form>
                                ) : (
                                    <div className="row">
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Felhasználónév</label>
                                                <p className="fw-bold">{profile?.username}</p>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Email cím</label>
                                                <p className="fw-bold">{profile?.email}</p>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Teljes név</label>
                                                <p className="fw-bold">{profile?.full_name}</p>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Szerepkör</label>
                                                <p className="fw-bold">{getRoleDisplayName(profile?.role)}</p>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Csapat</label>
                                                <p className="fw-bold">{profile?.team_name || 'Nincs hozzárendelve'}</p>
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label text-muted">Játékos</label>
                                                <p className="fw-bold">{profile?.player_name || 'Nincs hozzárendelve'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <div className="card">
                            <div className="card-header">
                                <h5>Személyes Dashboard</h5>
                            </div>
                            <div className="card-body">
                                {dashboardData?.content?.type === 'admin' && (
                                    <div>
                                        <h6>Admin Statisztikák</h6>
                                        <div className="row">
                                            <div className="col-md-3">
                                                <div className="card bg-primary text-white">
                                                    <div className="card-body text-center">
                                                        <h4>{dashboardData.content.stats.total_users}</h4>
                                                        <small>Összes Felhasználó</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="card bg-success text-white">
                                                    <div className="card-body text-center">
                                                        <h4>{dashboardData.content.stats.active_users}</h4>
                                                        <small>Aktív Felhasználók</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="card bg-warning text-white">
                                                    <div className="card-body text-center">
                                                        <h4>{dashboardData.content.stats.coach_count}</h4>
                                                        <small>Edzők</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-md-3">
                                                <div className="card bg-info text-white">
                                                    <div className="card-body text-center">
                                                        <h4>{dashboardData.content.stats.parent_count}</h4>
                                                        <small>Szülők</small>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {dashboardData?.content?.type === 'coach' && (
                                    <div>
                                        <h6>Edző Dashboard</h6>
                                        {dashboardData.content.team ? (
                                            <div>
                                                <div className="row mb-3">
                                                    <div className="col-md-6">
                                                        <div className="card">
                                                            <div className="card-body">
                                                                <h6>Saját Csapat</h6>
                                                                <p><strong>{dashboardData.content.team.name}</strong></p>
                                                                <p>Korosztály: {dashboardData.content.team.age_group}</p>
                                                                <p>Játékosok száma: {dashboardData.content.playerCount}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="card">
                                                            <div className="card-body">
                                                                <h6>Következő Edzések</h6>
                                                                {dashboardData.content.upcomingTrainings.length > 0 ? (
                                                                    dashboardData.content.upcomingTrainings.slice(0, 3).map(training => (
                                                                        <div key={training.id} className="mb-2">
                                                                            <small className="text-muted">
                                                                                {formatDate(training.date)} - {training.type}
                                                                            </small>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-muted">Nincs következő edzés</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-muted">{dashboardData.content.message}</p>
                                        )}
                                    </div>
                                )}

                                {dashboardData?.content?.type === 'parent' && (
                                    <div>
                                        <h6>Szülő Dashboard</h6>
                                        {dashboardData.content.player ? (
                                            <div>
                                                <div className="row mb-3">
                                                    <div className="col-md-6">
                                                        <div className="card">
                                                            <div className="card-body">
                                                                <h6>Gyermek Információk</h6>
                                                                <p><strong>{dashboardData.content.player.name}</strong></p>
                                                                <p>Csapat: {dashboardData.content.childTeam || 'Nincs csapat'}</p>
                                                                <p>Pozíció: {dashboardData.content.player.position || 'Nincs megadva'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-6">
                                                        <div className="card">
                                                            <div className="card-body">
                                                                <h6>Következő Edzések</h6>
                                                                {dashboardData.content.upcomingTrainings.length > 0 ? (
                                                                    dashboardData.content.upcomingTrainings.slice(0, 3).map(training => (
                                                                        <div key={training.id} className="mb-2">
                                                                            <small className="text-muted">
                                                                                {formatDate(training.date)} - {training.type}
                                                                            </small>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-muted">Nincs következő edzés</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-muted">{dashboardData.content.message}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div className="card">
                            <div className="card-header">
                                <h5>Értesítések</h5>
                            </div>
                            <div className="card-body">
                                {notifications.length > 0 ? (
                                    notifications.map((notification, index) => (
                                        <div key={index} className={`alert alert-${notification.type === 'warning' ? 'warning' : 'info'} mb-2`}>
                                            <div className="d-flex justify-content-between">
                                                <span>{notification.message}</span>
                                                <small className="text-muted">
                                                    {formatDate(notification.timestamp)}
                                                </small>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted">Nincs új értesítés</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="card">
                            <div className="card-header">
                                <h5>Biztonság - Jelszó Változtatás</h5>
                            </div>
                            <div className="card-body">
                                <form onSubmit={handlePasswordChange}>
                                    <div className="mb-3">
                                        <label className="form-label">Jelenlegi jelszó</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordForm.currentPassword}
                                            onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Új jelszó</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordForm.newPassword}
                                            onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                            required
                                            minLength="6"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Új jelszó megerősítése</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={passwordForm.confirmPassword}
                                            onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                            required
                                            minLength="6"
                                        />
                                    </div>
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        disabled={passwordLoading}
                                    >
                                        {passwordLoading ? 'Változtatás...' : 'Jelszó Változtatása'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;