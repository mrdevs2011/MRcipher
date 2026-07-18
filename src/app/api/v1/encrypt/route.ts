import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';
import { encrypt } from '@/lib/crypto/encryption';
import { authenticateRequest } from '@/lib/middleware/apiKeyAuth';
import { applyCorsHeaders, getOriginHeader } from '@/lib/middleware/cors';
import { logUsage } from '@/lib/firestore/logs';
import { ApiError } from '@/lib/utils/errors';
import {
  errorResponse,
  logServerError,
  successResponse,
} from '@/lib/utils/response';
import {
  assertBodySizeAllowed,
  assertJsonContentType,
} from '@/lib/utils/validation';

/**
 * POST /api/v1/encrypt
 *
 * Encrypts any JSON-serializable payload using AES-256-GCM.
 *
 * Headers:
 *   Authorization: Bearer <apiKey>  (required)
 *   origin                         (required for cross-origin browser requests)
 *
 * Body:
 *   {
 *     "content": <any JSON value>
 *   }
 */

const encryptRequestSchema = z.object({
  content: z.unknown().refine((val: unknown) => {
    try {
      JSON.stringify(val);
      return true;
    } catch {
      return false;
    }
  }, 'content must be JSON-serializable'),
});

export async function POST(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    assertJsonContentType(req);
    assertBodySizeAllowed(req);

    const body = await req.json();
    const parsed = encryptRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        parsed.error.errors.map((e) => e.message).join('; '),
        400,
        'VALIDATION_ERROR',
      );
    }

    const { uid, email } = await authenticateRequest(req, 'encrypt');
    const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';

    const serialized = JSON.stringify(parsed.data.content);
    const bytesIn = Buffer.byteLength(serialized, 'utf8');

    // Validate runtime configuration without exposing secret values.
    if (!process.env.ENCRYPTION_MASTER_KEY) {
      throw new ApiError(
        'Server configuration is incomplete',
        500,
        'CONFIGURATION_ERROR',
      );
    }

    // Derive the encryption key from the Firebase Auth uid.
    const encrypted = encrypt(serialized, uid);

    const bytesOut = Buffer.byteLength(
      JSON.stringify(encrypted),
      'utf8',
    );

    // Fire-and-forget usage log.
    logUsage({
      uid,
      email,
      endpoint: 'encrypt',
      status: 'success',
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      origin: origin ?? undefined,
      ip: req.ip ?? undefined,
    }).catch((err) => logServerError('Usage log failed', err));

    const response = successResponse(
      encrypted,
      {
        bytes_in: bytesIn,
        bytes_out: bytesOut,
      },
      { status: 200 },
    );

    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Encrypt endpoint error', err, {
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
