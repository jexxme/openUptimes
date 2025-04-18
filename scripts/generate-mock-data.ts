// Load environment variables
import * as dotenv from 'dotenv';
import path from 'path';

// Try to load environment from .env.local first, then fall back to .env
const envPath = process.env.ENV_PATH || '.env.local';
console.log(`Loading environment from: ${envPath}`);
dotenv.config({ path: envPath });

// Ensure REDIS_URL is available
if (!process.env.REDIS_URL) {
  console.error(`REDIS_URL environment variable is not set in ${envPath}`);
  console.log('Please make sure you have set up your environment variables correctly.');
  console.log('You can create a .env.local file based on the .env.example template.');
  process.exit(1);
}

import { getRedisClient, appendServiceHistory, ServiceStatus, closeRedisConnection } from '../lib/redis';

/**
 * Generate mock history data for services with realistic outage patterns
 */
async function generateMockData() {
  console.log('Starting to generate mock history data...');
  
  try {
    // Get all services from Redis
    const client = await getRedisClient();
    const servicesJson = await client.get('config:services');
    
    if (!servicesJson) {
      console.error('No services found in Redis. Please add services first.');
      return;
    }
    
    const services = JSON.parse(servicesJson);
    console.log(`Found ${services.length} services to generate history for.`);
    
    // Define parameters for mock data
    const daysToGenerate = 90;
    const entriesPerDay = 24; // One entry per hour
    const now = Date.now();
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    const millisecondsPerEntry = millisecondsPerDay / entriesPerDay;
    
    // First, clear existing history data for all services
    console.log('Clearing existing history data...');
    for (const service of services) {
      await client.del(`history:${service.name}`);
      console.log(`Cleared history for ${service.name}`);
    }
    
    // Iterate through each service
    for (const service of services) {
      console.log(`Generating mock data for service: ${service.name}`);
      
      // Create outage patterns - days when outages will occur
      const outagePatterns = generateOutagePatterns(daysToGenerate);
      
      let count = 0;
      // For each day
      for (let day = 0; day < daysToGenerate; day++) {
        // Check if this is an outage day
        const hasOutage = outagePatterns.some(pattern => 
          day >= pattern.startDay && day <= pattern.endDay
        );
        
        // Calculate active outage hours if this is an outage day
        const outageHours = hasOutage ? generateOutageHours(outagePatterns, day) : [];
        
        // For each entry in the day
        for (let hour = 0; hour < entriesPerDay; hour++) {
          // Calculate timestamp for this entry
          const timestamp = now - (day * millisecondsPerDay) - (hour * millisecondsPerEntry);
          
          // Determine if this specific hour has an outage
          const isOutageHour = outageHours.includes(hour);
          
          // Add some randomness - even on non-outage days, very rarely have an outage (0.5% chance)
          const randomOutage = Math.random() < 0.005;
          
          // Service is down if it's in an outage hour or randomly down
          const status = isOutageHour || randomOutage ? 'down' : 'up';
          
          // Generate random response time between 100ms and 2000ms
          // For down status, usually higher response times
          const responseTime = status === 'down' 
            ? Math.floor(Math.random() * 5000) + 2000 // 2-7s for down status
            : Math.floor(Math.random() * 1900) + 100; // 100-2000ms for up status
          
          // Create mock status data
          const statusData: ServiceStatus = {
            status,
            timestamp,
            responseTime,
            statusCode: status === 'up' ? 200 : generateErrorStatusCode()
          };
          
          // If status is down, add a random error message
          if (status === 'down') {
            statusData.error = generateErrorMessage(statusData.statusCode);
          }
          
          // Append to service history
          await appendServiceHistory(service.name, statusData);
          count++;
        }
      }
      
      console.log(`Generated ${count} history entries for ${service.name}`);
    }
    
    console.log('Mock data generation completed successfully.');
    await closeRedisConnection();
    
  } catch (error) {
    console.error('Error generating mock data:', error);
  } finally {
    process.exit(0);
  }
}

/**
 * Generate outage patterns - periods when outages will occur
 */
function generateOutagePatterns(totalDays: number) {
  const patterns = [];
  
  // Major outage - longer duration (4-24 hours), happens 1-2 times
  const majorOutageCount = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < majorOutageCount; i++) {
    const startDay = Math.floor(Math.random() * totalDays);
    // Duration is same day
    patterns.push({
      type: 'major',
      startDay,
      endDay: startDay,
      // 4-24 hours of outage
      hours: Array.from({ length: Math.floor(Math.random() * 20) + 4 }, () => 
        Math.floor(Math.random() * 24)
      )
    });
  }
  
  // Minor outages - shorter duration (1-3 hours), happens 3-7 times
  const minorOutageCount = Math.floor(Math.random() * 5) + 3;
  for (let i = 0; i < minorOutageCount; i++) {
    const startDay = Math.floor(Math.random() * totalDays);
    patterns.push({
      type: 'minor',
      startDay,
      endDay: startDay,
      // 1-3 hours of outage
      hours: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, () => 
        Math.floor(Math.random() * 24)
      )
    });
  }
  
  // Brief blips - very short (1 hour), happens 10-20 times
  const blipCount = Math.floor(Math.random() * 10) + 10;
  for (let i = 0; i < blipCount; i++) {
    const startDay = Math.floor(Math.random() * totalDays);
    patterns.push({
      type: 'blip',
      startDay,
      endDay: startDay,
      // Just 1 hour
      hours: [Math.floor(Math.random() * 24)]
    });
  }
  
  return patterns;
}

/**
 * Get outage hours for a specific day
 */
function generateOutageHours(patterns: any[], day: number) {
  const relevantPatterns = patterns.filter(p => day >= p.startDay && day <= p.endDay);
  const hours = new Set<number>();
  
  for (const pattern of relevantPatterns) {
    for (const hour of pattern.hours) {
      hours.add(hour);
    }
  }
  
  return Array.from(hours);
}

/**
 * Generate a realistic HTTP error status code
 */
function generateErrorStatusCode() {
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
function generateErrorMessage(statusCode?: number) {
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

// Run the function
generateMockData(); 