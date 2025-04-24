# OpenUptimes Documentation

<p align="center">
  <img src="assets/logo.svg" alt="OpenUptimes Logo" width="120" />
</p>

<p align="center">
A simple, elegant, and self-hosted status page to monitor and display the uptime of your services.
</p>

## Introduction

OpenUptimes is a lightweight status page that helps you monitor and display service uptime. With a clean interface and GitHub Actions integration, tracking your infrastructure's health has never been easier.

Simplicity is key: deployment takes minutes, configuration is minimal, and monitoring is automatic without complex setups. You only need a GitHub repository, a Redis instance, and a hosting provider like Vercel.

## Key Features

* 🚀 **One-click deploy** - Get started in seconds with Vercel
* 🔌 **Zero configuration** - Everything works out of the box
* 📊 **GitHub Actions integration** - First-class monitoring system without extra infrastructure 
* 📝 **Historical data** - View uptime history and identify patterns
* 🛑 **Minimal dependencies** - Uses only GitHub Actions, Redis, and your hosting provider
* 🎨 **Beautiful, responsive UI** - Works on all devices

## Quick Start

The fastest way to get started with OpenUptimes is to click the "Deploy with Vercel" button in our [GitHub repository](https://github.com/openuptimes/openuptimes).

<div class="grid" markdown>

=== "Step 1: Deploy"

    Click the "Deploy with Vercel" button and follow the prompts to set up your new project.

=== "Step 2: Configure Redis"

    Set up Redis in your Vercel project using their one-click integration.

=== "Step 3: Set up monitoring"

    Configure GitHub Actions for monitoring using our automatic template.

=== "Step 4: Add services"

    Add your services through the admin dashboard at `/admin`.

</div>

## Status Indicators

<div class="grid" markdown>

<div markdown>
<span class="status-indicator status-up"></span> **Up** - Service is responding normally
</div>

<div markdown>
<span class="status-indicator status-degraded"></span> **Degraded** - Service is responding slowly
</div>

<div markdown>
<span class="status-indicator status-down"></span> **Down** - Service is not responding
</div>

<div markdown>
<span class="status-indicator status-unknown"></span> **Unknown** - Service status couldn't be determined
</div>

</div>

## License

OpenUptimes is licensed under the [PolyForm Noncommercial License 1.0.0](https://github.com/openuptimes/openuptimes/blob/main/LICENSE).
