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
  <a href="#security">Security</a> •
  <a href="#authentication">Authentication</a> •
  <a href="#api-endpoints">API Endpoints</a> •
  <a href="#github-actions-monitoring">GitHub Actions Monitoring</a> •
  <a href="#alternative-monitoring">Alternative Monitoring</a> •
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

OpenUptimes is a lightweight status page that helps you monitor and display service uptime. With a clean interface and GitHub Actions integration, tracking your infrastructure's health is easy.

Simplicity is key: deployment takes minutes, configuration is minimal, and monitoring is automatic without complex setups. You only need a GitHub repository, a Redis instance, and a hosting provider like Vercel.

Built with Next.js, Tailwind CSS, and Redis, OpenUptimes offers a seamless experience across devices. It leverages GitHub Actions for reliable background monitoring, ensuring consistent uptime checks without extra services.

Unlike other solutions that require dedicated servers or costly subscriptions, OpenUptimes is self-contained and ideal for smaller projects needing a simple, low-maintenance solution with minimal configuration.

## Features

- 🚀 **One-click deploy** - Get started in seconds with Vercel
- 🔌 **Zero configuration** - Everything works out of the box
- 📊 **GitHub Actions integration** - First-class monitoring system without extra infrastructure
- 📝 **Historical data** - View uptime history and identify patterns
- 🛑 **Minimal dependencies** - Uses only GitHub Actions, Redis, and your hosting provider
- 🧹 **Clean, maintainable codebase** - Easy to understand and extend
- 🎨 **Beautiful, responsive UI** - Works on all devices
- 📱 **Mobile-first design** - Perfect experience on any screen size
- 🔄 **Auto-refreshing data** - Always see the latest status
- 🌐 **Flexible monitoring** - Use GitHub Actions or your own cronjobs for custom precision
- 🔧 **Simple Admin Dashboard** - Manage services through a clean web interface

## Motivation

OpenUptimes was created to provide an easy, simple, and free solution for monitoring service uptime without relying on complex infrastructure. By using GitHub Actions for monitoring along with your own Redis instance, it ensures that you have a lightweight system that's perfect for smaller projects and websites.

The solution is particularly suited for cases where:

- You need a simple status page without significant investment
- You want a "set it and forget it" monitoring solution
- You're looking for something that's quick to set up and requires minimal maintenance
- You prefer using familiar tools (GitHub and Vercel) rather than specialized monitoring services

## Quick Start

The fastest way to get started with OpenUptimes:

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account and wait for the initial deployment to complete
3. Set up Redis in your Vercel project (one-click integration)
4. Configure GitHub Actions for monitoring (automatic template provided)
5. Add your services through the admin dashboard at `/admin`

Total setup time: Less than 5 minutes! No coding or complex configuration required.

## Installation

Choose the installation method that works best for you:

### Option 1: Deploy to Vercel (Beginner-Friendly)

This is the easiest way to get started, even if you're not a technical user:

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account and wait for the initial deployment to complete
3. Set up Redis as a simple storage solution in your Vercel project:
   - In your Vercel dashboard, go to your newly deployed project
   - Click on "Storage" in the left sidebar
   - Click "Add" and select "Vercel Redis"
   - Follow the prompts to create a new Redis database
   - Once completed, Vercel will automatically add the Redis connection details to your project

4. Finish the setup:
   - Open your Admin page at "your-domain-as-set-in-vercel.com/admin" to add and configure your services

That's it! Your status page is now live at "your-domain-as-set-in-vercel.com" eg "status.mydomain.com" and ready for monitoring your services.

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

