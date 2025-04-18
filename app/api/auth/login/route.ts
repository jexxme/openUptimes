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
    console.error('Rate limit check error:', error);
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
    console.error('Record failed attempt error:', error);
  }
}

async function resetFailedAttempts(ip: string): Promise<void> {
  try {
    const client = await getRedisClient();
    await client.del(`ratelimit:login:${ip}`);
  } catch (error) {
    console.error('Reset failed attempts error:', error);
  }
}

export async function POST(request: NextRequest) {
  const requestId = Date.now().toString().substring(8);
  console.log(`[LoginAPI:${requestId}] Login request received`);
  
  // Get client IP address
  const ip = request.headers.get('x-forwarded-for') || 
             request.headers.get('x-real-ip') || 
             'unknown';
             
  console.log(`[LoginAPI:${requestId}] Request from IP: ${ip}`);
  
  // Check rate limit before processing
  const rateLimitCheck = await checkRateLimit(ip);
  if (!rateLimitCheck.allowed) {
    console.log(`[LoginAPI:${requestId}] Rate limit exceeded for IP: ${ip}`);
    
    const response = NextResponse.json(
      { error: 'Too many failed login attempts. Please try again later.' },
      { status: 429 }
    );
    
    // Add security headers
    response.headers.set('Retry-After', String(rateLimitCheck.retryAfter || 30));
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    
    return response;
  }
  
  try {
    const body = await request.json();
    const { password, provider = 'password' } = body;
    
    console.log(`[LoginAPI:${requestId}] Authentication provider: ${provider}`);
    
    if (provider === 'password' && !password) {
      console.log(`[LoginAPI:${requestId}] Error: Password required`);
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Use the authenticate function that supports multiple providers
    console.log(`[LoginAPI:${requestId}] Authenticating user...`);
    const authResult = await authenticate(body, provider);
    console.log(`[LoginAPI:${requestId}] Authentication result: ${authResult.success ? 'success' : 'failed'}`);
    
    if (!authResult.success || !authResult.token) {
      console.error(`[LoginAPI:${requestId}] Authentication failed:`, authResult.error);
      
      // Record failed attempt for rate limiting
      await recordFailedAttempt(ip);
      
      const response = NextResponse.json(
        { error: authResult.error || 'Authentication failed' },
        { status: 401 }
      );
      
      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      
      return response;
    }
    
    // Reset failed attempts counter on successful login
    await resetFailedAttempts(ip);
    
    const token = authResult.token;
    console.log(`[LoginAPI:${requestId}] Generated token: ${token.substring(0, 6)}...`);
    
    // Store session in Redis with 24 hour expiry by default
    console.log(`[LoginAPI:${requestId}] Storing session in Redis...`);
    const redisResult = await storeSession(token);
    console.log(`[LoginAPI:${requestId}] Redis session storage: ${redisResult ? 'success' : 'failed'}`);
    
    if (!redisResult) {
      console.error(`[LoginAPI:${requestId}] Failed to store session in Redis`);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    // Create response with user info (if available) and success status
    const responseData = {
      success: true,
      ...(authResult.userInfo ? { user: authResult.userInfo } : {})
    };
    
    const response = NextResponse.json(responseData);
    
    // Set cookie with appropriate settings
    console.log(`[LoginAPI:${requestId}] Setting auth cookie...`);
    
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: true,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax',
    });
    
    // Verify the cookie was set correctly
    const setCookieHeader = response.headers.get('set-cookie');
    console.log(`[LoginAPI:${requestId}] Set-Cookie header exists: ${!!setCookieHeader}`);
    console.log(`[LoginAPI:${requestId}] Login successful, sending response with cookie`);
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    
    return response;
  } catch (error) {
    console.error(`[LoginAPI:${requestId}] Login error:`, error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 