import { NextRequest, NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth';
import { createClient } from 'redis';

export async function POST(request: NextRequest) {
  try {
    const { redisUrl, newPassword } = await request.json();
    
    // Validate inputs
    if (!redisUrl || !newPassword) {
      return NextResponse.json(
        { error: 'Redis URL and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Validate Redis URL format
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      return NextResponse.json(
        { error: 'Invalid Redis URL format' },
        { status: 400 }
      );
    }
    
    // Create a temporary Redis client with the provided URL
    let tempClient = null;
    
    try {
      tempClient = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: false, // Don't retry connections
          connectTimeout: 5000, // 5 second timeout
        }
      });
      
      // Connect to Redis
      await tempClient.connect();
      
      // Check if connection works
      const ping = await tempClient.ping();
      if (ping !== 'PONG') {
        throw new Error('Failed to connect to Redis');
      }
      
      // Generate password hash
      const passwordHash = await hashPassword(newPassword);
      
      // Set the new admin password
      await tempClient.set('admin:password', passwordHash);
      
      // Success
      return NextResponse.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (redisError) {

      return NextResponse.json(
        { error: 'Failed to connect to Redis with the provided URL' },
        { status: 400 }
      );
    } finally {
      // Ensure Redis client is closed
      if (tempClient) {
        try {
          await tempClient.quit();
        } catch (err) {

        }
      }
    }
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
} 