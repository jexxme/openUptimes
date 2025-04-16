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
  Calendar
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
    "bg-gray-300";
  
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

  return (
    <div className="overflow-hidden w-full">
      {/* Search and action buttons */}
      <div className="flex items-center justify-between mb-6">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full py-2.5 pl-12 pr-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="flex flex-col items-center justify-center p-8 rounded-lg bg-red-50">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <h3 className="text-red-700 font-medium mb-1">Error Loading Services</h3>
          <p className="text-sm text-red-600 mb-4 text-center">
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
          <Server className="h-8 w-8 text-slate-300 mb-2" />
          <h3 className="text-slate-700 font-medium">No services found</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">
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
                className="bg-white rounded-lg border hover:shadow-sm transition-shadow duration-200 overflow-hidden w-full"
              >
                <div 
                  className="flex items-center justify-between p-6 cursor-pointer w-full"
                  onClick={() => toggleServiceExpansion(service.name)}
                >
                  <div className="flex items-center space-x-4 flex-1 min-w-0 max-w-[calc(100%-180px)]">
                    <div className="flex items-center pl-1">
                      <StatusDot status={status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-medium truncate">{service.name}</h3>
                        {responseTime && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                            {responseTime}ms
                          </span>
                        )}
                        <div className={`text-xs px-2 py-0.5 rounded-full font-medium
                          ${status === "up" ? "bg-emerald-100 text-emerald-700" : 
                            status === "down" ? "bg-red-100 text-red-700" : 
                            "bg-slate-100 text-slate-700"}
                        `}>
                          {status === "up" ? "Online" : status === "down" ? "Offline" : "Unknown"}
                        </div>
                      </div>
                      <div className="text-sm text-slate-500 truncate mt-1">
                        <a 
                          href={service.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center hover:text-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate">{service.url}</span>
                          <ExternalLink className="h-3 w-3 ml-1 flex-shrink-0" />
                        </a>
                      </div>
                      {service.description && (
                        <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 hover:text-blue-600 hover:bg-blue-50"
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
                      className="h-9 w-9 p-0 hover:text-red-500"
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
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 w-full">
                    <div className="ml-11 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {/* Metadata section */}
                      <div className="bg-slate-50 p-5 rounded-md w-full">
                        <h4 className="text-sm font-medium mb-3 text-slate-700">Service Metadata</h4>
                        <div className="space-y-3 text-xs w-full">
                          <div className="flex justify-between">
                            <span className="text-slate-600">Expected Status:</span>
                            <span className="font-medium">{service.expectedStatus || 200}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Visible on Status Page:</span>
                            <span className="font-medium">{service.visible ? 'Yes' : 'No'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600">Last Check:</span>
                            <span className="font-medium">
                              {statusData?.currentStatus?.timestamp 
                                ? new Date(statusData.currentStatus.timestamp).toLocaleString() 
                                : 'N/A'}
                            </span>
                          </div>
                          {statusData?.currentStatus?.statusCode && (
                            <div className="flex justify-between">
                              <span className="text-slate-600">Status Code:</span>
                              <span className="font-medium">{statusData.currentStatus.statusCode}</span>
                            </div>
                          )}
                          {statusData?.currentStatus?.error && (
                            <div className="mt-3">
                              <span className="text-slate-600 block mb-1">Last Error:</span>
                              <span className="font-medium text-red-600 text-xs block p-2 bg-red-50 rounded overflow-auto">
                                {statusData.currentStatus.error}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Uptime & Statistics section */}
                      <div className="bg-slate-50 p-5 rounded-md w-full">
                        <h4 className="text-sm font-medium mb-3 text-slate-700">Uptime Statistics</h4>
                        <div className="space-y-4 w-full">
                          {uptimePercentage !== null && (
                            <div className="mb-3 w-full">
                              <div className="flex justify-between text-xs mb-1 w-full">
                                <span className="text-slate-600">Uptime</span>
                                <span className="font-medium">{uptimePercentage.toFixed(2)}%</span>
                              </div>
                              <div className="relative w-full bg-slate-200 rounded-full h-2">
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
                          
                          {status === 'up' && (
                            <div className="flex items-start text-xs">
                              <Clock className="h-3.5 w-3.5 text-emerald-600 mt-0.5 mr-1.5" />
                              <div>
                                <span className="text-slate-600 block">Online since:</span>
                                <span className="font-medium text-emerald-700">
                                  {onlineSince ? (
                                    <>
                                      {formatOnlineSince(onlineSince)} 
                                      <span className="text-slate-500 ml-1">
                                        ({onlineSince.toLocaleString()})
                                      </span>
                                    </>
                                  ) : (
                                    'Unknown'
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Response Time Chart Section */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-2">
                              <span className="text-slate-600">Response Time (Last 10 checks)</span>
                              <button
                                className="text-blue-600 hover:underline text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewHistory?.(service.name);
                                }}
                              >
                                View Details
                              </button>
                            </div>
                            
                            {/* Response Time Chart */}
                            {statusData?.history && statusData.history.length > 0 ? (
                              <div className="mt-1 rounded-md bg-slate-100 overflow-visible">
                                {/* Bar Chart Section */}
                                <div className="h-14 flex items-end justify-between px-1.5 pt-1.5 pb-1">
                                  {statusData.history.slice(0, 10).reverse().map((check: any, index: number) => {
                                    // Get valid response times only
                                    const validTimes = statusData.history
                                      .slice(0, 10)
                                      .map((c: any) => c.responseTime)
                                      .filter((time: any) => typeof time === 'number' && !isNaN(time) && time > 0);
                                    
                                    // Calculate max for normalization, with a reasonable default
                                    const maxTime = validTimes.length > 0 
                                      ? Math.max(...validTimes) 
                                      : 1000;
                                    
                                    // Calculate height percentage (10% min to 90% max)
                                    const hasResponseTime = typeof check.responseTime === 'number' && !isNaN(check.responseTime);
                                    const heightPx = hasResponseTime 
                                      ? Math.max(8, Math.min(35, (check.responseTime / maxTime) * 35))
                                      : 5;
                                    
                                    return (
                                      <div key={index} className="flex-1 flex flex-col items-center justify-end group">
                                        <div className="text-xs text-slate-800 font-medium text-center mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                                          {hasResponseTime ? `${check.responseTime}ms` : 'N/A'}
                                        </div>
                                        
                                        {/* Bar */}
                                        <div 
                                          className={`w-full min-w-[4px] max-w-[8px] mx-auto rounded-t-sm group-hover:opacity-80 transition-opacity ${
                                            check.status === 'up' 
                                              ? 'bg-emerald-500' 
                                              : check.status === 'down' 
                                                ? 'bg-red-500' 
                                                : 'bg-slate-400'
                                          }`}
                                          style={{ height: `${heightPx}px` }}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Timestamp Labels Section - Separated from chart */}
                                <div className="flex items-center justify-between px-1 pt-1 pb-2 border-t border-slate-200 bg-slate-50">
                                  {statusData.history.slice(0, 10).reverse().map((check: any, index: number) => (
                                    <div key={`time-${index}`} className="flex-1 text-center">
                                      <div className="text-[8px] text-slate-500 truncate px-0.5">
                                        {new Date(check.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-12 bg-slate-100 rounded-md p-2">
                                <div className="text-xs text-slate-500">No response time data available</div>
                              </div>
                            )}
                          </div>
                        </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <span className="font-semibold">{selectedService?.name}</span>?
              This action cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteService}
              disabled={isUpdating}
            >
              {isUpdating ? "Deleting..." : "Delete Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 