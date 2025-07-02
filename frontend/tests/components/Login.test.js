/**
 * Login Component Tests
 * Lion Football Academy Frontend Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext';
import Login from '../../src/components/Login';

const LoginWrapper = ({ authContextValue = testUtils.createMockAuthContext() }) => (
  <BrowserRouter>
    <AuthContext.Provider value={authContextValue}>
      <Login />
    </AuthContext.Provider>
  </BrowserRouter>
);

describe('Login Component', () => {
  let mockLogin;
  let user;

  beforeEach(() => {
    mockLogin = jest.fn();
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders login form elements', () => {
      render(<LoginWrapper />);
      
      expect(screen.getByLabelText(/felhasználónév/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jelszó/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bejelentkezés/i })).toBeInTheDocument();
      expect(screen.getByText(/lion football academy/i)).toBeInTheDocument();
    });

    test('renders with correct initial state', () => {
      render(<LoginWrapper />);
      
      const usernameInput = screen.getByLabelText(/felhasználónév/i);
      const passwordInput = screen.getByLabelText(/jelszó/i);
      const submitButton = screen.getByRole('button', { name: /bejelentkezés/i });
      
      expect(usernameInput).toHaveValue('');
      expect(passwordInput).toHaveValue('');
      expect(submitButton).not.toBeDisabled();
    });

    test('shows loading state during login', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      expect(screen.getByText(/bejelentkezés.../i)).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('prevents submission with empty fields', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin,
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('validates username field', async () => {
      render(<LoginWrapper />);
      
      const usernameInput = screen.getByLabelText(/felhasználónév/i);
      await user.type(usernameInput, 'a');
      await user.clear(usernameInput);
      
      expect(screen.getByText(/felhasználónév kötelező/i)).toBeInTheDocument();
    });

    test('validates password field', async () => {
      render(<LoginWrapper />);
      
      const passwordInput = screen.getByLabelText(/jelszó/i);
      await user.type(passwordInput, 'p');
      await user.clear(passwordInput);
      
      expect(screen.getByText(/jelszó kötelező/i)).toBeInTheDocument();
    });
  });

  describe('Authentication Flow', () => {
    test('calls login function with correct credentials', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin.mockResolvedValue({ success: true }),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123');
    });

    test('handles successful login', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin.mockResolvedValue({ success: true, user: testUtils.createMockUser('admin') }),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled();
      });
    });

    test('handles login failure', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' }),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'wrong');
      await user.type(screen.getByLabelText(/jelszó/i), 'wrong');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('handles network error', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin.mockRejectedValue(new Error('Network error')),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/hálózati hiba/i)).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    test('clears error message when user starts typing', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' }),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      // Trigger error
      await user.type(screen.getByLabelText(/felhasználónév/i), 'wrong');
      await user.type(screen.getByLabelText(/jelszó/i), 'wrong');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
      
      // Start typing to clear error
      await user.type(screen.getByLabelText(/felhasználónév/i), 'a');
      
      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
    });

    test('enables/disables submit button based on form state', async () => {
      render(<LoginWrapper />);
      
      const submitButton = screen.getByRole('button', { name: /bejelentkezés/i });
      const usernameInput = screen.getByLabelText(/felhasználónév/i);
      const passwordInput = screen.getByLabelText(/jelszó/i);
      
      // Initially enabled
      expect(submitButton).not.toBeDisabled();
      
      // Fill in form
      await user.type(usernameInput, 'admin');
      await user.type(passwordInput, 'admin123');
      
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    test('has proper form labels', () => {
      render(<LoginWrapper />);
      
      expect(screen.getByLabelText(/felhasználónév/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/jelszó/i)).toBeInTheDocument();
    });

    test('supports keyboard navigation', async () => {
      render(<LoginWrapper />);
      
      const usernameInput = screen.getByLabelText(/felhasználónév/i);
      const passwordInput = screen.getByLabelText(/jelszó/i);
      const submitButton = screen.getByRole('button', { name: /bejelentkezés/i });
      
      // Tab through form
      await user.tab();
      expect(usernameInput).toHaveFocus();
      
      await user.tab();
      expect(passwordInput).toHaveFocus();
      
      await user.tab();
      expect(submitButton).toHaveFocus();
    });

    test('announces loading state to screen readers', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      await user.click(screen.getByRole('button', { name: /bejelentkezés/i }));
      
      expect(screen.getByText(/bejelentkezés.../i)).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Performance', () => {
    test('renders within performance budget', () => {
      testPerformance.start('login-render');
      render(<LoginWrapper />);
      const renderTime = testPerformance.end('login-render');
      
      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });

    test('handles rapid form submissions', async () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        login: mockLogin.mockResolvedValue({ success: true }),
      };
      
      render(<LoginWrapper authContextValue={authContextValue} />);
      
      await user.type(screen.getByLabelText(/felhasználónév/i), 'admin');
      await user.type(screen.getByLabelText(/jelszó/i), 'admin123');
      
      const submitButton = screen.getByRole('button', { name: /bejelentkezés/i });
      
      // Rapid clicks
      await user.click(submitButton);
      await user.click(submitButton);
      await user.click(submitButton);
      
      // Should only call login once
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('Responsive Design', () => {
    test('adapts to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<LoginWrapper />);
      
      const loginContainer = screen.getByTestId('login-container');
      expect(loginContainer).toHaveClass('mobile-responsive');
    });

    test('adapts to tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });
      
      render(<LoginWrapper />);
      
      const loginContainer = screen.getByTestId('login-container');
      expect(loginContainer).toHaveClass('tablet-responsive');
    });
  });
});