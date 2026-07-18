import { NextRequest } from 'next/server';
import { getDb } from '@/lib/firebase';
import { authenticateRequest } from '@/lib/middleware/apiKeyAuth';
import { applyCorsHeaders, getOriginHeader } from '@/lib/middleware/cors';
import { logUsage } from '@/lib/firestore/logs';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';
import {
  errorResponse,
  logServerError,
  successResponse,
} from '@/lib/utils/response';

/**
 * GET /api/v1/health
 *
 * Lightweight authenticated health check. Verifies that the caller's API key
 * is valid and that Firestore is reachable, without performing any encryption
 * or decryption work.
 *
 * Headers:
 *   Authorization: Bearer <apiKey>  (required)
 *   origin                         (required for cross-origin browser requests)
 */

export async function GET(req: NextRequest) {
  const origin = getOriginHeader(req);
  const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';

  try {
    const start = Date.now();
    const { uid, email } = await authenticateRequest(req);

    // Lightweight Firestore connectivity probe: count api_keys for this user.
    // This keeps the health endpoint meaningful without touching real data.
    const db = getDb();
    const probe = await db
      .collection('api_keys')
      .where('uid', '==', uid)
      .limit(1)
      .count()
      .get();

    const latencyMs = Date.now() - start;

    logUsage({
      uid,
      email,
      endpoint: 'health',
      status: 'success',
      bytes_in: 0,
      bytes_out: 0,
      origin: origin ?? undefined,
      ip: req.ip ?? undefined,
    }).catch((err) => logServerError('Health usage log failed', err));

    const response = successResponse(
      {
        status: 'ok',
        service: 'mrcipher',
        version: 'v1',
        latency_ms: latencyMs,
        firestore: probe.data().count >= 0 ? 'reachable' : 'unknown',
      },
      { status: 200 },
    );

    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Health endpoint error', err, {
      origin,
      method: req.method,
      path: req.nextUrl.pathname,
    });

    const response = errorResponse(err);
    return applyCorsHeaders(response, allowedOrigin);
  }
}
