import { NextRequest, NextResponse } from 'next/server';
import {
  getOriginHeader,
  isOriginAllowedForPreflight,
  preflightResponse,
} from './lib/middleware/cors';

/**
 * Global Next.js middleware for API routes.
 *
 * Responsibilities:
 * - Answer CORS preflight (OPTIONS) requests.
 * - Reject requests that arrive without an `x-api-key` header before they
 *   reach the route handler.
 *
 * Full API-key + origin validation happens inside each route handler so that
 * the response can include the exact allowed origin in its CORS headers and
 * to prevent spoofing of any internal context header.
 */

export const config = {
  matcher: ['/api/v1/:path*'],
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const origin = getOriginHeader(req);

  // Handle CORS preflight. We allow preflight broadly because the actual
  // request will still require a valid API key and allowed origin.
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowedForPreflight(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    return preflightResponse(origin ?? undefined);
  }

  // Early presence check for the API key.
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    const response = NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'Missing x-api-key header',
        },
      },
      { status: 401 },
    );
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Vary', 'Origin');
    }
    return response;
  }

  return NextResponse.next();
}
