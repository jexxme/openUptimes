"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, RefreshCw, AlertCircle, Database, Copy } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function SecuritySettings() {
  const { toast } = useToast();
  
  // Password management states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // Password reset states
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [redisUrl, setRedisUrl] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [confirmResetPassword, setConfirmResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  
  // Redis URL view states
  const [isRedisUrlDialogOpen, setIsRedisUrlDialogOpen] = useState(false);
  const [verificationPassword, setVerificationPassword] = useState("");
  const [showVerificationPassword, setShowVerificationPassword] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  const [savedRedisUrl, setSavedRedisUrl] = useState("");
  const [isRedisUrlRevealed, setIsRedisUrlRevealed] = useState(false);
  const [redisUrlError, setRedisUrlError] = useState("");
  
  // Error states
  const [passwordError, setPasswordError] = useState("");
  const [resetError, setResetError] = useState("");

  // Handle password verification for viewing Redis URL
  const handleVerifyPassword = async () => {
    // Clear previous errors
    setRedisUrlError("");
    
    // Validate password
    if (!verificationPassword) {
      setRedisUrlError("Password is required for verification");
      return;
    }
    
    setIsVerifyingPassword(true);
    
    try {
      const response = await fetch('/api/admin/redis/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: verificationPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password verification failed');
      }
      
      const data = await response.json();
      
      // Set the fetched Redis URL and mark as revealed
      setSavedRedisUrl(data.redisUrl);
      setIsRedisUrlRevealed(true);
      
      // Clear password field
      setVerificationPassword("");
      
    } catch (error) {
      console.error("Password verification error:", error);
      setRedisUrlError(error instanceof Error ? error.message : "Failed to verify password");
      setIsRedisUrlRevealed(false);
    } finally {
      setIsVerifyingPassword(false);
    }
  };

  // Copy Redis URL to clipboard
  const copyRedisUrlToClipboard = () => {
    navigator.clipboard.writeText(savedRedisUrl);
    toast({
      title: "Copied to clipboard",
      description: "Redis URL has been copied to your clipboard",
      duration: 3000,
      variant: "info",
    });
  };

  const handleChangePassword = async () => {
    // Clear previous errors
    setPasswordError("");
    
    // Validate passwords
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    
    if (!newPassword) {
      setPasswordError("New password is required");
      return;
    }
    
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }
    
    // Submit password change
    setIsChangingPassword(true);
    
    try {
      const response = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password change failed');
      }
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Show success message
      toast({
        title: "Password updated",
        description: "Your admin password has been changed successfully",
        duration: 3000,
        variant: "success",
      });
    } catch (error) {
      console.error("Password change error:", error);
      setPasswordError(error instanceof Error ? error.message : "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetPassword = async () => {
    // Clear previous errors
    setResetError("");
    
    // Validate Redis URL
    if (!redisUrl) {
      setResetError("Redis URL is required for verification");
      return;
    }
    
    // Validate new password
    if (!resetPassword) {
      setResetError("New password is required");
      return;
    }
    
    if (resetPassword.length < 8) {
      setResetError("Password must be at least 8 characters long");
      return;
    }
    
    if (resetPassword !== confirmResetPassword) {
      setResetError("Passwords do not match");
      return;
    }
    
    setIsResettingPassword(true);
    
    try {
      const response = await fetch('/api/admin/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redisUrl,
          newPassword: resetPassword
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password reset failed');
      }
      
      // Clear form and close dialog
      setRedisUrl("");
      setResetPassword("");
      setConfirmResetPassword("");
      setIsResetDialogOpen(false);
      
      // Show success message
      toast({
        title: "Password reset successful",
        description: "Your password has been reset successfully. You can now log in with your new password.",
        duration: 5000,
        variant: "success",
      });
    } catch (error) {
      console.error("Password reset error:", error);
      setResetError(error instanceof Error ? error.message : "Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Change Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Change Admin Password
          </CardTitle>
          <CardDescription>
            Update your admin dashboard access password
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleChangePassword} 
            disabled={isChangingPassword}
          >
            {isChangingPassword ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                Updating...
              </>
            ) : "Update Password"}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Reset Password Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Reset Admin Password
          </CardTitle>
          <CardDescription>
            Forgot your password? Reset it using your Redis connection details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you've forgotten your admin password, you can reset it by verifying your Redis connection URL.
            This acts as a secure two-factor authentication method.
          </p>
          <div className="flex justify-end">
            <Button 
              variant="outline"
              className="bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
              onClick={() => setIsResetDialogOpen(true)}
            >
              Reset Password
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* View Redis URL Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            View Redis Connection URL
          </CardTitle>
          <CardDescription>
            View your Redis connection URL (requires password verification)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            For security reasons, your Redis connection details are partially hidden. 
            Authenticate with your admin password to view the full URL.
          </p>
          
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md mb-4">
            <div className="flex items-center">
              <div className="flex-1 font-mono text-sm overflow-hidden">
                redis://****:****@****.***:****
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={() => {
                setIsRedisUrlDialogOpen(true);
                setIsRedisUrlRevealed(false);
                setSavedRedisUrl("");
                setVerificationPassword("");
                setRedisUrlError("");
              }}
            >
              View Full URL
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Password Reset Dialog */}
      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Admin Password</DialogTitle>
            <DialogDescription>
              Enter your Redis connection URL to verify your identity and set a new password.
            </DialogDescription>
          </DialogHeader>
          
          {resetError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{resetError}</p>
            </div>
          )}
          
          <div className="space-y-4 p-1">
            <div className="space-y-2">
              <Label htmlFor="redis-url">Redis Connection URL</Label>
              <Input
                id="redis-url"
                type="text"
                placeholder="redis://username:password@host:port"
                value={redisUrl}
                onChange={(e) => setRedisUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This must match exactly the REDIS_URL used in your application
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <div className="relative">
                <Input
                  id="reset-password"
                  type={showResetPassword ? "text" : "password"}
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {showResetPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-reset-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-reset-password"
                  type={showConfirmResetPassword ? "text" : "password"}
                  value={confirmResetPassword}
                  onChange={(e) => setConfirmResetPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmResetPassword(!showConfirmResetPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                >
                  {showConfirmResetPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="ghost"
              onClick={() => {
                setResetError("");
                setRedisUrl("");
                setResetPassword("");
                setConfirmResetPassword("");
                setIsResetDialogOpen(false);
              }}
              disabled={isResettingPassword}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleResetPassword}
              disabled={isResettingPassword}
            >
              {isResettingPassword ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Resetting...
                </>
              ) : "Reset Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Redis URL View Dialog */}
      <Dialog open={isRedisUrlDialogOpen} onOpenChange={setIsRedisUrlDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>View Redis Connection URL</DialogTitle>
            <DialogDescription>
              Enter your admin password to view the full Redis connection URL.
            </DialogDescription>
          </DialogHeader>
          
          {redisUrlError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/30 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{redisUrlError}</p>
            </div>
          )}
          
          {!isRedisUrlRevealed ? (
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="verification-password">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="verification-password"
                    type={showVerificationPassword ? "text" : "password"}
                    value={verificationPassword}
                    onChange={(e) => setVerificationPassword(e.target.value)}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowVerificationPassword(!showVerificationPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  >
                    {showVerificationPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  onClick={handleVerifyPassword}
                  disabled={isVerifyingPassword}
                >
                  {isVerifyingPassword ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                      Verifying...
                    </>
                  ) : "Verify Password"}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 p-1">
              <div className="space-y-2">
                <Label htmlFor="redis-url-display">Redis URL</Label>
                <div className="relative">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md font-mono text-sm break-all">
                    {savedRedisUrl}
                  </div>
                  <button
                    type="button"
                    onClick={copyRedisUrlToClipboard}
                    className="absolute top-2 right-2 p-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
                <p className="text-xs text-red-500 dark:text-red-400 font-medium">
                  Keep this information secure and never share it with unauthorized individuals.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setIsRedisUrlDialogOpen(false);
                    setIsRedisUrlRevealed(false);
                    setSavedRedisUrl("");
                  }}
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 