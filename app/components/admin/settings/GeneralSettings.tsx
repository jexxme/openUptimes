"use client";

import { useState, useEffect, useMemo } from "react";
import { useToast } from "../../ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Clock } from "lucide-react";
import { AlertCircle } from "lucide-react";

// Predefined interval options (in seconds)
const INTERVAL_OPTIONS = [
  { value: 30, label: "30s" },
  { value: 60, label: "1m" },
  { value: 120, label: "2m" },
  { value: 300, label: "5m" },
  { value: 600, label: "10m" }
];

// Predefined TTL options (in seconds)
const TTL_OPTIONS = [
  { value: 0, label: "Off" },
  { value: 7 * 24 * 60 * 60, label: "7 days" },
  { value: 30 * 24 * 60 * 60, label: "30 days" },
  { value: 90 * 24 * 60 * 60, label: "90 days" },
  { value: 365 * 24 * 60 * 60, label: "1 year" }
];

// Helper function to format TTL days
const formatTtlDays = (seconds: number): string => {
  if (seconds === 0) return "0";
  const days = Math.floor(seconds / (24 * 60 * 60));
  return days.toString();
};

interface GeneralSettingsProps {
  initialSettings: {
    refreshInterval?: number;
    historyTTL?: number;
  } | null;
  isLoading: boolean;
  error: string | null;
  onSettingsUpdate: (settings: {
    refreshInterval: number;
    historyTTL: number;
  }) => void;
}

