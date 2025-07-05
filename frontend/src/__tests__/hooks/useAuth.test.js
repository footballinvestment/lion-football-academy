import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../../hooks/useAuth';
import { AuthProvider } from '../../context/AuthContext';
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

const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    it('should initialize with no user when no token in localStorage', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.loading).toBe(false);
    });

    it('should initialize with token from localStorage', () => {
      const mockToken = 'stored-token';
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return mockToken;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.token).toBe(mockToken);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid user data in localStorage', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'valid-token';
        if (key === 'user') return 'invalid-json';
        return null;
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('Login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';
      const mockResponse = {
        data: {
          success: true,
          user: mockUser,
          token: mockToken
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');
        expect(loginResult.success).toBe(true);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('token', mockToken);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    it('should handle login failure', async () => {
      const mockError = {
        response: {
          data: {
            success: false,
            message: 'Invalid credentials'
          }
        }
      };
      
      mockedAxios.post.mockRejectedValueOnce(mockError);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'wrongpassword');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Invalid credentials');
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle network errors during login', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Network Error'));
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const loginResult = await result.current.login('test@example.com', 'password123');
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Network error occurred');
      });
    });

    it('should set loading state during login', async () => {
      let resolvePromise;
      const loginPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      
      mockedAxios.post.mockReturnValueOnce(loginPromise);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      act(() => {
        result.current.login('test@example.com', 'password123');
      });
      
      expect(result.current.loading).toBe(true);
      
      await act(async () => {
        resolvePromise({
          data: {
            success: true,
            user: { id: 1, name: 'Test' },
            token: 'token'
          }
        });
        await loginPromise;
      });
      
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Register', () => {
    it('should register successfully with valid data', async () => {
      const mockUser = { id: 1, name: 'New User', email: 'new@example.com', role: 'player' };
      const mockToken = 'auth-token';
      const mockResponse = {
        data: {
          success: true,
          user: mockUser,
          token: mockToken
        }
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      const registerData = {
        name: 'New User',
        email: 'new@example.com',
        password: 'password123',
        role: 'player'
      };
      
      await act(async () => {
        const registerResult = await result.current.register(registerData);
        expect(registerResult.success).toBe(true);
      });
      
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.token).toBe(mockToken);
      expect(result.current.isAuthenticated).toBe(true);
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
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const registerResult = await result.current.register({
          name: 'Test',
          email: 'existing@example.com',
          password: 'password123',
          role: 'player'
        });
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('Email already exists');
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe('Logout', () => {
    it('should logout and clear user data', async () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      const mockToken = 'auth-token';
      
      // Set up authenticated state
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return mockToken;
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      // Verify initial authenticated state
      expect(result.current.isAuthenticated).toBe(true);
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    });

    it('should call logout API endpoint', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        await result.current.logout();
      });
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/logout');
    });
  });

  describe('Update Profile', () => {
    it('should update user profile successfully', async () => {
      const initialUser = { id: 1, name: 'Old Name', email: 'old@example.com', role: 'player' };
      const updatedUser = { id: 1, name: 'New Name', email: 'new@example.com', role: 'player' };
      
      // Set up authenticated state
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
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      const updateData = { name: 'New Name', email: 'new@example.com' };
      
      await act(async () => {
        const updateResult = await result.current.updateProfile(updateData);
        expect(updateResult.success).toBe(true);
      });
      
      expect(result.current.user).toEqual(updatedUser);
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
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const updateResult = await result.current.updateProfile({ email: 'existing@example.com' });
        expect(updateResult.success).toBe(false);
        expect(updateResult.error).toBe('Email already exists');
      });
    });
  });

  describe('Token Management', () => {
    it('should refresh token when needed', async () => {
      const newToken = 'new-token';
      const refreshedUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'player' };
      
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          token: newToken,
          user: refreshedUser
        }
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const refreshResult = await result.current.refreshToken();
        expect(refreshResult.success).toBe(true);
      });
      
      expect(result.current.token).toBe(newToken);
      expect(result.current.user).toEqual(refreshedUser);
    });

    it('should handle token refresh failure', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            success: false,
            message: 'Invalid refresh token'
          }
        }
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      await act(async () => {
        const refreshResult = await result.current.refreshToken();
        expect(refreshResult.success).toBe(false);
      });
      
      // Should logout user on refresh failure
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });
  });

  describe('Role Checking', () => {
    it('should check if user has required role', () => {
      const mockUser = { id: 1, name: 'Test User', email: 'test@example.com', role: 'admin' };
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'token') return 'token';
        if (key === 'user') return JSON.stringify(mockUser);
        return null;
      });
      
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('coach')).toBe(false);
      expect(result.current.hasRole(['admin', 'coach'])).toBe(true);
      expect(result.current.hasRole(['player', 'parent'])).toBe(false);
    });

    it('should return false for role check when not authenticated', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });
      
      expect(result.current.hasRole('admin')).toBe(false);
      expect(result.current.hasRole(['admin', 'coach'])).toBe(false);
    });
  });
});