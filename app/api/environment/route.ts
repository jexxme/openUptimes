import { NextResponse } from 'next/server';

export async function GET() {
  // Detect if we're running in Edge Runtime
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge';
  
  // Detect if we're running on Vercel
  const isVercel = process.env.VERCEL === '1';
  
  // Gather some additional runtime info
  const runtimeInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
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