// Client-side API for cron operations
// This file contains functions that can be safely imported on the client side

export interface CronJob {
  id: string;
  name: string;
  description?: string;
  cronExpression: string;
  status: 'running' | 'stopped' | 'error';
  createdAt: number;
  updatedAt: number;
  lastRun?: number;
  nextRun?: number;
  lastRunDuration?: number;
  lastRunStatus?: 'success' | 'failure';
  lastRunError?: string;
  enabled: boolean;
}

export interface HistoryEntry {
  timestamp: number;
  duration?: number;
  status: 'success' | 'failure';
  error?: string;
}

// Common fetch options to ensure consistent auth handling
const fetchOptions = {
  credentials: 'include' as RequestCredentials,
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  }
};

/**
 * List all cron jobs
 */
export async function listCronJobs(): Promise<CronJob[]> {
  try {
    console.log('Fetching cron jobs...');
    const response = await fetch('/api/ping/cron', {
      ...fetchOptions
    });
    
    if (!response.ok) {
      console.error('Failed to fetch cron jobs:', response.status, response.statusText);
      
      // In development, try to see if we can get the actual error message
      try {
        const errorData = await response.json();
        if (errorData.error) {
          throw new Error(`Failed to fetch cron jobs: ${response.status} ${response.statusText} - ${errorData.error}`);
        }
      } catch (parseError) {
        // Ignore parsing error and use the original error
      }
      
      throw new Error(`Failed to fetch cron jobs: ${response.status} ${response.statusText}`);
    }
    
    const jobs = await response.json();
    
    // Debug logging for next run times
    console.log('[Client] Received jobs with next run times:', 
      jobs.slice(0, 3).map((j: CronJob) => ({
        id: j.id, 
        name: j.name,
        nextRun: j.nextRun ? new Date(j.nextRun).toISOString() : 'None'
      }))
    );
    
    return jobs;
  } catch (error) {
    console.error('Error listing cron jobs:', error);
    throw error; // Re-throw so the UI can handle it
  }
}

/**
 * Get a specific cron job by ID
 */
