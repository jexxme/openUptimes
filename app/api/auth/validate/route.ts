import { NextRequest, NextResponse } from 'next/server';
import { parseTokenFromCookie } from '../../../../lib/edge-auth';
import { isSessionValid } from '../../../../lib/redis';

export async function GET(request: NextRequest) {
  const requestId = Date.now().toString().substring(8);
  console.log(`[ValidateAPI:${requestId}] Session validation request received`);
  
  try {
    // Get the token from cookies
    const cookieHeader = request.headers.get('cookie') || '';
    console.log(`[ValidateAPI:${requestId}] Cookie header length: ${cookieHeader.length}`);
    console.log(`[ValidateAPI:${requestId}] All headers:`, Object.fromEntries(request.headers.entries()));
    
    const token = parseTokenFromCookie(cookieHeader);
    
    console.log(`[ValidateAPI:${requestId}] Token exists: ${!!token}`);
    
    if (!token) {
      console.log(`[ValidateAPI:${requestId}] Session validation failed: No token found in cookies`);
      return NextResponse.json({ valid: false, reason: 'no_token' }, { status: 401 });
    }
    
    // Check if session exists in Redis
    console.log(`[ValidateAPI:${requestId}] Checking session in Redis for token: ${token.substring(0, 6)}...`);
    const valid = await isSessionValid(token);
    
    if (!valid) {
      console.log(`[ValidateAPI:${requestId}] Session validation failed: Invalid or expired token`);
      return NextResponse.json({ valid: false, reason: 'invalid_token' }, { status: 401 });
    }
    
    console.log(`[ValidateAPI:${requestId}] Session validation successful`);
    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error(`[ValidateAPI:${requestId}] Session validation error:`, error);
    return NextResponse.json({ 
      valid: false, 
      reason: 'server_error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 