import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface AppearanceTabProps {
  logoUrl: string;
  setLogoUrl: (logo: string) => void;
  showServiceUrls: boolean;
  setShowServiceUrls: (show: boolean) => void;
  showServiceDescription: boolean;
  setShowServiceDescription: (show: boolean) => void;
  copyrightUrl: string;
  setCopyrightUrl: (url: string) => void;
  copyrightText: string;
  setCopyrightText: (text: string) => void;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function AppearanceTab({
  logoUrl,
  setLogoUrl,
  showServiceUrls,
  setShowServiceUrls,
  showServiceDescription,
  setShowServiceDescription,
  copyrightUrl,
  setCopyrightUrl,
  copyrightText,
  setCopyrightText,
  isLoading,
  isSaving,
  onSave
}: AppearanceTabProps) {
  const [logoError, setLogoError] = useState(false);
  const [copyrightUrlError, setCopyrightUrlError] = useState(false);
  const [copyrightUrlTitle, setCopyrightUrlTitle] = useState<string | null>(null);
  const currentYear = new Date().getFullYear();

  // Validate URL when input changes
  const validateCopyrightUrl = async (url: string) => {
    if (!url) {
      setCopyrightUrlError(false);
      setCopyrightUrlTitle(null);
      return;
    }

    try {
      // Check if valid URL format
      new URL(url);
      
      try {
        // Attempt to fetch the title of the URL
        const response = await fetch(`/api/utils/fetch-title?url=${encodeURIComponent(url)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.title) {
            setCopyrightUrlTitle(data.title);
          }
        }
        setCopyrightUrlError(false);
      } catch (e) {
        // Even if we can't fetch the title, the URL might still be valid
        setCopyrightUrlError(false);
      }
    } catch (e) {
      // Invalid URL format
      setCopyrightUrlError(true);
      setCopyrightUrlTitle(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">
        Customize the appearance of your public status page
      </p>
      
      <div className="space-y-4">
        {/* Logo Section */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <rect width="18" height="18" x="3" y="3" rx="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            <span>Logo</span>
          </h3>
          
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1.5 block">Logo URL</label>
                <Input
                  type="text"
                  value={logoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setLogoUrl(e.target.value);
                    setLogoError(false);
                  }}
                  placeholder="https://your-domain.com/logo.png"
                  className={logoError ? "border-red-500" : ""}
                />
                {logoError && (
                  <p className="text-xs text-red-500 mt-1">
                    Unable to load image from URL
                  </p>
                )}
              </div>
              
              <div className="h-10 w-10 border rounded-md bg-background flex items-center justify-center shrink-0 mt-6">
                {logoUrl && !logoError ? (
                  <img
                    src={logoUrl}
                    alt="Preview"
                    className="max-h-8 max-w-full object-contain"
                    onError={(e) => {
                      e.preventDefault(); // Prevent default error behavior
                      (e.target as HTMLImageElement).style.display = 'none'; // Hide the image
                      setLogoError(true); // Set error state
                    }}
                    onLoad={() => setLogoError(false)}
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-40">
                    <rect width="18" height="18" x="3" y="3" rx="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                )}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              The logo appears at the top of your status page
            </p>
          </div>
          
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-card border rounded-md p-2.5 mt-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <div>
              <span className="font-medium">Recommended:</span> Use a transparent PNG or SVG (max 200KB)
            </div>
          </div>
        </div>
        
        {/* Copyright Section */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <span>Footer Copyright</span>
          </h3>
          
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Copyright Text</label>
              <Input
                type="text"
                value={copyrightText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCopyrightText(e.target.value);
                }}
                placeholder={`© {year} Your Company Name`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use <code className="bg-muted px-1 rounded">{'{year}'}</code> to dynamically display the current year. Leave empty to use the default format.
              </p>
            </div>
            
            <div className="mt-4">
              <label className="text-sm font-medium mb-1.5 block">Copyright URL</label>
              <Input
                type="text"
                value={copyrightUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setCopyrightUrl(e.target.value);
                  validateCopyrightUrl(e.target.value);
                }}
                placeholder="https://your-domain.com/"
                className={copyrightUrlError ? "border-red-500" : ""}
              />
              {copyrightUrlError && (
                <p className="text-xs text-red-500 mt-1">
                  Please enter a valid URL
                </p>
              )}
              {copyrightUrlTitle && !copyrightUrlError && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5"/>
                  </svg>
                  {copyrightUrlTitle}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                The copyright text in the footer will link to this URL
              </p>
            </div>
            
            <div className="mt-4 pt-3 border-t border-border">
              <label className="text-sm font-medium mb-1.5 block">Preview</label>
              <div className="border rounded-md px-3 py-2.5 text-xs text-muted-foreground bg-background">
                {(copyrightText && copyrightText.replace(/{year}/g, currentYear.toString())) || `© ${currentYear} Your Company Name`}
                {copyrightUrl && <span className="text-primary"> (clickable)</span>}
              </div>
            </div>
          </div>
        </div>
        
        {/* Display Options */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M20.4 14.5 16 10 4 20"/>
            </svg>
            <span>Display Options</span>
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-1.5">
              <div>
                <label className="text-sm font-medium">Show Service URLs</label>
                <p className="text-xs text-muted-foreground mt-0.5">Display clickable links to services</p>
              </div>
              <Switch 
                checked={showServiceUrls}
                onCheckedChange={setShowServiceUrls}
              />
            </div>
            
            <div className="flex items-center justify-between py-1.5">
              <div>
                <label className="text-sm font-medium">Show Service Descriptions</label>
                <p className="text-xs text-muted-foreground mt-0.5">Display info icons with descriptions</p>
              </div>
              <Switch 
                checked={showServiceDescription}
                onCheckedChange={setShowServiceDescription}
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            onClick={onSave} 
            disabled={isSaving || isLoading || copyrightUrlError}
            size="sm"
          >
            {isSaving ? 
              <><div className="h-3.5 w-3.5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
              "Save Changes"}
          </Button>
        </div>
      </div>
    </>
  );
} 