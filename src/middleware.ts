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
 *
 * Firebase ID token verification happens inside each route handler so that
 * the response can include the exact origin in its CORS headers and to
 * prevent spoofing of any internal context header.
 */

export const config = {
  matcher: ['/api/v1/:path*'],
};

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const origin = getOriginHeader(req);

  // Handle CORS preflight. We allow preflight broadly because the actual
  // request still requires a valid Firebase ID token.
  if (req.method === 'OPTIONS') {
    if (!isOriginAllowedForPreflight(origin)) {
      return new NextResponse(null, { status: 403 });
    }
    return preflightResponse(origin ?? undefined);
  }

  return NextResponse.next();
}
