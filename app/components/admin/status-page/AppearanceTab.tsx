import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { Slider } from "@/app/components/ui/slider";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface AppearanceTabProps {
  logoUrl: string;
  setLogoUrl: (logo: string) => void;
  showServiceUrls: boolean;
  setShowServiceUrls: (show: boolean) => void;
  showServiceDescription: boolean;
  setShowServiceDescription: (show: boolean) => void;
  historyDays: number;
  setHistoryDays: (days: number) => void;
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
  historyDays,
  setHistoryDays,
  isLoading,
  isSaving,
  onSave
}: AppearanceTabProps) {
  const [logoError, setLogoError] = useState(false);

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
        
        {/* History Options */}
        <div className="rounded-lg border bg-card p-5">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M12 8v4l3 3"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
            <span>History Options</span>
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Display History Duration</label>
                <span className="text-sm font-medium text-primary">{historyDays} days</span>
              </div>
              <Slider
                value={[historyDays]}
                onValueChange={(value: number[]) => setHistoryDays(value[0])}
                min={7}
                max={180}
                step={1}
                className="my-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>7 days</span>
                <span className="text-center">30 days</span>
                <span className="text-center">90 days</span>
                <span>180 days</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Adjust how many days of history to display on your status page.
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="ml-1 inline-flex items-center justify-center rounded-full bg-muted h-4 w-4 text-xs">?</button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Longer periods will show data at a reduced resolution. Shorter periods show more detailed data.
                  </TooltipContent>
                </Tooltip>
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6">
          <Button 
            onClick={onSave} 
            disabled={isSaving || isLoading}
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