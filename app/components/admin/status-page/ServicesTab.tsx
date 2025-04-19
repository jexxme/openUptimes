"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { EyeOff, Layout } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface ServicesTabProps {
  serviceVisibility: {name: string, visible: boolean}[];
  statusPageEnabledUI: boolean | null;
  isLoading: boolean;
  isSaving: boolean;
  onToggleVisibility: (name: string) => void;
  onSave: () => void;
}

export function ServicesTab({
  serviceVisibility,
  statusPageEnabledUI,
  isLoading,
  isSaving,
  onToggleVisibility,
  onSave
}: ServicesTabProps) {
  if (isLoading) {
    return (
      <div className="py-8 flex justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted-foreground">
        Configure which services are visible on the public status page
      </p>
      
      <div className="space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Layout className="h-4 w-4 text-muted-foreground" />
            <span>Services Visibility</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select which services should be visible on the public status page
          </p>
          
          {serviceVisibility.length === 0 ? (
            <div className="text-center py-8">
              <EyeOff className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-20" />
              <p className="text-sm text-muted-foreground">No services configured.</p>
              <p className="text-sm text-muted-foreground">Add services from the Services tab first.</p>
            </div>
          ) : (
            <div className="space-y-1 mt-2 w-full">
              {serviceVisibility.map((service) => (
                <div key={service.name} className="flex items-center justify-between p-3 border rounded-md bg-background">
                  <span className="font-medium">{service.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground mr-2">
                      {service.visible ? 'Visible' : 'Hidden'}
                    </span>
                    <Switch 
                      id={`service-${service.name}`}
                      checked={service.visible}
                      onCheckedChange={() => onToggleVisibility(service.name)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <Button 
            onClick={onSave} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? 
              <><div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent"></div>Saving...</> : 
              "Save Changes"}
          </Button>
        </div>
      </div>
    </>
  );
} 