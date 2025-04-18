// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Ensure REDIS_URL is available
if (!process.env.REDIS_URL) {
  console.error('REDIS_URL environment variable is not set in .env.local');
  process.exit(1);
}

import { getRedisClient, appendServiceHistory, ServiceStatus, closeRedisConnection } from '../lib/redis';

/**
 * Probability distribution for downtime events per week
 * Most services experience 0-2 downtimes per week
 */
const DOWNTIME_FREQUENCY = [
  { count: 0, probability: 0.40 }, // 40% chance of no downtime
  { count: 1, probability: 0.30 }, // 30% chance of 1 downtime
  { count: 2, probability: 0.20 }, // 20% chance of 2 downtimes
  { count: 3, probability: 0.07 }, // 7% chance of 3 downtimes
  { count: 4, probability: 0.03 }  // 3% chance of 4 downtimes
];

/**
 * Probability distribution for downtime duration in minutes
 * Most downtimes are brief (1-10 minutes)
 */
const DOWNTIME_DURATION = [
  { minutes: 1, probability: 0.15 },    // 15% chance of 1 minute
  { minutes: 2, probability: 0.20 },    // 20% chance of 2 minutes
  { minutes: 5, probability: 0.25 },    // 25% chance of 5 minutes
  { minutes: 10, probability: 0.20 },   // 20% chance of 10 minutes
  { minutes: 15, probability: 0.10 },   // 10% chance of 15 minutes
  { minutes: 30, probability: 0.05 },   // 5% chance of 30 minutes
  { minutes: 60, probability: 0.03 },   // 3% chance of 1 hour
  { minutes: 120, probability: 0.02 }   // 2% chance of 2 hours
];

/**
 * Generate random HTTP error status code with realistic distribution
 */
function generateErrorStatusCode(): number {
  const codes = [
    // 4xx client errors (less common for outages)
    400, 401, 403, 404, 408, 429,
    // 5xx server errors (more common for outages)
    500, 501, 502, 503, 504
  ];
  
  // Weight towards server errors (80% chance)
  if (Math.random() < 0.8) {
    return codes[Math.floor(Math.random() * 5) + 6]; // 5xx range
  }
  
  return codes[Math.floor(Math.random() * 6)]; // 4xx range
}

/**
 * Generate a realistic error message based on status code
 */
function generateErrorMessage(statusCode: number): string {
  const serverErrors = [
    'Internal Server Error',
    'Service Unavailable',
    'Gateway Timeout',
    'Bad Gateway',
    'Server overloaded',
    'Database connection failed',
    'Upstream service error',
    'Memory limit exceeded',
    'Request timed out'
  ];
  
  const clientErrors = [
    'Not Found',
    'Unauthorized',
    'Forbidden',
    'Bad Request',
    'Request Timeout',
    'Too Many Requests'
  ];
  
  const connectionErrors = [
    'Connection refused',
    'Connection reset',
    'SSL handshake failed',
    'Network unreachable',
    'DNS resolution failed',
    'TLS handshake timeout'
  ];
  
  // If status code is in 5xx range
  if (statusCode >= 500) {
    return serverErrors[Math.floor(Math.random() * serverErrors.length)];
  }
  
  // If status code is in 4xx range
  if (statusCode >= 400) {
    return clientErrors[Math.floor(Math.random() * clientErrors.length)];
  }
  
  // For others, return a connection-related error
  return connectionErrors[Math.floor(Math.random() * connectionErrors.length)];
}

/**
 * Select a random item from a weighted distribution
 */
function selectFromDistribution<T extends { probability: number }>(distribution: T[]): T {
  const random = Math.random();
  let cumulativeProbability = 0;
  
  for (const item of distribution) {
    cumulativeProbability += item.probability;
    if (random < cumulativeProbability) {
      return item;
    }
  }
  
  // Fallback to last item
  return distribution[distribution.length - 1];
}

/**
 * Determines how many downtime events to generate for a week
 */
function getDowntimeEventsCount(): number {
  const selected = selectFromDistribution(DOWNTIME_FREQUENCY);
  return selected.count;
}

/**
 * Determines the duration of a downtime event in minutes
 */
function getDowntimeDuration(): number {
  const selected = selectFromDistribution(DOWNTIME_DURATION);
  return selected.minutes;
}

/**
 * Generate a specific date during the week
 * dayOfWeek: 0-6 (Sunday-Saturday)
 * hourOfDay: 0-23
 */
