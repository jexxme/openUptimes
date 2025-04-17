import { NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';

/**
 * POST /api/admin/redis/verify
 * Verifies admin password and returns the Redis URL if authenticated
 */
export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();
    const { password } = body;
    
    // Validate input
    if (!password) {
      return NextResponse.json(
        { message: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Verify the password
    const isPasswordCorrect = await verifyPassword(password);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { message: 'Password verification failed' },
        { status: 401 }
      );
    }
    
    // Get Redis URL from environment variable
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      return NextResponse.json(
        { message: 'Redis URL not configured in environment' },
        { status: 500 }
      );
    }
    
    // Return Redis URL to authenticated user
    return NextResponse.json(
      { 
        message: 'Password verified successfully',
        redisUrl 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying admin password:', error);
    return NextResponse.json(
      { message: 'Failed to verify password' },
      { status: 500 }
    );
  }
} 