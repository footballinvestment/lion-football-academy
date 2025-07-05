module.exports = {
  // Extend base Jest configuration
  ...require('./jest.config.js'),
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // Include all source files
    'src/**/*.js',
    
    // Exclude test files
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/__tests__/**',
    
    // Exclude database files
    '!src/database/seeds/**',
    '!src/database/migrations/**',
    
    // Exclude configuration files
    '!src/config/**',
    
    // Exclude entry points
    '!src/index.js',
    '!server.js',
    
    // Exclude mock files
    '!src/**/__mocks__/**',
    
    // Exclude build artifacts
    '!src/build/**',
    '!src/dist/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief summary
    'lcov',          // For tools like Codecov
    'html',          // HTML report
    'json',          // JSON for CI/CD
    'json-summary',  // Summary JSON
    'cobertura'      // XML format for some CI systems
  ],
  
  // Coverage thresholds - 90%+ as required
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    // Controllers - critical business logic
    './src/controllers/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    // Services - core functionality
    './src/services/': {
      branches: 92,
      functions: 92,
      lines: 92,
      statements: 92
    },
    
    // Models - data layer
    './src/models/': {
      branches: 88,
      functions: 88,
      lines: 88,
      statements: 88
    },
    
    // Middleware - security critical
    './src/middleware/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    // Routes - API endpoints
    './src/routes/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    
    // Utils - helper functions
    './src/utils/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    // Authentication service - security critical
    './src/services/authService.js': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    }
  },
  
  // Coverage path mapping
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '\\.config\\.js$',
    '/src/database/seeds/',
    '/src/database/migrations/',
    '/tests/',
    '/scripts/'
  ],
  
  // Ensure coverage is collected even from untested files
  forceExit: true,
  detectOpenHandles: true,
  
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Transform configuration
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Clear mocks automatically
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};