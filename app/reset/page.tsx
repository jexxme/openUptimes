"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResetPage() {
  const router = useRouter();
  const [resetting, setResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setError(null);
    
    try {
      const response = await fetch('/api/setup/reset', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Reset failed');
      }
      
      setResetComplete(true);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Reset OpenUptimes</h1>
          <p className="mt-1 text-sm text-gray-500">
            This will reset your setup and allow you to start again
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          
          {resetComplete ? (
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
              
              <h2 className="text-lg font-medium text-gray-900">Reset Complete!</h2>
              
              <p className="text-sm text-gray-500">
                Your application has been reset. You can now go through the setup process again.
              </p>
              
              <div className="mt-4">
                <button
                  onClick={() => router.push('/')}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
                >
                  Go to Setup
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-700">
                This will reset your OpenUptimes installation to its initial state. You will need to:
              </p>
              
              <ul className="ml-5 list-disc space-y-1 text-gray-700">
                <li>Go through the setup wizard again</li>
                <li>Create a new admin password</li>
                <li>Reconfigure site settings</li>
              </ul>
              
              <div className="mt-6 rounded-md bg-red-50 p-3 text-sm text-red-600">
                <strong>Warning:</strong> This action cannot be undone. All your login credentials will be reset.
              </div>
              
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => router.push('/')}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                >
                  {resetting ? (
                    <div className="flex items-center">
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Resetting...
                    </div>
                  ) : (
                    "Reset Application"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 