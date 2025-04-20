import { NextRequest } from 'next/server';
import { DELETE, POST } from '../../../../app/api/ping/cron/delete/route';
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

describe('Cron Delete API Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.resetMockRedis();
    cronMock.resetCronMocks();
  });

  describe('DELETE /api/ping/cron/delete', () => {
    it('should delete an existing cron job', async () => {
      // Create a test job
      const jobId = 'job-to-delete';
      cronMock.createTestJob({ id: jobId });
      
      // Mock deleteCronJob to return success
      cronMock.deleteCronJob.mockResolvedValueOnce(true);
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest(`http://localhost:3000/api/ping/cron/delete?id=${jobId}`);
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.deleteCronJob).toHaveBeenCalledWith(jobId);
    });
    
    it('should return 400 when job ID is missing', async () => {
      // Create request with session cookie but no ID parameter
      const request = new NextRequest('http://localhost:3000/api/ping/cron/delete');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(400);
      expect(response.data.error).toBe('Job ID is required');
      expect(cronMock.deleteCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 404 when job to delete is not found', async () => {
      // Mock deleteCronJob to return false (not found)
      cronMock.deleteCronJob.mockResolvedValueOnce(false);
      
      // Create request with session cookie and non-existent ID
      const request = new NextRequest('http://localhost:3000/api/ping/cron/delete?id=non-existent');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(404);
      expect(response.data.error).toBe('Failed to delete job');
      expect(cronMock.deleteCronJob).toHaveBeenCalledWith('non-existent');
    });
    
    it('should return 401 when no session token is provided', async () => {
      // Create request without session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/delete?id=test-job');
      request.cookies.get = jest.fn().mockReturnValue(undefined);
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Missing session token.');
      expect(cronMock.deleteCronJob).not.toHaveBeenCalled();
    });
    
    it('should return 401 when invalid session token is provided', async () => {
      // Mock session validation to return false
      redisMock.isSessionValid.mockResolvedValueOnce(false);
      
      // Create request with invalid session cookie
      const request = new NextRequest('http://localhost:3000/api/ping/cron/delete?id=test-job');
      request.cookies.get = jest.fn().mockReturnValue({ value: 'invalid-session' });
      
      // Call the endpoint
      const response = await DELETE(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(401);
      expect(response.data.error).toBe('Unauthorized. Invalid or expired session.');
      expect(cronMock.deleteCronJob).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/ping/cron/delete (fallback for DELETE)', () => {
    it('should delete an existing cron job using POST', async () => {
      // Create a test job
      const jobId = 'job-to-delete';
      cronMock.createTestJob({ id: jobId });
      
      // Mock deleteCronJob to return success
      cronMock.deleteCronJob.mockResolvedValueOnce(true);
      
      // Create request with session cookie and ID parameter
      const request = new NextRequest(`http://localhost:3000/api/ping/cron/delete?id=${jobId}`);
      request.cookies.get = jest.fn().mockReturnValue({ value: 'valid-session' });
      
      // Call the endpoint
      const response = await POST(request) as unknown as MockedResponse;
      
      // Test the response
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(cronMock.deleteCronJob).toHaveBeenCalledWith(jobId);
    });
  });
}); 