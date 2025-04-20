"use client";

import { useState, Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, AlertTriangle, ArrowLeft } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { cn } from "@/lib/utils";

// Import Shadcn components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

// Debug utility
function logDebug(message: string, ...args: any[]) {
  // Empty implementation
}

// The inner component that uses useSearchParams
function LoginForm() {
  const searchParams = useSearchParams();
  const { theme } = useTheme();
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
  
  const from = searchParams?.get('from') || '/admin';
  const timestamp = searchParams?.get('t');
  
  // Log query params on component mount
  useEffect(() => {
    logDebug('Component mounted with params:', { from, timestamp });
    document.cookie.split(';').forEach(cookie => {
      logDebug('Cookie found:', cookie.trim());
    });
  }, [from, timestamp]);
  
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    logDebug('Login form submitted');
    
    try {
      logDebug('Making login API request...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({ password }),
        credentials: 'include' // Important to include cookies in the request
      });
      
      // Parse the response data
      const data = await response.json();
      logDebug('Login API response received', { status: response.status, ok: response.ok });
      
      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }
      
      logDebug('Login successful, response:', data);
      logDebug('Will redirect to:', from);
      
      // Check cookies after login
      logDebug('Cookies after login:');
      document.cookie.split(';').forEach(cookie => {
        logDebug('Cookie:', cookie.trim());
      });
      
      // Verify the session was created successfully before redirecting
      try {
        logDebug('Verifying session...');
        
        // Use a short delay to ensure cookie is set first
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const verifyResponse = await fetch('/api/auth/validate', {
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          credentials: 'include'
        });
        
        const verifyData = await verifyResponse.json();
        logDebug('Session verification response:', { status: verifyResponse.status, data: verifyData });
        
        if (!verifyData.valid) {
          throw new Error('Session creation failed');
        }
        
        // For debug pages, include special handling
        if (from.includes('/debug/ping/cron')) {
          logDebug('Redirecting to cron debug page');
          // Use window.location for a full page reload to ensure cookies are applied
          window.location.href = `${from}?t=${Date.now()}`;
          return;
        }
        
        // Add timestamp to bust cache and prevent old redirects
        const redirectUrl = `${from}?t=${Date.now()}`;
        logDebug('Redirecting to:', redirectUrl);
        
        // Use window.location for a full page reload to ensure cookies are applied
        window.location.href = redirectUrl;
      } catch (verifyError) {
        logDebug('Session verification failed:', verifyError);
        throw new Error('Login succeeded but session verification failed. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      logDebug('Login error:', errorMessage);
      
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          {isResetMode ? (
            <>
              <CardHeader className="space-y-1 pb-2">
                <div className="flex items-center mb-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 mr-2"
                    onClick={toggleMode}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back to login</span>
                  </Button>
                  <h1 className="text-2xl font-semibold">Reset Password</h1>
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your Redis URL to verify your identity and set a new password
                </p>
              </CardHeader>
              
              <CardContent>
                {resetSuccess ? (
                  <div className="mb-4 rounded-md bg-green-100 dark:bg-green-900/20 p-4 text-center">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Password Reset Successful!</p>
                    <p className="text-sm text-green-700 dark:text-green-400">Your password has been reset successfully.</p>
                    <Button
                      onClick={toggleMode}
                      className="mt-4"
                      variant="outline"
                    >
                      Return to Login
                    </Button>
                  </div>
                ) : (
                  <>
                    {resetError && (
                      <div className="mb-4 rounded-md bg-destructive/10 p-3 flex items-start">
                        <AlertTriangle className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-destructive">{resetError}</p>
                      </div>
                    )}
                    
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1">
                        <label htmlFor="redis-url" className="text-sm font-medium text-foreground">
                          Redis Connection URL
                        </label>
                        <Input
                          id="redis-url"
                          type="text"
                          value={redisUrl}
                          onChange={(e) => setRedisUrl(e.target.value)}
                          className="w-full"
                          placeholder="redis://username:password@host:port"
                          required
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          This must match the REDIS_URL in your .env file
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                          New Password
                        </label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pr-10"
                            placeholder="Enter new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Must be at least 8 characters long
                        </p>
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pr-10"
                            placeholder="Confirm new password"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isResetting}
                        variant="default"
                      >
                        {isResetting ? (
                          <div className="flex items-center justify-center">
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                            Resetting...
                          </div>
                        ) : (
                          "Reset Password"
                        )}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-1 pb-2">
                <h1 className="text-2xl font-semibold">Admin Login</h1>
                <p className="text-sm text-muted-foreground">
                  Enter your password to access the admin area
                </p>
              </CardHeader>
              
              <CardContent>
                {error && (
                  <div className="mb-4 rounded-md bg-destructive/10 p-3 flex items-start">
                    <AlertCircle className="h-4 w-4 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                        Logging in...
                      </div>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </CardContent>
              
              <CardFooter className="flex justify-between pb-4 pt-0">
                <Link
                  href="/"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Return to Status Page
                </Link>
                
                <button
                  onClick={toggleMode}
                  className="text-sm text-primary hover:text-primary/90 transition-colors"
                  type="button"
                >
                  Forgot Password?
                </button>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
      
      {/* Simplified footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        openUptimes
      </div>
    </div>
  );
}

// Main component wrapped in Suspense
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
} 