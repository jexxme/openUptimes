import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/auth/change-password/route';
import * as redisMock from '../../lib/redis-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Mock the redis module with additional password-related functions
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
    getAdminPassword: jest.fn().mockImplementation(async () => {
      const client = await jest.requireActual('../../lib/redis-mock').getRedisClient();
      return client.get('admin:password');
    }),
    setAdminPassword: jest.fn().mockImplementation(async (hash) => {
      const client = await jest.requireActual('../../lib/redis-mock').getRedisClient();
      await client.set('admin:password', hash);
      return true;
    })
  };
});

// Mock auth functions
jest.mock('@/lib/auth', () => {
  return {
    verifyPassword: jest.fn(),
    hashPassword: jest.fn().mockResolvedValue('new_hashed_password')
  };
});

// Import mocked functions AFTER mocking
import { verifyPassword, hashPassword } from '@/lib/auth';
import { getAdminPassword, setAdminPassword } from '@/lib/redis';

describe('Change Password API Endpoint', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    
    // Setup a password hash for tests
    const client = await redisMock.getRedisClient();
    await client.set('admin:password', 'current_hashed_password');
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully with valid inputs', async () => {
      // Setup password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValue(true);
      
      const mockJson = jest.fn().mockResolvedValue({
        currentPassword: 'currentPassword',
        newPassword: 'newStrongPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.message).toBe('Password changed successfully');
      
      // Verify correct functions were called
      expect(getAdminPassword).toHaveBeenCalled();
      expect(verifyPassword).toHaveBeenCalledWith('currentPassword', 'current_hashed_password');
      expect(hashPassword).toHaveBeenCalledWith('newStrongPassword123');
      expect(setAdminPassword).toHaveBeenCalledWith('new_hashed_password');
    });

    it('should reject when current password is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        newPassword: 'newStrongPassword123'
        // currentPassword missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Current password and new password are required');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject when new password is missing', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        currentPassword: 'currentPassword'
        // newPassword missing
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Current password and new password are required');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should validate new password length', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        currentPassword: 'currentPassword',
        newPassword: 'short'  // Too short
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('New password must be at least 8 characters long');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject when admin password is not set', async () => {
      // Empty the admin password
      (getAdminPassword as jest.Mock).mockResolvedValueOnce(null);
      
      const mockJson = jest.fn().mockResolvedValue({
        currentPassword: 'currentPassword',
        newPassword: 'newStrongPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('No admin password has been set. Please complete setup first.');
      expect(verifyPassword).not.toHaveBeenCalled();
    });

    it('should reject when current password is incorrect', async () => {
      // Setup password verification to fail
      (verifyPassword as jest.Mock).mockResolvedValueOnce(false);
      
      const mockJson = jest.fn().mockResolvedValue({
        currentPassword: 'wrongPassword',
        newPassword: 'newStrongPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Current password is incorrect');
      expect(hashPassword).not.toHaveBeenCalled();
      expect(setAdminPassword).not.toHaveBeenCalled();
    });

    it('should handle password update failure', async () => {
      // Setup password verification to succeed
      (verifyPassword as jest.Mock).mockResolvedValueOnce(true);
      // But password update fails
      (setAdminPassword as jest.Mock).mockResolvedValueOnce(false);
      
      const mockJson = jest.fn().mockResolvedValue({
        currentPassword: 'currentPassword',
        newPassword: 'newStrongPassword123'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to update password');
    });

    it('should handle unexpected errors', async () => {
      const mockJson = jest.fn().mockRejectedValue(new Error('Unexpected error'));
      
      const request = new NextRequest('http://localhost:3000/api/auth/change-password');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBe('Failed to change password');
    });
  });
}); 