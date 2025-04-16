"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/app/components/ui/switch";
import { ExternalLink, Settings, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface StatusPageCardProps {
  statusPageData: any;
  statusPageEnabled: boolean;
  isTogglingStatusPage: boolean;
  handleStatusPageToggle: (enabled: boolean) => void;
  handleNavigation: (tab: string, section?: string) => void;
}

export const StatusPageCard = ({
  statusPageData,
  statusPageEnabled,
  isTogglingStatusPage,
  handleStatusPageToggle,
  handleNavigation
}: StatusPageCardProps) => {
  return (
    <Card className="overflow-hidden border col-span-6 lg:col-span-3">
      <CardHeader className="border-b pb-2 pt-3 px-4 h-[72px] flex items-center">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-base font-semibold">Status Page</CardTitle>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusPageEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${statusPageEnabled ? 'bg-green-500' : 'bg-slate-400'}`}></div>
            {statusPageEnabled ? 'Active' : 'Disabled'}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {statusPageData ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-slate-700">Public Access</h3>
                <p className="text-xs text-slate-500 mt-1">{statusPageData?.settings?.title || "Service Status"}</p>
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
                  onCheckedChange={handleStatusPageToggle}
                  aria-label="Toggle status page visibility"
                />
              </div>
            </div>
            
            {/* Service visibility stats */}
            <div className="bg-slate-50 rounded-md p-3 mt-4">
              <h4 className="text-xs font-medium text-slate-700 mb-2">Status Page Services</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center">
                    <Eye className="h-3.5 w-3.5 text-slate-600 mr-1.5" />
                    <span className="text-xs whitespace-nowrap">
                      <span className="font-medium mr-1">{statusPageData?.services?.filter((s: {name: string, visible: boolean}) => s.visible).length || 0}</span>
                      <span>visible</span>
                    </span>
                  </div>
                  <div className="h-3 border-r border-slate-300"></div>
                  <div className="flex items-center">
                    <EyeOff className="h-3.5 w-3.5 text-slate-500 mr-1.5" />
                    <span className="text-xs whitespace-nowrap">
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
            
            <div className="grid grid-cols-2 gap-3 mt-4">
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
  );
}; 