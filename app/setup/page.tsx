"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSetupStatus } from "../hooks/useSetupStatus";

type SetupStep = "welcome" | "password" | "settings" | "complete";

export default function SetupPage() {
  const router = useRouter();
  const { setupComplete, loading } = useSetupStatus();
  const [currentStep, setCurrentStep] = useState<SetupStep>("welcome");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [siteName, setSiteName] = useState(process.env.NEXT_PUBLIC_SITE_NAME || "OpenUptimes");
  const [siteDescription, setSiteDescription] = useState(process.env.NEXT_PUBLIC_SITE_DESCRIPTION || "Service Status Monitor");
  const [refreshInterval, setRefreshInterval] = useState(process.env.NEXT_PUBLIC_REFRESH_INTERVAL ? 
    parseInt(process.env.NEXT_PUBLIC_REFRESH_INTERVAL) / 1000 : 60);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // If setup is already complete, redirect to home
  if (setupComplete === true && !loading) {
    router.push('/');
    return null;
  }
  
  async function completeSetup() {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/setup/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
          siteSettings: {
            siteName,
            siteDescription,
            refreshInterval: refreshInterval * 1000,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete setup');
      }
      
      setCurrentStep("complete");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setIsSubmitting(false);
    }
  }
  
  function handleNextStep() {
    if (currentStep === "welcome") {
      setCurrentStep("password");
    } else if (currentStep === "password") {
      if (!password) {
        setError("Password is required");
        return;
      }
      
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      
      setError(null);
      setCurrentStep("settings");
    } else if (currentStep === "settings") {
      completeSetup();
    }
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">OpenUptimes Setup</h1>
          <p className="mt-1 text-sm text-gray-500">
            {currentStep === "welcome" && "Welcome to your new status page"}
            {currentStep === "password" && "Set an admin password"}
            {currentStep === "settings" && "Configure your site"}
            {currentStep === "complete" && "Setup complete!"}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          
          {currentStep === "welcome" && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Welcome to OpenUptimes! This wizard will help you set up your status page.
              </p>
              
              <p className="text-gray-700">
                You&apos;ll need to:
              </p>
              
              <ul className="ml-5 list-disc space-y-1 text-gray-700">
                <li>Create an admin password</li>
                <li>Configure basic site settings</li>
                <li>Set up your monitored services</li>
              </ul>
            </div>
          )}
          
          {currentStep === "password" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Admin Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Enter a secure password"
                />
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}
          
          {currentStep === "settings" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="siteName" className="block text-sm font-medium text-gray-700">
                  Site Name
                </label>
                <input
                  id="siteName"
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700">
                  Site Description
                </label>
                <input
                  id="siteDescription"
                  type="text"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700">
                  Refresh Interval (seconds)
                </label>
                <input
                  id="refreshInterval"
                  type="number"
                  min="10"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          )}
          
          {currentStep === "complete" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              
              <h2 className="text-lg font-medium text-gray-900">Setup Complete!</h2>
              
              <p className="text-sm text-gray-500">
                Your status page is now ready to use. You can login to the admin panel to customize
                your services and settings.
              </p>
            </div>
          )}
          
          <div className="mt-6 flex justify-end">
            {currentStep !== "complete" ? (
              <button
                onClick={handleNextStep}
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : currentStep === "settings" ? (
                  "Complete Setup"
                ) : (
                  "Next"
                )}
              </button>
            ) : (
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 