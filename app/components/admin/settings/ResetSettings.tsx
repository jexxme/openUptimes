"use client";

import { useState } from "react";
import { useToast } from "../../ui/use-toast";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
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

export function ResetSettings() {
  const { toast } = useToast();
  
  // Reset states
  const [isFactoryResetDialogOpen, setIsFactoryResetDialogOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [isResettingApplication, setIsResettingApplication] = useState(false);
  const [factoryResetError, setFactoryResetError] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  const verifyPassword = async () => {
    // Clear previous errors
    setFactoryResetError("");
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminPassword }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Invalid password');
      }
      
      // Password verified
      setIsPasswordVerified(true);
    } catch (error) {
      console.error("Password verification error:", error);
      setFactoryResetError(error instanceof Error ? error.message : "Invalid password");
    }
  };

  const handleFactoryReset = async () => {
    // Clear previous errors
    setFactoryResetError("");
    
    if (!isPasswordVerified) {
      setFactoryResetError("Please verify your password first");
      return;
    }
    
    setIsResettingApplication(true);
    
    try {
      const response = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Factory reset failed');
      }
      
      // Clear form and close dialog
      setResetConfirmText("");
      setAdminPassword("");
      setIsPasswordVerified(false);
      setIsFactoryResetDialogOpen(false);
      
      // Show success message
      toast({
        title: "Factory reset successful",
        description: "The application has been reset to its initial state. You will be redirected to the setup page.",
        duration: 5000,
      });
      
      // Redirect to setup page after a short delay
      setTimeout(() => {
        window.location.href = "/setup";
      }, 3000);
    } catch (error) {
      console.error("Factory reset error:", error);
      setFactoryResetError(error instanceof Error ? error.message : "Failed to reset application");
    } finally {
      setIsResettingApplication(false);
    }
  };

  // Reset state when dialog is closed
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setResetConfirmText("");
      setAdminPassword("");
      setIsPasswordVerified(false);
      setFactoryResetError("");
    }
    setIsFactoryResetDialogOpen(open);
  };

  return (
    <div className="space-y-6">
      {/* Factory Reset Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Factory Reset
          </CardTitle>
          <CardDescription>
            Reset the entire application to its initial state
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium mb-1">Warning: This action cannot be undone</p>
              <p>This will erase all data from Redis, including:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>All monitored services</li>
                <li>All historical uptime data</li>
                <li>All application settings</li>
                <li>Admin user credentials</li>
              </ul>
              <p className="mt-2">The application will revert to its post-deployment state, requiring initial setup.</p>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button 
              variant="destructive"
              onClick={() => setIsFactoryResetDialogOpen(true)}
            >
              Factory Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Factory Reset Dialog */}
      <Dialog open={isFactoryResetDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirm Factory Reset</DialogTitle>
            <DialogDescription className="text-base mt-2">
              This action will erase all data and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {factoryResetError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600 font-medium">{factoryResetError}</p>
            </div>
          )}
          
          <div className="space-y-4 p-1">
            {!isPasswordVerified ? (
              <>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800 font-medium">
                    To confirm, type "reset" in the field below:
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Input
                    autoFocus
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Type 'reset' to confirm"
                    className="h-10"
                  />
                </div>
                
                {resetConfirmText === "reset" && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-sm font-medium mb-1.5">Enter your admin password to proceed. <br /> (You may reset your password in the Security Settings):</div>
                    <Input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Admin password"
                      className="h-10"
                    />
                    <Button 
                      onClick={verifyPassword}
                      disabled={!adminPassword || isResettingApplication}
                      className="w-full h-10 mt-2"
                    >
                      Verify Password
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium flex items-center">
                  <span className="bg-green-100 text-green-700 p-1 rounded-full mr-2">✓</span>
                  Password verified. You can now proceed with the factory reset.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter className="sm:justify-between mt-2">
            <Button 
              variant="outline"
              size="lg"
              onClick={handleDialogClose.bind(null, false)}
              disabled={isResettingApplication}
              className="h-10"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              size="lg"
              onClick={handleFactoryReset}
              disabled={!isPasswordVerified || isResettingApplication}
              className="h-10"
            >
              {isResettingApplication ? (
                <>
                  <div className="h-5 w-5 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Resetting...
                </>
              ) : "Factory Reset"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 