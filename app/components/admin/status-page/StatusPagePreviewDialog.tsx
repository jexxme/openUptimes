import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StatusPagePreviewDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  statusPageEnabled: boolean | null;
  unsavedSettings: {
    statusPageEnabledUI: boolean | null;
    statusPageTitle: string;
    statusPageDescription: string;
    serviceVisibility: {name: string, visible: boolean}[];
    appearanceSettings?: {
      logoUrl?: string;
      showServiceUrls?: boolean;
      showServiceDescription?: boolean;
      historyDays?: number;
      customCSS?: string;
      customHeader?: string;
    };
  };
  hasUnsavedChanges: boolean;
}

export function StatusPagePreviewDialog({
  open,
  setOpen,
  statusPageEnabled,
  unsavedSettings,
  hasUnsavedChanges
}: StatusPagePreviewDialogProps) {
  // Create URL with serialized settings
  const createPreviewUrl = () => {
    const url = new URL(window.location.origin);
    url.pathname = "/";
    
    // Base preview params
    url.searchParams.set('preview', 'true');
    url.searchParams.set('forceShow', 'true');
    url.searchParams.set('respectVisibility', 'true');
    
    // Serialize unsaved settings
    const settingsParam = {
      enabled: unsavedSettings.statusPageEnabledUI,
      title: unsavedSettings.statusPageTitle,
      description: unsavedSettings.statusPageDescription,
      services: unsavedSettings.serviceVisibility,
      appearance: unsavedSettings.appearanceSettings,
      hasUnsavedChanges: hasUnsavedChanges
    };
    
    // Add serialized settings to URL
    url.searchParams.set('settings', encodeURIComponent(JSON.stringify(settingsParam)));
    
    return url.toString();
  };
  
  const previewUrl = createPreviewUrl();
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[800px] sm:max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Status Page Preview</DialogTitle>
            {hasUnsavedChanges && (
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">
                Unsaved Changes
              </span>
            )}
          </div>
        </DialogHeader>
        
        <div className="border rounded-md overflow-hidden h-[500px]">
          <iframe
            src={previewUrl}
            className="w-full h-full"
            title="Status Page Preview"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          {statusPageEnabled ? (
            <Button onClick={() => window.open('/', '_blank')}>
              Open in New Tab
            </Button>
          ) : (
            <Button variant="outline" onClick={() => window.open(previewUrl, '_blank')}>
              Open Preview in New Tab
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 