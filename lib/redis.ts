import { kv } from '@vercel/kv';

/**
 * Helper function to get a status of a service
 */
export async function getServiceStatus(name: string) {
  try {
    const status = await kv.get(`status:${name}`);
    return status;
  } catch (error) {
    console.error(`Error fetching status for ${name}:`, error);
    return null;
  }
}

/**
 * Helper function to set the status of a service
 */
export async function setServiceStatus(name: string, data: any) {
  try {
    await kv.set(`status:${name}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error setting status for ${name}:`, error);
    return false;
  }
}

/**
 * Helper function to append to history and maintain its size
 */
export async function appendServiceHistory(name: string, data: any) {
  try {
    await kv.lpush(`history:${name}`, JSON.stringify(data));
    // Trim history to last 1440 entries (24h at 1-min intervals)
    await kv.ltrim(`history:${name}`, 0, 1439);
    return true;
  } catch (error) {
    console.error(`Error appending history for ${name}:`, error);
    return false;
  }
}

/**
 * Helper function to get service history
 */
export async function getServiceHistory(name: string, limit: number = 1440) {
  try {
    const history = await kv.lrange(`history:${name}`, 0, limit - 1);
    return history.map(item => typeof item === 'string' ? JSON.parse(item) : item);
  } catch (error) {
    console.error(`Error fetching history for ${name}:`, error);
    return [];
  }
} 