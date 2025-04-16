import React, { useState, useRef } from 'react';
import { UptimeBar } from './UptimeBar';

interface ServiceItemProps {
  name: string;
  status: string;
  history: Array<{
    status: string;
    timestamp: number;
  }>;
  uptimePercentage: number;
  description?: string;
}

export function ServiceItem({ 
  name, 
  status, 
  history, 
  uptimePercentage, 
  description 
}: ServiceItemProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLButtonElement>(null);

  // Calculate time range for the uptime bar
  const now = Date.now();
  const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
  
  const handleMouseEnter = () => {
    setTooltipVisible(true);
  };
  
  const handleMouseLeave = () => {
    setTooltipVisible(false);
  };
  
  // Determine status display
  const getStatusDisplay = () => {
    switch(status) {
      case 'up':
        return (
          <div className="flex items-center px-2.5 py-1 rounded-full bg-[#3ba55c]/10 text-[#3ba55c] font-medium">
            <span className="mr-1.5">Operational</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'down':
        return (
          <div className="flex items-center px-2.5 py-1 rounded-full bg-[#ed4245]/10 text-[#ed4245] font-medium">
            <span className="mr-1.5">Outage</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'degraded':
      case 'partial':
        return (
          <div className="flex items-center px-2.5 py-1 rounded-full bg-[#faa61a]/10 text-[#faa61a] font-medium">
            <span className="mr-1.5">Degraded</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
            <span className="mr-1.5">Unknown</span>
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="component-container hover-lift border-t border-gray-200 first:border-t-0 py-7 space-y-5 px-5">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-gray-800 font-semibold text-base tracking-tight">{name}</span>
          {description && (
            <div className="relative">
              <button 
                ref={questionRef}
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full" 
                aria-label="More information"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onFocus={handleMouseEnter}
                onBlur={handleMouseLeave}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
              
              {tooltipVisible && description && (
                <div 
                  ref={tooltipRef}
                  className="absolute z-50 transform -translate-x-1/2 -translate-y-full left-1/2 top-0 mt-[-8px]"
                >
                  <div className="bg-gray-800 text-white text-xs leading-normal px-3 py-2 rounded-md shadow-lg max-w-xs">
                    {description}
                    <div className="tooltip-arrow bg-gray-800 w-2 h-2 rotate-45 absolute -bottom-1 left-1/2 transform -translate-x-1/2"></div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {getStatusDisplay()}
      </div>
      
      <UptimeBar 
        history={history} 
        startTime={ninetyDaysAgo} 
        endTime={now} 
        uptimePercentage={uptimePercentage} 
      />
    </div>
  );
} 