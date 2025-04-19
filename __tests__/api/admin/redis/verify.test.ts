import { NextRequest } from 'next/server';
import { POST } from '../../../../app/api/admin/redis/verify/route';
import * as redisMock from '../../../lib/redis-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Mock the verifyPassword function from auth lib
jest.mock('@/lib/auth', () => {
  return {
    verifyPassword: jest.fn()
  };
});

// Import mocked functions AFTER mocking
import { verifyPassword } from '@/lib/auth';

// Store original environment
const originalEnv = { ...process.env };

describe('Redis Verify API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    
    // Reset environment between tests
    process.env = { ...originalEnv };
    // Set a test Redis URL
    process.env.REDIS_URL = 'redis://redis-test:6379';
  });

  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('POST /api/admin/redis/verify', () => {
    it('should return Redis URL when password is correct', async () => {
      // Setup password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValueOnce(true);
      
      const mockJson = jest.fn().mockResolvedValue({
        password: 'correctPassword'
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/redis/verify');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Password verified successfully');
      expect(response.data.redisUrl).toBe('redis://redis-test:6379');
      expect(verifyPassword).toHaveBeenCalledWith('correctPassword');
    });

    it('should reject when password is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        // password missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/redis/verify');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBe('Password is required');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject when password is incorrect', async () => {
      // Setup password verification to fail
      (verifyPassword as jest.Mock).mockResolvedValueOnce(false);
      
      const mockJson = jest.fn().mockResolvedValue({
        password: 'wrongPassword'
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/redis/verify');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.message).toBe('Password verification failed');
      expect(verifyPassword).toHaveBeenCalledWith('wrongPassword');
    });

    it('should handle missing Redis URL in environment', async () => {
      // Remove Redis URL from environment
      delete process.env.REDIS_URL;
      
      // Setup password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValueOnce(true);
      
      const mockJson = jest.fn().mockResolvedValue({
        password: 'correctPassword'
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/redis/verify');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.message).toBe('Redis URL not configured in environment');
    });

    it('should handle unexpected errors', async () => {
      const mockJson = jest.fn().mockRejectedValue(new Error('Unexpected error'));
      
      const request = new NextRequest('http://localhost:3000/api/admin/redis/verify');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.message).toBe('Failed to verify password');
    });
  });
}); 