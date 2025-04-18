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
  
  // Get status label for tooltip based on uptime percentage
  const getStatusLabel = (uptimePercentage: number | null) => {
    if (uptimePercentage === null) return 'No Data';
    if (uptimePercentage === 100) return 'Operational';
    if (uptimePercentage === 0) return 'Complete Outage';
    if (uptimePercentage < 30) return 'Major Outage';
    if (uptimePercentage < 70) return 'Partial Outage';
    if (uptimePercentage < 100) return 'Minor Issues';
    return 'Unknown';
  };

  // Get gradient color based on uptime percentage
  const getStatusColor = (uptimePercentage: number | null) => {
    if (uptimePercentage === null) return '#6b7280'; // Gray for no data
    
    if (uptimePercentage === 100) return '#3ba55c'; // Green for 100%
    if (uptimePercentage === 0) return '#ed4245';   // Red for 0%
    
    // Define color stops for our gradient
    const colorStops = [
      { percent: 0, color: [237, 66, 69] },    // #ed4245 (red)
      { percent: 30, color: [250, 166, 26] },  // #faa61a (orange)
      { percent: 70, color: [253, 224, 71] },  // #fde047 (yellow)
      { percent: 100, color: [59, 165, 92] }   // #3ba55c (green)
    ];
    
    // Find the two color stops that our percentage falls between
    let lower = colorStops[0];
    let upper = colorStops[colorStops.length - 1];
    
    for (let i = 0; i < colorStops.length - 1; i++) {
      if (uptimePercentage >= colorStops[i].percent && uptimePercentage <= colorStops[i+1].percent) {
        lower = colorStops[i];
        upper = colorStops[i+1];
        break;
      }
    }
    
    // Calculate the interpolation factor between the two color stops
    const range = upper.percent - lower.percent;
    const factor = range !== 0 ? (uptimePercentage - lower.percent) / range : 0;
    
    // Interpolate between the two colors
    const r = Math.round(lower.color[0] + factor * (upper.color[0] - lower.color[0]));
    const g = Math.round(lower.color[1] + factor * (upper.color[1] - lower.color[1]));
    const b = Math.round(lower.color[2] + factor * (upper.color[2] - lower.color[2]));
    
    return `rgb(${r}, ${g}, ${b})`;
  };
  
  // Calculate daily uptime percentage based on events within that day
  const calculateDailyUptimePercentage = (dayStart: number, dayEnd: number) => {
    // Get events that occurred during this day
    const dayEvents = sortedHistory.filter(event => 
      event.timestamp >= dayStart && event.timestamp < dayEnd
    );
    
    if (dayEvents.length === 0) {
      // Check if this day is in the past (before our history starts)
      const firstHistoryTimestamp = sortedHistory.length > 0 ? sortedHistory[0].timestamp : Date.now();
      
      if (dayEnd < firstHistoryTimestamp) {
        // This day is before our first history entry, so we have no data
        return null;
      }
      
      // If no entries for this day but the day is in our history range,
      // use the closest previous entry for a more accurate representation
      const previousEntries = sortedHistory.filter(item => item.timestamp < dayStart);
      if (previousEntries.length === 0) return null;
      
      const lastStatus = previousEntries[previousEntries.length - 1].status;
      return lastStatus === 'up' ? 100 : lastStatus === 'down' ? 0 : lastStatus === 'degraded' || lastStatus === 'partial' ? 50 : null;
    }
    
    // Count statuses for events during this day
    let upCount = 0;
    let degradedCount = 0;
    let downCount = 0;
    
    dayEvents.forEach(event => {
      if (event.status === 'up') upCount++;
      else if (event.status === 'degraded' || event.status === 'partial') degradedCount++;
      else if (event.status === 'down') downCount++;
    });
    
    const totalEvents = upCount + degradedCount + downCount;
    if (totalEvents === 0) return null;
    
    // Weight degraded as 50% uptime
    return (upCount + (degradedCount * 0.5)) / totalEvents * 100;
  };
  
  // Calculate optimal number of bars to display
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
    
    // Generate the SVG rectangles
    const bars = [];
    for (let i = 0; i < totalBars; i++) {
      // Calculate time range for this bar
      const barStartTime = getTimestampForBar(i);
      const barEndTime = i < totalBars - 1 ? getTimestampForBar(i + 1) : endTime;
      
      // Calculate uptime percentage for this time period
      const barUptimePercentage = calculateDailyUptimePercentage(barStartTime, barEndTime);
      
      // Determine fill color based on uptime percentage
      const fillColor = getStatusColor(barUptimePercentage);
      
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
          aria-label={`${formatDate(barStartTime)}: ${barUptimePercentage !== null ? `${barUptimePercentage.toFixed(0)}% uptime` : 'No data'}`}
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
    
    return { bars, totalWidth, getTimestampForBar, calculateUptimeForBar: (barIndex: number) => {
      const barStartTime = getTimestampForBar(barIndex);
      const barEndTime = barIndex < totalBars - 1 ? getTimestampForBar(barIndex + 1) : endTime;
      return calculateDailyUptimePercentage(barStartTime, barEndTime);
    }};
  };
  
  const { bars, totalWidth, getTimestampForBar, calculateUptimeForBar } = generateBars();
  
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
          status={hoveredBar !== null ? '' : ''}
          statusColor={hoveredBar !== null ? getStatusColor(calculateUptimeForBar(hoveredBar)) : ''}
          statusLabel={hoveredBar !== null ? getStatusLabel(calculateUptimeForBar(hoveredBar)) : ''}
          uptimePercentage={hoveredBar !== null ? calculateUptimeForBar(hoveredBar) : null}
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