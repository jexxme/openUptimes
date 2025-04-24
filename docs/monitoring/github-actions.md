# GitHub Actions Monitoring

GitHub Actions provides a reliable, maintenance-free way to monitor your services in OpenUptimes. This approach eliminates the need for dedicated servers or complex cron job setups.

## Overview

The GitHub Actions monitoring system works by:

1. Running a scheduled workflow in your GitHub repository
2. Calling your OpenUptimes instance's ping API endpoint at regular intervals
3. Checking the status of all your configured services
4. Updating their status in Redis
5. Displaying the results on your status page

## Compatibility

GitHub Actions monitoring is compatible with all deployment types:

- Serverless platforms (Vercel, Netlify, etc.)
- Traditional servers and VPS
- Docker containers
- Self-hosted environments

!!! tip "Recommended for serverless deployments"
    If you're deploying on Vercel or another serverless platform, GitHub Actions is the **recommended** monitoring method since the [internal cron system](cron-system.md) won't work in those environments.

## Features

- **Zero infrastructure**: Uses GitHub's servers to run checks
- **Reliable scheduling**: Backed by GitHub's infrastructure
- **Simple setup**: Just a single workflow file
- **Built-in history**: GitHub stores logs of all runs
- **Manual trigger option**: Run checks on-demand through GitHub interface
- **Familiar workflow**: Uses standard GitHub Actions syntax

## Setup Instructions

### 1. Generate an API Key

1. Log in to your OpenUptimes admin dashboard
2. Navigate to the GitHub Actions setup page
3. Generate a new API key (or use an existing one)
4. Copy the key for the next step

### 2. Configure GitHub Repository Secrets

1. Go to your GitHub repository that contains OpenUptimes
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Create a secret named `PING_API_KEY` with your API key as the value
5. Click **Add secret**

### 3. Create the Workflow File

Create a file at `.github/workflows/ping.yml` in your repository with the following content:

```yaml
name: OpenUptimes Ping Check

on:
  schedule:
    # Runs every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch:  # Allows manual triggering

jobs:
  ping:
    name: Ping Service Check
    runs-on: ubuntu-latest
    steps:
      - name: Perform Ping
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/ping" \
          -H "Authorization: Bearer ${{ secrets.PING_API_KEY }}" \
          -H "User-Agent: GitHub-Actions-OpenUptimes" \
          -H "Content-Type: application/json" \
          --fail
        env:
          APP_URL: ${{ vars.APP_URL || 'https://your-openuptimes-url.com' }}
```

### 4. Configure Repository Variables

1. In your repository, go to **Settings** > **Secrets and variables** > **Actions**
2. Click on the **Variables** tab
3. Click **New repository variable**
4. Create a variable named `APP_URL` with the URL of your OpenUptimes instance
5. Click **Add variable**

### 5. Enable in Application

1. In your OpenUptimes admin dashboard, go to the monitoring settings
2. Enable GitHub Actions monitoring
3. Configure any additional settings as needed

## Schedule Configuration

GitHub Actions uses standard cron syntax for scheduling. The minimum interval is 5 minutes.

Some example schedules:

- `*/5 * * * *`: Every 5 minutes (recommended)
- `*/15 * * * *`: Every 15 minutes
- `0 * * * *`: Every hour at minute 0
- `0 */2 * * *`: Every 2 hours

!!! warning "GitHub scheduling limitations"
    GitHub Actions schedules are not guaranteed to run at the exact specified time. There may be delays, especially during periods of high GitHub usage. For more precise timing, consider the [internal cron system](cron-system.md) if you're on a compatible hosting platform.

## Manual Triggers

You can manually trigger a check at any time:

1. Go to the **Actions** tab in your GitHub repository
2. Select the "OpenUptimes Ping Check" workflow
3. Click **Run workflow**
4. Select the branch and click **Run workflow** again

## Viewing Run History

To see the history of all ping checks:

1. Go to the **Actions** tab in your GitHub repository
2. Click on the "OpenUptimes Ping Check" workflow
3. View the list of all workflow runs with their status and timestamps

## Troubleshooting

### Common Issues

#### Workflow Not Running

If your workflow isn't running on schedule:

1. Verify the workflow file is properly formatted
2. Check that GitHub Actions is enabled for your repository
3. Check if your GitHub account has available action minutes (for private repositories)
4. GitHub may disable scheduled workflows for repositories with no recent activity

#### Authentication Failures

If you see 401 (Unauthorized) errors:

1. Verify the `PING_API_KEY` secret matches the key in your OpenUptimes instance
2. Check that the key is being properly passed in the Authorization header

#### Connection Failures

If you see connection errors:

1. Verify that the `APP_URL` is correct and accessible from the internet
2. Check that your OpenUptimes instance is running
3. Ensure there are no firewalls blocking GitHub's IPs

## API Integration Details

The GitHub Actions workflow calls your ping API endpoint with:

- **Method**: GET
- **Path**: `/api/ping`
- **Headers**:
  - `Authorization: Bearer {your-api-key}`
  - `User-Agent: GitHub-Actions-OpenUptimes`
  - `Content-Type: application/json`

The API automatically:
- Records the GitHub Actions run ID
- Adds the ping to the history
- Updates the status of all services
- Returns a detailed response with timing information 