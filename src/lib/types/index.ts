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
  /** Optional public context; used to derive a per-user encryption key. */
  user_context?: string;
}

/** Shape of the request body for POST /api/v1/decrypt */
export interface DecryptRequestBody {
  /** Encrypted container produced by /api/v1/encrypt. */
  content: EncryptedPayload;
  /** Optional public context; must match the value used during encryption. */
  user_context?: string;
}

/** Firestore document stored in the `api_keys` collection. */
export interface ApiKeyDoc {
  id: string;
  user_id: string;
  key_hash: string;
  allowed_domains: string[];
  is_active: boolean;
  created_at: Timestamp;
  last_used_at?: Timestamp;
  metadata?: Record<string, unknown>;
}

/** Input used when writing a usage log entry. */
export interface UsageLogDocInput {
  api_key_id: string;
  user_id: string;
  endpoint: 'encrypt' | 'decrypt';
  status: 'success' | 'error';
  bytes_in?: number;
  bytes_out?: number;
  error_message?: string;
  origin?: string;
  ip?: string;
}

/** Result returned by the authentication layer. */
export interface AuthenticatedApiKey {
  apiKeyDoc: ApiKeyDoc;
}
