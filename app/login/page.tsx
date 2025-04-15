"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

// The inner component that uses useSearchParams
function LoginForm() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset password states
  const [isResetMode, setIsResetMode] = useState(false);
  const [redisUrl, setRedisUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const from = searchParams.get('from') || '/admin';
  
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      
      // Parse the response data
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      // Add timestamp to bust cache and prevent old redirects
      const redirectUrl = `${from}?t=${Date.now()}`;
      
      // Ensure cookie is set before redirect with a slight delay
      setTimeout(() => {
        // Use window.location for a full page reload to ensure cookies are applied
        window.location.href = redirectUrl;
      }, 500);
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setIsLoading(false);
    }
  }
  
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetError(null);
    setIsResetting(true);
    
    // Validate inputs
    if (!redisUrl) {
      setResetError("Redis URL is required");
      setIsResetting(false);
      return;
    }
    
    if (!newPassword) {
      setResetError("New password is required");
      setIsResetting(false);
      return;
    }
    
    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters long");
      setIsResetting(false);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match");
      setIsResetting(false);
      return;
    }
    
    try {
      const response = await fetch('/api/admin/password/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          redisUrl,
          newPassword
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }
      
      // Clear form and show success message
      setRedisUrl("");
      setNewPassword("");
      setConfirmPassword("");
      setResetSuccess(true);
      
    } catch (err) {
      if (err instanceof Error) {
        setResetError(err.message);
      } else {
        setResetError('An unknown error occurred');
      }
    } finally {
      setIsResetting(false);
    }
  }
  
  function toggleMode() {
    setIsResetMode(!isResetMode);
    setResetError(null);
    setResetSuccess(false);
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {isResetMode ? "Reset Admin Password" : "Admin Login"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isResetMode 
              ? "Enter your Redis URL to verify your identity and set a new password" 
              : "Enter your password to access the admin area"}
          </p>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          {/* Login Form */}
          {!isResetMode && (
            <>
              {error && (
                <div className="mb-4 rounded-md bg-red-50 p-3 flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleLogin} className="space-y-4">
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
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Logging in...
                      </div>
                    ) : (
                      "Login"
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
          
          {/* Reset Password Form */}
          {isResetMode && (
            <>
              {resetSuccess ? (
                <div className="mb-4 rounded-md bg-green-50 p-4 text-center">
                  <p className="text-sm font-medium text-green-800 mb-2">Password Reset Successful!</p>
                  <p className="text-sm text-green-700">Your password has been reset successfully.</p>
                  <button
                    onClick={toggleMode}
                    className="mt-4 inline-flex items-center justify-center rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-200"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <>
                  {resetError && (
                    <div className="mb-4 rounded-md bg-red-50 p-3 flex items-start">
                      <AlertCircle className="h-4 w-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-600">{resetError}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label htmlFor="redis-url" className="block text-sm font-medium text-gray-700">
                        Redis Connection URL
                      </label>
                      <input
                        id="redis-url"
                        type="text"
                        value={redisUrl}
                        onChange={(e) => setRedisUrl(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                        placeholder="redis://username:password@host:port"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        This must match the REDIS_URL in your .env file
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
                        New Password
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        Must be at least 8 characters long
                      </p>
                    </div>
                    
                    <div>
                      <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                        Confirm Password
                      </label>
                      <div className="relative mt-1">
                        <input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <button
                        type="submit"
                        disabled={isResetting}
                        className="w-full rounded-md border border-transparent bg-black px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                      >
                        {isResetting ? (
                          <div className="flex items-center justify-center">
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            Resetting...
                          </div>
                        ) : (
                          "Reset Password"
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </>
          )}
          
          <div className="mt-4">
            <div className="flex justify-between items-center">
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Return to Status Page
              </Link>
              
              <button
                onClick={toggleMode}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {isResetMode ? "Back to Login" : "Forgot Password?"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component wrapped in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
} 