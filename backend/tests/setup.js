const path = require('path');
const fs = require('fs');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.DB_PATH = ':memory:'; // Use in-memory database for tests

// Global test timeout
jest.setTimeout(10000);

// Mock console.log in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test helpers
global.testHelpers = {
  createTestUser: (overrides = {}) => ({
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'player',
    ...overrides
  }),
  
  createTestPlayer: (overrides = {}) => ({
    id: 1,
    user_id: 1,
    team_id: 1,
    position: 'midfielder',
    ...overrides
  }),
  
  createTestTeam: (overrides = {}) => ({
    id: 1,
    name: 'Test Team',
    coach_id: 1,
    age_group: 'U16',
    ...overrides
  }),
  
  createTestTraining: (overrides = {}) => ({
    id: 1,
    team_id: 1,
    coach_id: 1,
    title: 'Test Training',
    date: new Date().toISOString(),
    ...overrides
  }),
  
  createTestMatch: (overrides = {}) => ({
    id: 1,
    home_team_id: 1,
    away_team_id: 2,
    date: new Date().toISOString(),
    status: 'scheduled',
    ...overrides
  })
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

afterEach(() => {
  // Reset any module state
  jest.resetModules();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});