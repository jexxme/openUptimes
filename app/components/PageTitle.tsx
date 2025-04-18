'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface PageTitleProps {
  statusPageTitle?: string;
  siteName?: string;
}

export function PageTitle({ statusPageTitle = 'Service Status', siteName = 'OpenUptimes' }: PageTitleProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Get base title depending on the page
    let title = '';
    
    if (pathname?.startsWith('/admin')) {
      // For admin pages: "OpenUptimes Admin | Status Page Title"
      title = `${siteName} Admin | ${statusPageTitle}`;
    } else {
      // For status page: "Status Page Title | OpenUptimes"
      title = `${statusPageTitle} | ${siteName}`;
    }
    
    // Set the document title
    document.title = title;
    
    // Cleanup function not needed as we don't subscribe to any events
  }, [pathname, statusPageTitle, siteName]);

  // This component doesn't render anything
  return null;
} 