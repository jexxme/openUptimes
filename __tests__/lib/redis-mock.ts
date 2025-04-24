import { ServiceStatus } from '../../lib/redis';
import { ServiceConfig } from '../../lib/config';

// In-memory storage for tests
const mockStorage: Record<string, any> = {
  'config:services': JSON.stringify([]),
  'setup:complete': 'true'
};

// Mock implementation of Redis client
const mockRedisClient = {
  isOpen: true,
  
  // Basic Redis operations
  async get(key: string) {
    return mockStorage[key] || null;
  },
  
  async set(key: string, value: string) {
    mockStorage[key] = value;
    return 'OK';
  },
  
  async del(key: string) {
    delete mockStorage[key];
    return 1;
  },
  
  async keys(pattern: string) {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return Object.keys(mockStorage).filter(key => regex.test(key));
  },
  
  async lPush(key: string, value: string) {
    if (!mockStorage[key]) {
      mockStorage[key] = [];
    }
    const array = Array.isArray(mockStorage[key]) 
      ? mockStorage[key] 
      : JSON.parse(mockStorage[key]);
    
    array.unshift(value);
    mockStorage[key] = JSON.stringify(array);
    return array.length;
  },
  
  async lRange(key: string, start: number, end: number) {
    if (!mockStorage[key]) {
      return [];
    }
    
    const array = Array.isArray(mockStorage[key]) 
      ? mockStorage[key] 
      : JSON.parse(mockStorage[key]);
    
    return array.slice(start, end === -1 ? undefined : end + 1);
  },
  
  async lTrim(key: string, start: number, end: number) {
    if (!mockStorage[key]) {
      return 'OK';
    }
    
    let array;
    try {
      array = typeof mockStorage[key] === 'string' 
        ? JSON.parse(mockStorage[key]) 
        : mockStorage[key];
      
      if (!Array.isArray(array)) {
        return 'OK'; // If not an array, do nothing
      }
      
      const trimmedArray = array.slice(start, end === -1 ? undefined : end + 1);
      mockStorage[key] = JSON.stringify(trimmedArray);
      return 'OK';
    } catch (error) {

      return 'OK'; // Return OK even on error to avoid breaking tests
    }
  },
  
  async ping() {
    return 'PONG';
  },
  
  async quit() {
    return 'OK';
  },
  
  // Add any other Redis methods needed for tests
};

// Helper to reset the mock data between tests
export function resetMockRedis() {
  Object.keys(mockStorage).forEach(key => {
    delete mockStorage[key];
  });
  mockStorage['config:services'] = JSON.stringify([]);
  mockStorage['setup:complete'] = 'true';
}

// Helper to pre-populate services for tests
export function setMockServices(services: ServiceConfig[]) {
  mockStorage['config:services'] = JSON.stringify(services);
}

// Helper to set service status for tests
export function setMockServiceStatus(name: string, status: ServiceStatus) {
  mockStorage[`status:${name}`] = JSON.stringify(status);
}

// Mock implementation of Redis functions
export const getRedisClient = jest.fn().mockResolvedValue(mockRedisClient);
export const closeRedisConnection = jest.fn().mockResolvedValue(undefined);
export const getServiceStatus = jest.fn().mockImplementation(async (name: string) => {
  const status = mockStorage[`status:${name}`];
  return status ? JSON.parse(status) : null;
});

export const setServiceStatus = jest.fn().mockImplementation(async (name: string, data: ServiceStatus) => {
  mockStorage[`status:${name}`] = JSON.stringify(data);
  return true;
});

export const appendServiceHistory = jest.fn().mockImplementation(async (name: string, data: ServiceStatus) => {
  const key = `history:${name}`;
  if (!mockStorage[key]) {
    mockStorage[key] = JSON.stringify([]);
  }
  
  const history = JSON.parse(mockStorage[key]);
  history.unshift(data);
  mockStorage[key] = JSON.stringify(history);
  return true;
});

export const getServiceHistory = jest.fn().mockImplementation(async (name: string, limit = 1440) => {
  const key = `history:${name}`;
  const history = mockStorage[key] ? JSON.parse(mockStorage[key]) : [];
  return history.slice(0, limit);
});

/**
 * Check if a session token exists and is valid
 */
export const isSessionValid = jest.fn().mockImplementation(async (token: string): Promise<boolean> => {
  // For testing purposes, we'll consider 'valid-session' as a valid session token
  return token === 'valid-session';
}); 