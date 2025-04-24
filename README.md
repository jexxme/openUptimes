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
  <a href="#documentation">Documentation</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/openuptimes/openuptimes">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
</p>

## Introduction

OpenUptimes is a lightweight status page that helps you monitor and display service uptime. With a clean interface and flexible monitoring options, tracking your infrastructure's health is easy.

Simplicity is key: deployment takes minutes, configuration is minimal, and monitoring is automatic. You have two options for monitoring services:

1. **Internal Cron System**: For precise monitoring with complete control (ideal for self-hosted deployments)
2. **GitHub Actions**: For low-maintenance monitoring with no additional infrastructure (ideal for Vercel deployments)

Built with Next.js, Tailwind CSS, and Redis, OpenUptimes offers a seamless experience across devices. It provides reliable uptime checks without requiring complex external services.

## Features

* 🚀 **One-click deploy** - Get started in seconds with Vercel
* 🔌 **Zero configuration** - Everything works out of the box
* ⏱️ **Dual monitoring systems**:
  * **Internal Cron** - Precise monitoring (down to 1-minute intervals) for self-hosted deployments
  * **GitHub Actions** - Reliable, infrastructure-free monitoring ideal for serverless platforms
* 📊 **Comprehensive analytics** - Track uptime performance with rich historical data
* 📝 **Detailed history** - View uptime trends and identify patterns over time
* 🔔 **Real-time status** - See at a glance which services are operational
* 🛑 **Minimal dependencies** - Only requires Redis and a hosting environment
* 🧹 **Clean, maintainable codebase** - Easy to understand and extend
* 🎨 **Beautiful, responsive UI** - Works perfectly on all devices
* 📱 **Mobile-first design** - Perfect experience on any screen size
* 🔄 **Auto-refreshing data** - Always see the latest status
* 🔧 **User-friendly admin dashboard** - Manage services and monitoring with ease

## Quick Start

The fastest way to get started with OpenUptimes:

### For Vercel Deployment (Recommended for most users)

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account and wait for the initial deployment to complete
3. Set up Redis in your Vercel project (one-click integration)
4. Set up GitHub Actions for monitoring (follow the setup prompts)
5. Add your services through the admin dashboard at `/admin`

### For Self-Hosted Deployment

1. Clone the repository and install dependencies
2. Set up a Redis instance
3. Configure environment variables
4. Start the application
5. Add your services through the admin dashboard
6. Choose your monitoring method based on your hosting environment

For detailed instructions, see the [Documentation](#documentation) section.

## Documentation

Detailed documentation is available in the [docs](/docs) directory:

### Getting Started

- [Overview](docs/getting-started/overview.md)
- [Installation](docs/getting-started/installation.md)
- [Configuration](docs/getting-started/configuration.md)

### Monitoring Options

- [Monitoring Overview](docs/monitoring/index.md)
- [Internal Cron System](docs/monitoring/cron-system.md)
- [GitHub Actions Monitoring](docs/monitoring/github-actions.md)
- [External Monitoring Options](docs/monitoring/external-monitoring.md)

### API Reference

- [API Endpoints](docs/api/index.md)
- [Authentication](docs/api/authentication.md)

### Development

- [Contributing Guide](docs/development/contributing.md)

## License

OpenUptimes is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

### License Rationale

OpenUptimes started as a small personal project, built to scratch an itch for simple, clean uptime pages. Over time, it felt right to share it more widely—especially since transparency around service uptime feels like something that should be easy and accessible for everyone.

That's why OpenUptimes is licensed under the PolyForm Noncommercial License. It's free to use for:
 - 👨‍💻 Personal projects
 - 🏫 Educational work and research
 - 🏢 Internal or public use by organizations, startups, and small businesses
 - 🏥 Nonprofits, NGOs, and public institutions

Basically: if you're using it to show uptime for your own service, cool, that's what it's for!

What's not okay: taking this project, tweaking it, and turning it into a commercial product or hosted service. That's not the spirit of it.

---

<p align="center">
Made on a healthy dose of ☕️
</p>
