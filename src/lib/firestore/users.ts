import { randomBytes } from 'crypto';
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
 * The raw API key is stored 1:1 in Firestore so it can be rebound later.
 */
export async function createApiKey(params: {
  uid: string;
  email?: string;
  name: string;
  allowedOrigins?: string[];
  allowedIps?: string[];
  scopes?: string[];
}): Promise<{ rawKey: string; publicView: ApiKeyPublicView }> {
  const { uid, email, name, allowedOrigins, allowedIps, scopes } = params;
  const rawKey = generateApiKey();
  const apiKeyPrefix = rawKey.slice(-4);

  const docRef = getDb().collection(COLLECTION_API_KEYS).doc();
  const apiKeyDoc: Omit<ApiKeyDoc, 'created_at' | 'allowed_origins' | 'allowed_ips' | 'scopes'> & {
    created_at: string;
    allowed_origins?: string[];
    allowed_ips?: string[];
    scopes?: string[];
  } = {
    uid,
    email,
    name,
    api_key_raw: rawKey,
    api_key_prefix: apiKeyPrefix,
    created_at: new Date().toISOString(),
    revoked: false,
    ...(allowedOrigins && allowedOrigins.length > 0
      ? { allowed_origins: normalizeOrigins(allowedOrigins) }
      : {}),
    ...(allowedIps && allowedIps.length > 0
      ? { allowed_ips: normalizeIps(allowedIps) }
      : {}),
    ...(scopes && scopes.length > 0 ? { scopes: normalizeScopes(scopes) } : {}),
  };

  await docRef.set(apiKeyDoc);

  const publicView: ApiKeyPublicView = {
    id: docRef.id,
    name,
    prefix: apiKeyPrefix,
    raw_key: rawKey,
    created_at: apiKeyDoc.created_at,
    revoked: false,
    allowed_origins: apiKeyDoc.allowed_origins,
    allowed_ips: apiKeyDoc.allowed_ips,
    scopes: apiKeyDoc.scopes as ApiKeyPublicView['scopes'],
  };

  return { rawKey, publicView };
}

/**
 * Update API key metadata. Only the owner can update their own key.
 * Currently supports updating allowed_origins and optionally name.
 */
export async function updateApiKey(
  uid: string,
  docId: string,
  updates: {
    name?: string;
    allowed_origins?: string[];
    allowed_ips?: string[];
    scopes?: string[];
  },
): Promise<boolean> {
  const doc = await getDb().collection(COLLECTION_API_KEYS).doc(docId).get();
  if (!doc.exists) return false;

  const data = doc.data() as ApiKeyDoc;
  if (data.uid !== uid) return false;

  const payload: Record<string, unknown> = {};
  if (typeof updates.name === 'string') payload.name = updates.name.trim();
  if (updates.allowed_origins !== undefined) {
    payload.allowed_origins = normalizeOrigins(updates.allowed_origins) ?? [];
  }
  if (updates.allowed_ips !== undefined) {
    payload.allowed_ips = normalizeIps(updates.allowed_ips) ?? [];
  }
  if (updates.scopes !== undefined) {
    payload.scopes = normalizeScopes(updates.scopes) ?? [];
  }

  if (Object.keys(payload).length === 0) return true;

  await doc.ref.update(payload);
  return true;
}

/**
 * List all API keys for a given user. Raw keys are returned so they can be rebound in the UI.
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
      raw_key: data.api_key_raw,
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
      allowed_origins: data.allowed_origins,
      allowed_ips: data.allowed_ips,
      scopes: data.scopes as ApiKeyPublicView['scopes'],
    };
  });
}

/**
 * Find the user UID and access control details associated with an API key.
 */
export async function findUserByApiKey(
  apiKey: string,
): Promise<
  {
    uid: string;
    email?: string;
    docId: string;
    allowed_origins?: string[];
    allowed_ips?: string[];
    scopes?: ApiKeyDoc['scopes'];
  } | null
> {
  const snapshot = await getDb()
    .collection(COLLECTION_API_KEYS)
    .where('api_key_raw', '==', apiKey)
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

  return {
    uid: data.uid,
    email: data.email,
    docId: doc.id,
    allowed_origins: normalizeOrigins(data.allowed_origins),
    allowed_ips: normalizeIps(data.allowed_ips),
    scopes: data.scopes,
  };
}

function normalizeOrigins(origins?: string[]): string[] | undefined {
  if (!origins || origins.length === 0) return undefined;
  return origins
    .map((origin) => {
      try {
        const url = new URL(origin.trim());
        return `${url.protocol}//${url.host}`;
      } catch {
        return origin.trim();
      }
    })
    .filter(Boolean);
}

function normalizeIps(ips?: string[]): string[] | undefined {
  if (!ips || ips.length === 0) return undefined;
  return ips.map((ip) => ip.trim()).filter(Boolean);
}

function normalizeScopes(scopes?: string[]): string[] | undefined {
  if (!scopes || scopes.length === 0) return undefined;
  const valid = new Set(['encrypt', 'decrypt', 'health', 'usage']);
  return scopes
    .map((s) => s.trim().toLowerCase())
    .filter((s) => valid.has(s));
}

/**
 * Permanently delete an API key. Only the owner can delete their own key.
 */
export async function deleteApiKey(uid: string, docId: string): Promise<boolean> {
  const doc = await getDb().collection(COLLECTION_API_KEYS).doc(docId).get();
  if (!doc.exists) return false;

  const data = doc.data() as ApiKeyDoc;
  if (data.uid !== uid) return false;

  await doc.ref.delete();
  return true;
}

/**
 * Generate a random API key for a new client.
 */
function generateApiKey(): string {
  return `mr_${randomBytes(32).toString('base64url')}`;
}
