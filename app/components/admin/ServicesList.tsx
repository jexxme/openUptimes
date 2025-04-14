"use client";

import { useState } from "react";
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
  History
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ServiceForm } from "../ServiceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";

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
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceConfig | undefined>(undefined);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

  return (
    <Card className="overflow-hidden border">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6 px-6">
        <div>
          <CardTitle className="text-xl font-semibold">Manage Services</CardTitle>
          <CardDescription>
            {lastUpdated 
              ? `Last updated: ${lastUpdated}` 
              : "Configure and manage monitored services"}
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1" 
            onClick={() => {
              refreshServicesConfig();
              refresh();
            }}
            disabled={statusLoading || servicesConfigLoading || isUpdating}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
          <Button 
            size="sm" 
            className="gap-1"
            onClick={() => setIsAddServiceOpen(true)}
            disabled={isUpdating}
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Service</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {/* Search bar */}
        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            className="w-full py-2 pl-10 pr-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
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
            <Button variant="outline" size="sm" onClick={() => {
              refreshServicesConfig();
              refresh();
            }}>
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
          <div className="space-y-2">
            {filteredServices.map((service) => {
              // Find matching status data
              const statusData = services.find(s => s.name === service.name);
              const status = statusData?.currentStatus?.status || "unknown";
              const responseTime = statusData?.currentStatus?.responseTime;
              
              return (
                <div key={service.name} className="flex items-center justify-between p-4 bg-white rounded-lg border hover:shadow-sm transition-shadow duration-200">
                  <div className="flex items-start space-x-4 flex-1 min-w-0">
                    <div className={`h-3 w-3 mt-1.5 flex-shrink-0 rounded-full ${
                      status === "up" ? "bg-emerald-500" : 
                      status === "down" ? "bg-red-500" : 
                      "bg-gray-300"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <h3 className="font-medium truncate">{service.name}</h3>
                        {responseTime && (
                          <span className="ml-2 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full">
                            {responseTime}ms
                          </span>
                        )}
                        <div className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium
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
                          className="flex items-center hover:text-blue-600"
                        >
                          {service.url}
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                      {service.description && (
                        <p className="text-xs text-slate-500 mt-1">{service.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => onViewHistory?.(service.name)}
                      title="View History"
                    >
                      <History className="h-4 w-4" />
                      <span className="sr-only">History</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditDialog(service)}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
                      onClick={() => openDeleteDialog(service)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
    </Card>
  );
} 