import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { getRedisClient, closeRedisConnection } from '@/lib/redis';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    const { config, services, token } = await request.json();
    
    // Verify admin access
    const isAdmin = await verifyAdmin(token);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 403 }
      );
    }
    
    // In a production app, you would want to validate the config data here
    
    // For simplicity, we're storing config in Redis
    // In a real application, you'd want to generate/update the config.ts file
    const redisClient = await getRedisClient();
    
    // Store the configuration in Redis
    await redisClient.set('config:site', JSON.stringify(config));
    await redisClient.set('config:services', JSON.stringify(services));
    
    await closeRedisConnection();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving configuration:', error);
    return NextResponse.json(
      { success: false, message: (error as Error).message },
      { status: 500 }
    );
  }
} 