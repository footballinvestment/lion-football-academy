import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import apiService from '../services/api';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        full_name: '',
        role: 'parent',
        team_id: '',
        player_id: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [teams, setTeams] = useState([]);
    const [players, setPlayers] = useState([]);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTeams();
    }, []);

    useEffect(() => {
        if (formData.team_id) {
            fetchPlayers();
        } else {
            setPlayers([]);
        }
    }, [formData.team_id]);

    const fetchTeams = async () => {
        try {
            const response = await apiService.teams.getAll();
            setTeams(response.data || []);
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const fetchPlayers = async () => {
        try {
            const response = await apiService.players.getByTeam(formData.team_id);
            setPlayers(response.data || []);
        } catch (error) {
            console.error('Error fetching players:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset dependent fields when role changes
            ...(name === 'role' && {
                team_id: '',
                player_id: ''
            }),
            // Reset player when team changes
            ...(name === 'team_id' && {
                player_id: ''
            })
        }));
    };

    const validateForm = () => {
        if (formData.password !== formData.confirmPassword) {
            setError('A jelszavak nem egyeznek');
            return false;
        }

        if (formData.password.length < 6) {
            setError('A jelszónak legalább 6 karakter hosszúnak kell lennie');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Érvénytelen email formátum');
            return false;
        }

        if (formData.role === 'coach' && !formData.team_id) {
            setError('Edző esetén a csapat kiválasztása kötelező');
            return false;
        }

        if (formData.role === 'parent' && !formData.player_id) {
            setError('Szülő esetén a játékos kiválasztása kötelező');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const registrationData = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                full_name: formData.full_name,
                role: formData.role,
                team_id: formData.team_id || null,
                player_id: formData.player_id || null
            };

            const response = await register(registrationData);
            if (response.success) {
                navigate('/');
            } else {
                setError(response.error || 'Regisztráció sikertelen');
            }
        } catch (err) {
            setError('Hálózati hiba történt');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8 col-lg-6">
                    <div className="card shadow">
                        <div className="card-header bg-success text-white text-center">
                            <h4>Regisztráció</h4>
                        </div>
                        <div className="card-body">
                            {error && (
                                <div className="alert alert-danger" role="alert">
                                    {error}
                                </div>
                            )}
                            
                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="username" className="form-label">
                                            Felhasználónév *
                                        </label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            id="username"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="email" className="form-label">
                                            Email cím *
                                        </label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="full_name" className="form-label">
                                        Teljes név *
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="full_name"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                    />
                                </div>

                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="password" className="form-label">
                                            Jelszó *
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="password"
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            minLength="6"
                                        />
                                    </div>

                                    <div className="col-md-6 mb-3">
                                        <label htmlFor="confirmPassword" className="form-label">
                                            Jelszó megerősítése *
                                        </label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={formData.confirmPassword}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                            minLength="6"
                                        />
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="role" className="form-label">
                                        Szerepkör *
                                    </label>
                                    <select
                                        className="form-select"
                                        id="role"
                                        name="role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        required
                                        disabled={loading}
                                    >
                                        <option value="parent">Szülő</option>
                                        <option value="coach">Edző</option>
                                    </select>
                                </div>

                                {(formData.role === 'coach' || formData.role === 'parent') && (
                                    <div className="mb-3">
                                        <label htmlFor="team_id" className="form-label">
                                            Csapat {formData.role === 'coach' ? '*' : '(opcionális)'}
                                        </label>
                                        <select
                                            className="form-select"
                                            id="team_id"
                                            name="team_id"
                                            value={formData.team_id}
                                            onChange={handleChange}
                                            required={formData.role === 'coach'}
                                            disabled={loading}
                                        >
                                            <option value="">Válasszon csapatot</option>
                                            {teams.map(team => (
                                                <option key={team.id} value={team.id}>
                                                    {team.name} ({team.age_group})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {formData.role === 'parent' && formData.team_id && (
                                    <div className="mb-3">
                                        <label htmlFor="player_id" className="form-label">
                                            Játékos (gyermek) *
                                        </label>
                                        <select
                                            className="form-select"
                                            id="player_id"
                                            name="player_id"
                                            value={formData.player_id}
                                            onChange={handleChange}
                                            required
                                            disabled={loading}
                                        >
                                            <option value="">Válasszon játékost</option>
                                            {players.map(player => (
                                                <option key={player.id} value={player.id}>
                                                    {player.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="d-grid">
                                    <button
                                        type="submit"
                                        className="btn btn-success"
                                        disabled={loading}
                                    >
                                        {loading ? 'Regisztráció...' : 'Regisztráció'}
                                    </button>
                                </div>
                            </form>

                            <div className="text-center mt-3">
                                <p className="text-muted">
                                    Már van fiókja?{' '}
                                    <button
                                        className="btn btn-link p-0"
                                        onClick={() => navigate('/login')}
                                        disabled={loading}
                                    >
                                        Bejelentkezés
                                    </button>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;