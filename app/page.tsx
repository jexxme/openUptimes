"use client";

import { useState } from "react";
import { useStatus } from "./hooks/useStatus";
import { StatusHeader } from "./components/StatusHeader";
import { StatusCard } from "./components/StatusCard";
import { Footer } from "./components/Footer";

export default function Home() {
  const [showHistory, setShowHistory] = useState(false);
  const { services, loading, error, lastUpdated, refresh } = useStatus(showHistory, 60);
  
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="mx-auto w-full max-w-3xl px-4 py-8">
        {loading && services.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-100 bg-white p-4 text-center">
            <h2 className="mb-2 text-lg font-medium text-red-600">Error Loading Status</h2>
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 rounded-md bg-red-50 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <StatusHeader services={services} lastUpdated={lastUpdated} />
            
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Services</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={refresh}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-50"
                  aria-label="Refresh"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`rounded-md px-2 py-1 text-xs ${
                    showHistory 
                      ? "bg-blue-50 text-blue-600" 
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {showHistory ? "Hide History" : "Show History"}
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {services.map((service) => (
                <StatusCard key={service.name} service={service} showHistory={showHistory} />
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
