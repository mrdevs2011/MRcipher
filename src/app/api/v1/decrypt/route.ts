import { NextRequest } from 'next/server';
import { z } from 'zod';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';
import { decrypt } from '@/lib/crypto/encryption';
import { authenticateRequest } from '@/lib/middleware/apiKeyAuth';
import { applyCorsHeaders, getOriginHeader } from '@/lib/middleware/cors';
import { logUsage } from '@/lib/firestore/logs';
import { ApiError } from '@/lib/utils/errors';
import {
  errorResponse,
  logServerError,
  successResponse,
} from '@/lib/utils/response';

/**
 * POST /api/v1/decrypt
 *
 * Decrypts a payload produced by /api/v1/encrypt and returns the original
 * JSON-serializable value.
 *
 * Headers:
 *   x-api-key  (required)
 *   origin     (required for cross-origin browser requests)
 *
 * Body:
 *   {
 *     "content": { ciphertext, iv, tag, version },
 *     "user_context": "optional public label"
 *   }
 */

const encryptedPayloadSchema = z.object({
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  tag: z.string().min(1),
  version: z.literal('v1'),
});

const decryptRequestSchema = z.object({
  content: encryptedPayloadSchema,
  user_context: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  const origin = getOriginHeader(req);

  try {
    const body = await req.json();
    const parsed = decryptRequestSchema.safeParse(body);

    if (!parsed.success) {
      throw new ApiError(
        parsed.error.errors.map((e) => e.message).join('; '),
        400,
        'VALIDATION_ERROR',
      );
    }

    const { apiKeyDoc } = await authenticateRequest(req);
    const allowedOrigin = origin ?? apiKeyDoc.allowed_domains[0] ?? '*';

    const serialized = decrypt(parsed.data.content, apiKeyDoc.user_id);
    const bytesIn = Buffer.byteLength(
      JSON.stringify(parsed.data.content),
      'utf8',
    );
    const bytesOut = Buffer.byteLength(serialized, 'utf8');

    let content: unknown;
    try {
      content = JSON.parse(serialized);
    } catch {
      throw new ApiError(
        'Decrypted payload is not valid JSON',
        500,
        'PAYLOAD_DECODE_ERROR',
      );
    }

    logUsage({
      api_key_id: apiKeyDoc.id,
      user_id: apiKeyDoc.user_id,
      endpoint: 'decrypt',
      status: 'success',
      bytes_in: bytesIn,
      bytes_out: bytesOut,
      origin: origin ?? undefined,
      ip: req.ip ?? undefined,
    }).catch((err) => logServerError('Usage log failed', err));

    const response = successResponse(
      content,
      {
        bytes_in: bytesIn,
        bytes_out: bytesOut,
      },
      { status: 200 },
    );

    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Decrypt endpoint error', err, {
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
