import { getDb } from '../firebase';
import { COLLECTION_LOGS } from '../config';
import { UsageLogDocInput } from '../types';

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
  } catch (err) {
    // Server-side only; never leak logging failures.
    console.error('[MRcipher] Failed to write usage log:', err);
  }
}
