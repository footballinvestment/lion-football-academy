import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const TeamManagement = () => {
    const { user, isAdmin } = useContext(AuthContext);
    const [teams, setTeams] = useState([]);
    const [availableCoaches, setAvailableCoaches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCoachId, setSelectedCoachId] = useState('');

    useEffect(() => {
        if (isAdmin()) {
            fetchData();
        }
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [teamsRes, coachesRes] = await Promise.all([
                apiService.teams.getAll(),
                apiService.teams.getAvailableCoaches()
            ]);

            setTeams(teamsRes.data || []);
            setAvailableCoaches(coachesRes.data.coaches || []);
        } catch (error) {
            console.error('Error fetching team management data:', error);
            setError('Hiba történt az adatok betöltésekor');
        } finally {
            setLoading(false);
        }
    };

    const openAssignModal = (team) => {
        setSelectedTeam(team);
        setSelectedCoachId('');
        setShowAssignModal(true);
        setError('');
    };

    const handleAssignCoach = async () => {
        if (!selectedCoachId || !selectedTeam) {
            setError('Válasszon egy edzőt');
            return;
        }

        try {
            await apiService.teams.assignCoach(selectedTeam.id, selectedCoachId);
            setShowAssignModal(false);
            setSelectedTeam(null);
            setSelectedCoachId('');
            setSuccess(`Edző sikeresen hozzárendelve a ${selectedTeam.name} csapathoz`);
            setTimeout(() => setSuccess(''), 3000);
            fetchData(); // Refresh data
        } catch (error) {
            setError(error.response?.data?.error || 'Hiba az edző hozzárendelésekor');
        }
    };

    const handleRemoveCoach = async (team) => {
        if (window.confirm(`Biztosan eltávolítja a(z) ${team.coach_name} edzőt a ${team.name} csapatból?`)) {
            try {
                await apiService.teams.removeCoach(team.id);
                setSuccess(`Edző sikeresen eltávolítva a ${team.name} csapatból`);
                setTimeout(() => setSuccess(''), 3000);
                fetchData(); // Refresh data
            } catch (error) {
                setError(error.response?.data?.error || 'Hiba az edző eltávolításakor');
            }
        }
    };

    const getAvatarPlaceholder = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    if (!isAdmin()) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">
                    <h4>Hozzáférés megtagadva</h4>
                    <p>Csak adminisztrátorok férhetnek hozzá a csapat kezeléshez.</p>
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
        <div className="container-fluid mt-4">
            <div className="row">
                <div className="col-12">
                    <h3>🏆 Csapat-Edző Kezelés</h3>
                    
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

                    {/* Available Coaches Info */}
                    <div className="row mb-4">
                        <div className="col-12">
                            <div className="card bg-light">
                                <div className="card-body">
                                    <h6>Elérhető Edzők ({availableCoaches.length})</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {availableCoaches.length > 0 ? (
                                            availableCoaches.map(coach => (
                                                <span key={coach.id} className="badge bg-success">
                                                    {coach.full_name}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-muted">Nincs elérhető edző</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Teams Grid */}
                    <div className="row">
                        {teams.map(team => (
                            <div key={team.id} className="col-lg-4 col-md-6 mb-4">
                                <div className="card h-100">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h6 className="mb-0">{team.name}</h6>
                                        <span className="badge bg-secondary">{team.age_group}</span>
                                    </div>
                                    <div className="card-body">
                                        <div className="text-center mb-3">
                                            {team.coach_name ? (
                                                <div>
                                                    <div 
                                                        className="rounded-circle bg-warning text-dark d-inline-flex align-items-center justify-content-center mb-2"
                                                        style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}
                                                    >
                                                        {getAvatarPlaceholder(team.coach_name)}
                                                    </div>
                                                    <p className="fw-bold mb-1">{team.coach_name}</p>
                                                    <span className="badge bg-warning text-dark">Edző</span>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div 
                                                        className="rounded-circle bg-light border d-inline-flex align-items-center justify-content-center mb-2"
                                                        style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}
                                                    >
                                                        ❓
                                                    </div>
                                                    <p className="text-muted mb-1">Nincs edző</p>
                                                    <span className="badge bg-secondary">Hozzárendelés szükséges</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="text-center">
                                            <p className="text-muted mb-2">
                                                <small>Játékosok: {team.player_count || 0}</small>
                                            </p>
                                            <p className="text-muted mb-2">
                                                <small>Szín: {team.team_color || 'Nincs megadva'}</small>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="card-footer">
                                        <div className="d-grid gap-2">
                                            {team.coach_name ? (
                                                <div className="btn-group">
                                                    <button 
                                                        className="btn btn-outline-primary btn-sm"
                                                        onClick={() => openAssignModal(team)}
                                                    >
                                                        Edző Váltása
                                                    </button>
                                                    <button 
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleRemoveCoach(team)}
                                                    >
                                                        Eltávolítás
                                                    </button>
                                                </div>
                                            ) : (
                                                <button 
                                                    className="btn btn-primary btn-sm"
                                                    onClick={() => openAssignModal(team)}
                                                    disabled={availableCoaches.length === 0}
                                                >
                                                    {availableCoaches.length > 0 ? 'Edző Hozzárendelése' : 'Nincs elérhető edző'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {teams.length === 0 && (
                        <div className="text-center mt-5">
                            <p className="text-muted">Nincs csapat létrehozva.</p>
                        </div>
                    )}

                    {/* Assign Coach Modal */}
                    {showAssignModal && selectedTeam && (
                        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                            <div className="modal-dialog">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">
                                            Edző Hozzárendelése - {selectedTeam.name}
                                        </h5>
                                        <button 
                                            type="button" 
                                            className="btn-close"
                                            onClick={() => setShowAssignModal(false)}
                                        ></button>
                                    </div>
                                    <div className="modal-body">
                                        {error && (
                                            <div className="alert alert-danger">
                                                {error}
                                            </div>
                                        )}

                                        <div className="mb-3">
                                            <label className="form-label">Válasszon edzőt:</label>
                                            <select 
                                                className="form-select"
                                                value={selectedCoachId}
                                                onChange={(e) => setSelectedCoachId(e.target.value)}
                                            >
                                                <option value="">Válasszon edzőt...</option>
                                                {availableCoaches.map(coach => (
                                                    <option key={coach.id} value={coach.id}>
                                                        {coach.full_name} ({coach.username})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedTeam.coach_name && (
                                            <div className="alert alert-info">
                                                <small>
                                                    <strong>Jelenlegi edző:</strong> {selectedTeam.coach_name}
                                                    <br />
                                                    Az új edző hozzárendelése felváltja a jelenlegit.
                                                </small>
                                            </div>
                                        )}

                                        <div className="mb-3">
                                            <label className="form-label">Csapat információk:</label>
                                            <div className="card bg-light">
                                                <div className="card-body p-3">
                                                    <p className="mb-1"><strong>Név:</strong> {selectedTeam.name}</p>
                                                    <p className="mb-1"><strong>Korosztály:</strong> {selectedTeam.age_group}</p>
                                                    <p className="mb-0"><strong>Játékosok:</strong> {selectedTeam.player_count || 0}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary"
                                            onClick={() => setShowAssignModal(false)}
                                        >
                                            Mégse
                                        </button>
                                        <button 
                                            type="button" 
                                            className="btn btn-primary"
                                            onClick={handleAssignCoach}
                                            disabled={!selectedCoachId}
                                        >
                                            Hozzárendelés
                                        </button>
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

export default TeamManagement;