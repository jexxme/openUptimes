"use client";

import { useState, useEffect } from "react";
import { config } from "@/lib/config";
import { services as defaultServices } from "@/lib/config";

interface ConfigState {
  siteName: string;
  description: string;
  refreshInterval: number;
  historyLength: number;
  theme: {
    up: string;
    down: string;
    unknown: string;
  };
}

interface ServiceState {
  name: string;
  url: string;
  description?: string;
  expectedStatus?: number;
}

export function AdminConfigForm() {
  const [configState, setConfigState] = useState<ConfigState>({
    siteName: config.siteName,
    description: config.description,
    refreshInterval: config.refreshInterval,
    historyLength: config.historyLength,
    theme: { ...config.theme },
  });

  const [services, setServices] = useState<ServiceState[]>(
    [...defaultServices]
  );

  const [newService, setNewService] = useState<ServiceState>({
    name: "",
    url: "",
    description: "",
    expectedStatus: 200,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith("theme.")) {
      const themeProp = name.split(".")[1];
      setConfigState({
        ...configState,
        theme: {
          ...configState.theme,
          [themeProp]: value,
        },
      });
    } else {
      setConfigState({
        ...configState,
        [name]: name === "refreshInterval" || name === "historyLength" 
          ? parseInt(value) 
          : value,
      });
    }
  };

  const handleServiceChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const updatedServices = [...services];
    
    updatedServices[index] = {
      ...updatedServices[index],
      [name]: name === "expectedStatus" ? parseInt(value) : value,
    };
    
    setServices(updatedServices);
  };

  const handleNewServiceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewService({
      ...newService,
      [name]: name === "expectedStatus" ? parseInt(value) : value,
    });
  };

  const addService = () => {
    if (newService.name && newService.url) {
      setServices([...services, { ...newService }]);
      setNewService({
        name: "",
        url: "",
        description: "",
        expectedStatus: 200,
      });
    }
  };

  const removeService = (index: number) => {
    const updatedServices = [...services];
    updatedServices.splice(index, 1);
    setServices(updatedServices);
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setSaveMessage("");
    
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: configState,
          services,
          token: localStorage.getItem("adminToken"),
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage("Configuration saved successfully!");
        // In a real app, you would want to update the redis data or restart the server
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setSaveMessage(`Error: ${data.message}`);
      }
    } catch (error) {
      setSaveMessage("Error saving configuration");
      console.error("Error saving configuration:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-medium">Site Configuration</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Site Name</label>
            <input
              type="text"
              name="siteName"
              value={configState.siteName}
              onChange={handleConfigChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input
              type="text"
              name="description"
              value={configState.description}
              onChange={handleConfigChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Refresh Interval (ms)
            </label>
            <input
              type="number"
              min="5000"
              step="1000"
              name="refreshInterval"
              value={configState.refreshInterval}
              onChange={handleConfigChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              History Length (entries)
            </label>
            <input
              type="number"
              min="60"
              max="10000"
              name="historyLength"
              value={configState.historyLength}
              onChange={handleConfigChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Up Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  name="theme.up"
                  value={configState.theme.up}
                  onChange={handleConfigChange}
                  className="h-8 w-8"
                />
                <input
                  type="text"
                  name="theme.up"
                  value={configState.theme.up}
                  onChange={handleConfigChange}
                  className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Down Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  name="theme.down"
                  value={configState.theme.down}
                  onChange={handleConfigChange}
                  className="h-8 w-8"
                />
                <input
                  type="text"
                  name="theme.down"
                  value={configState.theme.down}
                  onChange={handleConfigChange}
                  className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Unknown Color
              </label>
              <div className="flex items-center">
                <input
                  type="color"
                  name="theme.unknown"
                  value={configState.theme.unknown}
                  onChange={handleConfigChange}
                  className="h-8 w-8"
                />
                <input
                  type="text"
                  name="theme.unknown"
                  value={configState.theme.unknown}
                  onChange={handleConfigChange}
                  className="ml-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="rounded-lg border p-4">
        <h3 className="mb-4 text-lg font-medium">Services</h3>
        
        <div className="space-y-4">
          {services.map((service, index) => (
            <div key={index} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{service.name || "New Service"}</h4>
                <button
                  type="button"
                  onClick={() => removeService(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  Remove
                </button>
              </div>
              
              <div className="mt-2 space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={service.name}
                    onChange={(e) => handleServiceChange(index, e)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">URL</label>
                  <input
                    type="url"
                    name="url"
                    value={service.url}
                    onChange={(e) => handleServiceChange(index, e)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <input
                    type="text"
                    name="description"
                    value={service.description || ""}
                    onChange={(e) => handleServiceChange(index, e)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Expected Status Code
                  </label>
                  <input
                    type="number"
                    name="expectedStatus"
                    value={service.expectedStatus || 200}
                    onChange={(e) => handleServiceChange(index, e)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          ))}
          
          <div className="rounded-md border border-dashed p-3">
            <h4 className="text-sm font-medium">Add New Service</h4>
            
            <div className="mt-2 space-y-2">
              <div>
                <input
                  type="text"
                  name="name"
                  placeholder="Service Name"
                  value={newService.name}
                  onChange={handleNewServiceChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <input
                  type="url"
                  name="url"
                  placeholder="Service URL"
                  value={newService.url}
                  onChange={handleNewServiceChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <input
                  type="text"
                  name="description"
                  placeholder="Description (optional)"
                  value={newService.description || ""}
                  onChange={handleNewServiceChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <input
                  type="number"
                  name="expectedStatus"
                  placeholder="Expected Status (default: 200)"
                  value={newService.expectedStatus || 200}
                  onChange={handleNewServiceChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <button
                type="button"
                onClick={addService}
                disabled={!newService.name || !newService.url}
                className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-900 hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
              >
                Add Service
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <span className={`text-sm ${saveMessage.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>
          {saveMessage}
        </span>
        
        <button
          type="button"
          onClick={saveConfig}
          disabled={isSaving}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              Saving...
            </>
          ) : (
            "Save Configuration"
          )}
        </button>
      </div>
    </div>
  );
} 