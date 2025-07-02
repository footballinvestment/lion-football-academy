import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import TeamManagement from '../components/TeamManagement';
import apiService from '../services/api';

const Admin = () => {
    const { user, isAdmin } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [parents, setParents] = useState([]);
    const [availableChildren, setAvailableChildren] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedParent, setSelectedParent] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showParentAssignModal, setShowParentAssignModal] = useState(false);
    const [stats, setStats] = useState({});
    const [activeTab, setActiveTab] = useState('users');

    // Form data for create/edit
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'parent',
        team_id: '',
        player_id: ''
    });

    useEffect(() => {
        if (isAdmin()) {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, teamsRes, playersRes, statsRes, parentsRes, availableChildrenRes] = await Promise.all([
                apiService.admin.getUsers(),
                apiService.teams.getAll(),
                apiService.players.getAll(),
                apiService.admin.getStats(),
                apiService.parents.getAll(),
                apiService.players.getAvailableChildren()
            ]);

            setUsers(usersRes.data.users || []);
            setTeams(teamsRes.data || []);
            setPlayers(playersRes.data || []);
            setStats(statsRes.data.stats || {});
            setParents(parentsRes.data.parents || []);
            setAvailableChildren(availableChildrenRes.data.children || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            setError('Hiba történt az adatok betöltésekor');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        try {
            await apiService.admin.createUser(formData);
            setShowCreateModal(false);
            resetForm();
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a felhasználó létrehozásakor');
        }
    };

    const handleUpdateUser = async (e) => {
        e.preventDefault();
        try {
            await apiService.admin.updateUser(selectedUser.id, formData);
            setShowEditModal(false);
            setSelectedUser(null);
            resetForm();
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a felhasználó frissítésekor');
        }
    };

    const handleDeactivateUser = async (userId) => {
        if (window.confirm('Biztosan deaktiválja ezt a felhasználót?')) {
            try {
                await apiService.admin.deactivateUser(userId);
                fetchData();
            } catch (error) {
                setError(error.response?.data?.message || 'Hiba a felhasználó deaktiválásakor');
            }
        }
    };

    const handleReactivateUser = async (userId) => {
        try {
            await apiService.admin.reactivateUser(userId);
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a felhasználó aktiválásakor');
        }
    };

    const handleChangeRole = async (userId, newRole, teamId = null, playerId = null) => {
        try {
            await apiService.admin.changeUserRole(userId, {
                role: newRole,
                team_id: teamId,
                player_id: playerId
            });
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a szerepkör módosításakor');
        }
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

    const handleParentAssignment = async (parentId, playerId) => {
        try {
            await apiService.players.assignParent(playerId, parentId);
            setShowParentAssignModal(false);
            setSelectedParent(null);
            fetchData();
        } catch (error) {
            setError(error.response?.data?.message || 'Hiba a szülő hozzárendelésekor');
        }
    };

    const handleRemoveParent = async (playerId) => {
        if (window.confirm('Biztosan eltávolítja a szülő kapcsolatot?')) {
            try {
                await apiService.players.removeParent(playerId);
                fetchData();
            } catch (error) {
                setError(error.response?.data?.message || 'Hiba a szülő kapcsolat törlésekor');
            }
        }
    };

    const openParentAssignModal = (parent) => {
        setSelectedParent(parent);
        setShowParentAssignModal(true);
    };

    if (!isAdmin()) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4>Hozzáférés megtagadva</h4>
                    <p>Csak adminisztrátorok férhetnek hozzá ehhez az oldalhoz.</p>
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
                    <h2>👨‍💼 Admin Panel - Felhasználó Kezelés</h2>
                    
                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
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
                                    <h5 className="card-title">Aktív Felhasználók</h5>
                                    <h3>{stats.active_users || 0}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-warning text-white">
                                <div className="card-body">
                                    <h5 className="card-title">Edzők</h5>
                                    <h3>{stats.coach_count || 0}</h3>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-info text-white">
                                <div className="card-body">
                                    <h5 className="card-title">Szülők</h5>
                                    <h3>{stats.parent_count || 0}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
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
                                            <th>Állapot</th>
                                            <th>Utolsó Bejelentkezés</th>
                                            <th>Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(user => (
                                            <tr key={user.id}>
                                                <td>{user.id}</td>
                                                <td>
                                                    <strong>{user.username}</strong>
                                                    {user.id === user.id && (
                                                        <span className="badge bg-warning ms-1">Te</span>
                                                    )}
                                                </td>
                                                <td>{user.full_name}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className={`badge ${
                                                        user.role === 'admin' ? 'bg-danger' :
                                                        user.role === 'coach' ? 'bg-warning' : 'bg-info'
                                                    }`}>
                                                        {user.role === 'admin' ? 'Admin' :
                                                         user.role === 'coach' ? 'Edző' : 'Szülő'}
                                                    </span>
                                                </td>
                                                <td>{user.team_name || '-'}</td>
                                                <td>{user.player_name || '-'}</td>
                                                <td>
                                                    <span className={`badge ${user.active ? 'bg-success' : 'bg-secondary'}`}>
                                                        {user.active ? 'Aktív' : 'Inaktív'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {user.last_login ? 
                                                        new Date(user.last_login).toLocaleDateString('hu-HU') : 
                                                        'Soha'
                                                    }
                                                </td>
                                                <td>
                                                    <div className="btn-group btn-group-sm">
                                                        <button 
                                                            className="btn btn-outline-primary"
                                                            onClick={() => openEditModal(user)}
                                                        >
                                                            ✏️
                                                        </button>
                                                        {user.active ? (
                                                            <button 
                                                                className="btn btn-outline-danger"
                                                                onClick={() => handleDeactivateUser(user.id)}
                                                                disabled={user.id === user.id}
                                                            >
                                                                ❌
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className="btn btn-outline-success"
                                                                onClick={() => handleReactivateUser(user.id)}
                                                            >
                                                                ✅
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
                    )}

                    {/* Team Management Tab */}
                    {activeTab === 'teams' && (
                        <TeamManagement />
                    )}

                    {/* Parent Management Tab */}
                    {activeTab === 'parents' && (
                        <div>
                            <div className="row">
                                {/* Parents List */}
                                <div className="col-md-6">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>👪 Szülők ({parents.length})</h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Név</th>
                                                            <th>Email</th>
                                                            <th>Gyermekek</th>
                                                            <th>Műveletek</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {parents.map(parent => (
                                                            <tr key={parent.id}>
                                                                <td>
                                                                    <strong>{parent.full_name}</strong>
                                                                    <br />
                                                                    <small className="text-muted">{parent.username}</small>
                                                                </td>
                                                                <td>{parent.email}</td>
                                                                <td>
                                                                    {parent.player_name ? (
                                                                        <span className="badge bg-success">
                                                                            {parent.player_name}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning">
                                                                            Nincs hozzárendelve
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>
                                                                    <button 
                                                                        className="btn btn-sm btn-primary"
                                                                        onClick={() => openParentAssignModal(parent)}
                                                                    >
                                                                        👶 Gyermek
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Available Children */}
                                <div className="col-md-6">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>👶 Szülő nélküli játékosok ({availableChildren.length})</h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="table-responsive">
                                                <table className="table table-sm">
                                                    <thead>
                                                        <tr>
                                                            <th>Név</th>
                                                            <th>Csapat</th>
                                                            <th>Pozíció</th>
                                                            <th>Műveletek</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {availableChildren.map(child => (
                                                            <tr key={child.id}>
                                                                <td>
                                                                    <strong>{child.name}</strong>
                                                                    <br />
                                                                    <small className="text-muted">
                                                                        {child.birth_date ? 
                                                                            new Date().getFullYear() - new Date(child.birth_date).getFullYear() + ' év' : 
                                                                            'Kor ismeretlen'
                                                                        }
                                                                    </small>
                                                                </td>
                                                                <td>
                                                                    <span className="badge bg-info">
                                                                        {child.team_name || 'Nincs csapat'}
                                                                    </span>
                                                                </td>
                                                                <td>{child.position || '-'}</td>
                                                                <td>
                                                                    <small className="text-muted">
                                                                        Szülő hozzárendeléséhez válasszon egy szülőt
                                                                    </small>
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

                            {/* All Players with Parent Info */}
                            <div className="row mt-4">
                                <div className="col-12">
                                    <div className="card">
                                        <div className="card-header">
                                            <h5>🎯 Összes játékos szülői információkkal</h5>
                                        </div>
                                        <div className="card-body">
                                            <div className="table-responsive">
                                                <table className="table table-striped">
                                                    <thead>
                                                        <tr>
                                                            <th>Játékos</th>
                                                            <th>Csapat</th>
                                                            <th>Pozíció</th>
                                                            <th>Szülő</th>
                                                            <th>Szülő Email</th>
                                                            <th>Műveletek</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {players.map(player => (
                                                            <tr key={player.id}>
                                                                <td>
                                                                    <strong>{player.name}</strong>
                                                                    <br />
                                                                    <small className="text-muted">
                                                                        {player.birth_date ? 
                                                                            new Date().getFullYear() - new Date(player.birth_date).getFullYear() + ' év' : 
                                                                            'Kor ismeretlen'
                                                                        }
                                                                    </small>
                                                                </td>
                                                                <td>
                                                                    <span className="badge bg-info">
                                                                        {player.team_name || 'Nincs csapat'}
                                                                    </span>
                                                                </td>
                                                                <td>{player.position || '-'}</td>
                                                                <td>
                                                                    {player.parent_name ? (
                                                                        <span className="badge bg-success">
                                                                            {player.parent_name}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="badge bg-warning">
                                                                            Nincs szülő
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td>{player.parent_email || '-'}</td>
                                                                <td>
                                                                    {player.parent_name ? (
                                                                        <button 
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            onClick={() => handleRemoveParent(player.id)}
                                                                        >
                                                                            ❌ Kapcsolat törlése
                                                                        </button>
                                                                    ) : (
                                                                        <small className="text-muted">
                                                                            Válasszon szülőt a bal oldali listából
                                                                        </small>
                                                                    )}
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
                        </div>
                    )}
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
                                        <label className="form-label">Felhasználónév *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.username}
                                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Jelszó *</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={formData.password}
                                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Teljes Név *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Szerepkör *</label>
                                        <select
                                            className="form-select"
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                                            required
                                        >
                                            <option value="parent">Szülő</option>
                                            <option value="coach">Edző</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    {(formData.role === 'coach' || formData.role === 'parent') && (
                                        <div className="mb-3">
                                            <label className="form-label">Csapat</label>
                                            <select
                                                className="form-select"
                                                value={formData.team_id}
                                                onChange={(e) => setFormData({...formData, team_id: e.target.value})}
                                            >
                                                <option value="">Válasszon csapatot</option>
                                                {teams.map(team => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name} ({team.age_group})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {formData.role === 'parent' && (
                                        <div className="mb-3">
                                            <label className="form-label">Játékos (gyermek)</label>
                                            <select
                                                className="form-select"
                                                value={formData.player_id}
                                                onChange={(e) => setFormData({...formData, player_id: e.target.value})}
                                            >
                                                <option value="">Válasszon játékost</option>
                                                {players.map(player => (
                                                    <option key={player.id} value={player.id}>
                                                        {player.name} - {player.team_name || 'Csapat nélkül'}
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
                                    onClick={() => {setShowEditModal(false); setSelectedUser(null); resetForm();}}
                                ></button>
                            </div>
                            <form onSubmit={handleUpdateUser}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Felhasználónév *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.username}
                                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Email *</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            value={formData.email}
                                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Teljes Név *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formData.full_name}
                                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Szerepkör *</label>
                                        <select
                                            className="form-select"
                                            value={formData.role}
                                            onChange={(e) => setFormData({...formData, role: e.target.value})}
                                            required
                                        >
                                            <option value="parent">Szülő</option>
                                            <option value="coach">Edző</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    {(formData.role === 'coach' || formData.role === 'parent') && (
                                        <div className="mb-3">
                                            <label className="form-label">Csapat</label>
                                            <select
                                                className="form-select"
                                                value={formData.team_id}
                                                onChange={(e) => setFormData({...formData, team_id: e.target.value})}
                                            >
                                                <option value="">Válasszon csapatot</option>
                                                {teams.map(team => (
                                                    <option key={team.id} value={team.id}>
                                                        {team.name} ({team.age_group})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {formData.role === 'parent' && (
                                        <div className="mb-3">
                                            <label className="form-label">Játékos (gyermek)</label>
                                            <select
                                                className="form-select"
                                                value={formData.player_id}
                                                onChange={(e) => setFormData({...formData, player_id: e.target.value})}
                                            >
                                                <option value="">Válasszon játékost</option>
                                                {players.map(player => (
                                                    <option key={player.id} value={player.id}>
                                                        {player.name} - {player.team_name || 'Csapat nélkül'}
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
                                        onClick={() => {setShowEditModal(false); setSelectedUser(null); resetForm();}}
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

            {/* Parent Assignment Modal */}
            {showParentAssignModal && selectedParent && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    👪 Gyermek hozzárendelése - {selectedParent.full_name}
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close"
                                    onClick={() => {setShowParentAssignModal(false); setSelectedParent(null);}}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <h6>Szülő információk:</h6>
                                    <ul className="list-unstyled">
                                        <li><strong>Név:</strong> {selectedParent.full_name}</li>
                                        <li><strong>Email:</strong> {selectedParent.email}</li>
                                        <li><strong>Jelenlegi gyermek:</strong> {selectedParent.player_name || 'Nincs'}</li>
                                    </ul>
                                </div>
                                
                                <h6>Válasszon gyermeket:</h6>
                                <div className="row">
                                    {availableChildren.map(child => (
                                        <div key={child.id} className="col-md-6 mb-3">
                                            <div className="card">
                                                <div className="card-body">
                                                    <h6 className="card-title">{child.name}</h6>
                                                    <p className="card-text">
                                                        <small className="text-muted">
                                                            {child.team_name || 'Nincs csapat'} • {child.position || 'Pozíció ismeretlen'}
                                                            <br />
                                                            {child.birth_date ? 
                                                                new Date().getFullYear() - new Date(child.birth_date).getFullYear() + ' év' : 
                                                                'Kor ismeretlen'
                                                            }
                                                        </small>
                                                    </p>
                                                    <button 
                                                        className="btn btn-sm btn-success"
                                                        onClick={() => handleParentAssignment(selectedParent.id, child.id)}
                                                    >
                                                        ✅ Hozzárendelés
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                
                                {availableChildren.length === 0 && (
                                    <div className="alert alert-warning">
                                        <strong>Nincs elérhető gyermek!</strong><br />
                                        Minden játékoshoz már hozzá van rendelve szülő.
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => {setShowParentAssignModal(false); setSelectedParent(null);}}
                                >
                                    Mégse
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default Admin;