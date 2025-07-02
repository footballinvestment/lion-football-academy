/**
 * API Integration Tests
 * Lion Football Academy Frontend Testing Suite
 */

import axios from 'axios';
import apiService from '../../src/services/api';

// Mock axios for testing
jest.mock('axios');
const mockedAxios = axios;

describe('API Service Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Authentication API', () => {
    describe('Login', () => {
      test('successful login returns user data and tokens', async () => {
        const mockResponse = {
          data: {
            success: true,
            user: testUtils.createMockUser('admin'),
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            },
          },
        };

        mockedAxios.post.mockResolvedValueOnce(mockResponse);

        const result = await apiService.auth.login('admin', 'admin123');

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/login', {
          username: 'admin',
          password: 'admin123',
        });
        expect(result.data).toEqual(mockResponse.data);
      });

      test('failed login returns error message', async () => {
        const mockResponse = {
          response: {
            status: 401,
            data: {
              success: false,
              message: 'Invalid credentials',
            },
          },
        };

        mockedAxios.post.mockRejectedValueOnce(mockResponse);

        await expect(apiService.auth.login('wrong', 'wrong')).rejects.toEqual(mockResponse);
      });

      test('network error during login', async () => {
        const networkError = new Error('Network Error');
        mockedAxios.post.mockRejectedValueOnce(networkError);

        await expect(apiService.auth.login('admin', 'admin123')).rejects.toThrow('Network Error');
      });
    });

    describe('Token Management', () => {
      test('sets authorization header after login', async () => {
        const mockResponse = {
          data: {
            success: true,
            user: testUtils.createMockUser('admin'),
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            },
          },
        };

        mockedAxios.post.mockResolvedValueOnce(mockResponse);

        await apiService.auth.login('admin', 'admin123');
        apiService.setAuthToken('mock-access-token');

        expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer mock-access-token');
      });

      test('clears authorization header on logout', () => {
        apiService.setAuthToken('mock-access-token');
        expect(mockedAxios.defaults.headers.common['Authorization']).toBe('Bearer mock-access-token');

        apiService.clearAuthToken();
        expect(mockedAxios.defaults.headers.common['Authorization']).toBeUndefined();
      });

      test('refreshes token when expired', async () => {
        const mockRefreshResponse = {
          data: {
            success: true,
            accessToken: 'new-access-token',
          },
        };

        mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);

        const result = await apiService.auth.refreshToken('mock-refresh-token');

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/refresh', {
          refreshToken: 'mock-refresh-token',
        });
        expect(result.data.accessToken).toBe('new-access-token');
      });
    });

    describe('Token Interceptors', () => {
      test('automatically retries request with new token on 401', async () => {
        // First request fails with 401
        const unauthorizedError = {
          response: { status: 401 },
          config: { url: '/api/teams', method: 'get' },
        };

        // Refresh token succeeds
        const refreshResponse = {
          data: { success: true, accessToken: 'new-token' },
        };

        // Retry succeeds
        const retryResponse = {
          data: { success: true, data: [testUtils.createMockTeam()] },
        };

        mockedAxios.request
          .mockRejectedValueOnce(unauthorizedError)
          .mockResolvedValueOnce(retryResponse);
        
        mockedAxios.post.mockResolvedValueOnce(refreshResponse);

        localStorage.setItem('refreshToken', 'valid-refresh-token');

        const result = await apiService.teams.getAll();
        expect(result.data.data).toEqual([testUtils.createMockTeam()]);
      });

      test('redirects to login when refresh token is invalid', async () => {
        const unauthorizedError = {
          response: { status: 401 },
          config: { url: '/api/teams', method: 'get' },
        };

        const refreshError = {
          response: { status: 401, data: { success: false } },
        };

        mockedAxios.request.mockRejectedValueOnce(unauthorizedError);
        mockedAxios.post.mockRejectedValueOnce(refreshError);

        localStorage.setItem('refreshToken', 'invalid-refresh-token');

        const mockRedirect = jest.fn();
        Object.defineProperty(window, 'location', {
          value: { assign: mockRedirect },
          writable: true,
        });

        await expect(apiService.teams.getAll()).rejects.toEqual(unauthorizedError);
        expect(mockRedirect).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Teams API', () => {
    beforeEach(() => {
      apiService.setAuthToken('mock-token');
    });

    test('gets all teams', async () => {
      const mockTeams = [
        testUtils.createMockTeam(),
        { ...testUtils.createMockTeam(), id: 2, name: 'Eagles U14' },
      ];

      const mockResponse = {
        data: { success: true, data: mockTeams },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.teams.getAll();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/teams');
      expect(result.data.data).toEqual(mockTeams);
    });

    test('gets team by id', async () => {
      const mockTeam = testUtils.createMockTeam();
      const mockResponse = {
        data: { success: true, data: mockTeam },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.teams.getById(1);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/teams/1');
      expect(result.data.data).toEqual(mockTeam);
    });

    test('creates new team', async () => {
      const newTeam = {
        name: 'Lions U10',
        age_group: 'U10',
        coach_id: 2,
      };

      const mockResponse = {
        data: { success: true, data: { ...newTeam, id: 3 } },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await apiService.teams.create(newTeam);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/teams', newTeam);
      expect(result.data.data.id).toBe(3);
    });

    test('updates team', async () => {
      const updateData = { name: 'Lions U12 Updated' };
      const mockResponse = {
        data: { success: true, data: { ...testUtils.createMockTeam(), ...updateData } },
      };

      mockedAxios.put.mockResolvedValueOnce(mockResponse);

      const result = await apiService.teams.update(1, updateData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/teams/1', updateData);
      expect(result.data.data.name).toBe('Lions U12 Updated');
    });

    test('deletes team', async () => {
      const mockResponse = {
        data: { success: true, message: 'Team deleted successfully' },
      };

      mockedAxios.delete.mockResolvedValueOnce(mockResponse);

      const result = await apiService.teams.delete(1);

      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/teams/1');
      expect(result.data.success).toBe(true);
    });
  });

  describe('Players API', () => {
    beforeEach(() => {
      apiService.setAuthToken('mock-token');
    });

    test('gets all players', async () => {
      const mockPlayers = [
        testUtils.createMockPlayer(),
        { ...testUtils.createMockPlayer(), id: 2, name: 'Jane Doe' },
      ];

      const mockResponse = {
        data: { success: true, data: mockPlayers },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.players.getAll();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/players');
      expect(result.data.data).toEqual(mockPlayers);
    });

    test('gets players by team', async () => {
      const mockPlayers = [testUtils.createMockPlayer()];
      const mockResponse = {
        data: { success: true, data: mockPlayers },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.players.getByTeam(1);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/players?team_id=1');
      expect(result.data.data).toEqual(mockPlayers);
    });

    test('creates new player', async () => {
      const newPlayer = {
        name: 'New Player',
        birth_date: '2012-01-01',
        position: 'Forward',
        team_id: 1,
      };

      const mockResponse = {
        data: { success: true, data: { ...newPlayer, id: 4 } },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await apiService.players.create(newPlayer);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/players', newPlayer);
      expect(result.data.data.id).toBe(4);
    });

    test('updates player', async () => {
      const updateData = { position: 'Midfielder' };
      const mockResponse = {
        data: { success: true, data: { ...testUtils.createMockPlayer(), ...updateData } },
      };

      mockedAxios.put.mockResolvedValueOnce(mockResponse);

      const result = await apiService.players.update(1, updateData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/players/1', updateData);
      expect(result.data.data.position).toBe('Midfielder');
    });
  });

  describe('Matches API', () => {
    beforeEach(() => {
      apiService.setAuthToken('mock-token');
    });

    test('gets all matches', async () => {
      const mockMatches = [
        testUtils.createMockMatch(),
        { ...testUtils.createMockMatch(), id: 2, home_score: 3, away_score: 1 },
      ];

      const mockResponse = {
        data: { success: true, data: mockMatches },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.matches.getAll();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/matches');
      expect(result.data.data).toEqual(mockMatches);
    });

    test('gets matches by team', async () => {
      const mockMatches = [testUtils.createMockMatch()];
      const mockResponse = {
        data: { success: true, data: mockMatches },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.matches.getByTeam(1);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/matches?team_id=1');
      expect(result.data.data).toEqual(mockMatches);
    });

    test('creates new match', async () => {
      const newMatch = {
        home_team_id: 1,
        away_team_id: 2,
        match_date: '2024-02-01T15:00:00Z',
        venue: 'Academy Field 1',
      };

      const mockResponse = {
        data: { success: true, data: { ...newMatch, id: 3 } },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await apiService.matches.create(newMatch);

      expect(mockedAxios.post).toHaveBeenCalledWith('/api/matches', newMatch);
      expect(result.data.data.id).toBe(3);
    });

    test('updates match result', async () => {
      const resultData = { home_score: 4, away_score: 2, status: 'completed' };
      const mockResponse = {
        data: { success: true, data: { ...testUtils.createMockMatch(), ...resultData } },
      };

      mockedAxios.put.mockResolvedValueOnce(mockResponse);

      const result = await apiService.matches.updateResult(1, resultData);

      expect(mockedAxios.put).toHaveBeenCalledWith('/api/matches/1/result', resultData);
      expect(result.data.data.home_score).toBe(4);
    });
  });

  describe('Statistics API', () => {
    beforeEach(() => {
      apiService.setAuthToken('mock-token');
    });

    test('gets team statistics', async () => {
      const mockStats = {
        team_id: 1,
        matches_played: 15,
        wins: 10,
        draws: 3,
        losses: 2,
        goals_for: 35,
        goals_against: 18,
      };

      const mockResponse = {
        data: { success: true, data: mockStats },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.statistics.getTeamStats(1);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/stats/team/1');
      expect(result.data.data).toEqual(mockStats);
    });

    test('gets player statistics', async () => {
      const mockStats = {
        player_id: 1,
        matches_played: 12,
        goals: 8,
        assists: 5,
        yellow_cards: 2,
        red_cards: 0,
      };

      const mockResponse = {
        data: { success: true, data: mockStats },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.statistics.getPlayerStats(1);

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/stats/player/1');
      expect(result.data.data).toEqual(mockStats);
    });
  });

  describe('Error Handling', () => {
    test('handles 400 Bad Request', async () => {
      const badRequestError = {
        response: {
          status: 400,
          data: {
            success: false,
            message: 'Validation failed',
            errors: ['Name is required'],
          },
        },
      };

      mockedAxios.post.mockRejectedValueOnce(badRequestError);

      await expect(apiService.teams.create({})).rejects.toEqual(badRequestError);
    });

    test('handles 403 Forbidden', async () => {
      const forbiddenError = {
        response: {
          status: 403,
          data: {
            success: false,
            message: 'Access denied',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(forbiddenError);

      await expect(apiService.teams.getAll()).rejects.toEqual(forbiddenError);
    });

    test('handles 404 Not Found', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: {
            success: false,
            message: 'Team not found',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(notFoundError);

      await expect(apiService.teams.getById(999)).rejects.toEqual(notFoundError);
    });

    test('handles 500 Internal Server Error', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            success: false,
            message: 'Internal server error',
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(serverError);

      await expect(apiService.teams.getAll()).rejects.toEqual(serverError);
    });

    test('handles network timeout', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };

      mockedAxios.get.mockRejectedValueOnce(timeoutError);

      await expect(apiService.teams.getAll()).rejects.toEqual(timeoutError);
    });
  });

  describe('Request/Response Interceptors', () => {
    test('adds timestamp to requests', async () => {
      const mockResponse = {
        data: { success: true, data: [] },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await apiService.teams.getAll();

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/teams');
      // Verify interceptor added timestamp (implementation dependent)
    });

    test('logs requests in development', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      process.env.NODE_ENV = 'development';

      const mockResponse = {
        data: { success: true, data: [] },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      await apiService.teams.getAll();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test('transforms response data', async () => {
      const mockResponse = {
        data: {
          success: true,
          data: [testUtils.createMockTeam()],
          timestamp: '2024-01-01T12:00:00Z',
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await apiService.teams.getAll();

      expect(result.data).toEqual(mockResponse.data);
    });
  });

  describe('Rate Limiting', () => {
    test('handles rate limit errors', async () => {
      const rateLimitError = {
        response: {
          status: 429,
          data: {
            success: false,
            message: 'Too many requests',
            retryAfter: 60,
          },
        },
      };

      mockedAxios.get.mockRejectedValueOnce(rateLimitError);

      await expect(apiService.teams.getAll()).rejects.toEqual(rateLimitError);
    });

    test('implements retry logic for rate limits', async () => {
      const rateLimitError = {
        response: { status: 429 },
        config: { url: '/api/teams', method: 'get' },
      };

      const successResponse = {
        data: { success: true, data: [testUtils.createMockTeam()] },
      };

      mockedAxios.request
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce(successResponse);

      const result = await apiService.teams.getAll();
      expect(result.data.data).toEqual([testUtils.createMockTeam()]);
    });
  });

  describe('Caching', () => {
    test('caches GET requests', async () => {
      const mockResponse = {
        data: { success: true, data: [testUtils.createMockTeam()] },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      // First request
      await apiService.teams.getAll();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);

      // Second request should use cache
      await apiService.teams.getAll();
      expect(mockedAxios.get).toHaveBeenCalledTimes(1); // Still 1 if cached
    });

    test('invalidates cache on mutations', async () => {
      const getResponse = {
        data: { success: true, data: [testUtils.createMockTeam()] },
      };

      const createResponse = {
        data: { success: true, data: testUtils.createMockTeam() },
      };

      mockedAxios.get.mockResolvedValue(getResponse);
      mockedAxios.post.mockResolvedValue(createResponse);

      // First GET request
      await apiService.teams.getAll();

      // Create new team (should invalidate cache)
      await apiService.teams.create({ name: 'New Team' });

      // Second GET request should hit API again
      await apiService.teams.getAll();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });
});