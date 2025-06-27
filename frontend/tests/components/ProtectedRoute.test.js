/**
 * ProtectedRoute Component Tests
 * Lion Football Academy Frontend Testing Suite
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext';
import ProtectedRoute from '../../src/components/ProtectedRoute';

const TestComponent = () => <div>Protected Content</div>;
const LoginComponent = () => <div>Please Login</div>;

const ProtectedRouteWrapper = ({ 
  authContextValue = testUtils.createMockAuthContext(),
  requireRoles = null,
  children = <TestComponent />
}) => (
  <BrowserRouter>
    <AuthContext.Provider value={authContextValue}>
      <Routes>
        <Route path="/login" element={<LoginComponent />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute requireRoles={requireRoles}>
              {children}
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AuthContext.Provider>
  </BrowserRouter>
);

describe('ProtectedRoute Component', () => {
  describe('Authentication Check', () => {
    test('renders children when user is authenticated', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('redirects to login when user is not authenticated', () => {
      const authContextValue = testUtils.createMockAuthContext(null);
      
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByText('Please Login')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('shows loading spinner while authentication is loading', () => {
      const authContextValue = testUtils.createMockAuthContext(null, true);
      
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
      expect(screen.queryByText('Please Login')).not.toBeInTheDocument();
    });
  });

  describe('Role-Based Access Control', () => {
    test('allows access when user has required role', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('allows access when user has one of multiple required roles', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin', 'coach']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('denies access when user does not have required role', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('allows access when no roles are required', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={null} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Admin Role Tests', () => {
    test('admin can access admin-only routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('admin can access coach routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['coach']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('admin can access parent routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['parent']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Coach Role Tests', () => {
    test('coach can access coach routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['coach']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('coach cannot access admin-only routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });

    test('coach can access admin-or-coach routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin', 'coach']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('Parent Role Tests', () => {
    test('parent can access parent routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['parent']} 
        />
      );
      
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    test('parent cannot access admin routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });

    test('parent cannot access coach routes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['coach']} 
        />
      );
      
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles missing auth context gracefully', () => {
      const { container } = render(
        <BrowserRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </BrowserRouter>
      );
      
      // Should not crash, but should not render protected content
      expect(container).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('handles invalid role format', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles="invalid-format" // Should be array
        />
      );
      
      // Should handle gracefully and deny access
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });

    test('handles user without role property', () => {
      const userWithoutRole = { id: 1, username: 'test' }; // Missing role
      const authContextValue = testUtils.createMockAuthContext(userWithoutRole);
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('provides accessible error messages', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      
      render(
        <ProtectedRouteWrapper 
          authContextValue={authContextValue} 
          requireRoles={['admin']} 
        />
      );
      
      const errorMessage = screen.getByText(/nincs jogosultságod/i);
      expect(errorMessage).toHaveAttribute('role', 'alert');
      expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    test('provides loading state announcement', () => {
      const authContextValue = testUtils.createMockAuthContext(null, true);
      
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      
      const loadingSpinner = screen.getByTestId('loading-spinner');
      expect(loadingSpinner).toHaveAttribute('aria-label', 'Betöltés...');
    });
  });

  describe('Performance', () => {
    test('renders quickly for authenticated users', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      testPerformance.start('protected-route-render');
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      const renderTime = testPerformance.end('protected-route-render');
      
      expect(renderTime).toBeLessThan(50); // Should be very fast
    });

    test('does not re-render unnecessarily', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      const renderSpy = jest.fn();
      const TestComponentWithSpy = () => {
        renderSpy();
        return <div>Protected Content</div>;
      };
      
      const { rerender } = render(
        <ProtectedRouteWrapper authContextValue={authContextValue}>
          <TestComponentWithSpy />
        </ProtectedRouteWrapper>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same auth context
      rerender(
        <ProtectedRouteWrapper authContextValue={authContextValue}>
          <TestComponentWithSpy />
        </ProtectedRouteWrapper>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(2); // Only one additional render
    });
  });

  describe('Integration with Router', () => {
    test('preserves intended destination after login', () => {
      const authContextValue = testUtils.createMockAuthContext(null);
      
      // Render at protected route
      window.history.pushState({}, '', '/admin/users');
      
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByText('Please Login')).toBeInTheDocument();
      
      // After login, should remember intended destination
      expect(window.location.search).toContain('redirect=%2Fadmin%2Fusers');
    });

    test('does not redirect if already on login page', () => {
      const authContextValue = testUtils.createMockAuthContext(null);
      
      window.history.pushState({}, '', '/login');
      
      render(<ProtectedRouteWrapper authContextValue={authContextValue} />);
      
      // Should not create infinite redirect loop
      expect(window.location.pathname).toBe('/login');
    });
  });
});