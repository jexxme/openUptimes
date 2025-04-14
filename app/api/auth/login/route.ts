import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateSessionToken } from '../../../../lib/auth';
import { addSession } from '../../../../middleware';
import { getAdminPassword, storeSession } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Check if admin password exists
    const storedHash = await getAdminPassword();
    if (!storedHash) {
      console.error('No admin password set in Redis');
      return NextResponse.json(
        { error: 'No admin password has been set. Please complete setup first.' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(password, storedHash);
    
    if (!isValid) {
      console.error('Invalid password provided');
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Generate session token
    const token = generateSessionToken();
    
    // Store session in Redis (for production) - 24 hour expiry by default
    await storeSession(token);
    
    // Also store in memory for development compatibility
    addSession(token);
    
    // Create response and set cookie
    const response = NextResponse.json({ success: true });
    
    // Set cookie with appropriate settings
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
} 