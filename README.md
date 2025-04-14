# OpenUptimes

A self-hosted, zero-dependency status page to monitor and display the uptime of your services. Built with Next.js, Tailwind CSS, and node-redis.

## Features

- 🚀 One-click deploy on Vercel
- 🔌 Plug-and-play setup
- 📊 Monitors uptime of custom services
- 📝 Logs and displays uptime history
- 🛑 Zero external services (uses your own Redis instance)
- 🧹 Minimal, clean, contributor-friendly codebase
- 🎨 Modern, responsive UI with live status updates
- 📱 Mobile-friendly design that works on all devices
- 🔄 Automatic refresh and fault-tolerant data fetching

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Storage**: Redis (via node-redis)
- **Monitoring**: Vercel Functions + Client-side Polling
- **Deployment**: Vercel Deploy Button

## System Architecture

OpenUptimes consists of three main components:

1. **API Endpoints**:
   - `/api/ping`: Actively checks the status of all configured services and stores results in Redis
   - `/api/status`: Retrieves the current status and optional history of all services
   - `/api/test-redis`: Test endpoint to verify Redis connectivity

2. **Data Layer**:
   - Redis for storing status data and history
   - Each service has a current status record and a history log
   - Automatic trimming of history to prevent excessive storage usage

3. **Frontend Components**:
   - Status Dashboard: Overview of all service statuses
   - StatusCard: Individual service status card with detailed metrics
   - StatusHeader: Overall system status summary with uptime statistics
   - ServiceHistory: Historical view of service status changes

## Quick Start

1. Fork and clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your services in `lib/config.ts`
4. Set up environment variables (see below)
5. Run the development server:
   ```bash
   npm run dev
   ```

## Redis Setup

OpenUptimes requires a Redis instance to store uptime data. You have several options:

1. **Local Development**: 
   - Install Redis locally: [Redis Quick Start](https://redis.io/topics/quickstart)
   - Use Docker: `docker run -p 6379:6379 redis`

2. **Production Deployment**:
   - [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/) (offers a free tier)
   - [Upstash](https://upstash.com/) (serverless Redis, works well with Vercel)
   - Any Redis-compatible service

## Environment Variables

Create a `.env.local` file with the following variables:

```
# Redis Connection URL
# Format: redis[s]://[[username][:password]@][host][:port][/db-number]
REDIS_URL=redis://localhost:6379

# Site Configuration
NEXT_PUBLIC_SITE_NAME="OpenUptimes"
NEXT_PUBLIC_SITE_DESCRIPTION="Service Status Monitor" 
NEXT_PUBLIC_REFRESH_INTERVAL=60000
```

When deploying to Vercel, add these environment variables in your project settings.

## Redis Connection URL Format

The Redis URL follows this format:
- `redis://` - Standard Redis protocol
- `rediss://` - Use for SSL/TLS encrypted connection
- `username:password@` - Authentication credentials (if required)
- `host` - Hostname or IP address of Redis server
- `port` - Redis port (default: 6379)
- `/db-number` - Redis database number (default: 0)

Examples:
- Local: `redis://localhost:6379`
- With auth: `redis://username:password@redis.example.com:6379`
- With SSL: `rediss://username:password@redis.example.com:6379`

## Configuration

Configure the services you want to monitor in `lib/config.ts`:

```typescript
export const services: ServiceConfig[] = [
  { 
    name: "My Website", 
    url: "https://example.com",
    description: "Main website" 
  },
  { 
    name: "API Service", 
    url: "https://api.example.com",
    description: "Backend API",
    expectedStatus: 200
  }
];
```

Each service requires:
- `name`: Display name for the service
- `url`: The URL to check
- `description`: (Optional) Description of the service
- `expectedStatus`: (Optional) HTTP status code to expect (defaults to 200)

## Frontend Components

### StatusHeader

Displays a summary of the overall system status:
- Overall status message based on service health
- Count of operational vs disrupted services
- Last update timestamp

### StatusCard

Individual service status cards showing:
- Service name and description
- Current status with visual indicators
- Response time and HTTP status code
- Historical status data when enabled

### ServiceHistory

Displays historical uptime data for each service:
- Timestamp of status checks
- Status results with color-coding
- Response times for performance tracking

## How It Works

1. The system uses the `/api/ping` endpoint to regularly check the status of all configured services
2. Results are stored in Redis with a timestamp and performance metrics
3. The frontend periodically fetches current status via the `/api/status` endpoint
4. The UI automatically updates to reflect the latest status information
5. Historical data can be viewed to track performance over time

## Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fopenuptimes)

When deploying to Vercel:
1. Connect your GitHub repository
2. Add the REDIS_URL environment variable pointing to your Redis instance
3. Deploy

## Troubleshooting

If you encounter issues with the status not displaying:

1. Verify Redis connection in the server logs
2. Try accessing the `/api/test-redis` endpoint to check Redis connectivity
3. Make sure your services are properly configured in `lib/config.ts`
4. Check browser console for any errors in the network requests

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
