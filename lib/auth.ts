import { getAdminPassword, isSessionValid } from './redis';

/**
 * Generate a secure password hash with salt
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate a random salt
  const salt = generateRandomString(16);
  
  // Hash the password with the salt
  const hash = await sha256(password + salt);
  
  return `${hash}:${salt}`;
}

/**
 * Verify a password against a stored hash
 */
export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  try {
    if (!storedHash) {
      // If no hash stored, try to get it from Redis
      console.log('No hash provided, fetching from Redis');
      storedHash = await getAdminPassword();
      if (!storedHash) {
        console.error('No admin password hash found in Redis');
        return false;
      }
    }
    
    if (!storedHash.includes(':')) {
      console.error('Invalid hash format (missing salt separator)');
      return false;
    }
    
    const [hash, salt] = storedHash.split(':');
    
    if (!hash || !salt) {
      console.error('Invalid hash or salt extracted from stored hash');
      return false;
    }
    
    const testHash = await sha256(password + salt);
    const isValid = hash === testHash;
    
    console.log('Password verification result:', isValid);
    return isValid;
  } catch (error) {
    console.error('Error in password verification:', error);
    return false;
  }
}

/**
 * Generate a simple session token
 */
export function generateSessionToken(): string {
  return generateRandomString(32);
}

/**
 * Parse a token from a cookie string
 */
export function parseTokenFromCookie(cookieStr?: string): string | null {
  if (!cookieStr) return null;
  
  const match = cookieStr.match(/authToken=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Generate a random string (hex)
 */
function generateRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  
  if (typeof window === 'undefined') {
    // Server-side: Use Node.js crypto (only in API routes, not middleware)
    // This will only be used in API routes which run on the server
    // Using dynamic import for server-side only code
    const crypto = require('node:crypto');
    const randomBytesBuffer = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      bytes[i] = randomBytesBuffer[i];
    }
  } else {
    // Client-side: Use Web Crypto API
    crypto.getRandomValues(bytes);
  }
  
  // Convert to hex string
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * SHA-256 hash function (works in both browser and Edge)
 */
async function sha256(message: string): Promise<string> {
  // Use TextEncoder to convert string to Uint8Array
  const msgUint8 = new TextEncoder().encode(message);
  
  // Hash the message
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  
  // Convert ArrayBuffer to Array
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Convert bytes to hex string
  const hashHex = hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  return hashHex;
}

/**
 * Authenticate admin user from request
 * Validates the session token from cookies
 */
export async function authenticateAdmin(request: Request): Promise<boolean> {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (!token) {
      console.log('No auth token found in cookies');
      return false;
    }
    
    // Check if session exists in Redis
    const valid = await isSessionValid(token);
    
    if (!valid) {
      console.log('Invalid or expired session token');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Admin authentication error:', error);
    return false;
  }
} 