# Internal Cron System

The internal cron system provides flexible and precise service monitoring without relying on external services. This system runs within your OpenUptimes instance, offering fine control over monitoring schedules.

## Overview

The cron system is built on a Redis-backed job scheduler that works directly within your OpenUptimes application. It's designed for environments where you need:

- Precise monitoring intervals (down to 1 minute)
- Complete control over job scheduling
- Detailed execution history and analytics
- Independence from external services

## Architecture

The system consists of these components:

1. **Job Storage**: Each cron job is stored in Redis with a unique identifier
2. **Job Scheduler**: Background process that checks for jobs due to run
3. **Execution Engine**: Executes ping checks based on job definitions
4. **History Tracker**: Records execution details for auditing and analysis
5. **Management API**: Allows creating, updating, and deleting jobs via REST endpoints

## Compatibility

!!! warning "Not compatible with serverless platforms"
    The internal cron system requires a persistent runtime environment and will not work on serverless platforms like Vercel or Netlify. If you're using a serverless platform, please use [GitHub Actions monitoring](github-actions.md) instead.

Compatible environments:
- Traditional VPS/dedicated servers
- Docker containers
- Self-hosted environments
- PaaS platforms with persistent runtimes

## Features

- **Flexible Scheduling**: Standard cron syntax for precise scheduling control (e.g., `*/1 * * * *` for every minute)
- **Job Management**: Create, update, pause, resume, and delete jobs through the admin interface
- **Execution History**: Track every job execution with status, duration, and error details
- **Redis Backend**: Lightweight storage that keeps everything in memory for fast access
- **Error Handling**: Automatic error detection and reporting for job failures
- **Execution Metrics**: Performance tracking for each job execution
- **Restart Recovery**: Jobs persist across application restarts
- **Zero External Dependencies**: Runs entirely within your OpenUptimes instance

## Setup and Configuration

### Creating a New Job

1. Navigate to `/debug/ping/cron` in your OpenUptimes admin panel
2. Click "New Job"
3. Fill in the job details:
   - **Name**: Descriptive name for the job (e.g., "Every Minute Check")
   - **Description**: (Optional) Additional information about the job
   - **Cron Expression**: Schedule in cron format (e.g., `*/1 * * * *` for every minute)
   - **Enabled**: Toggle to activate/deactivate the job immediately
4. Click "Create Job"

### Managing Existing Jobs

From the cron debug interface, you can:

- **Start/Stop Jobs**: Pause or resume any job
- **Edit Jobs**: Modify the name, description, schedule, or enabled status
- **Delete Jobs**: Remove jobs you no longer need
- **Clone Jobs**: Create a new job based on an existing configuration
- **View History**: See execution logs for each job
- **View Metrics**: Monitor performance metrics like execution time

## Understanding Cron Expressions

Cron expressions follow the standard format with five fields:

```
┌───────────── minute (0-59)
│ ┌───────────── hour (0-23)
│ │ ┌───────────── day of the month (1-31)
│ │ │ ┌───────────── month (1-12)
│ │ │ │ ┌───────────── day of the week (0-6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

Common examples:
- `* * * * *`: Every minute
- `*/5 * * * *`: Every 5 minutes
- `0 * * * *`: Every hour on the hour
- `0 0 * * *`: Once a day at midnight
- `0 0 * * 0`: Once a week on Sunday at midnight

## Best Practices

### Performance Considerations

- **Job Frequency**: Be mindful of how frequently you schedule jobs. For most websites, checks every 1-5 minutes provide a good balance between timeliness and resource usage.
- **Execution Time**: Monitor how long your jobs take to execute. If they consistently take more than a few seconds, consider reducing the number of services or decreasing the frequency.
- **Concurrent Jobs**: The system can handle multiple concurrent jobs, but high concurrency may impact performance. Stagger job schedules when possible.

### Monitoring Strategy

- **Tiered Approach**: Consider a tiered monitoring strategy:
  - Critical services: Check every minute
  - Important services: Check every 5 minutes
  - Non-critical services: Check every 15-30 minutes
- **Business Hours**: For internal tools, you may want more frequent checks during business hours and reduced frequency after hours.

## Troubleshooting

### Jobs Not Running

If your cron jobs aren't executing as expected:

1. **Check the job status**: Ensure the job is marked as "running" in the job list
2. **Verify Redis connection**: Jobs require a functioning Redis connection
3. **Check cron expression**: Validate that your cron expression is formatted correctly
4. **Review execution history**: Look for errors or patterns in previous executions
5. **Verify server time**: Ensure your server's time is correctly synchronized (NTP)
6. **Check for failed executions**: Previous failures might have caused automatic disabling

### Performance Issues

If you notice slow performance:

1. **Reduce job frequency**: Consider increasing the interval between job executions
2. **Limit concurrent jobs**: Stagger job schedules to avoid resource contention
3. **Check service response times**: Slow services may be impacting job execution time
4. **Monitor Redis performance**: Ensure your Redis instance isn't under resource pressure
5. **Review job history size**: Large history datasets may impact Redis performance

## API Endpoints for Cron Management

For programmatic cron job management, the following API endpoints are available:

- **GET `/api/ping/cron`**: List all cron jobs (or get a specific job with `?id=job_id`)
- **POST `/api/ping/cron`**: Create a new cron job
- **PUT `/api/ping/cron`**: Update an existing cron job
- **DELETE `/api/ping/cron?id=job_id`**: Delete a cron job
- **GET `/api/ping/cron?id=job_id&history=true`**: Get execution history for a job

All endpoints require authentication and accept/return JSON data. 