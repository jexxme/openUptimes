import { NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';

export async function POST() {
  try {
    const client = await getRedisClient();
    
    // Delete all setup and auth related keys
    await client.del('setup:complete');
    await client.del('admin:password');
    
    // Also clean up any potential session tracking
    const keys = await client.keys('session:*');
    if (keys.length > 0) {
      await client.del(keys);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Setup and authentication data reset successfully'
    });
  } catch (error) {
    console.error('Error resetting setup:', error);
    return NextResponse.json(
      { error: 'Failed to reset setup' },
      { status: 500 }
    );
  }
} 