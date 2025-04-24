import { NextResponse } from 'next/server';

export async function GET() {
  // Detect if we're running in Edge Runtime
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';
  
  // Detect if we're running on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  // Gather some additional runtime info
  const runtimeInfo = {
    nodeVersion: typeof process.version !== 'undefined' ? process.version : 'edge',
    platform: typeof process.platform !== 'undefined' ? process.platform : 'edge',
    env: process.env.NODE_ENV,
  };

  return NextResponse.json({
    isEdgeRuntime,
    isVercel,
    runtimeInfo,
  });
}

// Set config for Edge Runtime compatibility
export const runtime = 'edge'; 