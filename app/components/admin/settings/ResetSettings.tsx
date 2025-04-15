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

  const handleFactoryReset = async () => {
    // Clear previous errors
    setFactoryResetError("");
    
    // Validate confirmation text
    if (resetConfirmText !== "reset") {
      setFactoryResetError("Please type 'reset' to confirm");
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
      <Dialog open={isFactoryResetDialogOpen} onOpenChange={setIsFactoryResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Factory Reset</DialogTitle>
            <DialogDescription>
              This action will erase all data and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {factoryResetError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-md flex items-start">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{factoryResetError}</p>
            </div>
          )}
          
          <div className="space-y-4 p-1">
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-md">
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
              />
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="ghost"
              onClick={() => {
                setFactoryResetError("");
                setResetConfirmText("");
                setIsFactoryResetDialogOpen(false);
              }}
              disabled={isResettingApplication}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleFactoryReset}
              disabled={isResettingApplication || resetConfirmText !== "reset"}
            >
              {isResettingApplication ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
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