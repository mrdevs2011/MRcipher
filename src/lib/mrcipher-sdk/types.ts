/**
 * Encrypted container returned by MRcipher /encrypt and consumed by /decrypt.
 */
export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  tag: string;
  version: 'v1';
}

/**
 * Shared options used by both client and server SDKs.
 */
export interface MRCipherOptions {
  /** MRcipher API base URL, e.g. https://mrcipher.vercel.app */
  serverUrl: string;
  /** Raw API key shown once in the MRcipher dashboard. */
  apiKey: string;
  /**
   * Field names that should be encrypted before sending to the origin server.
   * Supports dot notation for nested objects, e.g. "user.phone".
   */
  encryptFields?: string[];
  /**
   * Field names that should be decrypted when received from the origin server.
   * Supports dot notation for nested objects.
   */
  decryptFields?: string[];
  /**
   * Optional request timeout in milliseconds.
   * @default 30000
   */
  timeoutMs?: number;
}

/**
 * Result shape for a single encrypt/decrypt operation.
 */
export interface MRCipherResult<T = unknown> {
  data: T;
  meta?: {
    bytes_in?: number;
    bytes_out?: number;
  };
}

/**
 * Raw response from MRcipher /api/v1/encrypt.
 */
export interface EncryptApiResponse {
  success: true;
  data: EncryptedPayload;
  meta?: { bytes_in?: number; bytes_out?: number };
}

/**
 * Raw response from MRcipher /api/v1/decrypt.
 */
export interface DecryptApiResponse {
  success: true;
  data: unknown;
  meta?: { bytes_in?: number; bytes_out?: number };
}

/**
 * Error response returned by MRcipher endpoints.
 */
export interface MRCipherError {
  success: false;
  error: {
    code: string;
    message: string;
    status: number;
  };
}
