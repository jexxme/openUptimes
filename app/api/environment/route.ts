import { NextResponse } from 'next/server';

export async function GET() {
  const isEdgeRuntime = 
    typeof process !== 'undefined' && 
    process.env && 
    process.env.NEXT_RUNTIME === 'edge';
  
  const isVercel = 
    typeof process !== 'undefined' && 
    process.env && 
    (process.env.VERCEL === '1' || process.env.VERCEL_ENV);

  return NextResponse.json({
    isEdgeRuntime,
    isVercel,
    runtimeInfo: {
      nextRuntime: process.env.NEXT_RUNTIME || 'node',
      environment: process.env.NODE_ENV || 'development',
    }
  });
}

// Set config for Edge Runtime compatibility
export const runtime = 'edge'; 