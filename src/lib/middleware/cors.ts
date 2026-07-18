import { NextRequest, NextResponse } from 'next/server';
import { GLOBAL_ALLOWED_ORIGINS } from '../env';

/**
 * CORS helpers for API routes.
 *
 * Actual origin enforcement is performed per API key by `authenticateRequest`.
 * This module only adds the appropriate response headers once a request has
 * been authenticated.
 */

const CORS_METHODS = 'POST, OPTIONS';
const CORS_HEADERS = 'Content-Type, Authorization, x-api-key';
const MAX_AGE = '86400';

/**
 * Determine whether a preflight request should be answered for the given origin.
 * The global allow-list grants preflight for health checks and public docs.
 */
export function isOriginAllowedForPreflight(origin: string | null): boolean {
  if (!origin) return true;
  if (GLOBAL_ALLOWED_ORIGINS.length === 0) return true;
  return GLOBAL_ALLOWED_ORIGINS.includes(origin);
}

/**
 * Build a preflight response for OPTIONS requests.
 */
export function preflightResponse(origin?: string): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
  response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
  response.headers.set('Access-Control-Max-Age', MAX_AGE);

  if (origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Vary', 'Origin');
  }

  return response;
}

/**
 * Attach CORS headers to an existing response using the allowed origin.
 */
export function applyCorsHeaders(
  response: NextResponse,
  allowedOrigin: string,
): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
  response.headers.set('Vary', 'Origin');
  return response;
}

/**
 * Extract the origin from a request for CORS purposes.
 */
export function getOriginHeader(req: NextRequest): string | null {
  return req.headers.get('origin');
}
