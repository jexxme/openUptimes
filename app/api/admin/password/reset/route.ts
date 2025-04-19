import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { hashPassword } from '@/lib/auth';

/**
 * POST /api/admin/password/reset
 * Resets the admin password if the Redis URL matches
 */
export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();
    const { redisUrl, newPassword } = body;
    
    // Validate input
    if (!redisUrl) {
      return NextResponse.json(
        { message: 'Redis URL is required' },
        { status: 400 }
      );
    }
    
    if (!newPassword) {
      return NextResponse.json(
        { message: 'New password is required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Get environment Redis URL
    const envRedisUrl = process.env.REDIS_URL;
    
    if (!envRedisUrl) {
      return NextResponse.json(
        { message: 'Environment Redis URL is not configured' },
        { status: 500 }
      );
    }
    
    // Verify Redis URL
    if (redisUrl !== envRedisUrl) {
      return NextResponse.json(
        { message: 'Redis URL verification failed' },
        { status: 401 }
      );
    }
    
    // Hash the new password using the same method as the auth system
    const passwordHash = await hashPassword(newPassword);
    
    // Update password in Redis
    const redis = await getRedisClient();
    await redis.set('admin:password', passwordHash);
    
    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    );
  } catch (error) {

    return NextResponse.json(
      { message: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 