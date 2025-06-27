import React, { createContext, useState, useEffect, useContext } from 'react';
import apiService from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));

    useEffect(() => {
        if (token) {
            verifyToken();
        } else {
            setLoading(false);
        }
    }, [token]);

    const verifyToken = async () => {
        try {
            const response = await apiService.auth.verify();
            if (response.data.success) {
                setUser(response.data.user);
                apiService.setAuthToken(token);
            } else {
                logout();
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await apiService.auth.login(username, password);
            
            if (response.data.success) {
                const { user, tokens } = response.data;
                setUser(user);
                setToken(tokens.accessToken);
                localStorage.setItem('token', tokens.accessToken);
                localStorage.setItem('refreshToken', tokens.refreshToken);
                apiService.setAuthToken(tokens.accessToken);
                
                return { success: true, user };
            } else {
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Bejelentkezési hiba történt' 
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await apiService.auth.register(userData);
            
            if (response.data.success) {
                const { user, tokens } = response.data;
                setUser(user);
                setToken(tokens.accessToken);
                localStorage.setItem('token', tokens.accessToken);
                localStorage.setItem('refreshToken', tokens.refreshToken);
                apiService.setAuthToken(tokens.accessToken);
                
                return { success: true, user };
            } else {
                return { success: false, error: response.data.message };
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Regisztrációs hiba történt' 
            };
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        apiService.clearAuthToken();
    };

    const refreshToken = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
                logout();
                return false;
            }

            const response = await apiService.auth.refreshToken(refreshToken);
            
            if (response.data.success) {
                const newToken = response.data.accessToken;
                setToken(newToken);
                localStorage.setItem('token', newToken);
                apiService.setAuthToken(newToken);
                return true;
            } else {
                logout();
                return false;
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
            return false;
        }
    };

    const changePassword = async (oldPassword, newPassword) => {
        try {
            const response = await apiService.auth.changePassword(oldPassword, newPassword);
            return response.data;
        } catch (error) {
            console.error('Password change error:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Jelszó módosítási hiba történt' 
            };
        }
    };

    const isAdmin = () => {
        return user && user.role === 'admin';
    };

    const isCoach = () => {
        return user && user.role === 'coach';
    };

    const isParent = () => {
        return user && user.role === 'parent';
    };

    const isAdminOrCoach = () => {
        return user && (user.role === 'admin' || user.role === 'coach');
    };

    const canAccessTeam = (teamId) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'coach' && user.team_id === parseInt(teamId)) return true;
        if (user.role === 'parent' && user.team_id === parseInt(teamId)) return true;
        return false;
    };

    // Permission check functions
    const canAccessFeature = (feature) => {
        if (!user) return false;
        
        const permissions = {
            'statistics': ['admin', 'coach'],
            'ai-analytics': ['admin', 'coach'], 
            'admin-panel': ['admin'],
            'my-teams': ['coach'],
            'all-players': ['admin', 'coach'],
            'all-teams': ['admin', 'coach'],
            'qr-checkin': ['admin', 'coach'],
            'user-management': ['admin'],
            'canManageInjuries': ['admin', 'coach']
        };
        
        return permissions[feature]?.includes(user.role) || false;
    };

    // Specific permission functions
    const canViewStatistics = () => canAccessFeature('statistics');
    const canViewAI = () => canAccessFeature('ai-analytics');
    const canManageUsers = () => canAccessFeature('admin-panel');
    const canManageTeams = () => canAccessFeature('my-teams');
    const canUseQRCheckin = () => canAccessFeature('qr-checkin');
    const canViewAllPlayers = () => canAccessFeature('all-players');

    // Enhanced Team/Player specific permissions
    const canAccessPlayerEnhanced = (playerId) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'parent' && user.player_id === parseInt(playerId)) return true;
        // Coach permission will be checked by backend
        if (user.role === 'coach') return true;
        return false;
    };

    const canAccessTeamEnhanced = (teamId) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.team_id === parseInt(teamId)) return true;
        return false;
    };

    // Legacy functions (keeping for backward compatibility)
    const canAccessPlayer = (playerId) => {
        if (!user) return false;
        if (user.role === 'admin') return true;
        if (user.role === 'coach') return true; // Coach can access players in their team
        if (user.role === 'parent' && user.player_id === parseInt(playerId)) return true;
        return false;
    };

    const value = {
        user,
        loading,
        token,
        login,
        register,
        logout,
        refreshToken,
        changePassword,
        verifyToken,
        
        // Role checks
        isAdmin: () => user?.role === 'admin',
        isCoach: () => user?.role === 'coach',
        isParent: () => user?.role === 'parent',
        isAdminOrCoach: () => user && (user.role === 'admin' || user.role === 'coach'),
        
        // Permission functions
        canViewStatistics,
        canViewAI,
        canManageUsers,
        canManageTeams,
        canUseQRCheckin,
        canViewAllPlayers,
        canAccessPlayer,
        canAccessTeam,
        canAccessFeature,
        
        // Enhanced permissions (aliased for clarity)
        canAccessPlayerEnhanced,
        canAccessTeamEnhanced,
        
        // Authentication status
        isAuthenticated: !!user
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};