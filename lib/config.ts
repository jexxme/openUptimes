/**
 * Configuration for services to monitor
 */
export type ServiceConfig = {
  name: string;
  url: string;
  description?: string;
  expectedStatus?: number;
  visible?: boolean;
}

/**
 * List of services to monitor
 */
export const services: ServiceConfig[] = [
  {
    name: 'Google',
    url: 'https://www.google.com',
    description: 'Google Search Engine',
    visible: true
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    description: 'GitHub Development Platform',
    expectedStatus: 200,
    visible: true
  },
  {
    name: 'Example',
    url: 'https://example.com',
    description: 'Example Website',
    visible: true
  }
];

/**
 * General configuration
 */
export const config = {
  refreshInterval: 60000,
  historyLength: 1440,
  theme: {
    up: '#10b981',
    down: '#ef4444',
    unknown: '#6b7280'
  },
  statusPage: {
    enabled: true,
    title: 'Service Status',
    description: 'Current status of our services'
  }
}; 