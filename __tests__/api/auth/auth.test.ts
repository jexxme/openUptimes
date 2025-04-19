// Define auth-related functions before imports
const verifyPassword = jest.fn().mockImplementation(async (password: string) => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  const storedHash = await client.get('auth:admin-password');
  
  // For testing, we use a simple hashing scheme
  return storedHash === `hashed_${password}`;
});

// Mock token generation for predictable tests
const generateSessionToken = jest.fn().mockReturnValue('test-session-token');

// Mock authenticate function
const authenticate = jest.fn().mockImplementation(async (credentials: any) => {
  if (credentials.password === 'correct-password') {
    return {
      success: true,
      token: generateSessionToken()
    };
  }
  return { 
    success: false,
    error: 'Invalid credentials'
  };
});

// Add missing functions to redis-mock before any imports
const storeSession = jest.fn().mockImplementation(async (token: string) => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  await client.set(`session:${token}`, 'active');
  await client.set(`session:${token}:created`, Date.now().toString());
  return true;
});

const deleteSession = jest.fn().mockImplementation(async (token: string) => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  await client.del(`session:${token}`);
  await client.del(`session:${token}:created`);
  return true;
});

const isSessionValid = jest.fn().mockImplementation(async (token: string) => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  const session = await client.get(`session:${token}`);
  return session === 'active';
});

const getAdminPassword = jest.fn().mockImplementation(async () => {
  const client = await require('../../lib/redis-mock').getRedisClient();
  return client.get('auth:admin-password');
});

// Now mock the redis module first so we can reference functions properly later
jest.mock('../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../lib/redis-mock'),
    storeSession,
    deleteSession,
    isSessionValid,
    getAdminPassword
  };
});

// Now mock the auth module
jest.mock('../../../lib/auth', () => {
  return {
    verifyPassword,
    authenticate,
    generateSessionToken
  };
});

// Mock the cookie parsing function
jest.mock('../../../lib/edge-auth', () => ({
  parseTokenFromCookie: jest.fn()
}));

// Mock NextResponse.json
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    NextResponse: {
      ...actual.NextResponse,
      json: jest.fn().mockImplementation((data, init = {}) => {
        const mockCookies = {
          set: jest.fn()
        };
        
        return {
          status: init.status || 200,
          data,
          json: async () => data,
          cookies: mockCookies,
          headers: {
            append: jest.fn(),
            get: jest.fn(),
            set: jest.fn()
          }
        };
      })
    }
  };
});

import { NextRequest } from 'next/server';
import { POST as Login } from '../../../app/api/auth/login/route';
import { POST as Logout } from '../../../app/api/auth/logout/route';
import { GET as Validate } from '../../../app/api/auth/validate/route';
import * as redisMock from '../../lib/redis-mock';
import { parseTokenFromCookie } from '../../../lib/edge-auth';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
  cookies: {
    set: (options: any) => void;
  };
}

describe('Auth API Endpoints', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    
    // Setup a hashed password for tests
    const client = await redisMock.getRedisClient();
    await client.set('auth:admin-password', 'hashed_correct-password');
  });

  describe('POST /api/auth/login', () => {
    it('should log in with correct password', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        password: 'correct-password'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/login');
      request.json = mockJson;
      
      const response = await Login(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(authenticate).toHaveBeenCalledWith({ password: 'correct-password' }, 'password');
      expect(storeSession).toHaveBeenCalledWith('test-session-token');
      
      // Check cookie was set
      expect(response.cookies.set).toHaveBeenCalledWith(expect.objectContaining({
        name: 'authToken',
        value: 'test-session-token',
        httpOnly: true
      }));
    });

    it('should reject login with incorrect password', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        password: 'wrong-password'
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/login');
      request.json = mockJson;
      
      // Force authentication to fail
      authenticate.mockResolvedValueOnce({
        success: false,
        error: 'Invalid credentials'
      });
      
      const response = await Login(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.error).toBeTruthy();
      expect(storeSession).not.toHaveBeenCalled();
    });

    it('should reject login without password', async () => {
      const mockJson = jest.fn().mockResolvedValue({
        // No password
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/login');
      request.json = mockJson;
      
      const response = await Login(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('Password is required');
      expect(authenticate).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockJson = jest.fn().mockRejectedValue(new Error('JSON parse error'));
      
      const request = new NextRequest('http://localhost:3000/api/auth/login');
      request.json = mockJson;
      
      const response = await Login(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should log out and clear cookies', async () => {
      // Mock token parsing
      (parseTokenFromCookie as jest.Mock).mockReturnValue('existing-token');
      
      // Set up existing session
      const client = await redisMock.getRedisClient();
      await client.set('session:existing-token', 'active');
      
      const request = new NextRequest('http://localhost:3000/api/auth/logout');
      const response = await Logout(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(deleteSession).toHaveBeenCalledWith('existing-token');
      
      // Check cookies were cleared
      expect(response.cookies.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'authToken',
          value: '',
          expires: expect.any(Date)
        })
      );
    });

    it('should succeed even without a token', async () => {
      // No token in cookies
      (parseTokenFromCookie as jest.Mock).mockReturnValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/auth/logout');
      const response = await Logout(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(deleteSession).not.toHaveBeenCalled();
      
      // Cookies should still be cleared
      expect(response.cookies.set).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock token parsing to throw an error
      (parseTokenFromCookie as jest.Mock).mockImplementation(() => {
        throw new Error('Cookie parse error');
      });
      
      const request = new NextRequest('http://localhost:3000/api/auth/logout');
      const response = await Logout(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
      
      // Cookies should still be cleared even on error
      expect(response.cookies.set).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/validate', () => {
    it('should validate a valid session', async () => {
      // Mock token parsing
      (parseTokenFromCookie as jest.Mock).mockReturnValue('valid-token');
      
      // Set up valid session
      const client = await redisMock.getRedisClient();
      await client.set('session:valid-token', 'active');
      
      // Force session validation to succeed
      isSessionValid.mockResolvedValueOnce(true);
      
      const request = new NextRequest('http://localhost:3000/api/auth/validate');
      const response = await Validate(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(true);
      expect(isSessionValid).toHaveBeenCalledWith('valid-token');
    });

    it('should reject invalid session', async () => {
      // Mock token parsing
      (parseTokenFromCookie as jest.Mock).mockReturnValue('invalid-token');
      
      // Force session validation to fail
      isSessionValid.mockResolvedValueOnce(false);
      
      const request = new NextRequest('http://localhost:3000/api/auth/validate');
      const response = await Validate(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.valid).toBe(false);
      expect(response.data.reason).toBe('invalid_token');
    });

    it('should reject request without token', async () => {
      // No token in cookies
      (parseTokenFromCookie as jest.Mock).mockReturnValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/auth/validate');
      const response = await Validate(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(401);
      expect(response.data.valid).toBe(false);
      expect(response.data.reason).toBe('no_token');
      expect(isSessionValid).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock token parsing
      (parseTokenFromCookie as jest.Mock).mockReturnValue('error-token');
      
      // Force isSessionValid to throw an error
      isSessionValid.mockRejectedValueOnce(new Error('Redis error'));
      
      const request = new NextRequest('http://localhost:3000/api/auth/validate');
      const response = await Validate(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.valid).toBe(false);
      expect(response.data.reason).toBe('server_error');
    });
  });
}); 