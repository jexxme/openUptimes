'use server';

import { getRedisClient } from './redis';
import { parse, schedule, validate, ScheduledTask } from 'node-cron';

// Type definitions for Cron jobs
export type CronJobStatus = 'running' | 'stopped' | 'error';

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  status: CronJobStatus;
  createdAt: number;
  updatedAt: number;
  lastRun?: number;
  nextRun?: number;
  lastRunDuration?: number;
  lastRunStatus?: 'success' | 'failure';
  lastRunError?: string;
  enabled: boolean;
}

// In-memory store for active cron jobs
const activeTasks: Record<string, ScheduledTask> = {};

/**
 * Validate a cron expression
 */
export async function validateCronExpression(expression: string): Promise<boolean> {
  return validate(expression);
}

/**
 * Calculate the next run time for a cron expression
 */
export async function getNextRunTime(cronExpression: string): Promise<number | null> {
  try {
    if (!validate(cronExpression)) {
      return null;
    }
    
    // Use node-cron's parse to get schedule details
    const interval = parse(cronExpression);
    
    // Calculate next execution time
    const now = new Date();
    const nextDate = new Date(now);
    
    // Increment by seconds to find next match
    for (let i = 0; i < 86400; i++) { // Look ahead max 24 hours
      nextDate.setSeconds(now.getSeconds() + i);
      if (interval.match(nextDate)) {
        return nextDate.getTime();
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating next run time:', error);
    return null;
  }
}

/**
 * Create a new cron job
 */
export async function createCronJob(job: Omit<CronJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<CronJob | null> {
  try {
    const client = await getRedisClient();
    
    // Validate cron expression
    if (!validate(job.cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    // Generate a unique ID
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const now = Date.now();
    
    // Calculate next run time
    const nextRun = await getNextRunTime(job.cronExpression);
    
    // Create the job object
    const newJob: CronJob = {
      id,
      name: job.name,
      description: job.description || '',
      cronExpression: job.cronExpression,
      status: 'stopped',
      createdAt: now,
      updatedAt: now,
      nextRun: nextRun || undefined,
      enabled: job.enabled
    };
    
    // Store the job in Redis
    await client.set(`cron:job:${id}`, JSON.stringify(newJob));
    
    // Add to job index
    await client.sAdd('cron:jobs', id);
    
    // Start the job if enabled
    if (job.enabled) {
      await startJob(id);
    }
    
    return newJob;
  } catch (error) {
    console.error('Error creating cron job:', error);
    return null;
  }
}

/**
 * Get a cron job by ID
 */
export async function getCronJob(id: string): Promise<CronJob | null> {
  try {
    const client = await getRedisClient();
    const jobData = await client.get(`cron:job:${id}`);
    
    if (!jobData) {
      return null;
    }
    
    return JSON.parse(jobData);
  } catch (error) {
    console.error('Error getting cron job:', error);
    return null;
  }
}

/**
 * Update a cron job
 */
export async function updateCronJob(id: string, updates: Partial<Omit<CronJob, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CronJob | null> {
  try {
    const client = await getRedisClient();
    
    // Get existing job
    const existingJobData = await client.get(`cron:job:${id}`);
    if (!existingJobData) {
      return null;
    }
    
    const existingJob: CronJob = JSON.parse(existingJobData);
    
    // If updating cron expression, validate it
    if (updates.cronExpression && !validate(updates.cronExpression)) {
      throw new Error('Invalid cron expression');
    }
    
    // Update the job
    const updatedJob: CronJob = {
      ...existingJob,
      ...updates,
      updatedAt: Date.now()
    };
    
    // Recalculate next run time if cron expression changed
    if (updates.cronExpression) {
      updatedJob.nextRun = await getNextRunTime(updates.cronExpression) || undefined;
    }
    
    // Store the updated job
    await client.set(`cron:job:${id}`, JSON.stringify(updatedJob));
    
    // Handle job scheduling based on status changes
    if (existingJob.enabled !== updatedJob.enabled) {
      if (updatedJob.enabled) {
        await startJob(id);
      } else {
        await stopJob(id);
      }
    } else if (updates.cronExpression && updatedJob.enabled) {
      // Restart the job if cron expression changed and job is enabled
      await stopJob(id);
      await startJob(id);
    }
    
    return updatedJob;
  } catch (error) {
    console.error('Error updating cron job:', error);
    return null;
  }
}

/**
 * Delete a cron job
 */
export async function deleteCronJob(id: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    
    // Stop the job if running
    await stopJob(id);
    
    // Delete from Redis
    await client.del(`cron:job:${id}`);
    
    // Remove from job index
    await client.sRem('cron:jobs', id);
    
    // Delete job history
    await client.del(`cron:history:${id}`);
    
    return true;
  } catch (error) {
    console.error('Error deleting cron job:', error);
    return false;
  }
}

/**
 * List all cron jobs
 */
export async function listCronJobs(): Promise<CronJob[]> {
  try {
    const client = await getRedisClient();
    
    // Get all job IDs
    const jobIds = await client.sMembers('cron:jobs');
    
    if (!jobIds.length) {
      return [];
    }
    
    // Get all jobs
    const jobPromises = jobIds.map((id: string) => client.get(`cron:job:${id}`));
    const jobsData = await Promise.all(jobPromises);
    
    // Parse and filter out any null values
    return jobsData
      .filter(Boolean)
      .map(data => JSON.parse(data as string));
  } catch (error) {
    console.error('Error listing cron jobs:', error);
    return [];
  }
}

/**
 * Start a cron job
 */
export async function startJob(id: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    
    // Get the job
    const jobData = await client.get(`cron:job:${id}`);
    if (!jobData) {
      return false;
    }
    
    const job: CronJob = JSON.parse(jobData);
    
    // Stop any existing task
    if (activeTasks[id]) {
      activeTasks[id].stop();
      delete activeTasks[id];
    }
    
    // Schedule the new task
    const task = schedule(job.cronExpression, async () => {
      await executeJob(id);
    });
    
    // Store the task
    activeTasks[id] = task;
    
    // Update job status
    const updatedJob: CronJob = {
      ...job,
      status: 'running',
      updatedAt: Date.now(),
      nextRun: await getNextRunTime(job.cronExpression) || undefined
    };
    
    await client.set(`cron:job:${id}`, JSON.stringify(updatedJob));
    
    return true;
  } catch (error) {
    console.error(`Error starting job ${id}:`, error);
    return false;
  }
}

/**
 * Stop a cron job
 */
export async function stopJob(id: string): Promise<boolean> {
  try {
    // Stop the scheduled task if it exists
    if (activeTasks[id]) {
      activeTasks[id].stop();
      delete activeTasks[id];
    }
    
    const client = await getRedisClient();
    
    // Get the job
    const jobData = await client.get(`cron:job:${id}`);
    if (!jobData) {
      return false;
    }
    
    const job: CronJob = JSON.parse(jobData);
    
    // Update job status
    const updatedJob: CronJob = {
      ...job,
      status: 'stopped',
      updatedAt: Date.now()
    };
    
    await client.set(`cron:job:${id}`, JSON.stringify(updatedJob));
    
    return true;
  } catch (error) {
    console.error(`Error stopping job ${id}:`, error);
    return false;
  }
}

/**
 * Execute a cron job
 */
async function executeJob(id: string): Promise<void> {
  const client = await getRedisClient();
  
  try {
    // Get the job
    const jobData = await client.get(`cron:job:${id}`);
    if (!jobData) {
      return;
    }
    
    const job: CronJob = JSON.parse(jobData);
    
    // Record execution start time
    const startTime = Date.now();
    
    // Execute the ping API endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ping`, {
      method: 'GET',
      headers: {
        'User-Agent': 'OpenUptimes-CronJob',
        'X-Cron-Job-ID': id
      }
    });
    
    // Check response
    const success = response.ok;
    const result = await response.json();
    
    // Calculate execution duration
    const duration = Date.now() - startTime;
    
    // Update job with execution results
    const updatedJob: CronJob = {
      ...job,
      lastRun: startTime,
      lastRunDuration: duration,
      lastRunStatus: success ? 'success' : 'failure',
      lastRunError: success ? undefined : JSON.stringify(result),
      nextRun: await getNextRunTime(job.cronExpression) || undefined,
      updatedAt: Date.now()
    };
    
    await client.set(`cron:job:${id}`, JSON.stringify(updatedJob));
    
    // Record execution in history
    const historyEntry = {
      timestamp: startTime,
      duration,
      status: success ? 'success' : 'failure',
      error: success ? undefined : JSON.stringify(result)
    };
    
    await client.lPush(`cron:history:${id}`, JSON.stringify(historyEntry));
    await client.lTrim(`cron:history:${id}`, 0, 99); // Keep last 100 executions
  } catch (error) {
    // Record execution failure
    try {
      // Get the job again (in case it changed during execution)
      const jobData = await client.get(`cron:job:${id}`);
      if (!jobData) {
        return;
      }
      
      const job: CronJob = JSON.parse(jobData);
      
      // Update job with failure details
      const updatedJob: CronJob = {
        ...job,
        lastRun: Date.now(),
        lastRunStatus: 'failure',
        lastRunError: (error as Error).message,
        nextRun: await getNextRunTime(job.cronExpression) || undefined,
        updatedAt: Date.now()
      };
      
      await client.set(`cron:job:${id}`, JSON.stringify(updatedJob));
      
      // Record failure in history
      const historyEntry = {
        timestamp: Date.now(),
        status: 'failure',
        error: (error as Error).message
      };
      
      await client.lPush(`cron:history:${id}`, JSON.stringify(historyEntry));
      await client.lTrim(`cron:history:${id}`, 0, 99); // Keep last 100 executions
    } catch (e) {
      console.error(`Error recording job failure for ${id}:`, e);
    }
  }
}

/**
 * Get job execution history
 */
export async function getJobHistory(id: string, limit: number = 20): Promise<any[]> {
  try {
    const client = await getRedisClient();
    
    // Get the job history entries
    const history = await client.lRange(`cron:history:${id}`, 0, limit - 1);
    
    return history.map((entry: string) => JSON.parse(entry));
  } catch (error) {
    console.error(`Error getting job history for ${id}:`, error);
    return [];
  }
}

/**
 * Initialize cron system - load and start enabled jobs
 */
export async function initCronSystem(): Promise<void> {
  try {
    console.log('Initializing cron system...');
    
    // Get all enabled jobs
    const jobs = await listCronJobs();
    const enabledJobs = jobs.filter(job => job.enabled);
    
    console.log(`Found ${enabledJobs.length} enabled jobs`);
    
    // Start each job
    for (const job of enabledJobs) {
      await startJob(job.id);
      console.log(`Started job: ${job.name} (${job.id})`);
    }
  } catch (error) {
    console.error('Error initializing cron system:', error);
  }
} 