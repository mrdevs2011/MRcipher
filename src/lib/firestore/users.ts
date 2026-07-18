import { createHash, randomBytes } from 'crypto';
import { getDb } from '../firebase';
import { COLLECTION_USERS, COLLECTION_API_KEYS } from '../config';
import { UserDoc, ApiKeyDoc, ApiKeyPublicView } from '../types';

/**
 * Create or update a user document in Firestore.
 */
export async function createOrUpdateUser(params: {
  uid: string;
  email?: string;
  displayName?: string;
}): Promise<void> {
  const { uid, email, displayName } = params;

  const userDoc: Omit<UserDoc, 'created_at'> & { created_at: string } = {
    uid,
    email,
    display_name: displayName,
    created_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  };

  await getDb()
    .collection(COLLECTION_USERS)
    .doc(uid)
    .set(userDoc, { merge: true });
}

/**
 * Create a new API key for a user.
 *
 * The raw API key is returned exactly once. Only its SHA-256 hash is persisted.
 */
export async function createApiKey(params: {
  uid: string;
  email?: string;
  name: string;
}): Promise<{ rawKey: string; publicView: ApiKeyPublicView }> {
  const { uid, email, name } = params;
  const rawKey = generateApiKey();
  const apiKeyHash = hashApiKey(rawKey);
  const apiKeyPrefix = rawKey.slice(-4);

  const docRef = getDb().collection(COLLECTION_API_KEYS).doc();
  const apiKeyDoc: Omit<ApiKeyDoc, 'created_at'> & { created_at: string } = {
    uid,
    email,
    name,
    api_key_hash: apiKeyHash,
    api_key_prefix: apiKeyPrefix,
    created_at: new Date().toISOString(),
    revoked: false,
  };

  await docRef.set(apiKeyDoc);

  const publicView: ApiKeyPublicView = {
    id: docRef.id,
    name,
    prefix: apiKeyPrefix,
    created_at: apiKeyDoc.created_at,
    revoked: false,
  };

  return { rawKey, publicView };
}

/**
 * List all API keys for a given user. Raw keys are never returned.
 */
export async function listApiKeysByUser(
  uid: string,
): Promise<ApiKeyPublicView[]> {
  const snapshot = await getDb()
    .collection(COLLECTION_API_KEYS)
    .where('uid', '==', uid)
    .orderBy('created_at', 'desc')
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as ApiKeyDoc;
    return {
      id: doc.id,
      name: data.name,
      prefix: data.api_key_prefix,
      created_at:
        typeof data.created_at === 'string'
          ? data.created_at
          : data.created_at.toDate().toISOString(),
      last_used_at: data.last_used_at
        ? typeof data.last_used_at === 'string'
          ? data.last_used_at
          : data.last_used_at.toDate().toISOString()
        : undefined,
      revoked: data.revoked ?? false,
    };
  });
}

/**
 * Find the user UID associated with an API key by its hash.
 */
export async function findUserByApiKey(
  apiKey: string,
): Promise<{ uid: string; email?: string; docId: string } | null> {
  const hash = hashApiKey(apiKey);

  const snapshot = await getDb()
    .collection(COLLECTION_API_KEYS)
    .where('api_key_hash', '==', hash)
    .where('revoked', '==', false)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  const data = doc.data() as ApiKeyDoc;

  // Update last_used_at fire-and-forget.
  doc.ref
    .update({ last_used_at: new Date().toISOString() })
    .catch(() => undefined);

  return { uid: data.uid, email: data.email, docId: doc.id };
}

/**
 * Hash an API key using SHA-256. The same function is used when creating
 * and verifying keys so the raw key never needs to be stored.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Generate a random API key for a new client.
 */
export function generateApiKey(): string {
  return `mr_${randomBytes(32).toString('base64url')}`;
}

/**
 * Check whether a user document already exists.
 */
export async function getUserByUid(uid: string): Promise<UserDoc | null> {
  const doc = await getDb().collection(COLLECTION_USERS).doc(uid).get();
  if (!doc.exists) return null;
  return doc.data() as UserDoc;
}
