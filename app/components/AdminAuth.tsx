"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AdminAuthProps {
  children: React.ReactNode;
}

export function AdminAuth({ children }: AdminAuthProps) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  useEffect(() => {
    // Check for token in local storage
    const storedToken = localStorage.getItem('adminToken');
    
    const verifyAdmin = async (tokenToVerify: string) => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: tokenToVerify }),
        });
        
        const data = await response.json();
        
        if (data.success && data.isAdmin) {
          localStorage.setItem('adminToken', tokenToVerify);
          setIsAdmin(true);
        } else {
          localStorage.removeItem('adminToken');
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Admin verification error:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    // If we have a token from the URL, verify it
    if (token) {
      verifyAdmin(token);
    } 
    // Otherwise, check if we have a stored token
    else if (storedToken) {
      verifyAdmin(storedToken);
    } else {
      setIsAdmin(false);
      setIsLoading(false);
    }
  }, [token]);
  
  const handleVercelLogin = () => {
    // For simplicity, we're just copying the token for now
    // In a production app, you'd implement proper Vercel OAuth
    const userToken = prompt("Enter your Vercel OIDC token (from .env.local):");
    if (userToken) {
      localStorage.setItem('adminToken', userToken);
      window.location.reload();
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 border-t-blue-500"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border p-6">
        <h2 className="text-lg font-medium">Admin Access Required</h2>
        <p className="text-center text-sm text-gray-500">
          You need to authenticate with Vercel to access the admin area.
        </p>
        <button
          onClick={handleVercelLogin}
          className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 76 65"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="mr-2"
          >
            <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" fill="#ffffff" />
          </svg>
          Login with Vercel
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
} 