import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const TrainingAttendance = () => {
    const { trainingId } = useParams();
    const navigate = useNavigate();
    
    const [training, setTraining] = useState(null);
    const [players, setPlayers] = useState([]);
    const [attendance, setAttendance] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTrainingData();
    }, [trainingId]);

    const fetchTrainingData = async () => {
        try {
            setLoading(true);
            
            // Edzés adatok és jelenlét lekérése
            const [trainingRes, attendanceRes] = await Promise.all([
                apiService.trainings.getById(trainingId),
                apiService.trainings.getAttendance(trainingId)
            ]);

            const trainingData = trainingRes.data;
            setTraining(trainingData);

            // Ha van csapat, lekérjük a játékosokat
            if (trainingData.team_id) {
                const playersRes = await apiService.players.getByTeam(trainingData.team_id);
                setPlayers(playersRes.data);

                // Meglévő jelenlét adatok betöltése
                const existingAttendance = {};
                attendanceRes.data.attendance.forEach(record => {
                    existingAttendance[record.player_id] = {
                        present: record.present === 1,
                        late_minutes: record.late_minutes || 0,
                        absence_reason: record.absence_reason || '',
                        performance_rating: record.performance_rating || '',
                        notes: record.notes || ''
                    };
                });
                setAttendance(existingAttendance);
            }
        } catch (error) {
            console.error('Hiba az edzés adatok betöltésénél:', error);
            setError('Hiba történt az adatok betöltése során');
        } finally {
            setLoading(false);
        }
    };

    const handleAttendanceChange = (playerId, field, value) => {
        setAttendance(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [field]: value
            }
        }));
    };

    const submitAttendance = async () => {
        try {
            setSaving(true);
            
            const attendanceData = Object.entries(attendance).map(([playerId, data]) => ({
                playerId: parseInt(playerId),
                present: data.present || false,
                late_minutes: data.late_minutes || 0,
                absence_reason: data.absence_reason || '',
                performance_rating: data.performance_rating || null,
                notes: data.notes || ''
            }));

            await apiService.trainings.recordAttendance(trainingId, attendanceData);

            alert('Jelenlét sikeresen rögzítve!');
            navigate('/trainings');
        } catch (error) {
            console.error('Hiba a jelenlét rögzítésénél:', error);
            alert('Hiba történt a jelenlét mentésénél: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const getAttendanceStats = () => {
        const totalPlayers = players.length;
        const presentPlayers = Object.values(attendance).filter(a => a.present).length;
        const absentPlayers = totalPlayers - presentPlayers;
        
        return { totalPlayers, presentPlayers, absentPlayers };
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Betöltés...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    if (!training) {
        return (
            <div className="alert alert-warning" role="alert">
                Edzés nem található
            </div>
        );
    }

    const stats = getAttendanceStats();

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1>📋 Jelenlét Rögzítése</h1>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item">
                                <button className="btn btn-link p-0" onClick={() => navigate('/trainings')}>
                                    Edzések
                                </button>
                            </li>
                            <li className="breadcrumb-item active">Jelenlét</li>
                        </ol>
                    </nav>
                </div>
                <button 
                    className="btn btn-secondary"
                    onClick={() => navigate('/trainings')}
                >
                    ← Vissza
                </button>
            </div>

            {/* Edzés információk */}
            <div className="card mb-4">
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <h5 className="card-title">🏃 {training.type}</h5>
                            <p className="card-text">
                                <strong>📅 Dátum:</strong> {new Date(training.date).toLocaleDateString('hu-HU')}<br/>
                                <strong>🕐 Időpont:</strong> {training.time}<br/>
                                <strong>📍 Helyszín:</strong> {training.location || 'Nincs megadva'}
                            </p>
                        </div>
                        <div className="col-md-6">
                            <p className="card-text">
                                <strong>🏆 Csapat:</strong> {training.team_name || 'Nincs megadva'}<br/>
                                <strong>⏱️ Időtartam:</strong> {training.duration ? `${training.duration} perc` : 'Nincs megadva'}<br/>
                                <strong>📝 Terv:</strong> {training.training_plan || 'Nincs megadva'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jelenlét statisztika */}
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="card bg-info text-white">
                        <div className="card-body text-center">
                            <h3>{stats.totalPlayers}</h3>
                            <p>Összesen</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-success text-white">
                        <div className="card-body text-center">
                            <h3>{stats.presentPlayers}</h3>
                            <p>Jelen van</p>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card bg-warning text-white">
                        <div className="card-body text-center">
                            <h3>{stats.absentPlayers}</h3>
                            <p>Hiányzik</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Jelenlét táblázat */}
            {players.length === 0 ? (
                <div className="alert alert-info">
                    Nincsenek játékosok ehhez az edzéshez
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">👥 Játékosok Jelenléte</h5>
                    </div>
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-dark">
                                    <tr>
                                        <th>Játékos</th>
                                        <th>Jelen van</th>
                                        <th>Késés (perc)</th>
                                        <th>Hiányzás oka</th>
                                        <th>Teljesítmény</th>
                                        <th>Megjegyzés</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map(player => {
                                        const playerAttendance = attendance[player.id] || {};
                                        const isPresent = playerAttendance.present || false;
                                        
                                        return (
                                            <tr key={player.id} className={isPresent ? 'table-success' : 'table-light'}>
                                                <td>
                                                    <strong>{player.name}</strong>
                                                    <br/>
                                                    <small className="text-muted">{player.position || 'Nincs pozíció'}</small>
                                                </td>
                                                <td>
                                                    <div className="form-check form-switch">
                                                        <input
                                                            className="form-check-input"
                                                            type="checkbox"
                                                            checked={isPresent}
                                                            onChange={(e) => handleAttendanceChange(
                                                                player.id, 'present', e.target.checked
                                                            )}
                                                        />
                                                        <label className="form-check-label">
                                                            {isPresent ? '✅ Jelen' : '❌ Hiányzik'}
                                                        </label>
                                                    </div>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="form-control form-control-sm"
                                                        min="0"
                                                        max="120"
                                                        value={playerAttendance.late_minutes || ''}
                                                        onChange={(e) => handleAttendanceChange(
                                                            player.id, 'late_minutes', parseInt(e.target.value) || 0
                                                        )}
                                                        disabled={!isPresent}
                                                        placeholder="0"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        value={playerAttendance.absence_reason || ''}
                                                        onChange={(e) => handleAttendanceChange(
                                                            player.id, 'absence_reason', e.target.value
                                                        )}
                                                        disabled={isPresent}
                                                        placeholder="Betegség, sérülés, stb."
                                                    />
                                                </td>
                                                <td>
                                                    <select
                                                        className="form-select form-select-sm"
                                                        value={playerAttendance.performance_rating || ''}
                                                        onChange={(e) => handleAttendanceChange(
                                                            player.id, 'performance_rating', e.target.value ? parseInt(e.target.value) : ''
                                                        )}
                                                        disabled={!isPresent}
                                                    >
                                                        <option value="">Értékelés</option>
                                                        <option value="1">1 - Gyenge</option>
                                                        <option value="2">2 - Elfogadható</option>
                                                        <option value="3">3 - Jó</option>
                                                        <option value="4">4 - Nagyon jó</option>
                                                        <option value="5">5 - Kiváló</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <textarea
                                                        className="form-control form-control-sm"
                                                        rows="1"
                                                        value={playerAttendance.notes || ''}
                                                        onChange={(e) => handleAttendanceChange(
                                                            player.id, 'notes', e.target.value
                                                        )}
                                                        placeholder="Megjegyzések..."
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Mentés gomb */}
            {players.length > 0 && (
                <div className="mt-4 text-center">
                    <button 
                        className="btn btn-success btn-lg"
                        onClick={submitAttendance}
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                Mentés folyamatban...
                            </>
                        ) : (
                            <>💾 Jelenlét Mentése</>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TrainingAttendance;