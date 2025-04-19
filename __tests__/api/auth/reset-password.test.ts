import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/auth/reset-password/route';
import * as redisMock from '../../lib/redis-mock';
import { createClient } from 'redis';

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

// Mock redis createClient
jest.mock('redis', () => {
  return {
    createClient: jest.fn().mockImplementation(() => {
      return {
        connect: jest.fn().mockResolvedValue(undefined),
        ping: jest.fn().mockResolvedValue('PONG'),
        set: jest.fn().mockResolvedValue('OK'),
        quit: jest.fn().mockResolvedValue(undefined)
      };
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

describe('Reset Password API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('POST /api/auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379',
        newPassword: 'newStrongPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Password reset successfully');
      
      // Verify the Redis client was created with correct URL
      expect(createClient).toHaveBeenCalledWith(expect.objectContaining({
        url: 'redis://localhost:6379'
      }));
    });

    it('should reject when Redis URL is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        newPassword: 'newStrongPassword123'
        // redisUrl missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Redis URL and new password are required');
    });

    it('should reject when new password is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379'
        // newPassword missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Redis URL and new password are required');
    });

    it('should validate password length', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://localhost:6379',
        newPassword: 'short'  // Too short
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('New password must be at least 8 characters long');
    });

    it('should validate Redis URL format', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'invalid-url',
        newPassword: 'validPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid Redis URL format');
    });

    it('should handle Redis connection failure', async () => {
      // Setup Redis client to fail
      (createClient as jest.Mock).mockImplementationOnce(() => {
        return {
          connect: jest.fn().mockRejectedValue(new Error('Connection failed')),
          quit: jest.fn().mockResolvedValue(undefined)
        };
      });
      
      const mockJson = jest.fn().mockResolvedValue({
        redisUrl: 'redis://invalid-host:6379',
        newPassword: 'validPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Failed to connect to Redis with the provided URL');
    });

    it('should handle unexpected errors', async () => {
      const mockJson = jest.fn().mockRejectedValue(new Error('Unexpected error'));
      
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to reset password');
    });
  });
}); 