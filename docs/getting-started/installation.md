# Installation

OpenUptimes offers multiple installation methods to fit your specific needs. Choose the approach that works best for you.

## Option 1: Deploy to Vercel (Recommended)

The easiest way to get started with OpenUptimes is to deploy directly to Vercel with our one-click deploy button.

<div class="grid" markdown>

=== "Step 1: Deploy"

    Visit the [OpenUptimes repository](https://github.com/jexxme/openuptimes) and click the **Deploy with Vercel** button.

=== "Step 2: Configure settings"

    Fill in the project name and connect your GitHub account.
    
    Leave all the default settings as they are.

=== "Step 3: Deploy"

    Click **Deploy** and wait for the deployment to complete.

</div>

### Setting up Redis on Vercel

Once your site is deployed, you'll need to add Redis for data storage:

1. Go to your Vercel dashboard and open your newly deployed project
2. Click on **Storage** in the left sidebar
3. Click **Add** and select **Vercel Redis**
4. Follow the prompts to create a new Redis database
5. Once completed, Vercel will automatically add the Redis connection details to your project

## Option 2: Self-Hosted Deployment

For users who want more control over their deployment:

### Prerequisites

- Node.js 18 or later
- Redis database
- Git

### Installation Steps

1. Fork and clone the repository:

```bash
git clone https://github.com/jexxme/openuptimes.git
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

## Next Steps

After installation, you should:

1. [Set up GitHub Actions for monitoring](../github-actions-setup.md)
2. [Configure your services](configuration.md)
3. Customize your instance to match your brand

!!! note "Default Admin Access"
    When you first access `/admin`, you'll be prompted to create an admin password. Keep this password safe as it's required for all administrative operations.

!!! warning "Redis Connection"
    Make sure your Redis connection is properly configured. You can test it by visiting the `/api/test-redis` endpoint on your deployed instance. 