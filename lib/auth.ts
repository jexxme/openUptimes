import { getAdminPassword, isSessionValid } from './redis';

/**
 * AuthProvider interface - to be implemented by different auth methods
 */
export interface AuthProvider {
  type: string;
  verify(credentials: any): Promise<boolean>;
  getUserInfo?(): Promise<any>;
}

/**
 * Default password-based authentication provider
 */
export class PasswordAuthProvider implements AuthProvider {
  type = 'password';
  
  async verify(credentials: { password: string }): Promise<boolean> {
    const { password } = credentials;
    if (!password) return false;
    return verifyPassword(password);
  }
}

/**
 * Factory to create auth providers (for future expansion)
 */
export function createAuthProvider(type: string = 'password'): AuthProvider {
  switch (type) {
    case 'password':
      return new PasswordAuthProvider();
    // Future providers can be added here:
    // case 'oauth':
    //   return new OAuthProvider(config);
    // case 'sso':
    //   return new SSOProvider(config);
    default:
      return new PasswordAuthProvider();
  }
}

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

      storedHash = await getAdminPassword();
      if (!storedHash) {

        return false;
      }
    }
    
    if (!storedHash.includes(':')) {

      return false;
    }
    
    const [hash, salt] = storedHash.split(':');
    
    if (!hash || !salt) {

      return false;
    }
    
    const testHash = await sha256(password + salt);
    const isValid = hash === testHash;

    return isValid;
  } catch (error) {

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
 * Authentication result containing token and optional user info
 */
export interface AuthResult {
  success: boolean;
  token?: string;
  userInfo?: any;
  error?: string;
}

/**
 * Authenticate a user with credentials and provider type
 */
export async function authenticate(
  credentials: any, 
  providerType: string = 'password'
): Promise<AuthResult> {
  try {
    const provider = createAuthProvider(providerType);
    const isValid = await provider.verify(credentials);
    
    if (!isValid) {
      return { 
        success: false,
        error: 'Invalid credentials'
      };
    }
    
    // Generate session token
    const token = generateSessionToken();
    
    // Get user info if provider supports it
    let userInfo = undefined;
    if (provider.getUserInfo) {
      userInfo = await provider.getUserInfo();
    }
    
    return {
      success: true,
      token,
      userInfo
    };
  } catch (error) {

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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

      return false;
    }
    
    // Check if session exists in Redis
    const valid = await isSessionValid(token);
    
    if (!valid) {

      return false;
    }
    
    return true;
  } catch (error) {

    return false;
  }
} 