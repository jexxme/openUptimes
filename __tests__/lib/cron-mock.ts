import { CronJob, CronJobStatus } from '../../lib/cron';

// In-memory storage for cron jobs in tests
const mockCronJobs: Record<string, CronJob> = {};
const mockCronHistory: Record<string, any[]> = {};
const mockActiveTasks: Record<string, boolean> = {};

// Mock implementation of cron functions
export const validateCronExpression = jest.fn().mockImplementation((expression: string) => {
  return expression && expression !== 'invalid';
});

export const getNextRunTime = jest.fn().mockImplementation((expression: string) => {
  if (!validateCronExpression(expression)) {
    return null;
  }
  return Date.now() + 60000; // 1 minute in the future
});

export const createCronJob = jest.fn().mockImplementation(async (job: Omit<CronJob, 'id' | 'createdAt' | 'updatedAt'>) => {
  if (!validateCronExpression(job.cronExpression)) {
    return null;
  }

  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();
  const nextRun = getNextRunTime(job.cronExpression);

  const newJob: CronJob = {
    id,
    name: job.name,
    description: job.description || '',
    cronExpression: job.cronExpression,
    status: job.status || 'stopped',
    createdAt: now,
    updatedAt: now,
    nextRun: nextRun || undefined,
    enabled: job.enabled
  };

  mockCronJobs[id] = newJob;
  mockCronHistory[id] = [];

  if (job.enabled) {
    mockActiveTasks[id] = true;
    mockCronJobs[id].status = 'running';
  }

  return newJob;
});

export const getCronJob = jest.fn().mockImplementation(async (id: string) => {
  return mockCronJobs[id] || null;
});

export const updateCronJob = jest.fn().mockImplementation(async (id: string, updates: Partial<Omit<CronJob, 'id' | 'createdAt' | 'updatedAt'>>) => {
  if (!mockCronJobs[id]) {
    return null;
  }

  if (updates.cronExpression && !validateCronExpression(updates.cronExpression)) {
    throw new Error('Invalid cron expression');
  }

  const updatedJob: CronJob = {
    ...mockCronJobs[id],
    ...updates,
    updatedAt: Date.now()
  };

  if (updates.cronExpression) {
    updatedJob.nextRun = getNextRunTime(updates.cronExpression) || undefined;
  }

  // Handle job scheduling based on status changes
  if (mockCronJobs[id].enabled !== updatedJob.enabled) {
    if (updatedJob.enabled) {
      mockActiveTasks[id] = true;
      updatedJob.status = 'running';
    } else {
      delete mockActiveTasks[id];
      updatedJob.status = 'stopped';
    }
  }

  mockCronJobs[id] = updatedJob;
  return updatedJob;
});

export const deleteCronJob = jest.fn().mockImplementation(async (id: string) => {
  if (!mockCronJobs[id]) {
    return false;
  }

  delete mockCronJobs[id];
  delete mockCronHistory[id];
  delete mockActiveTasks[id];

  return true;
});

export const listCronJobs = jest.fn().mockImplementation(async () => {
  return Object.values(mockCronJobs);
});

export const startJob = jest.fn().mockImplementation(async (id: string) => {
  if (!mockCronJobs[id]) {
    return false;
  }

  mockActiveTasks[id] = true;
  mockCronJobs[id].status = 'running';
  mockCronJobs[id].updatedAt = Date.now();
  mockCronJobs[id].nextRun = getNextRunTime(mockCronJobs[id].cronExpression) || undefined;

  return true;
});

export const stopJob = jest.fn().mockImplementation(async (id: string) => {
  if (!mockCronJobs[id]) {
    return false;
  }

  delete mockActiveTasks[id];
  mockCronJobs[id].status = 'stopped';
  mockCronJobs[id].updatedAt = Date.now();

  return true;
});

export const getJobHistory = jest.fn().mockImplementation(async (id: string, limit: number = 20) => {
  if (!mockCronHistory[id]) {
    return [];
  }

  return mockCronHistory[id].slice(0, limit);
});

export const initCronSystem = jest.fn().mockResolvedValue(undefined);

// Helper to reset the mocks between tests
export function resetCronMocks() {
  Object.keys(mockCronJobs).forEach(key => {
    delete mockCronJobs[key];
  });
  
  Object.keys(mockCronHistory).forEach(key => {
    delete mockCronHistory[key];
  });
  
  Object.keys(mockActiveTasks).forEach(key => {
    delete mockActiveTasks[key];
  });
  
  // Reset all mocks
  jest.clearAllMocks();
}

// Helper to create a test job
export function createTestJob(overrides: Partial<CronJob> = {}): CronJob {
  const id = overrides.id || `test_job_${Date.now()}`;
  const now = Date.now();
  
  const job: CronJob = {
    id,
    name: 'Test Job',
    description: 'A test job',
    cronExpression: '* * * * *',
    status: 'stopped',
    createdAt: now,
    updatedAt: now,
    enabled: false,
    ...overrides
  };
  
  mockCronJobs[id] = job;
  mockCronHistory[id] = [];
  
  if (job.enabled) {
    mockActiveTasks[id] = true;
    mockCronJobs[id].status = 'running';
  }
  
  return job;
} 