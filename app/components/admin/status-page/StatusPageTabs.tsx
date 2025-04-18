"use client";

import { TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Globe, Layout, Palette, Sliders } from "lucide-react";

interface StatusPageTabsProps {
  currentTab: string;
  hasGeneralTabChanges: boolean;
  hasServicesTabChanges: boolean;
  hasAppearanceTabChanges: boolean;
  hasAdvancedTabChanges: boolean;
}

export function StatusPageTabs({
  currentTab,
  hasGeneralTabChanges,
  hasServicesTabChanges,
  hasAppearanceTabChanges,
  hasAdvancedTabChanges
}: StatusPageTabsProps) {
  return (
    <TabsList className="mb-6">
      <TabsTrigger value="general" className="flex items-center gap-2">
        <Globe className="h-4 w-4" />
        <span>General</span>
        {hasGeneralTabChanges && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="services" className="flex items-center gap-2">
        <Layout className="h-4 w-4" />
        <span>Services</span>
        {hasServicesTabChanges && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="appearance" className="flex items-center gap-2">
        <Palette className="h-4 w-4" />
        <span>Appearance</span>
        {hasAppearanceTabChanges && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </TabsTrigger>
      <TabsTrigger value="advanced" className="flex items-center gap-2">
        <Sliders className="h-4 w-4" />
        <span>Advanced</span>
        {hasAdvancedTabChanges && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </TabsTrigger>
    </TabsList>
  );
} 