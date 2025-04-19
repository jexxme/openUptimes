/**
 * Edge-compatible auth utilities
 * These functions only use APIs available in the Edge Runtime
 */

/**
 * Parse a token from a cookie string
 */
export function parseTokenFromCookie(cookieStr?: string): string | null {
  const requestId = Date.now().toString().substring(8);

  if (!cookieStr) {

    return null;
  }
  
  // Try to find authToken in different cookie formats
  const regularMatch = cookieStr.match(/authToken=([^;]+)/);
  const quotedMatch = cookieStr.match(/authToken="([^"]+)"/);
  const match = regularMatch || quotedMatch;
  
  if (match) {

    return match[1];
  }
  
  // If no authToken found, log all cookies for debugging

  try {
    const cookies = cookieStr.split(';').map(c => c.trim());
    cookies.forEach(cookie => {
      const [name] = cookie.split('=');

    });
  } catch (error) {

  }
  
  return null;
} 