/**
 * Configuration for services to monitor
 */
export type ServiceConfig = {
  name: string;
  url: string;
  description?: string;
  expectedStatus?: number;
}

/**
 * List of services to monitor
 */
export const services: ServiceConfig[] = [
  { 
    name: "Website", 
    url: "https://example.com",
    description: "Main website" 
  },
  { 
    name: "API", 
    url: "https://api.example.com",
    description: "API endpoints",
    expectedStatus: 200
  }
];

/**
 * General configuration
 */
export const config = {
  siteName: "OpenUptimes",
  description: "Service Status Monitor",
  refreshInterval: 60000, // Default 1 minute refresh rate in milliseconds
  historyLength: 1440,    // Keep 24 hours of history (at 1-minute intervals)
  theme: {
    up: "#10b981",        // Green color for up status
    down: "#ef4444",      // Red color for down status
    unknown: "#6b7280",   // Gray color for unknown status
  }
}; 