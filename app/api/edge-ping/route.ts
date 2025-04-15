import { NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Edge function that triggers the ping scheduler
 * Edge functions have a longer maximum execution time than serverless functions
 */
export async function GET(request: Request) {
  console.log('Edge ping function called');
  
  try {
    // Get the base URL
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    
    // Call the ping scheduler
    let schedulerUrl = `${baseUrl}/api/ping-scheduler`;
    console.log(`Calling ping scheduler at ${schedulerUrl}`);
    
    const schedulerResponse = await fetch(schedulerUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'OpenUptimes Edge Ping'
      }
    });
    
    if (!schedulerResponse.ok) {
      console.error('Ping scheduler failed:', await schedulerResponse.text());
      return NextResponse.json({ error: 'Ping scheduler failed' }, { status: 500 });
    }
    
    const result = await schedulerResponse.json();
    
    // Calculate when to schedule the next ping
    const nextPingDelay = result.nextPing ? 
      Math.max(10000, result.nextPing - Date.now()) : // Use the time from the scheduler, minimum 10s
      60000; // Default to 60s if nextPing not available
    
    console.log(`Scheduled next ping in ${nextPingDelay}ms`);
    
    // Self-sustaining ping mechanism
    // This approach works because edge functions have longer execution times (up to 30 seconds)
    // and can perform background processing
    setTimeout(async () => {
      try {
        console.log('Triggering next ping cycle');
        await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'OpenUptimes Edge Ping Self-Trigger'
          }
        });
      } catch (nextPingError) {
        console.error('Error scheduling next ping:', nextPingError);
      }
    }, nextPingDelay);
    
    return NextResponse.json({
      status: 'success',
      message: 'Ping process initiated',
      nextPingIn: nextPingDelay
    });
    
  } catch (error) {
    console.error('Error in edge ping function:', error);
    return NextResponse.json(
      { error: 'Failed to process ping', message: (error as Error).message },
      { status: 500 }
    );
  }
} 