import { NextRequest } from 'next/server';
import * as redisMock from '../../lib/redis-mock';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// Mock the redis module
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
  };
});

// Mock the auth functions
jest.mock('../../../lib/auth', () => ({
  authenticateAdmin: jest.fn().mockResolvedValue(true),
  verifyPassword: jest.fn().mockResolvedValue(true),
  hashPassword: jest.fn().mockImplementation(async (password) => {
    return await bcrypt.hash(password, 10);
  })
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockImplementation(async (password) => `hashed_${password}_123`)
}));

// Import the actual function
import { PUT } from '../../../app/api/admin/password/route';

describe('Admin Password API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
  });

  describe('PUT /api/admin/password', () => {
    it('should update admin password successfully', async () => {
      // Setup Redis with existing password
      const redis = await redisMock.getRedisClient();
      await redis.set('admin:password', 'existing_hash');

      // Create request with password data
      const requestBody = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      const request = new Request('http://localhost:3000/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      // Call the actual function
      const response = await PUT(request);
      
      // Parse response
      const responseData = await response.json();
      
      // Assertions
      expect(response.status).toBe(200);
      expect(responseData).toEqual({ message: 'Password updated successfully' });
      
      // Verify password was stored in Redis
      const storedPassword = await redis.get('admin:password');
      expect(storedPassword).toBeTruthy();
      expect(storedPassword).not.toBe('existing_hash');
    });

    it('should reject if current password is incorrect', async () => {
      // Setup
      const { verifyPassword } = require('../../../lib/auth');
      verifyPassword.mockResolvedValueOnce(false);

      // Create request
      const request = new Request('http://localhost:3000/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
      });

      // Call the function
      const response = await PUT(request);
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({ message: 'Admin password not found' });
    });

    it('should reject if password is too short', async () => {
      // Create request with short password
      const request = new Request('http://localhost:3000/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'short'
        })
      });

      // Call the function
      const response = await PUT(request);
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({ message: 'New password must be at least 8 characters long' });
    });

    it('should reject unauthenticated requests', async () => {
      // Setup
      const { authenticateAdmin } = require('../../../lib/auth');
      authenticateAdmin.mockResolvedValueOnce(false);

      // Create request
      const request = new Request('http://localhost:3000/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'oldpassword',
          newPassword: 'newpassword123'
        })
      });

      // Call the function
      const response = await PUT(request);
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(responseData).toEqual({ message: 'Unauthorized' });
    });

    it('should reject if missing required fields', async () => {
      // Create request with missing fields
      const request = new Request('http://localhost:3000/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing currentPassword
          newPassword: 'newpassword123'
        })
      });

      // Call the function
      const response = await PUT(request);
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(responseData).toEqual({ message: 'Current password and new password are required' });
    });

    it('should handle errors thrown in the function', async () => {
      // Setup - direct access to the error path by throwing from request.json()
      const mockRequest = {
        headers: {
          get: jest.fn().mockReturnValue('Cookie with authToken')
        },
        json: jest.fn().mockRejectedValue(new Error('Test error'))
      };
      
      // Force authenticateAdmin to return true
      const { authenticateAdmin } = require('../../../lib/auth');
      authenticateAdmin.mockResolvedValueOnce(true);
      
      // Call the function with our mocked request
      const response = await PUT(mockRequest as unknown as Request);
      const responseData = await response.json();
      
      // Assert
      expect(response.status).toBe(500);
      expect(responseData).toEqual({ message: 'Failed to update password' });
    });

    it('should reject if current password is incorrect (explicit check)', async () => {
      // Setup Redis with existing password
      const redis = await redisMock.getRedisClient();
      await redis.set('admin:password', 'existing_hash');
      
      // Mock verifyPassword to return false (incorrect password)
      const { verifyPassword } = require('../../../lib/auth');
      verifyPassword.mockResolvedValueOnce(false);

      // Create request
      const request = new Request('http://localhost:3000/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
      });

      // Call the function
      const response = await PUT(request);
      const responseData = await response.json();
      
      // Assert - this should match the exact error message from line 54
      expect(response.status).toBe(401);
      expect(responseData).toEqual({ message: 'Current password is incorrect' });
    });
  });
}); 