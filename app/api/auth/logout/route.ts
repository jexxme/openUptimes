import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '../../../../lib/edge-auth';
import { removeSession } from '../../../../middleware';

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (token) {
      removeSession(token);
    }
    
    const response = NextResponse.json({ success: true });
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
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
} 