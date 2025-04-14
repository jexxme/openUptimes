import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '../../../../lib/edge-auth';
import { removeSession } from '../../../../middleware';
import { deleteSession } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (token) {
      // First try to use the middleware function which handles both in-memory and Redis
      try {
        await removeSession(token);
        console.log('Session removed via middleware');
      } catch (error) {
        // Fallback: direct Redis deletion
        console.error('Error removing session via middleware:', error);
        await deleteSession(token);
        console.log('Fallback: Session deleted directly from Redis');
      }
    }
    
    const response = NextResponse.json({ success: true });
    
    // Clear the auth cookie
    response.cookies.set({
      name: 'authToken',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    // Even if we hit an error, try to clear the cookie
    const response = NextResponse.json(
      { error: 'Logout failed, but cookie was cleared' },
      { status: 500 }
    );
    
    response.cookies.set({
      name: 'authToken',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  }
} 