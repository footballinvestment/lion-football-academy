/**
 * Authentication Integration Tests
 * Lion Football Academy Frontend Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import Login from '../../src/components/Login';
import ProtectedRoute from '../../src/components/ProtectedRoute';

// Test component to access auth context
const AuthTestComponent = () => {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="auth-user">{auth.user ? auth.user.name : 'No user'}</div>
      <div data-testid="auth-loading">{auth.loading ? 'Loading' : 'Not loading'}</div>
      <div data-testid="auth-authenticated">{auth.isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
      <button onClick={auth.login} data-testid="login-button">Login</button>
      <button onClick={auth.logout} data-testid="logout-button">Logout</button>
    </div>
  );
};

const TestApp = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/test" element={<AuthTestComponent />} />
        <Route 
          path="/protected" 
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireRoles={['admin']}>
              <div>Admin Content</div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

describe('Authentication Integration Tests', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Context Integration', () => {
    test('provides authentication state to components', () => {
      render(<TestApp />);
      
      // Navigate to test component
      window.history.pushState({}, '', '/test');
      
      expect(screen.getByTestId('auth-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Not authenticated');
    });

    test('updates state on successful login', async () => {
      render(<TestApp />);
      
      // Navigate to login
      window.history.pushState({}, '', '/login');
      
      // Fill login form
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      // Wait for login to complete
      await waitFor(() => {
        // Navigate to test component to check state
        window.history.pushState({}, '', '/test');
        
        expect(screen.getByTestId('auth-user')).toHaveTextContent('Test Admin');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Authenticated');
      });
    });

    test('handles login failure', async () => {
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      
      // Use wrong credentials
      await user.type(screen.getByLabelText(/felhasználónév/i), 'wrong');
      await user.type(screen.getByLabelText(/jelszó/i), 'wrong');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      
      // State should remain unauthenticated
      window.history.pushState({}, '', '/test');
      expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Not authenticated');
    });

    test('clears state on logout', async () => {
      render(<TestApp />);
      
      // First login
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Authenticated');
      });
      
      // Now logout
      await user.click(screen.getByTestId('logout-button'));
      
      expect(screen.getByTestId('auth-user')).toHaveTextContent('No user');
      expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Not authenticated');
    });
  });

  describe('Protected Route Integration', () => {
    test('redirects unauthenticated users to login', () => {
      render(<TestApp />);
      
      window.history.pushState({}, '', '/protected');
      
      expect(screen.getByText('Please Login')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    test('allows authenticated users to access protected routes', async () => {
      render(<TestApp />);
      
      // Login first
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        // Navigate to protected route
        window.history.pushState({}, '', '/protected');
        expect(screen.getByText('Protected Content')).toBeInTheDocument();
      });
    });

    test('enforces role-based access control', async () => {
      render(<TestApp />);
      
      // Login as coach
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'coach_test');
      await user.type(screen.getByLabelText(/jelszó/i), 'password123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        // Try to access admin route
        window.history.pushState({}, '', '/admin');
        expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
        expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
      });
    });

    test('allows admin access to all routes', async () => {
      render(<TestApp />);
      
      // Login as admin
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        // Access admin route
        window.history.pushState({}, '', '/admin');
        expect(screen.getByText('Admin Content')).toBeInTheDocument();
      });
    });
  });

  describe('Token Management Integration', () => {
    test('persists authentication across page reloads', async () => {
      render(<TestApp />);
      
      // Login
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeTruthy();
        expect(localStorage.getItem('refreshToken')).toBeTruthy();
      });
      
      // Simulate page reload by re-rendering
      render(<TestApp />);
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Authenticated');
      });
    });

    test('handles token expiration and refresh', async () => {
      // Mock expired token scenario
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refreshToken', 'valid-refresh-token');
      
      render(<TestApp />);
      
      // Component should attempt to verify token and refresh when expired
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBe('mock-refreshed-token');
      });
    });

    test('logs out when refresh token is invalid', async () => {
      localStorage.setItem('token', 'expired-token');
      localStorage.setItem('refreshToken', 'invalid-refresh-token');
      
      render(<TestApp />);
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Not authenticated');
        expect(localStorage.getItem('token')).toBeNull();
      });
    });

    test('clears tokens on logout', async () => {
      render(<TestApp />);
      
      // Login first
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeTruthy();
      });
      
      // Logout
      window.history.pushState({}, '', '/test');
      await user.click(screen.getByTestId('logout-button'));
      
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
    });
  });

  describe('Multi-Role Authentication Flows', () => {
    test('admin login flow', async () => {
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-user')).toHaveTextContent('Test Admin');
      });
      
      // Admin should access all routes
      window.history.pushState({}, '', '/admin');
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });

    test('coach login flow', async () => {
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'coach_test');
      await user.type(screen.getByLabelText(/jelszó/i), 'password123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-user')).toHaveTextContent('Test Coach');
      });
      
      // Coach should not access admin routes
      window.history.pushState({}, '', '/admin');
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });

    test('parent login flow', async () => {
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'parent_test');
      await user.type(screen.getByLabelText(/jelszó/i), 'password123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-user')).toHaveTextContent('Test Parent');
      });
      
      // Parent should not access admin routes
      window.history.pushState({}, '', '/admin');
      expect(screen.getByText(/nincs jogosultságod/i)).toBeInTheDocument();
    });
  });

  describe('Error Scenarios', () => {
    test('handles network errors during login', async () => {
      // Mock network error
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/hálózati hiba/i)).toBeInTheDocument();
      });
      
      global.fetch = originalFetch;
    });

    test('handles server errors during authentication', async () => {
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'server_error');
      await user.type(screen.getByLabelText(/jelszó/i), 'test');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/szerver hiba/i)).toBeInTheDocument();
      });
    });

    test('handles malformed tokens gracefully', async () => {
      localStorage.setItem('token', 'malformed.token.here');
      localStorage.setItem('refreshToken', 'malformed.refresh.token');
      
      render(<TestApp />);
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Not authenticated');
      });
    });
  });

  describe('Security Features', () => {
    test('prevents XSS in user data', async () => {
      // Mock user with XSS attempt
      const xssUser = {
        id: 1,
        name: '<script>alert("XSS")</script>',
        email: 'xss@test.com',
        role: 'admin',
      };
      
      // Mock successful login with XSS user data
      jest.mock('../../src/services/api', () => ({
        auth: {
          login: jest.fn().mockResolvedValue({
            data: {
              success: true,
              user: xssUser,
              tokens: { accessToken: 'token', refreshToken: 'refresh' },
            },
          }),
        },
      }));
      
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        const userDisplay = screen.getByTestId('auth-user');
        
        // Should display escaped text, not execute script
        expect(userDisplay.innerHTML).not.toContain('<script>');
        expect(userDisplay.textContent).toContain('<script>alert("XSS")</script>');
      });
    });

    test('validates session integrity', async () => {
      render(<TestApp />);
      
      // Login successfully
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(localStorage.getItem('token')).toBeTruthy();
      });
      
      // Tamper with token
      localStorage.setItem('token', 'tampered-token');
      
      // Should detect tampering and logout
      window.history.pushState({}, '', '/protected');
      
      await waitFor(() => {
        expect(screen.getByText('Please Login')).toBeInTheDocument();
      });
    });

    test('implements session timeout', async () => {
      // Mock very short session timeout
      const shortTimeoutUser = {
        ...testUtils.createMockUser('admin'),
        sessionTimeout: 100, // 100ms for testing
      };
      
      render(<TestApp />);
      
      window.history.pushState({}, '', '/login');
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        window.history.pushState({}, '', '/test');
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Authenticated');
      });
      
      // Wait for session timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should automatically logout
      await waitFor(() => {
        expect(screen.getByTestId('auth-authenticated')).toHaveTextContent('Not authenticated');
      });
    });
  });

  describe('Performance Considerations', () => {
    test('does not cause excessive re-renders', async () => {
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        const auth = useAuth();
        return <div>{auth.user ? 'Logged in' : 'Not logged in'}</div>;
      };
      
      const App = () => (
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );
      
      render(<App />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Login should only cause one additional render
      const { rerender } = render(<App />);
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    test('batches auth state updates', async () => {
      const updateSpy = jest.fn();
      
      const TestComponent = () => {
        const auth = useAuth();
        React.useEffect(() => {
          updateSpy();
        }, [auth.user, auth.loading, auth.isAuthenticated]);
        
        return <div>Test</div>;
      };
      
      const App = () => (
        <BrowserRouter>
          <AuthProvider>
            <TestComponent />
          </AuthProvider>
        </BrowserRouter>
      );
      
      render(<App />);
      
      // Should batch updates and only trigger effect once per state change
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });
  });
});