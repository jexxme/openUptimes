'use client';

import { useEffect } from 'react';

const defaultFavicon = '/default-favicon.svg';

export function Favicon() {
  useEffect(() => {
    // Update standard favicon
    const linkIcon = document.querySelector("link[rel='icon']") || document.createElement('link');
    linkIcon.setAttribute('rel', 'icon');
    linkIcon.setAttribute('href', defaultFavicon);
    linkIcon.setAttribute('type', 'image/svg+xml');
    document.head.appendChild(linkIcon);
    
    // Add shortcut icon for older browsers
    const linkShortcut = document.querySelector("link[rel='shortcut icon']") || document.createElement('link');
    linkShortcut.setAttribute('rel', 'shortcut icon');
    linkShortcut.setAttribute('href', defaultFavicon);
    document.head.appendChild(linkShortcut);
    
    // Add Apple touch icon
    const linkApple = document.querySelector("link[rel='apple-touch-icon']") || document.createElement('link');
    linkApple.setAttribute('rel', 'apple-touch-icon');
    linkApple.setAttribute('href', defaultFavicon);
    document.head.appendChild(linkApple);
    
    // Add theme-color meta tag
    const metaThemeColor = document.querySelector("meta[name='theme-color']") || document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    metaThemeColor.setAttribute('content', '#0284c7');
    document.head.appendChild(metaThemeColor);
  }, []);

  return null;
} 