# About OpenUptimes

## What is OpenUptimes?

OpenUptimes is a lightweight status page that helps you monitor and display service uptime. With a clean interface and flexible monitoring options, tracking your infrastructure's health has never been easier.

Simplicity is key: deployment takes minutes, configuration is minimal, and monitoring is automatic. You have two options for monitoring services:

1. **Internal Cron System**: For precise monitoring with complete control (ideal for self-hosted deployments)
2. **GitHub Actions**: For low-maintenance monitoring with no additional infrastructure (ideal for Vercel deployments)

Built with Next.js, Tailwind CSS, and Redis, OpenUptimes offers a seamless experience across devices. It provides reliable uptime checks without requiring complex external services.

## Why OpenUptimes?

There are many status page solutions available, but OpenUptimes stands out for its:

* 🚀 **One-click deploy** - Get started in seconds with Vercel
* 🔌 **Zero configuration** - Everything works out of the box
* ⏱️ **Dual monitoring systems**:
  * **Internal Cron** - Precise monitoring (down to 1-minute intervals) for self-hosted deployments
  * **GitHub Actions** - Reliable, infrastructure-free monitoring ideal for serverless platforms
* 📊 **Comprehensive analytics** - Track uptime performance with rich historical data
* 📝 **Detailed history** - View uptime trends and identify patterns over time
* 🔔 **Real-time status** - See at a glance which services are operational
* 🛑 **Minimal dependencies** - Only requires Redis and a hosting environment
* 🎨 **Beautiful, responsive UI** - Works perfectly on all devices

## Architecture

OpenUptimes consists of a few key components:

1. **Status Dashboard**: Public-facing page showing service status
2. **Admin Interface**: For managing services and settings
3. **Monitoring System**: Choose between:
   - **Internal Cron System**: For precise, self-hosted monitoring
   - **GitHub Actions**: For serverless-compatible monitoring
4. **Redis Backend**: Simple data storage for uptime data
5. **API Endpoints**: For programmatic access to service status

