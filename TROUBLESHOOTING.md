# OpenUptimes Troubleshooting Guide

This document covers common issues you might encounter when setting up or running OpenUptimes, and how to resolve them.

## API Routes Not Working

### Symptoms
- Status shows "unknown" for all services
- No errors in the browser console, but UI shows "Loading..." indefinitely
- Vercel dashboard shows 0 functions running

### Solutions

1. **Check Redis Connection**
   - Verify your Redis URL is correctly set in `.env.local`
   - Try accessing the `/api/test-redis` endpoint to test connectivity
   - Check server logs for Redis connection errors

2. **Enable Better Error Logging**
   - The default Redis error handling may not expose all issues
   - Ensure getRedisClient function has proper error handling:
   ```typescript
   export const getRedisClient = async (): Promise<RedisClientType> => {
     if (!redisClient) {
       if (!process.env.REDIS_URL) {
         console.error('REDIS_URL environment variable is not set');
         throw new Error('REDIS_URL environment variable is not set');
       }
       
       console.log('Initializing Redis client with URL:', process.env.REDIS_URL);
       
       try {
         redisClient = createClient({
           url: process.env.REDIS_URL,
         });
         
         // Handle connection errors
         redisClient.on('error', (err) => {
           console.error('Redis connection error:', err);
           redisClient = null;
         });
         
         await redisClient.connect();
         console.log('Redis client connected successfully');
       } catch (error) {
         console.error('Failed to initialize Redis client:', error);
         throw error;
       }
     }
     
     return redisClient;
   };
   ```

3. **Add Retry Mechanism**
   - Make your frontend client more resilient with retries
   - Implement a retry pattern in the useStatus hook to handle temporary failures
   - Call the `/api/ping` endpoint first to trigger data collection

4. **Fix Next.js Config**
   - If using external packages like Redis, ensure they're properly configured
   - Use `serverExternalPackages` (not `experimental.serverComponentsExternalPackages`)
   ```typescript
   const nextConfig: NextConfig = {
     serverExternalPackages: ["redis"],
     logging: {
       fetches: {
         fullUrl: true,
       },
     },
   };
   ```

## Next.js Build Errors

### ESLint Errors

If you see ESLint errors during build:

```
Failed to compile.
./app/hooks/useStatus.ts
17:13  Error: Unexpected any. Specify a different type.  @typescript-eslint/no-explicit-any
```

Fix by properly typing your variables:

```typescript
interface StatusHistoryItem {
  status: ServiceStatus;
  timestamp: number;
  responseTime?: number;
  statusCode?: number;
  error?: string;
}

interface StatusData {
  // ...
  history?: StatusHistoryItem[]; // Instead of any[]
}
```

### React Hook Dependencies Warning

```
65:6  Warning: React Hook useEffect has a missing dependency: 'fetchStatus'. 
Either include it or remove the dependency array.  react-hooks/exhaustive-deps
```

Fix by:
1. Using `useCallback` to memoize your fetch function
2. Adding all dependencies to the dependency array
3. Properly structuring your useEffect hooks

```typescript
const fetchStatus = useCallback(async () => {
  // function implementation
}, [includeHistory, historyLimit]);

useEffect(() => {
  // effect implementation
  return () => clearInterval(interval);
}, [fetchStatus]); // Include fetchStatus as dependency
```

## Debugging Redis Connection Issues

### Checking Redis Connection

Create a test endpoint to verify Redis connectivity:

```typescript
// app/api/test-redis/route.ts
export async function GET() {
  try {
    const client = await getRedisClient();
    const pingResult = await client.ping();
    await closeRedisConnection();
    
    return NextResponse.json({
      success: true,
      message: 'Redis connection successful',
      pingResult
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
```

### Redis Data Structure

OpenUptimes uses the following Redis data structure:
- `status:{serviceName}` - Current status of each service (JSON string)
- `history:{serviceName}` - List of historical status entries (JSON strings)

## Debugging API Routes

To debug API routes, add console logs at key points:

```typescript
export async function GET(request: Request) {
  console.log('API status endpoint called');
  
  try {
    const { searchParams } = new URL(request.url);
    console.log('Query params:', Object.fromEntries(searchParams.entries()));
    
    // ... rest of your code
    
    console.log('Successfully fetched status for all services');
    return NextResponse.json(results);
  } catch (err) {
    console.error('Error fetching status:', err);
    // ... error handling
  }
}
```

