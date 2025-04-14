import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '../../../../lib/edge-auth';
import { isSessionValid } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const token = parseTokenFromCookie(cookieHeader);
    
    if (!token) {
      return NextResponse.json({ valid: false, reason: 'no_token' }, { status: 401 });
    }
    
    // Check if session exists in Redis
    const valid = await isSessionValid(token);
    
    if (!valid) {
      return NextResponse.json({ valid: false, reason: 'invalid_token' }, { status: 401 });
    }
    
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ valid: false, reason: 'server_error' }, { status: 500 });
  }
} 