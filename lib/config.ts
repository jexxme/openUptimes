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
    name: 'Googledsdsdsyxyxy',
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
    name: 'Non-existent site',
    url: 'https://this-site-does-not-exist-123456789.com',
    description: 'Example of a down service'
  }
];

/**
 * General configuration
 */
export const config = {
  siteName: 'OpenUptimessasaee',
  description: 'Service Status Monitor',
  refreshInterval: 60000,
  historyLength: 1440,
  theme: {
    up: '#10b981',
    down: '#ef4444',
    unknown: '#6b7280'
  }
}; 