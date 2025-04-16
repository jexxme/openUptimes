'use client';

import { usePathname } from 'next/navigation';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';

export function CustomHeader() {
  const { settings } = useAppearanceSettings();
  const pathname = usePathname();
  
  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith('/admin');
  
  // Don't render anything if:
  // 1. Settings aren't loaded
  // 2. There's no custom header
  // 3. We're on an admin page
  if (!settings || !settings.customHeader || isAdminPage) {
    return null;
  }
  
  // Render the custom header HTML with a wrapper for styling (only for non-admin pages)
  return (
    <div className="custom-header w-full">
      <div dangerouslySetInnerHTML={{ __html: settings.customHeader }} />
    </div>
  );
} 