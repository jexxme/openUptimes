"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Settings, Shield, AlertCircle, RefreshCcw } from "lucide-react";
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

export function SettingsContent() {
  const { toast } = useToast();
  const router = useRouter();

  // General settings state
  const [siteName, setSiteName] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(60);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Security settings state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChanging, setIsChanging] = useState(false);

  // Reset settings state
  const [resetting, setResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [resetStats, setResetStats] = useState<{keysDeleted?: number} | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  
  // Reset confirmation dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetConfirmError, setResetConfirmError] = useState<string | null>(null);

  // Fetch settings on component mount
  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update state with fetched settings
        setSiteName(data.siteName || "OpenUptimes");
        // Convert milliseconds to seconds for the UI
        setRefreshInterval(Math.floor((data.refreshInterval || 60000) / 1000));
        setFetchError(null);
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        setFetchError("Failed to load settings. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Prepare data for API
      const updatedSettings = {
        siteName,
        // Convert seconds back to milliseconds for storage
        refreshInterval: refreshInterval * 1000
      };
      
      // Call API to update settings
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Show success notification
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
        duration: 3000,
      });
    } catch (err) {
      console.error("Failed to save settings:", err);
      // Show error notification
      toast({
        title: "Error saving settings",
        description: "There was a problem saving your settings. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
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
    
    // TODO: Replace with actual API call once password change endpoint is implemented
    try {
      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
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
      setError("Failed to change password. Please try again.");
    } finally {
      setIsChanging(false);
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
      
        <Tabs defaultValue="general">
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
            <p className="mb-4 text-sm text-muted-foreground">Configure site settings</p>
            
            {isLoading ? (
              <div className="py-8 flex justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Site Name</label>
                  <input 
                    type="text" 
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="OpenUptimes" 
                    className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Status Check Interval (seconds)</label>
                  <input 
                    type="number" 
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 60)}
                    placeholder="60" 
                    className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? 
                    <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
                    "Save Changes"}
                </Button>
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
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500" 
                />
              </div>
              <Button type="submit" disabled={isChanging}>
                {isChanging ? 
                  <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Changing Password...</> : 
                  "Change Password"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="reset">
            <p className="mb-4 text-sm text-muted-foreground">Reset OpenUptimes to its initial state</p>
            
            {resetError && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md mb-4">
                {resetError}
              </div>
            )}
            
            {resetComplete ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
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
                
                <h2 className="text-lg font-medium text-gray-900">Reset Complete!</h2>
                
                <p className="text-sm text-gray-500">
                  Your application has been reset successfully.
                  {resetStats?.keysDeleted !== undefined && 
                    ` ${resetStats.keysDeleted} data items were removed.`
                  }
                </p>
                
                <div className="mt-4">
                  <Button onClick={handleGoToSetup} className="w-full">
                    Go to Setup
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700">
                  This will reset your OpenUptimes installation to its initial state. You will need to:
                </p>
                
                <ul className="ml-5 list-disc space-y-1 text-gray-700">
                  <li>Go through the setup wizard again</li>
                  <li>Create a new admin password</li>
                  <li>Reconfigure site settings</li>
                  <li>Set up monitored services</li>
                </ul>
                
                <div className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-600">
                  <strong>Warning:</strong> This action cannot be undone. All your configuration, login credentials,
                  <br /> service status history, and settings will be permanently deleted.
                </div>
                
                <div className="mt-4 flex justify-end space-x-3">
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