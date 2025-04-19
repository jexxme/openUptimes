import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, hashPassword } from '@/lib/auth';
import { getAdminPassword, setAdminPassword } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json();
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      );
    }
    
    // Get stored password hash
    const storedHash = await getAdminPassword();
    if (!storedHash) {
      return NextResponse.json(
        { error: 'No admin password has been set. Please complete setup first.' },
        { status: 401 }
      );
    }
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, storedHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }
    
    // Hash and store the new password
    const newPasswordHash = await hashPassword(newPassword);
    const success = await setAdminPassword(newPasswordHash);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
} 