import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import { handleApiError, ErrorAlert, ConfirmationModal } from '../utils/errorHandler';

const DevelopmentPlans = () => {
    const { user, isAdminOrCoach } = useContext(AuthContext);
    const [plans, setPlans] = useState([]);
    const [players, setPlayers] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, planId: null });
    const [filters, setFilters] = useState({
        plan_type: '',
        status: 'active',
        season: '2024/2025'
    });

    // Form data
    const [formData, setFormData] = useState({
        player_id: '',
        season: '2024/2025',
        plan_type: 'technical',
        current_level: 1,
        target_level: 5,
        goals: '',
        action_steps: '',
        resources_needed: '',
        deadline: '',
        progress_notes: '',
        coach_notes: ''
    });

    const planTypes = [
        { value: 'technical', label: '⚽ Technikai', color: 'primary' },
        { value: 'physical', label: '💪 Fizikai', color: 'success' },
        { value: 'tactical', label: '🧠 Taktikai', color: 'warning' },
        { value: 'mental', label: '🧘 Mentális', color: 'info' },
        { value: 'academic', label: '📚 Tanulási', color: 'secondary' }
    ];

    const statusOptions = [
        { value: 'active', label: 'Aktív', color: 'success' },
        { value: 'completed', label: 'Befejezett', color: 'primary' },
        { value: 'paused', label: 'Szünetel', color: 'warning' },
        { value: 'cancelled', label: 'Törölve', color: 'danger' }
    ];

    useEffect(() => {
        if (isAdminOrCoach()) {
            fetchPlans();
            fetchPlayers();
            fetchStats();
        }
    }, [isAdminOrCoach, filters]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const response = await apiService.developmentPlans.getAll(filters);
            setPlans(response.data);
        } catch (error) {
            console.error('Plans fetch error:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlayers = async () => {
        try {
            const response = await apiService.players.getAll();
            setPlayers(response.data);
        } catch (error) {
            console.error('Players fetch error:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await apiService.developmentPlans.getStats();
            setStats(response.data.general || {});
        } catch (error) {
            console.error('Stats fetch error:', error);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedPlan) {
                await apiService.developmentPlans.update(selectedPlan.id, formData);
            } else {
                await apiService.developmentPlans.create(formData);
            }
            setShowModal(false);
            resetForm();
            fetchPlans();
            fetchStats();
        } catch (error) {
            console.error('Save error:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const handleEdit = (plan) => {
        setSelectedPlan(plan);
        setFormData({
            player_id: plan.player_id,
            season: plan.season,
            plan_type: plan.plan_type,
            current_level: plan.current_level,
            target_level: plan.target_level,
            goals: plan.goals,
            action_steps: plan.action_steps,
            resources_needed: plan.resources_needed || '',
            deadline: plan.deadline || '',
            progress_notes: plan.progress_notes || '',
            coach_notes: plan.coach_notes || ''
        });
        setShowModal(true);
    };

    const updateProgress = async (planId, newProgress) => {
        try {
            await apiService.developmentPlans.updateProgress(planId, {
                completion_percentage: newProgress,
                progress_notes: `Frissítve: ${new Date().toLocaleDateString('hu-HU')}`
            });
            fetchPlans();
            fetchStats();
        } catch (error) {
            console.error('Progress update error:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const reviewPlan = async (planId, notes) => {
        try {
            await apiService.developmentPlans.review(planId, {
                coach_notes: notes
            });
            fetchPlans();
        } catch (error) {
            console.error('Review error:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const handleDelete = async () => {
        try {
            await apiService.developmentPlans.delete(deleteConfirm.planId);
            setDeleteConfirm({ show: false, planId: null });
            fetchPlans();
            fetchStats();
        } catch (error) {
            console.error('Delete error:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const resetForm = () => {
        setFormData({
            player_id: '',
            season: '2024/2025',
            plan_type: 'technical',
            current_level: 1,
            target_level: 5,
            goals: '',
            action_steps: '',
            resources_needed: '',
            deadline: '',
            progress_notes: '',
            coach_notes: ''
        });
        setSelectedPlan(null);
    };

    const openModal = () => {
        resetForm();
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const getPlanTypeBadge = (type) => {
        const planType = planTypes.find(pt => pt.value === type);
        return planType ? `badge bg-${planType.color}` : 'badge bg-secondary';
    };

    const getStatusBadge = (status) => {
        const statusOption = statusOptions.find(so => so.value === status);
        return statusOption ? `badge bg-${statusOption.color}` : 'badge bg-secondary';
    };

    const getProgressColor = (percentage) => {
        if (percentage >= 80) return 'success';
        if (percentage >= 60) return 'info';
        if (percentage >= 40) return 'warning';
        return 'danger';
    };

    const getPlayerName = (playerId) => {
        const player = players.find(p => p.id === playerId);
        return player ? player.name : 'Unknown Player';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('hu-HU');
    };

    if (!isAdminOrCoach()) {
        return (
            <div className="container mt-4">
                <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Nincs jogosultsága a fejlesztési tervek megtekintésére.
                </div>
            </div>
        );
    }

    if (loading) return <LoadingSpinner />;

    return (
        <ErrorBoundary>
            <div className="container-fluid mt-4">
                <div className="row">
                    <div className="col-12">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2>📋 Egyéni Fejlesztési Tervek</h2>
                            <button 
                                className="btn btn-primary"
                                onClick={openModal}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Új fejlesztési terv
                            </button>
                        </div>

                        {error && <ErrorAlert error={error} onDismiss={() => setError('')} />}

                        {/* Statistics Cards */}
                        <div className="row mb-4">
                            <div className="col-md-2">
                                <div className="card bg-primary text-white">
                                    <div className="card-body text-center">
                                        <h4>{stats.total_plans || 0}</h4>
                                        <small>Összes terv</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <div className="card bg-success text-white">
                                    <div className="card-body text-center">
                                        <h4>{stats.active_plans || 0}</h4>
                                        <small>Aktív tervek</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <div className="card bg-info text-white">
                                    <div className="card-body text-center">
                                        <h4>{stats.completed_plans || 0}</h4>
                                        <small>Befejezettek</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <div className="card bg-warning text-white">
                                    <div className="card-body text-center">
                                        <h4>{Math.round(stats.avg_completion || 0)}%</h4>
                                        <small>Átlag haladás</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <div className="card bg-secondary text-white">
                                    <div className="card-body text-center">
                                        <h4>{stats.technical_plans || 0}</h4>
                                        <small>Technikai</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col-md-2">
                                <div className="card bg-dark text-white">
                                    <div className="card-body text-center">
                                        <h4>{stats.physical_plans || 0}</h4>
                                        <small>Fizikai</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="card mb-4">
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-3">
                                        <label className="form-label">Terv típusa</label>
                                        <select 
                                            className="form-select"
                                            value={filters.plan_type}
                                            onChange={(e) => setFilters({...filters, plan_type: e.target.value})}
                                        >
                                            <option value="">Minden típus</option>
                                            {planTypes.map(type => (
                                                <option key={type.value} value={type.value}>
                                                    {type.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Állapot</label>
                                        <select 
                                            className="form-select"
                                            value={filters.status}
                                            onChange={(e) => setFilters({...filters, status: e.target.value})}
                                        >
                                            <option value="">Minden állapot</option>
                                            {statusOptions.map(status => (
                                                <option key={status.value} value={status.value}>
                                                    {status.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">Szezon</label>
                                        <select 
                                            className="form-select"
                                            value={filters.season}
                                            onChange={(e) => setFilters({...filters, season: e.target.value})}
                                        >
                                            <option value="2024/2025">2024/2025</option>
                                            <option value="2023/2024">2023/2024</option>
                                            <option value="2022/2023">2022/2023</option>
                                        </select>
                                    </div>
                                    <div className="col-md-3">
                                        <label className="form-label">&nbsp;</label>
                                        <button 
                                            className="btn btn-outline-secondary w-100"
                                            onClick={() => setFilters({plan_type: '', status: 'active', season: '2024/2025'})}
                                        >
                                            <i className="fas fa-redo me-2"></i>
                                            Szűrők törlése
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Development Plans Table */}
                        <div className="card">
                            <div className="card-header">
                                <h5>Fejlesztési tervek ({plans.length})</h5>
                            </div>
                            <div className="card-body">
                                {plans.length === 0 ? (
                                    <div className="text-center py-4">
                                        <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                                        <p className="text-muted">Nincsenek fejlesztési tervek a megadott szűrőkkel.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-hover">
                                            <thead>
                                                <tr>
                                                    <th>Játékos</th>
                                                    <th>Típus</th>
                                                    <th>Szint</th>
                                                    <th>Cél</th>
                                                    <th>Haladás</th>
                                                    <th>Állapot</th>
                                                    <th>Határidő</th>
                                                    <th>Műveletek</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {plans.map(plan => (
                                                    <tr key={plan.id}>
                                                        <td><strong>{plan.player_name || getPlayerName(plan.player_id)}</strong></td>
                                                        <td>
                                                            <span className={getPlanTypeBadge(plan.plan_type)}>
                                                                {planTypes.find(pt => pt.value === plan.plan_type)?.label || plan.plan_type}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="badge bg-light text-dark">
                                                                {plan.current_level} → {plan.target_level}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <small title={plan.goals}>
                                                                {plan.goals.substring(0, 50)}{plan.goals.length > 50 ? '...' : ''}
                                                            </small>
                                                        </td>
                                                        <td>
                                                            <div className="progress" style={{height: '20px'}}>
                                                                <div 
                                                                    className={`progress-bar bg-${getProgressColor(plan.completion_percentage || 0)}`}
                                                                    style={{width: `${plan.completion_percentage || 0}%`}}
                                                                >
                                                                    {plan.completion_percentage || 0}%
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={getStatusBadge(plan.status)}>
                                                                {statusOptions.find(so => so.value === plan.status)?.label || plan.status}
                                                            </span>
                                                        </td>
                                                        <td>{formatDate(plan.deadline)}</td>
                                                        <td>
                                                            <div className="btn-group btn-group-sm">
                                                                <button 
                                                                    className="btn btn-outline-primary"
                                                                    onClick={() => handleEdit(plan)}
                                                                    title="Szerkesztés"
                                                                >
                                                                    <i className="fas fa-edit"></i>
                                                                </button>
                                                                <button 
                                                                    className="btn btn-outline-success"
                                                                    onClick={() => {
                                                                        const newProgress = parseInt(prompt('Új haladás (0-100%):', plan.completion_percentage || 0));
                                                                        if (!isNaN(newProgress) && newProgress >= 0 && newProgress <= 100) {
                                                                            updateProgress(plan.id, newProgress);
                                                                        }
                                                                    }}
                                                                    title="Haladás frissítése"
                                                                >
                                                                    <i className="fas fa-chart-line"></i>
                                                                </button>
                                                                <button 
                                                                    className="btn btn-outline-info"
                                                                    onClick={() => {
                                                                        const notes = prompt('Edző megjegyzések:', plan.coach_notes || '');
                                                                        if (notes !== null) {
                                                                            reviewPlan(plan.id, notes);
                                                                        }
                                                                    }}
                                                                    title="Áttekintés"
                                                                >
                                                                    <i className="fas fa-clipboard-check"></i>
                                                                </button>
                                                                {user.role === 'admin' && (
                                                                    <button 
                                                                        className="btn btn-outline-danger"
                                                                        onClick={() => setDeleteConfirm({ show: true, planId: plan.id })}
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

                {/* Development Plan Modal */}
                {showModal && (
                    <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                        <div className="modal-dialog modal-xl">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">
                                        {selectedPlan ? 'Fejlesztési terv szerkesztése' : 'Új fejlesztési terv'}
                                    </h5>
                                    <button 
                                        type="button" 
                                        className="btn-close"
                                        onClick={closeModal}
                                    ></button>
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
                                                        <option value="">Válasszon játékost</option>
                                                        {players.map(player => (
                                                            <option key={player.id} value={player.id}>
                                                                {player.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Terv típusa *</label>
                                                    <select 
                                                        className="form-select"
                                                        name="plan_type"
                                                        value={formData.plan_type}
                                                        onChange={handleInputChange}
                                                        required
                                                    >
                                                        {planTypes.map(type => (
                                                            <option key={type.value} value={type.value}>
                                                                {type.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="row">
                                                    <div className="col-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Jelenlegi szint *</label>
                                                            <select 
                                                                className="form-select"
                                                                name="current_level"
                                                                value={formData.current_level}
                                                                onChange={handleInputChange}
                                                                required
                                                            >
                                                                {[...Array(10)].map((_, i) => (
                                                                    <option key={i+1} value={i+1}>{i+1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="col-6">
                                                        <div className="mb-3">
                                                            <label className="form-label">Cél szint *</label>
                                                            <select 
                                                                className="form-select"
                                                                name="target_level"
                                                                value={formData.target_level}
                                                                onChange={handleInputChange}
                                                                required
                                                            >
                                                                {[...Array(10)].map((_, i) => (
                                                                    <option key={i+1} value={i+1}>{i+1}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Szezon</label>
                                                    <input 
                                                        type="text"
                                                        className="form-control"
                                                        name="season"
                                                        value={formData.season}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Határidő</label>
                                                    <input 
                                                        type="date"
                                                        className="form-control"
                                                        name="deadline"
                                                        value={formData.deadline}
                                                        onChange={handleInputChange}
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Célok *</label>
                                                    <textarea 
                                                        className="form-control"
                                                        rows="4"
                                                        name="goals"
                                                        value={formData.goals}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="Mit szeretne elérni a játékos?"
                                                    ></textarea>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Tevékenységek *</label>
                                                    <textarea 
                                                        className="form-control"
                                                        rows="4"
                                                        name="action_steps"
                                                        value={formData.action_steps}
                                                        onChange={handleInputChange}
                                                        required
                                                        placeholder="Milyen konkrét lépések kellenek?"
                                                    ></textarea>
                                                </div>
                                                <div className="mb-3">
                                                    <label className="form-label">Szükséges erőforrások</label>
                                                    <textarea 
                                                        className="form-control"
                                                        rows="3"
                                                        name="resources_needed"
                                                        value={formData.resources_needed}
                                                        onChange={handleInputChange}
                                                        placeholder="Felszerelések, anyagok, segítség"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="row">
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Haladási jegyzet</label>
                                                    <textarea 
                                                        className="form-control"
                                                        rows="3"
                                                        name="progress_notes"
                                                        value={formData.progress_notes}
                                                        onChange={handleInputChange}
                                                        placeholder="Jelenlegi haladás, eredmények"
                                                    ></textarea>
                                                </div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="mb-3">
                                                    <label className="form-label">Edző megjegyzések</label>
                                                    <textarea 
                                                        className="form-control"
                                                        rows="3"
                                                        name="coach_notes"
                                                        value={formData.coach_notes}
                                                        onChange={handleInputChange}
                                                        placeholder="Edző észrevételei, javaslatok"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="modal-footer">
                                        <button 
                                            type="button" 
                                            className="btn btn-secondary"
                                            onClick={closeModal}
                                        >
                                            Mégse
                                        </button>
                                        <button type="submit" className="btn btn-primary">
                                            {selectedPlan ? 'Frissítés' : 'Létrehozás'}
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
                    title="Fejlesztési terv törlése"
                    message="Biztosan törölni szeretné ezt a fejlesztési tervet? Ez a művelet nem vonható vissza."
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteConfirm({ show: false, planId: null })}
                    confirmText="Törlés"
                    confirmButtonClass="btn-danger"
                />
            </div>
        </ErrorBoundary>
    );
};

export default DevelopmentPlans;