'use client';

import { usePathname } from 'next/navigation';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';

export function CustomCSS() {
  const { settings } = useAppearanceSettings();
  const pathname = usePathname();
  
  // Check if we're on an admin page
  const isAdminPage = pathname?.startsWith('/admin');
  
  // Don't render anything if:
  // 1. Settings aren't loaded
  // 2. There's no custom CSS
  // 3. We're on an admin page
  if (!settings || !settings.customCSS || isAdminPage) {
    return null;
  }
  
  // Apply the custom CSS using a style tag (only for non-admin pages)
  return (
    <style dangerouslySetInnerHTML={{ __html: settings.customCSS }} />
  );
} 