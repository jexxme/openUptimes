// Define auth-related functions before imports
const hashPassword = jest.fn().mockImplementation(async (password: string) => {
  return `hashed_${password}`;
});

// Add missing functions to redis-mock before any imports
const markSetupComplete = jest.fn().mockImplementation(async () => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  await client.set('setup:complete', 'true');
  return true;
});

const setAdminPassword = jest.fn().mockImplementation(async (hash: string) => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  await client.set('auth:admin-password', hash);
  return true;
});

// Mock the redis module with our functions already defined
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
    markSetupComplete,
    setAdminPassword,
  };
});

// Mock hashPassword function
jest.mock('../../../lib/auth', () => ({
  hashPassword
}));

// Mock NextResponse.json
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: jest.fn().mockImplementation((data, init) => {
        return {
          status: init?.status || 200,
          data,
          json: async () => data
        };
      })
    }
  };
});

import { NextRequest } from 'next/server';
import { POST as CompleteSetup } from '../../../app/api/setup/complete/route';
import * as redisMock from '../../lib/redis-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

describe('Setup Complete API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  it('should complete setup with valid password', async () => {
    // Create request with password
    const mockJson = jest.fn().mockResolvedValue({
      password: 'secure-admin-password'
    });
    
    const request = new NextRequest('http://localhost:3000/api/setup/complete');
    request.json = mockJson;
    
    const response = await CompleteSetup(request) as unknown as MockedResponse;
    
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Verify password was hashed and stored
    expect(hashPassword).toHaveBeenCalledWith('secure-admin-password');
    expect(setAdminPassword).toHaveBeenCalledWith('hashed_secure-admin-password');
    
    // Verify setup was marked as complete
    expect(markSetupComplete).toHaveBeenCalled();
  });

  it('should reject setup without password', async () => {
    // Create request with missing password
    const mockJson = jest.fn().mockResolvedValue({});
    
    const request = new NextRequest('http://localhost:3000/api/setup/complete');
    request.json = mockJson;
    
    const response = await CompleteSetup(request) as unknown as MockedResponse;
    
    expect(response.status).toBe(400);
    expect(response.data.error).toBe('Password is required');
    
    // Verify no side effects
    expect(hashPassword).not.toHaveBeenCalled();
    expect(setAdminPassword).not.toHaveBeenCalled();
    expect(markSetupComplete).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Create request with password
    const mockJson = jest.fn().mockResolvedValue({
      password: 'secure-admin-password'
    });
    
    // Simulate an error in the markSetupComplete function
    markSetupComplete.mockRejectedValueOnce(new Error('Test error'));
    
    const request = new NextRequest('http://localhost:3000/api/setup/complete');
    request.json = mockJson;
    
    const response = await CompleteSetup(request) as unknown as MockedResponse;
    
    expect(response.status).toBe(500);
    expect(response.data.error).toBeTruthy();
  });
}); 