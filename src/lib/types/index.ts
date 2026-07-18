import { Timestamp } from 'firebase-admin/firestore';

/**
 * Generic encrypted payload returned by the encrypt endpoint
 * and accepted by the decrypt endpoint.
 */
export interface EncryptedPayload {
  /** Base64-encoded ciphertext. */
  ciphertext: string;
  /** Base64-encoded 16-byte initialization vector. */
  iv: string;
  /** Base64-encoded 16-byte GCM authentication tag. */
  tag: string;
  /** Encryption scheme version for future migrations. */
  version: 'v1';
}

/** Shape of the request body for POST /api/v1/encrypt */
export interface EncryptRequestBody {
  /** Any JSON-serializable value. It will be stringified before encryption. */
  content: unknown;
}

/** Shape of the request body for POST /api/v1/decrypt */
export interface DecryptRequestBody {
  /** Encrypted container produced by /api/v1/encrypt. */
  content: EncryptedPayload;
}

/** Shape of the request body for POST /api/v1/keys */
export interface CreateKeyRequestBody {
  /** Human-readable name for the API key (e.g., "Production server"). */
  name: string;
}

/** Authenticated user returned by Firebase ID token verification. */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

/**
 * Firestore document stored in the `users` collection.
 */
export interface UserDoc {
  uid: string;
  email?: string;
  display_name?: string;
  created_at: Timestamp | string;
  last_seen_at?: Timestamp | string;
}

/**
 * Firestore document stored in the `api_keys` collection.
 * The raw API key is never stored; only its SHA-256 hash and a prefix
 * for display purposes are kept.
 */
export interface ApiKeyDoc {
  uid: string;
  email?: string;
  name: string;
  api_key_hash: string;
  api_key_prefix: string;
  created_at: Timestamp | string;
  last_used_at?: Timestamp | string;
  revoked?: boolean;
}

/** Public view of an API key (returned when listing keys). */
export interface ApiKeyPublicView {
  id: string;
  name: string;
  prefix: string;
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
}

/** Input used when writing a usage log entry. */
export interface UsageLogDocInput {
  uid: string;
  email?: string;
  endpoint: 'encrypt' | 'decrypt';
  status: 'success' | 'error';
  bytes_in?: number;
  bytes_out?: number;
  error_message?: string;
  origin?: string;
  ip?: string;
}
