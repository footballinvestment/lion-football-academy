/**
 * Mock Server for API Testing
 * Lion Football Academy Frontend Testing Suite
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock API responses
const handlers = [
  // Authentication endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const { username, password } = await request.json();
    
    if (username === 'admin' && password === 'admin123') {
      return HttpResponse.json({
        success: true,
        user: testUtils.createMockUser('admin'),
        tokens: {
          accessToken: 'mock-admin-token',
          refreshToken: 'mock-admin-refresh-token',
        },
      });
    }
    
    if (username === 'coach_test' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        user: testUtils.createMockUser('coach'),
        tokens: {
          accessToken: 'mock-coach-token',
          refreshToken: 'mock-coach-refresh-token',
        },
      });
    }
    
    if (username === 'parent_test' && password === 'password123') {
      return HttpResponse.json({
        success: true,
        user: testUtils.createMockUser('parent'),
        tokens: {
          accessToken: 'mock-parent-token',
          refreshToken: 'mock-parent-refresh-token',
        },
      });
    }
    
    return HttpResponse.json(
      { success: false, message: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json({
      success: true,
      user: { ...testUtils.createMockUser(userData.role), ...userData },
      tokens: {
        accessToken: 'mock-new-user-token',
        refreshToken: 'mock-new-user-refresh-token',
      },
    });
  }),

  http.post('/api/auth/verify', () => {
    return HttpResponse.json({
      success: true,
      user: testUtils.createMockUser('admin'),
    });
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json({
      success: true,
      accessToken: 'mock-refreshed-token',
    });
  }),

  // Teams endpoints
  http.get('/api/teams', () => {
    return HttpResponse.json({
      success: true,
      data: [
        testUtils.createMockTeam(),
        { ...testUtils.createMockTeam(), id: 2, name: 'Eagles U14', age_group: 'U14' },
        { ...testUtils.createMockTeam(), id: 3, name: 'Hawks U16', age_group: 'U16' },
      ],
    });
  }),

  http.get('/api/teams/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockTeam(), id: parseInt(params.id) },
    });
  }),

  http.post('/api/teams', async ({ request }) => {
    const teamData = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockTeam(), ...teamData, id: Math.floor(Math.random() * 1000) },
    });
  }),

  http.put('/api/teams/:id', async ({ params, request }) => {
    const teamData = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockTeam(), ...teamData, id: parseInt(params.id) },
    });
  }),

  http.delete('/api/teams/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: `Team ${params.id} deleted successfully`,
    });
  }),

  // Players endpoints
  http.get('/api/players', () => {
    return HttpResponse.json({
      success: true,
      data: [
        testUtils.createMockPlayer(),
        { ...testUtils.createMockPlayer(), id: 2, name: 'Jane Doe', position: 'Defender' },
        { ...testUtils.createMockPlayer(), id: 3, name: 'Mike Johnson', position: 'Goalkeeper' },
      ],
    });
  }),

  http.get('/api/players/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockPlayer(), id: parseInt(params.id) },
    });
  }),

  http.post('/api/players', async ({ request }) => {
    const playerData = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockPlayer(), ...playerData, id: Math.floor(Math.random() * 1000) },
    });
  }),

  http.put('/api/players/:id', async ({ params, request }) => {
    const playerData = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockPlayer(), ...playerData, id: parseInt(params.id) },
    });
  }),

  http.delete('/api/players/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: `Player ${params.id} deleted successfully`,
    });
  }),

  // Matches endpoints
  http.get('/api/matches', () => {
    return HttpResponse.json({
      success: true,
      data: [
        testUtils.createMockMatch(),
        { ...testUtils.createMockMatch(), id: 2, home_score: 3, away_score: 0 },
        { ...testUtils.createMockMatch(), id: 3, home_score: 1, away_score: 2 },
      ],
    });
  }),

  http.get('/api/matches/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockMatch(), id: parseInt(params.id) },
    });
  }),

  http.post('/api/matches', async ({ request }) => {
    const matchData = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockMatch(), ...matchData, id: Math.floor(Math.random() * 1000) },
    });
  }),

  // Users endpoints
  http.get('/api/admin/users', () => {
    return HttpResponse.json({
      success: true,
      data: [
        testUtils.createMockUser('admin'),
        testUtils.createMockUser('coach'),
        testUtils.createMockUser('parent'),
      ],
    });
  }),

  http.post('/api/admin/users', async ({ request }) => {
    const userData = await request.json();
    return HttpResponse.json({
      success: true,
      data: { ...testUtils.createMockUser(userData.role), ...userData, id: Math.floor(Math.random() * 1000) },
    });
  }),

  // Statistics endpoints
  http.get('/api/stats/team/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        team_id: parseInt(params.id),
        matches_played: 15,
        wins: 10,
        draws: 3,
        losses: 2,
        goals_for: 35,
        goals_against: 18,
        win_percentage: 66.7,
      },
    });
  }),

  http.get('/api/stats/player/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        player_id: parseInt(params.id),
        matches_played: 12,
        goals: 8,
        assists: 5,
        yellow_cards: 2,
        red_cards: 0,
        minutes_played: 1080,
      },
    });
  }),

  // Development plans endpoints
  http.get('/api/development-plans', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          player_id: 1,
          title: 'Shooting Accuracy Improvement',
          description: 'Focus on improving shooting accuracy from different positions',
          goals: ['Increase shooting accuracy by 15%', 'Practice shooting drills 3x per week'],
          progress: 65,
          created_date: '2024-01-01',
          target_date: '2024-06-01',
        },
      ],
    });
  }),

  // Injuries endpoints
  http.get('/api/injuries', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          player_id: 1,
          injury_type: 'Ankle Sprain',
          severity: 'Minor',
          injury_date: '2024-01-10',
          recovery_date: '2024-01-20',
          status: 'Recovered',
          description: 'Twisted ankle during training',
        },
      ],
    });
  }),

  // Training endpoints
  http.get('/api/trainings', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: 1,
          team_id: 1,
          training_date: '2024-01-15T18:00:00Z',
          duration: 90,
          location: 'Academy Field 1',
          focus: 'Tactical Training',
          attendance_count: 12,
        },
      ],
    });
  }),

  // QR Code endpoints
  http.get('/api/qr/generate/:playerId', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        qrCode: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`,
        playerId: params.playerId,
      },
    });
  }),

  // Error handling
  http.get('/api/error-test', () => {
    return HttpResponse.json(
      { success: false, message: 'Test error' },
      { status: 500 }
    );
  }),

  // Fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json(
      { success: false, message: 'Endpoint not found' },
      { status: 404 }
    );
  }),
];

export const server = setupServer(...handlers);