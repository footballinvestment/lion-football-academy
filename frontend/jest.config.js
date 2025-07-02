/**
 * Jest Configuration
 * Lion Football Academy Frontend Testing Suite
 */

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
  },

  // File extensions to test
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-css',
  },

  // Files to ignore during transformation
  transformIgnorePatterns: [
    'node_modules/(?!(react-router-dom|@testing-library)/)',
  ],

  // Mock static assets
  moduleNameMapping: {
    ...module.exports.moduleNameMapping,
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/tests/__mocks__/fileMock.js',
  },

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.test.{js,jsx,ts,tsx}',
  ],

  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/tests/e2e/',
  ],

  // Coverage configuration
  collectCoverage: false, // Enable via --coverage flag
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.js',
    '!src/reportWebVitals.js',
    '!src/setupTests.js',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.test.{js,jsx,ts,tsx}',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 85,
      branches: 75,
      statements: 80,
    },
    // Component-specific thresholds
    'src/components/': {
      lines: 85,
      functions: 90,
      branches: 80,
      statements: 85,
    },
    'src/context/': {
      lines: 90,
      functions: 95,
      branches: 85,
      statements: 90,
    },
    'src/services/': {
      lines: 85,
      functions: 90,
      branches: 80,
      statements: 85,
    },
  },

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary',
  ],

  // Coverage output directory
  coverageDirectory: 'coverage',

  // Global variables
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },

  // Clear mocks automatically
  clearMocks: true,

  // Restore mocks automatically
  restoreMocks: true,

  // Verbose output for debugging
  verbose: false,

  // Timeout for tests
  testTimeout: 10000,

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Notify of test results
  notify: false,

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-reports',
        outputName: 'junit.xml',
        suiteName: 'Lion Football Academy Frontend Tests',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'test-reports',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Lion Football Academy Test Report',
      },
    ],
  ],

  // Custom test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
  },

  // Snapshot serializers
  snapshotSerializers: [
    '@emotion/jest/serializer',
  ],

  // Mock files directory
  __mocks__: '<rootDir>/tests/__mocks__',
};