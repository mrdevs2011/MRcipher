import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getDb } from '@/lib/firebase';
import { authenticateRequest } from '@/lib/middleware/apiKeyAuth';
import { applyCorsHeaders, getOriginHeader } from '@/lib/middleware/cors';
import { logUsage } from '@/lib/firestore/logs';
import { GLOBAL_ALLOWED_ORIGINS } from '@/lib/env';
import { ApiError } from '@/lib/utils/errors';
import {
  errorResponse,
  logServerError,
  successResponse,
} from '@/lib/utils/response';
import type { UsageStats } from '@/lib/types';

/**
 * GET /api/v1/usage
 *
 * Returns per-user usage statistics. Data is sourced from a Firestore
 * aggregate document so the endpoint stays fast even with large log volumes.
 *
 * Headers:
 *   Authorization: Bearer <apiKey>  (required)
 *   origin                         (required for cross-origin browser requests)
 *
 * Query params:
 *   period = '24h' | '7d' | '30d' | 'all'  (default: 'all')
 *
 * Response:
 *   {
 *     "success": true,
 *     "data": {
 *       "period": "all",
 *       "total_encrypts": 0,
 *       "total_decrypts": 0,
 *       "total_errors": 0,
 *       "last_request_at": "..."
 *     }
 *   }
 */

const USAGE_PERIODS = ['24h', '7d', '30d', 'all'] as const;

const usageQuerySchema = z.object({
  period: z.enum(USAGE_PERIODS).default('all'),
});

export async function GET(req: NextRequest) {
  const origin = getOriginHeader(req);
  const allowedOrigin = origin ?? GLOBAL_ALLOWED_ORIGINS[0] ?? '*';

  try {
    const { uid, email } = await authenticateRequest(req, 'usage');

    const rawPeriod = req.nextUrl.searchParams.get('period') ?? 'all';
    const parsed = usageQuerySchema.safeParse({ period: rawPeriod });
    if (!parsed.success) {
      throw new ApiError(
        `Invalid period. Must be one of: ${USAGE_PERIODS.join(', ')}`,
        400,
        'VALIDATION_ERROR',
      );
    }

    const period = parsed.data.period;
    const stats = await getUsageStats(uid, period);

    logUsage({
      uid,
      email,
      endpoint: 'usage',
      status: 'success',
      bytes_in: 0,
      bytes_out: 0,
      origin: origin ?? undefined,
      ip: req.ip ?? undefined,
    }).catch((err) => logServerError('Usage log failed', err));

    const response = successResponse({ period, ...stats }, { status: 200 });
    return applyCorsHeaders(response, allowedOrigin);
  } catch (err) {
    logServerError('Usage endpoint error', err, {
      origin,
      method: req.method,
      path: req.nextUrl.pathname,
    });

    const response = errorResponse(err);
    return applyCorsHeaders(response, allowedOrigin);
  }
}

async function getUsageStats(uid: string, period: string): Promise<UsageStats> {
  const db = getDb();

  // Try to read the pre-computed aggregate first.
  const aggregateRef = db.collection('usage_aggregates').doc(uid);
  const aggregate = await aggregateRef.get();

  if (!aggregate.exists && period === 'all') {
    // Fallback for users without an aggregate yet: count logs directly.
    return fallbackStatsFromLogs(uid);
  }

  if (!aggregate.exists) {
    // Period-based requests with no aggregate: return zeros.
    return {
      total_encrypts: 0,
      total_decrypts: 0,
      total_health_checks: 0,
      total_errors: 0,
      last_request_at: undefined,
    };
  }

  const data = aggregate.data() as {
    total_encrypts?: number;
    total_decrypts?: number;
    total_health_checks?: number;
    total_errors?: number;
    last_request_at?: FirebaseFirestore.Timestamp | string;
    updated_at?: FirebaseFirestore.Timestamp | string;
  };

  return {
    total_encrypts: data.total_encrypts ?? 0,
    total_decrypts: data.total_decrypts ?? 0,
    total_health_checks: data.total_health_checks ?? 0,
    total_errors: data.total_errors ?? 0,
    last_request_at:
      data.last_request_at instanceof Object && 'toDate' in data.last_request_at
        ? data.last_request_at.toDate().toISOString()
        : typeof data.last_request_at === 'string'
          ? data.last_request_at
          : undefined,
  };
}

async function fallbackStatsFromLogs(uid: string): Promise<UsageStats> {
  const db = getDb();
  const snapshot = await db
    .collection('logs')
    .where('uid', '==', uid)
    .where('status', '==', 'success')
    .select('endpoint')
    .get();

  let encrypts = 0;
  let decrypts = 0;

  snapshot.docs.forEach((doc) => {
    const ep = doc.get('endpoint');
    if (ep === 'encrypt') encrypts += 1;
    if (ep === 'decrypt') decrypts += 1;
  });

  return {
    total_encrypts: encrypts,
    total_decrypts: decrypts,
    total_health_checks: 0,
    total_errors: 0,
    last_request_at: undefined,
  };
}
