import React, { useState } from 'react';

interface UptimeBarProps {
  history: Array<{
    status: string;
    timestamp: number;
  }>;
  startTime: number;
  endTime: number;
  uptimePercentage: number;
}

export function UptimeBar({ history, startTime, endTime, uptimePercentage }: UptimeBarProps) {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Sort history by timestamp (oldest first)
  const sortedHistory = [...history].sort((a, b) => a.timestamp - b.timestamp);
  
  // Format date for tooltip
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Get status label for tooltip
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'up': return 'Operational';
      case 'down': return 'Outage';
      case 'degraded': case 'partial': return 'Degraded';
      default: return 'Unknown';
    }
  };

  // Get status color for tooltip indicator
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'up': return '#3ba55c';
      case 'down': return '#ed4245';
      case 'degraded': case 'partial': return '#faa61a';
      default: return '#6b7280';
    }
  };
  
  // Calculate uptime percentage for a specific day
  const getDailyUptimePercentage = (dayIndex: number) => {
    // For this simplified version, we'll just use the status of that day
    // In a real app, you might have multiple readings per day and calculate an actual percentage
    const status = getDayStatus(dayIndex);
    
    switch(status) {
      case 'up': return 100;
      case 'down': return 0;
      case 'degraded': case 'partial': return 80;
      default: return null; // Unknown/no data
    }
  };
  
  // Get day status by index
  const getDayStatus = (dayIndex: number) => {
    const dayTimestamp = startTime + (dayIndex * 24 * 60 * 60 * 1000);
    const dayEnd = dayTimestamp + (24 * 60 * 60 * 1000);
    
    // Find entries for this day
    const dayEntries = sortedHistory.filter(item => 
      item.timestamp >= dayTimestamp && item.timestamp < dayEnd
    );
    
    if (dayEntries.length === 0) {
      // If no entries for this day, use the closest previous entry
      const previousEntries = sortedHistory.filter(item => item.timestamp < dayTimestamp);
      return previousEntries.length > 0 
        ? previousEntries[previousEntries.length - 1].status 
        : 'unknown';
    }
    
    // If we have entries for this day, check if any are down
    if (dayEntries.some(entry => entry.status === 'down')) return 'down';
    // Then check if any are degraded
    if (dayEntries.some(entry => entry.status === 'degraded' || entry.status === 'partial')) return 'degraded';
    // If all are up
    if (dayEntries.every(entry => entry.status === 'up')) return 'up';
    // Default
    return 'unknown';
  };
  
  // Generate a fixed number of bars (90) for the 90-day timeline
  const generateBars = () => {
    const bars = [];
    const totalBars = 90;
    const barWidth = 3;
    const barSpacing = 2;
    const totalWidth = totalBars * (barWidth + barSpacing) - barSpacing;
    
    // Create mapping of timestamps to statuses for efficient lookup
    const statusMap = new Map();
    for (let i = 0; i < totalBars; i++) {
      statusMap.set(i, getDayStatus(i));
    }
    
    // Calculate the timestamp for a given day index
    const getTimestampForDay = (dayIndex: number) => {
      return startTime + (dayIndex * 24 * 60 * 60 * 1000);
    };
    
    // Generate the SVG rectangles
    for (let i = 0; i < totalBars; i++) {
      const status = statusMap.get(i);
      
      // Determine fill color based on status
      let fillColor = "#6b7280"; // Default gray for unknown
      
      if (status === "up") {
        fillColor = "#3ba55c"; // Discord green
      } else if (status === "down") {
        fillColor = "#ed4245"; // Discord red
      } else if (status === "degraded" || status === "partial") {
        fillColor = "#faa61a"; // Discord yellow
      }
      
      const xPosition = i * (barWidth + barSpacing);
      
      bars.push(
        <rect 
          key={i}
          height="32" 
          width={barWidth} 
          x={xPosition} 
          y="0" 
          rx="1"
          fill={fillColor}
          role="tab"
          className="uptime-day"
          data-html="true"
          tabIndex={i === 0 ? 0 : -1}
          aria-label={`Day ${i+1}: ${status}`}
          onMouseEnter={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltipPosition({ 
              x: rect.left + rect.width / 2, 
              y: rect.top 
            });
            setHoveredBar(i);
          }}
          onMouseLeave={() => setHoveredBar(null)}
        />
      );
    }
    
    return { bars, totalWidth, getTimestampForDay };
  };
  
  const { bars, totalWidth, getTimestampForDay } = generateBars();
  
  return (
    <div className="w-full">
      <div className="rounded-md overflow-hidden bg-white p-2.5 border border-gray-200 shadow-sm relative">
        <svg 
          className="w-full" 
          preserveAspectRatio="none" 
          height="32" 
          viewBox={`0 0 ${totalWidth} 32`}
        >
          {bars}
        </svg>
        
        {hoveredBar !== null && (
          <div 
            className="absolute z-10 bg-gray-800 text-white text-xs rounded-md py-2 px-3 leading-normal shadow-lg transform -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ 
              left: `${tooltipPosition.x}px`, 
              top: `${tooltipPosition.y - 10}px`,
              position: 'fixed'
            }}
          >
            <div className="font-medium">
              {formatDate(getTimestampForDay(hoveredBar))}
            </div>
            
            <div className="flex items-center mt-1.5 mb-0.5">
              <span 
                className="inline-block w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: getStatusColor(getDayStatus(hoveredBar)) }}
              ></span>
              <span>{getStatusLabel(getDayStatus(hoveredBar))}</span>
            </div>
            
            {getDailyUptimePercentage(hoveredBar) !== null && (
              <div className="text-gray-300 text-[10px] font-medium mt-0.5">
                {getDailyUptimePercentage(hoveredBar)}% UPTIME
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
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2.5 px-1">
        <div className="text-xs font-normal text-gray-500">90 days ago</div>
        <div className="text-xs font-medium text-gray-700">{uptimePercentage.toFixed(2)}% uptime</div>
        <div className="text-xs font-normal text-gray-500">Today</div>
      </div>
    </div>
  );
} 