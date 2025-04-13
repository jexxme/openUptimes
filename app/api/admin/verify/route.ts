import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 400 }
      );
    }

    const isAdmin = await verifyAdmin(token);
    
    if (isAdmin) {
      return NextResponse.json({ success: true, isAdmin: true });
    } else {
      return NextResponse.json(
        { success: false, isAdmin: false, message: 'Invalid token' },
        { status: 403 }
      );
    }
  } catch (error) {
    console.error('Admin verification error:', error);
    return NextResponse.json(
      { success: false, message: 'Error verifying admin access' },
      { status: 500 }
    );
  }
} 