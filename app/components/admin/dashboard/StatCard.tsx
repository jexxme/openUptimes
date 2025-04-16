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
    blue: "text-blue-700 border-blue-200 bg-blue-50",
    green: "text-emerald-700 border-emerald-200 bg-emerald-50",
    red: "text-red-700 border-red-200 bg-red-50",
    purple: "text-purple-700 border-purple-200 bg-purple-50",
    yellow: "text-amber-700 border-amber-200 bg-amber-50",
  };

  return (
    <div className={`flex flex-col rounded-md border p-4 ${colorVariants[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-full bg-white/90">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-medium">{title}</h3>
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            <ArrowUpRight className={`h-3 w-3 mr-0.5 ${!trend.isPositive && 'rotate-180'}`} />
            {Math.abs(trend.value).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-1">
        <span className="text-xl font-bold">{value}</span>
        {description && <div className="text-xs mt-1 leading-tight opacity-80">{description}</div>}
      </div>
    </div>
  );
}; 