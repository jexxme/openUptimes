"use client";

import { useState } from "react";
import { useToast } from "../../ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, RefreshCw, AlertCircle } from "lucide-react";
import { Label } from "../../ui/label";
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
} from "../../ui/dialog";

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
  
  // Error states
  const [passwordError, setPasswordError] = useState("");
  const [resetError, setResetError] = useState("");

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
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{passwordError}</p>
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
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
              className="bg-black text-white hover:bg-black/90"
              onClick={() => setIsResetDialogOpen(true)}
            >
              Reset Password
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
            <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{resetError}</p>
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
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
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
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
    </div>
  );
} 