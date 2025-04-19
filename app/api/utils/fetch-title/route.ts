import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/utils/fetch-title - Fetch the title of a webpage
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');
  
  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }
  
  try {
    // Validate URL format
    new URL(url);
    
    // Fetch the URL
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'OpenUptimes Title Fetcher',
      },
      // Short timeout to prevent long-running requests
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type') || '';
    
    // Only process HTML content
    if (!contentType.includes('text/html')) {
      return NextResponse.json({ title: null });
    }
    
    // Get the HTML content
    const html = await response.text();
    
    // Extract the title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    return NextResponse.json({
      title: titleMatch ? titleMatch[1].trim() : null
    });
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to fetch webpage title' },
      { status: 500 }
    );
  }
} 