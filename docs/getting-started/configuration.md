# Configuration

After installing OpenUptimes, you'll want to configure it to suit your needs. This page covers the various configuration options available.

## Admin Dashboard

OpenUptimes provides an admin dashboard at `/admin` where you can easily configure all your services without touching any code.

Through the admin dashboard, you can:

- Add new services to monitor
- Edit existing service configurations
- Delete services you no longer wish to monitor
- View monitoring history and statistics
- Configure GitHub Actions integration

![Admin Dashboard](../assets/admin-dashboard.png)

## Service Configuration

Each service can be configured with:

| Setting | Description | Default |
|---------|-------------|---------|
| Name | Display name for the service | *Required* |
| URL | The URL to check | *Required* |
| Description | Description of the service | *Optional* |
| Expected Status | HTTP status code to expect | 200 |
| Method | HTTP method to use | GET |
| Timeout | Timeout in milliseconds | 10000 |

### Adding a Service

To add a new service:

1. Navigate to the admin dashboard at `/admin`
2. Click the **Add Service** button
3. Fill in the service details
4. Click **Save**

### Editing a Service

To edit an existing service:

1. Navigate to the admin dashboard at `/admin`
2. Find the service you want to edit
3. Click the **Edit** button
4. Update the service details
5. Click **Save**

### Deleting a Service

To delete a service:

1. Navigate to the admin dashboard at `/admin`
2. Find the service you want to delete
3. Click the **Delete** button
4. Confirm the deletion

## Environment Variables

OpenUptimes supports the following environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `REDIS_URL` | URL to your Redis instance | - | Yes |
| `NEXT_PUBLIC_SITE_NAME` | Name of your status page | "OpenUptimes" | No |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Short description | "Service Status Monitor" | No |
| `NEXT_PUBLIC_REFRESH_INTERVAL` | Refresh interval in ms | 60000 | No |

### Setting Environment Variables

#### On Vercel

1. Go to your project in the Vercel dashboard
2. Click on **Settings** > **Environment Variables**
3. Add each environment variable and its value
4. Click **Save**
5. Redeploy your project for the changes to take effect

#### Self-Hosted

For local development or self-hosted deployment:

1. Create or edit the `.env.local` file in the root directory
2. Add each environment variable:

```
REDIS_URL="redis://username:password@host:port"
NEXT_PUBLIC_SITE_NAME="My Status Page"
NEXT_PUBLIC_SITE_DESCRIPTION="Service Status Monitor"
NEXT_PUBLIC_REFRESH_INTERVAL=60000
```

!!! warning
    Never commit your `.env.local` file to version control, as it may contain sensitive information.

## GitHub Actions Configuration

For GitHub Actions monitoring, you'll need to:

1. Generate an API key through the admin dashboard
2. Add the API key as a repository secret (named `PING_API_KEY` by default)
3. Create a workflow file in your repository at `.github/workflows/ping.yml`

See the [GitHub Actions Setup](../github-actions-setup.md) guide for detailed instructions.

## Redis Configuration

OpenUptimes uses Redis for data storage. Here are some Redis configuration tips:

### Redis Connection URL Format

```
redis[s]://[[username][:password]@][host][:port][/db-number]
```

### Redis Connection Examples

- Local: `redis://localhost:6379`
- With auth: `redis://username:password@redis.example.com:6379`
- With SSL: `rediss://username:password@redis.example.com:6379`

### Redis Memory Management

To prevent Redis from using too much memory, OpenUptimes implements automatic TTL (Time To Live) for historical data. By default, data is stored for 24 hours.

You can configure the TTL in the admin dashboard under **Debug** > **Ping History**.

## Advanced Configuration

For advanced users, OpenUptimes offers additional configuration options:

### Custom API Integrations

You can integrate OpenUptimes with other monitoring tools by using the API endpoints:

- **GET `/api/ping`**: Trigger a check of all services
- **GET `/api/status`**: Get the current status of all services
- **GET `/api/history/{serviceName}`**: Get historical data for a specific service

### Internal Cron System

OpenUptimes includes an internal cron system for more precise monitoring. This can be configured through the admin dashboard under **Debug** > **Ping Cron**. 