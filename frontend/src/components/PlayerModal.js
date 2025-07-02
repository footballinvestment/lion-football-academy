import React, { useState, useEffect } from 'react';
import { validatePlayer, validate } from '../utils/validation';
import { handleApiError, LoadingSpinner } from '../utils/errorHandler';

const PlayerModal = ({ player, teams, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: '',
        birth_date: '',
        position: '',
        dominant_foot: '',
        team_id: '',
        parent_name: '',
        parent_phone: '',
        parent_email: '',
        medical_notes: ''
    });
    const [validation, setValidation] = useState({
        isValid: true,
        errors: {},
        hasError: () => false,
        getError: () => null
    });
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});

    useEffect(() => {
        if (player) {
            setFormData({
                name: player.name || '',
                birth_date: player.birth_date || '',
                position: player.position || '',
                dominant_foot: player.dominant_foot || '',
                team_id: player.team_id || '',
                parent_name: player.parent_name || '',
                parent_phone: player.parent_phone || '',
                parent_email: player.parent_email || '',
                medical_notes: player.medical_notes || ''
            });
        }
        // Reset validation when modal opens
        setValidation({ isValid: true, errors: {}, hasError: () => false, getError: () => null });
        setApiError(null);
        setFieldErrors({});
    }, [player]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear field error when user starts typing
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({
                ...prev,
                [name]: null
            }));
        }

        // Real-time validation for specific fields
        if (name === 'name' || name === 'birth_date' || name === 'parent_email' || name === 'parent_phone') {
            const tempData = { ...formData, [name]: value };
            const tempValidation = validate(tempData, validatePlayer);
            
            setFieldErrors(prev => ({
                ...prev,
                [name]: tempValidation.getError(name)
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError(null);
        
        // Validate form
        const validationResult = validate(formData, validatePlayer);
        setValidation(validationResult);
        
        if (!validationResult.isValid) {
            setFieldErrors(validationResult.errors);
            return;
        }
        
        setLoading(true);
        
        try {
            // Clean empty strings to null
            const cleanedData = { ...formData };
            Object.keys(cleanedData).forEach(key => {
                if (cleanedData[key] === '') {
                    cleanedData[key] = null;
                }
            });
            
            await onSave(cleanedData);
        } catch (error) {
            console.error('Hiba a játékos mentésénél:', error);
            const errorMessage = handleApiError(error);
            setApiError(errorMessage);
            
            // Ha a hiba validációs hibákat tartalmaz, jelenítse meg azokat mezőnként
            if (error.response && error.response.data && error.response.data.errors) {
                const backendErrors = {};
                error.response.data.errors.forEach(err => {
                    // Próbáljuk meg hozzárendelni a backend hibákat a mezőkhöz
                    if (err.includes('Név')) backendErrors.name = err;
                    if (err.includes('Születési dátum') || err.includes('Életkor')) backendErrors.birth_date = err;
                    if (err.includes('email')) backendErrors.parent_email = err;
                    if (err.includes('telefon')) backendErrors.parent_phone = err;
                });
                setFieldErrors(prev => ({ ...prev, ...backendErrors }));
            }
        } finally {
            setLoading(false);
        }
    };

    const getFieldErrorClass = (fieldName) => {
        return fieldErrors[fieldName] ? 'is-invalid' : '';
    };

    const renderFieldError = (fieldName) => {
        const error = fieldErrors[fieldName];
        return error ? (
            <div className="invalid-feedback d-block">
                {error}
            </div>
        ) : null;
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {player ? '✏️ Játékos Szerkesztése' : '➕ Új Játékos Hozzáadása'}
                        </h5>
                        <button 
                            type="button" 
                            className="btn-close" 
                            onClick={onClose}
                            disabled={loading}
                        ></button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {/* API hiba megjelenítése */}
                            {apiError && (
                                <div className="alert alert-danger">
                                    <strong>Hiba!</strong> {apiError}
                                </div>
                            )}

                            {/* Általános validációs hibák */}
                            {!validation.isValid && validation.getErrorCount() > 0 && (
                                <div className="alert alert-warning">
                                    <strong>Figyelem!</strong> Kérjük javítsa ki a következő hibákat:
                                    <ul className="mb-0 mt-2">
                                        {Object.values(validation.errors).map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            
                            <div className="row">
                                {/* Alapadatok */}
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Név <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            className={`form-control ${getFieldErrorClass('name')}`}
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            placeholder="Teljes név"
                                        />
                                        {renderFieldError('name')}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Születési dátum <span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            className={`form-control ${getFieldErrorClass('birth_date')}`}
                                            name="birth_date"
                                            value={formData.birth_date}
                                            onChange={handleChange}
                                            required
                                        />
                                        {renderFieldError('birth_date')}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Pozíció</label>
                                        <select
                                            className={`form-select ${getFieldErrorClass('position')}`}
                                            name="position"
                                            value={formData.position}
                                            onChange={handleChange}
                                        >
                                            <option value="">Válassz pozíciót...</option>
                                            <option value="kapus">🥅 Kapus</option>
                                            <option value="védő">🛡️ Védő</option>
                                            <option value="középpályás">⚽ Középpályás</option>
                                            <option value="támadó">🎯 Támadó</option>
                                        </select>
                                        {renderFieldError('position')}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Domináns láb</label>
                                        <select
                                            className={`form-select ${getFieldErrorClass('dominant_foot')}`}
                                            name="dominant_foot"
                                            value={formData.dominant_foot}
                                            onChange={handleChange}
                                        >
                                            <option value="">Válassz...</option>
                                            <option value="jobb">🦵 Jobb</option>
                                            <option value="bal">🦵 Bal</option>
                                            <option value="mindkettő">⚽ Mindkettő</option>
                                        </select>
                                        {renderFieldError('dominant_foot')}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Csapat</label>
                                        <select
                                            className={`form-select ${getFieldErrorClass('team_id')}`}
                                            name="team_id"
                                            value={formData.team_id}
                                            onChange={handleChange}
                                        >
                                            <option value="">🏆 Nincs csapat</option>
                                            {teams.map(team => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name} ({team.age_group})
                                                </option>
                                            ))}
                                        </select>
                                        {renderFieldError('team_id')}
                                    </div>
                                </div>
                                
                                {/* Szülői adatok */}
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Szülő neve</label>
                                        <input
                                            type="text"
                                            className={`form-control ${getFieldErrorClass('parent_name')}`}
                                            name="parent_name"
                                            value={formData.parent_name}
                                            onChange={handleChange}
                                            placeholder="Szülő/gyám teljes neve"
                                        />
                                        {renderFieldError('parent_name')}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Szülő telefonja</label>
                                        <input
                                            type="tel"
                                            className={`form-control ${getFieldErrorClass('parent_phone')}`}
                                            name="parent_phone"
                                            value={formData.parent_phone}
                                            onChange={handleChange}
                                            placeholder="+36 30 123 4567"
                                        />
                                        {renderFieldError('parent_phone')}
                                        <div className="form-text">
                                            📞 Nemzetközi formátum ajánlott (+36...)
                                        </div>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Szülő email</label>
                                        <input
                                            type="email"
                                            className={`form-control ${getFieldErrorClass('parent_email')}`}
                                            name="parent_email"
                                            value={formData.parent_email}
                                            onChange={handleChange}
                                            placeholder="szulo@email.com"
                                        />
                                        {renderFieldError('parent_email')}
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">Egészségügyi megjegyzések</label>
                                        <textarea
                                            className={`form-control ${getFieldErrorClass('medical_notes')}`}
                                            name="medical_notes"
                                            value={formData.medical_notes}
                                            onChange={handleChange}
                                            rows="4"
                                            placeholder="Allergiák, krónikus betegségek, sérülések, gyógyszerek, egyéb fontos információk..."
                                        ></textarea>
                                        {renderFieldError('medical_notes')}
                                        <div className="form-text">
                                            🏥 Fontos egészségügyi információk az edzők számára
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="alert alert-info">
                                <small>
                                    <strong>💡 Tipp:</strong> A <span className="text-danger">*</span> jellel jelölt mezők kötelezők. 
                                    A szülői adatok opcionálisak, de ajánlottak a kapcsolattartáshoz.
                                </small>
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={onClose}
                                disabled={loading}
                            >
                                ❌ Mégse
                            </button>
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <LoadingSpinner size="sm" />
                                        <span className="ms-2">Mentés...</span>
                                    </>
                                ) : (
                                    <>💾 Mentés</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PlayerModal;