// Utility functions for status page management

// Check if there are any unsaved changes across all tabs
export const hasUnsavedChanges = (
  statusPageEnabled: boolean | null,
  statusPageEnabledUI: boolean | null,
  statusPageTitle: string,
  statusPageDescription: string,
  serviceVisibility: {name: string, visible: boolean}[],
  logoUrl: string,
  showServiceUrls: boolean,
  showServiceDescription: boolean,
  historyDays: number,
  customCss: string,
  customHeader: string,
  preloadedStatusPageData: any,
  preloadedAppearanceData: any
) => {
  return hasGeneralTabChanges(
    statusPageEnabled,
    statusPageEnabledUI,
    statusPageTitle,
    statusPageDescription,
    historyDays,
    preloadedStatusPageData,
    preloadedAppearanceData
  ) || 
  hasServicesTabChanges(
    serviceVisibility,
    preloadedStatusPageData
  ) || 
  hasAppearanceTabChanges(
    logoUrl,
    showServiceUrls,
    showServiceDescription,
    preloadedAppearanceData
  ) || 
  hasAdvancedTabChanges(
    customCss,
    customHeader,
    preloadedAppearanceData
  );
};

// Check for changes in the General tab
export const hasGeneralTabChanges = (
  statusPageEnabled: boolean | null,
  statusPageEnabledUI: boolean | null,
  statusPageTitle: string,
  statusPageDescription: string,
  historyDays: number,
  preloadedStatusPageData: any,
  preloadedAppearanceData: any
) => {
  // Check statusPage toggle
  if (statusPageEnabled !== statusPageEnabledUI) {
    return true;
  }
  
  // Initial settings from server
  const originalTitle = preloadedStatusPageData?.settings?.title || "Service Status";
  const originalDescription = preloadedStatusPageData?.settings?.description || "Current status of our services";
  const originalHistoryDays = preloadedAppearanceData?.historyDays || 90;
  
  // Check for title, description and history days changes
  if (statusPageTitle !== originalTitle || 
      statusPageDescription !== originalDescription ||
      historyDays !== originalHistoryDays) {
    return true;
  }
  
  return false;
};

// Check for changes in the Services tab
export const hasServicesTabChanges = (
  serviceVisibility: {name: string, visible: boolean}[],
  preloadedStatusPageData: any
) => {
  // Check for service visibility changes
  const originalServices = preloadedStatusPageData?.services || [];
  if (serviceVisibility.length !== originalServices.length) {
    return true;
  }
  
  // Check each service visibility setting
  for (let i = 0; i < serviceVisibility.length; i++) {
    const currentService = serviceVisibility[i];
    const originalService = originalServices.find((s: {name: string, visible: boolean}) => s.name === currentService.name);
    
    if (!originalService || originalService.visible !== currentService.visible) {
      return true;
    }
  }
  
  return false;
};

// Check for changes in the Appearance tab
export const hasAppearanceTabChanges = (
  logoUrl: string,
  showServiceUrls: boolean,
  showServiceDescription: boolean,
  preloadedAppearanceData: any
) => {
  const originalLogoUrl = preloadedAppearanceData?.logoUrl || "";
  const originalShowServiceUrls = preloadedAppearanceData?.showServiceUrls !== false;
  const originalShowServiceDescription = preloadedAppearanceData?.showServiceDescription !== false;
  
  if (logoUrl !== originalLogoUrl || 
      showServiceUrls !== originalShowServiceUrls || 
      showServiceDescription !== originalShowServiceDescription) {
    return true;
  }
  
  return false;
};

// Check for changes in the Advanced tab
export const hasAdvancedTabChanges = (
  customCss: string,
  customHeader: string,
  preloadedAppearanceData: any
) => {
  const originalCustomCss = preloadedAppearanceData?.customCSS || "";
  const originalCustomHeader = preloadedAppearanceData?.customHeader || "";
  
  if (customCss !== originalCustomCss || customHeader !== originalCustomHeader) {
    return true;
  }
  
  return false;
}; 