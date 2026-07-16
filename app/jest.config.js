/**
 * Jest config for the pure deterministic core (engines, schemas, content).
 * These tests deliberately avoid React Native so they run in plain Node with a
 * minimal toolchain (ts-jest), which is what verifies the "no-AI" logic.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
};
