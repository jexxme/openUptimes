import React from "react";
import { Button } from "@/components/ui/button";

interface AdvancedTabProps {
  customCss: string;
  setCustomCss: (css: string) => void;
  customHeader: string;
  setCustomHeader: (header: string) => void;
  isLoading: boolean;
  isSaving: boolean;
  onSave: () => void;
}

export function AdvancedTab({
  customCss,
  setCustomCss,
  customHeader,
  setCustomHeader,
  isLoading,
  isSaving,
  onSave
}: AdvancedTabProps) {
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
        Advanced customization options for your status page
      </p>
      
      <div className="space-y-6">
        {/* Custom CSS Section */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="m18 16 4-4-4-4"/>
              <path d="m6 8-4 4 4 4"/>
              <path d="m14.5 4-5 16"/>
            </svg>
            <span>Custom CSS</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Enhance the appearance of your status page with custom CSS styles</p>
          
          <div className="grid gap-2 max-w-full">
            <div className="relative">
              <textarea
                value={customCss}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomCss(e.target.value)}
                placeholder="/* Add your custom CSS here */"
                className="min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>
        
        {/* Custom Header Section */}
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Custom HTML Header</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">Add custom HTML to the head section of your status page for analytics, meta tags, or font imports</p>
          
          <div className="grid gap-2 max-w-full">
            <div className="relative">
              <textarea
                value={customHeader}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomHeader(e.target.value)}
                placeholder="<!-- Add your custom HTML here -->"
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-start gap-2 text-xs text-info bg-blue-50 border border-blue-100 rounded-md p-3 mt-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-blue-600">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          <div className="text-blue-700">
            <p>Custom code is applied directly to your status page. Use the preview feature to test your changes before making them live.</p>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
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