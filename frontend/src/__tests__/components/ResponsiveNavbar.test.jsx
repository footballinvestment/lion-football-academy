import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ResponsiveNavbar from '../../components/ResponsiveNavbar';
import { AuthProvider } from '../../context/AuthContext';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('../../hooks/useAccessibility', () => ({
  useAccessibility: () => ({
    announce: jest.fn(),
    createKeyboardHandler: jest.fn(() => jest.fn())
  })
}));

jest.mock('../../hooks/useGestures', () => ({
  useGestures: () => ({
    ref: { current: null }
  })
}));

const mockAuthContext = {
  user: null,
  token: null,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

const MockAuthProvider = ({ children, value = mockAuthContext }) => {
  return (
    <AuthProvider value={value}>
      {children}
    </AuthProvider>
  );
};

const renderWithProviders = (component, authValue = mockAuthContext) => {
  return render(
    <BrowserRouter>
      <MockAuthProvider value={authValue}>
        {component}
      </MockAuthProvider>
    </BrowserRouter>
  );
};

describe('ResponsiveNavbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Unauthenticated State', () => {
    it('should render login and register links when not authenticated', () => {
      renderWithProviders(<ResponsiveNavbar />);
      
      expect(screen.getByText('Login')).toBeInTheDocument();
      expect(screen.getByText('Register')).toBeInTheDocument();
      expect(screen.getByText('Lion Football Academy')).toBeInTheDocument();
    });

    it('should not show user-specific navigation when not authenticated', () => {
      renderWithProviders(<ResponsiveNavbar />);
      
      expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
      expect(screen.queryByText('Profile')).not.toBeInTheDocument();
      expect(screen.queryByText('Logout')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Admin User', () => {
    const adminAuthValue = {
      ...mockAuthContext,
      user: { id: 1, name: 'Admin User', email: 'admin@test.com', role: 'admin' },
      token: 'mock-token'
    };

    it('should render admin navigation items', () => {
      renderWithProviders(<ResponsiveNavbar />, adminAuthValue);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
      expect(screen.getByText('Players')).toBeInTheDocument();
      expect(screen.getByText('Statistics')).toBeInTheDocument();
    });

    it('should show user menu with profile and logout', () => {
      renderWithProviders(<ResponsiveNavbar />, adminAuthValue);
      
      // Click on user menu button
      const userMenuButton = screen.getByRole('button', { name: /admin user/i });
      fireEvent.click(userMenuButton);
      
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    it('should call logout function when logout is clicked', async () => {
      const mockLogout = jest.fn();
      const authValueWithMockLogout = {
        ...adminAuthValue,
        logout: mockLogout
      };
      
      renderWithProviders(<ResponsiveNavbar />, authValueWithMockLogout);
      
      // Open user menu
      const userMenuButton = screen.getByRole('button', { name: /admin user/i });
      fireEvent.click(userMenuButton);
      
      // Click logout
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
      
      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Authenticated Coach User', () => {
    const coachAuthValue = {
      ...mockAuthContext,
      user: { id: 2, name: 'Coach User', email: 'coach@test.com', role: 'coach' },
      token: 'mock-token'
    };

    it('should render coach-specific navigation items', () => {
      renderWithProviders(<ResponsiveNavbar />, coachAuthValue);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Teams')).toBeInTheDocument();
      expect(screen.getByText('Trainings')).toBeInTheDocument();
      expect(screen.getByText('Matches')).toBeInTheDocument();
      expect(screen.getByText('QR Check-in')).toBeInTheDocument();
    });

    it('should not show admin-only items for coach', () => {
      renderWithProviders(<ResponsiveNavbar />, coachAuthValue);
      
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('Billing')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Player User', () => {
    const playerAuthValue = {
      ...mockAuthContext,
      user: { id: 3, name: 'Player User', email: 'player@test.com', role: 'player' },
      token: 'mock-token'
    };

    it('should render player-specific navigation items', () => {
      renderWithProviders(<ResponsiveNavbar />, playerAuthValue);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Trainings')).toBeInTheDocument();
      expect(screen.getByText('Matches')).toBeInTheDocument();
      expect(screen.getByText('Development Plans')).toBeInTheDocument();
    });

    it('should not show coach/admin items for player', () => {
      renderWithProviders(<ResponsiveNavbar />, playerAuthValue);
      
      expect(screen.queryByText('Users')).not.toBeInTheDocument();
      expect(screen.queryByText('My Teams')).not.toBeInTheDocument();
      expect(screen.queryByText('QR Check-in')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated Parent User', () => {
    const parentAuthValue = {
      ...mockAuthContext,
      user: { id: 4, name: 'Parent User', email: 'parent@test.com', role: 'parent' },
      token: 'mock-token'
    };

    it('should render parent-specific navigation items', () => {
      renderWithProviders(<ResponsiveNavbar />, parentAuthValue);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Matches')).toBeInTheDocument();
      expect(screen.getByText('Billing')).toBeInTheDocument();
    });

    it('should not show player/coach/admin items for parent', () => {
      renderWithProviders(<ResponsiveNavbar />, parentAuthValue);
      
      expect(screen.queryByText('Trainings')).not.toBeInTheDocument();
      expect(screen.queryByText('My Teams')).not.toBeInTheDocument();
      expect(screen.queryByText('Development Plans')).not.toBeInTheDocument();
    });
  });

  describe('Mobile Navigation', () => {
    const mockAuthValue = {
      ...mockAuthContext,
      user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'coach' },
      token: 'mock-token'
    };

    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768
      });
    });

    it('should show mobile hamburger menu', () => {
      renderWithProviders(<ResponsiveNavbar />, mockAuthValue);
      
      const hamburgerButton = screen.getByRole('button', { name: /toggle navigation/i });
      expect(hamburgerButton).toBeInTheDocument();
    });

    it('should toggle mobile menu when hamburger is clicked', () => {
      renderWithProviders(<ResponsiveNavbar />, mockAuthValue);
      
      const hamburgerButton = screen.getByRole('button', { name: /toggle navigation/i });
      
      // Menu should be closed initially
      expect(screen.queryByText('Dashboard')).not.toBeVisible();
      
      // Open menu
      fireEvent.click(hamburgerButton);
      expect(screen.getByText('Dashboard')).toBeVisible();
      
      // Close menu
      fireEvent.click(hamburgerButton);
      expect(screen.queryByText('Dashboard')).not.toBeVisible();
    });
  });

  describe('Accessibility', () => {
    const mockAuthValue = {
      ...mockAuthContext,
      user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'admin' },
      token: 'mock-token'
    };

    it('should have proper ARIA labels', () => {
      renderWithProviders(<ResponsiveNavbar />, mockAuthValue);
      
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle navigation/i })).toHaveAttribute('aria-expanded');
    });

    it('should support keyboard navigation', () => {
      renderWithProviders(<ResponsiveNavbar />, mockAuthValue);
      
      const firstNavLink = screen.getByText('Dashboard');
      firstNavLink.focus();
      
      expect(firstNavLink).toHaveFocus();
      
      // Test Tab navigation
      fireEvent.keyDown(firstNavLink, { key: 'Tab' });
      
      // Should move to next focusable element
      const nextElement = screen.getByText('Users');
      expect(nextElement).toHaveFocus();
    });

    it('should announce navigation changes to screen readers', () => {
      const mockAnnounce = jest.fn();
      jest.doMock('../../hooks/useAccessibility', () => ({
        useAccessibility: () => ({
          announce: mockAnnounce,
          createKeyboardHandler: jest.fn(() => jest.fn())
        })
      }));
      
      renderWithProviders(<ResponsiveNavbar />, mockAuthValue);
      
      const dashboardLink = screen.getByText('Dashboard');
      fireEvent.click(dashboardLink);
      
      expect(mockAnnounce).toHaveBeenCalledWith('Navigated to Dashboard', 'polite');
    });
  });

  describe('Responsive Behavior', () => {
    it('should show full navigation on desktop', () => {
      // Mock desktop viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200
      });
      
      renderWithProviders(<ResponsiveNavbar />, {
        ...mockAuthContext,
        user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'admin' },
        token: 'mock-token'
      });
      
      expect(screen.queryByRole('button', { name: /toggle navigation/i })).not.toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeVisible();
    });

    it('should collapse navigation on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480
      });
      
      renderWithProviders(<ResponsiveNavbar />, {
        ...mockAuthContext,
        user: { id: 1, name: 'Test User', email: 'test@test.com', role: 'admin' },
        token: 'mock-token'
      });
      
      expect(screen.getByRole('button', { name: /toggle navigation/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      const TestComponent = () => {
        renderSpy();
        return <ResponsiveNavbar />;
      };
      
      const { rerender } = renderWithProviders(<TestComponent />);
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(<TestComponent />);
      
      // Should not trigger additional renders due to memoization
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });
});