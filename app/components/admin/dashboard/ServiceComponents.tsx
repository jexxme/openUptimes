"use client";

import React from "react";

// Status indicator dot with animation for up status
export const StatusDot = ({ status }: { status: string }) => {
  const statusColor = 
    status === "up" ? "bg-emerald-500" : 
    status === "down" ? "bg-red-500" : 
    "bg-slate-300";
  
  return (
    <div className="relative flex items-center justify-center w-2.5 h-2.5">
      <div className={`w-2.5 h-2.5 rounded-full ${statusColor}`}>
        {status === "up" && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-75 animate-ping"></span>
            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse"></span>
          </>
        )}
      </div>
    </div>
  );
};

// Service status item component used in dashboard and other lists
export const ServiceStatusItem = ({ service }: { service: any }) => {
  const status = service.currentStatus?.status || "unknown";
  
  return (
    <div className="flex items-center justify-between py-2 px-3 hover:bg-slate-50 transition-colors duration-150">
      <div className="flex items-center space-x-2 flex-1 min-w-0">
        <StatusDot status={status} />
        <span className="font-medium text-sm truncate">{service.name}</span>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0">
        {service.currentStatus?.responseTime && (
          <span className="text-xs text-slate-500">{service.currentStatus.responseTime}ms</span>
        )}
        <div className={`text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[60px] text-center
          ${status === "up" ? "bg-emerald-100 text-emerald-700" : 
            status === "down" ? "bg-red-100 text-red-700" : 
            "bg-slate-100 text-slate-700"}
        `}>
          {status === "up" ? "Online" : status === "down" ? "Offline" : "Unknown"}
        </div>
      </div>
    </div>
  );
}; 