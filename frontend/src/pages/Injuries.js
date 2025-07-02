import React, { useState, useEffect, useCallback } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import apiService from '../services/api';
import { handleApiError, ErrorAlert, ConfirmationModal } from '../utils/errorHandler';
import { useAuth } from '../context/AuthContext';

const Injuries = () => {
    const { user, canAccessFeature } = useAuth();
    const [injuries, setInjuries] = useState([]);
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState(null);
    const [activeTab, setActiveTab] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [selectedInjury, setSelectedInjury] = useState(null);
    const [filterSeverity, setFilterSeverity] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, injuryId: null });
    const [formData, setFormData] = useState({
        player_id: '',
        injury_type: '',
        injury_severity: 'minor',
        injury_date: '',
        injury_location: '',
        description: '',
        treatment_plan: '',
        expected_recovery_date: '',
        medical_notes: '',
        doctor_name: '',
        physiotherapist_name: '',
        rehabilitation_exercises: '',
        follow_up_required: true
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [injuriesRes, playersRes, statsRes] = await Promise.all([
                apiService.injuries.getAll(),
                apiService.players.getAll(),
                apiService.injuries.getStats()
            ]);
            
            setInjuries(injuriesRes.data);
            setPlayers(playersRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching injury data:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedInjury) {
                await apiService.injuries.update(selectedInjury.id, formData);
            } else {
                await apiService.injuries.create(formData);
            }
            
            setShowModal(false);
            setSelectedInjury(null);
            resetForm();
            fetchData();
        } catch (error) {
            console.error('Error saving injury:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const handleEdit = (injury) => {
        setSelectedInjury(injury);
        setFormData({
            player_id: injury.player_id,
            injury_type: injury.injury_type,
            injury_severity: injury.injury_severity,
            injury_date: injury.injury_date,
            injury_location: injury.injury_location,
            description: injury.description || '',
            treatment_plan: injury.treatment_plan || '',
            expected_recovery_date: injury.expected_recovery_date || '',
            medical_notes: injury.medical_notes || '',
            doctor_name: injury.doctor_name || '',
            physiotherapist_name: injury.physiotherapist_name || '',
            rehabilitation_exercises: injury.rehabilitation_exercises || '',
            follow_up_required: injury.follow_up_required === 1
        });
        setShowModal(true);
    };

    const handleMarkRecovered = async (injuryId) => {
        try {
            const recoveryDate = new Date().toISOString().split('T')[0];
            await apiService.injuries.markRecovered(injuryId, { recovery_date: recoveryDate });
            fetchData();
        } catch (error) {
            console.error('Error marking injury as recovered:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const handleDelete = async () => {
        try {
            await apiService.injuries.delete(deleteConfirm.injuryId);
            setDeleteConfirm({ show: false, injuryId: null });
            fetchData();
        } catch (error) {
            console.error('Error deleting injury:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            player_id: '',
            injury_type: '',
            injury_severity: 'minor',
            injury_date: '',
            injury_location: '',
            description: '',
            treatment_plan: '',
            expected_recovery_date: '',
            medical_notes: '',
            doctor_name: '',
            physiotherapist_name: '',
            rehabilitation_exercises: '',
            follow_up_required: true
        });
    };

    const openModal = () => {
        resetForm();
        setSelectedInjury(null);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedInjury(null);
        resetForm();
    };

    // Filter injuries based on active tab and filters
    const filteredInjuries = injuries.filter(injury => {
        const matchesTab = activeTab === 'all' || 
                          (activeTab === 'active' && !injury.actual_recovery_date) ||
                          (activeTab === 'recovered' && injury.actual_recovery_date);
        const matchesSeverity = filterSeverity === '' || injury.injury_severity === filterSeverity;
        const matchesStatus = filterStatus === '' || 
                             (filterStatus === 'active' && !injury.actual_recovery_date) ||
                             (filterStatus === 'recovered' && injury.actual_recovery_date);
        return matchesTab && matchesSeverity && matchesStatus;
    });

    const getSeverityBadgeClass = (severity) => {
        switch (severity) {
            case 'minor': return 'badge bg-success';
            case 'moderate': return 'badge bg-warning';
            case 'severe': return 'badge bg-danger';
            default: return 'badge bg-secondary';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('hu-HU');
    };

    const getPlayerName = (playerId) => {
        const player = players.find(p => p.id === playerId);
        return player ? player.name : 'Unknown Player';
    };

    if (loading) return <LoadingSpinner />;

    return (
        <ErrorBoundary>
            <div className="container-fluid">
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2>Sérülések kezelése</h2>
                            {canAccessFeature('canManageInjuries') && (
                                <button className="btn btn-primary" onClick={openModal}>
                                    <i className="fas fa-plus me-2"></i>
                                    Új sérülés rögzítése
                                </button>
                            )}
                        </div>

                        {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}

                        {/* Statistics Cards */}
                        {stats && (
                            <div className="row mb-4">
                                <div className="col-md-3">
                                    <div className="card bg-primary text-white">
                                        <div className="card-body">
                                            <h5>Összes sérülés</h5>
                                            <h3>{stats.general.total_injuries || 0}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-danger text-white">
                                        <div className="card-body">
                                            <h5>Aktív sérülések</h5>
                                            <h3>{stats.general.active_injuries || 0}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-success text-white">
                                        <div className="card-body">
                                            <h5>Gyógyult sérülések</h5>
                                            <h3>{stats.general.recovered_injuries || 0}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card bg-warning text-white">
                                        <div className="card-body">
                                            <h5>Súlyos sérülések</h5>
                                            <h3>{stats.general.severe_injuries || 0}</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tabs and Filters */}
                        <div className="card">
                            <div className="card-header">
                                <ul className="nav nav-tabs card-header-tabs">
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('all')}
                                        >
                                            Összes sérülés
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('active')}
                                        >
                                            Aktív sérülések
                                        </button>
                                    </li>
                                    <li className="nav-item">
                                        <button 
                                            className={`nav-link ${activeTab === 'recovered' ? 'active' : ''}`}
                                            onClick={() => setActiveTab('recovered')}
                                        >
                                            Gyógyult sérülések
                                        </button>
                                    </li>
                                </ul>
                                
                                <div className="row mt-3">
                                    <div className="col-md-6">
                                        <select 
                                            className="form-select"
                                            value={filterSeverity}
                                            onChange={(e) => setFilterSeverity(e.target.value)}
                                        >
                                            <option value="">Minden súlyosság</option>
                                            <option value="minor">Enyhe</option>
                                            <option value="moderate">Közepes</option>
                                            <option value="severe">Súlyos</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="card-body">
                                {filteredInjuries.length === 0 ? (
                                    <div className="text-center py-4">
                                        <p className="text-muted">Nincsenek sérülések a megadott szűrőkkel.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Játékos</th>
                                                    <th>Sérülés típusa</th>
                                                    <th>Súlyosság</th>
                                                    <th>Dátum</th>
                                                    <th>Hely</th>
                                                    <th>Állapot</th>
                                                    <th>Műveletek</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredInjuries.map(injury => (
                                                    <tr key={injury.id}>
                                                        <td>{injury.player_name || getPlayerName(injury.player_id)}</td>
                                                        <td>{injury.injury_type}</td>
                                                        <td>
                                                            <span className={getSeverityBadgeClass(injury.injury_severity)}>
                                                                {injury.injury_severity === 'minor' ? 'Enyhe' :
                                                                 injury.injury_severity === 'moderate' ? 'Közepes' : 'Súlyos'}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(injury.injury_date)}</td>
                                                        <td>{injury.injury_location}</td>
                                                        <td>
                                                            {injury.actual_recovery_date ? (
                                                                <span className="badge bg-success">Gyógyult</span>
                                                            ) : (
                                                                <span className="badge bg-danger">Aktív</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="btn-group" role="group">
                                                                <button 
                                                                    className="btn btn-sm btn-outline-primary"
                                                                    onClick={() => handleEdit(injury)}
                                                                    title="Szerkesztés"
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                {!injury.actual_recovery_date && (
                                                                    <button 
                                                                        className="btn btn-sm btn-outline-success"
                                                                        onClick={() => handleMarkRecovered(injury.id)}
                                                                        title="Gyógyultnak jelölés"
                                                                    >
                                                                        <i className="fas fa-check"></i>
                                                                    </button>
                                                                )}
                                                                {user.role === 'admin' && (
                                                                    <button 
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() => setDeleteConfirm({ show: true, injuryId: injury.id })}
                                                                        title="Törlés"
                                                                    >
                                                                        <i className="fas fa-trash"></i>
                                                                    </button>
                                                                )}
                                                            </div>
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

                {/* Injury Modal */}
                {showModal && (
                    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {selectedInjury ? 'Sérülés szerkesztése' : 'Új sérülés rögzítése'}
                                    </h5>
                                    <button type="button" className="btn-close" onClick={closeModal}></button>
                                </div>
                                <form onSubmit={handleSubmit}>
                                    <div className="modal-body">
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Játékos *</label>
                                                    <select 
                                                        className="form-select"
                                                        name="player_id"
                                                        value={formData.player_id}
                                                        onChange={handleInputChange}
                                                        required
                                                    >
                                                        <option value="">Válassz játékost</option>
                                                        {players.map(player => (
                                                            <option key={player.id} value={player.id}>
                                                                {player.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Sérülés súlyossága *</label>
                                                    <select 
                                                        className="form-select"
                                                        name="injury_severity"
                                                        value={formData.injury_severity}
                                                        onChange={handleInputChange}
                                                        required
                                                    >
                                                        <option value="minor">Enyhe</option>
                                                        <option value="moderate">Közepes</option>
                                                        <option value="severe">Súlyos</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Sérülés típusa *</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        name="injury_type"
                                                        value={formData.injury_type}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="pl. Izomhúzódás, törés, stb."
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Sérülés helye *</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        name="injury_location"
                                                        value={formData.injury_location}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="pl. Jobb térd, bal boka, stb."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Sérülés dátuma *</label>
                                                    <input 
                                                        type="date"
                                                        className="form-control"
                                                        name="injury_date"
                                                        value={formData.injury_date}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Várható gyógyulás</label>
                                                    <input 
                                                        type="date"
                                                        className="form-control"
                                                        name="expected_recovery_date"
                                                        value={formData.expected_recovery_date}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Leírás</label>
                                            <textarea 
                                                className="form-control"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Sérülés részletes leírása..."
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Kezelési terv</label>
                                            <textarea 
                                                className="form-control"
                                                name="treatment_plan"
                                                value={formData.treatment_plan}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Kezelési terv részletei..."
                                            />
                                        </div>

                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Orvos neve</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        name="doctor_name"
                                                        value={formData.doctor_name}
                                                        onChange={handleInputChange}
                                                        placeholder="Kezelőorvos neve"
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Fiziotherapeuta</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        name="physiotherapist_name"
                                                        value={formData.physiotherapist_name}
                                                        onChange={handleInputChange}
                                                        placeholder="Fiziotherapeuta neve"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Rehabilitációs gyakorlatok</label>
                                            <textarea 
                                                className="form-control"
                                                name="rehabilitation_exercises"
                                                value={formData.rehabilitation_exercises}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Rehabilitációs gyakorlatok leírása..."
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <label className="form-label">Orvosi megjegyzések</label>
                                            <textarea 
                                                className="form-control"
                                                name="medical_notes"
                                                value={formData.medical_notes}
                                                onChange={handleInputChange}
                                                rows="3"
                                                placeholder="Orvosi megjegyzések..."
                                            />
                                        </div>

                                        <div className="mb-3">
                                            <div className="form-check">
                                                <input 
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    name="follow_up_required"
                                                    checked={formData.follow_up_required}
                                                    onChange={handleInputChange}
                                                />
                                                <label className="form-check-label">
                                                    Követés szükséges
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" className="btn btn-secondary" onClick={closeModal}>
                                            Mégse
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {selectedInjury ? 'Frissítés' : 'Mentés'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                <ConfirmationModal
                    show={deleteConfirm.show}
                    title="Sérülés törlése"
                    message="Biztosan törölni szeretnéd ezt a sérülést? Ez a művelet nem vonható vissza."
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm({ show: false, injuryId: null })}
                    confirmText="Törlés"
                    confirmButtonClass="btn-danger"
                />
            </div>
        </ErrorBoundary>
    );
};

export default Injuries;