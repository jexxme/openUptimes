# Monitoring Options

OpenUptimes provides multiple ways to monitor your services, giving you flexibility in how you implement uptime checking based on your specific needs and deployment environment.

## Available Monitoring Systems

OpenUptimes offers two primary monitoring systems:

1. [**Internal Cron System**](cron-system.md): Built-in scheduler with precise timing control (down to 1-minute intervals)
2. [**GitHub Actions**](github-actions.md): Reliable, external monitoring using GitHub's infrastructure

Additionally, you can use [**External Monitoring**](external-monitoring.md) solutions to supplement or replace the built-in options.

## Choosing the Right System

| Feature | Internal Cron | GitHub Actions |
|---------|--------------|----------------|
| Minimum interval | 1 minute | 5 minutes |
| Setup complexity | Simple (UI-based) | Moderate (requires workflow file) |
| Infrastructure | Uses your OpenUptimes instance | Uses GitHub's infrastructure |
| Execution history | Detailed history with UI | Basic logs in GitHub UI |
| Scheduling precision | High (follows exact cron syntax) | Medium (5-minute minimum, variable execution) |
| Resource usage | Uses your instance resources | Uses GitHub's resources |
| Dependency | Redis only | GitHub platform |
| Configuration | UI-based management | YAML file configuration |
| Best for | Self-hosted, non-serverless deployments | Vercel/serverless deployments |
| Reliability | Depends on your hosting | High (GitHub's infrastructure) |

## Deployment Compatibility

Different monitoring options are compatible with different hosting environments:

| Hosting Type | Internal Cron System | GitHub Actions | External Monitoring |
|--------------|----------------------|----------------|---------------------|
| Traditional VPS/Servers | ✅ Fully supported | ✅ Supported | ✅ Supported |
| Docker containers | ✅ Fully supported | ✅ Supported | ✅ Supported |
| Vercel | ❌ Not supported | ✅ Recommended | ✅ Supported |
| Netlify | ❌ Not supported | ✅ Recommended | ✅ Supported |
| Other serverless | ❌ Not supported | ✅ Recommended | ✅ Supported |

## Monitoring Strategy Recommendations

### For Vercel Deployments

If you're using Vercel or another serverless platform:

1. Use **GitHub Actions** as your primary monitoring method
2. Set up at least one workflow with a 5-minute interval
3. Consider adding a second workflow with a different schedule for redundancy

### For Self-Hosted Deployments

If you're running on a traditional server or VPS:

1. Use the **Internal Cron System** as your primary monitoring method
2. Configure jobs with varying intervals based on service importance
3. Optionally add GitHub Actions as a backup monitoring method

### For High-Availability Requirements

If you need maximum reliability:

1. Set up **both** monitoring systems simultaneously
2. Configure different check intervals on each system
3. Consider adding external monitoring services as a third layer

## Getting Started

To get started with monitoring:

1. Choose the monitoring system that best fits your deployment
2. Follow the setup instructions for your chosen system:
   - [Internal Cron System Setup](cron-system.md)
   - [GitHub Actions Setup](github-actions.md)
3. Configure your services in the OpenUptimes admin dashboard
4. Test your monitoring setup to ensure it's working correctly 