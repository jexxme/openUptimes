import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '../../../../lib/edge-auth';
import { removeSession } from '../../../../middleware';
import { deleteSession } from '../../../../lib/redis';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (token) {
      // Remove from Redis (for production)
      await deleteSession(token);
      
      // Also remove from memory (for development compatibility)
      removeSession(token);
    }
    
    // Create response and clear cookie with multiple approaches
    const response = NextResponse.json({ success: true });
    
    // Use multiple approaches to ensure cookie is cleared in all browsers
    response.cookies.set({
      name: 'authToken',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // Set in the past to ensure deletion
      maxAge: 0, // Alternative approach for some browsers
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 