import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '../../../../lib/edge-auth';
import { deleteSession } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    console.log('Logout request received');
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (token) {
      console.log('Authenticated token found, removing session');
      
      // Remove session from Redis
      const redisResult = await deleteSession(token);
      console.log('Session removal result:', { redis: redisResult ? 'success' : 'failure' });
    } else {
      console.log('No token found in cookies during logout');
    }
    
    // Create response and clear cookie with multiple approaches to ensure it works across browsers
    const response = NextResponse.json({ success: true });
    
    // Clear the cookie using multiple techniques
    
    // Approach 1: Set empty value with expires in the past
    response.cookies.set({
      name: 'authToken',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // Set in the past to ensure deletion
      path: '/',
      sameSite: 'lax',
    });
    
    // Approach 2: Set maxAge to 0
    response.cookies.set({
      name: 'authToken',
      value: 'deleted',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0, // Alternative approach for some browsers
      path: '/',
      sameSite: 'lax',
    });
    
    // Approach 3: Force expiration with negative max age
    response.headers.append('Set-Cookie', 
      'authToken=deleted; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httpOnly; Max-Age=-1');
    
    console.log('Logout completed successfully, cookies cleared');
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still try to clear cookies even if there was an error
    const response = NextResponse.json(
      { error: 'Logout failed but cookies cleared' },
      { status: 500 }
    );
    
    // Clear cookies anyway to ensure user is logged out
    response.cookies.set({
      name: 'authToken',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  }
} 