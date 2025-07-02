/**
 * PlayerList Component Tests
 * Lion Football Academy Frontend Testing Suite
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../src/context/AuthContext';
import PlayerList from '../../src/components/PlayerList';

const PlayerListWrapper = ({ 
  authContextValue = testUtils.createMockAuthContext(testUtils.createMockUser('admin')),
  players = [
    testUtils.createMockPlayer(),
    { ...testUtils.createMockPlayer(), id: 2, name: 'Jane Doe', position: 'Defender' },
    { ...testUtils.createMockPlayer(), id: 3, name: 'Mike Johnson', position: 'Goalkeeper' },
  ]
}) => (
  <BrowserRouter>
    <AuthContext.Provider value={authContextValue}>
      <PlayerList players={players} />
    </AuthContext.Provider>
  </BrowserRouter>
);

describe('PlayerList Component', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders player list with correct data', () => {
      render(<PlayerListWrapper />);
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      expect(screen.getByText('Midfielder')).toBeInTheDocument();
      expect(screen.getByText('Defender')).toBeInTheDocument();
      expect(screen.getByText('Goalkeeper')).toBeInTheDocument();
    });

    test('renders empty state when no players', () => {
      render(<PlayerListWrapper players={[]} />);
      
      expect(screen.getByText(/nincsenek játékosok/i)).toBeInTheDocument();
      expect(screen.getByText(/add meg az első játékost/i)).toBeInTheDocument();
    });

    test('renders loading state', () => {
      render(<PlayerListWrapper players={undefined} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    test('shows player count', () => {
      render(<PlayerListWrapper />);
      
      expect(screen.getByText(/összesen: 3 játékos/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    test('filters players by name', async () => {
      render(<PlayerListWrapper />);
      
      const searchInput = screen.getByPlaceholderText(/keresés név szerint/i);
      await user.type(searchInput, 'John');
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Mike Johnson')).not.toBeInTheDocument();
    });

    test('filters players by position', async () => {
      render(<PlayerListWrapper />);
      
      const positionFilter = screen.getByRole('combobox', { name: /pozíció/i });
      await user.selectOptions(positionFilter, 'Goalkeeper');
      
      expect(screen.getByText('Mike Johnson')).toBeInTheDocument();
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });

    test('filters players by team', async () => {
      const playersWithTeams = [
        { ...testUtils.createMockPlayer(), team_name: 'Lions U12' },
        { ...testUtils.createMockPlayer(), id: 2, name: 'Jane Doe', team_name: 'Eagles U14' },
      ];
      
      render(<PlayerListWrapper players={playersWithTeams} />);
      
      const teamFilter = screen.getByRole('combobox', { name: /csapat/i });
      await user.selectOptions(teamFilter, 'Lions U12');
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
    });

    test('clears filters', async () => {
      render(<PlayerListWrapper />);
      
      // Apply filter
      const searchInput = screen.getByPlaceholderText(/keresés név szerint/i);
      await user.type(searchInput, 'John');
      
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument();
      
      // Clear filter
      const clearButton = screen.getByRole('button', { name: /törlés/i });
      await user.click(clearButton);
      
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(searchInput).toHaveValue('');
    });
  });

  describe('Sorting', () => {
    test('sorts players by name ascending', async () => {
      render(<PlayerListWrapper />);
      
      const sortButton = screen.getByRole('button', { name: /név szerint rendezés/i });
      await user.click(sortButton);
      
      const playerNames = screen.getAllByTestId('player-name');
      expect(playerNames[0]).toHaveTextContent('Jane Doe');
      expect(playerNames[1]).toHaveTextContent('John Smith');
      expect(playerNames[2]).toHaveTextContent('Mike Johnson');
    });

    test('sorts players by name descending', async () => {
      render(<PlayerListWrapper />);
      
      const sortButton = screen.getByRole('button', { name: /név szerint rendezés/i });
      await user.click(sortButton); // Ascending
      await user.click(sortButton); // Descending
      
      const playerNames = screen.getAllByTestId('player-name');
      expect(playerNames[0]).toHaveTextContent('Mike Johnson');
      expect(playerNames[1]).toHaveTextContent('John Smith');
      expect(playerNames[2]).toHaveTextContent('Jane Doe');
    });

    test('sorts players by position', async () => {
      render(<PlayerListWrapper />);
      
      const positionSortButton = screen.getByRole('button', { name: /pozíció szerint rendezés/i });
      await user.click(positionSortButton);
      
      const positions = screen.getAllByTestId('player-position');
      expect(positions[0]).toHaveTextContent('Defender');
      expect(positions[1]).toHaveTextContent('Goalkeeper');
      expect(positions[2]).toHaveTextContent('Midfielder');
    });
  });

  describe('Player Actions', () => {
    test('opens player modal on player click', async () => {
      render(<PlayerListWrapper />);
      
      const playerRow = screen.getByTestId('player-row-1');
      await user.click(playerRow);
      
      expect(screen.getByTestId('player-modal')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    test('shows edit action for admin users', () => {
      const adminAuth = testUtils.createMockAuthContext(testUtils.createMockUser('admin'));
      render(<PlayerListWrapper authContextValue={adminAuth} />);
      
      const editButtons = screen.getAllByRole('button', { name: /szerkesztés/i });
      expect(editButtons).toHaveLength(3); // One for each player
    });

    test('hides edit action for parent users', () => {
      const parentAuth = testUtils.createMockAuthContext(testUtils.createMockUser('parent'));
      render(<PlayerListWrapper authContextValue={parentAuth} />);
      
      expect(screen.queryByRole('button', { name: /szerkesztés/i })).not.toBeInTheDocument();
    });

    test('shows delete action for admin users', () => {
      const adminAuth = testUtils.createMockAuthContext(testUtils.createMockUser('admin'));
      render(<PlayerListWrapper authContextValue={adminAuth} />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /törlés/i });
      expect(deleteButtons).toHaveLength(3);
    });
  });

  describe('Pagination', () => {
    test('shows pagination for large player lists', () => {
      const manyPlayers = Array.from({ length: 25 }, (_, i) => ({
        ...testUtils.createMockPlayer(),
        id: i + 1,
        name: `Player ${i + 1}`,
      }));
      
      render(<PlayerListWrapper players={manyPlayers} />);
      
      expect(screen.getByTestId('pagination')).toBeInTheDocument();
      expect(screen.getByText(/1 / 3/i)).toBeInTheDocument(); // Pages
    });

    test('navigates between pages', async () => {
      const manyPlayers = Array.from({ length: 25 }, (_, i) => ({
        ...testUtils.createMockPlayer(),
        id: i + 1,
        name: `Player ${i + 1}`,
      }));
      
      render(<PlayerListWrapper players={manyPlayers} />);
      
      // Should show first 10 players
      expect(screen.getByText('Player 1')).toBeInTheDocument();
      expect(screen.queryByText('Player 11')).not.toBeInTheDocument();
      
      // Navigate to page 2
      const nextButton = screen.getByRole('button', { name: /következő/i });
      await user.click(nextButton);
      
      expect(screen.getByText('Player 11')).toBeInTheDocument();
      expect(screen.queryByText('Player 1')).not.toBeInTheDocument();
    });

    test('changes page size', async () => {
      const manyPlayers = Array.from({ length: 25 }, (_, i) => ({
        ...testUtils.createMockPlayer(),
        id: i + 1,
        name: `Player ${i + 1}`,
      }));
      
      render(<PlayerListWrapper players={manyPlayers} />);
      
      const pageSizeSelect = screen.getByRole('combobox', { name: /lapméret/i });
      await user.selectOptions(pageSizeSelect, '20');
      
      // Should now show 20 players
      expect(screen.getByText('Player 20')).toBeInTheDocument();
      expect(screen.queryByText('Player 21')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('shows mobile layout on small screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      render(<PlayerListWrapper />);
      
      expect(screen.getByTestId('player-list-mobile')).toBeInTheDocument();
    });

    test('shows desktop layout on large screens', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });
      
      render(<PlayerListWrapper />);
      
      expect(screen.getByTestId('player-list-desktop')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    test('virtualizes large player lists', () => {
      const manyPlayers = Array.from({ length: 1000 }, (_, i) => ({
        ...testUtils.createMockPlayer(),
        id: i + 1,
        name: `Player ${i + 1}`,
      }));
      
      testPerformance.start('large-list-render');
      render(<PlayerListWrapper players={manyPlayers} />);
      const renderTime = testPerformance.end('large-list-render');
      
      // Should handle 1000 players efficiently
      expect(renderTime).toBeLessThan(500);
    });

    test('debounces search input', async () => {
      const searchSpy = jest.fn();
      jest.spyOn(console, 'log').mockImplementation(searchSpy);
      
      render(<PlayerListWrapper />);
      
      const searchInput = screen.getByPlaceholderText(/keresés név szerint/i);
      
      // Type rapidly
      await user.type(searchInput, 'John');
      
      // Should debounce and only search once
      await waitFor(() => {
        expect(searchSpy).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<PlayerListWrapper />);
      
      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Játékosok listája');
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Keresés játékosok között');
    });

    test('supports keyboard navigation', async () => {
      render(<PlayerListWrapper />);
      
      const firstPlayerRow = screen.getByTestId('player-row-1');
      firstPlayerRow.focus();
      
      // Arrow down should move to next player
      fireEvent.keyDown(firstPlayerRow, { key: 'ArrowDown' });
      expect(screen.getByTestId('player-row-2')).toHaveFocus();
      
      // Enter should open player modal
      fireEvent.keyDown(screen.getByTestId('player-row-2'), { key: 'Enter' });
      expect(screen.getByTestId('player-modal')).toBeInTheDocument();
    });

    test('announces filter results to screen readers', async () => {
      render(<PlayerListWrapper />);
      
      const searchInput = screen.getByPlaceholderText(/keresés név szerint/i);
      await user.type(searchInput, 'John');
      
      expect(screen.getByText(/1 játékos találat/i)).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Error Handling', () => {
    test('handles missing player data gracefully', () => {
      const playersWithMissingData = [
        { id: 1, name: 'John Smith' }, // Missing position
        { id: 2, position: 'Defender' }, // Missing name
        { id: 3 }, // Missing both
      ];
      
      render(<PlayerListWrapper players={playersWithMissingData} />);
      
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText(/ismeretlen pozíció/i)).toBeInTheDocument();
      expect(screen.getByText(/névtelen játékos/i)).toBeInTheDocument();
    });

    test('handles API errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate API error
      const errorPlayers = new Error('API Error');
      
      expect(() => {
        render(<PlayerListWrapper players={errorPlayers} />);
      }).not.toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});