import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { 
        user, 
        logout, 
        isAuthenticated, 
        canViewStatistics, 
        canViewAI, 
        canManageUsers,
        canManageTeams,
        canUseQRCheckin,
        canViewAllPlayers,
        canAccessFeature
    } = useContext(AuthContext);

    const isActive = (path) => {
        return location.pathname === path ? 'nav-link active' : 'nav-link';
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
            <div className="container">
                <Link className="navbar-brand" to="/">
                    ⚽ Futball Akadémia
                </Link>
                
                <button 
                    className="navbar-toggler" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#navbarNav"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>
                
                <div className="collapse navbar-collapse" id="navbarNav">
                    {isAuthenticated ? (
                        <>
                            <div className="navbar-nav me-auto">
                                <Link className={isActive('/')} to="/">
                                    📊 Dashboard
                                </Link>
                                
                                {/* Admin Panel - csak admin */}
                                {canManageUsers() && (
                                    <Link className={isActive('/admin')} to="/admin">
                                        👨‍💼 Admin Panel
                                    </Link>
                                )}
                                
                                {/* Csapataim - csak coach */}
                                {canManageTeams() && (
                                    <Link className={isActive('/my-teams')} to="/my-teams">
                                        🏆 Csapataim
                                    </Link>
                                )}
                                
                                {/* Játékosok - admin és coach */}
                                {canViewAllPlayers() && (
                                    <Link className={isActive('/players')} to="/players">
                                        👥 Játékosok
                                    </Link>
                                )}
                                
                                {/* Csapatok - admin és coach */}
                                {canViewAllPlayers() && (
                                    <Link className={isActive('/teams')} to="/teams">
                                        🏆 Csapatok
                                    </Link>
                                )}
                                
                                <Link className={isActive('/trainings')} to="/trainings">
                                    🏃 Edzések
                                </Link>
                                
                                <Link className={isActive('/announcements')} to="/announcements">
                                    📢 Hírek
                                </Link>
                                
                                {/* Mérkőzések - mindenki láthatja */}
                                <Link className={isActive('/matches')} to="/matches">
                                    ⚽ Mérkőzések
                                </Link>
                                
                                {/* Statisztikák - admin és coach */}
                                {canViewStatistics() && (
                                    <Link className={isActive('/statistics')} to="/statistics">
                                        📈 Statisztikák
                                    </Link>
                                )}
                                
                                {/* AI Analytics - admin és coach */}  
                                {canViewAI() && (
                                    <Link className={isActive('/ai-analytics')} to="/ai-analytics">
                                        🤖 AI Analytics
                                    </Link>
                                )}
                                
                                {/* Injuries - admin és coach */}
                                {canAccessFeature('canManageInjuries') && (
                                    <Link className={isActive('/injuries')} to="/injuries">
                                        🩹 Sérülések
                                    </Link>
                                )}
                                
                                {/* Development Plans - admin és coach */}
                                {(user?.role === 'admin' || user?.role === 'coach') && (
                                    <Link className={isActive('/development-plans')} to="/development-plans">
                                        📋 Fejlesztési Tervek
                                    </Link>
                                )}
                                
                                {/* Pénzügyek - mindenki láthatja */}
                                <Link className={isActive('/billing')} to="/billing">
                                    💰 Pénzügyek
                                </Link>
                                
                                {/* QR Check-in - admin és coach */}
                                {canUseQRCheckin() && (
                                    <Link className={isActive('/qr-checkin')} to="/qr-checkin">
                                        📱 QR Check-in
                                    </Link>
                                )}
                            </div>
                            <div className="navbar-nav ms-auto">
                                <Link className={isActive('/profile')} to="/profile">
                                    👤 Profil
                                </Link>
                                <span className="navbar-text me-3">
                                    Üdvözöljük, {user?.full_name || user?.username}!
                                    <small className="d-block text-light opacity-75">
                                        {user?.role === 'admin' ? 'Adminisztrátor' : 
                                         user?.role === 'coach' ? 'Edző' : 
                                         user?.role === 'parent' ? 'Szülő' :
                                         user?.role === 'player' ? 'Játékos' : 'Felhasználó'}
                                    </small>
                                </span>
                                <button 
                                    className="btn btn-outline-light btn-sm"
                                    onClick={handleLogout}
                                >
                                    Kijelentkezés
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="navbar-nav ms-auto">
                            <Link className={isActive('/login')} to="/login">
                                Bejelentkezés
                            </Link>
                            {/* Registration is now admin-only, removed from public navbar */}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;