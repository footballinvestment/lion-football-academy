import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import apiService from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize authentication state on app load
    useEffect(() => {
        const initializeAuth = async () => {
            console.log('🔄 AuthContext: Initializing authentication...');
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            
            if (storedToken && storedUser) {
                try {
                    console.log('📦 AuthContext: Found stored auth data');
                    const userData = JSON.parse(storedUser);
                    setUser(userData);
                    setToken(storedToken);
                    apiService.setAuthToken(storedToken);
                    
                    // Verify token is still valid
                    console.log('🔍 AuthContext: Verifying token...');
                    const isValid = await verifyToken();
                    console.log('✅ AuthContext: Token verification result:', isValid);
                } catch (error) {
                    console.error('❌ AuthContext: Error parsing stored user data:', error);
                    clearAuthData();
                }
            } else {
                console.log('📭 AuthContext: No stored auth data found');
                setLoading(false);
            }
            setIsInitialized(true);
            console.log('✅ AuthContext: Initialization complete');
        };
        
        if (!isInitialized) {
            initializeAuth();
        }
    }, [isInitialized, clearAuthData]);

    const clearAuthData = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        apiService.clearAuthToken();
    }, []);

    const verifyToken = useCallback(async () => {
        try {
            console.log('🔍 AuthContext: Starting token verification...');
            const response = await apiService.auth.verify();
            if (response.data.success) {
                console.log('✅ AuthContext: Token verification successful');
                const userData = response.data.user;
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
                return true;
            } else {
                console.log('❌ AuthContext: Token verification failed - invalid token');
                clearAuthData();
                return false;
            }
        } catch (error) {
            console.error('❌ AuthContext: Token verification failed:', error);
            clearAuthData();
            return false;
        } finally {
            console.log('🏁 AuthContext: Token verification complete, setting loading to false');
            setLoading(false);
        }
    }, [clearAuthData]);

    const login = useCallback(async (username, password, rememberMe = false) => {
        try {
            setLoading(true);
            const response = await apiService.auth.login(username, password);
            
            if (response.data.success) {
                const { user, token, refreshToken } = response.data;
                
                setUser(user);
                setToken(token);
                
                // Store tokens and user data
                const storage = rememberMe ? localStorage : sessionStorage;
                storage.setItem('token', token);
                storage.setItem('user', JSON.stringify(user));
                
                if (refreshToken) {
                    storage.setItem('refreshToken', refreshToken);
                }
                
                apiService.setAuthToken(token);
                
                return { success: true, user };
            } else {
                return { success: false, error: response.data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Authentication failed. Please try again.' 
            };
        } finally {
            setLoading(false);
        }
    }, []);

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

    const logout = useCallback(async (redirect = true) => {
        try {
            // Call logout API to invalidate token on server
            await apiService.auth.logout();
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Always clear local auth data
            clearAuthData();
            
            if (redirect && window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
    }, [clearAuthData]);

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

    const isPlayer = () => {
        return user && user.role === 'player';
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
        isInitialized,
        login,
        register,
        logout,
        refreshToken,
        changePassword,
        verifyToken,
        clearAuthData,
        
        // Role checks
        isAdmin: () => user?.role === 'admin',
        isCoach: () => user?.role === 'coach',
        isParent: () => user?.role === 'parent',
        isPlayer: () => user?.role === 'player',
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
        isAuthenticated: !!user && !!token,
        hasRole: (role) => user?.role === role,
        hasAnyRole: (roles) => roles.includes(user?.role),
        
        // User role-based redirects
        getDefaultRoute: () => {
            if (!user) return '/login';
            switch (user.role) {
                case 'admin': return '/admin/dashboard';
                case 'coach': return '/coach/dashboard';
                case 'player': return '/player/dashboard';
                case 'parent': return '/parent/dashboard';
                default: return '/login';
            }
        }
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