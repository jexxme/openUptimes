"use client";

import { Server, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { ServiceConfig } from "@/lib/config";
import { ServiceStatus } from "@/lib/status";

interface StatusData {
  name: string;
  currentStatus?: {
    status: ServiceStatus;
    timestamp: number;
    responseTime?: number;
    statusCode?: number;
    error?: string;
  } | null;
}

interface ServicesStatsProps {
  servicesConfig: ServiceConfig[];
  servicesStatus: StatusData[];
}

// StatCard component from admin page
const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  color = "blue"
}: { 
  title: string; 
  value: string | number;
  icon: React.ElementType;
  description?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  color?: "blue" | "green" | "red" | "purple" | "yellow";
}) => {
  const colorVariants = {
    blue: "from-blue-50 to-blue-100/20 text-blue-700 border-blue-200",
    green: "from-emerald-50 to-emerald-100/20 text-emerald-700 border-emerald-200",
    red: "from-red-50 to-red-100/20 text-red-700 border-red-200",
    purple: "from-purple-50 to-purple-100/20 text-purple-700 border-purple-200",
    yellow: "from-amber-50 to-amber-100/20 text-amber-700 border-amber-200",
  };

  return (
    <div className={`overflow-hidden rounded-lg border bg-gradient-to-br p-4 ${colorVariants[color]}`}>
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm font-medium">{title}</p>
        <div className="p-1.5 rounded-full bg-white/90 shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {description && <p className="text-xs opacity-80 mb-3">{description}</p>}
      <div className="flex items-baseline justify-between">
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <div className={`flex items-center text-xs font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
            <svg
              className={`h-3 w-3 mr-0.5 ${!trend.isPositive && 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
            {trend.value}%
          </div>
        )}
      </div>
    </div>
  );
};

export function ServicesStats({ servicesConfig, servicesStatus }: ServicesStatsProps) {
  // Calculate stats from real data
  const totalServices = servicesConfig.length;
  const upServices = servicesStatus.filter(service => service.currentStatus?.status === "up").length;
  const downServices = servicesStatus.filter(service => service.currentStatus?.status === "down").length;
  const unknownServices = servicesStatus.filter(service => !service.currentStatus || service.currentStatus?.status === "unknown").length;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <StatCard 
        title="Total Services" 
        value={totalServices} 
        icon={Server} 
        color="blue"
        description="Monitored services"
      />
      <StatCard 
        title="Online Services" 
        value={upServices} 
        icon={CheckCircle}
        color="green" 
        description="Operational services"
      />
      <StatCard 
        title="Offline Services" 
        value={downServices} 
        icon={XCircle}
        color="red"
        description="Services experiencing issues"
      />
      <StatCard 
        title="Unknown Status" 
        value={unknownServices} 
        icon={AlertCircle}
        color="yellow"
        description="Services pending status check"
      />
    </div>
  );
} 