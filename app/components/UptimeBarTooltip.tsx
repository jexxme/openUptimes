import React from 'react';
import { createPortal } from 'react-dom';

interface UptimeBarTooltipProps {
  visible: boolean;
  position: { x: number; y: number };
  date: string;
  status: string;
  statusColor: string;
  statusLabel: string;
  uptimePercentage: number | null;
}

export default function UptimeBarTooltip({
  visible,
  position,
  date,
  status,
  statusColor,
  statusLabel,
  uptimePercentage
}: UptimeBarTooltipProps) {
  // Use React Portal to render tooltip directly to body
  // This prevents it from affecting parent container layout
  
  if (!visible) return null;
  
  const getStyleForStatus = (status: string) => {
    switch(status) {
      case 'up': return '#3ba55c'; // Green
      case 'down': return '#ed4245'; // Red
      case 'degraded': case 'partial': return '#faa61a'; // Yellow
      default: return '#6b7280'; // Gray
    }
  };
  
  return createPortal(
    <div 
      className="fixed z-[9999] bg-gray-800 dark:bg-gray-900 text-white text-xs rounded-md py-2 px-3 leading-normal shadow-lg transform -translate-x-1/2 -translate-y-full pointer-events-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 10}px`,
        minWidth: '120px'
      }}
    >
      <div className="font-medium">
        {date}
      </div>
      
      <div className="flex items-center mt-1.5 mb-0.5">
        <span 
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: statusColor || getStyleForStatus(status) }}
        ></span>
        <span>{statusLabel}</span>
      </div>
      
      {uptimePercentage !== null ? (
        <>
          <div className="mt-2 mb-1 bg-gray-700 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="h-full rounded-full" 
              style={{ 
                width: `${uptimePercentage}%`,
                backgroundColor: statusColor || getStyleForStatus(status)
              }}
            ></div>
          </div>
          <div className="text-gray-300 text-[10px] font-medium">
            {uptimePercentage.toFixed(1)}% UPTIME
          </div>
        </>
      ) : (
        <div className="text-gray-300 text-[10px] font-medium mt-0.5">
          NO DATA AVAILABLE
        </div>
      )}
      
      <div 
        className="w-0 h-0 absolute -bottom-2 left-1/2 transform -translate-x-1/2" 
        style={{ 
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '8px solid rgb(31, 41, 55)', // Same as bg-gray-800
          borderTopColor: 'var(--tooltip-bg-color, rgb(31, 41, 55))'
        }}
      ></div>
      
      <style jsx>{`
        :global(.dark) {
          --tooltip-bg-color: rgb(17, 24, 39); /* dark:bg-gray-900 */
        }
        :global(.light) {
          --tooltip-bg-color: rgb(31, 41, 55); /* bg-gray-800 */
        }
      `}</style>
    </div>,
    document.body
  );
} 