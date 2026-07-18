import { NextRequest } from 'next/server';
import { getAuthInstance } from '@/lib/firebase';
import { generateApiKey } from '@/lib/config';
import { createOrUpdateUser } from '@/lib/firestore/users';
import { applyCorsHeaders, getOriginHeader } from '@/lib/middleware/cors';
import { ApiError } from '@/lib/utils/errors';
import {
  errorResponse,
  logServerError,
  successResponse,
} from '@/lib/utils/response';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';

/**
 * POST /api/v1/keys
 *
 * Creates a new API key for the authenticated Firebase user.
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>  (required)
 *   origin                                       (required for cross-origin browser requests)
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "apiKey": "mr_...",
 *       "prefix": "..."
 *     }
 *   }
 *
 * The raw API key is returned exactly once. Only its SHA-256 hash is stored.
 */

export async function POST(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new ApiError(
        'Missing Authorization header. Expected: Bearer <firebase-id-token>',
        401,
        'UNAUTHORIZED',
      );
    }

    const [scheme, idToken] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !idToken) {
      throw new ApiError(
        'Invalid Authorization header format',
        401,
        'UNAUTHORIZED',
      );
    }

    let decoded;
    try {
      decoded = await getAuthInstance().verifyIdToken(idToken);
    } catch (err) {
      console.error('[MRcipher] ID token verification failed:', err);
      throw new ApiError(
        'Invalid or expired Firebase ID token',
        401,
        'UNAUTHORIZED',
      );
    }

    if (!decoded.uid) {
      throw new ApiError(
        'Token does not contain a user identifier',
        401,
        'UNAUTHORIZED',
      );
    }

    const rawKey = generateApiKey();
    const { rawKey: returnedKey, prefix } = await createOrUpdateUser({
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      displayName: decoded.name ?? undefined,
      apiKey: rawKey,
    });

    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';
    const response = successResponse(
      {
        apiKey: returnedKey,
        prefix,
        email: decoded.email,
      },
      { status: 201 },
    );

    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Keys endpoint error', err, {
      origin,
      method: req.method,
      path: req.nextUrl.pathname,
    });

    const response = errorResponse(err);
    return applyCorsHeaders(
      response,
      origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*',
    );
  }
}
