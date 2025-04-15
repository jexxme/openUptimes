import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { authenticateAdmin, verifyPassword, hashPassword } from '@/lib/auth';

/**
 * PUT /api/admin/password
 * Updates the admin password
 */
export async function PUT(request: Request) {
  try {
    // Check if user is authenticated
    const isAuthenticated = await authenticateAdmin(request);
    if (!isAuthenticated) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get request body
    const body = await request.json();
    const { currentPassword, newPassword } = body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { message: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Get Redis client
    const redis = await getRedisClient();
    
    // Get current password hash
    const currentPasswordHash = await redis.get('admin:password');
    if (!currentPasswordHash) {
      return NextResponse.json(
        { message: 'Admin password not found' },
        { status: 500 }
      );
    }
    
    // Verify current password using the auth system's method
    const isPasswordCorrect = await verifyPassword(currentPassword, currentPasswordHash);
    if (!isPasswordCorrect) {
      return NextResponse.json(
        { message: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Hash new password using the auth system's method
    const newPasswordHash = await hashPassword(newPassword);
    
    // Update password in Redis
    await redis.set('admin:password', newPasswordHash);
    
    return NextResponse.json(
      { message: 'Password updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating admin password:', error);
    return NextResponse.json(
      { message: 'Failed to update password' },
      { status: 500 }
    );
  }
} 