export async function getCronJob(id: string): Promise<CronJob | null> {
  try {
    const response = await fetch(`/api/ping/cron?id=${id}`, {
      ...fetchOptions
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch job: ${response.status} ${response.statusText}`);
    }
    
    const job = await response.json();
    
    // Debug logging for next run time
    console.log(`[Client] Received job ${id} with next run:`, 
      job.nextRun ? new Date(job.nextRun).toISOString() : 'None'
    );
    
    return job;
  } catch (error) {
    console.error(`Error getting cron job ${id}:`, error);
    return null;
  }
}

/**
 * Get execution history for a specific job
 */
export async function getJobHistory(id: string, limit: number = 20): Promise<HistoryEntry[]> {
  try {
    const response = await fetch(`/api/ping/cron?id=${id}&history=true&limit=${limit}`, {
      ...fetchOptions
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch job history: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data.history || [];
  } catch (error) {
    console.error(`Error getting job history for ${id}:`, error);
    return [];
  }
}

/**
 * Create a new cron job
 */
export async function createCronJob(job: {
  name: string;
  description?: string;
  cronExpression: string;
  enabled: boolean;
}): Promise<CronJob | null> {
  try {
    const response = await fetch('/api/ping/cron', {
      method: 'POST',
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(job),
    });

    if (!response.ok) {
      throw new Error(`Failed to create job: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating cron job:', error);
    return null;
  }
}

/**
 * Update an existing cron job
 */
export async function updateCronJob(id: string, updates: Partial<{
  name: string;
  description: string;
  cronExpression: string;
  enabled: boolean;
}>): Promise<CronJob | null> {
  try {
    const response = await fetch('/api/ping/cron', {
      method: 'PUT',
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, ...updates }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update job: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating cron job ${id}:`, error);
    return null;
  }
}

/**
 * Delete a cron job
 */
export async function deleteCronJob(id: string): Promise<boolean> {
  try {
    const response = await fetch(`/api/ping/cron?id=${id}`, {
      method: 'DELETE',
      ...fetchOptions
    });

    if (!response.ok) {
      throw new Error(`Failed to delete job: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error(`Error deleting cron job ${id}:`, error);
    return false;
  }
}

/**
 * Start a cron job
 */
export async function startJob(id: string): Promise<boolean> {
  try {
    const response = await fetch('/api/ping/cron', {
      method: 'PUT',
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, action: 'start' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start job: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error(`Error starting cron job ${id}:`, error);
    return false;
  }
}

/**
 * Stop a cron job
 */
export async function stopJob(id: string): Promise<boolean> {
  try {
    const response = await fetch('/api/ping/cron', {
      method: 'PUT',
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, action: 'stop' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to stop job: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.success || false;
  } catch (error) {
    console.error(`Error stopping cron job ${id}:`, error);
    return false;
  }
}

/**
 * Validate a cron expression (simple client-side validation)
 */
export function validateCronExpression(expression: string): boolean {
  // Simple validation for standard cron expression
  const regexPattern = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
  return regexPattern.test(expression);
}

/**
 * Client-side implementation to estimate the next run time for a cron expression
 * This is a simplified version that works for common patterns
 */
export function getNextRunTime(cronExpression: string): number | null {
  try {
    if (!validateCronExpression(cronExpression)) {
      return null;
    }
    
    const now = new Date();
    const parts = cronExpression.split(' ');
    const [minutePart, hourPart, dayOfMonthPart, monthPart, dayOfWeekPart] = parts;
    
    // Create a new date starting from now
    const nextDate = new Date(now);
    
    // Handle simple */n minute patterns (most common)
    if (minutePart.startsWith('*/')) {
      const interval = parseInt(minutePart.substring(2));
      const currentMinute = now.getMinutes();
      const currentSecond = now.getSeconds();
      
      // Calculate next minute that matches the pattern
      const remainder = currentMinute % interval;
      let nextMinute = currentMinute + (remainder === 0 ? interval : interval - remainder);
      
      // Adjust for current seconds - if we're already in the current minute and have passed some seconds
      if (remainder === 0 && currentSecond > 0) {
        nextMinute = currentMinute + interval;
      }
      
      // Handle minute overflow
      if (nextMinute >= 60) {
        nextDate.setHours(now.getHours() + 1);
        nextDate.setMinutes(nextMinute - 60);
      } else {
        nextDate.setMinutes(nextMinute);
      }
      
      nextDate.setSeconds(0);
      nextDate.setMilliseconds(0);
      
      return nextDate.getTime();
    }
    
    // For more complex patterns, we'll do a more brute force approximation
    // This is much simpler than a full cron parser
    
    // Start at the current minute
    nextDate.setSeconds(0);
    nextDate.setMilliseconds(0);
    
    // Try the next 1440 minutes (24 hours) to find a match
    for (let i = 0; i < 1440; i++) {
      const minute = nextDate.getMinutes();
      const hour = nextDate.getHours();
      const dayOfMonth = nextDate.getDate();
      const month = nextDate.getMonth() + 1; // JavaScript months are 0-based
      const dayOfWeek = nextDate.getDay(); // 0 is Sunday in JavaScript
      
      // Check if current time matches the cron pattern
      const minuteMatch = matchCronPart(minute, minutePart);
      const hourMatch = matchCronPart(hour, hourPart);
      const dayOfMonthMatch = matchCronPart(dayOfMonth, dayOfMonthPart);
      const monthMatch = matchCronPart(month, monthPart);
      const dayOfWeekMatch = matchCronPart(dayOfWeek, dayOfWeekPart);
      
      if (minuteMatch && hourMatch && dayOfMonthMatch && monthMatch && dayOfWeekMatch) {
        return nextDate.getTime();
      }
      
      // Move to the next minute
      nextDate.setMinutes(nextDate.getMinutes() + 1);
    }
    
    return null;
  } catch (error) {
    console.error('Error calculating next run time:', error);
    return null;
  }
}

/**
 * Helper function to match a value against a cron part
 */
function matchCronPart(value: number, cronPart: string): boolean {
  // Handle the simple cases
  if (cronPart === '*') {
    return true;
  }
  
  if (!isNaN(parseInt(cronPart)) && parseInt(cronPart) === value) {
    return true;
  }
  
  // Handle */n pattern
  if (cronPart.startsWith('*/')) {
    const divisor = parseInt(cronPart.substring(2));
    return value % divisor === 0;
  }
  
  // Handle comma-separated values
  if (cronPart.includes(',')) {
    return cronPart.split(',').map(Number).includes(value);
  }
  
  // Handle ranges (e.g., 1-5)
  if (cronPart.includes('-')) {
    const [start, end] = cronPart.split('-').map(Number);
    return value >= start && value <= end;
  }
  
  return false;
}

/**
 * Describe a cron expression in human-readable terms
 */
export function describeCronExpression(expression: string): string {
  try {
    // Basic description for common patterns
    if (expression === '* * * * *') return 'Every minute';
    if (expression.match(/^\*\/(\d+) \* \* \* \*$/)) {
      const match = expression.match(/^\*\/(\d+) \* \* \* \*$/);
      const minutes = match?.[1];
      return `Every ${minutes} minute${Number(minutes) > 1 ? 's' : ''}`;
    }
    if (expression.match(/^0 \*\/(\d+) \* \* \*$/)) {
      const match = expression.match(/^0 \*\/(\d+) \* \* \*$/);
      const hours = match?.[1];
      return `Every ${hours} hour${Number(hours) > 1 ? 's' : ''}`;
    }
    if (expression.match(/^0 0 \* \* \*$/)) return 'Daily at midnight';
    if (expression.match(/^0 0 \* \* 0$/)) return 'Weekly on Sunday at midnight';
    
    return expression;
  } catch (err) {
    return expression;
  }
}

/**
 * Calculate the next run time for a cron expression using the server
 * This uses the more accurate implementation
 */
export async function getNextRunTimeFromServer(cronExpression: string): Promise<number | null> {
  try {
    if (!validateCronExpression(cronExpression)) {
      console.log('[Client] Invalid cron expression:', cronExpression);
      return null;
    }
    
    console.log('[Client] Requesting next run time for:', cronExpression);
    
    const response = await fetch('/api/ping/cron/next-run', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cronExpression }),
    });

    if (!response.ok) {
      throw new Error(`Failed to calculate next run time: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('[Client] Received next run time:', 
      data.nextRun ? new Date(data.nextRun).toISOString() : 'None'
    );
    
    return data.nextRun;
  } catch (error) {
    console.error('Error calculating next run time from server:', error);
    // Fall back to client-side calculation
    return getNextRunTime(cronExpression);
  }
} 