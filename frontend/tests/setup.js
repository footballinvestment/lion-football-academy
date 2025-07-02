/**
 * Test Setup Configuration
 * Lion Football Academy Frontend Testing Suite
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock console methods in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.HTMLMediaElement
Object.defineProperty(HTMLMediaElement.prototype, 'muted', {
  writable: true,
  value: false,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

// Reset any request handlers that we may add during the tests
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
  sessionStorage.clear();
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Global test utilities
global.testUtils = {
  createMockUser: (role = 'admin') => ({
    id: 1,
    username: `test_${role}`,
    email: `${role}@test.com`,
    role: role,
    name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    team_id: role === 'coach' ? 1 : null,
    player_id: role === 'parent' ? 1 : null,
  }),

  createMockTeam: () => ({
    id: 1,
    name: 'Lions U12',
    age_group: 'U12',
    coach_id: 2,
    founded_year: 2024,
    home_venue: 'Academy Field 1',
    players_count: 15,
  }),

  createMockPlayer: () => ({
    id: 1,
    name: 'John Smith',
    birth_date: '2012-05-15',
    position: 'Midfielder',
    team_id: 1,
    jersey_number: 10,
    height: 145,
    weight: 35,
    email: 'john.parent@test.com',
  }),

  createMockMatch: () => ({
    id: 1,
    home_team_id: 1,
    away_team_id: 2,
    match_date: '2024-01-15T15:00:00Z',
    venue: 'Academy Field 1',
    home_score: 2,
    away_score: 1,
    status: 'completed',
  }),

  createMockAuthContext: (user = null, loading = false) => ({
    user,
    loading,
    token: user ? 'mock-token' : null,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    isAuthenticated: !!user,
    isAdmin: () => user?.role === 'admin',
    isCoach: () => user?.role === 'coach',
    isParent: () => user?.role === 'parent',
    canAccessFeature: jest.fn(),
    canAccessPlayer: jest.fn(),
    canAccessTeam: jest.fn(),
  }),
};

// Performance monitoring for tests
const performanceObserver = {
  measurements: {},
  
  start: (name) => {
    performanceObserver.measurements[name] = performance.now();
  },
  
  end: (name) => {
    if (performanceObserver.measurements[name]) {
      const duration = performance.now() - performanceObserver.measurements[name];
      console.log(`Test Performance: ${name} took ${duration.toFixed(2)}ms`);
      return duration;
    }
    return 0;
  },
};

global.testPerformance = performanceObserver;