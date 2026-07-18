import { NextRequest } from 'next/server';
import {
  API_KEY_MIN_LENGTH,
  API_KEY_PREFIX,
  AES_GCM_IV_LENGTH,
  AES_GCM_TAG_LENGTH,
  MAX_REQUEST_BODY_BYTES,
} from '../config';
import { ApiError } from './errors';

/**
 * Validate the raw API key format.
 *
 * Keys must start with the configured prefix and meet a minimum length.
 * This avoids wasting Firestore reads on obviously malformed keys.
 */
export function isValidApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') return false;
  return apiKey.startsWith(API_KEY_PREFIX) && apiKey.length >= API_KEY_MIN_LENGTH;
}

/**
 * Enforce that a request body does not exceed the maximum allowed size.
 *
 * Next.js already streams the body, but this check prevents very large
 * payloads from being parsed and passed to crypto handlers.
 */
export function assertBodySizeAllowed(
  req: NextRequest,
  maxBytes: number = MAX_REQUEST_BODY_BYTES,
): void {
  const lengthHeader = req.headers.get('content-length');
  if (lengthHeader) {
    const contentLength = parseInt(lengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      throw new ApiError(
        `Request body too large. Maximum allowed is ${maxBytes} bytes.`,
        413,
        'PAYLOAD_TOO_LARGE',
      );
    }
  }
}

/**
 * Enforce that POST/PUT/PATCH requests use application/json.
 */
export function assertJsonContentType(req: NextRequest): void {
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiError(
      'Content-Type must be application/json',
      415,
      'UNSUPPORTED_MEDIA_TYPE',
    );
  }
}

/**
 * Validate that a string is a valid base64 (or base64url) value.
 */
function isBase64(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  // Accept both standard base64 and base64url.
  const regex = /^[A-Za-z0-9+/._-]*={0,2}$/;
  if (!regex.test(value)) return false;
  try {
    // Node's Buffer.from is lenient; length check adds safety.
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const len = padded.length;
    if (len % 4 !== 0) return false;
    Buffer.from(padded, 'base64');
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an encrypted payload returned by /encrypt before it is sent to /decrypt.
 */
export function assertEncryptedPayload(payload: {
  ciphertext: string;
  iv: string;
  tag: string;
  version: string;
}): void {
  const { ciphertext, iv, tag, version } = payload;

  if (version !== 'v1') {
    throw new ApiError('Unsupported encryption version', 400, 'VALIDATION_ERROR');
  }

  if (!isBase64(ciphertext)) {
    throw new ApiError('ciphertext must be a valid base64 string', 400, 'VALIDATION_ERROR');
  }

  if (!isBase64(iv)) {
    throw new ApiError('iv must be a valid base64 string', 400, 'VALIDATION_ERROR');
  }

  if (!isBase64(tag)) {
    throw new ApiError('tag must be a valid base64 string', 400, 'VALIDATION_ERROR');
  }

  const ivBuffer = Buffer.from(iv, 'base64');
  if (ivBuffer.length !== AES_GCM_IV_LENGTH) {
    throw new ApiError(
      `iv must decode to ${AES_GCM_IV_LENGTH} bytes`,
      400,
      'VALIDATION_ERROR',
    );
  }

  const tagBuffer = Buffer.from(tag, 'base64');
  if (tagBuffer.length !== AES_GCM_TAG_LENGTH) {
    throw new ApiError(
      `tag must decode to ${AES_GCM_TAG_LENGTH} bytes`,
      400,
      'VALIDATION_ERROR',
    );
  }
}
