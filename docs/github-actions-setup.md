# Setting Up GitHub Actions for OpenUptimes Ping System

This document explains how to set up the GitHub Actions workflow to power the OpenUptimes ping system.

## Overview

The OpenUptimes ping system uses GitHub Actions to schedule and execute regular ping checks of your monitored services. This approach offers several advantages:

- Reliable scheduling with GitHub's infrastructure
- Independent execution outside your application server
- Better handling of cold starts and server issues
- Detailed run history and logs in GitHub

## Setup Steps

### 1. Repository Configuration

1. Make sure your OpenUptimes application is in a GitHub repository
2. The repository can be public or private

### 2. Create Required Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** > **Secrets and variables** > **Actions**
3. Add the following secrets:
   - `PING_API_KEY`: A secure random string to authenticate ping requests (you define this)

### 3. Add Repository Variables

1. In the same section, go to the **Variables** tab
2. Add the following variable:
   - `APP_URL`: The full URL to your deployed OpenUptimes application (e.g., `https://status.example.com`)

### 4. GitHub Actions Workflow File

The application includes a `.github/workflows/ping.yml` file that defines the workflow. This file should already be in your repository.

Key configurations in the workflow file:
- Schedule: Defined by the cron expression in the `on.schedule` section
- Authentication: Uses the `PING_API_KEY` secret
- Application URL: Uses the `APP_URL` variable

### 5. Application Configuration

1. Go to the Ping Debug page in your OpenUptimes application
2. Configure the GitHub Actions settings:
   - **Schedule**: The cron expression for your desired check frequency (e.g., `*/5 * * * *` for every 5 minutes)
   - **Repository**: Your repository name (e.g., `username/openuptimes`)
   - **Workflow**: The name of the workflow file (default: `ping.yml`)
   - **Secret Name**: The name of the secret containing the API key (default: `PING_API_KEY`)
   - **Enabled**: Toggle to enable/disable GitHub Actions scheduling

### 6. Manually Trigger a Workflow Run

To test your setup:
1. Go to the **Actions** tab in your GitHub repository
2. Select the "OpenUptimes Ping Check" workflow
3. Click "Run workflow" and then "Run workflow" again to confirm
4. Check the logs to ensure the ping was successful

## Troubleshooting

### Common Issues

1. **Workflow not running on schedule**
   - GitHub may delay scheduled workflows during periods of high demand
   - Ensure your repository has activity; GitHub may disable schedules for inactive repositories

2. **HTTP errors in workflow logs**
   - Verify your `APP_URL` is correct and accessible from the internet
   - Check that your application is running and the ping endpoint is accessible

3. **Authentication failures**
   - Ensure the `PING_API_KEY` secret matches what your application expects

### Viewing Logs

1. Go to the **Actions** tab in your GitHub repository
2. Click on any workflow run
3. Expand the "Ping Service Check" job
4. View the "Perform Ping" step to see detailed logs

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Cron Syntax Reference](https://crontab.guru/)
- [GitHub Actions Environments and Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) 