[![](https://mermaid.ink/img/pako:eNqVVGtv0zAU_SuW0SaQspFH07QGIbWdxvahYqI8BCsf3NhtTBM7sh26Me2_cx2nj6Eh1FhqfW7uPfY5184DzhXjmOBlqTZ5QbVFn8ZzieA5OUFTIUVFS2GsyNEXrnNevjYFZblExt6XHOWqVNr4_LykxlzwJaqUFFZptBRlSV5EAxjjwFit1nwH20KyKYTl3auzjWC2IFF99xddrjTvuEaDNL3MdlwdPIKLLTqmZDyIL_s7pg4ewWS4_iVybjq-cAhjr7KDR_A1YutX5sbeLw__z-R_TbNYaVoXaI6nvg1CrtBMNdA7M8c-yT3vhb1qFrdz7CdolFuhJKT8IIR0HdxnT7SSkHstLdeSli1-JpVLdriZCXQOqj7UXH6urajALRfyha6th8kfORPm9mX798olsMU_hH0DNWjW-X-oaRuDNb_yhQGvDDpFo5vrTta2Z89udmapbcwNXbkte4Ac8qWNOMztPDttfUBnZ--8rp1o9NbFWikHQRebPdnCPrxb_HAZuIEj9rMxtr1t0Egfhtl61l4_xpe0Kd1rf1hYD8bg6QGJ67s3OMArLRgmVjc8wBXXFXUQPzjGObYFr0AogSmjeu08fYSamsrvSlXbMq2aVYHJkpYGUFMzavmFoNCWahfV4CrXE9VIi0mcxS0JJg_4DpOoF573hmEIB7o_7CVplAT4HpMsO4_DJIwGyTDtpXGWPQb4d7tseN4fxFEUZ2mSDKO4nw4DDJ7CcZv6j1b77Xr8A6iDg3Y?type=png)](https://mermaid.live/edit#pako:eNqVVGtv0zAU_SuW0SaQspFH07QGIbWdxvahYqI8BCsf3NhtTBM7sh26Me2_cx2nj6Eh1FhqfW7uPfY5184DzhXjmOBlqTZ5QbVFn8ZzieA5OUFTIUVFS2GsyNEXrnNevjYFZblExt6XHOWqVNr4_LykxlzwJaqUFFZptBRlSV5EAxjjwFit1nwH20KyKYTl3auzjWC2IFF99xddrjTvuEaDNL3MdlwdPIKLLTqmZDyIL_s7pg4ewWS4_iVybjq-cAhjr7KDR_A1YutX5sbeLw__z-R_TbNYaVoXaI6nvg1CrtBMNdA7M8c-yT3vhb1qFrdz7CdolFuhJKT8IIR0HdxnT7SSkHstLdeSli1-JpVLdriZCXQOqj7UXH6urajALRfyha6th8kfORPm9mX798olsMU_hH0DNWjW-X-oaRuDNb_yhQGvDDpFo5vrTta2Z89udmapbcwNXbkte4Ac8qWNOMztPDttfUBnZ--8rp1o9NbFWikHQRebPdnCPrxb_HAZuIEj9rMxtr1t0Egfhtl61l4_xpe0Kd1rf1hYD8bg6QGJ67s3OMArLRgmVjc8wBXXFXUQPzjGObYFr0AogSmjeu08fYSamsrvSlXbMq2aVYHJkpYGUFMzavmFoNCWahfV4CrXE9VIi0mcxS0JJg_4DpOoF573hmEIB7o_7CVplAT4HpMsO4_DJIwGyTDtpXGWPQb4d7tseN4fxFEUZ2mSDKO4nw4DDJ7CcZv6j1b77Xr8A6iDg3Y)

The architecture is designed to be simple and effective:

1. **Monitoring triggers** periodically check your services:
   - **GitHub Actions** works for all deployment types
   - **Internal Cron System** provides more precision for self-hosted deployments
2. The **ping API** checks all services and updates Redis
3. The **frontend** displays status data from Redis
4. **Admin users** can configure services through the admin interface

## Who Should Use OpenUptimes?

OpenUptimes is ideal for:

### Small to Medium Businesses
- Create a professional status page with minimal effort
- Keep customers informed about service availability
- Build trust through transparency

### Development Teams
- Communicate service status to users and stakeholders
- Track historical performance across multiple services
- Integrate uptime monitoring into existing workflows

### Independent Developers
- Monitor personal projects and services
- Provide a professional status interface for clients
- Low-maintenance solution that "just works"

### Open Source Projects
- Provide transparency about service uptime
- Easy community contribution with familiar technologies
- Free for non-commercial use

## Monitoring Options in Detail

OpenUptimes provides multiple ways to monitor your services:

### Internal Cron System

**Key Features:**
- Built-in scheduler with precise timing
- Down to 1-minute check intervals
- Works on traditional hosting (not serverless)
- Complete control through admin UI

**Best for:**
- Self-hosted deployments on traditional servers/VPS
- Users who need precise timing
- Teams that want complete control over monitoring

**Limitations:**
- Not compatible with serverless platforms like Vercel
- Requires a persistent runtime environment
- Uses resources from your OpenUptimes instance

[Learn more about the Internal Cron System](monitoring/cron-system.md)

### GitHub Actions

**Key Features:**
- Uses GitHub's infrastructure
- Minimum 5-minute intervals
- Works with all deployment types
- Perfect for serverless platforms

**Best for:**
- Deployments on serverless platforms like Vercel
- Users who prefer a "set and forget" approach
- Teams already familiar with GitHub Actions

**Limitations:**
- Minimum 5-minute intervals
- Subject to GitHub's scheduling limitations
- Requires a GitHub repository

[Learn more about GitHub Actions Monitoring](monitoring/github-actions.md)

### External Monitoring

**Key Features:**
- Integrate with third-party systems
- Custom intervals and locations
- Additional monitoring redundancy

**Best for:**
- Global applications needing regional monitoring
- Mission-critical services requiring redundant checks
- Users with existing monitoring infrastructure

**Deployment Options:**
- Custom cron servers
- Cloud-based cron services
- Serverless functions
- Existing monitoring platforms

[Learn more about External Monitoring Options](monitoring/external-monitoring.md) 