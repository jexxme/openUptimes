# OpenUptimes

<p align="center">
  <img src="public/default-favicon.svg" alt="OpenUptimes Logo" width="120" />
</p>

<p align="center">
  A simple, elegant, and self-hosted status page to monitor and display the uptime of your services.
</p>

<p align="center">
  <a href="#introduction">Introduction</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#installation">Installation</a> •
  <a href="#configuration">Configuration</a> •
  <a href="#api-endpoints">API Endpoints</a> •
  <a href="#automated-ping-system">Automated Ping System</a> •
  <a href="#troubleshooting">Troubleshooting</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/openuptimes/openuptimes">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

## Introduction

OpenUptimes is a modern, lightweight status page designed to help you monitor and display the uptime of your services. With its clean interface and real-time updates, you can easily keep track of your infrastructure's health and share this information with your users.

Built with Next.js, Tailwind CSS, and Redis, OpenUptimes provides a seamless experience across all devices and can be deployed in minutes. The system leverages Vercel's Edge Runtime for reliable background monitoring, ensuring consistent uptime checks even without frontend interaction.

Unlike other solutions that require external cron jobs or additional infrastructure, OpenUptimes is fully self-contained and runs entirely on serverless and edge functions, making it perfect for one-click deployment with zero configuration.

## Features

- 🚀 **One-click deploy** - Get started in seconds with Vercel
- 🔌 **Plug-and-play setup** - Minimal configuration required
- 📊 **Real-time monitoring** - Track your services' status in real-time
- 📝 **Historical data** - View uptime history and identify patterns
- 🛑 **Zero external dependencies** - Uses only your own Redis instance
- 🧹 **Clean, maintainable codebase** - Easy to understand and extend
- 🎨 **Beautiful, responsive UI** - Works on all devices
- 📱 **Mobile-first design** - Perfect experience on any screen size
- 🔄 **Auto-refreshing data** - Always see the latest status
- **Automated Service Monitoring**: Background ping mechanism regularly checks service availability
- **Serverless-compatible**: Runs entirely on Edge and Serverless functions
- **Self-sustaining ping system**: No need for external cron jobs or schedulers
- **Admin Dashboard**: Manage services, view status history, and configure settings

## Motivation

OpenUptimes was created to provide an easy, simple, and free solution for monitoring service uptime without relying on external dependencies. By using only your own Redis instance, it ensures that you have full control over your data and infrastructure.

It is also (currently) 100% free and open source, so you can start using it right away and self-host it later if you want.

## Installation

Choose the installation method that works best for you:

### Option 1: Deploy to Vercel (Beginner-Friendly)

This is the easiest way to get started, even if you're not a technical user:

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account and wait for the initial deployment to complete
3. Set up Redis in your Vercel project:
   - In your Vercel dashboard, go to your newly deployed project
   - Click on "Storage" in the left sidebar
   - Click "Add" and select "Vercel Redis"
   - Follow the prompts to create a new Redis database
   - Once completed, Vercel will automatically add the Redis connection details to your project

4. Configure your project:
   - In your Vercel project dashboard, go to "Settings" → "Environment Variables"
   - Add the following environment variables:
     ```
     NEXT_PUBLIC_SITE_NAME=Your Status Page Name
     NEXT_PUBLIC_SITE_DESCRIPTION=A brief description of your status page
     NEXT_PUBLIC_REFRESH_INTERVAL=60000
     ```
   - Navigate to your site's Admin page at "your-domain.com/admin" to add and configure your services
   - Your status page will now display and monitor all your configured services!

That's it! Your status page is now live and monitoring your services.

### Option 2: Self-Hosted Deployment (Advanced)

