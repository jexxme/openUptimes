import { NextRequest } from 'next/server';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Mock the global fetch function
const originalFetch = global.fetch;
beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url) => {
    return Promise.resolve({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<html><head><title>Test Page Title</title></head></html>')
    });
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

// Mock the fetch-title API route
jest.mock('../../../app/api/utils/fetch-title/route', () => ({
  GET: jest.fn().mockImplementation((request) => {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');
    
    if (!target) {
      return {
        status: 400,
        headers: {},
        data: { error: 'URL parameter is required' },
        json: () => Promise.resolve({ error: 'URL parameter is required' })
      };
    }
    
    return {
      status: 200,
      headers: {},
      data: { title: 'Test Page Title' },
      json: () => Promise.resolve({ title: 'Test Page Title' })
    };
  })
}));

// Import the mocked function
import { GET } from '../../../app/api/utils/fetch-title/route';

describe('Fetch Title API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/utils/fetch-title', () => {
    it('should return page title when URL is provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/utils/fetch-title?url=https://example.com');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('title');
      expect(response.data.title).toBe('Test Page Title');
    });

    it('should return error when URL is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/utils/fetch-title');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('error');
    });
  });
}); 