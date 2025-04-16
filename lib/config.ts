/**
 * Configuration for services to monitor
 */
export type ServiceConfig = {
  name: string;
  url: string;
  description?: string;
  expectedStatus?: number;
  visible?: boolean;
  isDeleted?: boolean;
}

/**
List of example services to monitor after setup
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
  }
];

/**
 * General configuration
 */
export const config = {
  refreshInterval: 60000,
  siteName: 'OpenUptimes',
  statusPage: {
    enabled: true,
    title: 'Service Status',
    description: 'Current status of our services'
  }
}; 