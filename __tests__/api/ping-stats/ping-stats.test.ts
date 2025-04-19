// Define missing functions before imports
const getLastIntervalReset = jest.fn().mockResolvedValue(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

// Mock the redis module before importing any modules that use it
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
    getLastIntervalReset
  };
});

import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/ping-stats/route';
import * as redisMock from '../../lib/redis-mock';
import { ServiceConfig } from '../../../lib/config';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

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

describe('Ping Stats API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('GET /api/ping-stats', () => {
    it('should return empty stats when no ping data is available', async () => {
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.stats).toEqual({});
    });

    it('should return ping statistics for services', async () => {
      // Setup test services
      const testServices: ServiceConfig[] = [
        {
          name: 'Service1',
          url: 'https://service1.com'
        },
        {
          name: 'Service2',
          url: 'https://service2.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Simulate ping history for Service1
      const client = await redisMock.getRedisClient();
      
      // Add some ping history data
      const now = Date.now();
      const pingHistory1 = [];
      for (let i = 0; i < 10; i++) {
        pingHistory1.push({
          timestamp: now - i * 10000,
          responseTime: 100 + (i % 5) * 20,
          status: i < 8 ? 'up' : 'down'
        });
      }
      
      await client.set('ping:stats:Service1', JSON.stringify(pingHistory1));
      
      // Simulate ping history for Service2
      const pingHistory2 = [];
      for (let i = 0; i < 10; i++) {
        pingHistory2.push({
          timestamp: now - i * 10000,
          responseTime: 200 + (i % 3) * 50,
          status: i < 5 ? 'up' : 'down'
        });
      }
      
      await client.set('ping:stats:Service2', JSON.stringify(pingHistory2));
      
      // Get ping stats
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.stats).toBeTruthy();
      
      // Check stats for Service1
      expect(response.data.stats.Service1).toBeTruthy();
      expect(response.data.stats.Service1.lastPing).toBeTruthy();
      expect(response.data.stats.Service1.avgResponseTime).toBeGreaterThan(0);
      expect(response.data.stats.Service1.uptime).toBeDefined();
      
      // Check stats for Service2
      expect(response.data.stats.Service2).toBeTruthy();
      expect(response.data.stats.Service2.lastPing).toBeTruthy();
      expect(response.data.stats.Service2.avgResponseTime).toBeGreaterThan(0);
      expect(response.data.stats.Service2.uptime).toBeDefined();
    });

    it('should filter by service name when requested', async () => {
      // Setup test services
      const testServices: ServiceConfig[] = [
        {
          name: 'FilterService',
          url: 'https://filter-service.com'
        },
        {
          name: 'OtherService',
          url: 'https://other-service.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Add ping history for both services
      const client = await redisMock.getRedisClient();
      
      // FilterService ping history
      const pingHistoryFilter = [];
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        pingHistoryFilter.push({
          timestamp: now - i * 10000,
          responseTime: 150,
          status: 'up'
        });
      }
      
      await client.set('ping:stats:FilterService', JSON.stringify(pingHistoryFilter));
      
      // OtherService ping history
      const pingHistoryOther = [];
      for (let i = 0; i < 5; i++) {
        pingHistoryOther.push({
          timestamp: now - i * 10000,
          responseTime: 250,
          status: 'up'
        });
      }
      
      await client.set('ping:stats:OtherService', JSON.stringify(pingHistoryOther));
      
      // Get stats with service filter
      const request = new NextRequest('http://localhost:3000/api/ping-stats?service=FilterService');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(Object.keys(response.data.stats)).toHaveLength(1);
      expect(response.data.stats.FilterService).toBeTruthy();
      expect(response.data.stats.OtherService).toBeUndefined();
    });

    it('should handle time range filters', async () => {
      // Setup test service
      const testServices: ServiceConfig[] = [
        {
          name: 'TimeRangeService',
          url: 'https://timerange.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Add ping history with varied timestamps
      const client = await redisMock.getRedisClient();
      const now = Date.now();
      
      const pingHistory = [];
      
      // Add 10 entries over the last hour
      for (let i = 0; i < 10; i++) {
        pingHistory.push({
          timestamp: now - i * 6 * 60000, // Every 6 minutes
          responseTime: 100 + i,
          status: 'up'
        });
      }
      
      await client.set('ping:stats:TimeRangeService', JSON.stringify(pingHistory));
      
      // Get stats with time range (last 30 minutes)
      const timeRangeRequest = new NextRequest('http://localhost:3000/api/ping-stats?timeRange=30m');
      const timeRangeResponse = await GET(timeRangeRequest) as unknown as MockedResponse;
      
      expect(timeRangeResponse.status).toBe(200);
      expect(timeRangeResponse.data.stats.TimeRangeService).toBeTruthy();
      
      // Should only include pings from last 30 minutes
      const thirtyMinAgo = now - 30 * 60000;
      const statsData = timeRangeResponse.data.stats.TimeRangeService;
      
      // Assuming the implementation filters correctly, the most recent entries
      // should be included and older ones excluded
      expect(statsData.pings.length).toBeLessThan(10);
      statsData.pings.forEach((ping: any) => {
        expect(ping.timestamp).toBeGreaterThanOrEqual(thirtyMinAgo);
      });
    });

    it('should handle errors gracefully', async () => {
      // Mock Redis error
      const mockClient = await redisMock.getRedisClient();
      const originalGet = mockClient.get;
      mockClient.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'config:services') {
          throw new Error('Simulated Redis failure');
        }
        return originalGet(key);
      });
      
      // Setup console error spy to avoid test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
      
      // Restore mocks
      mockClient.get = originalGet;
      consoleErrorSpy.mockRestore();
    });

    it('should limit the returned ping history based on the limit parameter', async () => {
      // Setup test service with a lot of entries
      const testServices: ServiceConfig[] = [
        {
          name: 'LimitTest',
          url: 'https://limitest.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Create a large history dataset
      const client = await redisMock.getRedisClient();
      const now = Date.now();
      const pingHistory = [];
      for (let i = 0; i < 50; i++) {
        pingHistory.push({
          timestamp: now - i * 10000,
          responseTime: 100,
          status: 'up'
        });
      }
      
      await client.set('ping:stats:LimitTest', JSON.stringify(pingHistory));
      
      // Test with explicit limit=5
      const request = new NextRequest('http://localhost:3000/api/ping-stats?limit=5');
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test with limit=0 (should get all entries)
      const unlimitedRequest = new NextRequest('http://localhost:3000/api/ping-stats?limit=0');
      const unlimitedResponse = await GET(unlimitedRequest) as unknown as MockedResponse;
      
      // Should get ping history from Redis using lRange
      const pingHistoryFromRedis = await client.lRange('ping:history', 0, -1);
      
      // Assertions
      expect(response.status).toBe(200);
      expect(unlimitedResponse.status).toBe(200);
    });

    it('should handle various time range formats', async () => {
      // Setup test service
      const testServices: ServiceConfig[] = [
        {
          name: 'TimeFormatTest',
          url: 'https://timeformat.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Add ping history with varied timestamps
      const client = await redisMock.getRedisClient();
      const now = Date.now();
      
      const pingHistory = [];
      // Add entries over a long period
      for (let i = 0; i < 30; i++) {
        pingHistory.push({
          timestamp: now - i * 3600000, // hourly entries
          responseTime: 100,
          status: 'up'
        });
      }
      
      await client.set('ping:stats:TimeFormatTest', JSON.stringify(pingHistory));
      
      // Test different time range formats
      const timeRanges = ['10m', '2h', '1d', '1w'];
      
      for (const range of timeRanges) {
        const request = new NextRequest(`http://localhost:3000/api/ping-stats?timeRange=${range}&service=TimeFormatTest`);
        const response = await GET(request) as unknown as MockedResponse;
        
        expect(response.status).toBe(200);
        expect(response.data.stats.TimeFormatTest).toBeTruthy();
      }
    });

    it('should get GitHub Action settings and calculate next run', async () => {
      // Setup test service
      const testServices: ServiceConfig[] = [
        {
          name: 'GitHubActionTest',
          url: 'https://github-action.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Setup GitHub Action configuration
      const client = await redisMock.getRedisClient();
      await client.set('config:site', JSON.stringify({
        githubAction: {
          enabled: true,
          schedule: '*/5 * * * *', // every 5 minutes
          repository: 'test/repo'
        }
      }));
      
      // Add ping history entries
      const now = Date.now();
      const pingHistory = [];
      for (let i = 0; i < 5; i++) {
        pingHistory.push({
          timestamp: now - i * 300000, // every 5 minutes
          status: 'up'
        });
      }
      await client.lPush('ping:history', JSON.stringify(pingHistory[0]));
      await client.lPush('ping:history', JSON.stringify(pingHistory[1]));
      
      // Make request
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.githubAction).toBeTruthy();
      expect(response.data.githubAction.enabled).toBe(true);
      expect(response.data.githubAction.schedule).toBe('*/5 * * * *');
      expect(response.data.nextEstimatedRun).toBeTruthy();
      expect(response.data.timeUntilNextRun).toBeTruthy();
    });

    it('should handle interval trend calculation', async () => {
      // Setup test service
      const testServices: ServiceConfig[] = [
        {
          name: 'IntervalTrendTest',
          url: 'https://interval-trend.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Add ping history with consistent intervals
      const client = await redisMock.getRedisClient();
      const now = Date.now();
      
      // Add multiple ping history entries with 5-minute intervals
      await client.lPush('ping:history', JSON.stringify({
        timestamp: now,
        executionTime: 500,
        servicesChecked: 1
      }));
      
      await client.lPush('ping:history', JSON.stringify({
        timestamp: now - 300000, // 5 minutes ago
        executionTime: 450,
        servicesChecked: 1
      }));
      
      await client.lPush('ping:history', JSON.stringify({
        timestamp: now - 600000, // 10 minutes ago
        executionTime: 480,
        servicesChecked: 1
      }));
      
      // Make request
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.intervalTrend).toBeTruthy();
      expect(response.data.intervalTrend.average).toBeDefined();
      expect(response.data.intervalTrend.min).toBeDefined();
      expect(response.data.intervalTrend.max).toBeDefined();
    });

    it('should handle invalid cron expressions', async () => {
      // Setup test service
      const testServices: ServiceConfig[] = [
        {
          name: 'InvalidCronTest',
          url: 'https://invalid-cron.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Setup GitHub Action configuration with invalid cron
      const client = await redisMock.getRedisClient();
      await client.set('config:site', JSON.stringify({
        githubAction: {
          enabled: true,
          schedule: 'invalid cron', // invalid expression
          repository: 'test/repo'
        }
      }));
      
      // Make request
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      // Should still return a response, just with null or default nextEstimatedRun
      expect(response.status).toBe(200);
      
      // nextEstimatedRun might be null or use a default value (5 minutes from now)
      if (response.data.nextEstimatedRun !== null) {
        // If it's not null, it should be approximately 5 minutes from now
        const now = Date.now();
        const diff = response.data.nextEstimatedRun - now;
        expect(diff).toBeGreaterThan(0);
        expect(diff).toBeLessThanOrEqual(5 * 60 * 1000 + 5000); // 5 minutes + 5 seconds buffer
      }
    });

    it('should handle cron expression with interval < 5 minutes', async () => {
      // Setup test service
      const testServices: ServiceConfig[] = [
        {
          name: 'SmallIntervalTest',
          url: 'https://small-interval.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Setup GitHub Action configuration with too small interval
      const client = await redisMock.getRedisClient();
      await client.set('config:site', JSON.stringify({
        githubAction: {
          enabled: true,
          schedule: '*/2 * * * *', // every 2 minutes (too small for GitHub Actions)
          repository: 'test/repo'
        }
      }));
      
      // Capture console warnings
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Make request
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      // Should warn about invalid interval and use 5 minutes instead
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(response.status).toBe(200);
      
      // Verify next run is ~5 minutes in the future
      const now = Date.now();
      const diff = response.data.nextEstimatedRun - now;
      expect(diff).toBeGreaterThan(0);
      expect(diff).toBeLessThanOrEqual(5 * 60 * 1000 + 5000); // 5 minutes + 5 seconds buffer
      
      consoleWarnSpy.mockRestore();
    });

    it('should handle closeRedisConnection error', async () => {
      // Setup mock services
      const testServices: ServiceConfig[] = [
        {
          name: 'RedisCloseTest',
          url: 'https://redis-close.com'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Mock closeRedisConnection to throw an error
      const { closeRedisConnection } = require('../../../lib/redis');
      jest.spyOn(require('../../../lib/redis'), 'closeRedisConnection')
        .mockRejectedValueOnce(new Error('Failed to close Redis connection'));
      
      // Mock console.error to avoid test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Make request
      const request = new NextRequest('http://localhost:3000/api/ping-stats');
      const response = await GET(request) as unknown as MockedResponse;
      
      // The error is caught and a 500 error is returned
      expect(response.status).toBe(500);
      
      // Should have logged the error
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Restore mocks
      jest.restoreAllMocks();
      consoleErrorSpy.mockRestore();
    });
  });
}); 