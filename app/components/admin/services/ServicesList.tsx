"use client";

import { useState, useEffect, useCallback } from "react";
import { ServiceConfig } from "@/lib/config";
import { 
  Server, 
  RefreshCw, 
  PlusCircle, 
  Search, 
  Edit, 
  Trash2, 
  AlertTriangle,
  ExternalLink,
  History,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
  EyeOff,
  BarChart3,
  Info,
  HelpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ServiceForm } from "@/app/components/ServiceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";

// StatusDot component for animated status indicator
const StatusDot = ({ status }: { status: string }) => {
  const statusColor = 
    status === "up" ? "bg-emerald-500" : 
    status === "down" ? "bg-red-500" : 
    "bg-gray-300 dark:bg-gray-600";
  
  return (
    <div className="relative flex items-center justify-center w-3 h-3">
      <div className={`w-3 h-3 rounded-full ${statusColor}`}>
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

// Compact stat chip component for service summary
const ServiceStatChip = ({ count, label, color }: { count: number, label: string, color: string }) => {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${color}`}>
      <span>{count}</span>
      <span>{label}</span>
    </div>
  );
};

interface ServicesListProps {
  services: any[];
  servicesConfig: ServiceConfig[];
  statusLoading: boolean;
  servicesConfigLoading: boolean;
  statusError: string | null;
  servicesConfigError: string | null;
  isUpdating: boolean;
  lastUpdated: string;
  refreshServicesConfig: () => void;
  refresh: () => void;
  addService: (service: ServiceConfig) => Promise<boolean>;
  updateService: (originalName: string, updatedService: ServiceConfig) => Promise<boolean>;
  deleteService: (name: string) => Promise<boolean>;
  onViewHistory?: (serviceName: string) => void;
}

export function ServicesList({
  services,
  servicesConfig,
  statusLoading,
  servicesConfigLoading,
  statusError,
  servicesConfigError,
  isUpdating,
  lastUpdated,
  refreshServicesConfig,
  refresh,
  addService,
  updateService,
  deleteService,
  onViewHistory,
}: ServicesListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [processedServices, setProcessedServices] = useState(services || []);
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceConfig | undefined>(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [responseTimeSpans, setResponseTimeSpans] = useState<Record<string, number>>({});
  const [showChartInfo, setShowChartInfo] = useState<Record<string, boolean>>({});

  // Update processedServices when services prop changes
  useEffect(() => {
    if (services && services.length > 0) {
      setProcessedServices(services);
    }
  }, [services]);

  const handleAddService = async (service: ServiceConfig) => {
    return await addService(service);
  };

  const handleEditService = async (service: ServiceConfig) => {
    if (!selectedService) return false;
    return await updateService(selectedService.name, service);
  };

  const handleDeleteService = async () => {
    if (!selectedService) return false;
    const success = await deleteService(selectedService.name);
    if (success) {
      setIsDeleteConfirmOpen(false);
      setSelectedService(undefined);
      // Refresh status data after deletion
      setTimeout(refresh, 1000);
    }
    return success;
  };

  const openEditDialog = (service: ServiceConfig) => {
    setSelectedService(service);
    setIsEditServiceOpen(true);
  };

  const openDeleteDialog = (service: ServiceConfig) => {
    setSelectedService(service);
    setIsDeleteConfirmOpen(true);
  };

  // Filter services based on search query
  const filteredServices = searchQuery.trim() 
    ? servicesConfig.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        service.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (service.description && service.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : servicesConfig;

  // Toggle service expansion
  const toggleServiceExpansion = (serviceName: string) => {
    setExpandedServices(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }));
  };

  // Calculate uptime percentage and duration
  const calculateUptimeStats = (serviceData: any) => {
    if (!serviceData || !serviceData.history || serviceData.history.length === 0) {
      return { uptimePercentage: null, onlineSince: null };
    }

    // Calculate uptime percentage
    const totalChecks = serviceData.history.length;
    const upChecks = serviceData.history.filter((item: any) => item.status === "up").length;
    const uptimePercentage = (upChecks / totalChecks) * 100;

    // Find when the service came online (last continuous period of uptime)
    let onlineSince = null;
    if (serviceData.currentStatus?.status === "up") {
      // Start from the most recent history entry and work backwards
      for (let i = 0; i < serviceData.history.length; i++) {
        if (serviceData.history[i].status !== "up") {
          // Found the transition point, use the next entry (which is "up")
          if (i > 0) {
            onlineSince = new Date(serviceData.history[i - 1].timestamp);
          }
          break;
        }
        
        // If we reached the end and all are "up", use the oldest entry
        if (i === serviceData.history.length - 1) {
          onlineSince = new Date(serviceData.history[i].timestamp);
        }
      }
    }

    return { uptimePercentage, onlineSince };
  };

  // Format the "online since" time in a human-readable way
  const formatOnlineSince = (timestamp: Date | null) => {
    if (!timestamp) return "N/A";
    
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    
    if (diffSeconds < 60) {
      return `${diffSeconds} seconds`;
    }
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  };

  // Handle refresh with animation using useCallback to avoid dependency issues
  const handleRefresh = useCallback(() => {
    if (isRefreshing || statusLoading || servicesConfigLoading || isUpdating) return;
    
    setIsRefreshing(true);
    
    // Delay the actual refresh to complete animation
    setTimeout(() => {
      refreshServicesConfig();
      refresh();
      
      // Reset refreshing state after a short delay
      setTimeout(() => {
        setIsRefreshing(false);
      }, 100);
    }, 650); // Animation takes ~600ms
  }, [isRefreshing, statusLoading, servicesConfigLoading, isUpdating, refreshServicesConfig, refresh]);

  // Calculate service statistics for the compact chips
  const totalServices = servicesConfig.length;
  const activeServices = services.filter(service => service.currentStatus?.status === "up").length;
  const offlineServices = services.filter(service => service.currentStatus?.status === "down").length;
  const unknownServices = services.filter(service => !service.currentStatus || service.currentStatus?.status === "unknown").length;

  // Function to change the time span for response time chart
  const changeTimeSpan = (serviceName: string, direction: 'prev' | 'next') => {
    const currentSpan = responseTimeSpans[serviceName] || 10;
    const spans = [5, 10, 15, 20, 25];
    const currentIndex = spans.indexOf(currentSpan);
    let newIndex;
    
    if (direction === 'prev') {
      newIndex = currentIndex <= 0 ? spans.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= spans.length - 1 ? 0 : currentIndex + 1;
    }
    
    setResponseTimeSpans(prev => ({
      ...prev,
      [serviceName]: spans[newIndex]
    }));
  };

  // Toggle chart info popup
  const toggleChartInfo = (serviceName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowChartInfo(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }));
  };

  return (
    <div className="w-full">
      {/* Search and action buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            className="w-full py-2.5 pl-12 pr-4 border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 px-4 h-9 whitespace-nowrap" 
            onClick={handleRefresh}
            disabled={statusLoading || servicesConfigLoading || isUpdating}
            aria-label="Refresh services data"
            title="Refresh services data"
          >
            <RefreshCw 
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-refresh-rotate' : ''}`} 
            />
            <span>Refresh</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-2 px-4 h-9 whitespace-nowrap"
            onClick={() => setIsAddServiceOpen(true)}
            disabled={isUpdating}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Service</span>
          </Button>
        </div>
      </div>
      
      {/* Services list */}
      {(statusLoading && services.length === 0) || servicesConfigLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : statusError || servicesConfigError ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-red-50 dark:bg-red-950/30">
          <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mb-2" />
          <h3 className="text-red-700 dark:text-red-400 font-medium mb-1">Error Loading Services</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4 text-center">
            {statusError || servicesConfigError}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            className="gap-1"
            aria-label="Try again to load services"
            title="Retry loading services"
          >
            <RefreshCw 
              className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-refresh-rotate' : ''}`} 
            />
            Try Again
          </Button>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <Server className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
          <h3 className="text-slate-700 dark:text-slate-300 font-medium">No services found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">
            {searchQuery
              ? "No services match your search query"
              : "Add your first service to start monitoring"
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddServiceOpen(true)}>Add Service</Button>
          )}
          {searchQuery && (
            <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredServices.map((service) => {
            // Find matching status data
            const statusData = processedServices?.find(s => s.name === service.name);
            const status = statusData?.currentStatus?.status || "unknown";
            const responseTime = statusData?.currentStatus?.responseTime;
            const { uptimePercentage, onlineSince } = calculateUptimeStats(statusData);
            const isExpanded = expandedServices[service.name] || false;
            
            return (
              <div 
                key={service.name} 
                className="bg-white dark:bg-slate-900 rounded-lg border dark:border-slate-800 hover:shadow-sm transition-shadow duration-200 w-full"
              >
                <div 
                  className="flex items-center justify-between p-6 cursor-pointer w-full"
                  onClick={() => toggleServiceExpansion(service.name)}
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    <div className="flex items-center pl-1">
                      <StatusDot status={status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-medium truncate dark:text-white">{service.name}</h3>
                        {responseTime && (
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs rounded-full">
                            {responseTime}ms
                          </span>
                        )}
                        <div className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${status === "up" ? "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400" : 
                            status === "down" ? "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400" : 
                            "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400"}
                        `}>
                          {status === "up" ? "Online" : status === "down" ? "Offline" : "Unknown"}
                        </div>
                        {service.visible === false && (
                          <div className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            <span>Hidden</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate mt-1">
                        <a 
                          href={service.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate">{service.url}</span>
                          <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                        </a>
                      </div>
                      {service.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewHistory?.(service.name);
                      }}
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                      <span className="sr-only">History</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(service);
                      }}
                      title="Edit Service"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:text-red-500 dark:hover:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(service);
                      }}
                      title="Delete Service"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                    <div className="w-6 flex justify-center">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expanded details section */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 w-full bg-slate-50/30 dark:bg-slate-800/10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[800px] mx-auto">
                      {/* Metadata section */}
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-md w-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h4 className="text-xs font-medium mb-3 text-slate-700 dark:text-slate-300 flex items-center">
                          <span className="w-1 h-4 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></span>
                          Service Metadata
                        </h4>
                        <div className="space-y-2 text-xs w-full">
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-600 dark:text-slate-400 mr-2">Expected Status:</span>
                            <span className="font-medium dark:text-slate-300">{service.expectedStatus || 200}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-600 dark:text-slate-400 mr-2">Visible on Status Page:</span>
                            <span className="font-medium dark:text-slate-300">{service.visible ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span className="text-slate-600 dark:text-slate-400 mr-2">Last Check:</span>
                            <span className="font-medium text-xs truncate max-w-[120px] dark:text-slate-300">
                              {statusData?.currentStatus?.timestamp 
                                ? new Date(statusData.currentStatus.timestamp).toLocaleString() 
                                : 'N/A'}
                            </span>
                          </div>
                          {statusData?.currentStatus?.statusCode && (
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-600 dark:text-slate-400 mr-2">Status Code:</span>
                              <span className="font-medium dark:text-slate-300">{statusData.currentStatus.statusCode}</span>
                            </div>
                          )}

                          {/* Total Checks */}
                          {statusData?.history && (
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-600 dark:text-slate-400 mr-2">Total Checks:</span>
                              <span className="font-medium dark:text-slate-300">
                                {statusData.history.length}
                              </span>
                            </div>
                          )}
                          
                          {/* First Monitored */}
                          {statusData?.history && statusData.history.length > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span className="text-slate-600 dark:text-slate-400 mr-2">First Monitored:</span>
                              <span className="font-medium dark:text-slate-300">
                                {(() => {
                                  const oldestEntry = statusData.history[statusData.history.length - 1];
                                  if (!oldestEntry?.timestamp) return 'N/A';
                                  
                                  const date = new Date(oldestEntry.timestamp);
                                  return date.toLocaleDateString();
                                })()}
                              </span>
                            </div>
                          )}
                          
                          {/* Divider before error message if present */}
                          {statusData?.currentStatus?.error && (
                            <div className="border-t border-slate-200 dark:border-slate-700 my-2"></div>
                          )}
                          
                          {statusData?.currentStatus?.error && (
                            <div className="mt-3 p-2 rounded-md bg-slate-50 dark:bg-slate-900">
                              <span className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Last Error:</span>
                              <span className="font-medium text-red-600 dark:text-red-400 text-xs block p-2 bg-red-50 dark:bg-red-950/40 rounded-md border border-red-100 dark:border-red-900/30 overflow-auto max-h-[40px]">
                                {statusData.currentStatus.error}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Uptime & Statistics section */}
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-md w-full border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h4 className="text-xs font-medium mb-3 text-slate-700 dark:text-slate-300 flex items-center">
                          <span className="w-1 h-4 bg-emerald-500 dark:bg-emerald-400 rounded-full mr-2"></span>
                          Uptime Statistics
                        </h4>
                        <div className="space-y-3 w-full">
                          {uptimePercentage !== null && (
                            <div className="mb-2 w-full">
                              <div className="flex justify-between text-xs mb-1.5 w-full">
                                <span className="text-slate-600 dark:text-slate-400">Uptime</span>
                                <span className={`font-medium ${
                                  uptimePercentage > 99 ? 'text-emerald-600 dark:text-emerald-400' : 
                                  uptimePercentage > 95 ? 'text-green-600 dark:text-green-400' : 
                                  uptimePercentage > 90 ? 'text-yellow-600 dark:text-yellow-400' : 
                                  'text-red-600 dark:text-red-400'
                                }`}>{uptimePercentage.toFixed(2)}%</span>
                              </div>
                              <div className="relative w-full bg-slate-200 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`absolute top-0 left-0 h-2 rounded-full ${
                                    uptimePercentage > 99 ? 'bg-emerald-500' : 
                                    uptimePercentage > 95 ? 'bg-green-500' : 
                                    uptimePercentage > 90 ? 'bg-yellow-500' : 
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, uptimePercentage)}%` }}
                                />
                              </div>
                            </div>
                          )}
                          
                          {/* Availability Metric */}
                          {statusData?.history && statusData.history.length > 0 && (
                            <div className="flex justify-between py-0.5 text-xs">
                              <span className="text-slate-600 dark:text-slate-400 mr-2">Availability (24h):</span>
                              <span className={`font-medium ${
                                uptimePercentage === null ? 'text-slate-600 dark:text-slate-400' :
                                uptimePercentage > 99 ? 'text-emerald-600 dark:text-emerald-400' : 
                                uptimePercentage > 95 ? 'text-green-600 dark:text-green-400' : 
                                uptimePercentage > 90 ? 'text-yellow-600 dark:text-yellow-400' : 
                                'text-red-600 dark:text-red-400'
                              }`}>
                                {(() => {
                                  // Get checks within the last 24 hours
                                  const now = new Date();
                                  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                                  const recentChecks = statusData.history.filter((check: any) => 
                                    new Date(check.timestamp) >= dayAgo
                                  );
                                  
                                  if (recentChecks.length === 0) return 'N/A';
                                  
                                  const upChecks = recentChecks.filter((check: any) => check.status === 'up').length;
                                  const availability = (upChecks / recentChecks.length) * 100;
                                  
                                  return `${availability.toFixed(2)}%`;
                                })()}
                              </span>
                            </div>
                          )}
                          
                          {/* Average Response Time - moved from Metadata */}
                          {statusData?.history && statusData.history.length > 0 && (
                            <div className="flex justify-between py-0.5 text-xs">
                              <span className="text-slate-600 dark:text-slate-400 mr-2">Avg Response Time:</span>
                              <span className="font-medium dark:text-slate-300">
                                {(() => {
                                  const validTimes = statusData.history
                                    .map((c: any) => c.responseTime)
                                    .filter((time: any) => typeof time === 'number' && !isNaN(time) && time > 0);
                                  
                                  if (validTimes.length === 0) return 'N/A';
                                  
                                  const avgTime = validTimes.reduce((sum: number, time: number) => sum + time, 0) / validTimes.length;
                                  return `${Math.round(avgTime)}ms`;
                                })()}
                              </span>
                            </div>
                          )}
                          
                          {/* Response Time Range - moved from Metadata */}
                          {statusData?.history && statusData.history.length > 0 && (
                            <div className="flex justify-between py-0.5 text-xs">
                              <span className="text-slate-600 dark:text-slate-400 mr-2">Response Range:</span>
                              <span className="font-medium dark:text-slate-300">
                                {(() => {
                                  const validTimes = statusData.history
                                    .map((c: any) => c.responseTime)
                                    .filter((time: any) => typeof time === 'number' && !isNaN(time) && time > 0);
                                  
                                  if (validTimes.length === 0) return 'N/A';
                                  
                                  const minTime = Math.min(...validTimes);
                                  const maxTime = Math.max(...validTimes);
                                  return `${minTime}ms - ${maxTime}ms`;
                                })()}
                              </span>
                            </div>
                          )}
                          
                          {/* Online Status Section */}
                          {status === "up" && onlineSince && (
                            <div className="mt-3 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                              <h5 className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">Online Status</h5>
                              <div className="flex items-center gap-2 mb-1.5">
                                <Clock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <div className="text-xs">
                                  <span className="text-emerald-600 dark:text-emerald-500 mr-1">Online for:</span>
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">{formatOnlineSince(onlineSince)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                                <div className="text-xs">
                                  <span className="text-emerald-600 dark:text-emerald-500 mr-1">Since:</span>
                                  <span className="font-medium text-emerald-700 dark:text-emerald-400">
                                    {onlineSince.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* New dedicated Response Time Chart card - spans full width in both grid layouts */}
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-md w-full border border-slate-200 dark:border-slate-700 shadow-sm md:col-span-2">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center">
                            <span className="w-1 h-4 bg-indigo-500 dark:bg-indigo-400 rounded-full mr-2"></span>
                            Response Time Chart
                          </h4>
                          
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <button 
                                onClick={(e) => toggleChartInfo(service.name, e)}
                                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Chart information"
                              >
                                <HelpCircle className="h-3.5 w-3.5 text-slate-500" />
                              </button>
                              
                              {showChartInfo[service.name] && (
                                <div className="absolute right-0 top-6 z-10 w-64 p-3 text-xs bg-white dark:bg-slate-900 shadow-lg rounded-md border border-slate-200 dark:border-slate-700">
                                  <h5 className="font-medium mb-1.5 text-slate-800 dark:text-slate-200">About Response Time Chart</h5>
                                  <p className="text-slate-600 dark:text-slate-400 mb-2">
                                    This chart shows the response time trend for recent checks. 
                                    Higher bars indicate longer response times.
                                  </p>
                                  <ul className="space-y-1.5 mt-2">
                                    <li className="flex items-center">
                                      <span className="block w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                      <span>Green: Service online</span>
                                    </li>
                                    <li className="flex items-center">
                                      <span className="block w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                                      <span>Red: Service offline</span>
                                    </li>
                                    <li className="flex items-center">
                                      <span className="block w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                                      <span>Gray: Status unknown</span>
                                    </li>
                                  </ul>
                                </div>
                              )}
                            </div>
                            
                            <button
                              className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewHistory?.(service.name);
                              }}
                            >
                              Full History
                            </button>
                          </div>
                        </div>
                        
                        {/* Time span selector */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Last <span className="font-medium text-slate-700 dark:text-slate-300">{responseTimeSpans[service.name] || 10}</span> checks
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                changeTimeSpan(service.name, 'next');
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              aria-label="Show fewer checks"
                            >
                              <ChevronLeft className="h-4 w-4 text-slate-500" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                changeTimeSpan(service.name, 'prev');
                              }}
                              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              aria-label="Show more checks"
                            >
                              <ChevronRight className="h-4 w-4 text-slate-500" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Enhanced Response Time Chart */}
                        {statusData?.history && statusData.history.length > 0 ? (
                          <div className="rounded-md bg-white dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
                            {/* Bar Chart Section - enhanced height */}
                            <div className="h-16 flex items-end justify-between px-1 py-2 relative">
                              {/* Grid lines */}
                              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-700/30"></div>
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-700/30"></div>
                                <div className="w-full h-px bg-slate-100 dark:bg-slate-700/30"></div>
                              </div>
                              
                              {statusData.history.slice(0, responseTimeSpans[service.name] || 10).reverse().map((check: any, index: number) => {
                                // Get valid response times only
                                const validTimes = statusData.history
                                  .slice(0, responseTimeSpans[service.name] || 10)
                                  .map((c: any) => c.responseTime)
                                  .filter((time: any) => typeof time === 'number' && !isNaN(time) && time > 0);
                                
                                // Calculate max for normalization with minimum ceiling
                                const maxTime = validTimes.length > 0 
                                  ? Math.max(...validTimes, 500) 
                                  : 1000;
                                
                                // Calculate height percentage 
                                const hasResponseTime = typeof check.responseTime === 'number' && !isNaN(check.responseTime);
                                const heightPx = hasResponseTime 
                                  ? Math.max(6, Math.min(48, (check.responseTime / maxTime) * 48))
                                  : 5;
                                
                                return (
                                  <div key={index} className="flex-1 flex flex-col items-center justify-end group relative h-full">
                                    {/* Enhanced tooltip with more info - centered */}
                                    <div className="fixed transform -translate-y-full -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50 w-max pointer-events-none" style={{top: 'calc(var(--y, 0) - 10px)', left: 'var(--x, 0)'}}>
                                      <div className="bg-slate-800 dark:bg-slate-900 text-white text-xs rounded px-3 py-2 shadow-lg">
                                        <div className="font-medium text-center">{hasResponseTime ? `${check.responseTime}ms` : 'No data'}</div>
                                        <div className="text-slate-300 text-center">{new Date(check.timestamp).toLocaleString()}</div>
                                      </div>
                                      <div className="w-3 h-3 transform rotate-45 bg-slate-800 dark:bg-slate-900 absolute -bottom-1.5 left-1/2 -translate-x-1/2"></div>
                                    </div>
                                    
                                    {/* Bar with adjusted width */}
                                    <div 
                                      className={`w-[5px] rounded-t-sm group-hover:w-[7px] group-hover:brightness-110 transition-all relative ${
                                        check.status === 'up' 
                                          ? 'bg-emerald-500 dark:bg-emerald-400' 
                                          : check.status === 'down' 
                                            ? 'bg-red-500 dark:bg-red-400' 
                                            : 'bg-slate-400 dark:bg-slate-500'
                                      }`}
                                      style={{ height: `${heightPx}px` }}
                                      onMouseMove={(e) => {
                                        const el = e.currentTarget;
                                        const rect = el.getBoundingClientRect();
                                        const centerX = rect.left + rect.width / 2;
                                        const y = rect.top;
                                        el.parentElement!.style.setProperty('--x', `${centerX}px`);
                                        el.parentElement!.style.setProperty('--y', `${y}px`);
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Timestamp Labels Section - Simplified */}
                            <div className="flex items-center justify-between px-1 pt-1 pb-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                              {statusData.history.slice(0, responseTimeSpans[service.name] || 10).reverse().map((check: any, index: number) => {
                                const date = new Date(check.timestamp);
                                const now = new Date();
                                const isToday = date.toDateString() === now.toDateString();
                                
                                return (
                                  <div key={`time-${index}`} className="flex-1 text-center">
                                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate px-0.5 font-medium">
                                      {isToday 
                                        ? date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                                        : date.toLocaleDateString([], {month: 'numeric', day: 'numeric'})
                                      }
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-28 bg-white dark:bg-slate-800 rounded-md p-4 border border-slate-200 dark:border-slate-700">
                            <div className="text-[12px] text-slate-500 dark:text-slate-400 mb-2">No response time data available</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              Response time history will appear here after checks are performed
                            </div>
                          </div>
                        )}
                        
                        {/* Chart metrics summary - simplified */}
                        {statusData?.history && statusData.history.length > 0 && (
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {(() => {
                              const validTimes = statusData.history
                                .slice(0, responseTimeSpans[service.name] || 10)
                                .map((c: any) => c.responseTime)
                                .filter((time: any) => typeof time === 'number' && !isNaN(time) && time > 0);
                              
                              if (validTimes.length === 0) return null;
                              
                              const avgTime = validTimes.reduce((sum: number, time: number) => sum + time, 0) / validTimes.length;
                              const minTime = Math.min(...validTimes);
                              const maxTime = Math.max(...validTimes);
                              const p90Time = validTimes.sort((a: number, b: number) => a - b)[Math.floor(validTimes.length * 0.9)];
                              
                              return (
                                <>
                                  <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Average</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{Math.round(avgTime)}ms</div>
                                  </div>
                                  <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Minimum</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{minTime}ms</div>
                                  </div>
                                  <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Maximum</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{maxTime}ms</div>
                                  </div>
                                  <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400">90th Percentile</div>
                                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200">{p90Time}ms</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Service form dialogs */}
      <ServiceForm
        isOpen={isAddServiceOpen}
        onClose={() => setIsAddServiceOpen(false)}
        onSubmit={handleAddService}
        title="Add New Service"
      />
      
      <ServiceForm
        isOpen={isEditServiceOpen}
        onClose={() => {
          setIsEditServiceOpen(false);
          setSelectedService(undefined);
        }}
        onSubmit={handleEditService}
        service={selectedService}
        title="Edit Service"
      />
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-700 dark:text-slate-300">
              Are you sure you want to delete <span className="font-semibold">{selectedService?.name}</span>?
              This action cannot be undone.
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-900/50 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 mr-2" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Warning</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Deleting this service will remove all its monitoring data and history. 
                  Historical uptime calculations will also be affected.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteService} disabled={isUpdating}>
              {isUpdating ? 'Deleting...' : 'Delete Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 