import React, { useState, useRef, useEffect } from 'react';
import { UptimeBar } from './UptimeBar';
import { ExternalLink } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ServiceItemProps {
  name: string;
  status: string;
  history: Array<{
    status: string;
    timestamp: number;
  }>;
  uptimePercentage: number;
  description?: string;
  url?: string;
  showServiceUrls?: boolean;
  showServiceDescription?: boolean;
  historyDays?: number;
  isRefreshing?: boolean;
}

// ServiceItemTooltip component for description tooltip
const ServiceItemTooltip = ({ 
  visible, 
  text, 
  position 
}: { 
  visible: boolean; 
  text: string;
  position: { x: number; y: number; 
}}) => {
  if (!visible) return null;
  
  return createPortal(
    <div 
      className="fixed z-[9999] transform -translate-x-1/2 -translate-y-full shadow-lg"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 10}px`,
        pointerEvents: 'none' 
      }}
    >
      <div className="bg-gray-800 text-white text-xs leading-normal px-3 py-2 rounded-md max-w-xs">
        {text}
        <div className="tooltip-arrow bg-gray-800 w-2 h-2 rotate-45 absolute -bottom-1 left-1/2 transform -translate-x-1/2"></div>
      </div>
    </div>,
    document.body
  );
};

// Status badge tooltip component
const StatusTooltip = ({ 
  visible, 
  position,
  service,
  status,
  uptimePercentage,
  history,
  daysToShow = 30
}: { 
  visible: boolean;
  position: { x: number; y: number };
  service: string;
  status: string;
  uptimePercentage: number;
  history: Array<{ status: string; timestamp: number }>;
  daysToShow?: number;
}) => {
  if (!visible) return null;

  // Calculate date ranges
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000; // milliseconds in a day
  const week = 7 * day;
  const month = 30 * day;

  // Calculate uptime percentages for different time periods
  const calculateUptimeForPeriod = (startTime: number) => {
    const periodHistory = history.filter(item => item.timestamp >= startTime && item.timestamp <= now);
    
    if (periodHistory.length === 0) return null;
    
    let upCount = 0;
    let degradedCount = 0;
    let downCount = 0;
    
    periodHistory.forEach(item => {
      if (item.status === 'up') upCount++;
      else if (item.status === 'degraded' || item.status === 'partial') degradedCount++;
      else if (item.status === 'down') downCount++;
    });
    
    const totalCount = upCount + degradedCount + downCount;
    if (totalCount === 0) return null;
    
    // Weight degraded as 50% uptime
    return ((upCount + (degradedCount * 0.5)) / totalCount) * 100;
  };

  // Get last incident if any (change from up to down/degraded)
  const getLastIncident = () => {
    if (history.length < 2) return null;
    
    let lastIncidentTimestamp = null;
    for (let i = 1; i < history.length; i++) {
      if (
        (history[i].status === 'up') && 
        (history[i-1].status === 'down' || history[i-1].status === 'degraded' || history[i-1].status === 'partial')
      ) {
        lastIncidentTimestamp = history[i-1].timestamp;
        break;
      }
    }
    
    return lastIncidentTimestamp;
  };
  
  const dayUptime = calculateUptimeForPeriod(now - day);
  const weekUptime = calculateUptimeForPeriod(now - week);
  const monthUptime = calculateUptimeForPeriod(now - month);
  const lastIncident = getLastIncident();
  
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((now - timestamp) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
    if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (minutes > 0) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  };
  
  // Format date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Determine status color
  const getStatusColor = () => {
    if (status === 'up' && uptimePercentage >= 99) return 'bg-emerald-500';
    if (status === 'up' && uptimePercentage >= 95) return 'bg-emerald-400';
    if (status === 'degraded' || status === 'partial' || (status === 'up' && uptimePercentage < 95)) return 'bg-yellow-400';
    if (status === 'down') return 'bg-red-500';
    return 'bg-gray-400';
  };
  
  return createPortal(
    <div 
      className="fixed z-[9999] transform -translate-x-1/2 -translate-y-full shadow-lg"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 10}px`,
        pointerEvents: 'none' 
      }}
    >
      <div className="bg-gray-800 text-white text-xs leading-normal px-4 py-3 rounded-md min-w-[220px]">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="font-medium text-sm">{service} Status</span>
        </div>
        
        <div className="space-y-2 mb-3">
          <div className="grid grid-cols-2 gap-x-2">
            <div className="text-gray-300">Current uptime:</div>
            <div className="font-medium text-right">{uptimePercentage.toFixed(2)}%</div>
          </div>
          
          {dayUptime !== null && (
            <div className="grid grid-cols-2 gap-x-2">
              <div className="text-gray-300">Last 24 hours:</div>
              <div className="font-medium text-right">{dayUptime.toFixed(2)}%</div>
            </div>
          )}
          
          {weekUptime !== null && (
            <div className="grid grid-cols-2 gap-x-2">
              <div className="text-gray-300">Last 7 days:</div>
              <div className="font-medium text-right">{weekUptime.toFixed(2)}%</div>
            </div>
          )}
          
          {monthUptime !== null && (
            <div className="grid grid-cols-2 gap-x-2">
              <div className="text-gray-300">Last 30 days:</div>
              <div className="font-medium text-right">{monthUptime.toFixed(2)}%</div>
            </div>
          )}
        </div>
        
        {lastIncident && (
          <div className="text-[10px] pt-2 border-t border-gray-700 text-gray-400 mt-1">
            Last incident: {formatDate(lastIncident)} ({formatTimeAgo(lastIncident)})
          </div>
        )}
        
        <div 
          className="w-0 h-0 absolute -bottom-2 left-1/2 transform -translate-x-1/2" 
          style={{ 
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderTop: '8px solid rgb(31, 41, 55)' // Same as bg-gray-800
          }}
        ></div>
      </div>
    </div>,
    document.body
  );
};

