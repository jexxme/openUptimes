"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExternalLink, Settings, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useState } from "react";

interface StatusPageCardProps {
  statusPageData: any;
  statusPageEnabled: boolean;
  isTogglingStatusPage: boolean;
  handleStatusPageToggle: (enabled: boolean) => void;
  handleNavigation: (tab: string, section?: string) => void;
  className?: string;
}

export const StatusPageCard = ({
  statusPageData,
  statusPageEnabled,
  isTogglingStatusPage,
  handleStatusPageToggle,
  handleNavigation,
  className = ""
}: StatusPageCardProps) => {
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const handleToggleStatusPage = (enabled: boolean) => {
    // If we're enabling the status page, just do it
    if (enabled) {
      handleStatusPageToggle(true);
      return;
    }
    
    // If we're disabling, show the confirmation dialog
    setShowDisableDialog(true);
  };

  const confirmDisableStatusPage = () => {
    setShowDisableDialog(false);
    handleStatusPageToggle(false);
  };

  return (
    <>
      <Card className={`overflow-hidden border ${className}`}>
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium">Status Page</CardTitle>
              <CardDescription className="text-xs">Public status dashboard</CardDescription>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              statusPageEnabled 
                ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${statusPageEnabled ? 'bg-green-500' : 'bg-slate-400'}`}></div>
              {statusPageEnabled ? 'Active' : 'Disabled'}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {statusPageData ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Public Access</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{statusPageData?.settings?.title || "Service Status"}</p>
                </div>
                <div className="relative">
                  {isTogglingStatusPage && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    </div>
                  )}
                  <Switch 
                    disabled={isTogglingStatusPage}
                    checked={statusPageEnabled}
                    onCheckedChange={handleToggleStatusPage}
                    aria-label="Toggle status page visibility"
                  />
                </div>
              </div>
              
              {/* Service visibility stats */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3">
                <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Status Page Services</h4>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center">
                      <Eye className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400 mr-1.5" />
                      <span className="text-xs whitespace-nowrap dark:text-slate-300">
                        <span className="font-medium mr-1">{statusPageData?.services?.filter((s: {name: string, visible: boolean}) => s.visible).length || 0}</span>
                        <span>visible</span>
                      </span>
                    </div>
                    <div className="h-3 border-r border-slate-300 dark:border-slate-700"></div>
                    <div className="flex items-center">
                      <EyeOff className="h-3.5 w-3.5 text-slate-500 dark:text-slate-500 mr-1.5" />
                      <span className="text-xs whitespace-nowrap dark:text-slate-400">
                        <span className="font-medium mr-1">{statusPageData?.services?.filter((s: {name: string, visible: boolean}) => !s.visible).length || 0}</span>
                        <span>hidden</span>
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => handleNavigation("statuspage", "services")}
                    title="Manage Service Visibility"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span className="sr-only">Manage Service Visibility</span>
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="default"
                  className="justify-center h-10"
                  onClick={() => window.open("/", "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Page
                </Button>
                <Button
                  variant="default"
                  size="default"
                  className="justify-center h-10"
                  onClick={() => handleNavigation("statuspage")}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-[140px] items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Disable Public Status Page</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable the public status page? This will make your service status information inaccessible to the public.
            </DialogDescription>
          </DialogHeader>
          <div className="my-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md p-3">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Visibility Impact</p>
                <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                  Users visiting your status page will not be able to see any information about your services.
                  Consider using service visibility settings instead of disabling the entire page.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDisableStatusPage}>
              Disable Status Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}; 