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
          <span className="text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full font-medium border border-amber-100 dark:border-amber-900/30">
            Unsaved Changes
          </span>
        )}
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        statusPageEnabled 
          ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-900/30' 
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${
          statusPageEnabled 
            ? 'bg-green-500 dark:bg-green-400 animate-pulse' 
            : 'bg-gray-400 dark:bg-gray-500'
        }`}></div>
        {statusPageEnabled ? 'Active' : 'Disabled'}
      </div>
    </div>
  );
} 