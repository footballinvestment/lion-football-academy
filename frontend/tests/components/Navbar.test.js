/**
 * Navbar Component Tests
 * Lion Football Academy Frontend Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext';
import Navbar from '../../src/components/Navbar';

const NavbarWrapper = ({ 
  authContextValue = testUtils.createMockAuthContext()
}) => (
  <BrowserRouter>
    <AuthContext.Provider value={authContextValue}>
      <Navbar />
    </AuthContext.Provider>
  </BrowserRouter>
);

describe('Navbar Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering - Unauthenticated User', () => {
    test('shows login and register links when not authenticated', () => {
      const authContextValue = testUtils.createMockAuthContext(null);
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('link', { name: /bejelentkezés/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /regisztráció/i })).toBeInTheDocument();
      expect(screen.queryByText(/kijelentkezés/i)).not.toBeInTheDocument();
    });

    test('shows academy logo and name', () => {
      const authContextValue = testUtils.createMockAuthContext(null);
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByText(/lion football academy/i)).toBeInTheDocument();
      expect(screen.getByAltText(/academy logo/i)).toBeInTheDocument();
    });

    test('does not show navigation menu when not authenticated', () => {
      const authContextValue = testUtils.createMockAuthContext(null);
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.queryByText(/dashboard/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/játékosok/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/csapatok/i)).not.toBeInTheDocument();
    });
  });

  describe('Rendering - Admin User', () => {
    test('shows all navigation items for admin', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /adminisztráció/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /játékosok/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /csapatok/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /edzések/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /mérkőzések/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /statisztikák/i })).toBeInTheDocument();
    });

    test('shows admin-only menu items', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('link', { name: /adminisztráció/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ai elemzések/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /qr bejelentkezés/i })).toBeInTheDocument();
    });

    test('shows user info and logout option', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByText(/test admin/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /kijelentkezés/i })).toBeInTheDocument();
    });
  });

  describe('Rendering - Coach User', () => {
    test('shows coach-appropriate navigation items', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /csapataim/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /játékosok/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /edzések/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /mérkőzések/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /statisztikák/i })).toBeInTheDocument();
    });

    test('hides admin-only menu items from coaches', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.queryByRole('link', { name: /adminisztráció/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /ai elemzések/i })).not.toBeInTheDocument();
    });
  });

  describe('Rendering - Parent User', () => {
    test('shows parent-appropriate navigation items', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /gyermekem/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /fejlesztési tervek/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /közlemények/i })).toBeInTheDocument();
    });

    test('hides management features from parents', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('parent')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.queryByRole('link', { name: /adminisztráció/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /csapatok/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /edzések/i })).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('toggles mobile menu on hamburger click', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const hamburgerButton = screen.getByRole('button', { name: /menü megnyitása/i });
      
      // Menu should be closed initially
      expect(screen.queryByTestId('mobile-menu')).not.toBeVisible();
      
      // Click to open
      await user.click(hamburgerButton);
      expect(screen.getByTestId('mobile-menu')).toBeVisible();
      
      // Click to close
      await user.click(hamburgerButton);
      expect(screen.queryByTestId('mobile-menu')).not.toBeVisible();
    });

    test('calls logout function when logout button clicked', async () => {
      const mockLogout = jest.fn();
      const authContextValue = {
        ...testUtils.createMockAuthContext(testUtils.createMockUser('admin')),
        logout: mockLogout,
      };
      
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const logoutButton = screen.getByRole('button', { name: /kijelentkezés/i });
      await user.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('shows confirmation dialog before logout', async () => {
      const mockLogout = jest.fn();
      const authContextValue = {
        ...testUtils.createMockAuthContext(testUtils.createMockUser('admin')),
        logout: mockLogout,
      };
      
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const logoutButton = screen.getByRole('button', { name: /kijelentkezés/i });
      await user.click(logoutButton);
      
      expect(screen.getByText(/biztosan ki szeretnél jelentkezni/i)).toBeInTheDocument();
      
      // Cancel logout
      const cancelButton = screen.getByRole('button', { name: /mégsem/i });
      await user.click(cancelButton);
      
      expect(mockLogout).not.toHaveBeenCalled();
      
      // Confirm logout
      await user.click(logoutButton);
      const confirmButton = screen.getByRole('button', { name: /kijelentkezés/i });
      await user.click(confirmButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    test('closes mobile menu when navigation link clicked', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      // Open mobile menu
      const hamburgerButton = screen.getByRole('button', { name: /menü megnyitása/i });
      await user.click(hamburgerButton);
      
      expect(screen.getByTestId('mobile-menu')).toBeVisible();
      
      // Click navigation link
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      await user.click(dashboardLink);
      
      // Menu should close
      expect(screen.queryByTestId('mobile-menu')).not.toBeVisible();
    });
  });

  describe('Responsive Design', () => {
    test('shows desktop layout on large screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByTestId('desktop-navbar')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /menü megnyitása/i })).not.toBeInTheDocument();
    });

    test('shows mobile layout on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /menü megnyitása/i })).toBeInTheDocument();
    });

    test('adapts to screen size changes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      // Start with desktop
      Object.defineProperty(window, 'innerWidth', { value: 1200 });
      fireEvent(window, new Event('resize'));
      
      expect(screen.getByTestId('desktop-navbar')).toBeInTheDocument();
      
      // Resize to mobile
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      fireEvent(window, new Event('resize'));
      
      expect(screen.getByTestId('mobile-navbar')).toBeInTheDocument();
    });
  });

  describe('Navigation Highlighting', () => {
    test('highlights active navigation item', () => {
      // Mock current location
      delete window.location;
      window.location = { pathname: '/dashboard' };
      
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveClass('active');
    });

    test('updates highlighting when route changes', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      // Initially no active item
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const playersLink = screen.getByRole('link', { name: /játékosok/i });
      
      expect(dashboardLink).not.toHaveClass('active');
      expect(playersLink).not.toHaveClass('active');
      
      // Navigate to players
      delete window.location;
      window.location = { pathname: '/players' };
      
      // Re-render to update highlighting
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('link', { name: /játékosok/i })).toHaveClass('active');
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Főnavigáció');
      expect(screen.getByRole('button', { name: /kijelentkezés/i })).toHaveAttribute(
        'aria-label', 
        'Kijelentkezés a rendszerből'
      );
    });

    test('supports keyboard navigation', async () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      const playersLink = screen.getByRole('link', { name: /játékosok/i });
      
      // Tab through navigation
      dashboardLink.focus();
      expect(dashboardLink).toHaveFocus();
      
      await user.tab();
      expect(playersLink).toHaveFocus();
    });

    test('announces role-based menu changes', async () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('coach')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const navigation = screen.getByRole('navigation');
      expect(navigation).toHaveAttribute('aria-live', 'polite');
    });

    test('provides skip navigation link', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const skipLink = screen.getByText(/ugrás a tartalomhoz/i);
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute('href', '#main-content');
    });
  });

  describe('Performance', () => {
    test('renders quickly', () => {
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      testPerformance.start('navbar-render');
      render(<NavbarWrapper authContextValue={authContextValue} />);
      const renderTime = testPerformance.end('navbar-render');
      
      expect(renderTime).toBeLessThan(100);
    });

    test('does not re-render unnecessarily', () => {
      const renderSpy = jest.fn();
      const SpyNavbar = () => {
        renderSpy();
        return <Navbar />;
      };
      
      const authContextValue = testUtils.createMockAuthContext(
        testUtils.createMockUser('admin')
      );
      
      const { rerender } = render(
        <BrowserRouter>
          <AuthContext.Provider value={authContextValue}>
            <SpyNavbar />
          </AuthContext.Provider>
        </BrowserRouter>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(1);
      
      // Re-render with same props
      rerender(
        <BrowserRouter>
          <AuthContext.Provider value={authContextValue}>
            <SpyNavbar />
          </AuthContext.Provider>
        </BrowserRouter>
      );
      
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('handles missing user data gracefully', () => {
      const authContextValue = {
        ...testUtils.createMockAuthContext(),
        user: { id: 1 }, // Missing name and role
      };
      
      expect(() => {
        render(<NavbarWrapper authContextValue={authContextValue} />);
      }).not.toThrow();
      
      expect(screen.getByText(/ismeretlen felhasználó/i)).toBeInTheDocument();
    });

    test('handles network errors during logout', async () => {
      const mockLogout = jest.fn().mockRejectedValue(new Error('Network error'));
      const authContextValue = {
        ...testUtils.createMockAuthContext(testUtils.createMockUser('admin')),
        logout: mockLogout,
      };
      
      render(<NavbarWrapper authContextValue={authContextValue} />);
      
      const logoutButton = screen.getByRole('button', { name: /kijelentkezés/i });
      await user.click(logoutButton);
      
      const confirmButton = screen.getByRole('button', { name: /kijelentkezés/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText(/hiba történt a kijelentkezés során/i)).toBeInTheDocument();
      });
    });
  });
});