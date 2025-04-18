/**
 * Edge-compatible auth utilities
 * These functions only use APIs available in the Edge Runtime
 */

/**
 * Parse a token from a cookie string
 */
export function parseTokenFromCookie(cookieStr?: string): string | null {
  const requestId = Date.now().toString().substring(8);
  console.log(`[EdgeAuth:${requestId}] Parsing cookies from: ${cookieStr || 'empty cookie string'}`);
  
  if (!cookieStr) {
    console.log(`[EdgeAuth:${requestId}] No cookie string provided`);
    return null;
  }
  
  // Try to find authToken in different cookie formats
  const regularMatch = cookieStr.match(/authToken=([^;]+)/);
  const quotedMatch = cookieStr.match(/authToken="([^"]+)"/);
  const match = regularMatch || quotedMatch;
  
  if (match) {
    console.log(`[EdgeAuth:${requestId}] Found authToken cookie, token: ${match[1].substring(0, 6)}...`);
    return match[1];
  }
  
  // If no authToken found, log all cookies for debugging
  console.log(`[EdgeAuth:${requestId}] No authToken cookie found. Available cookies:`);
  try {
    const cookies = cookieStr.split(';').map(c => c.trim());
    cookies.forEach(cookie => {
      const [name] = cookie.split('=');
      console.log(`[EdgeAuth:${requestId}] Cookie: ${name}`);
    });
  } catch (error) {
    console.error(`[EdgeAuth:${requestId}] Error parsing cookies:`, error);
  }
  
  return null;
} 