"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface GeneralSettingsProps {
  initialSettings: {
    // Future general settings will be added here
  } | null;
  isLoading: boolean;
  error: string | null;
  onSettingsUpdate: (settings: any) => void;
  hasUnsavedChanges?: boolean;
  onUnsavedChangesChange?: (hasChanges: boolean) => void;
}

export function GeneralSettings({ 
  initialSettings, 
  isLoading, 
  error,
  onSettingsUpdate,
  hasUnsavedChanges,
  onUnsavedChangesChange
}: GeneralSettingsProps) {
  // Report to parent that we have no unsaved changes
  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(false);
    }
  }, [onUnsavedChangesChange]);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <h3 className="font-medium mb-4">General Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This section will contain future general settings.
        </p>
      </div>
    </div>
  );
} 