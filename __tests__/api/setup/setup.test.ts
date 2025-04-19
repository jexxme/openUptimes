// Add missing functions to redis-mock before using them in the mock
const isSetupComplete = jest.fn().mockImplementation(async () => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  const value = await client.get('setup:complete');
  return value === 'true';
});

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
    isSetupComplete,
    markSetupComplete,
    setAdminPassword,
  };
});

// Mock Node.js fs module
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('mock file content'),
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock Node.js path module
jest.mock('path', () => ({
  join: jest.fn((...args) => '/mocked/path/to/config.ts'),
}));

// Mock hashPassword function
jest.mock('../../../lib/auth', () => ({
  hashPassword: jest.fn().mockImplementation(async (password: string) => {
    return `hashed_${password}`;
  }),
}));

import { NextRequest } from 'next/server';
import { GET as GetSetupStatus } from '../../../app/api/setup/status/route';
import { POST as CompleteSetup } from '../../../app/api/setup/complete/route';
import { POST as ResetSetup } from '../../../app/api/setup/reset/route';
import * as redisMock from '../../lib/redis-mock';
import * as fs from 'fs/promises';
import * as path from 'path';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

describe('Setup API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    
    // Ensure fs mocks are properly set up
    (fs.readFile as jest.Mock).mockImplementation((path, encoding) => {
      return Promise.resolve('export const config = {}; export const services = [];');
    });
    (fs.writeFile as jest.Mock).mockImplementation((path, content, encoding) => {
      return Promise.resolve();
    });
    (path.join as jest.Mock).mockImplementation((...args) => {
      return '/mocked/path/to/config.ts';
    });
  });

  describe('GET /api/setup/status', () => {
    it('should return false when setup is not complete', async () => {
      // Ensure setup is not complete
      const client = await redisMock.getRedisClient();
      await client.set('setup:complete', 'false');
      
      const response = await GetSetupStatus() as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.setupComplete).toBe(false);
      expect(isSetupComplete).toHaveBeenCalled();
    });

    it('should return true when setup is complete', async () => {
      // Mark setup as complete
      const client = await redisMock.getRedisClient();
      await client.set('setup:complete', 'true');
      
      const response = await GetSetupStatus() as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.setupComplete).toBe(true);
      expect(isSetupComplete).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock isSetupComplete to throw an error
      isSetupComplete.mockRejectedValueOnce(new Error('Test error'));
      
      const response = await GetSetupStatus() as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
    });
  });

  describe('POST /api/setup/complete', () => {
    it('should complete setup with valid password', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        password: 'adminPassword123',
        siteSettings: {
          siteName: 'Test Site'
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/setup/complete');
      request.json = mockJson;
      
      const response = await CompleteSetup(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(markSetupComplete).toHaveBeenCalled();
      expect(setAdminPassword).toHaveBeenCalledWith('hashed_adminPassword123');
      
      // Verify setup is marked as complete
      const client = await redisMock.getRedisClient();
      const setupComplete = await client.get('setup:complete');
      expect(setupComplete).toBe('true');
    });

    it('should reject setup without password', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        // No password
        siteSettings: {
          siteName: 'Test Site'
        }
      });
      
      const request = new NextRequest('http://localhost:3000/api/setup/complete');
      request.json = mockJson;
      
      const response = await CompleteSetup(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Password is required');
      expect(markSetupComplete).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        password: 'adminPassword123'
      });
      
      // Mock setAdminPassword to throw an error
      setAdminPassword.mockRejectedValueOnce(new Error('Test error'));
      
      const request = new NextRequest('http://localhost:3000/api/setup/complete');
      request.json = mockJson;
      
      const response = await CompleteSetup(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
    });
  });

  describe('POST /api/setup/reset', () => {
    it('should reset the application', async () => {
      // Set up some test data
      const client = await redisMock.getRedisClient();
      await client.set('setup:complete', 'true');
      await client.set('auth:admin-password', 'hashedpassword');
      await client.set('config:services', JSON.stringify([{ name: 'TestService', url: 'https://test.com' }]));
      
      // Create a mock implementation that clears all keys
      const mockKeys = jest.fn().mockResolvedValue([]);
      const originalKeys = client.keys;
      client.keys = mockKeys;
      
      const response = await ResetSetup() as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toContain('reset successfully');
      
      // Restore original keys function
      client.keys = originalKeys;
      
      // Verify config file was reset
      expect(fs.readFile).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock fs.readFile to throw an error
      (fs.readFile as jest.Mock).mockRejectedValueOnce(new Error('File read error'));
      
      const response = await ResetSetup() as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
    });
  });
}); 