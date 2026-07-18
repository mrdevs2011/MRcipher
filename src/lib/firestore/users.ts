import { createHash } from 'crypto';
import { getDb } from '../firebase';
import { COLLECTION_USERS } from '../config';
import { UserDoc } from '../types';

/**
 * Create or update a user document in Firestore.
 *
 * The raw API key is returned exactly once and is never stored.
 * Only its SHA-256 hash is persisted so the key can be verified later.
 */
export async function createOrUpdateUser(params: {
  uid: string;
  email?: string;
  displayName?: string;
  apiKey: string;
}): Promise<{ rawKey: string; prefix: string }> {
  const { uid, email, displayName, apiKey } = params;

  const apiKeyHash = hashApiKey(apiKey);
  const apiKeyPrefix = apiKey.slice(-4);

  const userDoc: Omit<UserDoc, 'created_at'> & { created_at: string } = {
    uid,
    email,
    display_name: displayName,
    api_key_hash: apiKeyHash,
    api_key_prefix: apiKeyPrefix,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };

  await getDb()
    .collection(COLLECTION_USERS)
    .doc(uid)
    .set(userDoc, { merge: true });

  return { rawKey: apiKey, prefix: apiKeyPrefix };
}

/**
 * Find a user by their API key hash.
 */
export async function findUserByApiKey(
  apiKey: string,
): Promise<UserDoc | null> {
  const hash = hashApiKey(apiKey);

  const snapshot = await getDb()
    .collection(COLLECTION_USERS)
    .where('api_key_hash', '==', hash)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return snapshot.docs[0]?.data() as UserDoc;
}

/**
 * Hash an API key using SHA-256. The same function is used when creating
 * and verifying keys so the raw key never needs to be stored.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Check whether a user document already exists.
 */
export async function getUserByUid(uid: string): Promise<UserDoc | null> {
  const doc = await getDb().collection(COLLECTION_USERS).doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as UserDoc;
}
