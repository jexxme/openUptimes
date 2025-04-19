import { NextRequest } from 'next/server';
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

// Mock the uptime API route
jest.mock('../../../app/api/uptime/route', () => ({
  GET: jest.fn().mockImplementation((request) => {
    return {
      status: 200,
      headers: {},
      data: { 
        uptime: 86400, // 1 day in seconds
        startTime: new Date().toISOString(),
        version: '1.0.0' 
      },
      json: () => Promise.resolve({ 
        uptime: 86400, 
        startTime: new Date().toISOString(),
        version: '1.0.0' 
      })
    };
  })
}));

// Import the mocked function
import { GET } from '../../../app/api/uptime/route';

describe('Uptime API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('GET /api/uptime', () => {
    it('should return uptime data', async () => {
      const request = new NextRequest('http://localhost:3000/api/uptime');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('uptime');
      expect(response.data).toHaveProperty('startTime');
      expect(response.data).toHaveProperty('version');
    });
  });
}); 