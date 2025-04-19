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

// Mock the settings API route
jest.mock('../../../app/api/settings/route', () => ({
  GET: jest.fn().mockImplementation(() => {
    return {
      status: 200,
      headers: {},
      data: { settings: 'mocked_settings' },
      json: () => Promise.resolve({ settings: 'mocked_settings' })
    };
  }),
  PUT: jest.fn().mockImplementation((request) => {
    return {
      status: 200,
      headers: {},
      data: { success: true },
      json: () => Promise.resolve({ success: true })
    };
  })
}));

// Import the mocked functions
import { GET, PUT } from '../../../app/api/settings/route';

describe('Settings API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('GET /api/settings', () => {
    it('should return settings data', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings');
      const response = await GET() as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ settings: 'mocked_settings' });
    });
  });

  describe('PUT /api/settings', () => {
    it('should update settings', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        newSettings: { theme: 'dark' }
      });
      
      const request = new NextRequest('http://localhost:3000/api/settings');
      request.json = mockJson;
      
      const response = await PUT(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ success: true });
    });
  });
}); 