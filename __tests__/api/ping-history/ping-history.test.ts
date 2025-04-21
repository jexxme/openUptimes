import { NextRequest } from 'next/server';
import { DELETE, PATCH } from '../../../app/api/ping-history/route';
import * as redisMock from '../../lib/redis-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Mock the redis module
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
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

describe('Ping History API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('DELETE /api/ping-history', () => {
    it('should clear ping history successfully', async () => {
      // Set up test data
      const client = await redisMock.getRedisClient();
      await client.lPush('ping:history', JSON.stringify({ timestamp: Date.now(), executionTime: 500 }));
      
      // Verify the history exists before deletion
      const historyBefore = await client.lRange('ping:history', 0, -1);
      expect(historyBefore.length).toBe(1);
      
      // Create request
      const request = new NextRequest('http://localhost:3000/api/ping-history');
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Ping history cleared');
      
      // Verify history was actually cleared
      const historyAfter = await client.lRange('ping:history', 0, -1);
      expect(historyAfter.length).toBe(0);
    });
    
    it('should handle errors during history clearing', async () => {
      // Mock Redis client to throw an error
      const client = await redisMock.getRedisClient();
      const originalDel = client.del;
      client.del = jest.fn().mockRejectedValue(new Error('Simulated Redis error'));
      
      // Suppress console error output during test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Create request
      const request = new NextRequest('http://localhost:3000/api/ping-history');
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the error response
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to clear ping history');
      
      // Restore original function and console
      client.del = originalDel;
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
      const request = new NextRequest('http://localhost:3000/api/ping-history');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      // Verify the config was updated
      const updatedConfigStr = await client.get('config:site');
      const updatedConfig = JSON.parse(updatedConfigStr!);
      expect(updatedConfig.historyTTL).toBe(newTTL);
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
      const request = new NextRequest('http://localhost:3000/api/ping-history');
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PATCH(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('History TTL set to unlimited');
      
      // Verify the config was updated
      const updatedConfigStr = await client.get('config:site');
      const updatedConfig = JSON.parse(updatedConfigStr!);
      expect(updatedConfig.historyTTL).toBe(0);
    });
    
    it('should return 400 when TTL value is missing', async () => {
      // Mock the request with empty JSON body
      const mockJson = jest.fn().mockResolvedValue({});
      const request = new NextRequest('http://localhost:3000/api/ping-history');
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
      const request = new NextRequest('http://localhost:3000/api/ping-history');
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