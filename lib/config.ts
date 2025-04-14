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
    name: 'Google',
    url: 'https://www.google.com',
    description: 'Google Search Engine'
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    description: 'GitHub Development Platform',
    expectedStatus: 200
  },
  {
    name: 'Example',
    url: 'https://example.com',
    description: 'Example Website'
  },
  {
    name: 'qwertzuksa',
    url: 'https://www.google.com/api/',
    description: 'dwdsads',
    expectedStatus: 200
  }
];

/**
 * General configuration
 */
export const config = {
  siteName: 'OpenUptimes',
  description: 'Service Status Monitor',
  refreshInterval: 60000,
  historyLength: 1440,
  theme: {
    up: '#10b981',
    down: '#ef4444',
    unknown: '#6b7280'
  }
}; 