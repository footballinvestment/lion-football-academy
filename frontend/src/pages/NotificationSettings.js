import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const NotificationSettings = () => {
    const { user } = useContext(AuthContext);
    const [preferences, setPreferences] = useState({
        email_enabled: true,
        training_reminders: true,
        weekly_reports: true,
        attendance_alerts: true,
        system_notifications: true,
        announcement_emails: true,
        frequency_training_reminders: '24h',
        frequency_weekly_reports: 'weekly'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const response = await apiService.notifications.getPreferences();
            if (response.data.preferences) {
                setPreferences(response.data.preferences);
            }
        } catch (error) {
            setError('Hiba történt a beállítások betöltésekor');
            console.error('Error fetching preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError('');
            
            await apiService.notifications.updatePreferences(preferences);
            setSuccess('Beállítások sikeresen mentve!');
            
            setTimeout(() => setSuccess(''), 3000);
        } catch (error) {
            setError('Hiba történt a beállítások mentésekor');
            console.error('Error saving preferences:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (field) => {
        setPreferences(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleFrequencyChange = (field, value) => {
        setPreferences(prev => ({
            ...prev,
            [field]: value
        }));
    };

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
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-header">
                            <h4 className="mb-0">📧 Email Értesítési Beállítások</h4>
                            <small className="text-muted">
                                Személyre szabhatja, hogy milyen értesítéseket szeretne kapni
                            </small>
                        </div>
                        
                        <div className="card-body">
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

                            <form onSubmit={handleSave}>
                                {/* Master Email Toggle */}
                                <div className="card mb-4">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="card-title mb-1">📬 Email értesítések</h6>
                                                <small className="text-muted">
                                                    Főkapcsoló minden email értesítéshez
                                                </small>
                                            </div>
                                            <div className="form-check form-switch">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    id="email_enabled"
                                                    checked={preferences.email_enabled}
                                                    onChange={() => handleToggle('email_enabled')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Individual Settings */}
                                {preferences.email_enabled && (
                                    <>
                                        {/* Training Reminders */}
                                        <div className="card mb-3">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <div>
                                                        <h6 className="card-title mb-1">⚽ Edzés emlékeztetők</h6>
                                                        <small className="text-muted">
                                                            Értesítés közelgő edzésekről
                                                        </small>
                                                    </div>
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="training_reminders"
                                                            checked={preferences.training_reminders}
                                                            onChange={() => handleToggle('training_reminders')}
                                                        />
                                                    </div>
                                                </div>
                                                {preferences.training_reminders && (
                                                    <div className="mt-2">
                                                        <label className="form-label small">Emlékeztető időzítése:</label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={preferences.frequency_training_reminders}
                                                            onChange={(e) => handleFrequencyChange('frequency_training_reminders', e.target.value)}
                                                        >
                                                            <option value="2h">2 órával előtte</option>
                                                            <option value="6h">6 órával előtte</option>
                                                            <option value="12h">12 órával előtte</option>
                                                            <option value="24h">24 órával előtte</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Weekly Reports */}
                                        <div className="card mb-3">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <div>
                                                        <h6 className="card-title mb-1">📊 Heti jelentések</h6>
                                                        <small className="text-muted">
                                                            Heti összefoglaló gyermeke teljesítményéről
                                                        </small>
                                                    </div>
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="weekly_reports"
                                                            checked={preferences.weekly_reports}
                                                            onChange={() => handleToggle('weekly_reports')}
                                                        />
                                                    </div>
                                                </div>
                                                {preferences.weekly_reports && (
                                                    <div className="mt-2">
                                                        <label className="form-label small">Jelentés gyakorisága:</label>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={preferences.frequency_weekly_reports}
                                                            onChange={(e) => handleFrequencyChange('frequency_weekly_reports', e.target.value)}
                                                        >
                                                            <option value="weekly">Hetente</option>
                                                            <option value="biweekly">Kéthetente</option>
                                                            <option value="monthly">Havonta</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* System Notifications */}
                                        <div className="card mb-3">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="card-title mb-1">🔔 Rendszer értesítések</h6>
                                                        <small className="text-muted">
                                                            Fontos rendszer üzenetek és frissítések
                                                        </small>
                                                    </div>
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="system_notifications"
                                                            checked={preferences.system_notifications}
                                                            onChange={() => handleToggle('system_notifications')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Announcements */}
                                        <div className="card mb-3">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <h6 className="card-title mb-1">📢 Hírek és bejelentések</h6>
                                                        <small className="text-muted">
                                                            Akadémiai hírek és bejelentések
                                                        </small>
                                                    </div>
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            id="announcement_emails"
                                                            checked={preferences.announcement_emails}
                                                            onChange={() => handleToggle('announcement_emails')}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Coach-specific notifications */}
                                        {user?.role === 'coach' && (
                                            <div className="card mb-3">
                                                <div className="card-body">
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div>
                                                            <h6 className="card-title mb-1">⚠️ Edzői riasztások</h6>
                                                            <small className="text-muted">
                                                                Alacsony részvételi arány és egyéb edzői értesítések
                                                            </small>
                                                        </div>
                                                        <div className="form-check form-switch">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id="attendance_alerts"
                                                                checked={preferences.attendance_alerts}
                                                                onChange={() => handleToggle('attendance_alerts')}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Save Button */}
                                <div className="d-grid">
                                    <button 
                                        type="submit" 
                                        className="btn btn-primary"
                                        disabled={saving || !preferences.email_enabled}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                                Mentés...
                                            </>
                                        ) : (
                                            '💾 Beállítások mentése'
                                        )}
                                    </button>
                                </div>

                                <div className="mt-3 text-center">
                                    <small className="text-muted">
                                        💡 A beállítások azonnal életbe lépnek a mentés után.
                                        <br />
                                        Bármikor módosíthatja ezeket a beállításokat.
                                    </small>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationSettings;