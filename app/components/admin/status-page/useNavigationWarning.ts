"use client";

import { useEffect } from 'react';

export const useNavigationWarning = (hasUnsavedChanges: boolean) => {
  // Setup beforeunload event to prompt user before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Standard way to show a confirmation dialog before page unload
        e.preventDefault();
        const message = "You have unsaved changes. Are you sure you want to leave?";
        e.returnValue = message; // Required for Chrome
        return message; // Required for other browsers
      }
    };

    // Add event listener
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Clean up
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Add "leave confirmation" dialog for navigation links
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isNavigationLink = 
        target.tagName === 'A' || 
        target.closest('a') || 
        target.classList.contains('sidebar-item') || 
        target.closest('.sidebar-item');
      
      if (isNavigationLink && hasUnsavedChanges) {
        const confirmed = window.confirm("You have unsaved changes. Are you sure you want to leave?");
        if (!confirmed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    
    document.addEventListener('click', handleClick, true);
    
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, [hasUnsavedChanges]);

  // Modify page title to indicate unsaved changes
  useEffect(() => {
    const originalTitle = document.title;
    
    if (hasUnsavedChanges) {
      document.title = "* " + originalTitle;
    }
    
    return () => {
      document.title = originalTitle;
    };
  }, [hasUnsavedChanges]);
}; 