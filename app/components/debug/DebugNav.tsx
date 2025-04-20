'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function DebugNav() {
  const pathname = usePathname();
  
  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Admin', href: '/admin' },
    { name: 'Debug Home', href: '/debug' },
    { name: 'Ping Debug', href: '/debug/ping' },
    { name: 'Cron Jobs', href: '/debug/ping/cron' },
    { name: 'GitHub Actions', href: '/debug/ping/github' },
  ];

  return (
    <div className="bg-white border-b border-gray-200 mb-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex-shrink-0 flex items-center">
            <span className="font-semibold text-lg text-gray-900">OpenUptimes Debug</span>
          </div>
          <nav className="flex items-center space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium rounded-md",
                  pathname === item.href
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
} 