7. Set up GitHub Actions for monitoring (see [GitHub Actions Monitoring](#github-actions-monitoring))

8. For production, build and start:

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
- Configure GitHub Actions integration

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

<<<<<<< HEAD

### Environment Setup

OpenUptimes uses environment variables for configuration. For local development or self-hosted deployment:

1. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and set your Redis URL and other settings:

   ```
   REDIS_URL="redis://username:password@host:port"
   NEXT_PUBLIC_SITE_NAME="My Status Page"
   NEXT_PUBLIC_SITE_DESCRIPTION="Service Status Monitor"
   NEXT_PUBLIC_REFRESH_INTERVAL=60000
   ```

3. Make sure `.env.local` is in your `.gitignore` file to prevent accidentally committing sensitive information.

## Security

### Protecting Sensitive Information

To ensure your Redis credentials and other sensitive data remain secure:

1. **Never commit .env files:** The repository includes .gitignore rules to prevent committing .env.local and other environment files.

2. **Use .env.example:** We provide a template `.env.example` file with placeholder values to show the required configuration without exposing real credentials.

3. **Rotate credentials:** If you suspect your Redis credentials have been exposed, immediately rotate them.

4. **Use environment variables:** In production environments like Vercel, use their environment variable system rather than committed files.

5. **Monitor access:** Regularly check your Redis instance access logs for unusual activity.

=======
>>>>>>> 8fec9776aae84c42d0dc1acac919a26d9cd27c45
>>>>>>>
## Authentication

OpenUptimes uses a secure, Redis-based authentication system to protect admin and debug routes.

### Authentication Architecture

The authentication system is designed with the following principles:

1. **Simplicity**: Simple password-based authentication by default
2. **Security**: Secure password hashing with salting
3. **Stateless**: Token-based authentication using HTTP-only cookies
4. **Extensibility**: Provider-based architecture for future authentication methods
5. **Brute Force Protection**: Rate limiting with exponential backoff

### How It Works

1. **Initial Setup**:
   - During first-time setup, you create an admin password
   - The password is securely hashed (SHA-256) with a unique salt
   - The hash is stored in Redis under the key `admin:password`

2. **Login Process**:
   - User submits credentials via `/login` page
   - Server validates credentials against stored hash
   - On successful authentication, a random 32-character session token is generated
   - Token is stored in Redis with a 24-hour expiration
   - Token is sent to the client as an HTTP-only cookie

3. **Session Validation**:
   - Every protected route checks for the presence of the auth cookie
   - Token is validated against Redis to ensure the session is active
   - If validation fails, user is redirected to the login page
   - Sessions automatically expire after 24 hours

4. **Logout Process**:
   - Session token is removed from Redis
   - Auth cookie is cleared using multiple browser-compatible methods

5. **Brute Force Protection**:
   - Failed login attempts are tracked by IP address
   - After multiple failed attempts, the IP is temporarily blocked
   - Block duration increases exponentially with repeated failures
   - System returns appropriate 429 status code with Retry-After header
   - All responses include security headers to prevent common attacks

### Authentication Providers

The system uses a provider-based architecture that allows for easy extension:

```typescript
// Interface for authentication providers
interface AuthProvider {
  type: string;
  verify(credentials: any): Promise<boolean>;
  getUserInfo?(): Promise<any>;
}

// Default password provider implementation
class PasswordAuthProvider implements AuthProvider {
  type = 'password';
  
  async verify(credentials: { password: string }): Promise<boolean> {
    // Verifies password against stored hash
    return verifyPassword(credentials.password);
  }
}
```

### Extending the Authentication System

OpenUptimes is designed to be easily extended with additional authentication methods:

#### Adding OAuth (Google, GitHub, etc.)

1. **Create a new provider class**:

```typescript
class OAuthProvider implements AuthProvider {
  type = 'oauth';
  provider: string; // 'google', 'github', etc.
  
  constructor(config: { provider: string, clientId: string, clientSecret: string }) {
    this.provider = config.provider;
    // Store OAuth configuration
  }
  
  async verify(credentials: { code: string }): Promise<boolean> {
    // Exchange authorization code for tokens
    // Validate tokens with the OAuth provider
    return isValid;
  }
  
  async getUserInfo(): Promise<any> {
    // Fetch user profile from OAuth provider
    return userProfile;
  }
}
```

2. **Register the provider** in the provider factory:

```typescript
function createAuthProvider(type: string, config?: any): AuthProvider {
  switch (type) {
    case 'password':
      return new PasswordAuthProvider();
    case 'oauth':
      return new OAuthProvider(config);
    default:
      return new PasswordAuthProvider();
  }
}
```

3. **Add UI components** for the new authentication method

4. **Update API routes** to handle OAuth redirects and token exchanges

#### Adding SSO (SAML, OIDC)

Similar to OAuth, you can implement Single Sign-On by:

1. Creating a provider for your SSO protocol
2. Handling the appropriate authentication flows
3. Integrating with your identity provider

#### Custom Authentication Schemes

For specialized use cases, you can implement custom authentication providers:

```typescript
class CustomProvider implements AuthProvider {
  type = 'custom';
  
  async verify(credentials: any): Promise<boolean> {
    // Your custom verification logic
    return isValid;
  }
}
```

### Security Considerations

- All passwords are salted and hashed using SHA-256
- Sessions are stored in Redis with automatic expiration
- Auth cookies are HTTP-only to prevent JavaScript access
- Secure flag ensures cookies are only sent over HTTPS
- Cookies use SameSite=Lax to prevent CSRF attacks
- Sessions can be invalidated server-side at any time
- IP-based rate limiting prevents brute force attacks
- Progressive delays increase with each failed attempt
- Security headers protect against common web vulnerabilities:
  - X-Content-Type-Options: prevents MIME type sniffing
  - X-Frame-Options: prevents clickjacking attacks
  - Cache-Control: prevents sensitive data caching

### Authentication API Endpoints

- **POST `/api/auth/login`**: Authenticates a user and creates a session
- **POST `/api/auth/logout`**: Invalidates the current session
- **GET `/api/auth/validate`**: Validates the current session token
- **POST `/api/admin/password/reset`**: Allows password reset with Redis credentials

## GitHub Actions Monitoring

OpenUptimes treats GitHub Actions as a first-class citizen for service monitoring. This approach eliminates the need for external cron jobs or dedicated servers, making the system more accessible and easier to maintain.

### How It Works

1. A GitHub Actions workflow is set up in your repository
2. The workflow runs on a schedule (typically every 5-15 minutes)
3. Each run calls the ping API endpoint of your OpenUptimes instance
4. The ping API checks all your configured services and updates their status in Redis
5. Your status page displays the latest status information

### Important Considerations

- **Standard Monitoring**: GitHub Actions scheduling is designed for standard monitoring needs with a minimum interval of 5 minutes
- **Use Case**: Perfect for general status monitoring and long-term uptime analytics
- **Target Audience**: Best suited for smaller projects and websites that need a simple, low-maintenance monitoring solution

### Setting Up GitHub Actions Monitoring

1. Generate an API key through the admin dashboard
2. Add the API key as a repository secret (named `PING_API_KEY` by default)
3. Create a workflow file in your repository at `.github/workflows/ping.yml`:

```yaml
name: Ping Services

on:
  schedule:
    # Runs every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Call Ping API
        run: |
          curl -X GET "https://your-domain.com/api/ping" \
          -H "Authorization: Bearer ${{ secrets.PING_API_KEY }}"
```

4. Enable GitHub Actions in the admin dashboard

For more detailed instructions, visit the configuration page at `/debug/ping/github`.

### Customization Options

You can customize the GitHub Actions monitoring by:

- Adjusting the schedule frequency in the cron expression
- Adding additional conditions for when to run the workflow
- Implementing custom notification logic in the workflow
- Using a different API endpoint or monitoring service

## Alternative Monitoring

While GitHub Actions provides a simple, maintenance-free way to monitor your services, you can also use external tools for more precise monitoring if needed.

### External Cron Jobs for Precise Measurement

Since OpenUptimes is extremely lightweight, its ping endpoint can handle frequent calls without issue. This means you can use external cron services to check your services as frequently as every 30 seconds or 1 minute for more precise downtime detection.

#### Setup Options

1. **Custom Cron Server**:

   ```bash
   # Example crontab entry for checking every minute
   * * * * * curl -X GET "https://your-domain.com/api/ping" -H "Authorization: Bearer YOUR_API_KEY"
   ```

2. **Cloud-based Cron Services** such as:
   - [Easycron](https://www.easycron.com/)
   - [Cron-job.org](https://cron-job.org/)
   - AWS CloudWatch Events/Lambda
   - Google Cloud Scheduler

3. **CI/CD Pipelines**:
   - GitLab CI/CD with more precise scheduling
   - Jenkins
   - Circle CI

With these external tools checking your services more frequently, you can achieve near real-time monitoring while still using the same simple OpenUptimes interface.

### Benefits of External Cron Jobs

- **Higher Precision**: Detect outages within seconds or minutes instead of 5+ minutes
- **Custom Intervals**: Choose exactly how frequently you want to monitor
- **Independent System**: Monitoring continues even if GitHub is experiencing issues
- **Regional Monitoring**: Set up cron jobs in different regions to check from various locations

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

### GitHub Actions Not Running

If your GitHub Actions workflow isn't running:

1. Check if the workflow is enabled in your repository's Actions settings
2. Verify that the cron schedule is correctly formatted
3. Ensure the API key is properly set as a repository secret
4. Check the workflow run history for any error messages

### Status Not Updating

If your service statuses aren't updating:

1. Check browser console for any errors
2. Verify the `/api/ping` endpoint is working
3. Ensure your Redis instance is working properly
4. Check that your service URLs are accessible from your deployment environment
5. Verify your GitHub Actions workflow is running successfully

### Admin UI Issues

If you're having trouble with the admin interface:

1. Make sure you're accessing the correct URL: `your-domain.com/admin`
2. Check that your Redis connection is working properly (try `/api/test-redis`)
3. Clear your browser cache and cookies if you see outdated information
4. Ensure your browser has JavaScript enabled

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
- **Monitoring**: GitHub Actions + Client-side Polling
- **Deployment**: Vercel

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<p align="center">
Made on a healthy dose of ☕️
</p>
