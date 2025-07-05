import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, useAuthRedirect } from '../hooks/useAuth';
import { LoadingSpinner, Alert } from './ui';

const ProtectedRoute = ({ 
    children, 
    requireAuth = true, 
    requireRoles = [], 
    requireTeamAccess = null, 
    requirePlayerAccess = null,
    redirectTo = '/login',
    fallback = null
}) => {
    const location = useLocation();
    const auth = useAuthRedirect(requireRoles.length === 1 ? requireRoles[0] : requireRoles, redirectTo);

    // Show loading while initializing or checking auth
    if (!auth.isInitialized || auth.isChecking) {
        return fallback || (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner 
                    size="lg" 
                    variant="primary" 
                    message="Loading..." 
                />
            </div>
        );
    }

    // If auth check indicates redirect is needed
    if (auth.shouldRedirect) {
        return <Navigate 
            to={auth.redirectTo} 
            state={{ from: location }} 
            replace 
        />;
    }

    // Check if authentication is required but user is not authenticated
    if (requireAuth && !auth.isAuthenticated) {
        return <Navigate 
            to="/login" 
            state={{ from: location }} 
            replace 
        />;
    }

    // Check if specific roles are required (for multiple roles)
    if (requireRoles.length > 1 && auth.user) {
        const hasRequiredRole = requireRoles.includes(auth.user.role);
        if (!hasRequiredRole) {
            return (
                <div className="container mx-auto mt-8 px-4">
                    <Alert 
                        variant="error" 
                        title="Access Denied"
                        size="lg"
                    >
                        You don't have permission to access this page. Required roles: {requireRoles.join(', ')}.
                    </Alert>
                </div>
            );
        }
    }

    // Check team access if required
    if (requireTeamAccess && auth.user) {
        const hasTeamAccess = auth.canAccessTeam(requireTeamAccess);
        if (!hasTeamAccess) {
            return (
                <div className="container mx-auto mt-8 px-4">
                    <Alert 
                        variant="warning" 
                        title="Team Access Required"
                        size="lg"
                    >
                        You don't have permission to access this team's data.
                    </Alert>
                </div>
            );
        }
    }

    // Check player access if required
    if (requirePlayerAccess && auth.user) {
        const hasPlayerAccess = auth.canAccessPlayer(requirePlayerAccess);
        if (!hasPlayerAccess) {
            return (
                <div className="container mx-auto mt-8 px-4">
                    <Alert 
                        variant="warning" 
                        title="Player Access Required"
                        size="lg"
                    >
                        You don't have permission to access this player's data.
                    </Alert>
                </div>
            );
        }
    }

    // If all checks pass, render the protected content
    return children;
};

// Role-specific route components for convenience
export const AdminRoute = ({ children, ...props }) => (
    <ProtectedRoute requireRoles={['admin']} {...props}>
        {children}
    </ProtectedRoute>
);

export const CoachRoute = ({ children, ...props }) => (
    <ProtectedRoute requireRoles={['coach']} {...props}>
        {children}
    </ProtectedRoute>
);

export const PlayerRoute = ({ children, ...props }) => (
    <ProtectedRoute requireRoles={['player']} {...props}>
        {children}
    </ProtectedRoute>
);

export const ParentRoute = ({ children, ...props }) => (
    <ProtectedRoute requireRoles={['parent']} {...props}>
        {children}
    </ProtectedRoute>
);

export const AdminOrCoachRoute = ({ children, ...props }) => (
    <ProtectedRoute requireRoles={['admin', 'coach']} {...props}>
        {children}
    </ProtectedRoute>
);

export const StaffRoute = ({ children, ...props }) => (
    <ProtectedRoute requireRoles={['admin', 'coach']} {...props}>
        {children}
    </ProtectedRoute>
);

// Public route component (for login page, etc.)
export const PublicRoute = ({ children, redirectIfAuthenticated = true, redirectTo = null }) => {
    const auth = useAuth(); // Use regular useAuth instead of useAuthRedirect
    const location = useLocation();

    console.log('📍 PublicRoute: Auth status:', {
        isInitialized: auth.isInitialized,
        isAuthenticated: auth.isAuthenticated,
        loading: auth.loading,
        redirectIfAuthenticated
    });

    // Show loading while checking auth
    if (!auth.isInitialized || auth.loading) {
        console.log('⏳ PublicRoute: Still loading auth...');
        return (
            <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner 
                    size="lg" 
                    variant="primary" 
                    message="Loading..." 
                />
            </div>
        );
    }

    // If user is authenticated and we should redirect
    if (auth.isAuthenticated && redirectIfAuthenticated) {
        const targetPath = redirectTo || 
                          location.state?.from?.pathname || 
                          auth.getDefaultRoute();
        
        console.log('🔀 PublicRoute: Redirecting authenticated user to:', targetPath);
        return <Navigate to={targetPath} replace />;
    }

    console.log('✅ PublicRoute: Rendering public content');
    return children;
};

export default ProtectedRoute;