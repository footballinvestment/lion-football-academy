import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchAnnouncements();
    }, [filter]);

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            
            let response;
            if (filter === 'urgent') {
                response = await apiService.announcements.getUrgent();
            } else {
                response = await apiService.announcements.getAll();
            }
            setAnnouncements(response.data);
            setError(null);
        } catch (err) {
            setError('Hiba történt a hírek betöltése közben');
            console.error('Error fetching announcements:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('hu-HU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryBadge = (category) => {
        const badges = {
            'edzés': 'badge bg-success',
            'verseny': 'badge bg-warning text-dark',
            'esemény': 'badge bg-info',
            'általános': 'badge bg-secondary'
        };
        return badges[category] || 'badge bg-secondary';
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Betöltés...</span>
                    </div>
                    <p className="mt-2">Hírek betöltése...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger" role="alert">
                    <h4 className="alert-heading">Hiba!</h4>
                    <p>{error}</p>
                    <button className="btn btn-outline-danger" onClick={fetchAnnouncements}>
                        Újrapróbálás
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            {/* Page Header */}
            <div className="row mb-4">
                <div className="col">
                    <h1 className="display-4">📢 Hírek és Közlemények</h1>
                    <p className="lead text-muted">
                        Aktuális hírek, események és közlemények az akadémia életéből
                    </p>
                </div>
            </div>

            {/* Filter Controls */}
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="btn-group" role="group">
                        <button
                            type="button"
                            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setFilter('all')}
                        >
                            Összes hír
                        </button>
                        <button
                            type="button"
                            className={`btn ${filter === 'urgent' ? 'btn-danger' : 'btn-outline-danger'}`}
                            onClick={() => setFilter('urgent')}
                        >
                            🚨 Sürgős hírek
                        </button>
                    </div>
                </div>
                <div className="col-md-6 text-end">
                    <span className="text-muted">
                        Összesen: {announcements.length} hír
                    </span>
                </div>
            </div>

            {/* Announcements List */}
            {announcements.length === 0 ? (
                <div className="row">
                    <div className="col">
                        <div className="alert alert-info text-center">
                            <h4>📭 Nincsenek hírek</h4>
                            <p className="mb-0">
                                {filter === 'urgent' 
                                    ? 'Jelenleg nincsenek sürgős hírek.' 
                                    : 'Jelenleg nincsenek elérhető hírek.'
                                }
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="row">
                    {announcements.map((announcement) => (
                        <div key={announcement.id} className="col-12 mb-4">
                            <div className={`card ${announcement.urgent ? 'border-danger' : ''}`}>
                                {announcement.urgent && (
                                    <div className="card-header bg-danger text-white">
                                        <small><strong>🚨 SÜRGŐS HÍRKÖZLEMÉNY</strong></small>
                                    </div>
                                )}
                                <div className="card-body">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="card-title mb-0">
                                            {announcement.title}
                                        </h5>
                                        <span className={getCategoryBadge(announcement.category)}>
                                            {announcement.category}
                                        </span>
                                    </div>
                                    
                                    <p className="card-text text-muted mb-2">
                                        <small>
                                            📅 {formatDate(announcement.created_at)}
                                            {announcement.team_name && (
                                                <> • 🏆 {announcement.team_name}</>
                                            )}
                                        </small>
                                    </p>
                                    
                                    <p className="card-text">
                                        {announcement.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Button for Future Enhancement */}
            <div className="row mt-4">
                <div className="col">
                    <div className="text-center">
                        <button className="btn btn-outline-secondary" disabled>
                            ➕ Új hír hozzáadása
                            <small className="d-block text-muted">(Hamarosan elérhető)</small>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Announcements;