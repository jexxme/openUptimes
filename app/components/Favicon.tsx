'use client';

import { useEffect, useState } from 'react';

const defaultFavicon = '/default-favicon.svg'; // Using our custom default favicon

export function Favicon() {
  const [faviconUrl, setFaviconUrl] = useState<string>(defaultFavicon);
  const [siteName, setSiteName] = useState<string>('OpenUptimes');
  const [themeColor, setThemeColor] = useState<string>('#0284c7');
  const [siteDescription, setSiteDescription] = useState<string>('Service Status Monitor');
  
  useEffect(() => {
    async function fetchFavicon() {
      try {
        const response = await fetch('/api/settings/appearance');
        if (response.ok) {
          const data = await response.json();
          // If user has a logo, use it as favicon, otherwise use default
          if (data.logoUrl) {
            setFaviconUrl(data.logoUrl);
          } else if (data.favicon) {
            // If there's a specific favicon setting, use that
            setFaviconUrl(data.favicon);
          }
          
          // Set theme color from primary color if available
          if (data.primaryColor) {
            setThemeColor(data.primaryColor);
          }
        }
        
        // Also fetch site name from general settings
        const siteResponse = await fetch('/api/settings');
        if (siteResponse.ok) {
          const siteData = await siteResponse.json();
          if (siteData.siteName) {
            setSiteName(siteData.siteName);
          }
          if (siteData.description) {
            setSiteDescription(siteData.description);
          }
        }
      } catch (error) {
        console.error('Error fetching favicon:', error);
      }
    }
    
    fetchFavicon();
  }, []);

  // Update favicon link elements whenever faviconUrl changes
  useEffect(() => {
    // Update standard favicon
    const linkIcon = document.querySelector("link[rel='icon']") || document.createElement('link');
    linkIcon.setAttribute('rel', 'icon');
    linkIcon.setAttribute('href', faviconUrl);
    linkIcon.setAttribute('type', faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
    document.head.appendChild(linkIcon);
    
    // Add shortcut icon for older browsers
    const linkShortcut = document.querySelector("link[rel='shortcut icon']") || document.createElement('link');
    linkShortcut.setAttribute('rel', 'shortcut icon');
    linkShortcut.setAttribute('href', faviconUrl);
    document.head.appendChild(linkShortcut);
    
    // Add Apple touch icon
    const linkApple = document.querySelector("link[rel='apple-touch-icon']") || document.createElement('link');
    linkApple.setAttribute('rel', 'apple-touch-icon');
    linkApple.setAttribute('href', faviconUrl);
    document.head.appendChild(linkApple);
    
    // Add theme-color meta tag
    const metaThemeColor = document.querySelector("meta[name='theme-color']") || document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    metaThemeColor.setAttribute('content', themeColor);
    document.head.appendChild(metaThemeColor);
    
    // Add Open Graph image meta tag
    const metaOgImage = document.querySelector("meta[property='og:image']") || document.createElement('meta');
    metaOgImage.setAttribute('property', 'og:image');
    metaOgImage.setAttribute('content', faviconUrl);
    document.head.appendChild(metaOgImage);
    
    // Add Open Graph site name
    const metaOgSiteName = document.querySelector("meta[property='og:site_name']") || document.createElement('meta');
    metaOgSiteName.setAttribute('property', 'og:site_name');
    metaOgSiteName.setAttribute('content', siteName);
    document.head.appendChild(metaOgSiteName);
    
    // Add Open Graph title
    const metaOgTitle = document.querySelector("meta[property='og:title']") || document.createElement('meta');
    metaOgTitle.setAttribute('property', 'og:title');
    metaOgTitle.setAttribute('content', `${siteName} - Status Page`);
    document.head.appendChild(metaOgTitle);
    
    // Add Open Graph description
    const metaOgDescription = document.querySelector("meta[property='og:description']") || document.createElement('meta');
    metaOgDescription.setAttribute('property', 'og:description');
    metaOgDescription.setAttribute('content', siteDescription);
    document.head.appendChild(metaOgDescription);
    
    // Dynamically update manifest content
    updateManifest(faviconUrl, siteName, siteDescription, themeColor);
  }, [faviconUrl, themeColor, siteName, siteDescription]);

  // Function to dynamically update the manifest
  const updateManifest = (iconUrl: string, name: string, description: string, themeColor: string) => {
    try {
      const manifestData = {
        name: name,
        short_name: name,
        description: description,
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: themeColor,
        icons: [
          {
            src: iconUrl,
            sizes: "64x64 192x192 512x512",
            type: iconUrl.endsWith('.svg') ? "image/svg+xml" : "image/png",
            purpose: "any maskable"
          }
        ]
      };

      // Create a dynamic manifest link if it doesn't exist
      const existingLink = document.querySelector("link[rel='manifest']");
      if (!existingLink) {
        const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = manifestUrl;
        document.head.appendChild(link);
      }
    } catch (error) {
      console.error('Error updating manifest:', error);
    }
  };

  return null; // This component doesn't render anything visible
} 