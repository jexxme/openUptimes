import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes max duration for edge function

/**
 * Edge function that triggers the ping scheduler
 * Reliable implementation for both development and production environments
 */
export async function GET(request: Request) {
  console.log('Edge ping function called');
  
  try {
    // Get the URL and parameters
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const testMode = url.searchParams.get('test') === 'true';
    
    // If it's just a test request, immediately return success
    if (testMode) {
      console.log('Test request detected, sending immediate response');
      return NextResponse.json({
        status: 'test_success',
        message: 'Edge function is responding correctly',
        timestamp: Date.now()
      });
    }
    
    // Determine if this is a cycle request or initial request
    const cycleMode = url.searchParams.get('cycle') === 'true';
    
    if (cycleMode) {
      // This is a cycle request that should wait and trigger the next ping
      const delay = parseInt(url.searchParams.get('delay') || '60000', 10);
      const cycleId = url.searchParams.get('cycleId') || Date.now().toString();
      
      console.log(`Ping cycle ${cycleId} waiting for ${delay}ms`);
      
      try {
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Create a clean URL for the next ping request
        const nextUrl = new URL(`${baseUrl}/api/edge-ping`);
        
        console.log(`Ping cycle ${cycleId} completed wait, triggering next ping`);
        const pingResponse = await fetch(nextUrl.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'OpenUptimes Edge Ping Self-Trigger',
            'Cache-Control': 'no-cache, no-store'
          }
        });
        
        if (!pingResponse.ok) {
          throw new Error(`Failed to trigger next ping: ${pingResponse.status}`);
        }
        
        return NextResponse.json({
          status: 'cycle_completed',
          message: 'Ping cycle completed and next ping initiated',
          cycleId,
          timestamp: Date.now()
        });
      } catch (cycleError) {
        console.error(`Ping cycle ${cycleId} error:`, cycleError);
        // Even on error, try to restart the ping cycle
        try {
          const recoveryUrl = new URL(`${baseUrl}/api/edge-ping`);
          fetch(recoveryUrl.toString(), {
            method: 'GET',
            headers: {
              'User-Agent': 'OpenUptimes Edge Ping Recovery',
              'Cache-Control': 'no-cache, no-store'
            }
          }).catch(e => console.error('Recovery request failed:', e));
        } catch (recoveryError) {
          console.error('Failed to send recovery request:', recoveryError);
        }
        
        return NextResponse.json({
          status: 'cycle_error',
          message: `Ping cycle error: ${(cycleError as Error).message}`,
          cycleId,
          timestamp: Date.now()
        }, { status: 500 });
      }
    }
    
    // This is a regular request, call the ping scheduler
    let schedulerUrl = `${baseUrl}/api/ping-scheduler`;
    console.log(`Calling ping scheduler at ${schedulerUrl}`);
    
    const schedulerResponse = await fetch(schedulerUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'OpenUptimes Edge Ping',
        'Cache-Control': 'no-cache, no-store'
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
    
    console.log(`Next ping scheduled in ${nextPingDelay}ms`);
    
    // Create the cycle URL with a unique ID for this ping cycle
    const cycleUrl = new URL(`${baseUrl}/api/edge-ping`);
    const cycleId = Date.now().toString();
    cycleUrl.searchParams.set('cycle', 'true');
    cycleUrl.searchParams.set('delay', nextPingDelay.toString());
    cycleUrl.searchParams.set('cycleId', cycleId);
    
    // Start a new ping cycle by making a background request
    // Using fetch without await means this will continue in the background
    fetch(cycleUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'OpenUptimes Edge Ping Cycle Initiator',
        'Cache-Control': 'no-cache, no-store'
      }
    }).catch(err => console.error('Error starting ping cycle:', err));
    
    return NextResponse.json({
      status: 'success',
      message: 'Ping process initiated',
      nextPingIn: nextPingDelay,
      cycleId,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in edge ping function:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process ping', 
        message: (error as Error).message,
        timestamp: Date.now()
      },
      { status: 500 }
    );
  }
} 