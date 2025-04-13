# OpenUptimes

A self-hosted, zero-dependency status page to monitor and display the uptime of your services. Built with Next.js, Tailwind CSS, and node-redis.

## Features

- 🚀 One-click deploy on Vercel
- 🔌 Plug-and-play setup
- 📊 Monitors uptime of custom services
- 📝 Logs and displays uptime history
- 🛑 Zero external services (uses your own Redis instance)
- 🧹 Minimal, clean, contributor-friendly codebase

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Storage**: Redis (via node-redis)
- **Monitoring**: Vercel Functions + Client-side Polling
- **Deployment**: Vercel Deploy Button

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

## Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fopenuptimes)

When deploying to Vercel:
1. Connect your GitHub repository
2. Add the REDIS_URL environment variable pointing to your Redis instance
3. Deploy

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
