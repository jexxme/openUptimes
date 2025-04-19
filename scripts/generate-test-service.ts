// Load environment variables
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Ensure REDIS_URL is available
if (!process.env.REDIS_URL) {

  process.exit(1);
}

import { getRedisClient, appendServiceHistory, ServiceStatus, closeRedisConnection } from '../lib/redis';

// Test service configuration
const TEST_SERVICE = {
  name: 'Test Service',
  url: 'https://test-service.example.com',
  description: 'Mock service with fluctuating uptime for testing',
};

/**
 * Generates a random uptime percentage for a day (0-100%)
 */
function generateDailyUptimePercentage(): number {
  // Creates a wider distribution of values between 0-100%
  return Math.floor(Math.random() * 101);
}

/**
 * Generates a random time offset within a day (in milliseconds)
 */
function generateRandomTimeInDay(): number {
  // Random time within a day (0-24 hours in milliseconds)
  return Math.floor(Math.random() * 24 * 60 * 60 * 1000);
}

/**
 * Generate between 5-20 data points for a specific day
 */
function generateDataPointsForDay(
  timestamp: number, 
  uptimePercentage: number
): ServiceStatus[] {
  const dataPoints: ServiceStatus[] = [];
  const pointsCount = Math.floor(Math.random() * 16) + 5; // 5-20 points per day
  
  // Start of the day timestamp
  const dayStart = new Date(timestamp);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  
  // Pre-generate time offsets for each data point to ensure they don't overlap
  const timeOffsets: number[] = [];
  for (let i = 0; i < pointsCount; i++) {
    timeOffsets.push(generateRandomTimeInDay());
  }
  
  // Sort time offsets to maintain chronological order
  timeOffsets.sort((a, b) => a - b);
  
  // Create data points for the day
  for (let i = 0; i < pointsCount; i++) {
    const pointTimestamp = dayStartMs + timeOffsets[i];
    
    // Determine if this point should be up or down based on the day's uptime percentage
    // The higher the day's uptime percentage, the more likely a point is "up"
    const isUp = Math.random() * 100 < uptimePercentage;
    
    // Create status data
    const statusData: ServiceStatus = {
      status: isUp ? 'up' : 'down',
      timestamp: pointTimestamp,
      responseTime: isUp
        ? Math.floor(Math.random() * 500) + 100 // 100-600ms for up status
        : Math.floor(Math.random() * 3000) + 2000, // 2000-5000ms for down status
      statusCode: isUp ? 200 : generateErrorStatusCode()
    };
    
    // Add error message for down status
    if (!isUp) {
      statusData.error = generateErrorMessage(statusData.statusCode);
    }
    
    dataPoints.push(statusData);
  }
  
  return dataPoints;
}

/**
 * Generate a realistic HTTP error status code
 */
function generateErrorStatusCode(): number {
  const codes = [
    // 4xx client errors
    400, 401, 403, 404, 408, 429,
    // 5xx server errors (more common for outages)
    500, 501, 502, 503, 504
  ];
  
  // Weight towards server errors (70% chance)
  if (Math.random() < 0.7) {
    return codes[Math.floor(Math.random() * 5) + 6]; // 5xx range
  }
  
  return codes[Math.floor(Math.random() * 6)]; // 4xx range
}

/**
 * Generate a realistic error message based on status code
 */
function generateErrorMessage(statusCode?: number): string {
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
  if (statusCode && statusCode >= 500) {
    return serverErrors[Math.floor(Math.random() * serverErrors.length)];
  }
  
  // If status code is in 4xx range
  if (statusCode && statusCode >= 400) {
    return clientErrors[Math.floor(Math.random() * clientErrors.length)];
  }
  
  // For others, return a connection-related error
  return connectionErrors[Math.floor(Math.random() * connectionErrors.length)];
}

/**
 * Add test service to the services list
 */
async function addTestService(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    
    // Get existing services
    const servicesJson = await client.get('config:services');
    const services = servicesJson ? JSON.parse(servicesJson) : [];
    
    // Check if test service already exists
    const existingIndex = services.findIndex((s: any) => s.name === TEST_SERVICE.name);
    if (existingIndex >= 0) {
      // Update existing service
      services[existingIndex] = TEST_SERVICE;
    } else {
      // Add new service
      services.push(TEST_SERVICE);
    }
    
    // Save updated services
    await client.set('config:services', JSON.stringify(services));
    
    return true;
  } catch (error) {

    return false;
  }
}

/**
 * Ping the service API to trigger a status check for the test service
 */
async function pingService(): Promise<void> {
  try {
    // Get current domain
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const domain = process.env.VERCEL_URL || 'localhost:3000';
    
    // Ping the API to trigger a check
    const response = await fetch(`${protocol}://${domain}/api/ping?action=start`, {
      method: 'GET',
      headers: {
        'User-Agent': 'OpenUptimes Test Service Generator'
      }
    });
    
    const data = await response.json();

  } catch (error) {

  }
}

/**
 * Generate test service with fluctuating uptime data
 */
async function generateTestServiceData() {

  try {
    // Get Redis client
    const client = await getRedisClient();
    
    // Add or update test service
    const serviceAdded = await addTestService();




    
    // Clear existing history data
    await client.del(`history:${TEST_SERVICE.name}`);

    // Generate data for the last 90 days
    const daysToGenerate = 90;
    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    
    // For each day, generate a random uptime percentage (0-100%)
    // Then generate 5-20 random data points with status based on that percentage
    for (let day = 0; day < daysToGenerate; day++) {
      // Calculate day timestamp
      const dayTimestamp = now - (day * millisecondsPerDay);
      
      // Generate random uptime percentage for this day (0-100%)
      const uptimePercentage = generateDailyUptimePercentage();

      // Generate data points for this day
      const dataPoints = generateDataPointsForDay(dayTimestamp, uptimePercentage);
      
      // Store data points in Redis (in reverse chronological order)
      for (let i = dataPoints.length - 1; i >= 0; i--) {
        await appendServiceHistory(TEST_SERVICE.name, dataPoints[i]);
      }

    }

    // Update current status with the most recent status
    const latestHistory = await client.lRange(`history:${TEST_SERVICE.name}`, 0, 0);
    if (latestHistory && latestHistory.length > 0) {
      await client.set(`status:${TEST_SERVICE.name}`, latestHistory[0]);

    }
    
    // Ping the service to trigger a status check
    await pingService();

    await closeRedisConnection();
    
  } catch (error) {

  } finally {
    process.exit(0);
  }
}

// Run the script
generateTestServiceData(); 