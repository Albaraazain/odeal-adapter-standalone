/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: [],
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'] }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!axios|uuid).+\\.js$',
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.jsx',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'api/**/*.js',
    '!src/server.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'clover',
    'html',
  ],
  setupFilesAfterEnv: ['./__tests__/setup.js'],
  testTimeout: 30000,
  maxWorkers: 4,
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  detectOpenHandles: true,
  errorOnDeprecated: true,
};