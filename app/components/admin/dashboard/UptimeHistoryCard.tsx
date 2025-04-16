"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity } from "lucide-react";
import { useState, useEffect } from "react";

interface UptimeHistoryCardProps {
  historyData: { service: string; item: any }[] | undefined;
  uptimePercentage: number;
  historyStats: {
    totalEvents: number;
    outages: number;
    recoveries: number;
    averageResponseTime: number;
    responseTimeData: number[];
    lastDowntime: number | null;
    uptimePercentage: number;
    lastIncident: { service: string, timestamp: number } | null;
    uptime24h: number;
    uptimeWeek: number;
    mostReliableService: string;
    mostProblematicService: string;
    incidentsByService: Record<string, number>;
  };
  handleNavigation: (tab: string, section?: string) => void;
  className?: string;
}

export const UptimeHistoryCard = ({
  historyData,
  uptimePercentage,
  historyStats,
  handleNavigation,
  className = ""
}: UptimeHistoryCardProps) => {
  
  // Helper to render sparkline
  const renderSparkline = (data: number[], height = 30, width = 100) => {
    if (!data || data.length < 2) return null;
    
    // Normalize data for visualization
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');
    
    return (
      <svg width={width} height={height} className="ml-auto">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-blue-500"
        />
      </svg>
    );
  };

  return (
    <Card className={`overflow-hidden border col-span-6 lg:col-span-4 ${className}`}>
      <CardHeader className="border-b pb-2 pt-3 px-4 h-[72px] flex items-center">
        <div className="flex items-center justify-between w-full">
          <CardTitle className="text-base font-semibold">Uptime History</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 cursor-help">
                  <Activity className="h-3 w-3" />
                  <span>{uptimePercentage}% uptime</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Current overall system availability</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {historyData ? (
          <div>
            {/* Stats grid - 3-column compact layout without visual dividers */}
            <div className="grid grid-cols-3 border-b py-2 px-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 text-center cursor-help">
                      <div className="text-lg font-bold text-emerald-700">{historyStats.uptimePercentage}%</div>
                      <div className="text-xs text-muted-foreground">Uptime</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Percentage of time all services were operational</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 text-center cursor-help">
                      <div className="text-lg font-bold text-blue-700">{historyStats.averageResponseTime}</div>
                      <div className="text-xs text-muted-foreground">Avg ms</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Average response time in milliseconds</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 text-center cursor-help">
                      <div className="text-lg font-bold text-red-700">{historyStats.outages}</div>
                      <div className="text-xs text-muted-foreground">Incidents</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Total number of downtime incidents detected</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Compact content area */}
            <div className="px-4 py-3">
              {/* Response time trend - streamlined */}
              {historyStats.responseTimeData.length > 0 ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="w-full">
                      <div className="flex flex-col items-center w-full mb-3">
                        <div className="w-full flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-slate-700">Response Time Trend</span>
                          <span className="text-xs text-slate-500">{historyStats.averageResponseTime} ms avg</span>
                        </div>
                        {renderSparkline(historyStats.responseTimeData, 40, 240)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="w-48">
                      <p className="text-xs">Response time trend over the last {historyStats.responseTimeData.length} checks</p>
                      <p className="text-xs mt-1">
                        <span className="font-medium">Min:</span> {Math.min(...historyStats.responseTimeData)}ms
                        <span className="font-medium ml-3">Max:</span> {Math.max(...historyStats.responseTimeData)}ms
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="flex flex-col items-center justify-center h-10 bg-slate-50 rounded-md p-2 mb-3">
                  <div className="text-xs text-slate-500">No response time data available</div>
                </div>
              )}
              
              {/* Uptime period stats - more compact */}
              <div className="bg-slate-50 rounded-md p-3">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-medium text-slate-700">Uptime Periods</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => handleNavigation("history")}
                  >
                    View History
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-1.5">24h</span>
                    <div className="w-24 h-1.5 bg-muted rounded-full mr-1.5 overflow-hidden flex-1">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${historyStats.uptime24h}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{historyStats.uptime24h}%</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-xs text-muted-foreground mr-1.5">7d</span>
                    <div className="w-24 h-1.5 bg-muted rounded-full mr-1.5 overflow-hidden flex-1">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${historyStats.uptimeWeek}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium">{historyStats.uptimeWeek}%</span>
                  </div>
                </div>
              </div>
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