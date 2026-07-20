import { NextRequest } from 'next/server';
import { applyCorsHeaders, getOriginHeader, preflightResponse } from '@/lib/middleware/cors';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';
import { errorResponse, logServerError, successResponse } from '@/lib/utils/response';
import { ApiError } from '@/lib/utils/errors';

/**
 * GET /api/v1/auth-config
 *
 * Public, unauthenticated endpoint. Returns the Firebase Web SDK
 * configuration values needed to sign in directly against the Identity
 * Toolkit REST API (used by mrcipher-cli's `mrcipher login`, which prompts
 * for email/password in the terminal instead of opening a browser).
 *
 * These values are NOT secrets — they are the same NEXT_PUBLIC_FIREBASE_*
 * values already embedded in this site's public client-side JS bundle.
 * Firebase Web API keys only identify the project; access is enforced by
 * Firebase Auth + Firestore security rules, not by keeping this key private.
 */

export async function OPTIONS(req: NextRequest) {
  return preflightResponse(getOriginHeader(req) ?? undefined);
}

export async function GET(req: NextRequest) {
  const origin = getOriginHeader(req);
  const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';

  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!apiKey || !authDomain || !projectId) {
      throw new ApiError(
        'Server Firebase konfiguratsiyasi to\'liq emas.',
        500,
        'CONFIG_MISSING',
      );
    }

    const response = successResponse({
      firebaseApiKey: apiKey,
      authDomain,
      projectId,
    });

    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('auth-config endpoint error', err, {
      origin,
      method: req.method,
      path: req.nextUrl.pathname,
    });

    const response = errorResponse(err);
    return applyCorsHeaders(response, allowedOrigin);
  }
}