// Helper to get status display based on status and uptime percentage
const getStatusDisplay = (status: string, uptimePercentage: number) => {
  // Calculate status color with more granularity
  const getStatusColor = () => {
    if (status === 'up' && uptimePercentage >= 99.5) {
      return { bg: 'bg-[#3ba55c]/10', text: 'text-[#3ba55c]' };
    }
    if (status === 'up' && uptimePercentage >= 95) {
      return { bg: 'bg-[#3ba55c]/10', text: 'text-[#3ba55c]' };
    }
    if (status === 'degraded' || status === 'partial' || (status === 'up' && uptimePercentage < 95)) {
      return { bg: 'bg-[#faa61a]/10', text: 'text-[#faa61a]' };
    }
    if (status === 'down') {
      return { bg: 'bg-[#ed4245]/10', text: 'text-[#ed4245]' };
    }
    return { bg: 'bg-gray-100', text: 'text-gray-500' };
  };

  const { bg, text } = getStatusColor();

  // Display label based on status and uptime
  const getLabel = () => {
    if (status === 'up' && uptimePercentage >= 99.5) return 'Operational';
    if (status === 'up' && uptimePercentage >= 95) return 'Mostly Operational';
    if (status === 'degraded' || status === 'partial') return 'Degraded';
    if (status === 'up' && uptimePercentage < 95) return 'Partially Degraded';
    if (status === 'down') return 'Outage';
    return 'Unknown';
  };

  const label = getLabel();

  // Choose icon based on status
  const getIcon = () => {
    if (status === 'up' && uptimePercentage >= 95) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    if (status === 'degraded' || status === 'partial' || (status === 'up' && uptimePercentage < 95)) {
      return (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    if (status === 'down') {
      return (
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    );
  };

  return (
    <div className={`flex items-center px-2.5 py-1 rounded-full ${bg} ${text} font-medium cursor-help`}>
      <span className="mr-1.5">{label}</span>
      {getIcon()}
    </div>
  );
};

export function ServiceItem({ 
  name, 
  status, 
  history, 
  uptimePercentage, 
  description,
  url,
  showServiceUrls = true,
  showServiceDescription = true,
  historyDays = 90,
  isRefreshing = false
}: ServiceItemProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const questionRef = useRef<HTMLButtonElement>(null);
  
  // Status badge tooltip state
  const [statusTooltipVisible, setStatusTooltipVisible] = useState(false);
  const [statusTooltipPosition, setStatusTooltipPosition] = useState({ x: 0, y: 0 });
  const statusBadgeRef = useRef<HTMLDivElement>(null);

  // Calculate time range for the uptime bar based on the provided historyDays
  const now = Date.now();
  const historyStartTime = now - (historyDays * 24 * 60 * 60 * 1000);
  
  // Debug log to verify historyDays is being applied
  useEffect(() => {
    console.log(`ServiceItem ${name} using historyDays: ${historyDays}`);
  }, [name, historyDays]);
  
  const handleMouseEnter = () => {
    if (questionRef.current) {
      const rect = questionRef.current.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
    setTooltipVisible(true);
  };
  
  const handleMouseLeave = () => {
    setTooltipVisible(false);
  };
  
  // Status badge tooltip handlers
  const handleStatusMouseEnter = () => {
    if (statusBadgeRef.current) {
      const rect = statusBadgeRef.current.getBoundingClientRect();
      setStatusTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top
      });
    }
    setStatusTooltipVisible(true);
  };
  
  const handleStatusMouseLeave = () => {
    setStatusTooltipVisible(false);
  };

  // Determine if we need to use a stacked layout or a single row layout
  const shouldUseStackedLayout = showServiceUrls && url;

  return (
    <div className={`component-container hover-lift border-t border-gray-200 first:border-t-0 py-7 space-y-4 px-5 ${isRefreshing ? 'opacity-60 transition-opacity duration-300' : ''}`}>
      <div className={`flex ${shouldUseStackedLayout ? 'flex-col' : ''}`}>
        <div className="flex justify-between items-center w-full">
          {shouldUseStackedLayout ? (
            <div className="flex flex-col">
              <div className="flex items-center">
                <span className="text-gray-800 font-semibold text-base tracking-tight">{name}</span>
                {showServiceDescription && description && (
                  <div className="relative ml-2 inline-flex items-center">
                    <button 
                      ref={questionRef}
                      className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full flex items-center justify-center cursor-help" 
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
                  </div>
                )}
              </div>
              
              <div className="mt-0">
                <a 
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 inline-flex items-center text-sm w-fit"
                  title={`Visit ${name}`}
                >
                  <span className="truncate underline">{url.replace(/^https?:\/\//, '')}</span>
                  <ExternalLink size={14} className="ml-1 flex-shrink-0" />
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center">
              <span className="text-gray-800 font-semibold text-base tracking-tight">{name}</span>
              {showServiceDescription && description && (
                <div className="relative ml-2 inline-flex items-center">
                  <button 
                    ref={questionRef}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full flex items-center justify-center cursor-help" 
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
                </div>
              )}
            </div>
          )}
          <div 
            ref={statusBadgeRef}
            onMouseEnter={handleStatusMouseEnter}
            onMouseLeave={handleStatusMouseLeave}
          >
            {getStatusDisplay(status, uptimePercentage)}
          </div>
        </div>
      </div>
      
      <UptimeBar 
        history={history} 
        startTime={historyStartTime} 
        endTime={now} 
        uptimePercentage={uptimePercentage}
        isRefreshing={isRefreshing}
      />
      
      {/* Use our portal-based tooltip for the description */}
      {showServiceDescription && description && (
        <ServiceItemTooltip
          visible={tooltipVisible}
          text={description}
          position={tooltipPosition}
        />
      )}
      
      {/* Status badge tooltip */}
      <StatusTooltip
        visible={statusTooltipVisible}
        position={statusTooltipPosition}
        service={name}
        status={status}
        uptimePercentage={uptimePercentage}
        history={history}
      />
    </div>
  );
} 