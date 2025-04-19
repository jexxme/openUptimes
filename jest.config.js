module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: './tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: true,
  collectCoverageFrom: [
    'app/api/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000,
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/app/api/admin/password/reset/route.ts',
    '/app/api/admin/redis/verify/route.ts',
    '/app/api/auth/change-password/route.ts',
    '/app/api/auth/reset-password/route.ts',
    '/app/api/init/route.ts',
    '/app/api/status/route.ts',
    '/app/api/uptime/route.ts',
    '/app/api/settings/route.ts',
    '/app/api/settings/appearance/route.ts',
    '/app/api/settings/general/route.ts',
    '/app/api/settings/github/route.ts',
    '/app/api/settings/statuspage/route.ts',
    '/app/api/utils/fetch-title/route.ts'
  ]
} 