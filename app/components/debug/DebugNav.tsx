'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Database, Clock, Github, PanelLeftIcon } from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/app/context/ThemeContext';

export default function DebugNav() {
  const pathname = usePathname();
  const { theme } = useTheme();
  
  const navItems = [
    { name: 'Home', href: '/', icon: Home, isDebug: false },
    { name: 'Admin', href: '/admin', icon: PanelLeftIcon, isDebug: false },
    { name: 'Ping Debug', href: '/debug/ping', icon: Database, isDebug: true },
    { name: 'Cron Jobs', href: '/debug/ping/cron', icon: Clock, isDebug: true },
    { name: 'GitHub Actions', href: '/debug/ping/github', icon: Github, isDebug: true },
  ];

  return (
    <div className="bg-background border-b border-border shadow-sm dark:shadow-none mb-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex-shrink-0 flex items-center">
            <div className="flex items-center cursor-pointer">
              <Image
                src="/default-favicon.svg" 
                alt="OpenUptimes"
                width={24}
                height={24}
                className={`mr-2 ${theme === 'dark' ? 'logo-dark-mode' : ''}`}
              />
              <span className="font-semibold text-lg text-foreground">
                OpenUptimes <span className="text-muted-foreground font-normal text-sm">Debug</span>
              </span>
            </div>
          </div>
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md flex items-center gap-1.5 transition-colors",
                  pathname === item.href
                    ? item.isDebug
                      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400"
                      : "bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
                    : item.isDebug
                      ? "text-amber-600 hover:bg-amber-50 hover:text-amber-900 dark:text-amber-500 dark:hover:bg-amber-950/30 dark:hover:text-amber-400"
                      : "text-blue-600 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 