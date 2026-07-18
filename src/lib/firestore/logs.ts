import { getDb } from '../firebase';
import { COLLECTION_LOGS } from '../config';
import { UsageLogDocInput, UsageAggregateDoc } from '../types';
import { FieldValue } from '../firebase';

/**
 * Best-effort usage logging to Firestore.
 *
 * Logging failures are captured server-side only and never exposed to the client,
 * so that a logging outage cannot break encryption/decryption operations.
 */

/**
 * Strip the last octet of an IPv4 address or last 80 bits of an IPv6 address
 * to reduce privacy risk while still retaining rough attribution.
 */
function anonymizeIp(ip?: string): string | undefined {
  if (!ip) return undefined;

  // IPv4
  if (ip.includes('.') && !ip.includes(':')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  // IPv6: keep first 48 bits (3 hextets) and mask the rest.
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 3) {
      return `${parts[0]}:${parts[1]}:${parts[2]}::/48`;
    }
  }

  return undefined;
}

/**
 * Write a usage log entry.
 */
export async function logUsage(entry: UsageLogDocInput): Promise<void> {
  try {
    await getDb().collection(COLLECTION_LOGS).add({
      ...entry,
      ip: anonymizeIp(entry.ip),
      created_at: new Date().toISOString(),
    });

    // Best-effort aggregate update so /api/v1/usage stays fast.
    updateUsageAggregate(entry.uid, entry.endpoint, entry.status).catch((err) =>
      console.error('[MRcipher] Failed to update usage aggregate:', err),
    );
  } catch (err) {
    // Server-side only; never leak logging failures.
    console.error('[MRcipher] Failed to write usage log:', err);
  }
}

const COLLECTION_AGGREGATES = 'usage_aggregates';

/**
 * Increment per-user usage aggregates.
 *
 * Firestore counters are updated with FieldValue.increment so concurrent
 * requests do not race. This is best-effort: failures are logged but never
 * returned to the client.
 */
async function updateUsageAggregate(
  uid: string,
  endpoint: UsageLogDocInput['endpoint'],
  status: UsageLogDocInput['status'],
): Promise<void> {
  const now = new Date().toISOString();
  const ref = getDb().collection(COLLECTION_AGGREGATES).doc(uid);

  const update: Record<string, unknown> = {
    updated_at: now,
    last_request_at: now,
  };

  if (status === 'success') {
    if (endpoint === 'encrypt') update.total_encrypts = FieldValue.increment(1);
    if (endpoint === 'decrypt') update.total_decrypts = FieldValue.increment(1);
    if (endpoint === 'health' || endpoint === 'usage') {
      // Health checks are counted under a separate field to keep encrypt/decrypt counts meaningful.
      update.total_health_checks = FieldValue.increment(1);
    }
  } else {
    update.total_errors = FieldValue.increment(1);
  }

  await ref.set(update, { merge: true });
}
