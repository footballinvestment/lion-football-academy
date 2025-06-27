import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import TeamManagement from '../components/TeamManagement';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner, { LoadingButton } from '../components/LoadingSpinner';
import apiService from '../services/api';

const Admin = () => {
    const { user, isAdmin } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState('users');
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    
    // Form data
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'parent',
        team_id: '',
        player_id: ''
    });

    const roles = [
        { value: 'admin', label: 'Adminisztrátor' },
        { value: 'coach', label: 'Edző' },
        { value: 'parent', label: 'Szülő' }
    ];

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const [usersData, teamsData, playersData, statsData] = await Promise.all([
                apiService.admin.getUsers(),
                apiService.teams.getAll(),
                apiService.players.getAll(),
                apiService.admin.getStats()
            ]);
            
            // Fix: admin/users returns { success, users, count } format
            setUsers(Array.isArray(usersData.users) ? usersData.users : []);
            setTeams(Array.isArray(teamsData.data) ? teamsData.data : []);
            setPlayers(Array.isArray(playersData.data) ? playersData.data : []);
            setStats(statsData.stats || statsData.data || {});
        } catch (error) {
            console.error('Hiba az adatok betöltésénél:', error);
            setError('Hiba történt az adatok betöltése során');
            // Set safe default values on error
            setUsers([]);
            setTeams([]);
            setPlayers([]);
            setStats({});
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin()) {
            fetchData();
        }
    }, [isAdmin, fetchData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const resetForm = () => {
        setFormData({
            username: '',
            email: '',
            password: '',
            full_name: '',
            role: 'parent',
            team_id: '',
            player_id: ''
        });
    };

    const handleCreateUser = useCallback(async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setError('');
        try {
            await apiService.admin.createUser(formData);
            setSuccess('Felhasználó sikeresen létrehozva!');
            setShowCreateModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Hiba a felhasználó létrehozásakor:', error);
            setError(error.response?.data?.error || 'Hiba történt a felhasználó létrehozása során');
        } finally {
            setSubmitLoading(false);
        }
    }, [formData, fetchData]);

    const handleEditUser = async (e) => {
        e.preventDefault();
        try {
            await apiService.admin.updateUser(selectedUser.id, formData);
            setSuccess('Felhasználó sikeresen frissítve!');
            setShowEditModal(false);
            resetForm();
            setSelectedUser(null);
            fetchData();
        } catch (error) {
            console.error('Hiba a felhasználó frissítésekor:', error);
            setError(error.response?.data?.error || 'Hiba történt a felhasználó frissítése során');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('Biztosan törölni szeretnéd ezt a felhasználót?')) {
            try {
                await apiService.admin.deactivateUser(userId);
                setSuccess('Felhasználó sikeresen törölve!');
                fetchData();
            } catch (error) {
                console.error('Hiba a felhasználó törlésekor:', error);
                setError(error.response?.data?.error || 'Hiba történt a felhasználó törlése során');
            }
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            password: '', // Don't populate password for security
            full_name: user.full_name,
            role: user.role,
            team_id: user.team_id || '',
            player_id: user.player_id || ''
        });
        setShowEditModal(true);
    };

    const getTeamName = (teamId) => {
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : 'Nincs csapat';
    };

    const getPlayerName = (playerId) => {
        const player = players.find(p => p.id === playerId);
        return player ? player.name : 'Nincs játékos';
    };

    // Auto-hide success/error messages
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    if (!isAdmin()) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">🚫 Hozzáférés megtagadva</h4>
                    <p>Ehhez az oldalhoz adminisztrátori jogosultság szükséges.</p>
                    <hr />
                    <p className="mb-0">Kérjük, jelentkezzen be megfelelő jogosultságokkal rendelkező fiókkal.</p>
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

    if (loading) {
        return <LoadingSpinner fullPage text="Adminisztrációs adatok betöltése..." />;
    }

    return (
        <ErrorBoundary>
            <>
            <div className="container mt-4">
                <div className="row">
                    <div className="col-12">
                        <h2>👨‍💼 Admin Panel - Felhasználó Kezelés</h2>
                        
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

                        {/* Statistics Cards */}
                        <div className="row mb-4">
                            <div className="col-md-3">
                                <div className="card bg-primary text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Összes Felhasználó</h5>
                                        <h3>{stats.total_users || 0}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-success text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Aktív Csapatok</h5>
                                        <h3>{stats.total_teams || 0}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-info text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Regisztrált Játékosok</h5>
                                        <h3>{stats.total_players || 0}</h3>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-3">
                                <div className="card bg-warning text-white">
                                    <div className="card-body">
                                        <h5 className="card-title">Edzők</h5>
                                        <h3>{stats.total_coaches || 0}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <ul className="nav nav-tabs mb-4">
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('users')}
                                >
                                    👥 Felhasználó Kezelés
                                </button>
                            </li>
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'teams' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('teams')}
                                >
                                    🏆 Csapat-Edző Kezelés
                                </button>
                            </li>
                            <li className="nav-item">
                                <button 
                                    className={`nav-link ${activeTab === 'parents' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('parents')}
                                >
                                    👪 Szülő-Gyermek Kezelés
                                </button>
                            </li>
                        </ul>

                        {/* User Management Tab */}
                        {activeTab === 'users' && (
                            <div>
                                {/* Action Buttons */}
                                <div className="mb-3">
                                    <button 
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        ➕ Új Felhasználó
                                    </button>
                                    <button 
                                        className="btn btn-secondary ms-2"
                                        onClick={fetchData}
                                    >
                                        🔄 Frissítés
                                    </button>
                                </div>

                                {/* Users Table */}
                                <div className="card">
                                    <div className="card-header">
                                        <h5>Felhasználók ({users.length})</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="table-responsive">
                                            <table className="table table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>ID</th>
                                                        <th>Felhasználónév</th>
                                                        <th>Teljes Név</th>
                                                        <th>Email</th>
                                                        <th>Szerepkör</th>
                                                        <th>Csapat</th>
                                                        <th>Játékos</th>
                                                        <th>Aktív</th>
                                                        <th>Létrehozva</th>
                                                        <th>Műveletek</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {users.map(user => (
                                                        <tr key={user.id}>
                                                            <td>{user.id}</td>
                                                            <td>
                                                                <strong>{user.username}</strong>
                                                                {user.role === 'admin' && (
                                                                    <span className="badge bg-danger ms-2">Admin</span>
                                                                )}
                                                            </td>
                                                            <td>{user.full_name}</td>
                                                            <td>{user.email}</td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    user.role === 'admin' ? 'bg-danger' :
                                                                    user.role === 'coach' ? 'bg-success' :
                                                                    'bg-primary'
                                                                }`}>
                                                                    {roles.find(r => r.value === user.role)?.label || user.role}
                                                                </span>
                                                            </td>
                                                            <td>{user.team_id ? getTeamName(user.team_id) : '-'}</td>
                                                            <td>{user.player_id ? getPlayerName(user.player_id) : '-'}</td>
                                                            <td>
                                                                <span className={`badge ${user.active ? 'bg-success' : 'bg-danger'}`}>
                                                                    {user.active ? 'Aktív' : 'Inaktív'}
                                                                </span>
                                                            </td>
                                                            <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('hu-HU') : '-'}</td>
                                                            <td>
                                                                <div className="btn-group btn-group-sm" role="group">
                                                                    <button 
                                                                        className="btn btn-outline-primary"
                                                                        onClick={() => openEditModal(user)}
                                                                        title="Szerkesztés"
                                                                    >
                                                                        ✏️
                                                                    </button>
                                                                    {user.id !== user.id && (
                                                                        <button 
                                                                            className="btn btn-outline-danger"
                                                                            onClick={() => handleDeleteUser(user.id)}
                                                                            title="Törlés"
                                                                        >
                                                                            🗑️
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Team Management Tab */}
                        {activeTab === 'teams' && (
                            <TeamManagement />
                        )}

                        {/* Parent-Child Management Tab */}
                        {activeTab === 'parents' && (
                            <div className="card">
                                <div className="card-header">
                                    <h5>👪 Szülő-Gyermek Kapcsolatok Kezelése</h5>
                                </div>
                                <div className="card-body">
                                    <p className="text-muted">Ez a funkció hamarosan elérhető lesz.</p>
                                    <div className="row">
                                        {players.filter(player => player.parent_name).map(player => (
                                            <div key={player.id} className="col-md-6 mb-3">
                                                <div className="card border-info">
                                                    <div className="card-body">
                                                        <h6 className="card-title">👶 {player.name}</h6>
                                                        <p className="card-text">
                                                            <strong>Szülő:</strong> {player.parent_name}<br/>
                                                            <strong>Telefon:</strong> {player.parent_phone || 'Nincs megadva'}<br/>
                                                            <strong>Email:</strong> {player.parent_email || 'Nincs megadva'}<br/>
                                                            <strong>Csapat:</strong> {getTeamName(player.team_id)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Új Felhasználó Létrehozása</h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => {setShowCreateModal(false); resetForm();}}
                                ></button>
                            </div>
                            <form onSubmit={handleCreateUser}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label htmlFor="username" className="form-label">Felhasználónév</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="username"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="password" className="form-label">Jelszó</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="full_name" className="form-label">Teljes Név</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="full_name"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="role" className="form-label">Szerepkör</label>
                                        <select
                                            className="form-select"
                                            id="role"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            {roles.map(role => (
                                                <option key={role.value} value={role.value}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {formData.role === 'coach' && (
                                        <div className="mb-3">
                                            <label htmlFor="team_id" className="form-label">Csapat</label>
                                            <select
                                                className="form-select"
                                                id="team_id"
                                                name="team_id"
                                                value={formData.team_id}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Válassz csapatot...</option>
                                                {teams.map(team => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    
                                    {formData.role === 'parent' && (
                                        <div className="mb-3">
                                            <label htmlFor="player_id" className="form-label">Gyermek Játékos</label>
                                            <select
                                                className="form-select"
                                                id="player_id"
                                                name="player_id"
                                                value={formData.player_id}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Válassz játékost...</option>
                                                {players.map(player => (
                                                    <option key={player.id} value={player.id}>
                                                        {player.name} ({getTeamName(player.team_id)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => {setShowCreateModal(false); resetForm();}}
                                    >
                                        Mégse
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Létrehozás
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Felhasználó Szerkesztése</h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => {setShowEditModal(false); resetForm(); setSelectedUser(null);}}
                                ></button>
                            </div>
                            <form onSubmit={handleEditUser}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label htmlFor="edit_username" className="form-label">Felhasználónév</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="edit_username"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="edit_email" className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="edit_email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="edit_password" className="form-label">Jelszó (üresen hagyva nem változik)</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="edit_password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            placeholder="Új jelszó..."
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="edit_full_name" className="form-label">Teljes Név</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="edit_full_name"
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label htmlFor="edit_role" className="form-label">Szerepkör</label>
                                        <select
                                            className="form-select"
                                            id="edit_role"
                                            name="role"
                                            value={formData.role}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            {roles.map(role => (
                                                <option key={role.value} value={role.value}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {formData.role === 'coach' && (
                                        <div className="mb-3">
                                            <label htmlFor="edit_team_id" className="form-label">Csapat</label>
                                            <select
                                                className="form-select"
                                                id="edit_team_id"
                                                name="team_id"
                                                value={formData.team_id}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Válassz csapatot...</option>
                                                {teams.map(team => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    
                                    {formData.role === 'parent' && (
                                        <div className="mb-3">
                                            <label htmlFor="edit_player_id" className="form-label">Gyermek Játékos</label>
                                            <select
                                                className="form-select"
                                                id="edit_player_id"
                                                name="player_id"
                                                value={formData.player_id}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Válassz játékost...</option>
                                                {players.map(player => (
                                                    <option key={player.id} value={player.id}>
                                                        {player.name} ({getTeamName(player.team_id)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary"
                                        onClick={() => {setShowEditModal(false); resetForm(); setSelectedUser(null);}}
                                    >
                                        Mégse
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Frissítés
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            </>
        </ErrorBoundary>
    );
};

export default Admin;