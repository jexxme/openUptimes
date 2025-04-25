# OpenUptimes

<p align="center">
  <img src="assets/logo.svg" alt="OpenUptimes Logo" width="120" />
</p>

<p align="center">
  <strong>A simple, elegant, and self-hosted status page to monitor and display the uptime of your services.</strong>
</p>

<div class="grid" markdown>

<div>
<h2>Monitor Your Services</h2>
<p>Track the status of your websites, APIs, and services with a beautiful, modern interface. Keep your users informed about service availability.</p>

<a href="getting-started/installation/" class="md-button md-button--primary">Get Started</a>
<a href="about/" class="md-button">Learn More</a>
</div>

<div>
<h2>Flexible Monitoring</h2>
<p>Choose the monitoring approach that fits your needs:</p>

<ul>
  <li><strong>Internal Cron System</strong> - Precise control for self-hosted deployments</li>
  <li><strong>GitHub Actions</strong> - Perfect for serverless platforms like Vercel</li>
</ul>
</div>

</div>

## Key Features

<div class="grid cards" markdown>

- 🚀 **One-Click Deploy**
    
    Deploy to Vercel in seconds with zero configuration

- 📅 **Dual Monitoring**
    
    Choose between Internal Cron or GitHub Actions

- 📊 **Historical Data**
    
    Track uptime patterns with rich visualizations

- ⚙️ **Simple Admin**
    
    Easy-to-use dashboard for configuration

</div>

## Getting Started in 4 Steps

<div class="grid" markdown>

=== "1. Deploy"

    Click the "Deploy with Vercel" button and follow the prompts to set up your new project
    
    <a href="https://vercel.com/new/clone?repository-url=https://github.com/openuptimes/openuptimes">
      <img src="https://vercel.com/button" alt="Deploy with Vercel" width="92" height="32" />
    </a>

=== "2. Configure Redis"

    Set up Redis in your Vercel project using their one-click integration

=== "3. Set up Monitoring"

    Choose your monitoring method based on your deployment type
    
    * [GitHub Actions](monitoring/github-actions.md) (for Vercel)
    * [Internal Cron](monitoring/cron-system.md) (for self-hosted)

=== "4. Add Services"

    Add your services through the admin dashboard at `/admin`
    
    ![Admin Dashboard](assets/admin-dashboard.png)

</div>

## Who Is It For?

OpenUptimes is perfect for developers, teams, and businesses who need a simple but powerful status page without the complexity and cost of commercial solutions.

<div class="grid cards" markdown>

- 🏢 **Small to Medium Businesses**
    
    Build customer trust with transparent service status

- 💻 **Development Teams**
    
    Communicate service status to users and stakeholders

- 👩‍💻 **Independent Developers**
    
    Monitor personal projects with a professional interface

- 🌐 **Open Source Projects**
    
    Show uptime transparency for community services

</div>

<p align="center" markdown>
  <a href="about/" class="md-button md-button--primary">Learn More About OpenUptimes</a>
  <a href="getting-started/installation/" class="md-button">Installation Guide</a>
</p>
