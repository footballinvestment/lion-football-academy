import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import ResponsiveTable, { createPlayerTableConfig } from '../components/ResponsiveTable';
import apiService from '../services/api';
import PlayerList from '../components/PlayerList';
import PlayerModal from '../components/PlayerModal';
import { handleApiError, ErrorAlert, ConfirmationModal } from '../utils/errorHandler';

const Players = () => {
    const { user, canViewAllPlayers } = useContext(AuthContext);
    const [players, setPlayers] = useState([]);
    const [teams, setTeams] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTeam, setFilterTeam] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, playerId: null, playerName: '' });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            
            // Check permissions before making API calls
            if (!canViewAllPlayers()) {
                setError('Nincs jogosultsága az összes játékos megtekintéséhez. Ez az oldal csak adminisztrátorok és edzők számára elérhető.');
                setLoading(false);
                return;
            }
            
            const [playersRes, teamsRes] = await Promise.all([
                apiService.players.getAll(),
                apiService.teams.getAll()
            ]);
            
            setPlayers(playersRes.data);
            setTeams(teamsRes.data);
        } catch (error) {
            console.error('Hiba az adatok betöltésénél:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [canViewAllPlayers]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Játékosok szűrése
    const filteredPlayers = players.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTeam = filterTeam === '' || player.team_id === parseInt(filterTeam);
        return matchesSearch && matchesTeam;
    });

    // CRUD műveletek
    const handleAddPlayer = async (playerData) => {
        try {
            const response = await apiService.players.create(playerData);
            setPlayers([...players, response.data]);
            setShowModal(false);
            setSelectedPlayer(null);
        } catch (error) {
            console.error('Hiba a játékos hozzáadásánál:', error);
            throw error; // A PlayerModal-ban kezeljük
        }
    };

    const handleEditPlayer = async (id, playerData) => {
        try {
            const response = await apiService.players.update(id, playerData);
            setPlayers(players.map(p => p.id === id ? response.data : p));
            setShowModal(false);
            setSelectedPlayer(null);
        } catch (error) {
            console.error('Hiba a játékos módosításánál:', error);
            throw error; // A PlayerModal-ban kezeljük
        }
    };

    const handleDeletePlayer = (id) => {
        const player = players.find(p => p.id === id);
        setDeleteConfirm({
            show: true,
            playerId: id,
            playerName: player ? player.name : 'Ismeretlen játékos'
        });
    };

    const confirmDelete = async () => {
        try {
            await apiService.players.delete(deleteConfirm.playerId);
            setPlayers(players.filter(p => p.id !== deleteConfirm.playerId));
            setDeleteConfirm({ show: false, playerId: null, playerName: '' });
        } catch (error) {
            console.error('Hiba a játékos törlésénél:', error);
            const errorMessage = handleApiError(error);
            setError(errorMessage);
        }
    };

    const cancelDelete = () => {
        setDeleteConfirm({ show: false, playerId: null, playerName: '' });
    };

    const openAddModal = () => {
        setSelectedPlayer(null);
        setShowModal(true);
    };

    const openEditModal = (player) => {
        setSelectedPlayer(player);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setSelectedPlayer(null);
    };

    if (loading) {
        return <LoadingSpinner fullPage text="Játékosok betöltése..." />;
    }

    if (error) {
        return (
            <ErrorAlert 
                message={error} 
                onClose={() => setError(null)}
            />
        );
    }

    return (
        <ErrorBoundary>
            <div>
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
                <h1 className="mb-3 mb-md-0">👥 Játékosok Kezelése</h1>
                <button 
                    className="btn btn-primary mobile-btn"
                    onClick={openAddModal}
                >
                    <i className="fas fa-plus me-2"></i>
                    Új Játékos
                </button>
            </div>

            {/* Keresés és szűrés */}
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="input-group">
                        <span className="input-group-text">🔍</span>
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Keresés név alapján..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-md-4">
                    <select
                        className="form-select"
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                    >
                        <option value="">🏆 Összes csapat</option>
                        {teams.map(team => (
                            <option key={team.id} value={team.id}>
                                {team.name} ({team.age_group})
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-2">
                    <button 
                        className="btn btn-outline-secondary w-100"
                        onClick={() => {
                            setSearchTerm('');
                            setFilterTeam('');
                        }}
                    >
                        🗑️ Törlés
                    </button>
                </div>
            </div>

            {/* Statisztikák */}
            <div className="row mb-3">
                <div className="col-md-12">
                    <div className="alert alert-info">
                        <strong>📊 Statisztikák:</strong> 
                        {' '}Összesen {players.length} játékos
                        {searchTerm || filterTeam ? ` (${filteredPlayers.length} szűrt eredmény)` : ''}
                        {' '}• {teams.length} csapat
                    </div>
                </div>
            </div>

            {/* Játékosok listája */}
            <div className="card">
                <div className="card-body p-0">
                    <ResponsiveTable 
                        {...createPlayerTableConfig(openEditModal, handleDeletePlayer)}
                        data={filteredPlayers}
                        emptyMessage="Nincs játékos a megadott kritériumoknak megfelelően"
                    />
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <PlayerModal
                    player={selectedPlayer}
                    teams={teams}
                    onSave={selectedPlayer ? 
                        (data) => handleEditPlayer(selectedPlayer.id, data) : 
                        handleAddPlayer
                    }
                    onClose={closeModal}
                />
            )}

            {/* Delete confirmation modal */}
            <ConfirmationModal
                show={deleteConfirm.show}
                title="Játékos törlése"
                message={`Biztosan törölni szeretnéd "${deleteConfirm.playerName}" játékost? Ez a művelet nem vonható vissza.`}
                onConfirm={confirmDelete}
                onCancel={cancelDelete}
                confirmText="Törlés"
                cancelText="Mégse"
                variant="danger"
            />
            </div>
        </ErrorBoundary>
    );
};

export default Players;