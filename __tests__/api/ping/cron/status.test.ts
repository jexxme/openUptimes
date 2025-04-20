import { NextRequest } from 'next/server';
import { GET } from '../../../../app/api/ping/cron/status/route';
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

describe('Cron Status API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    cronMock.resetCronMocks();
  });

  describe('GET /api/ping/cron/status', () => {
    it('should return job status information', async () => {
      // Create a test job with status information
      const job = cronMock.createTestJob({
        id: 'job1',
        name: 'Test Job',
        status: 'running',
        enabled: true,
        lastRun: Date.now() - 60000,
        nextRun: Date.now() + 60000,
        lastRunStatus: 'success',
        lastRunDuration: 500,
      });
      
      // Mock getCronJob to return the test job
      cronMock.getCronJob.mockResolvedValueOnce(job);
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron/status?id=job1');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual({
        id: job.id,
        name: job.name,
        status: job.status,
        enabled: job.enabled,
        lastRun: job.lastRun,
        nextRun: job.nextRun,
        lastRunStatus: job.lastRunStatus,
        lastRunDuration: job.lastRunDuration,
        lastRunError: job.lastRunError
      });
      expect(cronMock.getCronJob).toHaveBeenCalledWith('job1');
    });
    
    it('should return 400 when job ID is missing', async () => {
      // Create request with session cookie but no ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron/status');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Job ID is required');
      expect(cronMock.getCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 404 when job is not found', async () => {
      // Mock getCronJob to return null (not found)
      cronMock.getCronJob.mockResolvedValueOnce(null);
      
      // Create request with session cookie and non-existent ID
      const request = new NextRequest('http://localhost:3000/api/ping/cron/status?id=non-existent');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Job not found');
      expect(cronMock.getCronJob).toHaveBeenCalledWith('non-existent');
    });
    
    it('should return status with error information when job has failed', async () => {
      // Create a test job with error information
      const job = cronMock.createTestJob({
        id: 'failed-job',
        name: 'Failed Job',
        status: 'running',
        enabled: true,
        lastRun: Date.now() - 60000,
        nextRun: Date.now() + 60000,
        lastRunStatus: 'failure',
        lastRunDuration: 500,
        lastRunError: 'Connection timeout'
      });
      
      // Mock getCronJob to return the test job
      cronMock.getCronJob.mockResolvedValueOnce(job);
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron/status?id=failed-job');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.id).toBe(job.id);
      expect(response.data.lastRunStatus).toBe('failure');
      expect(response.data.lastRunError).toBe('Connection timeout');
    });
    
    it('should return 401 when no session token is provided', async () => {
      // Create request without session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/status?id=job1');
      request.cookies.get = jest.fn().mockReturnValue(undefined);
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Missing session token.');
      expect(cronMock.getCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 401 when invalid session token is provided', async () => {
      // Mock session validation to return false
      redisMock.isSessionValid.mockResolvedValueOnce(false);
      
      // Create request with invalid session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/status?id=job1');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'invalid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Invalid or expired session.');
      expect(cronMock.getCronJob).not.toHaveBeenCalled();
    });
  });
}); 