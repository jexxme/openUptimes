"use client";

import * as React from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApplicationTabProps {
  value: string;
  icon?: React.ReactNode;
  label: string;
  hasChanges?: boolean;
}

interface ApplicationTabsProps {
  tabs: ApplicationTabProps[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  variant?: "default" | "outline";
  spacing?: "default" | "wide" | "equal";
}

export function ApplicationTabs({
  tabs,
  value,
  onValueChange,
  className = "mb-6",
  variant = "default",
  spacing = "equal"
}: ApplicationTabsProps) {
  const tabsListClass = cn("mb-6", className);
  
  const getTabTriggerClass = (tabValue: string) => {
    const baseClass = "items-center gap-3";
    
    const spacingClass = spacing === "wide" 
      ? "px-6" 
      : spacing === "equal" 
        ? ""
        : ""; 
    
    const activeClass = value === tabValue 
      ? "text-foreground font-medium" 
      : "text-muted-foreground hover:text-foreground";
    
    return cn(baseClass, spacingClass, activeClass);
  };
  
  const indicatorClasses = {
    outer: "absolute inline-flex h-full w-full rounded-full bg-amber-400 dark:bg-amber-500/70 opacity-75",
    inner: "relative inline-flex rounded-full h-2 w-2 bg-amber-500 dark:bg-amber-400"
  };

  return (
    <TabsList className={tabsListClass}>
      {tabs.map((tab) => (
        <TabsTrigger
          key={tab.value}
          value={tab.value}
          onClick={() => onValueChange(tab.value)}
          className={getTabTriggerClass(tab.value)}
        >
          {tab.icon && (
            <span className={cn(
              "transition-opacity",
              value === tab.value ? "opacity-100" : "opacity-70"
            )}>
              {tab.icon}
            </span>
          )}
          <span>{tab.label}</span>
          {tab.hasChanges && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className={indicatorClasses.outer}></span>
              <span className={indicatorClasses.inner}></span>
            </span>
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
} 