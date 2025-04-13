# 🛠️ Self-Hosted Status Page – Implementation Plan

## 🎯 Goals
- One-click deploy on Vercel  
- Plug-and-play setup  
- Monitors uptime of custom services  
- Logs and displays uptime history  
- Zero external services (no UptimeRobot, no Planetscale)  
- Minimal, clean, contributor/LLM-friendly codebase  

---

## ⚙️ Tech Stack

| Layer          | Tech                         |
|----------------|------------------------------|
| Framework      | **Next.js (App Router)**     |
| UI             | **Tailwind CSS + shadcn/ui** |
| Storage        | **Vercel Redis**             |
| Monitoring     | **Vercel Functions + Client-side Polling** |
| Deployment     | **Vercel Deploy Button**     |
| Optional Auth  | Clerk or NextAuth (for admin UI)

---

## 🧱 Project Structure

```
/app
  └─ status             → Public status page
  └─ api                → Server API routes
     └─ ping/route.ts   → On-demand pinger function
     └─ status/route.ts → Returns current + historical status
  └─ layout.tsx
  └─ page.tsx

/components
  └─ StatusCard.tsx     → UI for each service
  └─ UptimeChart.tsx    → History graph (e.g. bars or dots)
  └─ UptimePoller.tsx   → Client-side component that triggers pings

/lib
  └─ config.ts          → User-defined list of URLs to monitor
  └─ redis.ts           → Vercel Redis wrapper helpers

/public
  └─ favicon, logos     → (Optional branding)
```

---

## 🧩 Core Features

### ✅ 1. Config: Define Services to Monitor
```ts
// lib/config.ts
export const services = [
  { name: "Website", url: "https://example.com" },
  { name: "API", url: "https://api.example.com" },
]
```

---

### ✅ 2. Uptime Monitoring with Vercel Functions
- File: `app/api/ping/route.ts`
- Triggered in two ways:
  1. Client-side polling via `UptimePoller.tsx` component (for frequent checks)
  2. Direct API calls for external monitoring
- Performs for each service:
  - Ping the URL
  - Save current status: `redis.set("status:{name}", {...})`
  - Append to history: `redis.lpush("history:{name}", {...})`
- History kept to last N entries (e.g. 1440 = 24h at 1-min intervals)

```ts
// app/api/ping/route.ts
export async function GET() {
  // Check all services in config
  const results = await checkAllServices();
  return Response.json(results);
}
```

```tsx
// components/UptimePoller.tsx
"use client";

export default function UptimePoller({ interval = 60000 }) {
  useEffect(() => {
    const checkUptime = async () => {
      await fetch('/api/ping');
    };
    
    // Initial check
    checkUptime();
    
    // Set up polling interval
    const timer = setInterval(checkUptime, interval);
    return () => clearInterval(timer);
  }, [interval]);
  
  return null; // No UI, just functionality
}
```

---

### ✅ 3. Storage: Vercel Redis
```ts
// Save status
await redis.set('status:api', JSON.stringify({ status: 'up', timestamp: Date.now() }))

// Save history
await redis.lpush('history:api', JSON.stringify({ status: 'down', timestamp: Date.now() }))

// Trim history to last 1440 entries (24h at 1-min intervals)
await redis.ltrim('history:api', 0, 1439)
```

---

### ✅ 4. Public Status Page (`/status`)
- Lists all services
- Shows current status (green/red dot, label)
- Renders simple uptime chart (last X pings)
- Optional JSON export (`/api/status`)
- Includes the `UptimePoller` component for client-side polling

```tsx
// app/status/page.tsx
export default function StatusPage() {
  return (
    <div>
      {/* Hidden component that handles polling */}
      <UptimePoller interval={60000} />
      
      {/* Rest of status page UI */}
      <StatusCards />
      <UptimeCharts />
    </div>
  )
}
```

---

### ✅ 5. Optional Enhancements
- Light/Dark mode
- Status badges (`![](https://status.mysite.com/badge/api.svg)`)
- Authenticated admin panel for editing services (Clerk or NextAuth)
- Email/Slack alerts (via Resend or webhooks)
- Incident posts (manual + automated)
- Public `status.json` or RSS
- Configurable polling intervals based on plan/needs

---

## ✨ One-Click Deploy
Add this to your README:
```md
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/project?template=your-repo-url)
```
User just:
1. Clicks the button
2. Enters service URLs
3. Gets a live status page with auto-uptime monitoring

---

## 🧼 Coding Guidelines

To maintain a clean, contributor-friendly codebase:

- **Minimalist First**: Favor clarity, no overengineering  
- **Types Everywhere**: Use TypeScript for all data layers  
- **Shallow Abstractions**: Avoid deep nesting or excessive indirection  
- **Tailwind for Styling**: Utility-first, semantic class names  
- **No External DB**: Use Vercel-native features only  
- **File Structure**: Keep each file small and purpose-focused  
- **Formatters**: Use Prettier, ESLint, and `.editorconfig`  
- **Comment Intelligently**: Focus on "why", not "what"  
- **AI-Friendly Code**: Easy to read, debug, and extend with LLMs like Cursor

---