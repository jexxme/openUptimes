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
    
    console.log('Checking admin password');
    // Check if admin password exists
    const storedHash = await getAdminPassword();
    if (!storedHash) {
      console.error('No admin password set in Redis');
      return NextResponse.json(
        { error: 'No admin password has been set. Please complete setup first.' },
        { status: 401 }
      );
    }
    
    console.log('Verifying password');
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
    console.log('Password verified, adding session');
    
    // Store session in both middleware memory cache and Redis
    try {
      await addSession(token);
      console.log('Session added to middleware and Redis');
    } catch (sessionError) {
      console.error('Error storing session:', sessionError);
      // Fallback direct Redis storage if middleware fails
      await storeSession(token);
      console.log('Fallback: Session stored directly in Redis');
    }
    
    // Set cookie
    const response = NextResponse.json({ 
      success: true,
      debug: { tokenLength: token.length } 
    });
    
    // 24 hours expiry (in seconds)
    const SESSION_EXPIRY = 60 * 60 * 24;
    
    console.log('Setting auth cookie');
    response.cookies.set({
      name: 'authToken',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: SESSION_EXPIRY,
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