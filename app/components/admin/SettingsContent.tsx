"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Settings, Shield, AlertCircle, RefreshCcw, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

// Add toast notification
import { useToast } from "../ui/use-toast";

export function SettingsContent() {
  const { toast } = useToast();

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

  // Reset app state
  const [isResetting, setIsResetting] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

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

  const handleResetApplication = async () => {
    if (resetConfirmText !== "RESET") {
      toast({
        title: "Reset canceled",
        description: "You must type RESET to confirm.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/setup/reset', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Reset failed');
      }
      
      // Clear auth cookies
      document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      localStorage.clear();
      sessionStorage.clear();
      
      toast({
        title: "Reset successful",
        description: "Application has been reset. Redirecting to setup...",
        duration: 3000,
      });
      
      // Redirect to setup after a brief delay
      setTimeout(() => {
        window.location.href = '/?t=' + new Date().getTime();
      }, 2000);
      
    } catch (err) {
      console.error("Failed to reset application:", err);
      toast({
        title: "Reset failed",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
        duration: 5000,
      });
      setIsResetting(false);
    }
  };

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
            <TabsTrigger value="system" className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              <span>System</span>
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
          
          <TabsContent value="system">
            <p className="mb-4 text-sm text-muted-foreground">System maintenance operations</p>
            
            <div className="space-y-8">
              <div className="border border-red-200 rounded-md p-4 bg-red-50">
                <h3 className="text-lg font-medium text-red-800 flex items-center mb-2">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Reset Application
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  This will reset OpenUptimes to its initial state. All services, settings, history,
                  and login credentials will be permanently deleted.
                </p>
                
                <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      Reset Application
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle className="text-red-600 flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-2" />
                        Confirm Application Reset
                      </DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. All your data, services, settings and history will be permanently deleted.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-4">
                      <p className="text-sm font-medium mb-2">Type RESET to confirm:</p>
                      <input
                        type="text"
                        value={resetConfirmText}
                        onChange={(e) => setResetConfirmText(e.target.value)}
                        className="px-3 py-2 rounded-md border border-red-300 w-full focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="RESET"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleResetApplication}
                        disabled={isResetting || resetConfirmText !== "RESET"}
                      >
                        {isResetting ? (
                          <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Resetting...</>
                        ) : (
                          "Reset Everything"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 