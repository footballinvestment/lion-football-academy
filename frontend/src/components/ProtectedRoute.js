import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true, requireRoles = [], requireTeamAccess = null, requirePlayerAccess = null }) => {
    const { user, loading, isAuthenticated, canAccessTeam, canAccessPlayer } = useContext(AuthContext);

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    // Check if authentication is required but user is not authenticated
    if (requireAuth && !isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check if specific roles are required
    if (requireRoles.length > 0 && user) {
        const hasRequiredRole = requireRoles.includes(user.role);
        if (!hasRequiredRole) {
            return (
                <div className="container mt-5">
                    <div className="alert alert-danger">
                        <h4>Hozzáférés megtagadva</h4>
                        <p>Nincs jogosultsága ehhez az oldalhoz.</p>
                    </div>
                </div>
            );
        }
    }

    // Check team access if required
    if (requireTeamAccess && user) {
        const hasTeamAccess = canAccessTeam(requireTeamAccess);
        if (!hasTeamAccess) {
            return (
                <div className="container mt-5">
                    <div className="alert alert-warning">
                        <h4>Csapat hozzáférés szükséges</h4>
                        <p>Nincs jogosultsága ennek a csapatnak az adataihoz.</p>
                    </div>
                </div>
            );
        }
    }

    // Check player access if required
    if (requirePlayerAccess && user) {
        const hasPlayerAccess = canAccessPlayer(requirePlayerAccess);
        if (!hasPlayerAccess) {
            return (
                <div className="container mt-5">
                    <div className="alert alert-warning">
                        <h4>Játékos hozzáférés szükséges</h4>
                        <p>Nincs jogosultsága ennek a játékosnak az adataihoz.</p>
                    </div>
                </div>
            );
        }
    }

    // If all checks pass, render the protected content
    return children;
};

export default ProtectedRoute;