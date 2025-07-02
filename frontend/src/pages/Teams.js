import React, { useState, useEffect, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import LoadingSpinner from '../components/LoadingSpinner';
import ResponsiveTable, { createTeamTableConfig } from '../components/ResponsiveTable';
import apiService from '../services/api';

const Teams = () => {
    const { user, canAccessFeature } = useContext(AuthContext);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchTeams = useCallback(async () => {
        try {
            setLoading(true);
            
            // Check permissions before making API calls
            if (!canAccessFeature('all-teams')) {
                setError('Nincs jogosultsága az összes csapat megtekintéséhez. Ez az oldal csak adminisztrátorok és edzők számára elérhető.');
                setLoading(false);
                return;
            }
            
            const response = await apiService.teams.getAll();
            setTeams(response.data);
        } catch (error) {
            console.error('Hiba a csapatok betöltésénél:', error);
            setError('Hiba történt a csapatok betöltése során');
        } finally {
            setLoading(false);
        }
    }, [canAccessFeature]);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    if (loading) {
        return <LoadingSpinner fullPage text="Csapatok betöltése..." />;
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className="container-fluid">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
                    <div>
                        <h1 className="mb-2">🏆 Csapatok</h1>
                        <p className="text-muted mb-3 mb-md-0">Csapatok kezelése és áttekintése</p>
                    </div>
                    <button className="btn btn-primary mobile-btn">
                        <i className="fas fa-plus me-2"></i>
                        Új Csapat
                    </button>
                </div>
                
                <div className="card">
                    <div className="card-body p-0">
                        <ResponsiveTable 
                            {...createTeamTableConfig(
                                (team) => console.log('Edit team:', team),
                                (team) => console.log('Delete team:', team)
                            )}
                            data={teams}
                            emptyMessage="Még nincsenek csapatok regisztrálva"
                        />
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default Teams;