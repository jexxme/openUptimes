import { NextRequest } from 'next/server';
import { POST } from '../../../../app/api/ping/cron/create/route';
import * as redisMock from '../../../lib/redis-mock';
import * as cronMock from '../../../lib/cron-mock';

// Interface for mocked response
interface MockedResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
  json: () => Promise<any>;
}

// Mock the redis module
jest.mock('../../../../lib/redis', () => {
  return {
    ...jest.requireActual('../../../lib/redis-mock'),
  };
});

// Mock the cron module
jest.mock('../../../../lib/cron', () => {
  return {
    ...jest.requireActual('../../../lib/cron-mock'),
  };
});

describe('Cron Create API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    cronMock.resetCronMocks();
  });

  describe('POST /api/ping/cron/create', () => {
    it('should create a new cron job with valid data', async () => {
      // Job data to create
      const jobData = {
        name: 'New Scheduled Job',
        description: 'A job created through the API',
        cronExpression: '*/15 * * * *',
        enabled: true
      };
      
      // Create a mock job result
      const expectedJob = {
        id: expect.any(String),
        name: jobData.name,
        description: jobData.description,
        cronExpression: jobData.cronExpression,
        status: 'running', // Since enabled is true
        enabled: jobData.enabled,
        createdAt: expect.any(Number),
        updatedAt: expect.any(Number),
        nextRun: expect.any(Number)
      };
      
      // Mock createCronJob to return a valid job
      cronMock.createCronJob.mockResolvedValueOnce({
        ...expectedJob,
        id: 'test-job-id',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        nextRun: Date.now() + 60000
      });
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(jobData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/create');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(201);
      expect(response.data).toMatchObject(expectedJob);
      expect(cronMock.createCronJob).toHaveBeenCalledWith({
        name: jobData.name,
        description: jobData.description,
        cronExpression: jobData.cronExpression,
        enabled: jobData.enabled,
        status: 'stopped'
      });
    });
    
    it('should return 400 when name is missing', async () => {
      // Invalid job data missing name
      const jobData = {
        cronExpression: '*/15 * * * *',
        enabled: false
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(jobData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/create');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Name and cron expression are required');
      expect(cronMock.createCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 400 when cron expression is missing', async () => {
      // Invalid job data missing cron expression
      const jobData = {
        name: 'Invalid Job',
        enabled: false
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(jobData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/create');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Name and cron expression are required');
      expect(cronMock.createCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 400 when cron expression is invalid', async () => {
      // Invalid job data with invalid cron expression
      const jobData = {
        name: 'Invalid Cron Job',
        cronExpression: 'invalid',
        enabled: false
      };
      
      // Mock createCronJob to return null for invalid cron expression
      cronMock.createCronJob.mockResolvedValueOnce(null);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(jobData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/create');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Failed to create job');
      expect(cronMock.createCronJob).toHaveBeenCalled();
    });
    
    it('should return 401 when no session token is provided', async () => {
      // Create request without session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/create');
      request.cookies.get = jest.fn().mockReturnValue(undefined);
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Missing session token.');
      expect(cronMock.createCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 401 when invalid session token is provided', async () => {
      // Mock session validation to return false
      redisMock.isSessionValid.mockResolvedValueOnce(false);
      
      // Create request with invalid session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/create');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'invalid-session' });
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Invalid or expired session.');
      expect(cronMock.createCronJob).not.toHaveBeenCalled();
    });
  });
}); 