For users who want more control over their deployment:

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/openuptimes/openuptimes.git
   cd openuptimes
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Redis:
   - Install Redis locally: [Redis Quick Start](https://redis.io/topics/quickstart)
   - Or use Docker: `docker run -p 6379:6379 redis`
   - Or use a managed Redis service like [Upstash](https://upstash.com/) or [Redis Cloud](https://redis.com/redis-enterprise-cloud/overview/)

4. Create a `.env.local` file:
   ```
   REDIS_URL=redis://localhost:6379
   NEXT_PUBLIC_SITE_NAME="OpenUptimes"
   NEXT_PUBLIC_SITE_DESCRIPTION="Service Status Monitor"
   NEXT_PUBLIC_REFRESH_INTERVAL=60000
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Navigate to `http://localhost:3000/admin` to configure your services

7. For production, build and start:
   ```bash
   npm run build
   npm run start
   ```

## Configuration

OpenUptimes provides an admin dashboard at `/admin` where you can easily configure all your services without touching any code. 

Through the admin dashboard, you can:
- Add new services to monitor
- Edit existing service configurations
- Delete services you no longer wish to monitor
- View monitoring history and statistics

Each service can be configured with:
- Name: Display name for the service
- URL: The URL to check
- Description: (Optional) Description of the service
- Expected Status: (Optional) HTTP status code to expect (defaults to 200)
- Method: (Optional) HTTP method to use (defaults to GET)
- Timeout: (Optional) Timeout in milliseconds (defaults to 10000)

### Environment Variables

OpenUptimes supports the following environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | URL to your Redis instance | - | Yes |
| `NEXT_PUBLIC_SITE_NAME` | Name of your status page | "OpenUptimes" | No |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Short description | "Service Status Monitor" | No |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Refresh interval in ms | 60000 | No |

## API Endpoints

OpenUptimes provides several API endpoints for monitoring and configuring services:

### Core Monitoring Endpoints

- **GET `/api/ping`**: Actively checks the status of all configured services and stores results in Redis
- **GET `/api/status`**: Retrieves the current status of all services
- **GET `/api/history/{serviceName}`**: Retrieves historical data for a specific service

### Service Management Endpoints

- **GET `/api/services`**: Lists all configured services
- **POST `/api/services`**: Adds a new service to monitor
- **PUT `/api/services?name={serviceName}`**: Updates an existing service
- **DELETE `/api/services?name={serviceName}`**: Deletes a service

### Setup and Configuration

- **GET `/api/setup/status`**: Checks if the initial setup has been completed
- **POST `/api/setup/complete`**: Marks the setup as completed
- **POST `/api/setup/reset`**: Resets the application to its initial state

## Automated Ping System

OpenUptimes implements an innovative self-sustaining ping mechanism that works reliably in serverless environments without requiring traditional cron jobs:

### How It Works

1. **Edge Runtime Execution**: The system uses Next.js Edge Runtime which allows for longer execution times than standard serverless functions
2. **Self-scheduling Architecture**: The ping system schedules its own next ping using Redis locks and timeouts
3. **Automatic Bootstrap**: Whenever the application starts (or receives traffic), the ping cycle is automatically initialized
4. **Fault Tolerance**: Multiple failsafe mechanisms ensure consistent monitoring even in edge cases

### System Components

- **Edge Ping Function**: Long-running Edge Runtime function that bootstraps the cycle
- **Ping Scheduler**: Coordinates ping timing and prevents overlap using Redis locks
- **Service Monitor**: The actual service checking mechanism that stores uptime data
- **Stats Endpoint**: Provides visibility into the ping system's operations

### Technical Details

- No traditional cron jobs or external schedulers required
- Works within Vercel and other serverless platforms' constraints
- Automatically adapts to the configured refresh interval
- Resistant to cold starts and serverless function timeouts
- Maintains consistent ping intervals without frontend interaction

### Debugging (Development Only)

When running in development mode, OpenUptimes provides a debug interface at `/debug/ping` that allows you to:

- Monitor ping system statistics in real-time
- Trigger manual pings through different components of the system
- View ping history and intervals
- Troubleshoot the monitoring system

## Troubleshooting

### Redis Connection Issues

If you're having trouble connecting to Redis:

1. **Check your Redis URL format**:
   ```
   redis[s]://[[username][:password]@][host][:port][/db-number]
   ```

2. **Test Redis connectivity**:
   Visit `/api/test-redis` in your browser to verify connectivity

3. **Redis URL examples**:
   - Local: `redis://localhost:6379`
   - With auth: `redis://username:password@redis.example.com:6379`
   - With SSL: `rediss://username:password@redis.example.com:6379`

### Status Not Updating

If your service statuses aren't updating:

1. Check browser console for any errors
2. Verify the `/api/ping` endpoint is working
3. Ensure your Redis instance is working properly
4. Check that your service URLs are accessible from your deployment environment

### Admin UI Issues

If you're having trouble with the admin interface:

1. Make sure you're accessing the correct URL: `your-domain.com/admin`
2. Check that your Redis connection is working properly (try `/api/test-redis`)
3. Clear your browser cache and cookies if you see outdated information
4. Ensure your browser has JavaScript enabled

### Vercel Deployment Issues

1. Ensure all environment variables are set correctly
2. Check that the Vercel Redis integration is properly configured
3. Review build logs for any errors during deployment

## Contributing

We welcome contributions to OpenUptimes! Here's how you can help:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

Please make sure your code follows our style guidelines and includes appropriate tests.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Storage**: Redis (via node-redis)
- **Monitoring**: Vercel Edge Functions + Client-side Polling
- **Deployment**: Vercel

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
Made on a healthy dose of ☕️
</p>

## Architecture

### Automated Ping System

OpenUptimes implements a self-sustaining ping mechanism that works reliably in serverless environments:

1. **Edge Function**: Uses Next.js Edge Runtime for longer execution times
2. **Self-scheduling**: The system schedules its own next ping using a combination of edge functions and redis locks
3. **Bootstrap**: App initialization triggers the ping cycle on startup
4. **Failsafe**: Multiple safety mechanisms ensure consistent pinging

### Key Components

- `/api/ping-scheduler`: Manages ping scheduling and Redis locking
- `/api/edge-ping`: Edge runtime function that creates a self-sustaining ping cycle
- `/api/ping`: Performs the actual service status checks
- `/api/ping-stats`: Provides status information about the ping system

## Getting Started

1. Set up a Redis instance (e.g., Upstash Redis)
2. Configure environment variables (see `.env.example`)
3. Deploy to Vercel or run locally with `npm run dev`
