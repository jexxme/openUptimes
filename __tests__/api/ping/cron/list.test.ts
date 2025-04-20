import { NextRequest } from 'next/server';
import { GET } from '../../../../app/api/ping/cron/list/route';
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

describe('Cron List API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    cronMock.resetCronMocks();
  });

  describe('GET /api/ping/cron/list', () => {
    it('should return list of all cron jobs', async () => {
      // Create some test jobs
      const job1 = cronMock.createTestJob({ id: 'job1', name: 'Job 1' });
      const job2 = cronMock.createTestJob({ id: 'job2', name: 'Job 2' });
      const jobs = [job1, job2];
      
      // Mock listCronJobs to return the test jobs
      cronMock.listCronJobs.mockResolvedValueOnce(jobs);
      
      // Create request with session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual(jobs);
      expect(cronMock.listCronJobs).toHaveBeenCalled();
    });
    
    it('should return a specific job when ID is provided', async () => {
      // Create a test job
      const job = cronMock.createTestJob({ id: 'job1', name: 'Job 1' });
      
      // Mock getCronJob to return the test job
      cronMock.getCronJob.mockResolvedValueOnce(job);
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list?id=job1');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual(job);
      expect(cronMock.getCronJob).toHaveBeenCalledWith('job1');
      expect(cronMock.listCronJobs).not.toHaveBeenCalled();
    });
    
    it('should return job history when ID and history parameters are provided', async () => {
      // Create a test job
      const jobId = 'job1';
      cronMock.createTestJob({ id: jobId, name: 'Job 1' });
      
      // Mock job history
      const history = [
        { timestamp: Date.now(), status: 'success' },
        { timestamp: Date.now() - 60000, status: 'success' }
      ];
      cronMock.getJobHistory.mockResolvedValueOnce(history);
      
      // Create request with session cookie, ID, and history parameters
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list?id=job1&history=true');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ history });
      expect(cronMock.getJobHistory).toHaveBeenCalledWith(jobId, 20);
      expect(cronMock.getCronJob).not.toHaveBeenCalled();
      expect(cronMock.listCronJobs).not.toHaveBeenCalled();
    });
    
    it('should return 404 when job is not found', async () => {
      // Mock getCronJob to return null (not found)
      cronMock.getCronJob.mockResolvedValueOnce(null);
      
      // Create request with session cookie and non-existent ID
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list?id=non-existent');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Job not found');
      expect(cronMock.getCronJob).toHaveBeenCalledWith('non-existent');
    });
    
    it('should return job history with custom limit when provided', async () => {
      // Create a test job
      const jobId = 'job1';
      cronMock.createTestJob({ id: jobId, name: 'Job 1' });
      
      // Mock job history
      const history = [{ timestamp: Date.now(), status: 'success' }];
      cronMock.getJobHistory.mockResolvedValueOnce(history);
      
      // Create request with session cookie, ID, history, and limit parameters
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list?id=job1&history=true&limit=5');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data).toEqual({ history });
      expect(cronMock.getJobHistory).toHaveBeenCalledWith(jobId, 5);
    });
    
    it('should return 401 when no session token is provided', async () => {
      // Create request without session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list');
      request.cookies.get = jest.fn().mockReturnValue(undefined);
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Missing session token.');
      expect(cronMock.listCronJobs).not.toHaveBeenCalled();
    });
    
    it('should return 401 when invalid session token is provided', async () => {
      // Mock session validation to return false
      redisMock.isSessionValid.mockResolvedValueOnce(false);
      
      // Create request with invalid session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/list');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'invalid-session' });
      
      // Call the endpoint
      const response = await GET(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Invalid or expired session.');
      expect(cronMock.listCronJobs).not.toHaveBeenCalled();
    });
  });
}); 