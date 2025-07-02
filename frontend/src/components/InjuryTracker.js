import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import './InjuryTracker.css';

/**
 * InjuryTracker Component
 * Comprehensive injury and medical management system
 */
const InjuryTracker = ({ userRole, playerId, teamId }) => {
    const [players, setPlayers] = useState([]);
    const [injuries, setInjuries] = useState([]);
    const [medicalRecords, setMedicalRecords] = useState([]);
    const [injuryStats, setInjuryStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('active');
    const [showInjuryModal, setShowInjuryModal] = useState(false);
    const [showMedicalModal, setShowMedicalModal] = useState(false);
    const [editingInjury, setEditingInjury] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [filters, setFilters] = useState({
        status: 'active',
        injury_type: '',
        severity: '',
        team_id: teamId || '',
        season: '2024-25'
    });

    // Fetch players based on role
    const fetchPlayers = useCallback(async () => {
        try {
            let response;
            if (userRole === 'parent' && playerId) {
                response = await apiService.players.getById(playerId);
                setPlayers([response.data]);
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

    // Fetch injuries and medical data
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const [
                injuriesResponse,
                statsResponse,
                medicalResponse
            ] = await Promise.all([
                filters.status === 'active' 
                    ? apiService.injuries.getActive()
                    : apiService.injuries.getAll(),
                apiService.injuries.getStats(),
                apiService.api.get('/medical-records')
            ]);

            let filteredInjuries = injuriesResponse.data;

            // Apply filters
            if (filters.injury_type) {
                filteredInjuries = filteredInjuries.filter(injury => 
                    injury.injury_type === filters.injury_type
                );
            }
            if (filters.severity) {
                filteredInjuries = filteredInjuries.filter(injury => 
                    injury.injury_severity === filters.severity
                );
            }
            if (filters.team_id) {
                filteredInjuries = filteredInjuries.filter(injury => 
                    injury.team_id == filters.team_id
                );
            }

            setInjuries(filteredInjuries);
            setInjuryStats(statsResponse.data);
            setMedicalRecords(medicalResponse.data);
        } catch (err) {
            setError('Sérülés adatok betöltése sikertelen: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchPlayers();
    }, [fetchPlayers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Injury Form Component
    const InjuryForm = ({ injury, onSave, onCancel }) => {
        const [formData, setFormData] = useState({
            player_id: injury?.player_id || selectedPlayer?.id || '',
            injury_type: injury?.injury_type || '',
            injury_severity: injury?.injury_severity || 'minor',
            injury_location: injury?.injury_location || '',
            injury_date: injury?.injury_date || new Date().toISOString().split('T')[0],
            expected_recovery_date: injury?.expected_recovery_date || '',
            injury_mechanism: injury?.injury_mechanism || 'training',
            description: injury?.description || '',
            initial_treatment: injury?.initial_treatment || '',
            follow_up_required: injury?.follow_up_required || false,
            return_to_play_protocol: injury?.return_to_play_protocol || '',
            medical_clearance_required: injury?.medical_clearance_required || true
        });
        const [formErrors, setFormErrors] = useState({});
        const [saving, setSaving] = useState(false);

        const injuryTypes = [
            'Muscle strain', 'Muscle tear', 'Ligament sprain', 'Ligament tear',
            'Bone fracture', 'Concussion', 'Contusion', 'Cut/Laceration',
            'Ankle sprain', 'Knee injury', 'Hamstring injury', 'Groin injury',
            'Shin splints', 'Achilles injury', 'Back injury', 'Shoulder injury',
            'Wrist injury', 'Other'
        ];

        const bodyParts = [
            'Head', 'Neck', 'Shoulder', 'Arm', 'Elbow', 'Wrist', 'Hand',
            'Chest', 'Ribs', 'Back', 'Abdomen', 'Hip', 'Thigh', 'Knee',
            'Shin', 'Calf', 'Ankle', 'Foot', 'Toe'
        ];

        const validateForm = () => {
            const errors = {};
            if (!formData.player_id) errors.player_id = 'Játékos kiválasztása kötelező';
            if (!formData.injury_type) errors.injury_type = 'Sérülés típusa kötelező';
            if (!formData.injury_location) errors.injury_location = 'Sérülés helye kötelező';
            if (!formData.injury_date) errors.injury_date = 'Sérülés dátuma kötelező';
            if (!formData.description) errors.description = 'Leírás megadása kötelező';
            
            return errors;
        };

        const handleSubmit = async (e) => {
            e.preventDefault();
            const errors = validateForm();
            setFormErrors(errors);

            if (Object.keys(errors).length === 0) {
                setSaving(true);
                try {
                    if (injury?.id) {
                        await apiService.injuries.update(injury.id, formData);
                    } else {
                        await apiService.injuries.create(formData);
                    }
                    onSave();
                    setShowInjuryModal(false);
                } catch (err) {
                    setError('Sérülés mentése sikertelen: ' + err.message);
                } finally {
                    setSaving(false);
                }
            }
        };

        return (
            <form onSubmit={handleSubmit} className="injury-form">
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="player_id" className="form-label">
                                Játékos <span className="text-danger">*</span>
                            </label>
                            <select
                                id="player_id"
                                className={`form-select ${formErrors.player_id ? 'is-invalid' : ''}`}
                                value={formData.player_id}
                                onChange={(e) => setFormData({...formData, player_id: e.target.value})}
                                aria-describedby="player_id_error"
                            >
                                <option value="">Válassz játékost...</option>
                                {players.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name} ({player.position || 'N/A'})
                                    </option>
                                ))}
                            </select>
                            {formErrors.player_id && (
                                <div id="player_id_error" className="invalid-feedback">
                                    {formErrors.player_id}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="injury_severity" className="form-label">Súlyosság</label>
                            <select
                                id="injury_severity"
                                className="form-select"
                                value={formData.injury_severity}
                                onChange={(e) => setFormData({...formData, injury_severity: e.target.value})}
                            >
                                <option value="minor">Enyhe</option>
                                <option value="moderate">Közepes</option>
                                <option value="major">Súlyos</option>
                                <option value="severe">Kritikus</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="injury_type" className="form-label">
                                Sérülés típusa <span className="text-danger">*</span>
                            </label>
                            <select
                                id="injury_type"
                                className={`form-select ${formErrors.injury_type ? 'is-invalid' : ''}`}
                                value={formData.injury_type}
                                onChange={(e) => setFormData({...formData, injury_type: e.target.value})}
                                aria-describedby="injury_type_error"
                            >
                                <option value="">Válassz típust...</option>
                                {injuryTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            {formErrors.injury_type && (
                                <div id="injury_type_error" className="invalid-feedback">
                                    {formErrors.injury_type}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="injury_location" className="form-label">
                                Érintett testrész <span className="text-danger">*</span>
                            </label>
                            <select
                                id="injury_location"
                                className={`form-select ${formErrors.injury_location ? 'is-invalid' : ''}`}
                                value={formData.injury_location}
                                onChange={(e) => setFormData({...formData, injury_location: e.target.value})}
                                aria-describedby="injury_location_error"
                            >
                                <option value="">Válassz testrészt...</option>
                                {bodyParts.map(part => (
                                    <option key={part} value={part}>{part}</option>
                                ))}
                            </select>
                            {formErrors.injury_location && (
                                <div id="injury_location_error" className="invalid-feedback">
                                    {formErrors.injury_location}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="injury_date" className="form-label">
                                Sérülés dátuma <span className="text-danger">*</span>
                            </label>
                            <input
                                type="date"
                                id="injury_date"
                                className={`form-control ${formErrors.injury_date ? 'is-invalid' : ''}`}
                                value={formData.injury_date}
                                onChange={(e) => setFormData({...formData, injury_date: e.target.value})}
                                aria-describedby="injury_date_error"
                            />
                            {formErrors.injury_date && (
                                <div id="injury_date_error" className="invalid-feedback">
                                    {formErrors.injury_date}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="expected_recovery_date" className="form-label">Várható felgyógyulás</label>
                            <input
                                type="date"
                                id="expected_recovery_date"
                                className="form-control"
                                value={formData.expected_recovery_date}
                                onChange={(e) => setFormData({...formData, expected_recovery_date: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="injury_mechanism" className="form-label">Sérülés mechanizmusa</label>
                    <select
                        id="injury_mechanism"
                        className="form-select"
                        value={formData.injury_mechanism}
                        onChange={(e) => setFormData({...formData, injury_mechanism: e.target.value})}
                    >
                        <option value="training">Edzés</option>
                        <option value="match">Mérkőzés</option>
                        <option value="warm-up">Bemelegítés</option>
                        <option value="cool-down">Levezetés</option>
                        <option value="off-field">Pályán kívül</option>
                        <option value="unknown">Ismeretlen</option>
                    </select>
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="description" className="form-label">
                        Részletes leírás <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="description"
                        className={`form-control ${formErrors.description ? 'is-invalid' : ''}`}
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows="3"
                        placeholder="Hogyan történt a sérülés? Milyen tünetek jelentkeztek?"
                        aria-describedby="description_error"
                    />
                    {formErrors.description && (
                        <div id="description_error" className="invalid-feedback">
                            {formErrors.description}
                        </div>
                    )}
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="initial_treatment" className="form-label">Kezdeti kezelés</label>
                    <textarea
                        id="initial_treatment"
                        className="form-control"
                        value={formData.initial_treatment}
                        onChange={(e) => setFormData({...formData, initial_treatment: e.target.value})}
                        rows="3"
                        placeholder="Milyen azonnali kezelést kapott a játékos?"
                    />
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="return_to_play_protocol" className="form-label">Visszatérési protokoll</label>
                    <textarea
                        id="return_to_play_protocol"
                        className="form-control"
                        value={formData.return_to_play_protocol}
                        onChange={(e) => setFormData({...formData, return_to_play_protocol: e.target.value})}
                        rows="3"
                        placeholder="Milyen lépések szükségesek a biztonságos visszatéréshez?"
                    />
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="follow_up_required"
                                checked={formData.follow_up_required}
                                onChange={(e) => setFormData({...formData, follow_up_required: e.target.checked})}
                            />
                            <label className="form-check-label" htmlFor="follow_up_required">
                                Utánkövetés szükséges
                            </label>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-check mb-3">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="medical_clearance_required"
                                checked={formData.medical_clearance_required}
                                onChange={(e) => setFormData({...formData, medical_clearance_required: e.target.checked})}
                            />
                            <label className="form-check-label" htmlFor="medical_clearance_required">
                                Orvosi engedély szükséges
                            </label>
                        </div>
                    </div>
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
                            injury?.id ? 'Frissítés' : 'Rögzítés'
                        )}
                    </button>
                </div>
            </form>
        );
    };

    // Medical Record Form Component
    const MedicalRecordForm = ({ record, onSave, onCancel }) => {
        const [formData, setFormData] = useState({
            player_id: record?.player_id || selectedPlayer?.id || '',
            record_type: record?.record_type || 'health_check',
            record_date: record?.record_date || new Date().toISOString().split('T')[0],
            examiner_name: record?.examiner_name || '',
            findings: record?.findings || '',
            recommendations: record?.recommendations || '',
            clearance_status: record?.clearance_status || 'cleared',
            next_checkup_date: record?.next_checkup_date || '',
            notes: record?.notes || ''
        });
        const [saving, setSaving] = useState(false);

        const handleSubmit = async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
                if (record?.id) {
                    await apiService.api.put(`/medical-records/${record.id}`, formData);
                } else {
                    await apiService.api.post('/medical-records', formData);
                }
                onSave();
                setShowMedicalModal(false);
            } catch (err) {
                setError('Orvosi feljegyzés mentése sikertelen: ' + err.message);
            } finally {
                setSaving(false);
            }
        };

        return (
            <form onSubmit={handleSubmit} className="medical-form">
                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="player_id" className="form-label">
                                Játékos <span className="text-danger">*</span>
                            </label>
                            <select
                                id="player_id"
                                className="form-select"
                                value={formData.player_id}
                                onChange={(e) => setFormData({...formData, player_id: e.target.value})}
                                required
                            >
                                <option value="">Válassz játékost...</option>
                                {players.map(player => (
                                    <option key={player.id} value={player.id}>
                                        {player.name} ({player.position || 'N/A'})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="record_type" className="form-label">Feljegyzés típusa</label>
                            <select
                                id="record_type"
                                className="form-select"
                                value={formData.record_type}
                                onChange={(e) => setFormData({...formData, record_type: e.target.value})}
                            >
                                <option value="health_check">Általános egészségügyi vizsgálat</option>
                                <option value="injury_assessment">Sérülés értékelés</option>
                                <option value="return_to_play">Visszatérési engedély</option>
                                <option value="medical_clearance">Orvosi engedély</option>
                                <option value="fitness_test">Fittségi teszt</option>
                                <option value="vaccination">Oltás</option>
                                <option value="other">Egyéb</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="record_date" className="form-label">
                                Vizsgálat dátuma <span className="text-danger">*</span>
                            </label>
                            <input
                                type="date"
                                id="record_date"
                                className="form-control"
                                value={formData.record_date}
                                onChange={(e) => setFormData({...formData, record_date: e.target.value})}
                                required
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="examiner_name" className="form-label">Vizsgáló orvos</label>
                            <input
                                type="text"
                                id="examiner_name"
                                className="form-control"
                                value={formData.examiner_name}
                                onChange={(e) => setFormData({...formData, examiner_name: e.target.value})}
                                placeholder="Dr. Kovács János"
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="findings" className="form-label">Vizsgálati leletek</label>
                    <textarea
                        id="findings"
                        className="form-control"
                        value={formData.findings}
                        onChange={(e) => setFormData({...formData, findings: e.target.value})}
                        rows="4"
                        placeholder="Milyen leletek kerültek feljegyzésre?"
                    />
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="recommendations" className="form-label">Javaslatok</label>
                    <textarea
                        id="recommendations"
                        className="form-control"
                        value={formData.recommendations}
                        onChange={(e) => setFormData({...formData, recommendations: e.target.value})}
                        rows="3"
                        placeholder="Milyen javaslatok születtek?"
                    />
                </div>

                <div className="row">
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="clearance_status" className="form-label">Engedély státusza</label>
                            <select
                                id="clearance_status"
                                className="form-select"
                                value={formData.clearance_status}
                                onChange={(e) => setFormData({...formData, clearance_status: e.target.value})}
                            >
                                <option value="cleared">Engedélyezett</option>
                                <option value="restricted">Korlátozottan engedélyezett</option>
                                <option value="not_cleared">Nem engedélyezett</option>
                                <option value="pending">Függőben</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="form-group mb-3">
                            <label htmlFor="next_checkup_date" className="form-label">Következő vizsgálat</label>
                            <input
                                type="date"
                                id="next_checkup_date"
                                className="form-control"
                                value={formData.next_checkup_date}
                                onChange={(e) => setFormData({...formData, next_checkup_date: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

                <div className="form-group mb-3">
                    <label htmlFor="notes" className="form-label">További megjegyzések</label>
                    <textarea
                        id="notes"
                        className="form-control"
                        value={formData.notes}
                        onChange={(e) => setFormData({...formData, notes: e.target.value})}
                        rows="3"
                        placeholder="További információk..."
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
                            record?.id ? 'Frissítés' : 'Rögzítés'
                        )}
                    </button>
                </div>
            </form>
        );
    };

    // Mark injury as recovered
    const handleMarkRecovered = async (injuryId) => {
        try {
            await apiService.injuries.markRecovered(injuryId, {
                recovery_date: new Date().toISOString().split('T')[0],
                recovery_notes: 'Gyógyulás befejezve'
            });
            await fetchData();
        } catch (err) {
            setError('Gyógyulás rögzítése sikertelen: ' + err.message);
        }
    };

    // Delete injury
    const handleDeleteInjury = async (injuryId) => {
        if (window.confirm('Biztosan törölni szeretnéd ezt a sérülést?')) {
            try {
                await apiService.injuries.delete(injuryId);
                await fetchData();
            } catch (err) {
                setError('Sérülés törlése sikertelen: ' + err.message);
            }
        }
    };

    // Get severity badge class
    const getSeverityBadgeClass = (severity) => {
        switch (severity) {
            case 'minor': return 'bg-success';
            case 'moderate': return 'bg-warning';
            case 'major': return 'bg-danger';
            case 'severe': return 'bg-dark';
            default: return 'bg-secondary';
        }
    };

    // Calculate days since injury
    const daysSinceInjury = (injuryDate) => {
        const today = new Date();
        const injury = new Date(injuryDate);
        return Math.floor((today - injury) / (1000 * 60 * 60 * 24));
    };

    if (loading) return <LoadingSpinner />;

    return (
        <div className="injury-tracker">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3>Sérülés nyilvántartás</h3>
                {(userRole === 'admin' || userRole === 'coach') && (
                    <div className="btn-group">
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                setEditingInjury(null);
                                setShowInjuryModal(true);
                            }}
                        >
                            Új sérülés
                        </button>
                        <button
                            className="btn btn-outline-primary"
                            onClick={() => {
                                setShowMedicalModal(true);
                            }}
                        >
                            Orvosi feljegyzés
                        </button>
                    </div>
                )}
            </div>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Statistics Overview */}
            {injuryStats && (
                <div className="injury-stats mb-4">
                    <div className="row">
                        <div className="col-md-3">
                            <div className="stat-card">
                                <div className="stat-icon">🏥</div>
                                <div className="stat-value">{injuryStats.total_injuries || 0}</div>
                                <div className="stat-label">Összes sérülés</div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="stat-card">
                                <div className="stat-icon">⚠️</div>
                                <div className="stat-value">{injuryStats.active_injuries || 0}</div>
                                <div className="stat-label">Aktív sérülések</div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="stat-card">
                                <div className="stat-icon">📊</div>
                                <div className="stat-value">
                                    {injuryStats.avg_recovery_days ? Math.round(injuryStats.avg_recovery_days) : 0}
                                </div>
                                <div className="stat-label">Átlag gyógyulási idő (nap)</div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="stat-card">
                                <div className="stat-icon">📈</div>
                                <div className="stat-value">
                                    {injuryStats.injury_rate ? injuryStats.injury_rate.toFixed(1) : 0}%
                                </div>
                                <div className="stat-label">Sérülési arány</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="filters-section mb-4">
                <div className="row g-3">
                    <div className="col-md-2">
                        <label className="form-label">Státusz</label>
                        <select
                            className="form-select"
                            value={filters.status}
                            onChange={(e) => setFilters(prev => ({...prev, status: e.target.value}))}
                        >
                            <option value="active">Aktív</option>
                            <option value="all">Minden</option>
                            <option value="recovered">Felgyógyult</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <label className="form-label">Sérülés típusa</label>
                        <select
                            className="form-select"
                            value={filters.injury_type}
                            onChange={(e) => setFilters(prev => ({...prev, injury_type: e.target.value}))}
                        >
                            <option value="">Minden típus</option>
                            <option value="Muscle strain">Izomhúzódás</option>
                            <option value="Ligament sprain">Szalag ficam</option>
                            <option value="Knee injury">Térd sérülés</option>
                            <option value="Ankle sprain">Boka ficam</option>
                            <option value="Concussion">Agyrázkódás</option>
                        </select>
                    </div>
                    <div className="col-md-2">
                        <label className="form-label">Súlyosság</label>
                        <select
                            className="form-select"
                            value={filters.severity}
                            onChange={(e) => setFilters(prev => ({...prev, severity: e.target.value}))}
                        >
                            <option value="">Minden</option>
                            <option value="minor">Enyhe</option>
                            <option value="moderate">Közepes</option>
                            <option value="major">Súlyos</option>
                            <option value="severe">Kritikus</option>
                        </select>
                    </div>
                    {userRole === 'admin' && (
                        <div className="col-md-3">
                            <label className="form-label">Csapat</label>
                            <select
                                className="form-select"
                                value={filters.team_id}
                                onChange={(e) => setFilters(prev => ({...prev, team_id: e.target.value}))}
                            >
                                <option value="">Minden csapat</option>
                                {/* Teams would be loaded here */}
                            </select>
                        </div>
                    )}
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

            {/* Injury Tabs */}
            <div className="injury-tabs">
                <ul className="nav nav-tabs mb-4" role="tablist">
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'active' ? 'active' : ''}`}
                            onClick={() => setActiveTab('active')}
                            type="button"
                            role="tab"
                        >
                            Aktív sérülések ({injuries.filter(i => i.status === 'active').length})
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveTab('history')}
                            type="button"
                            role="tab"
                        >
                            Sérülés történet
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'medical' ? 'active' : ''}`}
                            onClick={() => setActiveTab('medical')}
                            type="button"
                            role="tab"
                        >
                            Orvosi feljegyzések
                        </button>
                    </li>
                    <li className="nav-item">
                        <button
                            className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                            type="button"
                            role="tab"
                        >
                            Analitika
                        </button>
                    </li>
                </ul>

                <div className="tab-content">
                    {activeTab === 'active' && (
                        <div className="active-injuries">
                            {injuries.filter(injury => injury.status === 'active').length === 0 ? (
                                <div className="text-center py-5">
                                    <h5 className="text-muted">Nincsenek aktív sérülések</h5>
                                    <p className="text-muted">Minden játékos egészséges! 🎉</p>
                                </div>
                            ) : (
                                <div className="injuries-grid">
                                    {injuries
                                        .filter(injury => injury.status === 'active')
                                        .map(injury => (
                                            <div key={injury.id} className="injury-card">
                                                <div className="injury-header">
                                                    <div className="player-info">
                                                        <h6>{injury.player_name}</h6>
                                                        <span className="position-badge">{injury.position || 'N/A'}</span>
                                                    </div>
                                                    <div className="injury-severity">
                                                        <span className={`badge ${getSeverityBadgeClass(injury.injury_severity)}`}>
                                                            {injury.injury_severity === 'minor' ? 'Enyhe' :
                                                             injury.injury_severity === 'moderate' ? 'Közepes' :
                                                             injury.injury_severity === 'major' ? 'Súlyos' :
                                                             injury.injury_severity === 'severe' ? 'Kritikus' : injury.injury_severity}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="injury-details">
                                                    <div className="detail-row">
                                                        <span className="detail-label">Típus:</span>
                                                        <span className="detail-value">{injury.injury_type}</span>
                                                    </div>
                                                    <div className="detail-row">
                                                        <span className="detail-label">Lokalizáció:</span>
                                                        <span className="detail-value">{injury.injury_location}</span>
                                                    </div>
                                                    <div className="detail-row">
                                                        <span className="detail-label">Sérülés dátuma:</span>
                                                        <span className="detail-value">
                                                            {new Date(injury.injury_date).toLocaleDateString('hu-HU')}
                                                            <small className="text-muted ms-2">
                                                                ({daysSinceInjury(injury.injury_date)} napja)
                                                            </small>
                                                        </span>
                                                    </div>
                                                    {injury.expected_recovery_date && (
                                                        <div className="detail-row">
                                                            <span className="detail-label">Várható gyógyulás:</span>
                                                            <span className="detail-value">
                                                                {new Date(injury.expected_recovery_date).toLocaleDateString('hu-HU')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="detail-row">
                                                        <span className="detail-label">Leírás:</span>
                                                        <span className="detail-value">{injury.description}</span>
                                                    </div>
                                                </div>

                                                {injury.return_to_play_protocol && (
                                                    <div className="recovery-protocol">
                                                        <strong>Visszatérési protokoll:</strong>
                                                        <p>{injury.return_to_play_protocol}</p>
                                                    </div>
                                                )}

                                                {(userRole === 'admin' || userRole === 'coach') && (
                                                    <div className="injury-actions">
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => {
                                                                setEditingInjury(injury);
                                                                setShowInjuryModal(true);
                                                            }}
                                                            title="Szerkesztés"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-success"
                                                            onClick={() => handleMarkRecovered(injury.id)}
                                                            title="Gyógyultnak jelöl"
                                                        >
                                                            ✅ Gyógyult
                                                        </button>
                                                        {userRole === 'admin' && (
                                                            <button
                                                                className="btn btn-sm btn-outline-danger"
                                                                onClick={() => handleDeleteInjury(injury.id)}
                                                                title="Törlés"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="injury-history">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Játékos</th>
                                            <th>Sérülés típusa</th>
                                            <th>Lokalizáció</th>
                                            <th>Súlyosság</th>
                                            <th>Sérülés dátuma</th>
                                            <th>Gyógyulás dátuma</th>
                                            <th>Időtartam (nap)</th>
                                            <th>Státusz</th>
                                            <th>Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {injuries.map(injury => (
                                            <tr key={injury.id}>
                                                <td>
                                                    <strong>{injury.player_name}</strong>
                                                    <br />
                                                    <small className="text-muted">{injury.position || 'N/A'}</small>
                                                </td>
                                                <td>{injury.injury_type}</td>
                                                <td>{injury.injury_location}</td>
                                                <td>
                                                    <span className={`badge ${getSeverityBadgeClass(injury.injury_severity)}`}>
                                                        {injury.injury_severity === 'minor' ? 'Enyhe' :
                                                         injury.injury_severity === 'moderate' ? 'Közepes' :
                                                         injury.injury_severity === 'major' ? 'Súlyos' :
                                                         injury.injury_severity === 'severe' ? 'Kritikus' : injury.injury_severity}
                                                    </span>
                                                </td>
                                                <td>{new Date(injury.injury_date).toLocaleDateString('hu-HU')}</td>
                                                <td>
                                                    {injury.recovery_date 
                                                        ? new Date(injury.recovery_date).toLocaleDateString('hu-HU')
                                                        : '-'
                                                    }
                                                </td>
                                                <td>
                                                    {injury.recovery_date
                                                        ? Math.floor((new Date(injury.recovery_date) - new Date(injury.injury_date)) / (1000 * 60 * 60 * 24))
                                                        : daysSinceInjury(injury.injury_date)
                                                    }
                                                </td>
                                                <td>
                                                    <span className={`badge ${
                                                        injury.status === 'active' ? 'bg-warning' :
                                                        injury.status === 'recovered' ? 'bg-success' :
                                                        'bg-secondary'
                                                    }`}>
                                                        {injury.status === 'active' ? 'Aktív' :
                                                         injury.status === 'recovered' ? 'Gyógyult' :
                                                         injury.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {(userRole === 'admin' || userRole === 'coach') && (
                                                        <div className="btn-group" role="group">
                                                            <button
                                                                className="btn btn-sm btn-outline-primary"
                                                                onClick={() => {
                                                                    setEditingInjury(injury);
                                                                    setShowInjuryModal(true);
                                                                }}
                                                                title="Szerkesztés"
                                                            >
                                                                ✏️
                                                            </button>
                                                            {injury.status === 'active' && (
                                                                <button
                                                                    className="btn btn-sm btn-success"
                                                                    onClick={() => handleMarkRecovered(injury.id)}
                                                                    title="Gyógyultnak jelöl"
                                                                >
                                                                    ✅
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'medical' && (
                        <div className="medical-records">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Játékos</th>
                                            <th>Típus</th>
                                            <th>Dátum</th>
                                            <th>Orvos</th>
                                            <th>Engedély</th>
                                            <th>Következő vizsgálat</th>
                                            <th>Műveletek</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {medicalRecords.map(record => (
                                            <tr key={record.id}>
                                                <td>
                                                    <strong>{record.player_name}</strong>
                                                </td>
                                                <td>
                                                    {record.record_type === 'health_check' ? 'Egészségügyi vizsgálat' :
                                                     record.record_type === 'injury_assessment' ? 'Sérülés értékelés' :
                                                     record.record_type === 'return_to_play' ? 'Visszatérési engedély' :
                                                     record.record_type === 'medical_clearance' ? 'Orvosi engedély' :
                                                     record.record_type === 'fitness_test' ? 'Fittségi teszt' :
                                                     record.record_type}
                                                </td>
                                                <td>{new Date(record.record_date).toLocaleDateString('hu-HU')}</td>
                                                <td>{record.examiner_name || '-'}</td>
                                                <td>
                                                    <span className={`badge ${
                                                        record.clearance_status === 'cleared' ? 'bg-success' :
                                                        record.clearance_status === 'restricted' ? 'bg-warning' :
                                                        record.clearance_status === 'not_cleared' ? 'bg-danger' :
                                                        'bg-secondary'
                                                    }`}>
                                                        {record.clearance_status === 'cleared' ? 'Engedélyezett' :
                                                         record.clearance_status === 'restricted' ? 'Korlátozva' :
                                                         record.clearance_status === 'not_cleared' ? 'Nem engedélyezett' :
                                                         record.clearance_status === 'pending' ? 'Függőben' :
                                                         record.clearance_status}
                                                    </span>
                                                </td>
                                                <td>
                                                    {record.next_checkup_date 
                                                        ? new Date(record.next_checkup_date).toLocaleDateString('hu-HU')
                                                        : '-'
                                                    }
                                                </td>
                                                <td>
                                                    {(userRole === 'admin' || userRole === 'coach') && (
                                                        <button
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => {
                                                                // Edit medical record functionality
                                                                setShowMedicalModal(true);
                                                            }}
                                                            title="Szerkesztés"
                                                        >
                                                            ✏️
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="injury-analytics">
                            <div className="row">
                                <div className="col-lg-6">
                                    <div className="analytics-card">
                                        <h6>Sérülések típus szerint</h6>
                                        <div className="type-chart">
                                            {injuryStats?.by_type?.map((item, index) => (
                                                <div key={index} className="type-item">
                                                    <div className="type-name">{item.injury_type}</div>
                                                    <div className="type-bar">
                                                        <div 
                                                            className="type-fill" 
                                                            style={{width: `${(item.count / injuryStats.total_injuries) * 100}%`}}
                                                        ></div>
                                                    </div>
                                                    <div className="type-count">{item.count}</div>
                                                </div>
                                            )) || []}
                                        </div>
                                    </div>
                                </div>
                                <div className="col-lg-6">
                                    <div className="analytics-card">
                                        <h6>Sérülések súlyosság szerint</h6>
                                        <div className="severity-chart">
                                            {injuryStats?.by_severity?.map((item, index) => (
                                                <div key={index} className="severity-item">
                                                    <div className="severity-name">
                                                        {item.injury_severity === 'minor' ? 'Enyhe' :
                                                         item.injury_severity === 'moderate' ? 'Közepes' :
                                                         item.injury_severity === 'major' ? 'Súlyos' :
                                                         item.injury_severity === 'severe' ? 'Kritikus' : item.injury_severity}
                                                    </div>
                                                    <div className="severity-percentage">
                                                        {((item.count / injuryStats.total_injuries) * 100).toFixed(1)}%
                                                    </div>
                                                    <div className="severity-count">{item.count} eset</div>
                                                </div>
                                            )) || []}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Injury Modal */}
            {showInjuryModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {editingInjury ? 'Sérülés szerkesztése' : 'Új sérülés rögzítése'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowInjuryModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <InjuryForm
                                    injury={editingInjury}
                                    onSave={fetchData}
                                    onCancel={() => setShowInjuryModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Medical Record Modal */}
            {showMedicalModal && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Orvosi feljegyzés</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowMedicalModal(false)}
                                />
                            </div>
                            <div className="modal-body">
                                <MedicalRecordForm
                                    record={null}
                                    onSave={fetchData}
                                    onCancel={() => setShowMedicalModal(false)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

InjuryTracker.propTypes = {
    userRole: PropTypes.string.isRequired,
    playerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    teamId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
};

export default InjuryTracker;