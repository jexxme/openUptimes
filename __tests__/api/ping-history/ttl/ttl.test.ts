import { NextRequest } from 'next/server';
import { GET, PATCH } from '../../../../app/api/ping-history/ttl/route';
import * as redisMock from '../../../lib/redis-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Mock the redis module
jest.mock('../../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../../lib/redis-mock'),
  };
});

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
          json: async () => data,
          headers: init?.headers || {}
        };
      })
    }
  };
});

describe('Ping History TTL API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('GET /api/ping-history/ttl', () => {
    it('should return default TTL when no config exists', async () => {
      // Create request
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      
      // Call the endpoint - GET function doesn't require parameters
      const response = await GET() as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.ttl).toBe(24 * 60 * 60); // 24 hours default
      expect(response.data.unlimited).toBe(false);
    });
    
    it('should return TTL from existing config', async () => {
      // Set up test data
      const client = await redisMock.getRedisClient();
      const config = {
        historyTTL: 7 * 24 * 60 * 60, // 7 days
        refreshInterval: 60000,
        historyLength: 1440
      };
      await client.set('config:site', JSON.stringify(config));
      
      // Create request - not used but kept for clarity
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      
      // Call the endpoint - GET function doesn't require parameters
      const response = await GET() as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.ttl).toBe(7 * 24 * 60 * 60); // 7 days
      expect(response.data.unlimited).toBe(false);
    });
    
    it('should identify unlimited TTL correctly', async () => {
      // Set up test data
      const client = await redisMock.getRedisClient();
      const config = {
        historyTTL: 0, // Unlimited
        refreshInterval: 60000,
        historyLength: 1440
      };
      await client.set('config:site', JSON.stringify(config));
      
      // Create request - not used but kept for clarity
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      
      // Call the endpoint - GET function doesn't require parameters
      const response = await GET() as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.ttl).toBe(0);
      expect(response.data.unlimited).toBe(true);
    });
    
    it('should handle errors during TTL retrieval', async () => {
      // Mock Redis client to throw an error
      const client = await redisMock.getRedisClient();
      const originalGet = client.get;
      client.get = jest.fn().mockRejectedValue(new Error('Simulated Redis error'));
      
      // Suppress console error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create request - not used but kept for clarity
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      
      // Call the endpoint - GET function doesn't require parameters
      const response = await GET() as unknown as MockedResponse;
      
      // Test the error response
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to get history TTL');
      
      // Restore original function and console
      client.get = originalGet;
      consoleSpy.mockRestore();
    });
  });

  describe('PATCH /api/ping-history/ttl', () => {
    it('should update TTL setting successfully', async () => {
      // Set up initial config
      const client = await redisMock.getRedisClient();
      const initialConfig = {
        refreshInterval: 60000,
        historyLength: 1440,
        historyTTL: 24 * 60 * 60 // 24 hours
      };
      await client.set('config:site', JSON.stringify(initialConfig));
      
      // New TTL value (7 days)
      const newTTL = 7 * 24 * 60 * 60;
      
      // Mock the request with JSON body
      const mockJson = jest.fn().mockResolvedValue({ ttl: newTTL });
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.ttl).toBe(newTTL);
      expect(response.data.unlimited).toBe(false);
      
      // Verify the config was updated
      const updatedConfigStr = await client.get('config:site');
      const updatedConfig = JSON.parse(updatedConfigStr!);
      expect(updatedConfig.historyTTL).toBe(newTTL);
    });
    
    it('should create config if none exists', async () => {
      // New TTL value (3 days)
      const newTTL = 3 * 24 * 60 * 60;
      
      // Mock the request with JSON body
      const mockJson = jest.fn().mockResolvedValue({ ttl: newTTL });
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.ttl).toBe(newTTL);
      
      // Verify a new config was created
      const client = await redisMock.getRedisClient();
      const configStr = await client.get('config:site');
      expect(configStr).not.toBeNull();
      
      const config = JSON.parse(configStr!);
      expect(config.historyTTL).toBe(newTTL);
      expect(config.refreshInterval).toBe(60000); // Default value
      expect(config.historyLength).toBe(1440); // Default value
    });
    
    it('should set TTL to unlimited when value is 0', async () => {
      // Set up initial config
      const client = await redisMock.getRedisClient();
      const initialConfig = {
        refreshInterval: 60000,
        historyLength: 1440,
        historyTTL: 24 * 60 * 60 // 24 hours
      };
      await client.set('config:site', JSON.stringify(initialConfig));
      
      // Unlimited TTL
      const unlimitedTTL = 0;
      
      // Mock the request with JSON body
      const mockJson = jest.fn().mockResolvedValue({ ttl: unlimitedTTL });
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.ttl).toBe(0);
      expect(response.data.unlimited).toBe(true);
      expect(response.data.message).toBe('History TTL set to unlimited');
      
      // Verify the config was updated
      const updatedConfigStr = await client.get('config:site');
      const updatedConfig = JSON.parse(updatedConfigStr!);
      expect(updatedConfig.historyTTL).toBe(0);
    });
    
    it('should return 400 when TTL value is missing', async () => {
      // Mock the request with empty JSON body
      const mockJson = jest.fn().mockResolvedValue({});
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('TTL value is required');
    });
    
    it('should handle errors during config update', async () => {
      // Mock Redis client to throw an error
      const client = await redisMock.getRedisClient();
      const originalSet = client.set;
      client.set = jest.fn().mockRejectedValue(new Error('Simulated Redis error'));
      
      // Suppress console error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock the request with JSON body
      const mockJson = jest.fn().mockResolvedValue({ ttl: 3600 });
      const request = new NextRequest('http://localhost:3000/api/ping-history/ttl');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the error response
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to update history TTL');
      
      // Restore original function and console
      client.set = originalSet;
      consoleSpy.mockRestore();
    });
  });
}); 