import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '../../../../lib/redis';

/**
 * GET /api/settings/github - Get GitHub specific settings
 * This route provides a cleaner API for just the GitHub-related settings
 */
export async function GET(request: NextRequest) {
  try {
    const client = await getRedisClient();
    const configStr = await client.get('config:site');
    
    if (!configStr) {
      // Return default config if not found in Redis
      return NextResponse.json({
        githubAction: {
          enabled: true,
          repository: '',
          workflow: 'ping.yml',
          schedule: '*/5 * * * *', // Every 5 minutes by default
          secretName: 'PING_API_KEY',
          lastSuccessfulPing: null
        },
        apiKey: null
      });
    }
    
    const config = JSON.parse(configStr);
    
    // Return the GitHub-specific settings plus API key in a clean format
    return NextResponse.json({
      githubAction: {
        enabled: config.githubAction?.enabled ?? true,
        repository: config.githubAction?.repository ?? '',
        workflow: config.githubAction?.workflow ?? 'ping.yml',
        schedule: config.githubAction?.schedule ?? '*/5 * * * *',
        secretName: config.githubAction?.secretName ?? 'PING_API_KEY',
        lastSuccessfulPing: config.githubAction?.lastSuccessfulPing ?? null
      },
      apiKey: config.apiKey || null
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch GitHub settings' },
      { status: 500 }
    );
  }
} 