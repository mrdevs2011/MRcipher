import { createHash } from 'crypto';
import { getDb, FieldValue } from '../firebase';
import { COLLECTION_API_KEYS } from '../config';
import { ApiKeyDoc } from '../types';

/**
 * Firestore-backed API-key service.
 *
 * Responsibilities:
 * - Hash incoming API keys using SHA-256.
 * - Look up active keys and their allowed origins.
 * - Record last-used timestamps (best-effort).
 */

/**
 * Return a deterministic, lowercase SHA-256 hash of an API key.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Normalize an origin string for comparison. Returns null if invalid.
 */
function normalizeOrigin(origin: string): string | null {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

/**
 * Validate an API key and (optionally) its origin against Firestore.
 *
 * @param apiKey - The raw key from the `x-api-key` header.
 * @param origin - The requesting origin, if present.
 * @returns The matching ApiKeyDoc, or null if invalid/forbidden.
 */
export async function validateApiKey(
  apiKey: string,
  origin?: string,
): Promise<ApiKeyDoc | null> {
  if (!apiKey || typeof apiKey !== 'string') {
    return null;
  }

  const keyHash = hashApiKey(apiKey);

  const snapshot = await getDb()
    .collection(COLLECTION_API_KEYS)
    .where('key_hash', '==', keyHash)
    .where('is_active', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0]!;
  const data = doc.data() as Omit<ApiKeyDoc, 'id'>;
  const apiKeyDoc: ApiKeyDoc = { id: doc.id, ...data };

  // Origin enforcement.
  if (origin && apiKeyDoc.allowed_domains?.length > 0) {
    const requestOrigin = normalizeOrigin(origin);
    if (!requestOrigin) {
      return null;
    }

    const allowed = apiKeyDoc.allowed_domains.some((domain) => {
      const normalized = normalizeOrigin(domain);
      if (!normalized) return false;

      // Exact match only in the base implementation.
      return normalized === requestOrigin;
    });

    if (!allowed) {
      return null;
    }
  }

  // Best-effort update of last_used_at; do not block the request on failure.
  doc.ref
    .update({ last_used_at: FieldValue.serverTimestamp() })
    .catch(() => {
      // Intentionally silent: logging is handled at a higher level.
    });

  return apiKeyDoc;
}
