import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 300; // 5 minutes max duration for edge function

/**
 * Edge function that triggers the ping scheduler
 * Simplified implementation for better reliability
 */
export async function GET(request: Request) {
  try {
    // Get the URL and parameters
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const testMode = url.searchParams.get('test') === 'true';
    const debugMode = url.searchParams.get('debug') === 'true';
    
    // Debug logging
    const log = (message: string) => {
      if (debugMode) {
        console.log(`[EdgePing] ${message}`);
      }
    };
    
    log(`Edge ping called at ${new Date().toISOString()}`);
    
    // If it's just a test request, immediately return success
    if (testMode) {
      log('Test mode detected, returning success response');
      return NextResponse.json({
        status: 'test_success',
        message: 'Edge function is responding correctly',
        timestamp: Date.now()
      });
    }
    
    // Determine if this is a cycle request
    const cycleMode = url.searchParams.get('cycle') === 'true';
    const cycleId = url.searchParams.get('cycleId') || Date.now().toString();
    
    if (cycleMode) {
      log(`Cycle mode detected with ID: ${cycleId}`);
      const delay = parseInt(url.searchParams.get('delay') || '60000', 10);
      
      try {
        log(`Waiting for ${delay}ms before triggering ping`);
        // Wait for the specified delay
        await new Promise(resolve => setTimeout(resolve, delay));
        
        log('Delay complete, triggering ping');
        // Call ping directly
        const pingStartTime = Date.now();
        const pingResponse = await fetch(`${baseUrl}/api/ping?cycleId=${encodeURIComponent(cycleId)}`, {
          method: 'GET',
          headers: {
            'User-Agent': 'OpenUptimes Edge Ping',
            'Cache-Control': 'no-cache, no-store'
          }
        });
        
        if (!pingResponse.ok) {
          throw new Error(`Failed to trigger ping: ${pingResponse.status}`);
        }
        
        const pingData = await pingResponse.json();
        const pingDuration = Date.now() - pingStartTime;
        log(`Ping completed in ${pingDuration}ms, refreshInterval: ${pingData.refreshInterval}ms`);
        
        // Set up the next cycle with the EXACT refreshInterval from the settings
        // This is crucial to maintain consistent timing
        const refreshInterval = pingData.refreshInterval || 60000;
        
        // Create a single next cycle with the proper interval
        const cycleUrl = new URL(`${baseUrl}/api/edge-ping`);
        cycleUrl.searchParams.set('cycle', 'true');
        cycleUrl.searchParams.set('delay', refreshInterval.toString());
        cycleUrl.searchParams.set('cycleId', Date.now().toString());
        if (debugMode) cycleUrl.searchParams.set('debug', 'true');
        
        log(`Scheduling next ping cycle in ${refreshInterval}ms`);
        
        // Use fetch with no await to avoid waiting for the next cycle
        fetch(cycleUrl.toString(), {
          method: 'GET',
          headers: {
            'User-Agent': 'OpenUptimes Edge Ping Self-Trigger',
            'Cache-Control': 'no-cache, no-store'
          }
        }).catch(err => {
          console.error('Error starting next ping cycle:', err);
          
          // Try one more time with a backup cycle on error
          log('Error detected, starting backup cycle');
          const backupUrl = new URL(`${baseUrl}/api/edge-ping`);
          backupUrl.searchParams.set('cycle', 'true');
          backupUrl.searchParams.set('delay', '15000'); // Shorter backup delay
          backupUrl.searchParams.set('cycleId', `${cycleId}-backup`);
          if (debugMode) backupUrl.searchParams.set('debug', 'true');
          
          fetch(backupUrl.toString()).catch(e => console.error('Backup cycle failed to start:', e));
        });
        
        return NextResponse.json({
          status: 'cycle_completed',
          message: 'Ping cycle completed and next ping scheduled',
          cycleId,
          nextPingIn: refreshInterval,
          timestamp: Date.now()
        });
      } catch (cycleError) {
        console.error(`Ping cycle ${cycleId} error:`, cycleError);
        log(`Error in ping cycle: ${(cycleError as Error).message}`);
        
        // Try to restart the ping cycle
        try {
          log('Attempting recovery cycle');
          const recoveryUrl = new URL(`${baseUrl}/api/edge-ping`);
          recoveryUrl.searchParams.set('cycle', 'true');
          recoveryUrl.searchParams.set('delay', '15000'); // Shorter recovery delay
          recoveryUrl.searchParams.set('cycleId', `${cycleId}-recovery`);
          if (debugMode) recoveryUrl.searchParams.set('debug', 'true');
          
          fetch(recoveryUrl.toString()).catch(e => console.error('Recovery attempt failed:', e));
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
    
    // Initial request - start the cycle
    try {
      log('Initial request, fetching settings');
      const settingsResponse = await fetch(`${baseUrl}/api/settings`);
      const settings = await settingsResponse.json();
      const refreshInterval = settings.refreshInterval || 60000;
      
      log(`Starting initial ping cycle with interval: ${refreshInterval}ms`);
      
      // First, clear any existing ping processes by sending a cancellation request
      // to mark any existing cycles as stale
      try {
        log('Cancelling any existing ping cycles');
        const cancelUrl = new URL(`${baseUrl}/api/ping-scheduler`);
        cancelUrl.searchParams.set('action', 'cancel');
        await fetch(cancelUrl.toString()).catch(e => console.error('Cancel error:', e));
      } catch (e) {
        // Ignore cancel errors
        log(`Error cancelling existing cycles: ${(e as Error).message}`);
      }
      
      // Trigger a direct ping first
      log('Triggering initial ping');
      const pingResponse = await fetch(`${baseUrl}/api/ping?cycleId=initial-${Date.now()}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'OpenUptimes Edge Ping',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!pingResponse.ok) {
        throw new Error('Initial ping failed');
      }
      
      // Start a new cycle with fresh ID
      const newCycleId = Date.now().toString();
      const cycleUrl = new URL(`${baseUrl}/api/edge-ping`);
      cycleUrl.searchParams.set('cycle', 'true');
      cycleUrl.searchParams.set('delay', refreshInterval.toString());
      cycleUrl.searchParams.set('cycleId', newCycleId);
      if (debugMode) cycleUrl.searchParams.set('debug', 'true');
      
      log(`Starting fresh ping cycle with ID: ${newCycleId}, delay: ${refreshInterval}ms`);
      
      // Start a new ping cycle (don't await)
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
        nextPingIn: refreshInterval,
        cycleId: newCycleId,
        actualInterval: refreshInterval,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error starting ping cycle:', error);
      log(`Error starting ping cycle: ${(error as Error).message}`);
      
      // Fallback to default interval on error
      const defaultInterval = 60000;
      
      // Still try to start the cycle with default interval
      try {
        const cycleUrl = new URL(`${baseUrl}/api/edge-ping`);
        cycleUrl.searchParams.set('cycle', 'true');
        cycleUrl.searchParams.set('delay', defaultInterval.toString());
        cycleUrl.searchParams.set('cycleId', Date.now().toString());
        if (debugMode) cycleUrl.searchParams.set('debug', 'true');
        
        log(`Starting fallback cycle with delay: ${defaultInterval}ms`);
        
        fetch(cycleUrl.toString()).catch(e => console.error('Failed to start fallback cycle:', e));
      } catch (e) {
        console.error('Complete failure in fallback cycle creation:', e);
      }
      
      return NextResponse.json({
        status: 'partial_success',
        message: 'Ping initiated with fallback settings due to error',
        error: (error as Error).message,
        nextPingIn: defaultInterval,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Critical error in edge ping function:', error);
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