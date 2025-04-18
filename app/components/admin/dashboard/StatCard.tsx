"use client";

import { ArrowUpRight } from "lucide-react";
import React from "react";

type StatCardColor = "blue" | "green" | "red" | "purple" | "yellow";

interface StatCardProps { 
  title: string; 
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  color?: StatCardColor;
}

export const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  color = "blue"
}: StatCardProps) => {
  const colorVariants = {
    blue: "text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30",
    green: "text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/30",
    red: "text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30",
    purple: "text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/30",
    yellow: "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30",
  };

  return (
    <div className={`flex flex-col rounded-md border p-4 transition-colors ${colorVariants[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-full bg-white/90 dark:bg-gray-900/80">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-medium dark:text-gray-200">{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            <ArrowUpRight className={`h-3 w-3 mr-0.5 ${!trend.isPositive && 'rotate-180'}`} />
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-1">
        <span className="text-xl font-bold dark:text-white">{value}</span>
        {description && <div className="text-xs mt-1 leading-tight opacity-80 dark:text-gray-400">{description}</div>}
      </div>
    </div>
  );
}; 