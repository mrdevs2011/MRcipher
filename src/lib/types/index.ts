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

/** Authenticated user returned by Firebase ID token verification. */
export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

/**
 * Firestore document stored in the `users` collection.
 * The API key itself is never stored; only its SHA-256 hash and a prefix
 * for display purposes are kept.
 */
export interface UserDoc {
  uid: string;
  email?: string;
  display_name?: string;
  api_key_hash: string;
  api_key_prefix: string;
  created_at: Timestamp | string;
  last_seen_at?: Timestamp | string;
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
