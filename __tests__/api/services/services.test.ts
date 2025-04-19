// __tests__/api/services/services.test.ts
import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../app/api/services/route';
import * as redisMock from '../../lib/redis-mock';
import { ServiceConfig } from '../../../lib/config';

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

// Mock fetch for service checking
global.fetch = jest.fn().mockResolvedValue({
  status: 200,
  json: jest.fn().mockResolvedValue({ status: 'ok' })
});

describe('Services API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockClear();
  });

  describe('GET /api/services', () => {
    it('should return empty array when no services exist', async () => {
      const request = new NextRequest('http://localhost:3000/api/services');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual([]);
    });

    it('should return all active services', async () => {
      // Set up test services
      const testServices: ServiceConfig[] = [
        {
          name: 'Service1',
          url: 'https://service1.com',
          description: 'First service'
        },
        {
          name: 'Service2',
          url: 'https://service2.com',
          description: 'Second service'
        }
      ];

      redisMock.setMockServices(testServices);
      
      const request = new NextRequest('http://localhost:3000/api/services');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveLength(2);
      expect(response.data[0].name).toBe('Service1');
      expect(response.data[1].name).toBe('Service2');
    });

    it('should include deleted services when requested', async () => {
      // Set up active services
      const testServices: ServiceConfig[] = [
        {
          name: 'ActiveService',
          url: 'https://active.com',
          description: 'Active service'
        }
      ];

      redisMock.setMockServices(testServices);
      
      // Create history for a deleted service
      const client = await redisMock.getRedisClient();
      client.set('history:DeletedService', JSON.stringify([{
        status: 'down',
        timestamp: Date.now(),
        responseTime: 500,
        error: 'Service not found'
      }]));
      
      // Request without includeDeleted (default)
      const defaultRequest = new NextRequest('http://localhost:3000/api/services');
      const defaultResponse = await GET(defaultRequest) as unknown as MockedResponse;
      
      expect(defaultResponse.status).toBe(200);
      expect(defaultResponse.data).toHaveLength(1);
      expect(defaultResponse.data[0].name).toBe('ActiveService');
      
      // Request with includeDeleted=true
      const includeDeletedRequest = new NextRequest('http://localhost:3000/api/services?includeDeleted=true');
      const includeDeletedResponse = await GET(includeDeletedRequest) as unknown as MockedResponse;
      
      expect(includeDeletedResponse.status).toBe(200);
      expect(includeDeletedResponse.data).toHaveLength(2);
      
      // Find the deleted service in the response
      const deletedService = includeDeletedResponse.data.find((s: any) => s.name === 'DeletedService');
      expect(deletedService).toBeTruthy();
      expect(deletedService.isDeleted).toBe(true);
      expect(deletedService.url).toBe('');
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in Redis
      const mockClient = await redisMock.getRedisClient();
      const originalGet = mockClient.get;
      mockClient.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'config:services') {
          throw new Error('Simulated Redis failure');
        }
        return originalGet(key);
      });
      
      const request = new NextRequest('http://localhost:3000/api/services');
      const response = await GET(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
      
      // Restore the original mock
      mockClient.get = originalGet;
    });
  });

  describe('POST /api/services', () => {
    it('should add a new service', async () => {
      const newService = {
        name: 'NewService',
        url: 'https://newservice.com',
        description: 'A new service'
      };
      
      const mockJson = jest.fn().mockResolvedValue(newService);
      
      const request = new NextRequest('http://localhost:3000/api/services');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(201);
      expect(response.data).toEqual(newService);
      
      // Verify service was added to Redis
      const client = await redisMock.getRedisClient();
      const services = JSON.parse(await client.get('config:services'));
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('NewService');
      
      // Verify service was checked immediately
      expect(global.fetch).toHaveBeenCalledWith('https://newservice.com', expect.any(Object));
      expect(redisMock.setServiceStatus).toHaveBeenCalled();
      expect(redisMock.appendServiceHistory).toHaveBeenCalled();
    });

    it('should reject service without required fields', async () => {
      const invalidService = {
        name: 'MissingURL'
        // No URL
      };
      
      const mockJson = jest.fn().mockResolvedValue(invalidService);
      
      const request = new NextRequest('http://localhost:3000/api/services');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('required');
      
      // Verify no service was added
      const client = await redisMock.getRedisClient();
      const services = JSON.parse(await client.get('config:services'));
      expect(services).toHaveLength(0);
    });

    it('should reject duplicate service names', async () => {
      // Add an existing service
      const existingService = {
        name: 'DuplicateName',
        url: 'https://existing.com'
      };
      
      redisMock.setMockServices([existingService]);
      
      // Try to add a service with the same name
      const duplicateService = {
        name: 'DuplicateName', // Same name
        url: 'https://different-url.com'
      };
      
      const mockJson = jest.fn().mockResolvedValue(duplicateService);
      
      const request = new NextRequest('http://localhost:3000/api/services');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(409);
      expect(response.data.error).toContain('already exists');
    });

    it('should handle errors gracefully', async () => {
      const mockJson = jest.fn().mockImplementation(() => {
        throw new Error('JSON parse error');
      });
      
      const request = new NextRequest('http://localhost:3000/api/services');
      request.json = mockJson;
      
      const response = await POST(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
    });
  });

  describe('PUT /api/services/:name', () => {
    it('should update an existing service', async () => {
      // Add an existing service
      const existingService = {
        name: 'ServiceToUpdate',
        url: 'https://old-url.com',
        description: 'Old description'
      };
      
      redisMock.setMockServices([existingService]);
      
      // Update data
      const updatedService = {
        name: 'ServiceToUpdate', // Same name
        url: 'https://new-url.com',
        description: 'Updated description'
      };
      
      const mockJson = jest.fn().mockResolvedValue(updatedService);
      
      const request = new NextRequest('http://localhost:3000/api/services?name=ServiceToUpdate');
      request.json = mockJson;
      
      const response = await PUT(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data).toEqual(updatedService);
      
      // Verify service was updated in Redis
      const client = await redisMock.getRedisClient();
      const services = JSON.parse(await client.get('config:services'));
      expect(services).toHaveLength(1);
      expect(services[0].url).toBe('https://new-url.com');
      expect(services[0].description).toBe('Updated description');
      
      // Verify service URL was checked immediately after update
      expect(global.fetch).toHaveBeenCalledWith('https://new-url.com', expect.any(Object));
    });

    it('should allow changing service name', async () => {
      // Add an existing service
      const existingService = {
        name: 'OldName',
        url: 'https://service-url.com'
      };
      
      redisMock.setMockServices([existingService]);
      
      // Update with new name
      const updatedService = {
        name: 'NewName',
        url: 'https://service-url.com'
      };
      
      const mockJson = jest.fn().mockResolvedValue(updatedService);
      
      const request = new NextRequest('http://localhost:3000/api/services?name=OldName');
      request.json = mockJson;
      
      const response = await PUT(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      
      // Verify name was updated in Redis
      const client = await redisMock.getRedisClient();
      const services = JSON.parse(await client.get('config:services'));
      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('NewName');
    });

    it('should reject update for non-existent service', async () => {
      const updatedService = {
        name: 'NonExistentService',
        url: 'https://service-url.com'
      };
      
      const mockJson = jest.fn().mockResolvedValue(updatedService);
      
      const request = new NextRequest('http://localhost:3000/api/services?name=NonExistentService');
      request.json = mockJson;
      
      const response = await PUT(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(404);
      expect(response.data.error).toContain('not found');
    });

    it('should reject updates without required fields', async () => {
      // Add an existing service
      const existingService = {
        name: 'ServiceToUpdate',
        url: 'https://service-url.com'
      };
      
      redisMock.setMockServices([existingService]);
      
      // Invalid update missing URL
      const invalidUpdate = {
        name: 'ServiceToUpdate'
        // No URL
      };
      
      const mockJson = jest.fn().mockResolvedValue(invalidUpdate);
      
      const request = new NextRequest('http://localhost:3000/api/services?name=ServiceToUpdate');
      request.json = mockJson;
      
      const response = await PUT(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('required');
    });

    it('should handle errors gracefully', async () => {
      const request = new NextRequest('http://localhost:3000/api/services?name=ErrorService');
      request.json = jest.fn().mockImplementation(() => {
        throw new Error('JSON parse error');
      });
      
      const response = await PUT(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
    });
  });

  describe('DELETE /api/services/:name', () => {
    it('should delete an existing service', async () => {
      // Add services to Redis
      const services = [
        {
          name: 'Service1',
          url: 'https://service1.com'
        },
        {
          name: 'ServiceToDelete',
          url: 'https://delete-me.com'
        }
      ];
      
      redisMock.setMockServices(services);
      
      const request = new NextRequest('http://localhost:3000/api/services?name=ServiceToDelete');
      const response = await DELETE(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      
      // Verify service was removed from Redis
      const client = await redisMock.getRedisClient();
      const remainingServices = JSON.parse(await client.get('config:services'));
      expect(remainingServices).toHaveLength(1);
      expect(remainingServices[0].name).toBe('Service1');
    });

    it('should reject deletion of non-existent service', async () => {
      const request = new NextRequest('http://localhost:3000/api/services?name=NonExistentService');
      const response = await DELETE(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(404);
      expect(response.data.error).toContain('not found');
    });

    it('should require a service name', async () => {
      const request = new NextRequest('http://localhost:3000/api/services');
      const response = await DELETE(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(400);
      expect(response.data.error).toContain('required');
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in Redis
      const mockClient = await redisMock.getRedisClient();
      const originalGet = mockClient.get;
      mockClient.get = jest.fn().mockImplementation((key: string) => {
        if (key === 'config:services') {
          throw new Error('Simulated Redis failure');
        }
        return originalGet(key);
      });
      
      const request = new NextRequest('http://localhost:3000/api/services?name=ErrorService');
      const response = await DELETE(request) as unknown as MockedResponse;
      
      expect(response.status).toBe(500);
      expect(response.data.error).toBeTruthy();
      
      // Restore the original mock
      mockClient.get = originalGet;
    });
  });
}); 