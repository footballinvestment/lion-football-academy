import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';

const Trainings = () => {
    const navigate = useNavigate();
    const [trainings, setTrainings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchTrainings();
    }, []);

    const fetchTrainings = async () => {
        try {
            setLoading(true);
            const response = await apiService.trainings.getAll();
            setTrainings(response.data);
        } catch (error) {
            console.error('Hiba az edzések betöltésénél:', error);
            setError('Hiba történt az edzések betöltése során');
        } finally {
            setLoading(false);
        }
    };

    const isUpcoming = (date, time) => {
        const trainingDateTime = new Date(`${date} ${time}`);
        return trainingDateTime > new Date();
    };

    const isPast = (date, time) => {
        const trainingDateTime = new Date(`${date} ${time}`);
        return trainingDateTime < new Date();
    };

    const handleAttendance = (trainingId) => {
        navigate(`/trainings/${trainingId}/attendance`);
    };

    const handleQRCheckIn = (trainingId) => {
        navigate(`/trainings/${trainingId}/qr`);
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
                <button 
                    className="btn btn-outline-danger ms-3" 
                    onClick={fetchTrainings}
                >
                    Újrapróbálás
                </button>
            </div>
        );
    }

    const upcomingTrainings = trainings.filter(t => isUpcoming(t.date, t.time));
    const pastTrainings = trainings.filter(t => isPast(t.date, t.time));

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>🏃 Edzések Kezelése</h1>
                <button className="btn btn-primary">
                    ➕ Új Edzés
                </button>
            </div>

            {/* Közelgő edzések */}
            <div className="mb-5">
                <h3 className="mb-3">📅 Közelgő Edzések ({upcomingTrainings.length})</h3>
                
                {upcomingTrainings.length === 0 ? (
                    <div className="alert alert-info">
                        <strong>📋 Nincsenek közelgő edzések</strong>
                        <p className="mb-0">Új edzések létrehozásához használd a "Új Edzés" gombot.</p>
                    </div>
                ) : (
                    <div className="row">
                        {upcomingTrainings.map(training => (
                            <div key={training.id} className="col-md-6 col-lg-4 mb-3">
                                <div className="card border-primary h-100">
                                    <div className="card-header bg-primary text-white">
                                        <h6 className="card-title mb-0">🏃 {training.type}</h6>
                                    </div>
                                    <div className="card-body">
                                        <p className="card-text">
                                            <strong>📅 Dátum:</strong> {new Date(training.date).toLocaleDateString('hu-HU')}<br/>
                                            <strong>🕐 Időpont:</strong> {training.time}<br/>
                                            <strong>📍 Helyszín:</strong> {training.location || 'Nincs megadva'}<br/>
                                            <strong>🏆 Csapat:</strong> {training.team_name || 'Nincs megadva'}<br/>
                                            {training.duration && (
                                                <>
                                                    <strong>⏱️ Időtartam:</strong> {training.duration} perc<br/>
                                                </>
                                            )}
                                        </p>
                                        {training.training_plan && (
                                            <div>
                                                <strong>📝 Edzésterv:</strong>
                                                <p className="small text-muted">{training.training_plan}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-footer">
                                        <div className="btn-group w-100" role="group">
                                            <button 
                                                className="btn btn-success btn-sm"
                                                onClick={() => handleAttendance(training.id)}
                                            >
                                                📋 Jelenlét
                                            </button>
                                            <button 
                                                className="btn btn-primary btn-sm"
                                                onClick={() => handleQRCheckIn(training.id)}
                                            >
                                                📱 QR Check-in
                                            </button>
                                            <button className="btn btn-outline-primary btn-sm">
                                                ✏️ Szerkesztés
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Múltbeli edzések */}
            <div>
                <h3 className="mb-3">📜 Korábbi Edzések ({pastTrainings.length})</h3>
                
                {pastTrainings.length === 0 ? (
                    <div className="alert alert-secondary">
                        <strong>📂 Nincsenek korábbi edzések</strong>
                        <p className="mb-0">A lezajlott edzések itt jelennek majd meg.</p>
                    </div>
                ) : (
                    <div className="row">
                        {pastTrainings.map(training => (
                            <div key={training.id} className="col-md-6 col-lg-4 mb-3">
                                <div className="card border-secondary h-100">
                                    <div className="card-header bg-secondary text-white">
                                        <h6 className="card-title mb-0">🏃 {training.type}</h6>
                                    </div>
                                    <div className="card-body">
                                        <p className="card-text">
                                            <strong>📅 Dátum:</strong> {new Date(training.date).toLocaleDateString('hu-HU')}<br/>
                                            <strong>🕐 Időpont:</strong> {training.time}<br/>
                                            <strong>📍 Helyszín:</strong> {training.location || 'Nincs megadva'}<br/>
                                            <strong>🏆 Csapat:</strong> {training.team_name || 'Nincs megadva'}<br/>
                                            {training.duration && (
                                                <>
                                                    <strong>⏱️ Időtartam:</strong> {training.duration} perc<br/>
                                                </>
                                            )}
                                        </p>
                                        {training.training_plan && (
                                            <div>
                                                <strong>📝 Edzésterv:</strong>
                                                <p className="small text-muted">{training.training_plan}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="card-footer">
                                        <div className="btn-group w-100" role="group">
                                            <button 
                                                className="btn btn-info btn-sm"
                                                onClick={() => handleAttendance(training.id)}
                                            >
                                                📊 Jelenlét Megtekintése
                                            </button>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => handleQRCheckIn(training.id)}
                                            >
                                                📱 QR Megtekintés
                                            </button>
                                            <button className="btn btn-outline-secondary btn-sm">
                                                📋 Részletek
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Trainings;