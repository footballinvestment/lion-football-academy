import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
};

// Custom hook for authentication with route protection
export const useAuthRedirect = (requiredRole = null, redirectTo = '/login') => {
    const auth = useAuth();
    const [shouldRedirect, setShouldRedirect] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        console.log('🔄 useAuthRedirect: Checking auth status...', {
            isInitialized: auth.isInitialized,
            isAuthenticated: auth.isAuthenticated,
            userRole: auth.user?.role,
            requiredRole
        });

        if (!auth.isInitialized) {
            console.log('⏳ useAuthRedirect: Auth not initialized yet');
            return;
        }

        setIsChecking(true);

        // If not authenticated, redirect to login
        if (!auth.isAuthenticated) {
            console.log('🔀 useAuthRedirect: Not authenticated, should redirect to login');
            setShouldRedirect(true);
            setIsChecking(false);
            return;
        }

        // If specific role required and user doesn't have it, redirect
        if (requiredRole && !auth.hasRole(requiredRole)) {
            console.log('🔀 useAuthRedirect: User lacks required role:', requiredRole);
            setShouldRedirect(true);
            setIsChecking(false);
            return;
        }

        // If array of roles required and user doesn't have any of them, redirect
        if (Array.isArray(requiredRole) && !auth.hasAnyRole(requiredRole)) {
            console.log('🔀 useAuthRedirect: User lacks any of required roles:', requiredRole);
            setShouldRedirect(true);
            setIsChecking(false);
            return;
        }

        console.log('✅ useAuthRedirect: Auth check passed, no redirect needed');
        setShouldRedirect(false);
        setIsChecking(false);
    }, [auth, requiredRole]);

    return {
        ...auth,
        shouldRedirect,
        isChecking,
        redirectTo: shouldRedirect ? redirectTo : null
    };
};

// Hook for role-specific permissions
export const usePermissions = () => {
    const auth = useAuth();

    return {
        // Basic role checks
        isAdmin: auth.isAdmin(),
        isCoach: auth.isCoach(),
        isPlayer: auth.isPlayer(),
        isParent: auth.isParent(),
        isAdminOrCoach: auth.isAdminOrCoach(),

        // Feature permissions
        canViewStatistics: auth.canViewStatistics(),
        canViewAI: auth.canViewAI(),
        canManageUsers: auth.canManageUsers(),
        canManageTeams: auth.canManageTeams(),
        canUseQRCheckin: auth.canUseQRCheckin(),
        canViewAllPlayers: auth.canViewAllPlayers(),

        // Dynamic permission checker
        hasPermission: (permission) => auth.canAccessFeature(permission),
        canAccessPlayer: (playerId) => auth.canAccessPlayer(playerId),
        canAccessTeam: (teamId) => auth.canAccessTeam(teamId),

        // User role and data
        user: auth.user,
        userRole: auth.user?.role,
        isAuthenticated: auth.isAuthenticated
    };
};

// Hook for login form management
export const useLogin = () => {
    const auth = useAuth();
    const [loginState, setLoginState] = useState({
        isLoading: false,
        error: null,
        success: false
    });

    const login = async (username, password, rememberMe = false) => {
        setLoginState({ isLoading: true, error: null, success: false });

        try {
            const result = await auth.login(username, password, rememberMe);
            
            if (result.success) {
                setLoginState({ isLoading: false, error: null, success: true });
                return { success: true, user: result.user };
            } else {
                setLoginState({ isLoading: false, error: result.error, success: false });
                return { success: false, error: result.error };
            }
        } catch (error) {
            const errorMessage = error.message || 'Login failed. Please try again.';
            setLoginState({ isLoading: false, error: errorMessage, success: false });
            return { success: false, error: errorMessage };
        }
    };

    const clearError = () => {
        setLoginState(prev => ({ ...prev, error: null }));
    };

    return {
        login,
        clearError,
        isLoading: loginState.isLoading,
        error: loginState.error,
        success: loginState.success,
        isAuthenticated: auth.isAuthenticated
    };
};

// Hook for logout functionality
export const useLogout = () => {
    const auth = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const logout = async (redirect = true) => {
        setIsLoggingOut(true);
        try {
            await auth.logout(redirect);
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    return {
        logout,
        isLoggingOut
    };
};

// Hook for password management
export const usePasswordChange = () => {
    const auth = useAuth();
    const [passwordState, setPasswordState] = useState({
        isLoading: false,
        error: null,
        success: false
    });

    const changePassword = async (oldPassword, newPassword) => {
        setPasswordState({ isLoading: true, error: null, success: false });

        try {
            const result = await auth.changePassword(oldPassword, newPassword);
            
            if (result.success) {
                setPasswordState({ isLoading: false, error: null, success: true });
                return { success: true };
            } else {
                setPasswordState({ isLoading: false, error: result.error, success: false });
                return { success: false, error: result.error };
            }
        } catch (error) {
            const errorMessage = error.message || 'Password change failed. Please try again.';
            setPasswordState({ isLoading: false, error: errorMessage, success: false });
            return { success: false, error: errorMessage };
        }
    };

    const clearMessages = () => {
        setPasswordState(prev => ({ ...prev, error: null, success: false }));
    };

    return {
        changePassword,
        clearMessages,
        isLoading: passwordState.isLoading,
        error: passwordState.error,
        success: passwordState.success
    };
};

// Hook for user profile data
export const useUserProfile = () => {
    const auth = useAuth();

    return {
        user: auth.user,
        isLoading: auth.loading,
        isAuthenticated: auth.isAuthenticated,
        role: auth.user?.role,
        fullName: auth.user ? `${auth.user.first_name} ${auth.user.last_name}` : '',
        email: auth.user?.email,
        teamId: auth.user?.team_id,
        playerId: auth.user?.player_id,
        getDefaultRoute: auth.getDefaultRoute
    };
};

export default useAuth;