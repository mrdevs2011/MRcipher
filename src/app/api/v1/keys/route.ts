import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getAuthInstance } from '@/lib/firebase';
import {
  createOrUpdateUser,
  createApiKey,
  listApiKeysByUser,
  revokeApiKey,
  deleteApiKey,
  updateApiKey,
} from '@/lib/firestore/users';
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
 * GET /api/v1/keys
 *
 * Returns all API keys for the authenticated user.
 * Raw API keys are never returned; only public metadata is shown.
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>  (required)
 */

/**
 * POST /api/v1/keys
 *
 * Creates a new API key for the authenticated Firebase user.
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>  (required)
 *   origin                                       (required for cross-origin browser requests)
 *
 * Body:
 *   {
 *     "name": "Production server",
 *     "allowed_origins": ["https://example.com"]  // optional
 *   }
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "apiKey": "mr_...",
 *       "key": { id, name, prefix, created_at, revoked, allowed_origins }
 *     }
 *   }
 */

/**
 * PATCH /api/v1/keys?id=<docId>
 *
 * Updates API key metadata (name and/or allowed_origins).
 *
 * Body:
 *   {
 *     "name": "Updated name",
 *     "allowed_origins": ["https://example.com"]
 *   }
 */

/**
 * DELETE /api/v1/keys?id=<docId>
 *
 * Permanently deletes an API key. Only the owner can delete their own key.
 */

const SCOPE_VALUES = ['encrypt', 'decrypt', 'health', 'usage'] as const;

const createKeySchema = z.object({
  name: z
    .string()
    .min(1, 'API key nomi kiritilishi shart')
    .max(100, 'API key nomi 100 ta belgidan oshmasligi kerak'),
  allowed_origins: z.array(z.string()).max(10).optional(),
  allowed_ips: z.array(z.string()).max(10).optional(),
  scopes: z.array(z.enum(SCOPE_VALUES)).max(4).optional(),
});

const updateKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  allowed_origins: z.array(z.string()).max(10).optional(),
  allowed_ips: z.array(z.string()).max(10).optional(),
  scopes: z.array(z.enum(SCOPE_VALUES)).max(4).optional(),
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
    const keys = await listApiKeysByUser(uid);
    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';

    const response = successResponse({ keys }, { status: 200 });
    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('List keys endpoint error', err, {
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

export async function POST(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    assertJsonContentType(req);
    assertBodySizeAllowed(req);

    const { uid, email, name } = await verifyIdTokenFromHeader(req);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(
        'Invalid JSON body. Expected: { "name": "..." }',
        400,
        'VALIDATION_ERROR',
      );
    }

    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.errors.map((e) => e.message).join('; '),
        400,
        'VALIDATION_ERROR',
      );
    }

    // Ensure user metadata exists in Firestore.
    await createOrUpdateUser({ uid, email, displayName: name });

    const { rawKey, publicView } = await createApiKey({
      uid,
      email,
      name: parsed.data.name,
      allowedOrigins: parsed.data.allowed_origins,
      allowedIps: parsed.data.allowed_ips,
      scopes: parsed.data.scopes,
    });

    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';
    const response = successResponse(
      {
        apiKey: rawKey,
        key: publicView,
      },
      { status: 201 },
    );

    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Create key endpoint error', err, {
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
    const docId = req.nextUrl.searchParams.get('id');
    if (!docId) {
      throw new ApiError('Missing key id query parameter', 400, 'VALIDATION_ERROR');
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new ApiError(
        'Invalid JSON body. Expected: { "name"?: "...", "allowed_origins"?: [...], "allowed_ips"?: [...], "scopes"?: [...] }',
        400,
        'VALIDATION_ERROR',
      );
    }

    const parsed = updateKeySchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(
        parsed.error.errors.map((e) => e.message).join('; '),
        400,
        'VALIDATION_ERROR',
      );
    }

    const ok = await updateApiKey(uid, docId, {
      name: parsed.data.name,
      allowed_origins: parsed.data.allowed_origins,
      allowed_ips: parsed.data.allowed_ips,
      scopes: parsed.data.scopes,
    });
    if (!ok) {
      throw new ApiError(
        'API key not found or you do not have permission to update it',
        404,
        'NOT_FOUND',
      );
    }

    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';
    const response = successResponse({ updated: true }, { status: 200 });
    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Update key endpoint error', err, {
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

export async function DELETE(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    const { uid } = await verifyIdTokenFromHeader(req);
    const docId = req.nextUrl.searchParams.get('id');
    if (!docId) {
      throw new ApiError('Missing key id query parameter', 400, 'VALIDATION_ERROR');
    }

    const ok = await deleteApiKey(uid, docId);
    if (!ok) {
      throw new ApiError(
        'API key not found or you do not have permission to delete it',
        404,
        'NOT_FOUND',
      );
    }

    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';
    const response = successResponse({ deleted: true }, { status: 200 });
    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Delete key endpoint error', err, {
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
