import { config } from '../lib/config';

// Set a default test timeout
jest.setTimeout(10000);

// Make sure we don't accidentally hit real APIs
global.fetch = jest.fn(() => 
  Promise.resolve({
    status: 200,
    json: () => Promise.resolve({}),
  } as Response)
) as jest.Mock;

// Mock environment variables
process.env.REDIS_URL = 'redis://mock-redis:6379';

// Mock Next.js request/response
jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: jest.fn((data, options = {}) => {
        // Return a simple object that has both the response characteristics
        // and the actual data for testing
        return {
          status: options.status || 200,
          headers: options.headers || {},
          data, // The actual response data for tests to access
          json: () => Promise.resolve(data),
        };
      }),
    },
    NextRequest: jest.fn().mockImplementation((url) => ({
      url,
      method: 'GET',
      json: jest.fn().mockResolvedValue({}),
      cookies: { get: jest.fn() },
      headers: { get: jest.fn() },
      searchParams: new URLSearchParams(new URL(url).search),
    })),
  };
});

// Mock console methods to suppress output during tests
// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

// Silence console output during tests
beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
});

// Restore console methods after tests
afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.info = originalConsoleInfo;
}); 