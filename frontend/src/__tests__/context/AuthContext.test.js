import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuthContext } from '../../context/AuthContext';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component to access context
const TestComponent = () => {
  const {
    user,
    token,
    isAuthenticated,
    loading,
    login,
    logout,
    register,
    updateProfile,
    hasRole,
    error
  } = useAuthContext();

  return (
    <div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <div data-testid="token">{token || 'null'}</div>
      <div data-testid="isAuthenticated">{isAuthenticated.toString()}</div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="error">{error || 'null'}</div>
      
      <button 
        onClick={() => login('test@example.com', 'password123')}
        data-testid="login-btn"
      >
        Login
      </button>
      
      <button 
        onClick={() => register({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123',
          role: 'player'
        })}
        data-testid="register-btn"
      >
        Register
      </button>
      
      <button 
        onClick={() => logout()}
        data-testid="logout-btn"
      >
        Logout
      </button>
      
      <button 
        onClick={() => updateProfile({ name: 'Updated Name' })}
        data-testid="update-btn"
      >
        Update Profile
      </button>
      
      <div data-testid="has-admin-role">{hasRole('admin').toString()}</div>
      <div data-testid="has-player-role">{hasRole('player').toString()}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initial State', () => {
    it('should initialize with default values when no token in localStorage', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
      expect(screen.getByTestId('error')).toHaveTextContent('null');
    });

    it('should initialize with stored user data from localStorage', () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'stored-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return mockToken;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'valid-token';
        if (key === 'user') return 'invalid-json';
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('user')).toHaveTextContent('null');
      expect(screen.getByTestId('token')).toHaveTextContent('null');
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
    });
  });

  describe('Login Functionality', () => {
    it('should login successfully and update context state', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          user: mockUser,
          token: mockToken
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginBtn = screen.getByTestId('login-btn');
      fireEvent.click(loginBtn);

      // Should show loading state
      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    it('should handle login failure and show error', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'Invalid credentials'
          }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginBtn = screen.getByTestId('login-btn');
      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });

    it('should handle network errors during login', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginBtn = screen.getByTestId('login-btn');
      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Network error occurred');
      });
    });
  });

  describe('Registration Functionality', () => {
    it('should register successfully and update context state', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          user: mockUser,
          token: mockToken
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const registerBtn = screen.getByTestId('register-btn');
      fireEvent.click(registerBtn);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(screen.getByTestId('token')).toHaveTextContent(mockToken);
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
      });

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'player'
      });
    });

    it('should handle registration failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'Email already exists'
          }
        }
      };

      mockedAxios.post.mockRejectedValueOnce(mockError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const registerBtn = screen.getByTestId('register-btn');
      fireEvent.click(registerBtn);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });

  describe('Logout Functionality', () => {
    it('should logout and clear context state', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';

      // Set up initial authenticated state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return mockToken;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verify initial authenticated state
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');

      const logoutBtn = screen.getByTestId('logout-btn');
      fireEvent.click(logoutBtn);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(screen.getByTestId('token')).toHaveTextContent('null');
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('Profile Update Functionality', () => {
    it('should update profile successfully', async () => {
      const initialUser = { id: 1, name: 'Old Name', email: 'test@example.com', role: 'player' };
      const updatedUser = { id: 1, name: 'Updated Name', email: 'test@example.com', role: 'player' };

      // Set up initial authenticated state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'token';
        if (key === 'user') return JSON.stringify(initialUser);
        return null;
      });

      mockedAxios.put.mockResolvedValueOnce({
        data: {
          success: true,
          user: updatedUser
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const updateBtn = screen.getByTestId('update-btn');
      fireEvent.click(updateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(updatedUser));
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(updatedUser));
    });

    it('should handle profile update failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'Email already exists'
          }
        }
      };

      mockedAxios.put.mockRejectedValueOnce(mockError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const updateBtn = screen.getByTestId('update-btn');
      fireEvent.click(updateBtn);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Email already exists');
      });
    });
  });

  describe('Role Checking', () => {
    it('should correctly check user roles', () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'admin' };

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'token';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('true');
      expect(screen.getByTestId('has-player-role')).toHaveTextContent('false');
    });

    it('should return false for all roles when not authenticated', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('has-admin-role')).toHaveTextContent('false');
      expect(screen.getByTestId('has-player-role')).toHaveTextContent('false');
    });
  });

  describe('Error Handling', () => {
    it('should clear errors when new operations start', async () => {
      // First, create an error
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            message: 'Login failed'
          }
        }
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginBtn = screen.getByTestId('login-btn');
      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Login failed');
      });

      // Now perform a successful operation
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          user: { id: 1, name: 'Test' },
          token: 'token'
        }
      });

      fireEvent.click(loginBtn);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('null');
      });
    });
  });

  describe('Context Provider Error', () => {
    it('should throw error when used outside provider', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuthContext must be used within an AuthProvider');

      consoleError.mockRestore();
    });
  });

  describe('Axios Interceptors', () => {
    it('should add token to requests when authenticated', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return mockToken;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Simulate an API call that should include the token
      await mockedAxios.get('/api/test');

      expect(mockedAxios.defaults.headers.common['Authorization']).toBe(`Bearer ${mockToken}`);
    });

    it('should handle 401 responses by logging out user', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';

      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return mockToken;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Verify initial authenticated state
      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');

      // Simulate 401 response
      const error401 = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };

      // Trigger the interceptor by making a failed request
      mockedAxios.get.mockRejectedValueOnce(error401);

      try {
        await mockedAxios.get('/api/test');
      } catch (error) {
        // Expected to fail
      }

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
      });
    });
  });
});