"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Settings, Shield, AlertCircle, RefreshCcw, Palette, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

// Add toast notification
import { useToast } from "../ui/use-toast";

// Dialog components for confirmation
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../../../components/ui/input";

interface SettingsContentProps {
  activeSection?: string;
}

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

export function SettingsContent({ activeSection = "general" }: SettingsContentProps) {
  const { toast } = useToast();
  const router = useRouter();

  // General settings state
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customIntervalValue, setCustomIntervalValue] = useState("60");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // TTL settings state
  const [historyTTL, setHistoryTTL] = useState(30 * 24 * 60 * 60); // Default 30 days
  const [isCustomTTL, setIsCustomTTL] = useState(false);
  const [customTTLValue, setCustomTTLValue] = useState("30");

  // Security settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  
  // Password reset state
  const [redisUrl, setRedisUrl] = useState("");
  const [redisUrlError, setRedisUrlError] = useState<string | null>(null);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordText, setResetPasswordText] = useState("");
  const [newResetPassword, setNewResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [resetPasswordConfirmError, setResetPasswordConfirmError] = useState<string | null>(null);

  // Reset settings state
  const [resetting, setResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [resetStats, setResetStats] = useState<{keysDeleted?: number} | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  
  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetConfirmError, setResetConfirmError] = useState<string | null>(null);

  // Map section to tab value
  const getSectionTabValue = (section: string): string => {
    switch (section) {
      case "security":
        return "security";
      case "reset":
        return "reset";
      case "general":
      default:
        return "general";
    }
  };

  // Current selected tab
  const [currentTab, setCurrentTab] = useState(getSectionTabValue(activeSection));

  // Update current tab when activeSection changes
  useEffect(() => {
    setCurrentTab(getSectionTabValue(activeSection));
  }, [activeSection]);

  // Fetch settings on component mount
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        // General settings
        const response = await fetch('/api/settings/general');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Convert milliseconds to seconds for the UI
        const intervalInSeconds = Math.floor((data.refreshInterval || 60000) / 1000);
        setRefreshInterval(intervalInSeconds);
        
        // Check if the fetched interval matches any of our predefined options
        const isPreset = INTERVAL_OPTIONS.some(option => option.value === intervalInSeconds);
        setIsCustomInterval(!isPreset);
        setCustomIntervalValue(intervalInSeconds.toString());
        
        // Set TTL data
        const ttlInSeconds = data.historyTTL !== undefined ? data.historyTTL : 30 * 24 * 60 * 60;
        setHistoryTTL(ttlInSeconds);
        
        // Check if the fetched TTL matches any of our predefined options
        const isTtlPreset = TTL_OPTIONS.some(option => option.value === ttlInSeconds);
        setIsCustomTTL(!isTtlPreset);
        setCustomTTLValue(formatTtlDays(ttlInSeconds));
        
        setFetchError(null);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        setFetchError("Failed to load general settings. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error
    setError(null);
    
    // Basic validation
    if (!currentPassword) {
      setError("Current password is required");
      return;
    }
    
    if (!newPassword) {
      setError("New password is required");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match");
      return;
    }
    
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setIsChanging(true);
    
    try {
      // Call the password change API
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }
      
      // Clear form after successful change
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Show success notification
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to change password. Please try again.");
      }
    } finally {
      setIsChanging(false);
    }
  };

  // Show password reset dialog
  const handleShowPasswordReset = () => {
    setShowResetPasswordDialog(true);
    setRedisUrl("");
    setRedisUrlError(null);
    setResetPasswordText("");
    setNewResetPassword("");
    setConfirmResetPassword("");
    setResetPasswordConfirmError(null);
  };

  const handleResetPassword = async () => {
    // Validate Redis URL
    if (!redisUrl) {
      setRedisUrlError("Redis URL is required");
      return;
    }
    
    // Validate Redis URL format
    if (!redisUrl.startsWith("redis://") && !redisUrl.startsWith("rediss://")) {
      setRedisUrlError("Invalid Redis URL format");
      return;
    }
    
    // Validate confirmation text
    if (resetPasswordText.toLowerCase() !== "reset password") {
      setResetPasswordConfirmError("Please type 'reset password' to confirm");
      return;
    }
    
    // Validate new password
    if (!newResetPassword) {
      setResetPasswordConfirmError("New password is required");
      return;
    }
    
    if (newResetPassword.length < 8) {
      setResetPasswordConfirmError("Password must be at least 8 characters");
      return;
    }
    
    if (newResetPassword !== confirmResetPassword) {
      setResetPasswordConfirmError("Passwords don't match");
      return;
    }
    
    setIsResettingPassword(true);
    setResetPasswordConfirmError(null);
    
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redisUrl,
          newPassword: newResetPassword
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset password');
      }
      
      // Close dialog and show success message
      setShowResetPasswordDialog(false);
      setResetPasswordSuccess("Password has been reset successfully. You can now log in with your new password.");
      
      // Show success notification
      toast({
        title: "Password reset",
        description: "Admin password has been reset successfully.",
        duration: 3000,
      });
    } catch (error) {
      if (error instanceof Error) {
        setResetPasswordConfirmError(error.message);
      } else {
        setResetPasswordConfirmError("Failed to reset password. Please verify your Redis URL and try again.");
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  // Show the reset confirmation dialog
  const handleShowResetConfirmation = () => {
    setResetConfirmText("");
    setResetConfirmError(null);
    setShowResetDialog(true);
  };

  // Handle the confirmation dialog submission
  const handleResetConfirmation = () => {
    if (resetConfirmText.toLowerCase() !== "reset") {
      setResetConfirmError("Please type 'reset' to confirm");
      return;
    }
    
    setShowResetDialog(false);
    handleReset();
  };

  async function handleReset() {
    setResetting(true);
    setResetError(null);
    
    try {
      const response = await fetch('/api/setup/reset', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Reset failed');
      }
      
      const result = await response.json();
      setResetStats(result);
      setResetComplete(true);
      
      // Clear any client-side state or cookies
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.clear();
      sessionStorage.clear();
      
      // Show success notification
      toast({
        title: "Reset complete",
        description: "Your application has been reset successfully.",
        duration: 3000,
      });
      
    } catch (err) {
      if (err instanceof Error) {
        setResetError(err.message);
      } else {
        setResetError('An unknown error occurred');
      }
      
      // Show error notification
      toast({
        title: "Reset failed",
        description: "There was a problem resetting your application.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setResetting(false);
    }
  }

  function handleGoToSetup() {
    // Force a full page reload to ensure all state is cleared
    window.location.href = '/?t=' + new Date().getTime();
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
      </CardHeader>
      <CardContent>
        {fetchError && (
          <div className="p-4 mb-6 bg-red-50 border border-red-100 rounded-md flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        )}
      
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>General</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="reset" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              <span>Reset</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <p className="mb-4 text-sm text-muted-foreground">Configure global settings</p>
            
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
          </TabsContent>
          
          <TabsContent value="security">
            <p className="mb-4 text-sm text-muted-foreground">Manage admin password and authentication</p>
            
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md mb-4">
                {error}
              </div>
            )}
            
            {resetPasswordSuccess && (
              <div className="p-3 bg-green-50 text-green-600 text-sm rounded-md mb-4">
                {resetPasswordSuccess}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span>Change Password</span>
                </h3>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Current Password</label>
                    <Input 
                      type="password" 
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input 
                      type="password" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full" 
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isChanging}>
                      {isChanging ? 
                        <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Changing Password...</> : 
                        "Change Password"}
                    </Button>
                  </div>
                </form>
              </div>
              
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                  <span>Forgot Password</span>
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  If you've forgotten your admin password, you can reset it using your Redis database credentials.
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" onClick={handleShowPasswordReset}>
                    Reset Password
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Password Reset Dialog */}
            <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Reset Admin Password</DialogTitle>
                  <DialogDescription>
                    To reset your admin password, enter your Redis URL and a new password.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Redis URL</label>
                    <Input
                      placeholder="redis://username:password@host:port"
                      value={redisUrl}
                      onChange={(e) => {
                        setRedisUrl(e.target.value);
                        setRedisUrlError(null);
                      }}
                      className="w-full"
                    />
                    {redisUrlError && (
                      <p className="text-sm text-red-500">{redisUrlError}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      This is the connection string for your Redis database
                    </p>
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">New Password</label>
                    <Input
                      type="password"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Confirm New Password</label>
                    <Input
                      type="password"
                      value={confirmResetPassword}
                      onChange={(e) => setConfirmResetPassword(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="grid gap-2 pt-2">
                    <label className="text-sm font-medium">Confirm Reset</label>
                    <Input
                      placeholder="Type 'reset password' to confirm"
                      value={resetPasswordText}
                      onChange={(e) => setResetPasswordText(e.target.value)}
                      className="w-full"
                    />
                    {resetPasswordConfirmError && (
                      <p className="text-sm text-red-500">{resetPasswordConfirmError}</p>
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResetPassword}
                    disabled={isResettingPassword}
                  >
                    {isResettingPassword ? 
                      <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Resetting...</> : 
                      "Reset Password"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          <TabsContent value="reset">
            <p className="mb-4 text-sm text-muted-foreground">Reset OpenUptimes to its initial state</p>
            
            {resetError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md mb-4">
                {resetError}
              </div>
            )}
            
            {resetComplete ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Reset Complete!</h2>
                  
                  <p className="text-sm text-gray-500 mb-4">
                    Your application has been reset successfully.
                    {resetStats?.keysDeleted !== undefined && 
                      ` ${resetStats.keysDeleted} data items were removed.`
                    }
                  </p>
                  
                  <Button onClick={handleGoToSetup} className="w-full">
                    Go to Setup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <RefreshCcw className="h-4 w-4 text-muted-foreground" />
                    <span>Application Reset</span>
                  </h3>
                  
                  <p className="text-sm text-gray-700 mb-4">
                    This will reset your OpenUptimes installation to its initial state. You will need to:
                  </p>
                  
                  <ul className="ml-5 list-disc space-y-1 text-sm text-gray-700 mb-4">
                    <li>Go through the setup wizard again</li>
                    <li>Create a new admin password</li>
                    <li>Reconfigure site settings</li>
                    <li>Set up monitored services</li>
                  </ul>
                  
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 mb-4">
                    <strong>Warning:</strong> This action cannot be undone. All your configuration, login credentials,
                    <br />
                    service status history, and settings will be permanently deleted.
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline" 
                      onClick={() => router.push('/')}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleShowResetConfirmation}
                      disabled={resetting}
                    >
                      Reset Application
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Reset Confirmation Dialog */}
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Confirm Reset</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. Type <span className="font-bold">reset</span> below to confirm.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Input
                      id="reset-confirm"
                      placeholder="Type 'reset' to confirm"
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      className="col-span-3"
                    />
                    {resetConfirmError && (
                      <p className="text-sm text-red-500">{resetConfirmError}</p>
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleResetConfirmation}
                    disabled={resetConfirmText.toLowerCase() !== "reset"}
                  >
                    Confirm Reset
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 