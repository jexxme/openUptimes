import { NextRequest } from 'next/server';
import { POST } from '../../../../app/api/admin/password/reset/route';
import * as redisMock from '../../../lib/redis-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Store original environment
const originalEnv = { ...process.env };

// Mock the redis module with mocked getRedisClient
jest.mock('@/lib/redis', () => {
  return {
    getRedisClient: jest.fn().mockImplementation(async () => {
      return await redisMock.getRedisClient();
    })
  };
});

// Mock bcryptjs for password hashing
jest.mock('@/lib/auth', () => {
  return {
    hashPassword: jest.fn().mockResolvedValue('hashed_password_123')
  };
});

// Import mocked functions AFTER mocking
import { hashPassword } from '@/lib/auth';
import { getRedisClient } from '@/lib/redis';

describe('Admin Password Reset API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    
    // Reset environment between tests
    process.env = { ...originalEnv };
    // Set a test Redis URL that will match the one in the request
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  // Restore original environment after all tests
  afterAll(() => {
    process.env = originalEnv;
  });

  describe('POST /api/admin/password/reset', () => {
    it('should reset password successfully', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379', // This matches the one set in process.env
        newPassword: 'newStrongPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.message).toBe('Password reset successfully');
      
      // Verify the Redis client was created and the password was set
      expect(hashPassword).toHaveBeenCalledWith('newStrongPassword123');
      expect(getRedisClient).toHaveBeenCalled();
    });

    it('should reject when Redis URL is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        newPassword: 'newStrongPassword123'
        // redisUrl missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBe('Redis URL is required');
    });

    it('should reject when new password is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379'
        // newPassword missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBe('New password is required');
    });

    it('should validate password length', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379',
        newPassword: 'short'  // Too short
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.message).toBe('New password must be at least 8 characters long');
    });

    it('should reject when Redis URL does not match environment', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://different-host:6379', // Different from process.env.REDIS_URL
        newPassword: 'validPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.message).toBe('Redis URL verification failed');
    });

    it('should handle missing environment Redis URL', async () => {
      // Remove Redis URL from environment
      delete process.env.REDIS_URL;
      
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379',
        newPassword: 'validPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.message).toBe('Environment Redis URL is not configured');
    });

    it('should handle unexpected errors', async () => {
      const mockJson = jest.fn().mockRejectedValue(new Error('Unexpected error'));
      
      const request = new NextRequest('http://localhost:3000/api/admin/password/reset');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.message).toBe('Failed to reset password');
    });
  });
}); 