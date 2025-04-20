import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/auth';
import { storeSession, getRedisClient } from '../../../../lib/redis';

// Maximum number of failed attempts before locking out
const MAX_FAILED_ATTEMPTS = 5;
// Lock duration in seconds (30 minutes)
const LOCK_DURATION = 30 * 60;

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const client = await getRedisClient();
    const key = `ratelimit:login:${ip}`;
    
    // Get current attempts
    const attempts = await client.get(key);
    const failedAttempts = attempts ? parseInt(attempts, 10) : 0;
    
    // Check if too many attempts
    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      // Get time to wait before next attempt
      const ttl = await client.ttl(key);
      if (ttl > 0) {
        return { allowed: false, retryAfter: ttl };
      }
    }
    
    return { allowed: true };
  } catch (error) {

    // Default to allowing the request if Redis fails
    return { allowed: true };
  }
}

async function recordFailedAttempt(ip: string): Promise<void> {
  try {
    const client = await getRedisClient();
    const key = `ratelimit:login:${ip}`;
    
    // Get current attempts
    const attempts = await client.get(key);
    const failedAttempts = attempts ? parseInt(attempts, 10) : 0;
    
    // Increment failed attempts
    await client.set(key, (failedAttempts + 1).toString());
    
    // Set expiry with progressive backoff
    // Exponential backoff: first failure 10s, then 20s, 40s, etc. up to LOCK_DURATION
    const expiry = Math.min(10 * Math.pow(2, failedAttempts), LOCK_DURATION);
    await client.expire(key, expiry);
  } catch (error) {

  }
}

async function resetFailedAttempts(ip: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(`ratelimit:login:${ip}`);
  } catch (error) {

  }
}

// Login endpoint
export async function POST(request: NextRequest) {
  console.log('Login request received');
  
  try {
    // Parse request body
    const body = await request.json();
    const { password } = body;
    
    if (!password) {
      console.error('Login attempt with missing password');
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    console.log('Authenticating user...');
    
    // Authenticate user
    const authResult = await authenticate({ password });
    
    if (!authResult.success || !authResult.token) {
      console.error('Authentication failed');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    console.log('Authentication successful, storing session');
    
    // Store session in Redis (default 24h expiry)
    const sessionStored = await storeSession(authResult.token);
    
    if (!sessionStored) {
      console.error('Failed to store session');
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    console.log('Session stored successfully');
    
    // Set cookie for the browser
    const cookieMaxAge = 24 * 60 * 60; // 24 hours
    
    // Create response with success message
    const response = NextResponse.json(
      { 
        success: true,
        message: 'Login successful'
      },
      { status: 200 }
    );
    
    // Set both session and authToken cookies for compatibility
    response.cookies.set({
      name: 'session',
      value: authResult.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: cookieMaxAge,
      path: '/'
    });
    
    response.cookies.set({
      name: 'authToken',
      value: authResult.token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: cookieMaxAge,
      path: '/'
    });
    
    console.log('Login successful - cookies set');
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    return NextResponse.json(
      { 
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 