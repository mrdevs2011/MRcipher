import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthInstance } from '@/lib/firebase';
import { getUserPreference, saveUserPreference } from '@/lib/firestore/users';
import { applyCorsHeaders, getOriginHeader } from '@/lib/middleware/cors';
import { ApiError } from '@/lib/utils/errors';
import {
  errorResponse,
  logServerError,
  successResponse,
} from '@/lib/utils/response';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';
import {
  assertBodySizeAllowed,
  assertJsonContentType,
} from '@/lib/utils/validation';

/**
 * GET /api/v1/preferences
 *
 * Returns the authenticated user's translator preferences.
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>  (required)
 */

/**
 * PATCH /api/v1/preferences
 *
 * Updates the authenticated user's translator preferences.
 *
 * Body:
 *   {
 *     "selected_api_key_id": "fresh" | "<api-key-doc-id>"
 *   }
 */

const preferenceSchema = z.object({
  selected_api_key_id: z.string().min(1),
});

async function verifyIdTokenFromHeader(
  req: NextRequest,
): Promise<{
  uid: string;
  email?: string;
  name?: string;
}> {
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

  try {
    const decoded = await getAuthInstance().verifyIdToken(idToken);
    if (!decoded.uid) {
      throw new ApiError(
        'Token does not contain a user identifier',
        401,
        'UNAUTHORIZED',
      );
    }
    return {
      uid: decoded.uid,
      email: decoded.email ?? undefined,
      name: decoded.name ?? undefined,
    };
  } catch (err) {
    console.error('[MRcipher] ID token verification failed:', err);
    throw new ApiError(
      'Invalid or expired Firebase ID token',
      401,
      'UNAUTHORIZED',
    );
  }
}

export async function GET(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    const { uid } = await verifyIdTokenFromHeader(req);
    const preference = await getUserPreference(uid);
    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';

    const response = successResponse(
      { preference: preference ?? { selected_api_key_id: 'fresh' } },
      { status: 200 },
    );
    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Get preferences endpoint error', err, {
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

export async function PATCH(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    assertJsonContentType(req);
    assertBodySizeAllowed(req);

    const { uid } = await verifyIdTokenFromHeader(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(
        'Invalid JSON body. Expected: { "selected_api_key_id": "..." }',
        400,
        'VALIDATION_ERROR',
      );
    }

    const parsed = preferenceSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.errors.map((e) => e.message).join('; '),
        400,
        'VALIDATION_ERROR',
      );
    }

    await saveUserPreference(uid, parsed.data.selected_api_key_id);

    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';
    const response = successResponse({ saved: true }, { status: 200 });
    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Save preferences endpoint error', err, {
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
