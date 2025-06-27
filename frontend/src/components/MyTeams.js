import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const MyTeams = () => {
    const { user, isAuthenticated } = useContext(AuthContext);
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);
    const [statistics, setStatistics] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isAuthenticated && user?.role === 'coach') {
            fetchCoachData();
        }
    }, [isAuthenticated, user]);

    const fetchCoachData = async () => {
        try {
            setLoading(true);
            const [teamsRes, playersRes, statsRes] = await Promise.all([
                apiService.coaches.getTeams(user.id),
                apiService.coaches.getPlayers(user.id),
                apiService.coaches.getStatistics(user.id)
            ]);

            setTeams(teamsRes.data.teams || []);
            setPlayers(playersRes.data.players || []);
            setStatistics(statsRes.data.statistics || {});
        } catch (error) {
            console.error('Error fetching coach data:', error);
            setError('Hiba történt az adatok betöltésekor');
        } finally {
            setLoading(false);
        }
    };

    const getAvatarPlaceholder = (name) => {
        return name ? name.charAt(0).toUpperCase() : 'U';
    };

    const calculateAge = (birthDate) => {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    };

    if (!isAuthenticated || user?.role !== 'coach') {
        return (
            <div className="container mt-5">
                <div className="alert alert-warning">
                    <h4>Hozzáférés megtagadva</h4>
                    <p>Ez az oldal csak edzők számára elérhető.</p>
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
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <h2>🏆 Saját Csapataim</h2>
                    
                    {error && (
                        <div className="alert alert-danger alert-dismissible fade show" role="alert">
                            {error}
                            <button type="button" className="btn-close" onClick={() => setError('')}></button>
                        </div>
                    )}

                    {/* Coach Statistics */}
                    <div className="row mb-4">
                        <div className="col-md-3">
                            <div className="card bg-primary text-white">
                                <div className="card-body text-center">
                                    <h4>{statistics.teamCount || 0}</h4>
                                    <small>Csapat</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-success text-white">
                                <div className="card-body text-center">
                                    <h4>{statistics.playerCount || 0}</h4>
                                    <small>Játékos</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-warning text-white">
                                <div className="card-body text-center">
                                    <h4>{statistics.upcomingTrainings || 0}</h4>
                                    <small>Következő Edzés</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card bg-info text-white">
                                <div className="card-body text-center">
                                    <h4>{statistics.totalTrainings || 0}</h4>
                                    <small>Összes Edzés</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Teams Section */}
                    <div className="row">
                        {teams.length > 0 ? (
                            teams.map(team => (
                                <div key={team.id} className="col-lg-6 mb-4">
                                    <div className="card h-100">
                                        <div className="card-header d-flex justify-content-between align-items-center">
                                            <h5 className="mb-0">{team.name}</h5>
                                            <span className="badge bg-primary">{team.age_group}</span>
                                        </div>
                                        <div className="card-body">
                                            <div className="row">
                                                <div className="col-md-6">
                                                    <h6>Csapat Információk</h6>
                                                    <p className="mb-1"><strong>Korosztály:</strong> {team.age_group}</p>
                                                    <p className="mb-1"><strong>Szín:</strong> {team.team_color || 'Nincs megadva'}</p>
                                                    <p className="mb-1"><strong>Szezon:</strong> {team.season || 'Aktuális'}</p>
                                                    <p className="mb-1"><strong>Játékosok:</strong> {players.length}</p>
                                                </div>
                                                <div className="col-md-6">
                                                    <h6>Quick Actions</h6>
                                                    <div className="d-grid gap-2">
                                                        <Link 
                                                            to={`/teams`} 
                                                            className="btn btn-outline-primary btn-sm"
                                                        >
                                                            📊 Csapat Részletek
                                                        </Link>
                                                        <Link 
                                                            to={`/players`} 
                                                            className="btn btn-outline-success btn-sm"
                                                        >
                                                            👥 Játékosok
                                                        </Link>
                                                        <Link 
                                                            to={`/trainings`} 
                                                            className="btn btn-outline-warning btn-sm"
                                                        >
                                                            🏃 Edzések
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-12">
                                <div className="card bg-light">
                                    <div className="card-body text-center">
                                        <h5>Nincs hozzárendelt csapat</h5>
                                        <p className="text-muted">
                                            Jelenleg nincs csapat hozzárendelve az Ön edző fiókjához.
                                            Kérjük, vegye fel a kapcsolatot az adminisztrátorral.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Players Section */}
                    {players.length > 0 && (
                        <div className="row mt-4">
                            <div className="col-12">
                                <div className="card">
                                    <div className="card-header">
                                        <h5>Játékosok ({players.length})</h5>
                                    </div>
                                    <div className="card-body">
                                        <div className="row">
                                            {players.map(player => (
                                                <div key={player.id} className="col-lg-4 col-md-6 mb-3">
                                                    <div className="card bg-light">
                                                        <div className="card-body p-3">
                                                            <div className="d-flex align-items-center">
                                                                <div 
                                                                    className="rounded-circle bg-success text-white d-flex align-items-center justify-content-center me-3"
                                                                    style={{ width: '40px', height: '40px' }}
                                                                >
                                                                    {getAvatarPlaceholder(player.name)}
                                                                </div>
                                                                <div>
                                                                    <h6 className="mb-0">{player.name}</h6>
                                                                    <small className="text-muted">
                                                                        {calculateAge(player.birth_date)} éves
                                                                        {player.position && ` • ${player.position}`}
                                                                        {player.dominant_foot && ` • ${player.dominant_foot}`}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Navigation */}
                    <div className="row mt-4">
                        <div className="col-12">
                            <div className="card bg-primary text-white">
                                <div className="card-body">
                                    <h5>Gyors Navigáció</h5>
                                    <div className="row">
                                        <div className="col-md-3">
                                            <Link to="/trainings" className="btn btn-light btn-sm w-100">
                                                🏃 Edzések Kezelése
                                            </Link>
                                        </div>
                                        <div className="col-md-3">
                                            <Link to="/players" className="btn btn-light btn-sm w-100">
                                                👥 Játékosok Kezelése
                                            </Link>
                                        </div>
                                        <div className="col-md-3">
                                            <Link to="/announcements" className="btn btn-light btn-sm w-100">
                                                📢 Hírek
                                            </Link>
                                        </div>
                                        <div className="col-md-3">
                                            <Link to="/statistics" className="btn btn-light btn-sm w-100">
                                                📈 Statisztikák
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyTeams;