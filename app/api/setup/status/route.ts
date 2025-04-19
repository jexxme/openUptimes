import { NextResponse } from 'next/server';
import { isSetupComplete } from '../../../../lib/redis';

export async function GET() {
  try {
    const setupComplete = await isSetupComplete();
    
    return NextResponse.json({
      setupComplete,
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    );
  }
} 