export function GeneralSettings({ 
  initialSettings, 
  isLoading: isLoadingProp, 
  error: errorProp,
  onSettingsUpdate 
}: GeneralSettingsProps) {
  const { toast } = useToast();

  // General settings state - memoize default values
  const defaultValues = useMemo(() => {
    if (initialSettings) {
      // Convert milliseconds to seconds for the UI
      const intervalInSeconds = Math.floor((initialSettings.refreshInterval || 60000) / 1000);
      const ttlInSeconds = initialSettings.historyTTL !== undefined 
        ? initialSettings.historyTTL 
        : 30 * 24 * 60 * 60;
      
      // Check if the fetched interval matches any of our predefined options
      const isPreset = INTERVAL_OPTIONS.some(option => option.value === intervalInSeconds);
      
      // Check if the fetched TTL matches any of our predefined options
      const isTtlPreset = TTL_OPTIONS.some(option => option.value === ttlInSeconds);
      
      return {
        refreshInterval: intervalInSeconds,
        isCustomInterval: !isPreset,
        customIntervalValue: intervalInSeconds.toString(),
        historyTTL: ttlInSeconds,
        isCustomTTL: !isTtlPreset,
        customTTLValue: formatTtlDays(ttlInSeconds)
      };
    }
    
    // Default values if no initialSettings
    return {
      refreshInterval: 60,
      isCustomInterval: false,
      customIntervalValue: "60",
      historyTTL: 30 * 24 * 60 * 60,
      isCustomTTL: false,
      customTTLValue: "30"
    };
  }, [initialSettings]);

  // Set initial state using memoized values
  const [refreshInterval, setRefreshInterval] = useState(defaultValues.refreshInterval);
  const [isCustomInterval, setIsCustomInterval] = useState(defaultValues.isCustomInterval);
  const [customIntervalValue, setCustomIntervalValue] = useState(defaultValues.customIntervalValue);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Start as not loading
  const [fetchError, setFetchError] = useState<string | null>(errorProp);

  // TTL settings state
  const [historyTTL, setHistoryTTL] = useState(defaultValues.historyTTL);
  const [isCustomTTL, setIsCustomTTL] = useState(defaultValues.isCustomTTL);
  const [customTTLValue, setCustomTTLValue] = useState(defaultValues.customTTLValue);

  // Only update loading/error state from props - don't reinitialize form values
  useEffect(() => {
    setIsLoading(isLoadingProp);
    setFetchError(errorProp);
  }, [isLoadingProp, errorProp]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Get the interval value to save
      let intervalToSave = refreshInterval;
      
      // If using custom interval, validate and use the custom value
      if (isCustomInterval) {
        const customValue = parseInt(customIntervalValue);
        // Validate the custom value (minimum 10 seconds, default to 60 if invalid)
        intervalToSave = !isNaN(customValue) && customValue >= 10 ? customValue : 60;
      }
      
      // Get the TTL value to save
      let ttlToSave = historyTTL;
      
      // If using custom TTL, validate and use the custom value
      if (isCustomTTL && historyTTL !== 0) {
        const customValue = parseInt(customTTLValue);
        // Validate the custom value (convert days to seconds)
        if (!isNaN(customValue) && customValue >= 0) {
          ttlToSave = customValue * 24 * 60 * 60;
        }
      }
      
      // Prepare data for API
      const updatedSettings = {
        // Convert seconds back to milliseconds for storage
        refreshInterval: intervalToSave * 1000,
        // TTL is already in seconds
        historyTTL: ttlToSave
      };
      
      // Call API to update settings
      const response = await fetch('/api/settings/general', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Update the refresh interval state with the saved value
      setRefreshInterval(intervalToSave);
      setHistoryTTL(ttlToSave);
      
      // Notify parent component about the update
      onSettingsUpdate(updatedSettings);
      
      // Show success notification
      toast({
        title: "Settings saved",
        description: "Your general settings have been updated successfully.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
      // Show error notification
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your general settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handler for selecting an interval
  const handleSelectInterval = (value: number) => {
    setRefreshInterval(value);
    setIsCustomInterval(false);
  };
  
  // Handler for switching to custom interval
  const handleSelectCustomInterval = () => {
    setIsCustomInterval(true);
    // Initialize with current value if not already a preset
    if (!INTERVAL_OPTIONS.some(option => option.value === refreshInterval)) {
      setCustomIntervalValue(refreshInterval.toString());
    }
  };
  
  // Handler for custom interval input
  const handleCustomIntervalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomIntervalValue(e.target.value);
    const numValue = parseInt(e.target.value);
    if (!isNaN(numValue) && numValue >= 10) {
      setRefreshInterval(numValue);
    }
  };

  // Handler for selecting a TTL
  const handleSelectTTL = (value: number) => {
    setHistoryTTL(value);
    setIsCustomTTL(false);
  };
  
  // Handler for switching to custom TTL
  const handleSelectCustomTTL = () => {
    setIsCustomTTL(true);
    // Initialize with current value if not already a preset
    if (!TTL_OPTIONS.some(option => option.value === historyTTL)) {
      const days = Math.floor(historyTTL / (24 * 60 * 60));
      setCustomTTLValue(days.toString());
    }
  };
  
  // Handler for custom TTL input
  const handleCustomTTLChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomTTLValue(e.target.value);
    const days = parseInt(e.target.value);
    if (!isNaN(days) && days >= 0) {
      setHistoryTTL(days * 24 * 60 * 60);
    }
  };

  return (
    <div>
      {fetchError && (
        <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
          <p className="text-sm text-red-600">{fetchError}</p>
        </div>
      )}
      
      {isLoading ? (
        <div className="py-8 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Status Check Settings</span>
            </h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Status Check Interval</label>
                <div className="flex flex-wrap gap-2">
                  {INTERVAL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectInterval(option.value)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        refreshInterval === option.value && !isCustomInterval
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSelectCustomInterval}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isCustomInterval
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                
                {isCustomInterval && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      min="10"
                      value={customIntervalValue}
                      onChange={handleCustomIntervalChange}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  How often the system checks the status of monitored services
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Data Retention Settings</span>
            </h3>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">History Time to Live</label>
                <div className="flex flex-wrap gap-2">
                  {TTL_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectTTL(option.value)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        historyTTL === option.value && !isCustomTTL
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSelectCustomTTL}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isCustomTTL
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    Custom
                  </button>
                </div>
                
                {isCustomTTL && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      value={customTTLValue}
                      onChange={handleCustomTTLChange}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground mt-1">
                  How long historical data is kept in Redis before automatic deletion. Use "Off" to keep data indefinitely.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving ? 
                <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                "Save Changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 