function generateTimestampInWeek(
  weekStartDate: Date,
  dayOfWeek: number,
  hourOfDay: number
): number {
  const date = new Date(weekStartDate);
  date.setDate(date.getDate() + dayOfWeek);
  date.setHours(hourOfDay, Math.floor(Math.random() * 60), 0, 0);
  return date.getTime();
}

/**
 * Generate downtime events for a service over a week
 */
async function generateDowntimeForService(
  serviceName: string,
  weekStartDate: Date
): Promise<void> {
  const numEvents = getDowntimeEventsCount();
  if (numEvents === 0) {
    console.log(`No downtime events for ${serviceName} this week`);
    return;
  }
  
  console.log(`Generating ${numEvents} downtime events for ${serviceName}`);
  
  // Generate random days and times for the events
  // Avoid overlapping events
  const downtimeEvents = [];
  
  for (let i = 0; i < numEvents; i++) {
    // Random day of week (0-6)
    const dayOfWeek = Math.floor(Math.random() * 7);
    
    // Time more likely during business hours (8-18) or night (0-5)
    let hourOfDay;
    const timePattern = Math.random();
    if (timePattern < 0.6) {
      // Business hours (60% chance)
      hourOfDay = Math.floor(Math.random() * 11) + 8; // 8-18
    } else if (timePattern < 0.9) {
      // Night hours (30% chance)
      hourOfDay = Math.floor(Math.random() * 6); // 0-5
    } else {
      // Evening hours (10% chance)
      hourOfDay = Math.floor(Math.random() * 5) + 19; // 19-23
    }
    
    const startTimestamp = generateTimestampInWeek(weekStartDate, dayOfWeek, hourOfDay);
    const durationMinutes = getDowntimeDuration();
    const endTimestamp = startTimestamp + (durationMinutes * 60 * 1000);
    
    downtimeEvents.push({
      start: startTimestamp,
      end: endTimestamp,
      duration: durationMinutes
    });
  }
  
  // Sort events by start time
  downtimeEvents.sort((a, b) => a.start - b.start);
  
  // Add to history
  for (const event of downtimeEvents) {
    // Generate "down" status
    const errorCode = generateErrorStatusCode();
    const downStatus: ServiceStatus = {
      status: 'down',
      timestamp: event.start,
      responseTime: Math.floor(Math.random() * 3000) + 2000, // 2000-5000ms
      statusCode: errorCode,
      error: generateErrorMessage(errorCode)
    };
    
    // Generate "up" status when service recovers
    const upStatus: ServiceStatus = {
      status: 'up',
      timestamp: event.end,
      responseTime: Math.floor(Math.random() * 400) + 100, // 100-500ms
      statusCode: 200
    };
    
    // Add to history (in chronological order - older first)
    await appendServiceHistory(serviceName, downStatus);
    await appendServiceHistory(serviceName, upStatus);
    
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    console.log(`  Event: ${startDate.toLocaleString()} - ${endDate.toLocaleString()} (${event.duration} minutes)`);
  }
}

/**
 * Generate realistic downtime for all services
 */
async function generateRealisticDowntime() {
  console.log('Starting to generate realistic downtime for all services...');
  
  try {
    const client = await getRedisClient();
    
    // Get all services
    const servicesJson = await client.get('config:services');
    if (!servicesJson) {
      console.error('No services found in Redis');
      return;
    }
    
    const services = JSON.parse(servicesJson);
    console.log(`Found ${services.length} services`);
    
    // Generate downtime for past weeks (4 weeks)
    const now = new Date();
    const weeksToGenerate = 4;
    
    for (let week = 0; week < weeksToGenerate; week++) {
      // Calculate week start (Sunday)
      const weekStartDate = new Date(now);
      weekStartDate.setDate(weekStartDate.getDate() - (weekStartDate.getDay() + (7 * week)));
      weekStartDate.setHours(0, 0, 0, 0);
      
      console.log(`\nGenerating downtime for week ${week + 1}: ${weekStartDate.toDateString()}`);
      
      // Process each service
      for (const service of services) {
        await generateDowntimeForService(service.name, weekStartDate);
      }
    }
    
    console.log('\nDowntime generation completed successfully');
    await closeRedisConnection();
    
  } catch (error) {
    console.error('Error generating realistic downtime:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
generateRealisticDowntime(); 