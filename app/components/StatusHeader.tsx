import React, { useState } from 'react';
import Link from 'next/link';

interface StatusHeaderProps {
  title?: string;
  description?: string;
  services: {
    name: string;
    status: string;
  }[];
  lastUpdated: string;
  onRefresh: () => void;
}

export function StatusHeader({ 
  title, 
  description, 
  services,
  lastUpdated,
  onRefresh 
}: StatusHeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const allOperational = services.every(service => service.status === 'up');
  const hasOutage = services.some(service => service.status === 'down');
  
  const statusMessage = allOperational 
    ? 'All systems operational' 
    : hasOutage 
      ? 'System disruption detected' 
      : 'Some systems degraded';

  const statusColor = allOperational 
    ? '#3ba55c' 
    : hasOutage 
      ? '#ed4245' 
      : '#faa61a';

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="mb-8">
      <div className="flex flex-col items-center text-center space-y-3 mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title || 'System Status'}</h1>
        {description && (
          <p className="text-gray-500 max-w-md">
            {description}
          </p>
        )}
      </div>
      
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-8">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
          <div className="flex items-center">
            <div 
              className={`w-2.5 h-2.5 rounded-full mr-2 ${allOperational ? 'animate-pulse' : ''}`}
              style={{ backgroundColor: statusColor }}
            ></div>
            <span className="text-gray-800 font-medium">{statusMessage}</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-gray-500 text-sm">
              Last updated at {lastUpdated}
            </span>
            <button 
              onClick={handleRefresh}
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded p-1"
              aria-label="Refresh status"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 