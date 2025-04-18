import React, { useState } from 'react';
import UptimeBarTooltip from './UptimeBarTooltip';

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
  
  // Calculate the number of days in the history period
  const daysDuration = Math.round((endTime - startTime) / (24 * 60 * 60 * 1000));
  
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
    // Calculate the timestamp for this day based on startTime
    const dayStart = startTime + (dayIndex * 24 * 60 * 60 * 1000);
    const dayEnd = dayStart + (24 * 60 * 60 * 1000);
    
    // Calculate the range for this specific day
    const millisPerDay = 24 * 60 * 60 * 1000;
    const dayTimestamp = startTime + (dayIndex * millisPerDay);
    
    // Find entries for this day - explicitly look for entries within the day range
    const dayEntries = sortedHistory.filter(item => 
      item.timestamp >= dayTimestamp && item.timestamp < (dayTimestamp + millisPerDay)
    );
    
    if (dayEntries.length === 0) {
      // Check if this day is in the past (before our history starts)
      const firstHistoryTimestamp = sortedHistory.length > 0 ? sortedHistory[0].timestamp : Date.now();
      
      if (dayEnd < firstHistoryTimestamp) {
        // This day is before our first history entry, so we have no data
        return 'unknown';
      }
      
      // If no entries for this day but the day is in our history range,
      // use the closest previous entry for a more accurate representation
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
  
  // Calculate number of bars to display based on the time range
  // Limit to a reasonable number for UI
  const getOptimalBarCount = () => {
    // For shorter periods, show more detailed view
    if (daysDuration <= 14) return daysDuration; // 1:1 mapping for short periods
    if (daysDuration <= 30) return 30; // For ~month, keep about 1 bar per day
    if (daysDuration <= 90) return 60; // For 3 months, about 2 days per bar
    return 90; // Cap at 90 bars for longer periods
  };
  
  // Generate a dynamic number of bars based on the date range
  const generateBars = () => {
    const totalBars = getOptimalBarCount();
    const barWidth = 3;
    const barSpacing = 2;
    const totalWidth = totalBars * (barWidth + barSpacing) - barSpacing;
    
    // Calculate duration between start and end
    const timeRangeDuration = endTime - startTime;
    
    // Calculate the timestamp for a given bar index
    const getTimestampForBar = (barIndex: number) => {
      return startTime + (barIndex * (timeRangeDuration / totalBars));
    };
    
    // Calculate the day index for a given bar
    const getDayIndexForBar = (barIndex: number) => {
      const timestamp = getTimestampForBar(barIndex);
      return Math.floor((timestamp - startTime) / (24 * 60 * 60 * 1000));
    };
    
    // Generate the SVG rectangles
    const bars = [];
    for (let i = 0; i < totalBars; i++) {
      const dayIndex = getDayIndexForBar(i);
      const status = getDayStatus(dayIndex);
      
      // Determine fill color based on status
      let fillColor = "#6b7280"; // Default gray for unknown
      
      if (status === "up") {
        fillColor = "#3ba55c"; // Green
      } else if (status === "down") {
        fillColor = "#ed4245"; // Red
      } else if (status === "degraded" || status === "partial") {
        fillColor = "#faa61a"; // Yellow
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
          aria-label={`Day ${dayIndex+1}: ${status}`}
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
    
    return { bars, totalWidth, getTimestampForBar };
  };
  
  const { bars, totalWidth, getTimestampForBar } = generateBars();
  
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
        
        {/* Using the Portal-based tooltip component */}
        <UptimeBarTooltip
          visible={hoveredBar !== null}
          position={tooltipPosition}
          date={hoveredBar !== null ? formatDate(getTimestampForBar(hoveredBar)) : ''}
          status={hoveredBar !== null ? getDayStatus(Math.floor((getTimestampForBar(hoveredBar) - startTime) / (24 * 60 * 60 * 1000))) : ''}
          statusColor={hoveredBar !== null ? getStatusColor(getDayStatus(Math.floor((getTimestampForBar(hoveredBar) - startTime) / (24 * 60 * 60 * 1000)))) : ''}
          statusLabel={hoveredBar !== null ? getStatusLabel(getDayStatus(Math.floor((getTimestampForBar(hoveredBar) - startTime) / (24 * 60 * 60 * 1000)))) : ''}
          uptimePercentage={hoveredBar !== null ? getDailyUptimePercentage(Math.floor((getTimestampForBar(hoveredBar) - startTime) / (24 * 60 * 60 * 1000))) : null}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500 mt-2.5 px-1">
        <div className="text-xs font-normal text-gray-500">{daysDuration} days ago</div>
        <div className="text-xs font-medium text-gray-700">{uptimePercentage.toFixed(2)}% uptime</div>
        <div className="text-xs font-normal text-gray-500">Today</div>
      </div>
    </div>
  );
} 