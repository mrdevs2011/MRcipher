import { createHash } from 'crypto';

/**
 * Centralized configuration validated at startup.
 * Failing fast here prevents runtime errors in API handlers.
 */

const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY ?? '';

/**
 * Lazily validate and return the master encryption key.
 *
 * We avoid validating at module load so that Next.js can build static pages
 * without requiring environment variables at build time. Runtime endpoints
 * call this function when they actually need the key.
 */
export function getMasterKey(): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(MASTER_KEY)) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY must be a 64-character hexadecimal string representing 32 bytes.',
    );
  }
  return Buffer.from(MASTER_KEY, 'hex');
}

export const FIREBASE_SERVICE_ACCOUNT_JSON =
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
export const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
export const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY;

export const COLLECTION_API_KEYS = 'api_keys';
export const COLLECTION_USERS = 'users';
export const COLLECTION_LOGS = 'logs';

export const AES_GCM_IV_LENGTH = 16;
export const AES_GCM_TAG_LENGTH = 16;
export const AES_KEY_SIZE = 32;

/**
 * Maximum request body size for encrypt/decrypt endpoints.
 * 512 KiB is enough for large JSON payloads while protecting serverless memory.
 */
export const MAX_REQUEST_BODY_BYTES = 512 * 1024;

/** Valid API keys start with this prefix and are at least 16 characters long. */
export const API_KEY_PREFIX = 'mr_';
export const API_KEY_MIN_LENGTH = 16;

/**
 * Generate a deterministic 256-bit encryption key for a given user/context
 * by combining the master key with a public salt. This avoids storing
 * per-user keys in the database while keeping each user's data isolated.
 */
export function deriveUserKey(userId: string): Buffer {
  return createHash('sha256')
    .update(Buffer.concat([getMasterKey(), Buffer.from(userId)]))
    .digest();
}

