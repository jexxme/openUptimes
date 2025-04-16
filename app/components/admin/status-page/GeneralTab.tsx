import React from "react";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { Input } from "@/components/ui/input";

interface GeneralTabProps {
  statusPageTitle: string;
  setStatusPageTitle: (title: string) => void;
  statusPageDescription: string;
  setStatusPageDescription: (description: string) => void;
  statusPageEnabledUI: boolean | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function GeneralTab({
  statusPageTitle,
  setStatusPageTitle,
  statusPageDescription,
  setStatusPageDescription,
  statusPageEnabledUI,
  isLoading,
  isSaving,
  onSave
}: GeneralTabProps) {
  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Configure your public status page settings.
      </p>
      
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>Status Page Information</span>
            </h3>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Status Page Title</label>
                <Input 
                  type="text" 
                  value={statusPageTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusPageTitle(e.target.value)}
                  disabled={statusPageEnabledUI !== true}
                  placeholder="Service Status" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Status Page Description</label>
                <Input 
                  type="text" 
                  value={statusPageDescription}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusPageDescription(e.target.value)}
                  disabled={statusPageEnabledUI !== true}
                  placeholder="Current status of our services" 
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={onSave} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? 
              <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
              "Save Changes"}
          </Button>
        </div>
      </div>
    </>
  );
} 