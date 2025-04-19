import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { ClientHooks } from "./components/ClientHooks";
import { ThemeProvider } from "./context/ThemeContext";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
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
        <link rel="icon" href="/default-favicon.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/default-favicon.svg" />
        <link rel="apple-touch-icon" href="/default-favicon.svg" />
        <meta name="theme-color" content="#0284c7" />
      </head>
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
      >
        <ThemeProvider>
          <ClientHooks>
            {children}
          </ClientHooks>
        </ThemeProvider>
      </body>
    </html>
  );
}
