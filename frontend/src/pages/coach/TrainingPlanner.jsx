import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card, Button, Alert, LoadingSpinner, Modal, Tabs } from '../../components/ui';
import { api } from '../../services/api';
import './TrainingPlanner.css';

const TrainingPlanner = () => {
    const navigate = useNavigate();
    const { trainingId } = useParams();
    const [trainingSessions, setTrainingSessions] = useState([]);
    const [teams, setTeams] = useState([]);
    const [selectedTraining, setSelectedTraining] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeTab, setActiveTab] = useState('upcoming');

    // Form state for creating/editing training
    const [trainingForm, setTrainingForm] = useState({
        title: '',
        description: '',
        team_id: '',
        date: '',
        time: '',
        duration: 90,
        location: '',
        training_type: 'general',
        focus_areas: [],
        equipment_needed: [],
        max_players: '',
        notes: ''
    });

    const trainingTypes = [
        { value: 'general', label: '🏃 General Training', description: 'Overall fitness and skill development' },
        { value: 'technical', label: '⚽ Technical Skills', description: 'Ball control, passing, shooting' },
        { value: 'tactical', label: '🧠 Tactical', description: 'Formation, positioning, strategy' },
        { value: 'physical', label: '💪 Physical Conditioning', description: 'Strength, endurance, agility' },
        { value: 'goalkeeper', label: '🥅 Goalkeeper Training', description: 'Specialized keeper skills' },
        { value: 'match_prep', label: '📋 Match Preparation', description: 'Pre-match tactical session' }
    ];

    const focusAreas = [
        'Passing', 'Shooting', 'Defending', 'Attacking', 'Set Pieces', 
        'Crossing', 'Finishing', 'Ball Control', 'Speed', 'Agility',
        'Endurance', 'Strength', 'Flexibility', 'Team Play', 'Individual Skills'
    ];

    const equipmentOptions = [
        'Cones', 'Bibs', 'Balls', 'Goals', 'Hurdles', 'Ladder',
        'Poles', 'Mannequins', 'Resistance Bands', 'Medicine Balls',
        'Agility Rings', 'Markers', 'First Aid Kit'
    ];

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (trainingId) {
            fetchTrainingDetails(trainingId);
        }
    }, [trainingId]);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [trainingsRes, teamsRes] = await Promise.all([
                api.get('/coach/trainings'),
                api.get('/coach/teams')
            ]);
            
            setTrainingSessions(trainingsRes.data);
            setTeams(teamsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            setError('Failed to load training data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrainingDetails = async (id) => {
        try {
            const response = await api.get(`/trainings/${id}`);
            setSelectedTraining(response.data);
        } catch (error) {
            console.error('Error fetching training details:', error);
            setError('Failed to load training details.');
        }
    };

    const handleFormChange = (field, value) => {
        setTrainingForm(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleArrayField = (field, value) => {
        setTrainingForm(prev => ({
            ...prev,
            [field]: prev[field].includes(value)
                ? prev[field].filter(item => item !== value)
                : [...prev[field], value]
        }));
    };

    const handleCreateTraining = async (e) => {
        e.preventDefault();
        
        if (!trainingForm.title || !trainingForm.team_id || !trainingForm.date || !trainingForm.time) {
            setError('Please fill in all required fields.');
            return;
        }

        try {
            const trainingData = {
                ...trainingForm,
                datetime: `${trainingForm.date}T${trainingForm.time}:00`
            };

            const response = await api.post('/trainings', trainingData);
            setTrainingSessions(prev => [response.data, ...prev]);
            setShowCreateModal(false);
            resetForm();
            
            // Navigate to the new training's attendance page
            navigate(`/coach/trainings/${response.data.id}/attendance`);
        } catch (error) {
            console.error('Error creating training:', error);
            setError('Failed to create training session. Please try again.');
        }
    };

    const resetForm = () => {
        setTrainingForm({
            title: '',
            description: '',
            team_id: '',
            date: '',
            time: '',
            duration: 90,
            location: '',
            training_type: 'general',
            focus_areas: [],
            equipment_needed: [],
            max_players: '',
            notes: ''
        });
    };

    const deleteTraining = async (id) => {
        if (!window.confirm('Are you sure you want to delete this training session?')) {
            return;
        }

        try {
            await api.delete(`/trainings/${id}`);
            setTrainingSessions(prev => prev.filter(training => training.id !== id));
        } catch (error) {
            console.error('Error deleting training:', error);
            setError('Failed to delete training session.');
        }
    };

    const formatDateTime = (datetime) => {
        const date = new Date(datetime);
        return {
            date: date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            }),
            time: date.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
    };

    const getTrainingTypeInfo = (type) => {
        return trainingTypes.find(t => t.value === type) || trainingTypes[0];
    };

    const filterTrainings = (sessions) => {
        const now = new Date();
        switch (activeTab) {
            case 'upcoming':
                return sessions.filter(session => new Date(session.datetime) >= now);
            case 'past':
                return sessions.filter(session => new Date(session.datetime) < now);
            case 'today':
                const today = new Date().toDateString();
                return sessions.filter(session => new Date(session.datetime).toDateString() === today);
            default:
                return sessions;
        }
    };

    if (loading) {
        return (
            <div className="training-planner">
                <div className="training-planner__loading">
                    <LoadingSpinner size="large" />
                    <p>Loading training sessions...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="training-planner">
            {/* Header */}
            <div className="training-planner__header">
                <div className="training-planner__header-content">
                    <div className="training-planner__title">
                        <h1>Training Planner</h1>
                        <p>Schedule and manage training sessions</p>
                    </div>
                    <div className="training-planner__header-actions">
                        <Button 
                            onClick={() => setShowCreateModal(true)}
                            variant="primary"
                        >
                            ➕ Schedule Training
                        </Button>
                        <Button 
                            as={Link} 
                            to="/coach/teams"
                            variant="secondary"
                        >
                            👥 Manage Teams
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Training Sessions */}
            <Card>
                <Card.Header>
                    <h2>Training Sessions</h2>
                </Card.Header>
                <Card.Body>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <Tabs.List>
                            <Tabs.Trigger value="upcoming">Upcoming</Tabs.Trigger>
                            <Tabs.Trigger value="today">Today</Tabs.Trigger>
                            <Tabs.Trigger value="past">Past Sessions</Tabs.Trigger>
                        </Tabs.List>

                        <Tabs.Content value={activeTab}>
                            <div className="training-planner__sessions">
                                {filterTrainings(trainingSessions).length > 0 ? (
                                    <div className="training-planner__sessions-grid">
                                        {filterTrainings(trainingSessions).map((training) => {
                                            const { date, time } = formatDateTime(training.datetime);
                                            const typeInfo = getTrainingTypeInfo(training.training_type);
                                            const team = teams.find(t => t.id === training.team_id);
                                            const isPast = new Date(training.datetime) < new Date();

                                            return (
                                                <div 
                                                    key={training.id} 
                                                    className={`training-planner__session-card ${isPast ? 'training-planner__session-card--past' : ''}`}
                                                >
                                                    <div className="training-planner__session-header">
                                                        <div className="training-planner__session-type">
                                                            <span className="training-planner__session-icon">
                                                                {typeInfo.label.split(' ')[0]}
                                                            </span>
                                                            <span className="training-planner__session-type-label">
                                                                {typeInfo.label.split(' ').slice(1).join(' ')}
                                                            </span>
                                                        </div>
                                                        <div className="training-planner__session-actions">
                                                            {!isPast && (
                                                                <Button
                                                                    as={Link}
                                                                    to={`/coach/trainings/${training.id}/edit`}
                                                                    variant="ghost"
                                                                    size="sm"
                                                                >
                                                                    ✏️
                                                                </Button>
                                                            )}
                                                            <Button
                                                                onClick={() => deleteTraining(training.id)}
                                                                variant="ghost"
                                                                size="sm"
                                                                className="training-planner__delete-btn"
                                                            >
                                                                🗑️
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="training-planner__session-content">
                                                        <h3>{training.title}</h3>
                                                        {training.description && (
                                                            <p className="training-planner__session-description">
                                                                {training.description}
                                                            </p>
                                                        )}

                                                        <div className="training-planner__session-details">
                                                            <div className="training-planner__session-meta">
                                                                <span className="training-planner__session-date">
                                                                    📅 {date}
                                                                </span>
                                                                <span className="training-planner__session-time">
                                                                    🕐 {time}
                                                                </span>
                                                                <span className="training-planner__session-duration">
                                                                    ⏱️ {training.duration}min
                                                                </span>
                                                            </div>

                                                            {training.location && (
                                                                <div className="training-planner__session-location">
                                                                    📍 {training.location}
                                                                </div>
                                                            )}

                                                            {team && (
                                                                <div className="training-planner__session-team">
                                                                    🏆 {team.name}
                                                                </div>
                                                            )}

                                                            {training.focus_areas && training.focus_areas.length > 0 && (
                                                                <div className="training-planner__session-focus">
                                                                    <span>Focus:</span>
                                                                    <div className="training-planner__focus-tags">
                                                                        {training.focus_areas.slice(0, 3).map((area, index) => (
                                                                            <span key={index} className="training-planner__focus-tag">
                                                                                {area}
                                                                            </span>
                                                                        ))}
                                                                        {training.focus_areas.length > 3 && (
                                                                            <span className="training-planner__focus-tag training-planner__focus-tag--more">
                                                                                +{training.focus_areas.length - 3}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="training-planner__session-stats">
                                                            <div className="training-planner__stat">
                                                                <span className="training-planner__stat-value">
                                                                    {training.attendees || 0}
                                                                </span>
                                                                <span className="training-planner__stat-label">Attendees</span>
                                                            </div>
                                                            {training.max_players && (
                                                                <div className="training-planner__stat">
                                                                    <span className="training-planner__stat-value">
                                                                        {training.max_players}
                                                                    </span>
                                                                    <span className="training-planner__stat-label">Max Players</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="training-planner__session-actions-bottom">
                                                            <Button
                                                                as={Link}
                                                                to={`/coach/trainings/${training.id}/attendance`}
                                                                variant="primary"
                                                                size="sm"
                                                            >
                                                                {isPast ? 'View Report' : 'Take Attendance'}
                                                            </Button>
                                                            <Button
                                                                as={Link}
                                                                to={`/coach/trainings/${training.id}`}
                                                                variant="ghost"
                                                                size="sm"
                                                            >
                                                                View Details
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="training-planner__empty">
                                        <p>No training sessions found for this period.</p>
                                        <Button 
                                            onClick={() => setShowCreateModal(true)}
                                            variant="primary"
                                        >
                                            Schedule Your First Training
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Tabs.Content>
                    </Tabs>
                </Card.Body>
            </Card>

            {/* Create Training Modal */}
            {showCreateModal && (
                <Modal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    title="Schedule New Training Session"
                    size="large"
                >
                    <form onSubmit={handleCreateTraining} className="training-planner__form">
                        <div className="training-planner__form-section">
                            <h4>Basic Information</h4>
                            <div className="training-planner__form-grid">
                                <div className="training-planner__form-field">
                                    <label htmlFor="title">Training Title *</label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={trainingForm.title}
                                        onChange={(e) => handleFormChange('title', e.target.value)}
                                        placeholder="e.g., Technical Skills Training"
                                        required
                                    />
                                </div>

                                <div className="training-planner__form-field">
                                    <label htmlFor="team_id">Team *</label>
                                    <select
                                        id="team_id"
                                        value={trainingForm.team_id}
                                        onChange={(e) => handleFormChange('team_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Select Team</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} ({team.category})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="training-planner__form-field">
                                    <label htmlFor="date">Date *</label>
                                    <input
                                        type="date"
                                        id="date"
                                        value={trainingForm.date}
                                        onChange={(e) => handleFormChange('date', e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>

                                <div className="training-planner__form-field">
                                    <label htmlFor="time">Time *</label>
                                    <input
                                        type="time"
                                        id="time"
                                        value={trainingForm.time}
                                        onChange={(e) => handleFormChange('time', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="training-planner__form-field">
                                    <label htmlFor="duration">Duration (minutes)</label>
                                    <input
                                        type="number"
                                        id="duration"
                                        value={trainingForm.duration}
                                        onChange={(e) => handleFormChange('duration', parseInt(e.target.value))}
                                        min="30"
                                        max="180"
                                    />
                                </div>

                                <div className="training-planner__form-field">
                                    <label htmlFor="location">Location</label>
                                    <input
                                        type="text"
                                        id="location"
                                        value={trainingForm.location}
                                        onChange={(e) => handleFormChange('location', e.target.value)}
                                        placeholder="e.g., Main Field, Gym"
                                    />
                                </div>
                            </div>

                            <div className="training-planner__form-field">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={trainingForm.description}
                                    onChange={(e) => handleFormChange('description', e.target.value)}
                                    placeholder="Brief description of the training session..."
                                    rows="3"
                                />
                            </div>
                        </div>

                        <div className="training-planner__form-section">
                            <h4>Training Type</h4>
                            <div className="training-planner__training-types">
                                {trainingTypes.map(type => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        className={`training-planner__type-option ${
                                            trainingForm.training_type === type.value ? 'training-planner__type-option--selected' : ''
                                        }`}
                                        onClick={() => handleFormChange('training_type', type.value)}
                                    >
                                        <span className="training-planner__type-icon">
                                            {type.label.split(' ')[0]}
                                        </span>
                                        <div className="training-planner__type-content">
                                            <h5>{type.label.split(' ').slice(1).join(' ')}</h5>
                                            <p>{type.description}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="training-planner__form-section">
                            <h4>Focus Areas</h4>
                            <div className="training-planner__checkboxes">
                                {focusAreas.map(area => (
                                    <label key={area} className="training-planner__checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={trainingForm.focus_areas.includes(area)}
                                            onChange={() => handleArrayField('focus_areas', area)}
                                        />
                                        <span>{area}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="training-planner__form-section">
                            <h4>Equipment Needed</h4>
                            <div className="training-planner__checkboxes">
                                {equipmentOptions.map(equipment => (
                                    <label key={equipment} className="training-planner__checkbox-item">
                                        <input
                                            type="checkbox"
                                            checked={trainingForm.equipment_needed.includes(equipment)}
                                            onChange={() => handleArrayField('equipment_needed', equipment)}
                                        />
                                        <span>{equipment}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="training-planner__form-section">
                            <div className="training-planner__form-grid">
                                <div className="training-planner__form-field">
                                    <label htmlFor="max_players">Max Players (optional)</label>
                                    <input
                                        type="number"
                                        id="max_players"
                                        value={trainingForm.max_players}
                                        onChange={(e) => handleFormChange('max_players', e.target.value)}
                                        min="1"
                                        max="30"
                                        placeholder="Leave empty for no limit"
                                    />
                                </div>
                            </div>

                            <div className="training-planner__form-field">
                                <label htmlFor="notes">Notes</label>
                                <textarea
                                    id="notes"
                                    value={trainingForm.notes}
                                    onChange={(e) => handleFormChange('notes', e.target.value)}
                                    placeholder="Additional notes or special instructions..."
                                    rows="3"
                                />
                            </div>
                        </div>

                        <div className="training-planner__form-actions">
                            <Button 
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                variant="ghost"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                Schedule Training
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default TrainingPlanner;