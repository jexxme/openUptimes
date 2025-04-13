import { jwtVerify } from 'jose';

// This checks if a Vercel OIDC token is valid for admin access
export async function verifyAdmin(token: string): Promise<boolean> {
  try {
    if (!process.env.VERCEL_OIDC_TOKEN) {
      // For development, if the admin token isn't set, we'll allow access
      console.warn('ADMIN_TOKEN not set, allowing admin access by default');
      return true;
    }

    // In production, we'll verify the token against the allowed admin token
    return token === process.env.VERCEL_OIDC_TOKEN;
  } catch (error) {
    console.error('Admin verification error:', error);
    return false;
  }
}

// Get Vercel login URL (for production you might want to set this up properly)
export function getVercelLoginUrl(redirectUrl: string): string {
  return `https://vercel.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_VERCEL_CLIENT_ID || 'vercel'}&redirect_uri=${encodeURIComponent(redirectUrl)}`;
} 