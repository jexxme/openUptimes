import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientHooks } from "./components/ClientHooks";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// We'll use Inter as a replacement for Geist Mono as well
const mono = Inter({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenUptimes - Service Status Monitor",
  description: "Monitor your service uptime with OpenUptimes - a simple, powerful status page for your services",
  applicationName: "OpenUptimes",
  authors: [{ name: "OpenUptimes Team" }],
  keywords: ["status page", "uptime monitoring", "service status", "uptime", "monitoring"],
  creator: "OpenUptimes",
  publisher: "OpenUptimes",
  metadataBase: new URL("https://openuptimes.app/"),
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://openuptimes.app/",
    title: "OpenUptimes - Service Status Monitor",
    description: "Monitor your service uptime with OpenUptimes - a simple, powerful status page for your services",
    siteName: "OpenUptimes",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenUptimes - Service Status Monitor",
    description: "Monitor your service uptime with OpenUptimes - a simple, powerful status page for your services",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${inter.variable} ${mono.variable} antialiased`}
      >
        <ClientHooks>
          {children}
        </ClientHooks>
      </body>
    </html>
  );
}
