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

/** Per-user UI preferences stored in Firestore. */
export interface UserPreferenceDoc {
  uid: string;
  selected_api_key_id?: 'fresh' | string;
  updated_at: Timestamp | string;
}

/**
 * Firestore document stored in the `api_keys` collection.
 * Raw API keys are stored 1:1 so they can be rebound automatically in the UI.
 */
export type ApiKeyScope = 'encrypt' | 'decrypt' | 'health' | 'usage';

export interface ApiKeyDoc {
  uid: string;
  email?: string;
  name: string;
  api_key_raw: string;
  api_key_prefix: string;
  created_at: Timestamp | string;
  last_used_at?: Timestamp | string;
  revoked?: boolean;
  allowed_origins?: string[];
  allowed_ips?: string[];
  scopes?: ApiKeyScope[];
}

/** Public view of an API key (returned when listing keys). */
export interface ApiKeyPublicView {
  id: string;
  name: string;
  prefix: string;
  raw_key: string;
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
  allowed_origins?: string[];
  allowed_ips?: string[];
  scopes?: ApiKeyScope[];
}

/** Input used when writing a usage log entry. */
export interface UsageLogDocInput {
  uid: string;
  email?: string;
  endpoint: 'encrypt' | 'decrypt' | 'health' | 'usage';
  status: 'success' | 'error';
  bytes_in?: number;
  bytes_out?: number;
  error_message?: string;
  origin?: string;
  ip?: string;
}

/** Usage statistics returned to the user. */
export interface UsageStats {
  total_encrypts: number;
  total_decrypts: number;
  total_health_checks: number;
  total_errors: number;
  last_request_at?: string;
}
