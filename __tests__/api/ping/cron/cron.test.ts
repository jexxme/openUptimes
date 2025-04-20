import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../../../../app/api/ping/cron/route';
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

describe('Cron API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    cronMock.resetCronMocks();
    
    // Mock session validation to return true
    redisMock.isSessionValid = jest.fn().mockResolvedValue(true);
  });

  describe('GET /api/ping/cron', () => {
    it('should return list of cron jobs when no ID is provided', async () => {
      // Create some test jobs
      const job1 = cronMock.createTestJob({ id: 'job1', name: 'Job 1' });
      const job2 = cronMock.createTestJob({ id: 'job2', name: 'Job 2' });
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual([job1, job2]);
      expect(cronMock.listCronJobs).toHaveBeenCalled();
    });
    
    it('should return a specific job when ID is provided', async () => {
      // Create a test job
      const job = cronMock.createTestJob({ id: 'job1', name: 'Test Job' });
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron?id=job1');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual(job);
      expect(cronMock.getCronJob).toHaveBeenCalledWith('job1');
    });
    
    it('should return 404 when job is not found', async () => {
      // Create request with session cookie and non-existent ID
      const request = new NextRequest('http://localhost:3000/api/ping/cron?id=non-existent');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Job not found');
    });
    
    it('should return job history when history parameter is provided', async () => {
      // Create a test job
      const jobId = 'job1';
      cronMock.createTestJob({ id: jobId, name: 'Test Job' });
      
      // Mock job history
      const history = [{ timestamp: Date.now(), status: 'success' }];
      cronMock.getJobHistory.mockResolvedValueOnce(history);
      
      // Create request with session cookie, ID, and history parameters
      const request = new NextRequest('http://localhost:3000/api/ping/cron?id=job1&history=true');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ history });
      expect(cronMock.getJobHistory).toHaveBeenCalledWith(jobId, 20);
    });
    
    it('should return 401 when no session token is provided', async () => {
      // Create request without session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue(undefined);
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toContain('Unauthorized');
    });
    
    it('should return 401 when invalid session token is provided', async () => {
      // Mock session validation to return false
      redisMock.isSessionValid = jest.fn().mockResolvedValue(false);
      
      // Create request with invalid session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'invalid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toContain('Unauthorized');
    });
  });

  describe('POST /api/ping/cron', () => {
    it('should create a new cron job', async () => {
      // Job data to create
      const jobData = {
        name: 'New Job',
        description: 'A new test job',
        cronExpression: '*/5 * * * *',
        enabled: true
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(jobData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(201);
      expect(response.data.name).toBe(jobData.name);
      expect(response.data.description).toBe(jobData.description);
      expect(response.data.cronExpression).toBe(jobData.cronExpression);
      expect(response.data.enabled).toBe(jobData.enabled);
      expect(cronMock.createCronJob).toHaveBeenCalledWith(jobData);
    });
    
    it('should return 400 when job creation fails', async () => {
      // Job data with invalid cron expression
      const jobData = {
        name: 'Invalid Job',
        cronExpression: 'invalid',
        enabled: false
      };
      
      // Mock createCronJob to return null (failure)
      cronMock.createCronJob.mockResolvedValueOnce(null);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(jobData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Failed to create job');
    });
  });

  describe('PUT /api/ping/cron', () => {
    it('should update an existing cron job', async () => {
      // Create a test job
      const job = cronMock.createTestJob({ 
        id: 'job-to-update', 
        name: 'Original Name',
        cronExpression: '* * * * *'
      });
      
      // Update data
      const updateData = {
        id: 'job-to-update',
        name: 'Updated Name',
        cronExpression: '*/10 * * * *',
        description: 'Updated description'
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(updateData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(updateData.id);
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.cronExpression).toBe(updateData.cronExpression);
      expect(response.data.description).toBe(updateData.description);
      expect(cronMock.updateCronJob).toHaveBeenCalledWith(
        updateData.id, 
        expect.objectContaining({
          name: updateData.name,
          cronExpression: updateData.cronExpression,
          description: updateData.description
        })
      );
    });
    
    it('should start a job when action is "start"', async () => {
      // Create a test job
      const jobId = 'job-to-start';
      cronMock.createTestJob({ id: jobId, enabled: false });
      
      // Action data
      const actionData = {
        id: jobId,
        action: 'start'
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(actionData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.startJob).toHaveBeenCalledWith(jobId);
    });
    
    it('should stop a job when action is "stop"', async () => {
      // Create a test job
      const jobId = 'job-to-stop';
      cronMock.createTestJob({ id: jobId, enabled: true });
      
      // Action data
      const actionData = {
        id: jobId,
        action: 'stop'
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(actionData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.stopJob).toHaveBeenCalledWith(jobId);
    });
    
    it('should return 400 for invalid action', async () => {
      // Action data with invalid action
      const actionData = {
        id: 'job1',
        action: 'invalid-action'
      };
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(actionData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Invalid action');
    });
    
    it('should return 404 when job is not found', async () => {
      // Update data with non-existent job ID
      const updateData = {
        id: 'non-existent',
        name: 'Updated Name'
      };
      
      // Mock updateCronJob to return null (not found)
      cronMock.updateCronJob.mockResolvedValueOnce(null);
      
      // Mock request JSON method
      const mockJson = jest.fn().mockResolvedValue(updateData);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      request.json = mockJson;
      
      // Call the endpoint
      const response = await PUT(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Job not found');
    });
  });

  describe('DELETE /api/ping/cron', () => {
    it('should delete an existing cron job', async () => {
      // Create a test job
      const jobId = 'job-to-delete';
      cronMock.createTestJob({ id: jobId });
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest(`http://localhost:3000/api/ping/cron?id=${jobId}`);
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.deleteCronJob).toHaveBeenCalledWith(jobId);
    });
    
    it('should return 400 when no ID is provided', async () => {
      // Create request with session cookie but no ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Job ID is required');
    });
    
    it('should return 404 when job to delete is not found', async () => {
      // Mock deleteCronJob to return false (not found)
      cronMock.deleteCronJob.mockResolvedValueOnce(false);
      
      // Create request with session cookie and non-existent ID
      const request = new NextRequest('http://localhost:3000/api/ping/cron?id=non-existent');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Failed to delete job');
    });
  });
}); 