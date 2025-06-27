import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './DevelopmentPlanner.css';

const DevelopmentPlanner = ({ userRole, playerId, teamId }) => {
    const [players, setPlayers] = useState([]);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [developmentPlans, setDevelopmentPlans] = useState([]);
    const [skillsAssessments, setSkillsAssessments] = useState([]);
    const [activeAssessment, setActiveAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('plans');
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showAssessmentModal, setShowAssessmentModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        plan_type: '',
        season: '2024-25'
    });

    // Fetch players based on role
    const fetchPlayers = useCallback(async () => {
        try {
            let response;
            if (userRole === 'parent' && playerId) {
                response = await apiService.players.getById(playerId);
                setPlayers([response.data]);
                setSelectedPlayer(response.data);
            } else if (teamId) {
                response = await apiService.players.getByTeam(teamId);
                setPlayers(response.data);
            } else {
                response = await apiService.players.getAll();
                setPlayers(response.data);
            }
        } catch (err) {
            setError('Játékosok betöltése sikertelen: ' + err.message);
        }
    }, [userRole, playerId, teamId]);

    // Fetch development plans
    const fetchDevelopmentPlans = useCallback(async (player) => {
        if (!player) return;
        
        try {
            const response = await apiService.developmentPlans.getByPlayer(player.id);
            setDevelopmentPlans(response.data);
        } catch (err) {
            console.error('Fejlesztési tervek betöltése sikertelen:', err);
            setDevelopmentPlans([]);
        }
    }, []);

    // Fetch skills assessments
    const fetchSkillsAssessments = useCallback(async (player) => {
        if (!player) return;
        
        try {
            // This would be a new API endpoint for skills assessments
            const response = await apiService.api.get(`/skills-assessments/player/${player.id}`);
            setSkillsAssessments(response.data);
        } catch (err) {
            console.error('Készségfelmérések betöltése sikertelen:', err);
            setSkillsAssessments([]);
        }
    }, []);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    useEffect(() => {
        if (selectedPlayer) {
            setLoading(true);
            Promise.all([
                fetchDevelopmentPlans(selectedPlayer),
                fetchSkillsAssessments(selectedPlayer)
            ]).finally(() => setLoading(false));
        }
    }, [selectedPlayer, fetchDevelopmentPlans, fetchSkillsAssessments]);

    // Development Plan Form Component
    const DevelopmentPlanForm = ({ plan, onSave, onCancel }) => {
        const [formData, setFormData] = useState({
            player_id: selectedPlayer?.id || '',
            plan_type: plan?.plan_type || 'individual',
            target_skills: plan?.target_skills || '',
            goals: plan?.goals || '',
            timeline: plan?.timeline || '3 months',
            priority: plan?.priority || 'medium',
            season: plan?.season || '2024-25',
            specific_objectives: plan?.specific_objectives || '',
            success_metrics: plan?.success_metrics || '',
            coach_notes: plan?.coach_notes || ''
        });
        const [formErrors, setFormErrors] = useState({});
        const [saving, setSaving] = useState(false);

        const validateForm = () => {
            const errors = {};
            if (!formData.target_skills) errors.target_skills = 'Célkészségek megadása kötelező';
            if (!formData.goals) errors.goals = 'Célok megadása kötelező';
            if (!formData.specific_objectives) errors.specific_objectives = 'Konkrét célkitűzések megadása kötelező';
            if (!formData.success_metrics) errors.success_metrics = 'Sikermérők megadása kötelező';
            
            return errors;
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            const errors = validateForm();
            setFormErrors(errors);

            if (Object.keys(errors).length === 0) {
                setSaving(true);
                try {
                    if (plan?.id) {
                        await apiService.developmentPlans.update(plan.id, formData);
                    } else {
                        await apiService.developmentPlans.create(formData);
                    }
                    onSave();
                    setShowPlanModal(false);
                } catch (err) {
                    setError('Fejlesztési terv mentése sikertelen: ' + err.message);
                } finally {
                    setSaving(false);
                }
            }
        };

        return (
            <form onSubmit={handleSubmit} className="development-plan-form">
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="plan_type" className="form-label">
                                Terv típusa <span className="text-danger">*</span>
                            </label>
                            <select
                                id="plan_type"
                                className="form-select"
                                value={formData.plan_type}
                                onChange={(e) => setFormData({...formData, plan_type: e.target.value})}
                            >
                                <option value="individual">Egyéni fejlesztés</option>
                                <option value="technical">Technikai fejlesztés</option>
                                <option value="tactical">Taktikai fejlesztés</option>
                                <option value="physical">Fizikai fejlesztés</option>
                                <option value="mental">Mentális fejlesztés</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="priority" className="form-label">Prioritás</label>
                            <select
                                id="priority"
                                className="form-select"
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                            >
                                <option value="low">Alacsony</option>
                                <option value="medium">Közepes</option>
                                <option value="high">Magas</option>
                                <option value="critical">Kritikus</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="timeline" className="form-label">Időkeret</label>
                            <select
                                id="timeline"
                                className="form-select"
                                value={formData.timeline}
                                onChange={(e) => setFormData({...formData, timeline: e.target.value})}
                            >
                                <option value="1 month">1 hónap</option>
                                <option value="3 months">3 hónap</option>
                                <option value="6 months">6 hónap</option>
                                <option value="1 year">1 év</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="season" className="form-label">Szezon</label>
                            <select
                                id="season"
                                className="form-select"
                                value={formData.season}
                                onChange={(e) => setFormData({...formData, season: e.target.value})}
                            >
                                <option value="2024-25">2024-25</option>
                                <option value="2023-24">2023-24</option>
                                <option value="2022-23">2022-23</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="target_skills" className="form-label">
                        Célkészségek <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="target_skills"
                        className={`form-control ${formErrors.target_skills ? 'is-invalid' : ''}`}
                        value={formData.target_skills}
                        onChange={(e) => setFormData({...formData, target_skills: e.target.value})}
                        rows="3"
                        placeholder="Milyen készségeket szeretnél fejleszteni?"
                        aria-describedby="target_skills_error"
                    />
                    {formErrors.target_skills && (
                        <div id="target_skills_error" className="invalid-feedback">
                            {formErrors.target_skills}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="goals" className="form-label">
                        Célok <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="goals"
                        className={`form-control ${formErrors.goals ? 'is-invalid' : ''}`}
                        value={formData.goals}
                        onChange={(e) => setFormData({...formData, goals: e.target.value})}
                        rows="3"
                        placeholder="Mik a fő célok?"
                        aria-describedby="goals_error"
                    />
                    {formErrors.goals && (
                        <div id="goals_error" className="invalid-feedback">
                            {formErrors.goals}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="specific_objectives" className="form-label">
                        Konkrét célkitűzések <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="specific_objectives"
                        className={`form-control ${formErrors.specific_objectives ? 'is-invalid' : ''}`}
                        value={formData.specific_objectives}
                        onChange={(e) => setFormData({...formData, specific_objectives: e.target.value})}
                        rows="4"
                        placeholder="SMART célkitűzések (Specifikus, Mérhető, Elérhető, Releváns, Időzített)"
                        aria-describedby="specific_objectives_error"
                    />
                    {formErrors.specific_objectives && (
                        <div id="specific_objectives_error" className="invalid-feedback">
                            {formErrors.specific_objectives}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="success_metrics" className="form-label">
                        Sikermérők <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="success_metrics"
                        className={`form-control ${formErrors.success_metrics ? 'is-invalid' : ''}`}
                        value={formData.success_metrics}
                        onChange={(e) => setFormData({...formData, success_metrics: e.target.value})}
                        rows="3"
                        placeholder="Hogyan méred a siker elérését?"
                        aria-describedby="success_metrics_error"
                    />
                    {formErrors.success_metrics && (
                        <div id="success_metrics_error" className="invalid-feedback">
                            {formErrors.success_metrics}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="coach_notes" className="form-label">Edzői megjegyzések</label>
                    <textarea
                        id="coach_notes"
                        className="form-control"
                        value={formData.coach_notes}
                        onChange={(e) => setFormData({...formData, coach_notes: e.target.value})}
                        rows="3"
                        placeholder="További megjegyzések, javaslatok..."
                    />
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary me-2"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Mégse
                    </button>
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Mentés...
                            </>
                        ) : (
                            plan?.id ? 'Frissítés' : 'Létrehozás'
                        )}
                    </button>
                </div>
            </form>
        );
    };

    // Skills Assessment Component
    const SkillsAssessment = ({ assessment, onSave, onCancel }) => {
        const skillCategories = [
            { key: 'technical', name: 'Technikai készségek', skills: ['Labdavezentés', 'Passzolás', 'Lövés', 'Első érintés', 'Cselezés'] },
            { key: 'tactical', name: 'Taktikai készségek', skills: ['Pozicionálás', 'Döntéshozatal', 'Csapatjáték', 'Védekezés', 'Támadás'] },
            { key: 'physical', name: 'Fizikai készségek', skills: ['Gyorsaság', 'Állóképesség', 'Erő', 'Koordináció', 'Egyensúly'] },
            { key: 'mental', name: 'Mentális készségek', skills: ['Koncentráció', 'Motiváció', 'Stressztűrés', 'Vezetés', 'Kommunikáció'] }
        ];

        const [assessmentData, setAssessmentData] = useState(
            assessment?.skills_data || skillCategories.reduce((acc, category) => {
                acc[category.key] = category.skills.reduce((skillAcc, skill) => {
                    skillAcc[skill] = { rating: 0, notes: '' };
                    return skillAcc;
                }, {});
                return acc;
            }, {})
        );
        const [generalNotes, setGeneralNotes] = useState(assessment?.general_notes || '');
        const [saving, setSaving] = useState(false);

        const handleSkillRating = (category, skill, rating) => {
            setAssessmentData(prev => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [skill]: {
                        ...prev[category][skill],
                        rating: rating
                    }
                }
            }));
        };

        const handleSkillNotes = (category, skill, notes) => {
            setAssessmentData(prev => ({
                ...prev,
                [category]: {
                    ...prev[category],
                    [skill]: {
                        ...prev[category][skill],
                        notes: notes
                    }
                }
            }));
        };

        const handleSave = async () => {
            setSaving(true);
            try {
                const data = {
                    player_id: selectedPlayer.id,
                    assessment_date: new Date().toISOString().split('T')[0],
                    skills_data: assessmentData,
                    general_notes: generalNotes,
                    assessor_id: 1 // This would come from the authenticated user
                };

                if (assessment?.id) {
                    await apiService.api.put(`/skills-assessments/${assessment.id}`, data);
                } else {
                    await apiService.api.post('/skills-assessments', data);
                }
                
                onSave();
                setShowAssessmentModal(false);
            } catch (err) {
                setError('Készségfelmérés mentése sikertelen: ' + err.message);
            } finally {
                setSaving(false);
            }
        };

        const calculateCategoryAverage = (category) => {
            const skills = assessmentData[category];
            const ratings = Object.values(skills).map(skill => skill.rating).filter(rating => rating > 0);
            return ratings.length > 0 ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : 0;
        };

        return (
            <div className="skills-assessment">
                <div className="assessment-header mb-4">
                    <h6>Készségfelmérés - {selectedPlayer?.name}</h6>
                    <small className="text-muted">
                        Értékelés: 1 (fejlesztésre szorul) - 5 (kiváló)
                    </small>
                </div>

                {skillCategories.map(category => (
                    <div key={category.key} className="skill-category mb-4">
                        <div className="category-header">
                            <h6 className="category-title">
                                {category.name}
                                <span className="category-average ms-2">
                                    Átlag: {calculateCategoryAverage(category.key)}/5
                                </span>
                            </h6>
                        </div>
                        
                        <div className="skills-grid">
                            {category.skills.map(skill => (
                                <div key={skill} className="skill-item">
                                    <div className="skill-header">
                                        <label className="skill-label">{skill}</label>
                                        <div className="skill-rating">
                                            {[1, 2, 3, 4, 5].map(rating => (
                                                <button
                                                    key={rating}
                                                    type="button"
                                                    className={`rating-btn ${
                                                        assessmentData[category.key][skill].rating >= rating ? 'active' : ''
                                                    }`}
                                                    onClick={() => handleSkillRating(category.key, skill, rating)}
                                                >
                                                    ⭐
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <textarea
                                        className="form-control skill-notes"
                                        placeholder="Megjegyzések..."
                                        value={assessmentData[category.key][skill].notes}
                                        onChange={(e) => handleSkillNotes(category.key, skill, e.target.value)}
                                        rows="2"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className="general-notes mb-4">
                    <label className="form-label">Általános megjegyzések</label>
                    <textarea
                        className="form-control"
                        value={generalNotes}
                        onChange={(e) => setGeneralNotes(e.target.value)}
                        rows="4"
                        placeholder="Általános észrevételek, fejlesztési javaslatok..."
                    />
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        className="btn btn-secondary me-2"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Mégse
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" />
                                Mentés...
                            </>
                        ) : (
                            assessment?.id ? 'Frissítés' : 'Mentés'
                        )}
                    </button>
                </div>
            </div>
        );
    };

    // Update progress handler
    const handleUpdateProgress = async (planId, progressPercentage) => {
        try {
            await apiService.developmentPlans.updateProgress(planId, { 
                progress_percentage: progressPercentage,
                last_updated: new Date().toISOString()
            });
            await fetchDevelopmentPlans(selectedPlayer);
        } catch (err) {
            setError('Haladás frissítése sikertelen: ' + err.message);
        }
    };

    // Delete plan handler
    const handleDeletePlan = async (planId) => {
        if (window.confirm('Biztosan törölni szeretnéd ezt a fejlesztési tervet?')) {
            try {
                await apiService.developmentPlans.delete(planId);
                await fetchDevelopmentPlans(selectedPlayer);
            } catch (err) {
                setError('Fejlesztési terv törlése sikertelen: ' + err.message);
            }
        }
    };

    if (loading && !selectedPlayer) return <LoadingSpinner />;

    return (
        <div className="development-planner">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Fejlesztési tervező</h3>
                {selectedPlayer && (userRole === 'admin' || userRole === 'coach') && (
                    <div className="btn-group">
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setEditingPlan(null);
                                setShowPlanModal(true);
                            }}
                        >
                            Új terv
                        </button>
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => {
                                setActiveAssessment(null);
                                setShowAssessmentModal(true);
                            }}
                        >
                            Készségfelmérés
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Player Selection and Filters */}
            <div className="controls-section mb-4">
                <div className="row g-3">
                    {userRole !== 'parent' && (
                        <div className="col-md-4">
                            <label className="form-label">Játékos</label>
                            <select
                                className="form-select"
                                value={selectedPlayer?.id || ''}
                                onChange={(e) => {
                                    const player = players.find(p => p.id === parseInt(e.target.value));
                                    setSelectedPlayer(player);
                                }}
                                aria-label="Játékos kiválasztása"
                            >
                                <option value="">Válassz játékost...</option>
                                {players.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name} ({player.position || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div className="col-md-3">
                        <label className="form-label">Státusz</label>
                        <select
                            className="form-select"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
                        >
                            <option value="">Minden státusz</option>
                            <option value="active">Aktív</option>
                            <option value="completed">Befejezett</option>
                            <option value="paused">Szüneteltetve</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Terv típusa</label>
                        <select
                            className="form-select"
                            value={filters.plan_type}
                            onChange={(e) => setFilters(prev => ({...prev, plan_type: e.target.value}))}
                        >
                            <option value="">Minden típus</option>
                            <option value="individual">Egyéni</option>
                            <option value="technical">Technikai</option>
                            <option value="tactical">Taktikai</option>
                            <option value="physical">Fizikai</option>
                            <option value="mental">Mentális</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Szezon</label>
                        <select
                            className="form-select"
                            value={filters.season}
                            onChange={(e) => setFilters(prev => ({...prev, season: e.target.value}))}
                        >
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>
                </div>
            </div>

            {selectedPlayer ? (
                <>
                    {/* Player Info Header */}
                    <div className="player-header mb-4">
                        <h4>{selectedPlayer.name}</h4>
                        <div className="player-details">
                            <span className="badge bg-primary me-2">{selectedPlayer.position || 'Pozíció nincs megadva'}</span>
                            <span className="badge bg-secondary me-2">{selectedPlayer.team_name || 'Nincs csapat'}</span>
                            <span className="badge bg-info">
                                {new Date().getFullYear() - new Date(selectedPlayer.birth_date).getFullYear()} év
                            </span>
                        </div>
                    </div>

                    {/* Development Tabs */}
                    <div className="development-tabs">
                        <ul className="nav nav-tabs mb-4" role="tablist">
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'plans' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('plans')}
                                    type="button"
                                    role="tab"
                                >
                                    Fejlesztési tervek ({developmentPlans.length})
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'assessments' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('assessments')}
                                    type="button"
                                    role="tab"
                                >
                                    Készségfelmérések ({skillsAssessments.length})
                                </button>
                            </li>
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'progress' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('progress')}
                                    type="button"
                                    role="tab"
                                >
                                    Fejlődési áttekintés
                                </button>
                            </li>
                        </ul>

                        <div className="tab-content">
                            {loading ? (
                                <div className="text-center py-5">
                                    <LoadingSpinner />
                                    <p className="text-muted mt-2">Adatok betöltése...</p>
                                </div>
                            ) : (
                                <>
                                    {/* Development Plans Tab */}
                                    {activeTab === 'plans' && (
                                        <div className="development-plans">
                                            {developmentPlans.length === 0 ? (
                                                <div className="text-center py-5">
                                                    <h5 className="text-muted">Nincsenek fejlesztési tervek</h5>
                                                    <p className="text-muted">Hozz létre egy új tervet a kezdéshez</p>
                                                </div>
                                            ) : (
                                                <div className="plans-list">
                                                    {developmentPlans
                                                        .filter(plan => 
                                                            (filters.status === '' || plan.status === filters.status) &&
                                                            (filters.plan_type === '' || plan.plan_type === filters.plan_type) &&
                                                            (filters.season === '' || plan.season === filters.season)
                                                        )
                                                        .map(plan => (
                                                            <div key={plan.id} className="plan-card">
                                                                <div className="plan-header">
                                                                    <div className="plan-title">
                                                                        <h6>{plan.target_skills}</h6>
                                                                        <div className="plan-meta">
                                                                            <span className={`badge plan-type ${plan.plan_type}`}>
                                                                                {plan.plan_type === 'individual' ? 'Egyéni' :
                                                                                 plan.plan_type === 'technical' ? 'Technikai' :
                                                                                 plan.plan_type === 'tactical' ? 'Taktikai' :
                                                                                 plan.plan_type === 'physical' ? 'Fizikai' :
                                                                                 plan.plan_type === 'mental' ? 'Mentális' : plan.plan_type}
                                                                            </span>
                                                                            <span className={`badge priority ${plan.priority}`}>
                                                                                {plan.priority === 'low' ? 'Alacsony' :
                                                                                 plan.priority === 'medium' ? 'Közepes' :
                                                                                 plan.priority === 'high' ? 'Magas' :
                                                                                 plan.priority === 'critical' ? 'Kritikus' : plan.priority}
                                                                            </span>
                                                                            <span className="badge bg-secondary">{plan.timeline}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="plan-actions">
                                                                        {(userRole === 'admin' || userRole === 'coach') && (
                                                                            <>
                                                                                <button
                                                                                    className="btn btn-sm btn-outline-primary"
                                                                                    onClick={() => {
                                                                                        setEditingPlan(plan);
                                                                                        setShowPlanModal(true);
                                                                                    }}
                                                                                    title="Szerkesztés"
                                                                                >
                                                                                    ✏️
                                                                                </button>
                                                                                <button
                                                                                    className="btn btn-sm btn-outline-danger"
                                                                                    onClick={() => handleDeletePlan(plan.id)}
                                                                                    title="Törlés"
                                                                                >
                                                                                    🗑️
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <div className="plan-content">
                                                                    <div className="plan-goals">
                                                                        <strong>Célok:</strong>
                                                                        <p>{plan.goals}</p>
                                                                    </div>
                                                                    
                                                                    <div className="plan-objectives">
                                                                        <strong>Konkrét célkitűzések:</strong>
                                                                        <p>{plan.specific_objectives}</p>
                                                                    </div>

                                                                    <div className="plan-progress">
                                                                        <div className="d-flex justify-content-between align-items-center">
                                                                            <strong>Haladás:</strong>
                                                                            <span>{plan.progress_percentage || 0}%</span>
                                                                        </div>
                                                                        <div className="progress mt-2">
                                                                            <div 
                                                                                className="progress-bar" 
                                                                                style={{width: `${plan.progress_percentage || 0}%`}}
                                                                            ></div>
                                                                        </div>
                                                                        {(userRole === 'admin' || userRole === 'coach') && (
                                                                            <div className="progress-controls mt-2">
                                                                                <label className="form-label">Haladás frissítése:</label>
                                                                                <div className="input-group input-group-sm">
                                                                                    <input
                                                                                        type="range"
                                                                                        className="form-range"
                                                                                        min="0"
                                                                                        max="100"
                                                                                        value={plan.progress_percentage || 0}
                                                                                        onChange={(e) => handleUpdateProgress(plan.id, parseInt(e.target.value))}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {plan.coach_notes && (
                                                                        <div className="plan-notes">
                                                                            <strong>Edzői megjegyzések:</strong>
                                                                            <p className="text-muted">{plan.coach_notes}</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="plan-footer">
                                                                    <small className="text-muted">
                                                                        Létrehozva: {new Date(plan.created_at).toLocaleDateString('hu-HU')}
                                                                        {plan.last_updated && (
                                                                            <> • Frissítve: {new Date(plan.last_updated).toLocaleDateString('hu-HU')}</>
                                                                        )}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Skills Assessments Tab */}
                                    {activeTab === 'assessments' && (
                                        <div className="skills-assessments">
                                            {skillsAssessments.length === 0 ? (
                                                <div className="text-center py-5">
                                                    <h5 className="text-muted">Nincsenek készségfelmérések</h5>
                                                    <p className="text-muted">Készíts egy új felmérést a kezdéshez</p>
                                                </div>
                                            ) : (
                                                <div className="assessments-list">
                                                    {skillsAssessments.map(assessment => (
                                                        <div key={assessment.id} className="assessment-card">
                                                            <div className="assessment-header">
                                                                <h6>Készségfelmérés</h6>
                                                                <div className="assessment-meta">
                                                                    <span className="badge bg-info">
                                                                        {new Date(assessment.assessment_date).toLocaleDateString('hu-HU')}
                                                                    </span>
                                                                    {(userRole === 'admin' || userRole === 'coach') && (
                                                                        <button
                                                                            className="btn btn-sm btn-outline-primary"
                                                                            onClick={() => {
                                                                                setActiveAssessment(assessment);
                                                                                setShowAssessmentModal(true);
                                                                            }}
                                                                            title="Szerkesztés"
                                                                        >
                                                                            ✏️
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Assessment content would be displayed here */}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Progress Overview Tab */}
                                    {activeTab === 'progress' && (
                                        <div className="progress-overview">
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <div className="overview-card">
                                                        <h6>Aktív tervek</h6>
                                                        <div className="stat-value">
                                                            {developmentPlans.filter(p => p.status === 'active').length}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-md-6">
                                                    <div className="overview-card">
                                                        <h6>Befejezett tervek</h6>
                                                        <div className="stat-value">
                                                            {developmentPlans.filter(p => p.status === 'completed').length}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="progress-summary mt-4">
                                                <h6>Átlagos haladás kategóriánként</h6>
                                                {['technical', 'tactical', 'physical', 'mental'].map(type => {
                                                    const typePlans = developmentPlans.filter(p => p.plan_type === type);
                                                    const avgProgress = typePlans.length > 0 
                                                        ? typePlans.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / typePlans.length
                                                        : 0;
                                                    
                                                    return (
                                                        <div key={type} className="progress-category">
                                                            <div className="d-flex justify-content-between">
                                                                <span>
                                                                    {type === 'technical' ? 'Technikai' :
                                                                     type === 'tactical' ? 'Taktikai' :
                                                                     type === 'physical' ? 'Fizikai' :
                                                                     type === 'mental' ? 'Mentális' : type}
                                                                </span>
                                                                <span>{avgProgress.toFixed(1)}%</span>
                                                            </div>
                                                            <div className="progress mt-1">
                                                                <div 
                                                                    className="progress-bar" 
                                                                    style={{width: `${avgProgress}%`}}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center py-5">
                    <div className="empty-state">
                        <h5 className="text-muted">Válassz egy játékost a fejlesztési tervek megtekintéséhez</h5>
                        <p className="text-muted">
                            {userRole === 'parent' 
                                ? 'Nincsenek elérhető gyermekek' 
                                : 'Válassz egy játékost a legördülő menüből'
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Development Plan Modal */}
            {showPlanModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingPlan ? 'Fejlesztési terv szerkesztése' : 'Új fejlesztési terv'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowPlanModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <DevelopmentPlanForm
                                    plan={editingPlan}
                                    onSave={() => fetchDevelopmentPlans(selectedPlayer)}
                                    onCancel={() => setShowPlanModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Skills Assessment Modal */}
            {showAssessmentModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Készségfelmérés</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAssessmentModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <SkillsAssessment
                                    assessment={activeAssessment}
                                    onSave={() => fetchSkillsAssessments(selectedPlayer)}
                                    onCancel={() => setShowAssessmentModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

DevelopmentPlanner.propTypes = {
    userRole: PropTypes.string.isRequired,
    playerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default DevelopmentPlanner;