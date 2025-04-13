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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {loading && services.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
              <p className="text-gray-500">Loading status information...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h2 className="mb-2 text-xl font-semibold text-red-700">Error Loading Status</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={refresh}
              className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            <StatusHeader services={services} lastUpdated={lastUpdated} />
            
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Service Status</h2>
              <div className="flex items-center gap-4">
                <button
                  onClick={refresh}
                  className="flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium text-gray-600 hover:bg-gray-100"
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
                  Refresh
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className={`rounded-md px-3 py-1 text-sm font-medium ${
                    showHistory 
                      ? "bg-blue-100 text-blue-700" 
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {showHistory ? "Hide History" : "Show History"}
                </button>
              </div>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <StatusCard key={service.name} service={service} />
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
