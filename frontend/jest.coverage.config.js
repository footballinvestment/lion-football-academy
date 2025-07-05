module.exports = {
  // Extend base Jest configuration
  ...require('./jest.config.js'),
  
  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    // Include all source files
    'src/**/*.{js,jsx}',
    
    // Exclude test files
    '!src/**/*.test.{js,jsx}',
    '!src/**/*.spec.{js,jsx}',
    '!src/**/__tests__/**',
    
    // Exclude setup and configuration files
    '!src/index.js',
    '!src/setupTests.js',
    '!src/reportWebVitals.js',
    
    // Exclude mock files
    '!src/**/__mocks__/**',
    
    // Exclude stories and documentation
    '!src/**/*.stories.{js,jsx}',
    '!src/**/*.mdx',
    
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
  
  // Coverage thresholds - failing tests if coverage drops below these levels
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    // Specific thresholds for critical modules
    './src/components/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    './src/hooks/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    },
    
    './src/context/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    './src/utils/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    
    // PWA and performance critical files
    './src/utils/pwa.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    
    './src/utils/performanceMonitor.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Coverage path mapping
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/',
    '/coverage/',
    '\\.config\\.js$',
    '\\.stories\\.',
    '/src/test-utils/',
    '/src/mocks/'
  ],
  
  // Ensure coverage is collected even from untested files
  forceExit: true,
  detectOpenHandles: true,
  
  // Transform configuration for coverage
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.css$': 'jest-transform-css',
    '^.+\\.(png|jpg|jpeg|gif|webp|svg)$': 'jest-transform-file'
  },
  
  // Module mapping for coverage
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js'
  }
};