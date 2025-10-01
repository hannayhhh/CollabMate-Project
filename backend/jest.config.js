/** @type {import('jest').Config} */

module.exports = {
  testEnvironment: 'node',

  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],

  // Automatically clean up and restore mocks
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  testTimeout: 10000,

  verbose: true,

  // Turn on coverage and generate reports
  collectCoverage: true,
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'models/**/*.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/data/',      
    '/tests/'       
  ],
  coverageReporters: ['text', 'lcov', 'html'],

  // Ignore front-end and build products
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/.next/',
    '<rootDir>/../frontend/'
  ],

  detectOpenHandles: true,

  // Global initialization before testing
  setupFiles: ['<rootDir>/tests/env.setup.js'],
  setupFilesAfterEnv: [
    '<rootDir>/tests/fs.setup.js', 
    '<rootDir>/tests/setup.js'
  ]
};
