"use client";

import { Switch } from "@/app/components/ui/switch";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import { Eye, ExternalLink } from "lucide-react";

interface StatusPageActionsProps {
  statusPageEnabled: boolean;
  statusPageEnabledUI: boolean;
  setStatusPageEnabledUI: (value: boolean) => void;
  onOpenPreview: () => void;
  hasUnsavedChanges: boolean;
}

export function StatusPageActions({
  statusPageEnabled,
  statusPageEnabledUI,
  setStatusPageEnabledUI,
  onOpenPreview,
  hasUnsavedChanges
}: StatusPageActionsProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b pb-4 gap-4">
      <div className="flex items-center space-x-3">
        <Switch 
          id="status-page-enabled" 
          checked={statusPageEnabledUI === null ? false : statusPageEnabledUI}
          onCheckedChange={setStatusPageEnabledUI}
        />
        <Label htmlFor="status-page-enabled" className="font-medium">
          {statusPageEnabledUI ? 'Public status page is visible' : 'Public status page is hidden'}
        </Label>
      </div>
      
      <div className="flex space-x-3">
        <Button 
          variant="outline" 
          size="sm"
          onClick={onOpenPreview}
          className="flex items-center gap-1.5 h-9 px-3"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Preview</span>
        </Button>
        
        <Button 
          variant={statusPageEnabled ? "default" : "outline"}
          size="sm"
          disabled={statusPageEnabled !== true}
          onClick={() => window.open('/', '_blank')}
          className="flex items-center gap-1.5 h-9 px-3"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open Page</span>
        </Button>
      </div>
    </div>
  );
} 