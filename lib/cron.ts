'use server';

import { getRedisClient } from './redis';
import { schedule, validate, ScheduledTask } from 'node-cron';

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

// Simple helper to check if a cron time matches a date
function cronMatches(cronExpression: string, date: Date): boolean {
  // Split cron into parts
  const parts = cronExpression.split(' ');
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  // Get date components
  const dateMinute = date.getMinutes();
  const dateHour = date.getHours();
  const dateDayOfMonth = date.getDate();
  const dateMonth = date.getMonth() + 1; // JS months are 0-based
  const dateDayOfWeek = date.getDay(); // 0 is Sunday in JS
  
  // Check each part
  const minuteMatch = matchCronPart(dateMinute, minute, 0, 59);
  const hourMatch = matchCronPart(dateHour, hour, 0, 23);
  const dayOfMonthMatch = matchCronPart(dateDayOfMonth, dayOfMonth, 1, 31);
  const monthMatch = matchCronPart(dateMonth, month, 1, 12);
  const dayOfWeekMatch = matchCronPart(dateDayOfWeek, dayOfWeek, 0, 6);
  
  return minuteMatch && hourMatch && dayOfMonthMatch && monthMatch && dayOfWeekMatch;
}

// Helper to match a specific part of a cron expression
function matchCronPart(value: number, cronPart: string, min: number, max: number): boolean {
  // Handle asterisk
  if (cronPart === '*') return true;
  
  // Handle exact number
  if (!isNaN(parseInt(cronPart)) && parseInt(cronPart) === value) return true;
  
  // Handle ranges (e.g., 1-5)
  if (cronPart.includes('-')) {
    const [start, end] = cronPart.split('-').map(Number);
    return value >= start && value <= end;
  }
  
  // Handle lists (e.g., 1,3,5)
  if (cronPart.includes(',')) {
    return cronPart.split(',').map(Number).includes(value);
  }
  
  // Handle step values (e.g., */5)
  if (cronPart.startsWith('*/')) {
    const step = parseInt(cronPart.substring(2));
    return value % step === 0;
  }
  
  return false;
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
    
    const now = new Date();
    let nextDate = new Date(now);
    
    // Look ahead up to a week to find the next match
    for (let i = 1; i <= 10080; i++) { // 10080 minutes = 1 week
      nextDate = new Date(now.getTime() + i * 60000); // Add i minutes
      if (cronMatches(cronExpression, nextDate)) {
        console.log(`[NextRunCalc] Next run for "${cronExpression}" will be at: ${nextDate.toISOString()}`);
        return nextDate.getTime();
      }
    }
    
    console.log(`[NextRunCalc] No match found for "${cronExpression}" in the next week`);
    return null;
  } catch (error) {
    console.error(`[NextRunCalc] Error calculating next run time for "${cronExpression}":`, error);
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
    
    // Calculate next run time directly
    let nextRun;
    try {
      const calculatedNextRun = await getNextRunTime(job.cronExpression);
      // Convert null to undefined if needed
      nextRun = calculatedNextRun !== null ? calculatedNextRun : undefined;
      console.log(`[CreateJob] Calculated next run time for new job: ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
    } catch (e) {
      console.error(`[CreateJob] Error calculating next run time for new job:`, e);
    }
    
    // Create the job object
    const newJob: CronJob = {
      id,
      name: job.name,
      description: job.description || '',
      cronExpression: job.cronExpression,
      status: 'stopped',
      createdAt: now,
      updatedAt: now,
      nextRun: nextRun,
      enabled: job.enabled
    };
    
    console.log(`[CreateJob] Creating job with next run: ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
    
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
    
    // Calculate next run time if cron expression changed
    let nextRun = existingJob.nextRun;
    if (updates.cronExpression) {
      try {
        const calculatedNextRun = await getNextRunTime(updates.cronExpression);
        // Convert null to undefined if needed
        nextRun = calculatedNextRun !== null ? calculatedNextRun : undefined;
        console.log(`[UpdateJob] Calculated next run time for job update ${id}: ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
      } catch (e) {
        console.error(`[UpdateJob] Error calculating next run time for job update ${id}:`, e);
      }
    }
    
    // Update the job
    const updatedJob: CronJob = {
      ...existingJob,
      ...updates,
      nextRun: nextRun,
      updatedAt: Date.now()
    };
    
    console.log(`[UpdateJob] Updating job ${id} with next run: ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
    
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
    
    // Use keys pattern matching to find all job IDs
    const jobKeysPattern = 'cron:job:*';
    const jobKeys = await client.keys(jobKeysPattern);
    
    if (!jobKeys.length) {
      return [];
    }
    
    // Extract job IDs from keys
    const jobIds = jobKeys.map((key: string) => key.replace('cron:job:', ''));
    
    // Get all jobs
    const jobPromises = jobIds.map((id: string) => client.get(`cron:job:${id}`));
    const jobsData = await Promise.all(jobPromises);
    
    // Parse and filter out any null values
    const jobs = jobsData
      .filter(Boolean)
      .map(data => JSON.parse(data as string));
    
    console.log(`[ListJobs] Found ${jobs.length} jobs. First few nextruns:`, 
      jobs.slice(0, 3).map(j => j.nextRun ? new Date(j.nextRun).toISOString() : 'None'));
    
    return jobs;
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
    
    // Calculate next run time directly
    let nextRun;
    try {
      const calculatedNextRun = await getNextRunTime(job.cronExpression);
      // Convert null to undefined if needed
      nextRun = calculatedNextRun !== null ? calculatedNextRun : undefined;
      console.log(`[StartJob] Calculated next run time for job ${id}: ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
    } catch (e) {
      console.error(`[StartJob] Error calculating next run time for job start ${id}:`, e);
    }
    
    // Update job status
    const updatedJob: CronJob = {
      ...job,
      status: 'running',
      updatedAt: Date.now(),
      nextRun: nextRun
    };
    
    console.log(`[StartJob] Starting job ${id} with next run: ${nextRun ? new Date(nextRun).toISOString() : 'None'}`);
    
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
    
    // Force calculate next run time
    let nextRunTime;
    try {
      const calculatedNextRun = await getNextRunTime(job.cronExpression);
      // Convert null to undefined if needed
      nextRunTime = calculatedNextRun !== null ? calculatedNextRun : undefined;
      console.log(`[ExecuteJob] Calculated next run time for job ${id}: ${nextRunTime ? new Date(nextRunTime).toISOString() : 'None'}`);
    } catch (e) {
      console.error(`[ExecuteJob] Error calculating next run time for job ${id}:`, e);
    }
    
    // Update job with execution results
    const updatedJob: CronJob = {
      ...job,
      lastRun: startTime,
      lastRunDuration: duration,
      lastRunStatus: success ? 'success' : 'failure',
      lastRunError: success ? undefined : JSON.stringify(result),
      nextRun: nextRunTime,
      updatedAt: Date.now()
    };
    
    console.log(`[ExecuteJob] Finished executing job ${id}, setting next run: ${nextRunTime ? new Date(nextRunTime).toISOString() : 'None'}`);
    
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
    
    // Also add to the main ping history with source set to 'cron-job'
    const pingRecord = {
      timestamp: startTime,
      executionTime: duration,
      servicesChecked: result.results?.length || 0,
      refreshInterval: result.refreshInterval || 60000,
      nextScheduled: result.nextPing,
      source: 'cron-job',
      runId: id
    };
    
    await client.lPush('ping:history', JSON.stringify(pingRecord));
    await client.lTrim('ping:history', 0, 999); // Keep last 1000 pings
  } catch (error) {
    // Record execution failure
    try {
      // Track execution time for the failed request
      const startTime = Date.now();
      
      // Get the job again (in case it changed during execution)
      const jobData = await client.get(`cron:job:${id}`);
      if (!jobData) {
        return;
      }
      
      const job: CronJob = JSON.parse(jobData);
      
      // Force calculate next run time on failure too
      let nextRunTime;
      try {
        const calculatedNextRun = await getNextRunTime(job.cronExpression);
        // Convert null to undefined if needed
        nextRunTime = calculatedNextRun !== null ? calculatedNextRun : undefined;
        console.log(`[ExecuteJob-Error] Calculated next run time for job ${id} after error: ${nextRunTime ? new Date(nextRunTime).toISOString() : 'None'}`);
      } catch (e) {
        console.error(`[ExecuteJob-Error] Error calculating next run time for job ${id}:`, e);
      }
      
      // Update job with failure details
      const updatedJob: CronJob = {
        ...job,
        lastRun: startTime,
        lastRunStatus: 'failure',
        lastRunError: (error as Error).message,
        nextRun: nextRunTime,
        updatedAt: Date.now()
      };
      
      console.log(`[ExecuteJob-Error] Failed executing job ${id}, setting next run: ${nextRunTime ? new Date(nextRunTime).toISOString() : 'None'}`);
      
      await client.set(`cron:job:${id}`, JSON.stringify(updatedJob));
      
      // Record failure in history
      const historyEntry = {
        timestamp: startTime,
        status: 'failure',
        error: (error as Error).message
      };
      
      await client.lPush(`cron:history:${id}`, JSON.stringify(historyEntry));
      await client.lTrim(`cron:history:${id}`, 0, 99); // Keep last 100 executions
      
      // Also record the failure in main ping history
      const errorPingRecord = {
        timestamp: startTime,
        executionTime: 500, // Use a default value for failed executions
        servicesChecked: 0,
        refreshInterval: job.cronExpression.startsWith('*/') ? parseInt(job.cronExpression.split('/')[1]) * 60 * 1000 : 60000,
        nextScheduled: nextRunTime,
        source: 'cron-job',
        runId: id,
        error: (error as Error).message
      };
      
      await client.lPush('ping:history', JSON.stringify(errorPingRecord));
      await client.lTrim('ping:history', 0, 999); // Keep last 1000 pings
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