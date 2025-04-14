import { NextRequest, NextResponse } from 'next/server';
import { markSetupComplete, setAdminPassword } from '../../../../lib/redis';
import { hashPassword } from '../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password, siteSettings } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Hash and store the admin password
    const passwordHash = await hashPassword(password);
    await setAdminPassword(passwordHash);
    
    // Store site settings if provided
    if (siteSettings) {
      // This would be implemented in a future step
      // storeSiteSettings(siteSettings);
    }
    
    // Mark setup as complete
    await markSetupComplete();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing setup:', error);
    return NextResponse.json(
      { error: 'Failed to complete setup' },
      { status: 500 }
    );
  }
} 