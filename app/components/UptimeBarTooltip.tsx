import React, { useEffect } from 'react';
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
  
  return createPortal(
    <div 
      className="fixed z-[9999] bg-gray-800 text-white text-xs rounded-md py-2 px-3 leading-normal shadow-lg transform -translate-x-1/2 -translate-y-full pointer-events-none"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y - 10}px`
      }}
    >
      <div className="font-medium">
        {date}
      </div>
      
      <div className="flex items-center mt-1.5 mb-0.5">
        <span 
          className="inline-block w-2 h-2 rounded-full mr-1.5"
          style={{ backgroundColor: statusColor }}
        ></span>
        <span>{statusLabel}</span>
      </div>
      
      {uptimePercentage !== null && (
        <div className="text-gray-300 text-[10px] font-medium mt-0.5">
          {uptimePercentage}% UPTIME
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
    </div>,
    document.body
  );
} 