## Common Error Messages and Solutions

### "ECONNREFUSED"
This typically means Redis is not running or not accessible at the URL you provided.
- Check if Redis is running
- Verify your firewall settings
- Try connecting to Redis manually to test access

### "Redis connection error: Error: getaddrinfo ENOTFOUND"
This means the hostname in your Redis URL cannot be resolved.
- Check if the hostname is correct
- Try using an IP address instead of hostname
- Verify DNS settings

### "Authentication failed"
Your Redis credentials are incorrect.
- Double-check username and password
- Ensure special characters are properly URL-encoded
- Verify Redis is configured to use authentication

## Authentication Issues

### Registration/Login Problems

**Problem**: After registration, login doesn't work.

**Possible causes and solutions**:

1. **Redis Connection Issues**:
   - Verify your Redis connection is working by checking the console logs
   - Make sure your REDIS_URL environment variable is correct in `.env.local`
   - Try using the `/api/auth/debug` endpoint to see if Redis is properly connected

2. **Password Storage Issues**:
   - The password might not be saved correctly during registration
   - Check Redis with `redis-cli` to verify that the `admin:password` key exists
   - Command: `redis-cli -u <your-redis-url> GET admin:password`

3. **Setup Completion**:
   - Verify setup was marked as complete
   - Check Redis: `redis-cli -u <your-redis-url> GET setup:complete`
   - If not "true", try resetting and completing setup again

4. **Password Format**:
   - Make sure your password doesn't contain special characters that could cause issues
   - For testing, try a simple alphanumeric password

5. **Reset & Retry**:
   - Visit the `/reset` page to clear all auth data
   - Complete the setup process again

## Redis Connection Issues

**Problem**: Redis connection fails or times out.

**Solutions**:

1. **Check Redis URL**:
   - Make sure your REDIS_URL is correctly formatted
   - Format: `redis[s]://[[username][:password]@][host][:port][/db-number]`

2. **Firewall/Network Issues**:
   - Check if your Redis host is accessible from your deployment environment
   - Verify IP restrictions on Redis provider (if any)

3. **Redis Provider-Specific Issues**:
   - Redis Cloud: Verify your subscription is active
   - Upstash: Check database is operational
   - Local Redis: Verify Redis server is running (`redis-cli ping`)

4. **Debug Redis Connection**:
   - Use `/api/debug/auth` endpoint to check Redis status

## Session Management

**Problem**: You get logged out unexpectedly.

**Solutions**:

1. **Session Storage**:
   - OpenUptimes uses in-memory session storage
   - Sessions are lost on server restart/redeploy
   - This is expected behavior for the current version

2. **Cookie Issues**:
   - Check browser cookie settings
   - Ensure cookies are not being blocked
   - Verify auth cookie is present (`authToken`)

## Environment Variables

**Problem**: Configuration not taking effect.

**Solutions**:

1. **Verify Environment Variables**:
   - Check that `.env.local` exists and has proper values
   - Required variables: `REDIS_URL`
   - Optional variables: `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_DESCRIPTION`, `NEXT_PUBLIC_REFRESH_INTERVAL`

2. **Restart Development Server**:
   - After changing environment variables, restart the server
   - Command: `npm run dev`

## Development Workflow

**Problem**: Changes not applying in development.

**Solutions**:

1. **Clear Cache and Restart**:
   - Stop the development server
   - Clear Next.js cache: `rm -rf .next`
   - Restart: `npm run dev`

2. **Browser Cache**:
   - Hard refresh browser: `Ctrl+Shift+R` or `Cmd+Shift+R`
   - Or open DevTools Network tab and check "Disable cache"

## Next Steps if Issues Persist

1. Try running Redis locally for testing
2. Simplify your configuration to isolate the issue
3. Check Redis server logs for any connection errors
4. Verify your environment variables are correctly loaded
5. Try a different Redis provider if issues persist

For further assistance, please open an issue on GitHub with:
- Detailed error messages
- Your Redis configuration (redact credentials)
- Any steps you've already taken to troubleshoot 