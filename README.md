# OpenUptimes

A self-hosted, zero-dependency status page to monitor and display the uptime of your services. Built with Next.js, Tailwind CSS, and Vercel KV.

## Features

- 🚀 One-click deploy on Vercel
- 🔌 Plug-and-play setup
- 📊 Monitors uptime of custom services
- 📝 Logs and displays uptime history
- 🛑 Zero external services (no UptimeRobot, no Planetscale)
- 🧹 Minimal, clean, contributor-friendly codebase

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **Storage**: Vercel KV (Redis)
- **Monitoring**: Vercel Functions + Client-side Polling
- **Deployment**: Vercel Deploy Button

## Quick Start

1. Fork and clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your services in `lib/config.ts`
4. Set up environment variables (see below)
5. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env.local` file with the following variables for Vercel KV:

```
KV_URL=your_kv_url
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_only_token
```

## Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/git/external?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fopenuptimes)

## Contributing

Contributions are welcome! Please see our [contributing guidelines](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
