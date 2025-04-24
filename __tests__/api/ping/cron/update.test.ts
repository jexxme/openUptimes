import { NextRequest } from 'next/server';
import { PUT } from '../../../../app/api/ping/cron/route';
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

describe('Cron Update API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    cronMock.resetCronMocks();
  });

  describe('PUT /api/ping/cron/update', () => {
    it('should update an existing cron job', async () => {
      // Create a test job
      const originalJob = cronMock.createTestJob({
        id: 'job-to-update',
        name: 'Original Job Name',
        description: 'Original description',
        cronExpression: '* * * * *'
      });
      
      // Update data
      const updateData = {
        id: 'job-to-update',
        name: 'Updated Job Name',
        description: 'Updated description',
        cronExpression: '*/30 * * * *'
      };
      
      // Expected updated job
      const updatedJob = {
        ...originalJob,
        ...updateData,
        updatedAt: expect.any(Number)
      };
      
      // Mock updateCronJob to return the updated job
      cronMock.updateCronJob.mockResolvedValueOnce(updatedJob);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(updateData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual(updatedJob);
      expect(cronMock.updateCronJob).toHaveBeenCalledWith(
        updateData.id, 
        expect.objectContaining({
          name: updateData.name,
          description: updateData.description,
          cronExpression: updateData.cronExpression
        })
      );
    });
    
    it('should start a job when action is "start"', async () => {
      // Create a test job
      const jobId = 'job-to-start';
      cronMock.createTestJob({ id: jobId, enabled: false, status: 'stopped' });
      
      // Start action data
      const actionData = {
        id: jobId,
        action: 'start'
      };
      
      // Mock startJob to return success
      cronMock.startJob.mockResolvedValueOnce(true);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(actionData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.startJob).toHaveBeenCalledWith(jobId);
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
    
    it('should stop a job when action is "stop"', async () => {
      // Create a test job
      const jobId = 'job-to-stop';
      cronMock.createTestJob({ id: jobId, enabled: true, status: 'running' });
      
      // Stop action data
      const actionData = {
        id: jobId,
        action: 'stop'
      };
      
      // Mock stopJob to return success
      cronMock.stopJob.mockResolvedValueOnce(true);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(actionData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.stopJob).toHaveBeenCalledWith(jobId);
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 400 with invalid action', async () => {
      // Invalid action data
      const actionData = {
        id: 'test-job',
        action: 'invalid-action'
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(actionData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid action');
      expect(cronMock.startJob).not.toHaveBeenCalled();
      expect(cronMock.stopJob).not.toHaveBeenCalled();
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 400 when job ID is missing', async () => {
      // Update data without job ID
      const updateData = {
        name: 'Updated Job',
        cronExpression: '*/10 * * * *'
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(updateData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Job ID is required');
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 400 when name is empty', async () => {
      // Update data with empty name
      const updateData = {
        id: 'test-job',
        name: ''
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(updateData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Name cannot be empty');
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 404 when job is not found', async () => {
      // Update data with non-existent job ID
      const updateData = {
        id: 'non-existent-job',
        name: 'Updated Name'
      };
      
      // Mock updateCronJob to return null (not found)
      cronMock.updateCronJob.mockResolvedValueOnce(null);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(updateData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Job not found');
      expect(cronMock.updateCronJob).toHaveBeenCalledWith(
        updateData.id, 
        expect.objectContaining({ name: updateData.name })
      );
    });
    
    it('should return 401 when no session token is provided', async () => {
      // Create request without session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue(undefined);
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Missing session token.');
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 401 when invalid session token is provided', async () => {
      // Mock session validation to return false
      redisMock.isSessionValid.mockResolvedValueOnce(false);
      
      // Create request with invalid session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/update');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'invalid-session' });
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Invalid or expired session.');
      expect(cronMock.updateCronJob).not.toHaveBeenCalled();
    });
  });
}); 