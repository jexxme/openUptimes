/**
 * Edge-compatible auth utilities
 * These functions only use APIs available in the Edge Runtime
 */

/**
 * Parse a token from a cookie string
 */
export function parseTokenFromCookie(cookieStr?: string): string | null {
  if (!cookieStr) return null;
  
  const match = cookieStr.match(/authToken=([^;]+)/);
  return match ? match[1] : null;
} 