"use client";

import { CardTitle } from "@/components/ui/card";

interface StatusPageHeaderProps {
  statusPageEnabled: boolean | null;
  hasUnsavedChanges: boolean;
}

export function StatusPageHeader({
  statusPageEnabled,
  hasUnsavedChanges
}: StatusPageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CardTitle>Status Page</CardTitle>
        {hasUnsavedChanges && (
          <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full font-medium">
            Unsaved Changes
          </span>
        )}
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusPageEnabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${statusPageEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        {statusPageEnabled ? 'Active' : 'Disabled'}
      </div>
    </div>
  );
} 